import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import myLogo from './assets/logo.png';

export default function StudentNavbar() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function fetchUserName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('auth_id', user.id)
          .single();
        if (data?.name) setUserName(data.name);
      }
    }
    fetchUserName();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav style={navStyle}>
      <div style={logoSectionStyle}>
        <img src={myLogo} alt="ShelfMaster Logo" style={logoImgStyle} />
        <span style={brandNameStyle}>ShelfMaster</span>
      </div>

      <div style={linksContainerStyle}>
        <Link to="/student/dashboard" style={linkStyle}>Home</Link>
        <Link to="/student/catalog" style={linkStyle}>Catalog</Link>
        <Link to="/student/books" style={linkStyle}>My Books</Link>
        <Link to="/student/profile" style={linkStyle}>Profile</Link>
        
        <div style={userSectionStyle}>
          {userName && <span style={userNameStyle}>{userName}</span>}
          <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

const navStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 40px',
  background: 'white',
  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  position: 'sticky',
  top: 0,
  zIndex: 1000
};

const logoSectionStyle = { display: 'flex', alignItems: 'center', gap: '12px' };
const logoImgStyle = { width: '40px', height: '40px', objectFit: 'contain' };

const brandNameStyle = {
  fontSize: '1.4rem',
  fontWeight: 'bold',
  color: 'var(--maroon)',
  letterSpacing: '-0.5px'
};

const linksContainerStyle = { display: 'flex', alignItems: 'center', gap: '25px' };

const linkStyle = {
  textDecoration: 'none',
  color: '#64748b',
  fontWeight: '500',
  fontSize: '0.95rem',
  transition: 'color 0.2s'
};

const userSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  marginLeft: '10px',
  paddingLeft: '20px',
  borderLeft: '1px solid #e2e8f0'
};

const userNameStyle = {
  color: 'var(--maroon)',
  fontWeight: '600',
  fontSize: '0.9rem'
};

const logoutButtonStyle = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid var(--maroon)',
  background: 'transparent',
  color: 'var(--maroon)',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'all 0.2s'
};
