import { useState } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useNavigate } from 'react-router-dom';
import type { NotificationType } from '../types';

const TYPE_LABELS: Record<NotificationType, { label: string; icon: string; color: string }> = {
  low_stock: { label: 'Low Stock', icon: 'warning', color: '#f59e0b' },
  out_of_stock: { label: 'Out of Stock', icon: 'error', color: '#ba1a1a' },
  warranty_expiring: { label: 'Warranty Expiring', icon: 'schedule', color: '#f59e0b' },
  warranty_expired: { label: 'Warranty Expired', icon: 'cancel', color: '#ba1a1a' },
  purchase_order: { label: 'Purchase Order', icon: 'receipt_long', color: '#7c3aed' },
  transfer: { label: 'Transfer', icon: 'swap_horiz', color: '#00514a' },
  system: { label: 'System', icon: 'info', color: '#00478d' },
};

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useApp();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'all' | 'unread' | NotificationType>('all');

  const filtered = notifications.filter(n => {
    if (filterType === 'unread') return !n.read;
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const fmtTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const typeOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Notifications' },
    { value: 'unread', label: `Unread (${unreadCount})` },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'warranty_expiring', label: 'Warranty Expiring' },
    { value: 'purchase_order', label: 'Purchase Orders' },
    { value: 'transfer', label: 'Transfers' },
    { value: 'system', label: 'System' },
  ];

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Alerts & Updates</p>
            <h1>Notifications</h1>
            <p>Stay on top of stock alerts, warranty expirations, and system updates.</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllNotificationsRead}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done_all</span>
              Mark all as read
            </button>
          )}
        </div>

        {/* Stats chips */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value as typeof filterType)}
              style={{
                padding: '0.375rem 0.875rem', borderRadius: '2rem', border: '1.5px solid',
                borderColor: filterType === opt.value ? 'var(--primary)' : 'var(--outline-variant)',
                background: filterType === opt.value ? 'var(--primary)' : 'transparent',
                color: filterType === opt.value ? 'white' : 'var(--on-surface)',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="table-container" style={{ borderRadius: '0.875rem' }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <span className="material-symbols-outlined">notifications_off</span>
              <h3>No notifications</h3>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div>
              {filtered.map((n, i) => {
                const ti = TYPE_LABELS[n.type] || TYPE_LABELS.system;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                    style={{
                      display: 'flex', gap: '1rem', alignItems: 'flex-start',
                      padding: '1rem 1.5rem',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--surface-container)' : 'none',
                      background: !n.read ? 'rgba(0,71,141,0.03)' : 'transparent',
                      cursor: n.link ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (n.link) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-container-low)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = !n.read ? 'rgba(0,71,141,0.03)' : 'transparent'; }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: `${ti.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: ti.color }}>{ti.icon}</span>
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: n.read ? 600 : 800, color: 'var(--on-surface)' }}>{n.title}</span>
                            {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                            <span style={{ fontSize: '0.6875rem', padding: '1px 8px', borderRadius: '1rem', background: `${ti.color}18`, color: ti.color, fontWeight: 700 }}>{ti.label}</span>
                          </div>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{n.message}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--secondary)', whiteSpace: 'nowrap' }}>{fmtTime(n.createdAt)}</span>
                          {!n.read && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={e => { e.stopPropagation(); markNotificationRead(n.id); }}
                              style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem' }}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
