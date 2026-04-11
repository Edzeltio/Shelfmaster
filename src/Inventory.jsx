import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BarcodeLabel, { generateBarcode } from './BarcodeLabel';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [ebooks, setEbooks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEbookModal, setShowEbookModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(null);
  const [ebookForm, setEbookForm] = useState({ title: '', url: '' });
  const [ebookImgValid, setEbookImgValid] = useState(false);
  const [editingEbook, setEditingEbook] = useState(null);

  const initialFormState = {
    accession_num: '',
    barcode: '',
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

    if (error) { console.error("Fetch error:", error); return; }

    const all = data || [];
    setBooks(all.filter(b => b.book_type !== 'eBook'));
    setEbooks(all.filter(b => b.book_type === 'eBook'));
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
    const autoBarcode = generateBarcode(nextAcc);
    setFormData({ ...initialFormState, accession_num: nextAcc, barcode: autoBarcode });
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
      const { error } = await supabase.from('books').update({ status: 'archived' }).eq('id', book.id);
      if (error) alert("Archive failed: " + error.message);
      else fetchInventory();
    }
  };

  const handleSaveBook = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isEditing) {
      const { error } = await supabase.from('books').update(formData).eq('id', currentBookId);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from('books').insert([formData]);
      if (error) alert(error.message);
    }
    setShowModal(false);
    fetchInventory();
    setLoading(false);
  };

  const openEbookModal = (ebook = null) => {
    if (ebook) {
      setEditingEbook(ebook);
      setEbookForm({ title: ebook.title, url: ebook.source || '' });
      setEbookImgValid(false);
    } else {
      setEditingEbook(null);
      setEbookForm({ title: '', url: '' });
      setEbookImgValid(false);
    }
    setShowEbookModal(true);
  };

  const handleSaveEbook = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (editingEbook) {
      const { error } = await supabase
        .from('books')
        .update({ title: ebookForm.title, source: ebookForm.url })
        .eq('id', editingEbook.id);
      if (error) alert('Failed to update eBook: ' + error.message);
    } else {
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
    }

    setShowEbookModal(false);
    fetchInventory();
    setLoading(false);
  };

  const exportBarcodePDF = () => {
    const booksWithBarcode = books.filter(b => b.barcode);
    if (booksWithBarcode.length === 0) {
      alert('No books with barcodes found. Add books first.');
      return;
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const cols = 3;
    const rows = 8;
    const marginX = 8;
    const marginY = 10;
    const cellW = (pageW - marginX * 2) / cols;
    const cellH = (pageH - marginY * 2) / rows;
    const labelsPerPage = cols * rows;

    let labelIndex = 0;

    booksWithBarcode.forEach((book, idx) => {
      if (idx > 0 && idx % labelsPerPage === 0) {
        pdf.addPage();
        labelIndex = 0;
      }

      const col = labelIndex % cols;
      const row = Math.floor(labelIndex / cols);
      const x = marginX + col * cellW;
      const y = marginY + row * cellH;

      // Render barcode to an off-screen canvas
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, book.barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 36,
          fontSize: 9,
          margin: 4,
          displayValue: true,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgW = cellW - 6;
        const imgH = (canvas.height / canvas.width) * imgW;

        // Center the barcode image in the cell
        const imgX = x + (cellW - imgW) / 2;
        const imgY = y + 2;
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

        // Book title (truncated)
        const title = book.title.length > 30 ? book.title.slice(0, 30) + '…' : book.title;
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text(title, x + cellW / 2, imgY + imgH + 3, { align: 'center', maxWidth: cellW - 4 });

        // Accession number
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Acc# ${book.accession_num}`, x + cellW / 2, imgY + imgH + 7, { align: 'center' });

        // Cell border
        pdf.setDrawColor(220, 230, 240);
        pdf.setLineWidth(0.2);
        pdf.rect(x + 1, y + 1, cellW - 2, cellH - 2);

      } catch (err) {
        console.warn('Barcode render failed for:', book.barcode, err);
      }

      labelIndex++;
    });

    pdf.save(`ShelfMaster-Barcodes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div style={{ padding: '30px', background: 'var(--cream)', minHeight: '100vh' }}>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: 'var(--maroon)', margin: 0 }}>Inventory</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Manage your physical books and digital eBooks separately.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'ebooks' && (
            <button onClick={() => openEbookModal()} style={ebookBtnStyle}>
              + Add New eBook
            </button>
          )}
          {activeTab === 'books' && (
            <>
              <button onClick={exportBarcodePDF} style={exportBtnStyle}>
                📄 Export Barcodes PDF
              </button>
              <button onClick={openAddModal} style={addBtnStyle}>
                + Add New Book
              </button>
            </>
          )}
        </div>
      </header>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('books')}
          style={{
            padding: '10px 28px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '0.95rem',
            color: activeTab === 'books' ? 'var(--maroon)' : '#94a3b8',
            borderBottom: activeTab === 'books' ? '3px solid var(--maroon)' : '3px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s'
          }}
        >
          📚 Physical Books <span style={{ marginLeft: '6px', background: activeTab === 'books' ? '#FFF0F0' : '#f1f5f9', color: activeTab === 'books' ? 'var(--maroon)' : '#94a3b8', borderRadius: '10px', padding: '1px 8px', fontSize: '0.8rem' }}>{books.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('ebooks')}
          style={{
            padding: '10px 28px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '0.95rem',
            color: activeTab === 'ebooks' ? '#6366f1' : '#94a3b8',
            borderBottom: activeTab === 'ebooks' ? '3px solid #6366f1' : '3px solid transparent',
            marginBottom: '-2px', transition: 'all 0.15s'
          }}
        >
          📱 eBooks <span style={{ marginLeft: '6px', background: activeTab === 'ebooks' ? '#eef2ff' : '#f1f5f9', color: activeTab === 'ebooks' ? '#6366f1' : '#94a3b8', borderRadius: '10px', padding: '1px 8px', fontSize: '0.8rem' }}>{ebooks.length}</span>
        </button>
      </div>

      {/* PHYSICAL BOOKS TABLE */}
      {activeTab === 'books' && (
        <div style={tableCardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#F5FAE8', color: '#475569' }}>
                <th style={thStyle}>Acc #</th>
                <th style={thStyle}>Barcode</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Author</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No physical books found. Add one using the button above.</td></tr>
              ) : (
                books.map(book => (
                  <tr key={book.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}><code style={codeStyle}>{book.accession_num}</code></td>
                    <td style={tdStyle}><code style={{ ...codeStyle, background: '#eef2ff', color: '#6366f1', fontSize: '0.75rem' }}>{book.barcode || '—'}</code></td>
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
      )}

      {/* EBOOKS GRID */}
      {activeTab === 'ebooks' && (
        <>
          {ebooks.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📱</div>
              <p style={{ fontWeight: 'bold', marginBottom: '6px' }}>No eBooks yet</p>
              <p style={{ fontSize: '0.9rem' }}>Click "+ Add New eBook" to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
              {ebooks.map(ebook => (
                <EbookCard
                  key={ebook.id}
                  ebook={ebook}
                  onEdit={() => openEbookModal(ebook)}
                  onArchive={() => handleArchive(ebook)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* EBOOK MODAL */}
      {showEbookModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '480px' }}>
            <h3 style={{ color: 'var(--maroon)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📱 {editingEbook ? 'Edit eBook' : 'Add New eBook'}
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
                      style={{ display: ebookImgValid ? 'block' : 'none', width: '100%', maxHeight: '240px', objectFit: 'contain' }}
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
                  {loading ? 'Saving...' : editingEbook ? 'Update eBook' : 'Save eBook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHYSICAL BOOK MODAL */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ color: 'var(--maroon)', marginBottom: '20px' }}>
              {isEditing ? 'Update Book Details' : 'Register New Book'}
            </h3>
            <form onSubmit={handleSaveBook}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* LEFT: form fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ ...inputGroup, background: '#F5FAE8', padding: '10px', borderRadius: '8px' }}>
                    <label style={labelStyle}>Accession #</label>
                    <input
                      type="text"
                      required
                      style={inputStyle}
                      value={formData.accession_num}
                      onChange={e => {
                        const acc = e.target.value;
                        setFormData({ ...formData, accession_num: acc, barcode: isEditing ? formData.barcode : generateBarcode(acc) });
                      }}
                    />
                  </div>
                  <div style={inputGroup}>
                    <label style={labelStyle}>Barcode (scan ID)</label>
                    <input
                      type="text"
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.85rem', color: '#6366f1', background: '#eef2ff' }}
                      value={formData.barcode || ''}
                      onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  </div>
                  <div style={inputGroup}>
                    <label style={labelStyle}>ISBN</label>
                    <input type="text" style={inputStyle} value={formData.isbn || ''} onChange={e => setFormData({...formData, isbn: e.target.value})} />
                  </div>
                  <div style={inputGroup}>
                    <label style={labelStyle}>Title</label>
                    <input type="text" required style={inputStyle} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div style={inputGroup}>
                    <label style={labelStyle}>Authors</label>
                    <input type="text" required style={inputStyle} value={formData.authors} onChange={e => setFormData({...formData, authors: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={inputGroup}>
                      <label style={labelStyle}>Quantity</label>
                      <input type="number" style={inputStyle} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                    </div>
                    <div style={inputGroup}>
                      <label style={labelStyle}>Subject Class</label>
                      <input type="text" style={inputStyle} value={formData.subject_class || ''} onChange={e => setFormData({...formData, subject_class: e.target.value})} />
                    </div>
                  </div>
                  <div style={inputGroup}>
                    <label style={labelStyle}>Publisher</label>
                    <input type="text" style={inputStyle} value={formData.publisher || ''} onChange={e => setFormData({...formData, publisher: e.target.value})} />
                  </div>
                </div>

                {/* RIGHT: barcode preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '10px', padding: '20px', gap: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Book Label Preview</p>
                  {formData.barcode ? (
                    <BarcodeLabel
                      value={formData.barcode}
                      title={formData.title}
                      accession={formData.accession_num}
                      compact={true}
                    />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏷️</div>
                      Enter accession # to generate barcode
                    </div>
                  )}
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

function EbookCard({ ebook, onEdit, onArchive }) {
  const [imgValid, setImgValid] = useState(false);

  return (
    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Cover / Placeholder */}
      <div style={{ height: '160px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {ebook.source && (
          <img
            src={ebook.source}
            alt={ebook.title}
            onLoad={() => setImgValid(true)}
            onError={() => setImgValid(false)}
            style={{ display: imgValid ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {!imgValid && (
          <div style={{ textAlign: 'center', color: '#6366f1' }}>
            <div style={{ fontSize: '3rem' }}>📱</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginTop: '4px', color: '#a5b4fc' }}>eBOOK</div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.3 }}>{ebook.title}</p>
          <code style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>{ebook.accession_num}</code>
        </div>

        {ebook.source && (
          <a
            href={ebook.source}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', background: '#eef2ff', color: '#6366f1', textAlign: 'center', padding: '7px', borderRadius: '7px', fontSize: '0.82rem', fontWeight: 'bold', textDecoration: 'none' }}
          >
            🔗 Open eBook
          </a>
        )}

        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
          <button onClick={onEdit} style={{ ...editBtnSmallStyle, flex: 1 }}>Edit</button>
          <button onClick={onArchive} style={{ ...archiveBtnStyle, flex: 1 }}>Archive</button>
        </div>
      </div>
    </div>
  );
}

const addBtnStyle = { background: 'var(--green)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const ebookBtnStyle = { background: '#6366f1', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const exportBtnStyle = { background: '#1e293b', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' };
const tableCardStyle = { background: 'white', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' };
const thStyle = { padding: '15px' };
const tdStyle = { padding: '15px', fontSize: '0.9rem' };
const codeStyle = { background: '#F5FAE8', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--maroon)', fontWeight: 'bold' };
const editBtnSmallStyle = { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' };
const archiveBtnStyle = { background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.82rem' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' };
const formGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const labelStyle = { fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b' };
const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' };
const modalFooter = { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' };
const saveBtnStyle = { background: 'var(--green)', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const cancelBtnStyle = { background: 'transparent', color: '#64748b', border: 'none', fontWeight: '600', cursor: 'pointer' };
