import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Home() {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSiteContent() {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .limit(1)
        .single();
      
      if (!error && data) {
        setContent(data);
      }
      setLoading(false);
    }

    fetchSiteContent();
  }, []);

  if (loading) return <div style={{ padding: '5rem', textAlign: 'center', fontSize: '1.2rem' }}>Loading ShelfMaster...</div>;

  return (
    <div className="home-container">
      
      {/* HERO SECTION */}
      <section className="hero-section" style={{ 
        // If a hero banner URL is provided, use it as the background, otherwise keep the solid blue
        backgroundImage: content.hero_banner_url ? `url(${content.hero_banner_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: content.hero_banner_url ? 'overlay' : 'normal',
        backgroundColor: content.hero_banner_url ? 'rgba(152, 4, 4, 0.85)' : 'var(--maroon)'
      }}>
        <div className="hero-content">
          {/* Dynamic Tagline */}
          <h1>{content.tagline || 'Master Every Shelf'}</h1>
          <Link to="/login" className="hero-btn">Try ShelfMaster →</Link>
        </div>
        
        <div style={{ width: '400px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems:'center', justifyContent:'center', color: 'rgba(255,255,255,0.7)' }}>
          [Hero Illustration]
        </div>

        <div className="search-container">
          <input type="text" placeholder="Search for books, authors, or subjects..." />
          <button className="search-btn">🔍</button>
        </div>
      </section>

      {/* FEATURED CATEGORIES (Static for now) */}
      <section className="section-wrapper">
        <h2 className="section-title">Featured Categories</h2>
        <div className="category-grid">
          {['General Reference', 'Academic & Textbooks', 'Thesis & Dissertations', 'Fiction & Literature', 'Special Collections'].map((cat, i) => (
            <div key={i} className="category-card">
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📖</div>
              {cat}
              <div style={{ fontSize: '0.8rem', marginTop: '10px', fontWeight: 'normal' }}>Explore</div>
            </div>
          ))}
        </div>
      </section>

      {/* SYSTEM FEATURES & CONTACT */}
      <section className="section-wrapper" style={{ textAlign: 'center' }}>
        <h2 className="section-title">System Features</h2>
        <div className="features-grid">
          <div className="feature-card"><h3>Centralized Records</h3><p>All book details in one system.</p></div>
          <div className="feature-card"><h3>Faster Transactions</h3><p>Borrow and return instantly.</p></div>
          <div className="feature-card"><h3>Reports & Analytics</h3><p>Generate detailed PDF reports.</p></div>
          <div className="feature-card"><h3>Secure Access</h3><p>Role-based access control.</p></div>
        </div>

        {/* Dynamic Contact Block */}
        <div className="contact-block">
          <div><strong>Email:</strong><br/>{content.contact_email || 'ShelfMaster@wmsu.edu.ph'}</div>
          <div><strong>Phone:</strong><br/>{content.contact_phone || '0912-345-6789'}</div>
          <div><strong>Location:</strong><br/>{content.contact_location || 'Normal Road, Zamboanga City'}</div>
        </div>
      </section>

      {/* ABOUT US */}
      <section className="about-section">
        <div className="about-text">
          <h4 style={{ color: 'var(--green)', letterSpacing: '2px' }}>A BIT</h4>
          <h2 style={{ fontSize: '3rem', margin: '0 0 20px 0', color: 'var(--maroon)' }}>ABOUT US</h2>
          
          {/* Dynamic About Text */}
          <p style={{ lineHeight: '1.8', color: '#555', marginBottom: '30px' }}>
            {content.about_text || 'ShelfMaster provides smart and reliable shelving solutions designed to help organize and maximize space efficiently. We focus on quality, functionality, and customer satisfaction.'}
          </p>
          
          {/* Dynamic Mission/Vision if they exist */}
          {(content.mission || content.vision) && (
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
              {content.mission && (
                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--green)' }}>
                  <strong style={{ color: 'var(--maroon)' }}>Mission:</strong>
                  <p style={{ fontSize: '0.9rem', margin: '5px 0 0 0', color: '#555' }}>{content.mission}</p>
                </div>
              )}
              {content.vision && (
                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <strong style={{ color: 'var(--maroon)' }}>Vision:</strong>
                  <p style={{ fontSize: '0.9rem', margin: '5px 0 0 0', color: '#555' }}>{content.vision}</p>
                </div>
              )}
            </div>
          )}

          <Link to="/login" className="btn-sign-in">EXPLORE MORE</Link>
        </div>
        <div className="about-images">
          <div style={{ height: '150px', background: '#ccc', borderRadius: '10px' }}></div>
          <div style={{ height: '150px', background: '#ccc', borderRadius: '10px' }}></div>
          <div style={{ height: '150px', background: '#ccc', borderRadius: '10px', gridColumn: 'span 2' }}></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <h2 style={{ margin: '0 0 10px 0' }}>ShelfMaster Library</h2>
          {/* Dynamic Footer Copyright */}
          <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
            {content.footer_text || '© 2026 ShelfMaster Library. All rights reserved.'}
          </p>
        </div>
        <div>
          <h4 style={{ color: 'var(--light-blue)' }}>Contact Information</h4>
          <p style={{ fontSize: '0.9rem' }}>{content.contact_email || 'ShelfMaster@wmsu.edu.ph'}</p>
          <p style={{ fontSize: '0.9rem' }}>{content.contact_phone || '0912-345-6789'}</p>
        </div>
        <div>
          <h4 style={{ color: 'var(--light-blue)' }}>Quick Links</h4>
          <Link
            to="/Signup"
            style={{ 
              fontSize: '0.9rem', 
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            Create Account
          </Link>
          <p style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Borrow Book</p>
        </div>
        <div>
          <h4 style={{ color: 'var(--light-blue)' }}>Connect</h4>
        </div>
      </footer>
    </div>
  );
}