import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Toast from './Toast';

export default function PendingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    fetchPendingRequests();
    const onVisible = () => { if (!document.hidden) fetchPendingRequests(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function fetchPendingRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        created_at,
        status,
        user_id,
        book_id,
        users (name, student_id, role),
        books (title, barcode, quantity)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      showToast('Failed to load pending requests.', 'error');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }

  const handleAction = async (transactionId, newStatus, bookId, currentStock, userRole) => {
    try {
      const isTeacher = userRole === 'teacher';
      const dueDate = newStatus === 'approved'
        ? (isTeacher ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        : null;

      const { data: updatedTrans, error: transError } = await supabase
        .from('transactions')
        .update({
          status: newStatus,
          borrow_date: newStatus === 'approved' ? new Date().toISOString() : null,
          due_date: dueDate
        })
        .eq('id', transactionId)
        .select();

      if (transError) throw transError;

      if (!updatedTrans || updatedTrans.length === 0) {
        throw new Error(
          'The database rejected this update. Please check that the transactions table has an UPDATE policy enabled for librarians in Supabase.'
        );
      }

      if (newStatus === 'approved') {
        const { data: updatedBook, error: stockError } = await supabase
          .from('books')
          .update({ quantity: currentStock - 1 })
          .eq('id', bookId)
          .select();

        if (stockError) throw stockError;

        if (!updatedBook || updatedBook.length === 0) {
          throw new Error(
            'Transaction approved but stock could not be updated. Check the UPDATE policy on the books table in Supabase.'
          );
        }
      }

      showToast(
        newStatus === 'approved'
          ? `Book approved and released to ${isTeacher ? 'teacher (no due date)' : 'student (7-day loan)'}.`
          : 'Request declined and removed.',
        'success'
      );

      fetchPendingRequests();

    } catch (error) {
      console.error('handleAction error:', error);
      showToast('Error: ' + error.message, 'error');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading pending requests...</div>;

  return (
    <div>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--dark-blue)', margin: 0 }}>Pending Borrow Requests</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Verify the Student's ID and hand over the physical book before approving.</p>
      </div>

      {requests.length === 0 ? (
        <div style={{ background: 'white', padding: '3rem', textAlign: 'center', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          <h3>All caught up!</h3>
          <p>There are no pending book requests at the moment.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#F5FAE8', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '15px 20px', color: '#475569' }}>Date Requested</th>
                <th style={{ padding: '15px 20px', color: '#475569' }}>Patron Details</th>
                <th style={{ padding: '15px 20px', color: '#475569' }}>Book Details</th>
                <th style={{ padding: '15px 20px', color: '#475569' }}>Role / Terms</th>
                <th style={{ padding: '15px 20px', color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px 20px', color: '#64748b' }}>
                    {new Date(req.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <strong style={{ color: 'var(--dark-blue)', display: 'block' }}>{req.users?.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>ID: {req.users?.student_id || 'N/A'}</span>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <strong style={{ display: 'block' }}>{req.books?.title}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Barcode: {req.books?.barcode}</span>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: req.books?.quantity > 0 ? 'var(--green)' : '#ef4444' }}>
                      {req.books?.quantity ?? 0} in stock
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <span style={{
                      background: req.users?.role === 'teacher' ? '#FFF0F5' : '#F5FAE8',
                      color: req.users?.role === 'teacher' ? 'var(--maroon)' : 'var(--green)',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase'
                    }}>
                      {req.users?.role}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleAction(req.id, 'approved', req.book_id, req.books?.quantity, req.users?.role)}
                      disabled={req.books?.quantity <= 0}
                      style={{
                        padding: '8px 12px',
                        background: req.books?.quantity > 0 ? 'var(--green)' : '#9ca3af',
                        color: 'white', border: 'none', borderRadius: '4px',
                        cursor: req.books?.quantity > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '0.85rem', fontWeight: 'bold'
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'declined', req.book_id, req.books?.quantity, req.users?.role)}
                      style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                    >
                      Decline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
