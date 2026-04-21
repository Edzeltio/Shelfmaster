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

  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const [bookQuery, setBookQuery] = useState('');
  const [selectedBooks, setSelectedBooks] = useState([]);

  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!borrowerType) return;
    setLoading(true);
    Promise.all([
      localDbAdmin
        .from('users')
        .select('id, name, student_id, course_year, role, status')
        .eq('role', borrowerType)
        .order('name', { ascending: true }),
      localDbAdmin
        .from('books')
        .select('id, title, authors, barcode, accession_num, quantity, book_type, status')
        .eq('status', 'active')
        .order('title', { ascending: true }),
    ]).then(([uRes, bRes]) => {
      if (uRes.error) showToast('Failed to load users: ' + uRes.error.message, 'error');
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
    const pool = books.filter(b => !selectedBooks.some(sb => sb.id === b.id));
    if (!q) return pool.slice(0, 8);
    return pool.filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.authors || '').toLowerCase().includes(q) ||
      (b.barcode || '').toLowerCase().includes(q) ||
      (b.accession_num || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [books, bookQuery, selectedBooks]);

  const reset = () => {
    setBorrowerType(null);
    setSelectedUser(null);
    setSelectedBooks([]);
    setUserQuery('');
    setBookQuery('');
    setDays(7);
  };

  const addBook = (b) => {
    if (b.quantity <= 0) {
      showToast(`"${b.title}" has no available copies.`, 'error');
      return;
    }
    if (borrowerType === 'student' && selectedBooks.length >= 1) {
      setSelectedBooks([b]);
    } else {
      setSelectedBooks(prev => [...prev, b]);
    }
    setBookQuery('');
  };

  const removeBook = (id) => setSelectedBooks(prev => prev.filter(b => b.id !== id));

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
    const cached = localStorage.getItem('sm_approve_status');
    if (cached) return cached;
    return APPROVE_CANDIDATES[0];
  };

  const handleSubmit = async () => {
    if (!selectedUser) return showToast('Please select a borrower.', 'error');
    if (selectedBooks.length === 0) return showToast('Please add at least one book.', 'error');
    if (borrowerType === 'student' && (!days || days < 1)) {
      return showToast('Please enter a valid number of borrowing days.', 'error');
    }

    setSubmitting(true);
    try {
      const status = await resolveBorrowedStatus();
      const borrowDate = new Date().toISOString();
      const dueDate = borrowerType === 'student'
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      let success = 0;
      const failures = [];

      for (const book of selectedBooks) {
        try {
          const { data: freshBook, error: bErr } = await localDbAdmin
            .from('books').select('quantity').eq('id', book.id).single();
          if (bErr) throw bErr;
          if ((freshBook?.quantity || 0) <= 0) {
            failures.push(`${book.title} — no copies left`);
            continue;
          }

          const copy = await assignAvailableCopy(book.id);

          const { data: txn, error: txnErr } = await localDbAdmin
            .from('transactions')
            .insert([{
              user_id: selectedUser.id,
              book_id: book.id,
              status,
              borrow_date: borrowDate,
              due_date: dueDate,
              copy_id: copy?.id || null,
            }])
            .select()
            .single();
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

      if (success > 0) {
        showToast(
          `${success} book${success > 1 ? 's' : ''} issued to ${selectedUser.name}.` +
          (failures.length ? ` ${failures.length} failed.` : ''),
          failures.length ? 'error' : 'success'
        );
      } else {
        showToast('Walk-in failed: ' + failures.join('; '), 'error');
      }

      if (success > 0) reset();
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
              Single book, with custom loan duration.
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {/* Borrower */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>1. {isTeacher ? 'Teacher' : 'Student'} Information</h3>

            {!selectedUser ? (
              <>
                <input
                  type="text"
                  placeholder={`Search by name${isTeacher ? ' or staff ID' : ' or student ID'}...`}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  style={inputStyle}
                />
                <div style={listStyle}>
                  {filteredUsers.length === 0 ? (
                    <div style={emptyListStyle}>No matching {borrowerType}s found.</div>
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
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '10px' }}>
                  Borrower must have an account. Add new {borrowerType}s in User Management.
                </p>
              </>
            ) : (
              <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark-blue)' }}>{selectedUser.name}</div>
                <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#475569', display: 'grid', gap: '4px' }}>
                  <div><strong>{isTeacher ? 'Staff ID:' : 'Student ID:'}</strong> {selectedUser.student_id || '—'}</div>
                  {!isTeacher && (
                    <div><strong>Grade / Section / Strand:</strong> {selectedUser.course_year || '—'}</div>
                  )}
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ ...backBtnStyle, marginTop: '12px' }}>
                  Change {borrowerType}
                </button>
              </div>
            )}
          </section>

          {/* Books */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>
              2. {isTeacher ? 'Books (Bulk)' : 'Book'}
            </h3>

            <input
              type="text"
              placeholder="Search by title, author, barcode..."
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              style={inputStyle}
              disabled={!isTeacher && selectedBooks.length >= 1}
            />

            {(isTeacher || selectedBooks.length === 0) && (
              <div style={listStyle}>
                {filteredBooks.length === 0 ? (
                  <div style={emptyListStyle}>No matching books available.</div>
                ) : (
                  filteredBooks.map(b => (
                    <button key={b.id} onClick={() => addBook(b)} style={listItemStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--dark-blue)' }}>{b.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {b.authors || '—'} · {b.quantity} {b.quantity === 1 ? 'copy' : 'copies'} available
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedBooks.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Selected ({selectedBooks.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedBooks.map(b => (
                    <div key={b.id} style={selectedItemStyle}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{b.authors}</div>
                      </div>
                      <button onClick={() => removeBook(b.id)} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Loan terms */}
          <section style={cardStyle}>
            <h3 style={sectionTitleStyle}>3. Loan Terms</h3>
            {isTeacher ? (
              <div style={{ background: '#FFF0F5', padding: '14px', borderRadius: '8px', color: 'var(--maroon)', fontSize: '0.9rem' }}>
                Teachers borrow with <strong>no due date</strong>. They keep the books until returned.
              </div>
            ) : (
              <>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                  Number of borrowing days
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                  style={{ ...inputStyle, marginTop: '6px' }}
                />
                {days > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#475569' }}>
                    Due date: <strong>{new Date(Date.now() + days * 86400000).toLocaleDateString()}</strong>
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedUser || selectedBooks.length === 0}
              style={{
                ...submitBtnStyle,
                marginTop: '20px',
                background: submitting || !selectedUser || selectedBooks.length === 0
                  ? '#9ca3af' : 'var(--green)',
                cursor: submitting || !selectedUser || selectedBooks.length === 0
                  ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Issuing...' : `✓ Issue ${selectedBooks.length || ''} Book${selectedBooks.length !== 1 ? 's' : ''}`}
            </button>
          </section>
        </div>
      )}
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
const selectedItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#F5FAE8',
  border: '1px solid #d9f99d',
  borderRadius: '8px',
};
const removeBtnStyle = {
  background: 'transparent',
  border: 'none',
  fontSize: '1.4rem',
  cursor: 'pointer',
  color: '#ef4444',
  lineHeight: 1,
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
