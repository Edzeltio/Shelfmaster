import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from './supabaseAdmin';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Loans drawer state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLoans, setUserLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*, transactions (id, status)')
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (error) console.error('Error fetching students:', error);
    else setUsers(data || []);
    setLoading(false);
  }

  async function openLoans(user) {
    setSelectedUser(user);
    setLoansLoading(true);
    setUserLoans([]);

    let { data, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        id, status, borrow_date, due_date,
        books (title, accession_num, authors),
        book_copies (accession_id, copy_number)
      `)
      .eq('user_id', user.id)
      .eq('status', 'borrowed')
      .order('borrow_date', { ascending: false });

    // Fallback if book_copies not migrated yet
    if (error && (error.code === 'PGRST200' || (error.message || '').includes('book_copies') || (error.message || '').includes('schema cache'))) {
      ({ data, error } = await supabaseAdmin
        .from('transactions')
        .select('id, status, borrow_date, due_date, books (title, accession_num, authors)')
        .eq('user_id', user.id)
        .eq('status', 'borrowed')
        .order('borrow_date', { ascending: false }));
    }

    if (!error) setUserLoans(data || []);
    setLoansLoading(false);
  }

  function closeDrawer() {
    setSelectedUser(null);
    setUserLoans([]);
  }

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.course_year?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--dark-blue)', margin: 0 }}>Student Management</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Search and manage registered student accounts.</p>
        </div>
        <div style={{ width: '350px' }}>
          <input
            type="text"
            placeholder="Search by name, ID, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading student directory...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#F5FAE8', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={thStyle}>Student Name</th>
                <th style={thStyle}>Student ID</th>
                <th style={thStyle}>Course & Year</th>
                <th style={thStyle}>Books Held</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No students found.</td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const activeLoans = user.transactions?.filter(t => t.status === 'borrowed').length || 0;
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0fdf4' : 'white' }}
                    >
                      <td style={{ padding: '15px 20px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--dark-blue)' }}>{user.name}</div>
                      </td>
                      <td style={{ padding: '15px 20px', color: '#475569' }}>{user.student_id}</td>
                      <td style={{ padding: '15px 20px', color: '#475569' }}>{user.course_year}</td>
                      <td style={{ padding: '15px 20px' }}>
                        <button
                          onClick={() => isSelected ? closeDrawer() : openLoans(user)}
                          style={{
                            background: activeLoans > 0 ? (isSelected ? 'var(--green)' : '#F5FAE8') : '#f8fafc',
                            color: activeLoans > 0 ? (isSelected ? 'white' : 'var(--green)') : '#94a3b8',
                            padding: '5px 12px', borderRadius: '6px', fontSize: '0.85rem',
                            fontWeight: 'bold', border: 'none',
                            cursor: activeLoans > 0 ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                            display: 'inline-flex', alignItems: 'center', gap: '5px'
                          }}
                          disabled={activeLoans === 0}
                          title={activeLoans > 0 ? `View ${activeLoans} borrowed book${activeLoans > 1 ? 's' : ''}` : 'No active loans'}
                        >
                          {activeLoans > 0 ? '📚' : '—'} {activeLoans} {activeLoans === 1 ? 'Book' : 'Books'}
                          {activeLoans > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{isSelected ? '▲' : '▼'}</span>}
                        </button>
                      </td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{ color: user.status === 'active' ? '#10b981' : '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize' }}>
                          ● {user.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline loans drawer — appears below the table */}
      {selectedUser && (
        <div style={{
          marginTop: '16px', background: 'white', borderRadius: '12px',
          border: '2px solid var(--green)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {/* Drawer header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#15803d', fontSize: '1rem' }}>
                📚 Borrowed Books — {selectedUser.name}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                ID: {selectedUser.student_id} &nbsp;·&nbsp; {selectedUser.course_year}
              </p>
            </div>
            <button
              onClick={closeDrawer}
              style={{ background: 'none', border: '1px solid #86efac', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}
            >
              ✕ Close
            </button>
          </div>

          {/* Loans list */}
          {loansLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading loans…</div>
          ) : userLoans.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No active loans found for this student.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={subThStyle}>Book</th>
                  <th style={subThStyle}>Copy / Accession</th>
                  <th style={subThStyle}>Borrowed</th>
                  <th style={subThStyle}>Due Date</th>
                  <th style={subThStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {userLoans.map(loan => {
                  const overdue = isOverdue(loan.due_date);
                  return (
                    <tr key={loan.id} style={{ borderBottom: '1px solid #f1f5f9', background: overdue ? '#fff7f7' : 'white' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>{loan.books?.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{loan.books?.authors}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {loan.book_copies?.accession_id ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: '4px' }}>
                            {loan.book_copies.accession_id}
                            <span style={{ color: '#94a3b8', marginLeft: '4px' }}>#{loan.book_copies.copy_number}</span>
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#94a3b8' }}>
                            {loan.books?.accession_num || '—'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569', fontSize: '0.85rem' }}>
                        {loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString([], { dateStyle: 'medium' }) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.85rem' }}>
                        {loan.due_date ? (
                          <span style={{ color: overdue ? '#ef4444' : '#475569', fontWeight: overdue ? 700 : 400 }}>
                            {overdue ? '⚠ ' : ''}{new Date(loan.due_date).toLocaleDateString([], { dateStyle: 'medium' })}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          background: overdue ? '#fee2e2' : '#dcfce7',
                          color: overdue ? '#dc2626' : '#16a34a',
                          padding: '3px 10px', borderRadius: '20px',
                          fontSize: '0.75rem', fontWeight: 700
                        }}>
                          {overdue ? 'Overdue' : 'On Loan'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '15px 20px',
  color: 'var(--text-muted)',
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const subThStyle = {
  padding: '10px 20px',
  color: '#64748b',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.5px',
};
