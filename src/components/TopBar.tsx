import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
}

export default function TopBar({ searchPlaceholder = 'Search...', onSearch }: TopBarProps) {
  const { currentUser, logout, setSidebarOpen, notifications, unreadCount, markNotificationRead, products, users, stores } = useApp();
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const initials = currentUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const isAdmin = currentUser?.role === 'head_admin';

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchResults(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const recentNotifs = notifications.slice(0, 5);

  // Global search
  const myProducts = isAdmin ? products : products.filter(p => p.storeId === currentUser?.storeId);
  const q = searchQuery.toLowerCase().trim();
  const searchResults = q.length >= 2 ? [
    ...myProducts.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 4).map(p => ({ type: 'Product', label: p.name, sub: p.sku, icon: 'inventory_2', path: `/inventory/${p.id}` })),
    ...(isAdmin ? stores.filter(s => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q))
      .slice(0, 2).map(s => ({ type: 'Store', label: s.name, sub: s.location, icon: 'store', path: '/stores' })) : []),
    ...(isAdmin ? users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 2).map(u => ({ type: 'User', label: u.name, sub: u.email, icon: 'person', path: '/users' })) : []),
  ] : [];

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    onSearch?.(val);
    setShowSearchResults(val.length >= 2);
  };

  const handleSearchResultClick = (path: string) => {
    navigate(path);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const notifIcon = (type: string) => {
    if (type === 'out_of_stock') return { icon: 'error', color: 'var(--error)' };
    if (type === 'low_stock') return { icon: 'warning', color: 'var(--amber)' };
    if (type === 'warranty_expiring' || type === 'warranty_expired') return { icon: 'schedule', color: 'var(--amber)' };
    if (type === 'purchase_order') return { icon: 'receipt_long', color: 'var(--primary)' };
    if (type === 'transfer') return { icon: 'swap_horiz', color: 'var(--tertiary)' };
    return { icon: 'info', color: 'var(--primary)' };
  };

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <button
          className="icon-btn mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Global Search */}
        <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
          <div className="topbar-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); onSearch?.(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex', padding: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((r, i) => (
                <button key={i} className="search-result-item" onClick={() => handleSearchResultClick(r.path)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--secondary)', flexShrink: 0 }}>{r.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{r.sub}</div>
                  </div>
                  <span style={{ fontSize: '0.625rem', background: 'var(--surface-container)', color: 'var(--secondary)', padding: '2px 6px', borderRadius: '0.25rem', flexShrink: 0 }}>{r.type}</span>
                </button>
              ))}
            </div>
          )}
          {showSearchResults && searchResults.length === 0 && q.length >= 2 && (
            <div className="search-dropdown">
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8125rem' }}>
                No results for "{searchQuery}"
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="topbar-actions">
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setShowNotif(!showNotif)} style={{ position: 'relative' }}>
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <div className="notif-dropdown">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem 0.5rem', borderBottom: '1px solid var(--surface-container)' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}>
                  Notifications {unreadCount > 0 && <span className="notif-count-chip">{unreadCount} new</span>}
                </p>
                <button
                  onClick={() => { navigate('/notifications'); setShowNotif(false); }}
                  style={{ fontSize: '0.6875rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  View all
                </button>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {recentNotifs.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8125rem' }}>
                    No notifications
                  </div>
                ) : recentNotifs.map(n => {
                  const ni = notifIcon(n.type);
                  return (
                    <button
                      key={n.id}
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.link) { navigate(n.link); setShowNotif(false); }
                      }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: ni.color }}>{ni.icon}</span>
                      </div>
                      <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: n.read ? 500 : 700, color: 'var(--on-surface)', lineHeight: 1.3 }}>{n.title}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                      </div>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '0.6875rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif',
          }}>{initials}</div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>
            {currentUser?.name?.split(' ')[0]}
          </span>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--outline-variant)', opacity: 0.4 }} />
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
