import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { setSidebarOpen, currentUser, logout } = useApp();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {/* Mobile header */}
        <div className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex' }}
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="mobile-header-title">Inventory Nexus</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>
              {currentUser?.name?.split(' ')[0]}
            </span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex' }}
              onClick={() => { logout(); navigate('/login'); }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
