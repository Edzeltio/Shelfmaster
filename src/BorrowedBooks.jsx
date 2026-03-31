import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function BorrowedBooks() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, []);

  async function fetchLoans() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch transactions where the user hasn't returned the book yet
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        due_date,
        transaction_type,
        book_id,
        books (
          title,
          authors,
          available_stock
        )
      `)
      .eq('user_id', user.id)
      .eq('transaction_type', 'borrow'); // Only show current borrows

    if (error) console.error(error);
    else setLoans(data || []);
    setLoading(false);
  }

  const handleReturn = async (loanId, bookId, currentAvailableStock) => {
    // 1. Update transaction to 'return'
    const { error: transError } = await supabase
      .from('transactions')
      .update({ transaction_type: 'return', return_date: new Date().toISOString() })
      .eq('id', loanId);

    if (!transError) {
      // 2. Put the book back into available stock
      await supabase
        .from('books')
        .update({ available_stock: currentAvailableStock + 1 })
        .eq('id', bookId);

      alert("Book returned successfully!");
      fetchLoans(); // Refresh the list
    }
  };

  if (loading) return <p style={{ padding: '20px' }}>Loading your books...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>My Borrowed Books</h2>
      {loans.length === 0 ? (
        <p>You have no active borrows.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px' }}>Book Title</th>
              <th style={{ padding: '10px' }}>Due Date</th>
              <th style={{ padding: '10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px' }}>
                  <strong>{loan.books.title}</strong><br/>
                  <small>{loan.books.authors}</small>
                </td>
                <td style={{ padding: '10px' }}>
                  {new Date(loan.due_date).toLocaleDateString()}
                </td>
                <td style={{ padding: '10px' }}>
                  <button 
                    onClick={() => handleReturn(loan.id, loan.book_id, loan.books.available_stock)}
                    style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Return Book
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}