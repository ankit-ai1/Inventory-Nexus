import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { login, showToast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('inv_remember_email') || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState(() => {
    try { return localStorage.getItem('inv_remember_pass') || ''; } catch { return ''; }
  });
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return !!localStorage.getItem('inv_remember_email'); } catch { return false; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      try {
        if (rememberMe) {
          localStorage.setItem('inv_remember_email', email);
          localStorage.setItem('inv_remember_pass', password);
        } else {
          localStorage.removeItem('inv_remember_email');
          localStorage.removeItem('inv_remember_pass');
        }
      } catch { /* noop */ }
      const firstName = email.split('@')[0].split('.')[0];
      showToast(`Welcome back, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRememberMe = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      try { localStorage.removeItem('inv_remember_email'); localStorage.removeItem('inv_remember_pass'); } catch { /* noop */ }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* ── LEFT: Form panel ─────────────────────────────────────────── */}
      <div className="login-left-panel" style={{
        flex: '0 0 42%', width: '42%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem 4rem',
        background: 'var(--surface-container-lowest)',
        position: 'relative', zIndex: 1,
        overflowY: 'auto',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span className="material-symbols-outlined filled" style={{ color: '#fff', fontSize: 24 }}>inventory_2</span>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.0625rem', color: 'var(--primary)', fontFamily: 'Manrope, sans-serif', lineHeight: 1.1 }}>
              Inventory Nexus
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--secondary)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
              v2.0 — Global Logistics
            </div>
          </div>
        </div>

        {/* Heading */}
        <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '2.125rem', color: 'var(--on-surface)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Welcome back!
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'var(--secondary)', marginBottom: '2.25rem' }}>
          Enter your credentials to access the dashboard.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom: '1.375rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)', marginBottom: '0.625rem' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: 'var(--outline)', pointerEvents: 'none' }}>
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
                style={{
                  width: '100%', padding: '0.9rem 1rem 0.9rem 2.875rem',
                  borderRadius: '0.75rem', border: '1.5px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                  fontSize: '0.9375rem', color: 'var(--on-surface)',
                  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,71,141,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--outline-variant)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)' }}>
                Password
              </label>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: 'var(--outline)', pointerEvents: 'none' }}>
                lock
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '0.9rem 3rem 0.9rem 2.875rem',
                  borderRadius: '0.75rem', border: '1.5px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                  fontSize: '0.9375rem', color: 'var(--on-surface)',
                  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,71,141,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--outline-variant)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex', padding: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => handleRememberMe(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>Remember me</span>
          </label>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--error-container)', color: 'var(--on-error-container)',
              borderRadius: '0.5rem', padding: '0.625rem 0.875rem',
              fontSize: '0.8rem', marginBottom: '1rem',
              display: 'flex', gap: '0.5rem', alignItems: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>error</span>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.875rem',
              borderRadius: '0.75rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'var(--outline-variant)' : 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              color: '#fff', fontSize: '0.9375rem', fontWeight: 700,
              fontFamily: 'Manrope, sans-serif',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(0,71,141,0.3)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Signing in…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined filled" style={{ fontSize: 18 }}>login</span>
                Log in
              </>
            )}
          </button>
        </form>

        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.6875rem', color: 'var(--secondary)' }}>
          © 2025 Inventory Nexus · Secure Core v4.2.1
        </p>
      </div>

      {/* ── RIGHT: Brand panel ────────────────────────────────────────── */}
      <div className="login-right-panel" style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(150deg, #00325f 0%, #00478d 40%, #006494 70%, #007a8a 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '3rem 3.5rem',
      }}>
        {/* Background decoration blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,200,0.08) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', top: '40%', left: '20%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
          {/* Subtle grid pattern */}
          <svg style={{ position: 'absolute', inset: 0, opacity: 0.04 }} width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Top: Logo + tagline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined filled" style={{ color: '#fff', fontSize: 20 }}>inventory_2</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: '1rem', color: '#fff', fontFamily: 'Manrope, sans-serif', opacity: 0.9 }}>Inventory Nexus</span>
          </div>
        </div>

        {/* Middle: Main copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 14px', fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Inventory Management
          </div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '2.25rem', color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            Streamline your<br />entire supply chain
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, marginBottom: '2rem', maxWidth: 360 }}>
            Real-time inventory tracking, multi-store management, and intelligent procurement — all in one secure platform.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2.5rem' }}>
            {['Multi-Store Control', 'Smart Transfers', 'Vendor Intelligence', 'Stock Audit', 'AMC Tracking'].map(f => (
              <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                <span className="material-symbols-outlined filled" style={{ fontSize: 13, color: '#4dd8d0' }}>check_circle</span>
                {f}
              </span>
            ))}
          </div>

          {/* Mock dashboard card */}
          <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.12)', maxWidth: 380 }}>
            {/* Mini topbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff6b6b', '#ffd166', '#06d6a0'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
              </div>
              <div style={{ height: 6, width: 80, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }} />
              <div style={{ height: 6, width: 40, borderRadius: 3, background: 'rgba(255,255,255,0.1)' }} />
            </div>
            {/* Stat row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: '1rem' }}>
              {[
                { label: 'Products', value: '2,450', color: '#4da3ff' },
                { label: 'Stores', value: '6', color: '#4dd8d0' },
                { label: 'Low Stock', value: '14', color: '#ffb347' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: s.color, fontFamily: 'Manrope, sans-serif' }}>{s.value}</div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Fake bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 52 }}>
              {[60, 40, 75, 50, 85, 45, 70, 55, 90, 65, 80, 48].map((h, i) => (
                <div key={i} style={{ flex: 1, borderRadius: '3px 3px 0 0', background: i === 10 ? '#4da3ff' : 'rgba(255,255,255,0.15)', height: `${h}%`, transition: 'height 0.3s' }} />
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
              Stock movement · Last 12 months
            </div>
          </div>
        </div>

        {/* Bottom: Stats */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '6', label: 'Active Hubs' },
            { value: '2.4k+', label: 'Products Tracked' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '1.375rem', color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .login-right-panel { display: none !important; }
          .login-left-panel { flex: 1 !important; max-width: 100% !important; padding: 2rem 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}
