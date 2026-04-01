import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

/**
 * Wraps all student-only routes.
 * - Redirects to /login if no session exists.
 * - Redirects to /login if the logged-in user is not a student.
 * - Listens to cross-tab auth changes (e.g. librarian logging in on another tab)
 *   and immediately redirects so sessions never bleed between roles.
 */
export default function StudentRoute({ children }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking' | 'allowed'

  useEffect(() => {
    async function checkRole(userId) {
      if (!userId) {
        navigate('/login', { replace: true });
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', userId)
        .single();

      if (!data || data.role !== 'student') {
        navigate('/login', { replace: true });
      } else {
        setStatus('allowed');
      }
    }

    // Initial check on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      checkRole(user?.id ?? null);
    });

    // React to cross-tab session changes in real time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/login', { replace: true });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setStatus('checking');
        checkRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Verifying session...</p>
      </div>
    );
  }

  return children;
}
