import React, { useEffect, useState, useMemo } from 'react';
import { localDbAdmin } from './localDbAdmin';
import Toast from './Toast';

export default function WalkIn() {
  const [borrowerType, setBorrowerType] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Teacher flow — pick existing teacher account
  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Student flow — fillable form
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    gradeSection: '',
    lrn: '',
    teacherName: '',
  });

  // Books (both flows) — each entry: { ...book, days }
  const [bookQuery, setBookQuery] = useState('');
  const [borrowList, setBorrowList] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!borrowerType) return;
    setLoading(true);
    const teacherFetch = borrowerType === 'teacher'
      ? localDbAdmin
          .from('users')
          .select('id, name, student_id, course_year, role, status')
          .eq('role', 'teacher')
          .order('name', { ascending: true })
      : Promise.resolve({ data: [] });

    Promise.all([
      teacherFetch,
      localDbAdmin
        .from('books')
        .select('id, title, authors, barcode, accession_num, quantity, book_type, status, cover_image, category')
        .eq('status', 'active')
        .order('title', { ascending: true }),
    ]).then(([uRes, bRes]) => {
      if (uRes.error) showToast('Failed to load teachers: ' + uRes.error.message, 'error');
      else setUsers((uRes.data || []).filter(u => u.status !== 'inactive'));
      if (bRes.error) showToast('Failed to load books: ' + bRes.error.message, 'error');
      else setBooks((bRes.data || []).filter(b => (b.book_type || '').toLowerCase() !== 'ebook'));
      setLoading(false);
    });
  }, [borrowerType]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.student_id || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [users, userQuery]);

  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    const pool = books.filter(b => !borrowList.some(sb => sb.id === b.id));
    if (!q) return pool;
    return pool.filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.authors || '').toLowerCase().includes(q) ||
      (b.barcode || '').toLowerCase().includes(q) ||
      (b.accession_num || '').toLowerCase().includes(q) ||
      (b.category || '').toLowerCase().includes(q)
    );
  }, [books, bookQuery, borrowList]);

  const reset = () => {
    setBorrowerType(null);
    setSelectedUser(null);
    setBorrowList([]);
    setUserQuery('');
    setBookQuery('');
    setStudentForm({ fullName: '', gradeSection: '', lrn: '', teacherName: '' });
  };

  const addBook = (b) => {
    if (b.quantity <= 0) {
      showToast(`"${b.title}" has no available copies.`, 'error');
      return;
    }
    setBorrowList(prev => [...prev, { ...b, days: 7 }]);
    setBookQuery('');
  };

  const removeBook = (id) => setBorrowList(prev => prev.filter(b => b.id !== id));

  const updateDays = (id, days) => {
    setBorrowList(prev => prev.map(b => b.id === id ? { ...b, days: Math.max(1, parseInt(days) || 1) } : b));
  };

  const assignAvailableCopy = async (bookId) => {
    const { data, error } = await localDbAdmin
      .from('book_copies')
      .select('id, accession_id, copy_number')
      .eq('book_id', bookId)
      .eq('status', 'available')
      .order('copy_number', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error && error.code !== '42P01') return null;
    return data || null;
  };

  const APPROVE_CANDIDATES = ['borrowed', 'approved', 'issued', 'active', 'loaned', 'checked_out', 'released'];
  const resolveBorrowedStatus = async () => {
    return localStorage.getItem('sm_approve_status') || APPROVE_CANDIDATES[0];
  };

  const validateStudentForm = () => {
    const { fullName, gradeSection, lrn, teacherName } = studentForm;
    if (!fullName.trim()) return 'Full name is required.';
    if (!gradeSection.trim()) return 'Grade & section (or strand) is required.';
    if (!lrn.trim()) return 'LRN is required.';
    if (!teacherName.trim()) return 'Teacher\'s name is required.';
    return null;
  };

  const handleSubmit = async () => {
    const isTeacher = borrowerType === 'teacher';

    if (isTeacher && !selectedUser) return showToast('Please select a teacher.', 'error');
    if (!isTeacher) {
      const err = validateStudentForm();
      if (err) return showToast(err, 'error');
    }
    if (borrowList.length === 0) return showToast('Please add at least one book.', 'error');
    if (!isTeacher && borrowList.some(b => !b.days || b.days < 1)) {
      return showToast('All books must have at least 1 borrowing day.', 'error');
    }

    setSubmitting(true);
    try {
      const status = await resolveBorrowedStatus();
      const borrowDate = new Date().toISOString();

      let success = 0;
      const failures = [];

      for (const book of borrowList) {
        try {
          const { data: freshBook, error: bErr } = await localDbAdmin
            .from('books').select('quantity').eq('id', book.id).single();
          if (bErr) throw bErr;
          if ((freshBook?.quantity || 0) <= 0) {
            failures.push(`${book.title} — no copies left`);
            continue;
          }

          const copy = await assignAvailableCopy(book.id);
          const dueDate = isTeacher
            ? null
            : new Date(Date.now() + book.days * 86400000).toISOString();

          const payload = {
            user_id: isTeacher ? selectedUser.id : null,
            book_id: book.id,
            status,
            borrow_date: borrowDate,
            due_date: dueDate,
            copy_id: copy?.id || null,
          };
          if (!isTeacher) {
            payload.walk_in_name = studentForm.fullName.trim();
            payload.walk_in_grade_section = studentForm.gradeSection.trim();
            payload.walk_in_lrn = studentForm.lrn.trim();
            payload.walk_in_teacher = studentForm.teacherName.trim();
          }

          const { error: txnErr } = await localDbAdmin
            .from('transactions').insert([payload]).select().single();
          if (txnErr) throw txnErr;

          if (copy) {
            await localDbAdmin.from('book_copies').update({ status: 'borrowed' }).eq('id', copy.id);
          }
          await localDbAdmin
            .from('books')
            .update({ quantity: (freshBook.quantity || 0) - 1 })
            .eq('id', book.id);

          success++;
        } catch (err) {
          console.error(err);
          failures.push(`${book.title} — ${err.message}`);
        }
      }

      const borrowerName = isTeacher ? selectedUser.name : studentForm.fullName.trim();
      if (success > 0) {
        showToast(
          `${success} book${success > 1 ? 's' : ''} issued to ${borrowerName}.` +
          (failures.length ? ` ${failures.length} failed.` : ''),
          failures.length ? 'error' : 'success'
        );
        if (failures.length === 0) reset();
      } else {
        showToast('Walk-in failed: ' + failures.join('; '), 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- UI ----------

  if (!borrowerType) {
    return (
      <div>
        <Toast {...toast} onClose={() => setToast({ message: '' })} />
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ color: 'var(--dark-blue)', margin: 0 }}>Walk-in Borrowing</h1>
          <p style={{ color: '#64748b', marginTop: '5px' }}>
            Issue books in person to a student or teacher.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '700px' }}>
          <button onClick={() => setBorrowerType('student')} style={typeCardStyle('#F5FAE8', 'var(--green)')}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎓</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Student</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
              Fill in details and pick books with custom due dates.
            </div>
          </button>
          <button onClick={() => setBorrowerType('teacher')} style={typeCardStyle('#FFF0F5', 'var(--maroon)')}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👨‍🏫</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Teacher</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
              Bulk borrowing, no due date.
            </div>
          </button>
        </div>
      </div>
    );
  }

  const isTeacher = borrowerType === 'teacher';

  return (
    <div>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <button onClick={reset} style={backBtnStyle}>← Change borrower type</button>
        <span style={{
          padding: '4px 10px',
          borderRadius: '999px',
          background: isTeacher ? '#FFF0F5' : '#F5FAE8',
          color: isTeacher ? 'var(--maroon)' : 'var(--green)',
          fontWeight: 700,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
        }}>
          {borrowerType}
        </span>
      </div>

      <h1 style={{ color: 'var(--dark-blue)', margin: '0 0 1.5rem' }}>
        Walk-in Borrowing — {isTeacher ? 'Teacher' : 'Student'}
      </h1>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

          {/* 1. Borrower info */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>1. {isTeacher ? 'Teacher' : 'Student'} Information</h3>

            {isTeacher ? (
              !selectedUser ? (
                <>
                  <input
                    type="text"
                    placeholder="Search by name or staff ID..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={listStyle}>
                    {filteredUsers.length === 0 ? (
                      <div style={emptyListStyle}>No matching teachers found.</div>
                    ) : (
                      filteredUsers.map(u => (
                        <button key={u.id} onClick={() => setSelectedUser(u)} style={listItemStyle}>
                          <div style={{ fontWeight: 600, color: 'var(--dark-blue)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {u.student_id ? `ID: ${u.student_id}` : 'No ID'} · {u.course_year || '—'}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark-blue)' }}>{selectedUser.name}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#475569' }}>
                    <strong>Staff ID:</strong> {selectedUser.student_id || '—'}
                  </div>
                  <button onClick={() => setSelectedUser(null)} style={{ ...backBtnStyle, marginTop: '12px' }}>
                    Change teacher
                  </button>
                </div>
              )
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <Field label="Full Name *" value={studentForm.fullName}
                  onChange={(v) => setStudentForm(f => ({ ...f, fullName: v }))}
                  placeholder="Juan Dela Cruz" />
                <Field label="Grade & Section / Strand *" value={studentForm.gradeSection}
                  onChange={(v) => setStudentForm(f => ({ ...f, gradeSection: v }))}
                  placeholder="Grade 11 - STEM A" />
                <Field label="LRN *" value={studentForm.lrn}
                  onChange={(v) => setStudentForm(f => ({ ...f, lrn: v }))}
                  placeholder="123456789012" />
                <Field label="Teacher's Name *" value={studentForm.teacherName}
                  onChange={(v) => setStudentForm(f => ({ ...f, teacherName: v }))}
                  placeholder="Ms. Reyes" />
              </div>
            )}
          </section>

          {/* 2. Pick books */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>2. Pick Books</h3>

            <input
              type="text"
              placeholder="Search by title, author, category, barcode..."
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              style={inputStyle}
            />

            <div style={{
              marginTop: '14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '14px',
              maxHeight: '480px',
              overflowY: 'auto',
              padding: '4px',
            }}>
              {filteredBooks.length === 0 ? (
                <div style={{ ...emptyListStyle, gridColumn: '1 / -1' }}>
                  No books match your search.
                </div>
              ) : (
                filteredBooks.map(b => (
                  <button key={b.id} onClick={() => addBook(b)} style={bookCardStyle}>
                    <div style={coverWrapStyle}>
                      {b.cover_image
                        ? <img src={b.cover_image} alt={b.title} style={coverImgStyle} onError={(e) => { e.target.style.display = 'none'; }} />
                        : <div style={coverPlaceholderStyle}>📚</div>}
                    </div>
                    <div style={{ padding: '8px 6px 6px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--dark-blue)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {b.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.authors || '—'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: b.quantity > 0 ? 'var(--green)' : '#ef4444', fontWeight: 600, marginTop: '4px' }}>
                        {b.quantity} available
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* 3. Borrow list */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>
              3. Borrow List ({borrowList.length})
            </h3>

            {borrowList.length === 0 ? (
              <div style={emptyListStyle}>No books added yet. Tap a book above to add it.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {borrowList.map(b => (
                  <div key={b.id} style={borrowRowStyle}>
                    <div style={{ width: '50px', height: '70px', flexShrink: 0 }}>
                      {b.cover_image
                        ? <img src={b.cover_image} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                        : <div style={{ ...coverPlaceholderStyle, height: '100%', fontSize: '1.4rem' }}>📚</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--dark-blue)', fontSize: '0.92rem' }}>{b.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{b.authors || '—'}</div>
                    </div>
                    {!isTeacher && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', minWidth: '160px' }}>
                        <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>Borrow days (min 1)</label>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={b.days}
                          onChange={(e) => updateDays(b.id, e.target.value)}
                          style={{ ...inputStyle, width: '90px', padding: '6px 8px', textAlign: 'center' }}
                        />
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Return by: <strong>{new Date(Date.now() + b.days * 86400000).toLocaleDateString()}</strong>
                        </div>
                      </div>
                    )}
                    <button onClick={() => removeBook(b.id)} style={removeBtnStyle} title="Remove">×</button>
                  </div>
                ))}
              </div>
            )}

            {isTeacher && (
              <div style={{ marginTop: '12px', background: '#FFF0F5', padding: '10px 14px', borderRadius: '8px', color: 'var(--maroon)', fontSize: '0.85rem' }}>
                Teachers borrow with <strong>no due date</strong>.
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || borrowList.length === 0}
              style={{
                ...submitBtnStyle,
                marginTop: '20px',
                background: submitting || borrowList.length === 0 ? '#9ca3af' : 'var(--green)',
                cursor: submitting || borrowList.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Issuing...' : `✓ Issue ${borrowList.length || ''} Book${borrowList.length !== 1 ? 's' : ''}`}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

// Styles
const cardStyle = {
  background: 'white',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
};
const sectionTitleStyle = {
  margin: '0 0 14px',
  fontSize: '1rem',
  color: 'var(--dark-blue)',
  borderBottom: '1px solid #f1f5f9',
  paddingBottom: '8px',
};
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
};
const listStyle = {
  marginTop: '10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  maxHeight: '260px',
  overflowY: 'auto',
};
const listItemStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  background: '#F8FAFC',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  cursor: 'pointer',
  width: '100%',
};
const emptyListStyle = {
  padding: '20px',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: '0.85rem',
};
const removeBtnStyle = {
  background: 'transparent',
  border: 'none',
  fontSize: '1.6rem',
  cursor: 'pointer',
  color: '#ef4444',
  lineHeight: 1,
  padding: '0 6px',
};
const backBtnStyle = {
  background: 'transparent',
  border: '1px solid #e2e8f0',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '0.8rem',
  color: '#475569',
  cursor: 'pointer',
};
const submitBtnStyle = {
  width: '100%',
  padding: '12px',
  border: 'none',
  borderRadius: '8px',
  color: 'white',
  fontWeight: 700,
  fontSize: '0.95rem',
};
const typeCardStyle = (bg, color) => ({
  background: bg,
  border: `2px solid ${color}`,
  borderRadius: '14px',
  padding: '30px',
  cursor: 'pointer',
  textAlign: 'center',
  color: 'var(--dark-blue)',
  transition: 'transform 0.15s',
});
const bookCardStyle = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.15s',
};
const coverWrapStyle = {
  width: '100%',
  paddingTop: '140%',
  position: 'relative',
  background: '#F1F5F9',
};
const coverImgStyle = {
  position: 'absolute',
  top: 0, left: 0, width: '100%', height: '100%',
  objectFit: 'cover',
};
const coverPlaceholderStyle = {
  position: 'absolute',
  top: 0, left: 0, width: '100%', height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.5rem',
  color: '#cbd5e1',
};
const borrowRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px',
  background: '#F8FAFC',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
};
