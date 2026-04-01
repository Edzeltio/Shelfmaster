import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import StudentNavbar from './StudentNavbar';

export default function StudentCatalog() {
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('title-asc');
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    setLoading(true);
    const { data, error } = await supabase.from('books').select('*').neq('status', 'archived');
    if (!error) setBooks(data || []);
    setLoading(false);
  }

  const handleAddToCart = async (book) => {
    setAddingId(book.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please log in first.'); return; }

      const { data: existing } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('book_id', book.id)
        .in('status', ['pending', 'borrowed'])
        .maybeSingle();

      if (existing) {
        alert(existing.status === 'borrowed'
          ? 'You already have this book borrowed.'
          : 'You already have a pending request for this book.');
        return;
      }

      const { error } = await supabase.from('transactions').insert([{
        user_id: user.id,
        book_id: book.id,
        status: 'pending',
      }]);

      if (error) throw error;
      alert(`"${book.title}" has been added to your requests!`);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAddingId(null);
    }
  };

  const categories = ['All', ...new Set(books.map(b => b.category || 'General').filter(Boolean))].sort();

  const filteredBooks = books
    .filter(book => {
      const s = searchTerm.toLowerCase();
      const matchSearch =
        book.title?.toLowerCase().includes(s) ||
        book.authors?.toLowerCase().includes(s) ||
        (book.category || 'General').toLowerCase().includes(s);
      const matchCategory =
        categoryFilter === 'All' || (book.category || 'General') === categoryFilter;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
      if (sortBy === 'available') {
        const aStock = a.available_stock ?? a.stock ?? 0;
        const bStock = b.available_stock ?? b.stock ?? 0;
        return bStock - aStock;
      }
      return 0;
    });

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <StudentNavbar />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--maroon)', margin: '0 0 6px 0' }}>Library Catalog</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Browse and request books from the collection</p>
        </div>

        {/* Filters Bar */}
        <div style={filtersBarStyle}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '2', minWidth: '220px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Search title, author, or category..."
              style={searchInputStyle}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={selectStyle}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={selectStyle}
          >
            <option value="title-asc">Title A → Z</option>
            <option value="title-desc">Title Z → A</option>
            <option value="available">Available First</option>
          </select>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>Loading books...</p>
        ) : (
          <>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
              Showing <strong>{filteredBooks.length}</strong> {filteredBooks.length === 1 ? 'book' : 'books'}
            </p>

            <div style={gridStyle}>
              {filteredBooks.length > 0 ? (
                filteredBooks.map(book => {
                  const stock = book.available_stock ?? book.stock ?? 0;
                  const isAvailable = stock > 0;
                  return (
                    <div key={book.id} style={cardStyle}>
                      <div style={categoryBadgeStyle}>{book.category || 'General'}</div>
                      <h3 style={bookTitleStyle}>{book.title}</h3>
                      <p style={authorStyle}>by {book.authors}</p>
                      <div style={footerStyle}>
                        <span style={{ fontSize: '0.82rem', fontWeight: '600', color: isAvailable ? 'var(--green)' : '#ef4444' }}>
                          {isAvailable ? `✅ ${stock} Available` : '❌ Out of Stock'}
                        </span>
                        <button
                          disabled={!isAvailable || addingId === book.id}
                          onClick={() => handleAddToCart(book)}
                          style={{ ...buttonStyle, opacity: !isAvailable ? 0.4 : 1, cursor: !isAvailable ? 'not-allowed' : 'pointer' }}
                        >
                          {addingId === book.id ? '...' : 'Request'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
                  <p style={{ fontSize: '1.1rem', color: '#94a3b8' }}>No books found matching your filters.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const filtersBarStyle = {
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  flexWrap: 'wrap',
  alignItems: 'center',
};

const searchInputStyle = {
  width: '100%',
  padding: '11px 14px 11px 42px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  fontSize: '0.95rem',
  background: 'white',
  boxSizing: 'border-box',
  outline: 'none',
};

const selectStyle = {
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  fontSize: '0.9rem',
  background: 'white',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '160px',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
  gap: '22px',
};

const cardStyle = {
  background: 'white',
  padding: '22px',
  borderRadius: '14px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
};

const categoryBadgeStyle = {
  fontSize: '0.68rem',
  background: '#F5FAE8',
  color: 'var(--green)',
  padding: '4px 10px',
  borderRadius: '20px',
  fontWeight: 'bold',
  alignSelf: 'flex-start',
  marginBottom: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const bookTitleStyle = { fontSize: '1.05rem', color: '#1e293b', margin: '0 0 4px 0', fontWeight: '700' };
const authorStyle = { color: '#64748b', fontSize: '0.88rem', marginBottom: '16px', flexGrow: 1 };
const footerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px' };

const buttonStyle = {
  background: 'var(--green)',
  color: 'white',
  border: 'none',
  padding: '7px 16px',
  borderRadius: '8px',
  fontWeight: 'bold',
  fontSize: '0.85rem',
  transition: 'opacity 0.2s',
};
