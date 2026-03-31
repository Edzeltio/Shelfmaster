import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    student_id: '',
    course_year: '',
    role: 'student' // Default to student
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the account in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create the profile in your public.users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              auth_id: authData.user.id,
              name: formData.name,
              student_id: formData.student_id,
              course_year: formData.course_year,
              role: formData.role,
              status: 'active'
            }
          ]);

        if (profileError) throw profileError;

        alert("Registration successful! You can now log in.");
        navigate('/login');
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="login-wrapper">
      <div className="login-split-card" style={{ maxWidth: '1000px' }}>
        
        {/* Left Side: Information */}
        <div className="login-left">
          <img src="src/assets/logo.png" alt="ShelfMaster Logo" className="login-left-logo" />
          <h2>Join ShelfMaster</h2>
          <p>Create your account to start borrowing books, tracking your due dates, and exploring our digital catalog.</p>
          <div style={{ marginTop: '20px', textAlign: 'left', fontSize: '0.85rem' }}>
            <p>✅ Access thousands of titles</p>
            <p>✅ Real-time availability checks</p>
            <p>✅ Automated due-date reminders</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="login-right">
          <h2>Create Account</h2>
          <p>Enter your details below to register</p>

          <form className="login-form-container" onSubmit={handleSignup} style={{ maxWidth: '400px' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Full Name</label>
            <div className="input-group">
              <input type="text" name="name" placeholder="John Doe" onChange={handleChange} required />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Student ID</label>
                <div className="input-group">
                  <input type="text" name="student_id" placeholder="2024-0001" onChange={handleChange} required />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Course & Year</label>
                <div className="input-group">
                  <input type="text" name="course_year" placeholder="BSCpE-1" onChange={handleChange} required />
                </div>
              </div>
            </div>

            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Email Address</label>
            <div className="input-group">
              <input type="email" name="email" placeholder="email@example.com" onChange={handleChange} required />
            </div>

            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Password</label>
            <div className="input-group">
              <input type="password" name="password" placeholder="••••••••" onChange={handleChange} required />
            </div>

            <button type="submit" className="btn-submit" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p style={{ marginTop: '20px', fontSize: '0.9rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--dark-blue)', fontWeight: 'bold' }}>Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}