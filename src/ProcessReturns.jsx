import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function ProcessReturns() {
  const [barcode, setBarcode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [recentReturns, setRecentReturns] = useState([]);
  
  // Ref to automatically keep the scanner input focused
  const inputRef = useRef(null);

  useEffect(() => {
    fetchRecentReturns();
    // Keep focus on the barcode input so the librarian doesn't have to keep clicking it
    if (inputRef.current) inputRef.current.focus();
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
      .limit(5); // Show only the last 5 returned books

    if (data) setRecentReturns(data);
  }

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    
    setProcessing(true);
    setMessage({ text: '', type: '' });

    try {
      // 1. Find the book using the scanned barcode
      const { data: book, error: bookError } = await supabase
        .from('books')
        .select('id, title, quantity')
        .eq('barcode', barcode.trim())
        .single();

      if (bookError || !book) throw new Error('Book not found in database. Check the barcode.');

      // 2. Find the ACTIVE transaction for this exact book
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .select('id, user_id, users(name)')
        .eq('book_id', book.id)
        .eq('status', 'borrowed')
        .single();

      if (transError || !transaction) throw new Error(`"${book.title}" is not currently marked as borrowed.`);

      // 3. Mark transaction as returned
      const { error: updateTransError } = await supabase
        .from('transactions')
        .update({ 
          status: 'returned', 
          return_date: new Date().toISOString() 
        })
        .eq('id', transaction.id);

      if (updateTransError) throw updateTransError;

      // 4. Put the book back on the shelf (increment stock)
      const { error: updateBookError } = await supabase
        .from('books')
        .update({ quantity: book.quantity + 1 })
        .eq('id', book.id);

      if (updateBookError) throw updateBookError;

      // SUCCESS!
      setMessage({ text: `Success: "${book.title}" returned by ${transaction.users?.name}.`, type: 'success' });
      setBarcode(''); // Clear the input for the next scan
      fetchRecentReturns(); // Update the log

    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
      setBarcode('');
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.focus(); // Refocus for the next scan
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--dark-blue)', margin: 0 }}>Process Returns</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Scan a book's barcode to check it back into the library.</p>
      </div>

      {/* SCANNER SECTION */}
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

        {/* Feedback Message Block */}
        {message.text && (
          <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {message.type === 'success' ? '✅ ' : '❌ '}
            {message.text}
          </div>
        )}
      </div>

      {/* RECENTLY RETURNED LOG */}
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