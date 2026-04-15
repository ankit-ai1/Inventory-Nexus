import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { AuditAction, AuditModule } from '../types';

const ACTION_INFO: Record<AuditAction, { label: string; color: string; bg: string; icon: string }> = {
  create: { label: 'Created', color: '#065f46', bg: '#d1fae5', icon: 'add_circle' },
  update: { label: 'Updated', color: '#1d4ed8', bg: '#dbeafe', icon: 'edit' },
  delete: { label: 'Deleted', color: '#ba1a1a', bg: 'var(--error-container)', icon: 'delete' },
  login: { label: 'Login', color: '#374151', bg: '#f3f4f6', icon: 'login' },
  logout: { label: 'Logout', color: '#374151', bg: '#f3f4f6', icon: 'logout' },
  status_change: { label: 'Status Changed', color: '#92400e', bg: '#fef3c7', icon: 'toggle_on' },
  approve: { label: 'Approved', color: '#065f46', bg: '#d1fae5', icon: 'check_circle' },
  reject: { label: 'Rejected', color: '#ba1a1a', bg: 'var(--error-container)', icon: 'cancel' },
  receive: { label: 'Received', color: '#5b21b6', bg: '#ede9fe', icon: 'inventory' },
};

const MODULE_INFO: Record<AuditModule, { label: string; icon: string }> = {
  product: { label: 'Product', icon: 'inventory_2' },
  user: { label: 'User', icon: 'person' },
  store: { label: 'Store', icon: 'store' },
  purchase_order: { label: 'Purchase Order', icon: 'receipt_long' },
  transfer: { label: 'Transfer', icon: 'swap_horiz' },
  auth: { label: 'Authentication', icon: 'lock' },
};

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const { auditLogs, users } = useApp();
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<'all' | AuditAction>('all');
  const [filterModule, setFilterModule] = useState<'all' | AuditModule>('all');
  const [filterUser, setFilterUser] = useState('all');

  const uniqueUsers = [...new Set(auditLogs.map(l => l.userName))].sort();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return auditLogs.filter(l => {
      const matchSearch = !q || l.entityName.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.userName.toLowerCase().includes(q);
      const matchAction = filterAction === 'all' || l.action === filterAction;
      const matchModule = filterModule === 'all' || l.module === filterModule;
      const matchUser = filterUser === 'all' || l.userName === filterUser;
      return matchSearch && matchAction && matchModule && matchUser;
    });
  }, [auditLogs, search, filterAction, filterModule, filterUser]);

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const stats = [
    { label: 'Total Events', value: auditLogs.length, color: 'var(--primary)', icon: 'history' },
    { label: 'Products Changed', value: auditLogs.filter(l => l.module === 'product').length, color: '#7c3aed', icon: 'inventory_2' },
    { label: 'PO Events', value: auditLogs.filter(l => l.module === 'purchase_order').length, color: '#00514a', icon: 'receipt_long' },
    { label: 'User Events', value: auditLogs.filter(l => l.module === 'user' || l.module === 'auth').length, color: '#b45309', icon: 'person' },
  ];

  return (
    <Layout>
      <TopBar searchPlaceholder="Search audit log..." onSearch={setSearch} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Compliance & Accountability</p>
            <h1>Audit Log</h1>
            <p>Complete trail of every action performed across the system.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
            [['Action', 'Module', 'Entity', 'Details', 'User', 'Date', 'Time'],
              ...filtered.map(l => [l.action, l.module, l.entityName, l.details, l.userName, fmtDate(l.timestamp), fmtTime(l.timestamp)])],
            'audit-log.csv')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {stats.map(m => (
            <div key={m.label} className="metric-card">
              <div className="metric-card-icon" style={{ background: `${m.color}18`, marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: m.color }}>{m.icon}</span>
              </div>
              <div className="metric-card-value" style={{ color: m.color }}>{m.value}</div>
              <div className="metric-card-label">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="table-container">
          <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="table-toolbar-search" style={{ flex: '1 1 200px' }}>
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search by entity, user, or details..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-toolbar-actions" style={{ flexWrap: 'wrap' }}>
              <select className="form-select" style={{ minWidth: 140, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterAction} onChange={e => setFilterAction(e.target.value as typeof filterAction)}>
                <option value="all">All Actions</option>
                {Object.entries(ACTION_INFO).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              <select className="form-select" style={{ minWidth: 150, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterModule} onChange={e => setFilterModule(e.target.value as typeof filterModule)}>
                <option value="all">All Modules</option>
                {Object.entries(MODULE_INFO).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
              <select className="form-select" style={{ minWidth: 150, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                <option value="all">All Users</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Entity</th>
                  <th>Details</th>
                  <th>Changes</th>
                  <th>User</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <span className="material-symbols-outlined">history</span>
                      <h3>No log entries found</h3>
                      <p>Try adjusting your search or filters.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(l => {
                  const ai = ACTION_INFO[l.action];
                  const mi = MODULE_INFO[l.module];
                  return (
                    <tr key={l.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '3px 10px', borderRadius: '1rem', background: ai.bg, color: ai.color, fontSize: '0.75rem', fontWeight: 700 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{ai.icon}</span>
                          {ai.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--secondary)' }}>{mi.icon}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{mi.label}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.entityName}</td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', maxWidth: 260 }}>{l.details}</td>
                      <td>
                        {l.changes && l.changes.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {l.changes.map((c, i) => (
                              <div key={i} style={{ fontSize: '0.6875rem', background: 'var(--surface-container-low)', borderRadius: '0.25rem', padding: '2px 6px', display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>{c.field}:</span>
                                <span style={{ color: 'var(--error)', textDecoration: 'line-through' }}>{c.from}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 9 }}>arrow_forward</span>
                                <span style={{ color: '#065f46', fontWeight: 600 }}>{c.to}</span>
                              </div>
                            ))}
                          </div>
                        ) : <span style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '0.5625rem', fontWeight: 800,
                          }}>
                            {l.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{l.userName}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(l.timestamp)}<br />
                        <span style={{ fontFamily: 'monospace' }}>{fmtTime(l.timestamp)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid var(--surface-container)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
              Showing <strong>{filtered.length}</strong> of <strong>{auditLogs.length}</strong> entries
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
