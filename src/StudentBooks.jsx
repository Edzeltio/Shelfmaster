import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import StudentNavbar from './StudentNavbar';

export default function Studentbook() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyLoans();
  }, []);

  async function fetchMyLoans() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, borrow_date, due_date, status,
          books (title, authors, accession_num)
        `)
        .eq('user_id', user.id)
        .eq('status', 'borrowed');

      if (!error) setLoans(data || []);
    }
    setLoading(false);
  }

  // --- NEW: Countdown Logic ---
  const calculateDaysLeft = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `${Math.abs(diffDays)} Days Overdue`, color: '#e11d48', weight: 'bold' };
    if (diffDays === 0) return { text: 'Due Today', color: '#f59e0b', weight: 'bold' };
    if (diffDays <= 2) return { text: `${diffDays} Days Left`, color: '#f59e0b', weight: 'bold' };
    return { text: `${diffDays} Days Left`, color: '#10b981', weight: '500' };
  };

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <StudentNavbar userName="Jane Doe" />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ color: 'var(--maroon)', marginBottom: '20px' }}>My Active Loans</h2>
        
        {loading ? <p>Loading your books...</p> : (
          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={thStyle}>Book Title</th>
                  <th style={thStyle}>Accession #</th>
                  <th style={thStyle}>Borrow Date</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={thStyle}>Time Remaining</th> {/* NEW COLUMN */}
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No active loans found.</td></tr>
                ) : (
                  loans.map(loan => {
                    const countdown = calculateDaysLeft(loan.due_date);
                    return (
                      <tr key={loan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle}><strong>{loan.books?.title}</strong></td>
                        <td style={tdStyle}>{loan.books?.accession_num}</td>
                        <td style={tdStyle}>{new Date(loan.borrow_date).toLocaleDateString()}</td>
                        <td style={tdStyle}>{new Date(loan.due_date).toLocaleDateString()}</td>
                        <td style={{ ...tdStyle, color: countdown.color, fontWeight: countdown.weight }}>
                          {countdown.text}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles (same as before)
const tableContainerStyle = { background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };
const headerRowStyle = { textAlign: 'left', background: '#F5FAE8', color: '#475569' };
const thStyle = { padding: '15px' };
const tdStyle = { padding: '15px' };