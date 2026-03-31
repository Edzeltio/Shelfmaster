import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import myLogo from './assets/logo.png'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      alert("Login Failed: " + authError.message);
      setLoading(false);
      return;
    }

    // 2. Fetch user role from your 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.error("Role fetch error:", userError);
      alert("Account verified, but role not found in database.");
      setLoading(false);
      return;
    }

    // 3. Redirect based on role
    // librarian -> LibrarianDashboard
    // student -> StudentHome (via the /student/dashboard route)
    if (userData.role === 'librarian') {
      navigate('/librarian/dashboard');
    } else if (userData.role === 'student') {
      navigate('/student/dashboard'); // This now correctly triggers StudentHome
    } else {
      alert("Unauthorized role: " + userData.role);
    }
    
    setLoading(false);
  };

  return (
    <div style={wrapperStyle}>
      {/* LEFT PANEL: Blue section with subtle library background */}
      <div style={leftPanelBaseStyle}>
        <div style={{
          ...backgroundOverlayStyle,
          backgroundImage: "url('/library.png')" 
        }}></div>

        <div style={leftPanelContentStyle}>
          <h1 style={{ color: 'white', fontSize: '3.5rem', fontWeight: '800', margin: 0 }}>ShelfMaster</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', marginTop: '10px' }}>
            The heart of your library.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Login Form */}
      <div style={rightPanelStyle}>
        <div style={formCardStyle}>
          <img src={myLogo} alt="Logo" style={logoStyle} />
          
          <h2 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '8px' }}>Welcome Back</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '32px', fontSize: '0.9rem' }}>
            Please enter your details
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <input 
                type="email" 
                placeholder="janedoe@gmail.com"
                style={inputStyle} 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                style={inputStyle} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- CSS-IN-JS STYLES (Kept separate for neatness) ---

const wrapperStyle = { display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' };

const leftPanelBaseStyle = {
  flex: '1.2',
  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const backgroundOverlayStyle = {
  position: 'absolute',
  top: 0, left: 0, width: '100%', height: '100%',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: 0.1,
  zIndex: 1
};

const leftPanelContentStyle = { position: 'relative', zIndex: 2, padding: '60px', width: '100%' };
const rightPanelStyle = { flex: '1', background: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const formCardStyle = { width: '100%', maxWidth: '380px', padding: '20px' };
const logoStyle = { width: '80px', margin: '0 auto 24px', display: 'block' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '8px' };
const labelStyle = { fontSize: '0.9rem', fontWeight: '600', color: '#475569' };
const inputStyle = { padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', background: '#f8fafc', outlineColor: '#2563eb' };
const buttonStyle = { background: '#2563eb', color: 'white', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' };