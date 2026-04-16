import { useApp } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  adminOnly?: boolean;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export default function Sidebar() {
  const { currentUser, logout, sidebarOpen, setSidebarOpen, purchaseOrders } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = currentUser?.role === 'head_admin';
  const initials = currentUser?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const pendingPOs = purchaseOrders.filter(p => p.status === 'pending').length;

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
      ],
    },
    {
      label: 'Inventory',
      items: [
        { icon: 'inventory_2', label: 'Inventory', path: '/inventory' },
        { icon: 'receipt_long', label: 'Purchase Orders', path: '/purchase-orders', badge: isAdmin ? pendingPOs : 0 },
        { icon: 'swap_horiz', label: 'Transfers', path: '/transfers' },
        { icon: 'build', label: 'Maintenance', path: '/maintenance' },
        ...(isAdmin ? [{ icon: 'local_shipping', label: 'Suppliers', path: '/suppliers', adminOnly: true }] : []),
      ],
    },
    {
      label: 'Analytics',
      items: [
        { icon: 'bar_chart', label: 'Reports', path: '/reports' },
        ...(isAdmin ? [{ icon: 'history', label: 'Audit Log', path: '/audit-log', adminOnly: true }] : []),
      ],
    },
    {
      label: 'Administration',
      items: [
        ...(isAdmin ? [
          { icon: 'group', label: 'Users', path: '/users', adminOnly: true },
          { icon: 'store', label: 'Stores', path: '/stores', adminOnly: true },
        ] : []),
        { icon: 'manage_accounts', label: 'Settings', path: '/settings' },
      ],
    },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setSidebarOpen(false);
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: 36, height: 36, background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined filled" style={{ color: 'white', fontSize: 18 }}>inventory_2</span>
            </div>
            <div>
              <h2 style={{ marginBottom: 0 }}>Inventory Nexus</h2>
              <p style={{ fontSize: '0.625rem', color: 'var(--secondary)', letterSpacing: '0.05em' }}>v2.0 — Global Logistics</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="nav-group">
                <div className="nav-group-label">{group.label}</div>
                {visibleItems.map(item => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      className={`nav-item ${active ? 'active' : ''}`}
                      onClick={() => handleNav(item.path)}
                    >
                      <span className={`material-symbols-outlined ${active ? 'filled' : ''}`}>{item.icon}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="nav-badge">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div className="sidebar-user-name">{currentUser?.name}</div>
            <div className="sidebar-user-role">{isAdmin ? 'Head Admin' : 'Store Manager'}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', padding: 4 }}
            title="Logout"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
