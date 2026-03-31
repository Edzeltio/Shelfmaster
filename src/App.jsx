import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

// Public Pages
import Home from './Home';
import Login from './Login';
import Signup from './Signup';

// Student Pages
import StudentHome from './StudentHome';
import StudentCatalog from './StudentCatalog';
import StudentCart from './StudentCart';
import StudentBooks from './StudentBooks';
import StudentProfile from './StudentProfile'

// Librarian Pages
import LibrarianLayout from './LibrarianLayout';
import LibrarianDashboard from './LibrarianDashboard';
import Inventory from './Inventory';
import UserManagement from './UserManagement';
import PendingRequests from './PendingRequests';
import ProcessReturns from './ProcessReturns';
import Settings from './Settings';
import BorrowingHistory from './BorrowingHistory';

export default function App() {
  return (
    <Router>
      <ConditionalNavbar />
      <Routes>
        {/* 1. PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 2. STUDENT ROUTES */}
        <Route path="/student/home" element={<StudentHome />} />
        <Route path="/student/catalog" element={<StudentCatalog />} />
        <Route path="/student/cart" element={<StudentCart />} />
        <Route path="/student/books" element={<StudentBooks />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/dashboard" element={<StudentHome />} />

        {/* 3. LIBRARIAN ROUTES (Nested inside LibrarianLayout) */}
        <Route path="/librarian" element={<LibrarianLayout />}>
          <Route path="dashboard" element={<LibrarianDashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="requests" element={<PendingRequests />} />
          <Route path="returns" element={<ProcessReturns />} />
          <Route path="settings" element={<Settings />} />
          <Route path="history" element={<BorrowingHistory />} />
        </Route>
      </Routes>
    </Router>
  );
}

/**
 * Helper component that hides the public Navbar on internal portal pages
 * and Auth pages (Login/Signup) to prevent "double navbars".
 */
function ConditionalNavbar() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  // Hide the public navbar if on these specific paths or starting with these prefixes
  const isInternalPage = 
    path.startsWith('/librarian') || 
    path.startsWith('/student') || 
    path === '/login' || 
    path === '/signup';

  if (isInternalPage) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="logo-container">
        <img src="/src/assets/logo.png" alt="Logo" className="logo-img" style={{height: '40px', width: '40px'}} />
        <span className="logo-text">ShelfMaster</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/login" className="btn-sign-in">Sign In</Link>
      </div>
    </nav>
  );
}