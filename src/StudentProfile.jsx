import React, { useState, useEffect } from 'react';
import StudentNavbar from './StudentNavbar';
import { supabase } from './supabaseClient';

export default function StudentProfile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', student_id: '', course_year: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  async function fetchUserProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('users')
      .select('name, student_id, course_year, role, status, email')
      .eq('auth_id', user.id)
      .single();

    if (!error && data) {
      setUserData({ ...data, email: data.email || user.email });
    } else {
      setUserData({ name: user.email?.split('@')[0] || 'Student', email: user.email, student_id: '—', course_year: '—', role: 'student', status: 'active' });
    }
    setLoading(false);
  }

  function openEditModal() {
    setForm({
      name: userData?.name || '',
      student_id: userData?.student_id || '',
      course_year: userData?.course_year || '',
    });
    setSaveMsg('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from('users')
      .update({ name: form.name, student_id: form.student_id, course_year: form.course_year })
      .eq('auth_id', user.id);

    if (error) {
      setSaveMsg('Error saving changes: ' + error.message);
    } else {
      setUserData(prev => ({ ...prev, name: form.name, student_id: form.student_id, course_year: form.course_year }));
      setSaveMsg('✅ Profile updated successfully!');
      setTimeout(() => { setShowModal(false); setSaveMsg(''); }, 1200);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <StudentNavbar />

      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '40px 20px' }}>

        {/* Profile Card */}
        <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
          {/* Top banner */}
          <div style={{ background: 'var(--maroon)', height: '90px', position: 'relative' }} />

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-44px', padding: '0 30px 30px' }}>
            <div style={avatarStyle}>
              {(userData?.name || 'S').charAt(0).toUpperCase()}
            </div>

            <h2 style={{ margin: '14px 0 2px', color: '#1e293b', fontSize: '1.3rem' }}>{userData?.name || 'Student'}</h2>
            <p style={{ margin: '0 0 6px', color: '#64748b', fontSize: '0.9rem' }}>{userData?.email || '—'}</p>
            <span style={roleBadgeStyle}>{userData?.role?.toUpperCase() || 'STUDENT'}</span>

            <div style={{ borderTop: '1px solid #f1f5f9', width: '100%', marginTop: '24px', paddingTop: '24px' }}>
              <InfoRow label="Student ID" value={userData?.student_id || '—'} />
              <InfoRow label="Course & Year" value={userData?.course_year || '—'} />
              <InfoRow label="Account Status" value={
                <span style={{ color: userData?.status === 'active' ? 'var(--green)' : '#ef4444', fontWeight: '600', textTransform: 'capitalize' }}>
                  {userData?.status || 'active'}
                </span>
              } />
            </div>

            <button onClick={openEditModal} style={editBtnStyle}>
              ✏️ Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div style={overlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h3 style={{ margin: 0, color: 'var(--maroon)' }}>Edit Profile</h3>
              <button onClick={() => setShowModal(false)} style={closeBtnStyle}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Student ID</label>
                <input
                  type="text"
                  value={form.student_id}
                  onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. 2024-0001"
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Course & Year</label>
                <input
                  type="text"
                  value={form.course_year}
                  onChange={e => setForm(p => ({ ...p, course_year: e.target.value }))}
                  style={inputStyle}
                  placeholder="e.g. BSCS-2"
                />
              </div>

              {saveMsg && (
                <p style={{ margin: 0, fontSize: '0.88rem', color: saveMsg.startsWith('✅') ? 'var(--green)' : '#ef4444', textAlign: 'center' }}>
                  {saveMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" disabled={saving} style={saveBtnStyle}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ color: '#94a3b8', fontSize: '0.88rem', fontWeight: '600' }}>{label}</span>
      <span style={{ color: '#1e293b', fontWeight: '500', fontSize: '0.95rem' }}>{value}</span>
    </div>
  );
}

const avatarStyle = {
  width: '88px',
  height: '88px',
  borderRadius: '50%',
  background: 'var(--maroon)',
  color: 'white',
  fontSize: '2.2rem',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '4px solid white',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};

const roleBadgeStyle = {
  background: '#F5FAE8',
  color: 'var(--green)',
  fontSize: '0.72rem',
  fontWeight: 'bold',
  padding: '4px 14px',
  borderRadius: '20px',
  letterSpacing: '0.5px',
};

const editBtnStyle = {
  marginTop: '22px',
  background: 'var(--maroon)',
  color: 'white',
  border: 'none',
  padding: '10px 26px',
  borderRadius: '10px',
  fontWeight: 'bold',
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};

const modalStyle = {
  background: 'white',
  borderRadius: '16px',
  padding: '30px',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '1.1rem',
  cursor: 'pointer',
  color: '#94a3b8',
  padding: '4px 8px',
  borderRadius: '6px',
};

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle = { fontSize: '0.82rem', fontWeight: '700', color: '#475569' };
const inputStyle = {
  padding: '11px 14px',
  borderRadius: '9px',
  border: '1px solid #e2e8f0',
  fontSize: '0.95rem',
  background: '#fafff0',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const cancelBtnStyle = {
  flex: 1,
  padding: '11px',
  borderRadius: '9px',
  border: '1px solid #e2e8f0',
  background: 'white',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.9rem',
};

const saveBtnStyle = {
  flex: 2,
  padding: '11px',
  borderRadius: '9px',
  border: 'none',
  background: 'var(--maroon)',
  color: 'white',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '0.9rem',
};
