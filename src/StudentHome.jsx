import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from './StudentNavbar';
import { supabase } from './supabaseClient';

export default function StudentHome() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({ loans: 0, pending: 0 });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the users table id (transactions FK references users.id, not auth UUID)
      const [nameRes] = await Promise.all([
        supabase.from('users').select('id, name').eq('auth_id', user.id).single(),
      ]);
      if (nameRes.data?.name) setUserName(nameRes.data.name);
      const usersId = nameRes.data?.id;
      if (!usersId) { return; }

      const [loansRes, pendingRes] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', usersId).eq('status', 'approved'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', usersId).eq('status', 'pending'),
      ]);

      setStats({
        loans: loansRes.count ?? 0,
        pending: pendingRes.count ?? 0,
      });
    }
    loadData();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <StudentNavbar />

      {/* Hero */}
      <div style={{ background: 'var(--maroon)', padding: '60px 20px', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          Welcome back{userName ? `, ${userName}` : ''}!
        </h1>
        <p style={{ opacity: 0.9, marginBottom: '25px' }}>What would you like to read today?</p>
        <button
          onClick={() => navigate('/student/catalog')}
          style={{ background: 'var(--yellow)', color: 'var(--maroon)', border: 'none', padding: '12px 26px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
        >
          Open Catalog →
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ maxWidth: '1200px', margin: '-40px auto 0', padding: '0 20px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <StatCard
            title="Active Loans"
            value={stats.loans}
            linkText="View Due Dates"
            color="var(--green)"
            onClick={() => navigate('/student/books')}
          />
          <StatCard
            title="Pending Requests"
            value={stats.pending}
            linkText="Check Status"
            color="var(--yellow)"
            textColor="var(--maroon)"
            onClick={() => navigate('/student/books')}
          />
          <StatCard
            title="Account"
            value="Profile Verified ✅"
            linkText="Update My Info"
            color="var(--maroon)"
            onClick={() => navigate('/student/profile')}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, linkText, color, textColor, onClick }) {
  return (
    <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: `5px solid ${color}` }}>
      <h4 style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.8rem', margin: '0 0 10px 0' }}>{title}</h4>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 15px 0', color: '#1e293b' }}>{value}</p>
      <button
        onClick={onClick}
        style={{ background: 'none', border: 'none', padding: 0, color: textColor || color, textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
      >
        {linkText} →
      </button>
    </div>
  );
}
