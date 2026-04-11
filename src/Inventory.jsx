import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Inventory() {
  const [books, setBooks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEbookModal, setShowEbookModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(null);
  const [ebookForm, setEbookForm] = useState({ title: '', url: '' });
  const [ebookImgValid, setEbookImgValid] = useState(false);

  const initialFormState = {
    accession_num: '',
    title: '',
    authors: '',
    quantity: 1,
    date_acquired: new Date().toISOString().split('T')[0],
    edition: '',
    pages: '',
    book_type: 'Hardbound',
    subject_class: '',
    cost_price: '',
    publisher: '',
    isbn: '',
    copyright: '',
    source: '',
    remark: '',
    status: 'active'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Fetch error:", error);
    else setBooks(data || []);
  }

  const openAddModal = async () => {
    setIsEditing(false);
    
    const { data } = await supabase
      .from('books')
      .select('accession_num')
      .order('accession_num', { ascending: false })
      .limit(1);
    
    const lastNum = data && data[0] ? parseInt(data[0].accession_num) : 0;
    const nextAcc = (lastNum + 1).toString().padStart(5, '0');

    setFormData({ ...initialFormState, accession_num: nextAcc });
    setShowModal(true);
  };

  const openEditModal = (book) => {
    setIsEditing(true);
    setCurrentBookId(book.id);
    setFormData({ ...book });
    setShowModal(true);
  };

  const handleArchive = async (book) => {
    const confirmed = window.confirm(`Archive "${book.title}"? It will be hidden from the catalog.`);
    if (confirmed) {
      const { error } = await supabase
        .from('books')
        .update({ status: 'archived' })
        .eq('id', book.id);

      if (error) alert("Archive failed: " + error.message);
      else fetchInventory();
    }
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isEditing) {
      const { error } = await supabase
        .from('books')
        .update(formData)
        .eq('id', currentBookId);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('books').insert([formData]);
      if (error) alert(error.message);
    }

    setShowModal(false);
    fetchInventory();
    setLoading(false);
  };

  const openEbookModal = () => {
    setEbookForm({ title: '', url: '' });
    setEbookImgValid(false);
    setShowEbookModal(true);
  };

  const handleSaveEbook = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: last } = await supabase
      .from('books')
      .select('accession_num')
      .order('accession_num', { ascending: false })
      .limit(1);

    const lastNum = last && last[0] ? parseInt(last[0].accession_num) : 0;
    const nextAcc = (lastNum + 1).toString().padStart(5, '0');

    const { error } = await supabase.from('books').insert([{
      accession_num: nextAcc,
      title: ebookForm.title,
      authors: 'eBook',
      quantity: 1,
      book_type: 'eBook',
      source: ebookForm.url,
      date_acquired: new Date().toISOString().split('T')[0],
      status: 'active',
    }]);

    if (error) alert('Failed to save eBook: ' + error.message);
    else {
      setShowEbookModal(false);
      fetchInventory();
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '30px', background: 'var(--cream)', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ color: 'var(--maroon)', margin: 0 }}>Book Inventory</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage technical records and collection status.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={openEbookModal} style={ebookBtnStyle}>
            + Add New eBook
          </button>
          <button onClick={openAddModal} style={addBtnStyle}>
            + Add New Book
          </button>
        </div>
      </header>

      <div style={tableCardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#F5FAE8', color: '#475569' }}>
              <th style={thStyle}>Acc #</th>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Author</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No active books found.</td></tr>
            ) : (
              books.map(book => (
                <tr key={book.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}><code style={codeStyle}>{book.accession_num}</code></td>
                  <td style={tdStyle}><strong>{book.title}</strong></td>
                  <td style={tdStyle}>{book.authors}</td>
                  <td style={tdStyle}>{book.quantity}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEditModal(book)} style={editBtnSmallStyle}>Edit</button>
                      <button onClick={() => handleArchive(book)} style={archiveBtnStyle}>Archive</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EBOOK MODAL */}
      {showEbookModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '480px' }}>
            <h3 style={{ color: 'var(--maroon)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📱 Add New eBook
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>Enter the eBook title and its URL link.</p>

            <form onSubmit={handleSaveEbook}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div style={inputGroup}>
                  <label style={labelStyle}>eBook Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Introduction to Python"
                    style={inputStyle}
                    value={ebookForm.title}
                    onChange={e => setEbookForm({ ...ebookForm, title: e.target.value })}
                  />
                </div>

                <div style={inputGroup}>
                  <label style={labelStyle}>URL / Link</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/book.pdf"
                    style={inputStyle}
                    value={ebookForm.url}
                    onChange={e => {
                      setEbookForm({ ...ebookForm, url: e.target.value });
                      setEbookImgValid(false);
                    }}
                  />
                </div>

                {ebookForm.url && (
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <img
                      src={ebookForm.url}
                      alt="eBook preview"
                      onLoad={() => setEbookImgValid(true)}
                      onError={() => setEbookImgValid(false)}
                      style={{
                        display: ebookImgValid ? 'block' : 'none',
                        width: '100%',
                        maxHeight: '240px',
                        objectFit: 'contain',
                      }}
                    />
                    {!ebookImgValid && (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🔗</div>
                        URL entered — no image preview available
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={modalFooter}>
                <button type="button" onClick={() => setShowEbookModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" disabled={loading} style={{ ...saveBtnStyle, background: '#6366f1' }}>
                  {loading ? 'Saving...' : 'Save eBook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOK MODAL */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ color: 'var(--maroon)', marginBottom: '20px' }}>
              {isEditing ? 'Update Book Details' : 'Register New Book'}
            </h3>
            <form onSubmit={handleSaveBook}>
              <div style={formGridStyle}>
                <div style={{ ...inputGroup, gridColumn: 'span 1', background: '#F5FAE8', padding: '10px', borderRadius: '8px' }}>
                  <label style={labelStyle}>Accession # / Barcode</label>
                  <input 
                    type="text" 
                    required 
                    style={inputStyle} 
                    value={formData.accession_num} 
                    onChange={e => setFormData({...formData, accession_num: e.target.value})} 
                  />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>ISBN</label>
                  <input type="text" style={inputStyle} value={formData.isbn || ''} onChange={e => setFormData({...formData, isbn: e.target.value})} />
                </div>
                <div style={{ ...inputGroup, gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Title</label>
                  <input type="text" required style={inputStyle} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Authors</label>
                  <input type="text" required style={inputStyle} value={formData.authors} onChange={e => setFormData({...formData, authors: e.target.value})} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Quantity</label>
                  <input type="number" style={inputStyle} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Subject Class</label>
                  <input type="text" style={inputStyle} value={formData.subject_class || ''} onChange={e => setFormData({...formData, subject_class: e.target.value})} />
                </div>
                <div style={inputGroup}>
                  <label style={labelStyle}>Publisher</label>
                  <input type="text" style={inputStyle} value={formData.publisher || ''} onChange={e => setFormData({...formData, publisher: e.target.value})} />
                </div>
              </div>
              <div style={modalFooter}>
                <button type="button" onClick={() => setShowModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" disabled={loading} style={saveBtnStyle}>
                  {loading ? 'Saving...' : 'Confirm Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const addBtnStyle = { background: 'var(--green)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', zIndex: 10, position: 'relative' };
const ebookBtnStyle = { background: '#6366f1', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', zIndex: 10, position: 'relative' };
const tableCardStyle = { background: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' };
const thStyle = { padding: '15px' };
const tdStyle = { padding: '15px', fontSize: '0.9rem' };
const codeStyle = { background: '#F5FAE8', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--maroon)', fontWeight: 'bold' };
const editBtnSmallStyle = { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const archiveBtnStyle = { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' };
const formGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b' };
const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' };
const modalFooter = { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' };
const saveBtnStyle = { background: 'var(--green)', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtnStyle = { background: 'transparent', color: '#64748b', border: 'none', fontWeight: '600', cursor: 'pointer' };
