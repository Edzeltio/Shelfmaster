import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function LibrarianLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="ShelfMaster" />
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>ShelfMaster</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--light-blue)' }}>Librarian Portal</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/librarian/dashboard" className="sidebar-link">Dashboard</Link>
          <Link to="/librarian/inventory" className="sidebar-link">Inventory</Link>
          <Link to="/librarian/users" className="sidebar-link">User Management</Link>
          <Link to="/librarian/requests" className="sidebar-link">Pending Requests</Link>
          <Link to="/librarian/returns" className="sidebar-link">Process Returns</Link>
          
          {/* NEW: Borrowing History Link */}
          <Link to="/librarian/history" className="sidebar-link">Borrowing History</Link>
          
          <Link to="/librarian/settings" className="sidebar-link">Settings</Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="admin-content">
        {/* This renders the specific page based on the route (Dashboard, History, etc.) */}
        <Outlet /> 
      </main>

    </div>
  );
}