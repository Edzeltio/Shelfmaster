import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    // Fetch users joined with their transaction counts to see who is active
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        transactions (id, status)
      `)
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching students:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  // Filter students based on Name, Student ID, or Course
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.course_year?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: 'var(--dark-blue)', margin: 0 }}>Student Management</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Search and manage registered student accounts.</p>
        </div>
        
        <div style={{ width: '350px' }}>
          <input 
            type="text" 
            placeholder="Search by name, ID, or course..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
      </div>

      {loading ? (
        <p>Loading student directory...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#F5FAE8', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Student Name</th>
                <th style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Student ID</th>
                <th style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Course & Year</th>
                <th style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Books Held</th>
                <th style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No students found.</td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const activeLoans = user.transactions?.filter(t => t.status === 'approved').length || 0;
                  
                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '15px 20px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--dark-blue)' }}>{user.name}</div>
                      </td>
                      <td style={{ padding: '15px 20px', color: '#475569' }}>{user.student_id}</td>
                      <td style={{ padding: '15px 20px', color: '#475569' }}>{user.course_year}</td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{ 
                          background: activeLoans > 0 ? '#F5FAE8' : '#f8fafc', 
                          color: activeLoans > 0 ? 'var(--green)' : '#94a3b8', 
                          padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' 
                        }}>
                          {activeLoans} Books
                        </span>
                      </td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{ 
                          color: user.status === 'active' ? '#10b981' : '#ef4444', 
                          fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize' 
                        }}>
                          ● {user.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}