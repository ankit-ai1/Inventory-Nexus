import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LOGIN_CREDENTIALS, DUMMY_USERS } from '../data/dummy';

export default function LoginPage() {
  const { login, showToast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const cred = LOGIN_CREDENTIALS.find(c => c.email === email && c.password === password);
      if (cred) {
        const user = DUMMY_USERS.find(u => u.id === cred.userId);
        if (user) {
          login(user);
          showToast(`Welcome back, ${user.name.split(' ')[0]}!`);
          navigate('/dashboard');
        }
      } else {
        setError('Invalid email or password. Try alex.sterling@nexus.com / admin123');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        {/* Brand side */}
        <div className="login-brand">
          <div className="login-brand-logo">
            <div className="login-brand-logo-icon">
              <span className="material-symbols-outlined filled" style={{ color: 'white', fontSize: 22 }}>inventory_2</span>
            </div>
            <h1>Inventory Nexus</h1>
          </div>
          <div>
            <p className="login-brand-tagline">Authorized Access Only</p>
            <h2>Global Logistics<br />Orchestrated.</h2>
            <div className="login-brand-divider" />
            <p className="login-brand-desc">
              Central command for global inventory tracking, multi-region store management, and administrative role provisioning.
            </p>
            <div className="login-brand-stats">
              <div>
                <div className="login-brand-stat-value">142</div>
                <div className="login-brand-stat-label">Active Hubs</div>
              </div>
              <div>
                <div className="login-brand-stat-value">99.9%</div>
                <div className="login-brand-stat-label">System Uptime</div>
              </div>
              <div>
                <div className="login-brand-stat-value">12.4k</div>
                <div className="login-brand-stat-label">Products</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="login-form-side">
          <h3>Welcome Back</h3>
          <p>Secure role-based authentication required.</p>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Work Email Address</label>
              <div className="login-field-inner">
                <span className="material-symbols-outlined">mail</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@nexus.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <a href="#" style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                  Forgot Access?
                </a>
              </div>
              <div className="login-field-inner">
                <span className="material-symbols-outlined">lock</span>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="login-field-toggle" onClick={() => setShowPass(!showPass)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'var(--error-container)', color: 'var(--on-error-container)',
                borderRadius: '0.5rem', padding: '0.75rem 1rem',
                fontSize: '0.8125rem', marginBottom: '1rem',
                display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>error</span>
                {error}
              </div>
            )}

            <div className="login-security-note">
              <span className="material-symbols-outlined filled" style={{ fontSize: 18 }}>security</span>
              <p>
                <strong>Secure Session Protocol</strong>
                JWT-based auth with role-based redirection. Head Admin gets full access; Store Managers get restricted inventory access.
              </p>
            </div>

            <div style={{ marginBottom: '1rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--secondary)', fontWeight: 600, marginBottom: '0.375rem' }}>
                DEMO CREDENTIALS
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface)' }}>
                <strong>Head Admin:</strong> alex.sterling@nexus.com / admin123
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface)' }}>
                <strong>Store Manager:</strong> jordan.patel@nexus.com / store123
              </p>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Authenticating...' : 'Authenticate & Enter Nexus'}
            </button>
          </form>

          <footer style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>
              © 2025 Inventory Nexus Global Systems · Secure Core v4.2.1
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
