import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { currentUser, logout, showToast } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'head_admin';
  const initials = currentUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const [name, setName] = useState(currentUser?.name || '');
  const [email] = useState(currentUser?.email || '');

  const handleSave = () => {
    showToast('Profile updated successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        <div className="page-header">
          <p className="page-header-label">Account</p>
          <h1>Settings & Profile</h1>
          <p>View and manage your account details.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', maxWidth: 900 }}>
          {/* Profile card */}
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.75rem', fontWeight: 900,
              fontFamily: 'Manrope, sans-serif', margin: '0 auto 1rem',
            }}>{initials}</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>{currentUser?.name}</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginBottom: '1rem' }}>{currentUser?.email}</p>
            <span className={`chip ${isAdmin ? 'chip-info' : 'chip-neutral'}`} style={{ margin: '0 auto' }}>
              {isAdmin ? 'Head Admin' : 'Store Manager'}
            </span>

            {!isAdmin && currentUser?.storeName && (
              <div style={{ marginTop: '1rem', background: 'var(--surface-container-low)', borderRadius: '0.625rem', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)', marginBottom: 4 }}>Assigned Store</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--on-surface)' }}>{currentUser.storeName}</p>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: '0.625rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid var(--surface-container)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Member Since</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{currentUser?.createdAt}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.375rem 0' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Account Status</span>
                <span className="chip chip-success" style={{ fontSize: '0.6875rem' }}>Active</span>
              </div>
            </div>
          </div>

          {/* Edit form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif', marginBottom: '1.25rem', color: 'var(--primary)' }}>
                Edit Profile
              </h3>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" value={email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <p style={{ fontSize: '0.6875rem', color: 'var(--secondary)', marginTop: 4 }}>Email cannot be changed.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input className="form-input" value={isAdmin ? 'Head Admin' : 'Store Manager'} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <button className="btn btn-primary" onClick={handleSave}>
                <span className="material-symbols-outlined">save</span>
                Save Changes
              </button>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif', marginBottom: '1.25rem', color: 'var(--primary)' }}>
                Security
              </h3>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="••••••••" />
              </div>
              <button className="btn btn-secondary" onClick={() => showToast('Password change functionality is mocked.')}>
                <span className="material-symbols-outlined">lock_reset</span>
                Change Password
              </button>
            </div>

            <div className="card" style={{ padding: '1.5rem', borderLeft: '3px solid var(--error)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif', marginBottom: '0.5rem' }}>
                Sign Out
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', marginBottom: '1rem' }}>
                Sign out of your current session. You'll need to log in again to access the system.
              </p>
              <button className="btn btn-danger" onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
