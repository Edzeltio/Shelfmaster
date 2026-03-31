import React from 'react';
import StudentNavbar from './StudentNavbar';

export default function StudentHome() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <StudentNavbar/>
      
      {/* Hero Section */}
      <div style={{ background: '#1e3a8a', padding: '60px 20px', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Welcome back, Jane Doe!</h1>
        <p style={{ opacity: 0.9, marginBottom: '25px' }}>What would you like to read today?</p>
        <button style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          Open Catalog →
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '-40px auto 0', padding: '0 20px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <StatCard title="Active Loans" value="0" linkText="View Due Dates" color="#2563eb" />
          <StatCard title="Pending Requests" value="0" linkText="Check Status" color="#f59e0b" />
          <StatCard title="Account Settings" value="Profile Verified ✅" linkText="Update My Info" color="#10b981" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, linkText, color }) {
  return (
    <div style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: `5px solid ${color}` }}>
      <h4 style={{ color: '#64748b', textTransform: 'uppercase', fontSize: '0.8rem', margin: '0 0 10px 0' }}>{title}</h4>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 15px 0', color: '#1e293b' }}>{value}</p>
      <a href="#" style={{ color: color, textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>{linkText} →</a>
    </div>
  );
}