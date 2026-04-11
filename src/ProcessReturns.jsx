import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';
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
    const { data } = await supabaseAdmin
      .from('transactions')
      .select(`
        id,
        return_date,
        users (name, student_id),
        books (title),
        book_copies (accession_id, copy_number)
      `)
      .eq('status', 'returned')
      .order('return_date', { ascending: false })
      .limit(10);
    if (data) setRecentReturns(data);
  }

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const scanned = barcode.trim();
    if (!scanned) return;
    setProcessing(true);

    try {
      // Strategy 1: Look up by copy accession_id (new per-copy system)
      const { data: copy, error: copyError } = await supabaseAdmin
        .from('book_copies')
        .select('id, book_id, accession_id, copy_number, status')
        .eq('accession_id', scanned)
        .maybeSingle();

      if (copy) {
        // Found a specific physical copy
        if (copy.status !== 'borrowed') {
          throw new Error(`Copy ${copy.accession_id} is not currently marked as borrowed. Its status is: "${copy.status}".`);
        }

        const { data: transactions, error: transError } = await supabaseAdmin
          .from('transactions')
          .select('id, user_id, users(name), books(title)')
          .eq('copy_id', copy.id)
          .eq('status', 'borrowed')
          .order('borrow_date', { ascending: true })
          .limit(1);

        if (transError) throw new Error(`Database error: ${transError.message}`);
        if (!transactions || transactions.length === 0) {
          throw new Error(`No active loan found linked to copy ${copy.accession_id}. The copy may have been marked borrowed manually.`);
        }

        const transaction = transactions[0];

        const { error: updateTransError } = await supabaseAdmin
          .from('transactions')
          .update({ status: 'returned', return_date: new Date().toISOString() })
          .eq('id', transaction.id);
        if (updateTransError) throw updateTransError;

        const { error: updateCopyError } = await supabaseAdmin
          .from('book_copies')
          .update({ status: 'available' })
          .eq('id', copy.id);
        if (updateCopyError) throw updateCopyError;

        // Increment available quantity on books table
        const { data: bookData } = await supabaseAdmin
          .from('books')
          .select('quantity')
          .eq('id', copy.book_id)
          .single();
        if (bookData) {
          await supabaseAdmin
            .from('books')
            .update({ quantity: (bookData.quantity || 0) + 1 })
            .eq('id', copy.book_id);
        }

        showToast(
          `✅ Copy ${copy.accession_id} returned by ${transaction.users?.name}. Copy marked available.`,
          'success'
        );
        setBarcode('');
        fetchRecentReturns();
        return;
      }

      // Strategy 2: Fall back to legacy per-book barcode scan
      const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('id, title, quantity')
        .eq('barcode', scanned)
        .maybeSingle();

      if (bookError || !book) {
        throw new Error(`Barcode "${scanned}" not found. Make sure you are scanning a copy accession label (e.g. LIB-2026-000001).`);
      }

      const { data: transactions, error: transError } = await supabaseAdmin
        .from('transactions')
        .select('id, user_id, users(name)')
        .eq('book_id', book.id)
        .eq('status', 'borrowed')
        .order('borrow_date', { ascending: true })
        .limit(1);

      if (transError) throw new Error(`Database error: ${transError.message}`);
      if (!transactions || transactions.length === 0) {
        throw new Error(`"${book.title}" is not currently marked as borrowed.`);
      }

      const transaction = transactions[0];

      const { error: updateTransError } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('id', transaction.id);
      if (updateTransError) throw updateTransError;

      const { error: updateBookError } = await supabaseAdmin
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
        <p style={{ color: '#64748b', marginTop: '5px' }}>
          Scan a book's individual copy barcode (e.g. <code style={{ background: '#eef2ff', color: '#6366f1', padding: '2px 6px', borderRadius: '4px' }}>LIB-2026-000001</code>) to check it back in.
        </p>
      </div>

      <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '6px solid var(--green)', marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#334155', margin: '0 0 8px 0' }}>Ready to Scan</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
          Scan the barcode label on the book's spine — each physical copy has its own unique ID.
        </p>

        <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '500px', margin: '0 auto' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Scan copy barcode (e.g. LIB-2026-000001)"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            disabled={processing}
            style={{ flex: 1, padding: '15px 20px', fontSize: '1.1rem', borderRadius: '8px', border: '2px solid #cbd5e1', outline: 'none', fontFamily: 'monospace' }}
            autoFocus
          />
          <button
            type="submit"
            disabled={processing || !barcode}
            style={{ padding: '0 25px', background: 'var(--maroon)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: processing || !barcode ? 'not-allowed' : 'pointer' }}
          >
            {processing ? '...' : 'Return'}
          </button>
        </form>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <h3 style={{ margin: 0, padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
          Recently Returned
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
                    <span style={{ fontSize: '0.82rem', color: '#6366f1', fontFamily: 'monospace', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>
                      {item.book_copies?.accession_id
                        ? `${item.book_copies.accession_id} (Copy #${item.book_copies.copy_number})`
                        : 'Legacy return'}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px', color: '#475569' }}>
                    Returned by: <strong>{item.users?.name}</strong>
                  </td>
                  <td style={{ padding: '15px 20px', color: '#64748b', fontSize: '0.9rem', textAlign: 'right' }}>
                    {item.return_date
                      ? new Date(item.return_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
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
