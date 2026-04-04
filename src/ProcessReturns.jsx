import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Toast from './Toast';

export default function ProcessReturns() {
  const [barcode, setBarcode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [recentReturns, setRecentReturns] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });
  const inputRef = useRef(null);

  useEffect(() => {
    fetchRecentReturns();
    if (inputRef.current) inputRef.current.focus();
    const onVisible = () => { if (!document.hidden) fetchRecentReturns(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function fetchRecentReturns() {
    const { data } = await supabase
      .from('transactions')
      .select(`
        id,
        return_date,
        users (name, student_id),
        books (title, barcode)
      `)
      .eq('status', 'returned')
      .order('return_date', { ascending: false })
      .limit(5);
    if (data) setRecentReturns(data);
  }

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    setProcessing(true);

    try {
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('id, title, quantity')
        .eq('barcode', barcode.trim())
        .single();

      if (bookError || !book) throw new Error('Book not found in database. Check the barcode.');

      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .select('id, user_id, users(name)')
        .eq('book_id', book.id)
        .eq('status', 'approved')
        .single();

      if (transError || !transaction) throw new Error(`"${book.title}" is not currently marked as borrowed.`);

      const { error: updateTransError } = await supabase
        .from('transactions')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('id', transaction.id);

      if (updateTransError) throw updateTransError;

      const { error: updateBookError } = await supabase
        .from('books')
        .update({ quantity: book.quantity + 1 })
        .eq('id', book.id);

      if (updateBookError) throw updateBookError;

      showToast(`"${book.title}" returned by ${transaction.users?.name}. Stock updated.`, 'success');
      setBarcode('');
      fetchRecentReturns();

    } catch (err) {
      showToast(err.message, 'error');
      setBarcode('');
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--dark-blue)', margin: 0 }}>Process Returns</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Scan a book's barcode to check it back into the library.</p>
      </div>

      <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '6px solid var(--green)', marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#334155', margin: '0 0 20px 0' }}>Ready to Scan</h2>

        <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '500px', margin: '0 auto' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Scan or type barcode here..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={processing}
            style={{ flex: 1, padding: '15px 20px', fontSize: '1.2rem', borderRadius: '8px', border: '2px solid #cbd5e1', outline: 'none' }}
            autoFocus
          />
          <button
            type="submit"
            disabled={processing || !barcode}
            style={{ padding: '0 25px', background: 'var(--maroon)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: processing || !barcode ? 'not-allowed' : 'pointer' }}
          >
            {processing ? '...' : 'Process'}
          </button>
        </form>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <h3 style={{ margin: 0, padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
          Recently Returned Log
        </h3>
        {recentReturns.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No recent returns.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <tbody>
              {recentReturns.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '15px 20px' }}>
                    <strong style={{ display: 'block', color: 'var(--dark-blue)' }}>{item.books?.title}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Barcode: {item.books?.barcode}</span>
                  </td>
                  <td style={{ padding: '15px 20px', color: '#475569' }}>
                    Returned by: <strong>{item.users?.name}</strong>
                  </td>
                  <td style={{ padding: '15px 20px', color: '#64748b', fontSize: '0.9rem', textAlign: 'right' }}>
                    {new Date(item.return_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
