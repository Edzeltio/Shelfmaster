import React, { useState, useEffect } from 'react';
import StudentNavbar from './StudentNavbar';
import { supabase } from './supabaseClient';   // ← Make sure this path is correct

export default function StudentProfile() {
  const [userData, setUserData] = useState({
    fullName: 'Loading...',
    studentId: '',
    course: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        // 1. Get the currently logged-in user from Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Not logged in → redirect or show message
          console.warn('No user logged in');
          setUserData({
            fullName: 'Guest',
            studentId: 'N/A',
            course: 'N/A'
          });
          setLoading(false);
          return;
        }

        // 2. Fetch extra profile data from your 'profiles' table
        const { data: profile, error } = await supabase
          .from('profiles')                    // ← Change if your table name is different
          .select('full_name, student_id, course')   // ← Add/remove columns as needed
          .eq('id', user.id)                   // Match by auth user ID
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          // Fallback to email-based name
          setUserData({
            fullName: user.email?.split('@')[0] || 'Student',
            studentId: 'N/A',
            course: 'N/A'
          });
        } else {
          setUserData({
            fullName: profile?.full_name || user.email?.split('@')[0] || 'Student',
            studentId: profile?.student_id || 'Not set',
            course: profile?.course || 'Not set'
          });
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, []);

  // Show loading while fetching
  if (loading) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <StudentNavbar userName={userData.fullName} />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: 'var(--maroon)', marginBottom: '20px' }}>Account Profile</h2>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <p><strong>Name:</strong> {userData.fullName}</p>
            <p><strong>Student ID:</strong> {userData.studentId}</p>
            <p><strong>Course:</strong> {userData.course}</p>
          </div>
        </div>
      </div>
    </div>
  );
}