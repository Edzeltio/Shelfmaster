import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import StudentNavbar from './StudentNavbar';

export default function StudentCatalog() {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    setLoading(true);
    const { data, error } = await supabase.from('books').select('*');
    if (!error) setBooks(data || []);
    setLoading(false);
  }

  const filteredBooks = books.filter((book) => {
    const searchStr = searchTerm.toLowerCase();
    return (
      book.title?.toLowerCase().includes(searchStr) ||
      book.authors?.toLowerCase().includes(searchStr) ||
      book.category?.toLowerCase().includes(searchStr)
    );
  });

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <StudentNavbar userName="Jane Doe" />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        
        <div style={headerSectionStyle}>
          <h2 style={{ color: 'var(--maroon)', margin: 0 }}>Library Catalog</h2>
          
          <div style={searchContainerStyle}>
            <span style={searchIconStyle}></span>
            <input 
              type="text" 
              placeholder="Search by title, author, or category..." 
              style={searchInputStyle}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>Loading books...</p>
        ) : (
          <>
            <p style={{ color: '#64748b', marginBottom: '20px' }}>
              Showing {filteredBooks.length} books
            </p>

            <div style={gridStyle}>
              {filteredBooks.length > 0 ? (
                filteredBooks.map(book => (
                  <div key={book.id} style={cardStyle}>
                    <div style={categoryBadgeStyle}>{book.category || 'General'}</div>
                    <h3 style={bookTitleStyle}>{book.title}</h3>
                    <p style={authorStyle}>by {book.authors}</p>
                    
                    <div style={footerStyle}>
                      <span style={stockStyle}>{book.stock > 0 ? '✅ Available' : '❌ Out of Stock'}</span>
                      <button 
                        disabled={book.stock <= 0}
                        style={{...buttonStyle, opacity: book.stock <= 0 ? 0.5 : 1}}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px' }}>
                  <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>No books found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const headerSectionStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '30px',
  flexWrap: 'wrap',
  gap: '20px'
};

const searchContainerStyle = {
  position: 'relative',
  width: '100%',
  maxWidth: '400px'
};

const searchIconStyle = {
  position: 'absolute',
  left: '15px',
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: '1.1rem',
  pointerEvents: 'none'
};

const searchInputStyle = {
  width: '100%',
  padding: '12px 15px 12px 45px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  fontSize: '1rem',
  outlineColor: 'var(--green)',
  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
  boxSizing: 'border-box'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '25px'
};

const cardStyle = {
  background: 'white',
  padding: '25px',
  borderRadius: '15px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s',
  position: 'relative'
};

const categoryBadgeStyle = {
  fontSize: '0.7rem',
  background: '#F5FAE8',
  color: 'var(--green)',
  padding: '4px 10px',
  borderRadius: '20px',
  fontWeight: 'bold',
  alignSelf: 'flex-start',
  marginBottom: '15px',
  textTransform: 'uppercase'
};

const bookTitleStyle = { fontSize: '1.2rem', color: '#1e293b', margin: '0 0 5px 0' };
const authorStyle = { color: '#64748b', fontSize: '0.9rem', marginBottom: '20px', flexGrow: 1 };
const footerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '15px' };
const stockStyle = { fontSize: '0.85rem', fontWeight: '500' };

const buttonStyle = {
  background: 'var(--green)',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.85rem'
};
