import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useNavigate } from 'react-router-dom';

// Simple SVG donut chart
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8125rem', padding: '1rem' }}>No data</div>;
  const r = 42;
  const cx = 56; const cy = 56;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map(d => {
    const dash = (d.value / total) * circumference;
    const seg = { ...d, dash, offset };
    offset += dash;
    return seg;
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <svg width="112" height="112" viewBox="0 0 112 112" style={{ flexShrink: 0 }}>
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth="12"
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-(s.offset) + circumference / 4}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.5s' }}
          />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--on-surface)" fontFamily="Manrope, sans-serif">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="var(--secondary)">total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {data.map(d => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{d.label}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface)', marginLeft: 'auto', paddingLeft: '0.5rem' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal bar chart
function BarChart({ data, maxColor = 'var(--primary)' }: { data: { label: string; value: number; color?: string }[]; maxColor?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{d.label}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface)' }}>{d.value}</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${(d.value / max) * 100}%`,
              background: d.color || maxColor,
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, products, stores, users, auditLogs, purchaseOrders, transfers } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'head_admin';

  const myProducts = isAdmin ? products : products.filter(p => p.storeId === currentUser?.storeId);

  const totalStores = stores.filter(s => s.status === 'active').length;
  const totalProducts = myProducts.length;
  const lowStock = myProducts.filter(p => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock').length;
  const warrantyExpiring = myProducts.filter(p => p.warrantyStatus === 'expiring_soon').length;
  const outOfStock = myProducts.filter(p => p.stockStatus === 'out_of_stock').length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const pendingPOs = purchaseOrders.filter(p => p.status === 'pending').length;
  const pendingTransfers = transfers.filter(t => t.status === 'pending').length;

  const totalStockValue = myProducts.reduce((s, p) => s + p.price * p.quantity, 0);

  const recentProducts = [...myProducts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  // Chart data
  const categoryData = ['Desktops', 'Laptops', 'Monitors', 'Networking', 'Peripherals', 'Power', 'Printers', 'Mini PCs', 'Storage']
    .map(cat => ({ label: cat, value: myProducts.filter(p => p.category === cat).length }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const stockDonut = [
    { label: 'In Stock', value: myProducts.filter(p => p.stockStatus === 'in_stock').length, color: '#34d399' },
    { label: 'Low Stock', value: myProducts.filter(p => p.stockStatus === 'low_stock').length, color: '#f59e0b' },
    { label: 'Out of Stock', value: myProducts.filter(p => p.stockStatus === 'out_of_stock').length, color: '#ba1a1a' },
  ];

  const warrantyDonut = [
    { label: 'Active', value: myProducts.filter(p => p.warrantyStatus === 'active').length, color: '#34d399' },
    { label: 'Expiring Soon', value: myProducts.filter(p => p.warrantyStatus === 'expiring_soon').length, color: '#f59e0b' },
    { label: 'Expired', value: myProducts.filter(p => p.warrantyStatus === 'expired').length, color: '#ba1a1a' },
  ];

  const recentActivity = auditLogs.slice(0, 6);

  const actionLabel = (action: string) => {
    const map: Record<string, { label: string; color: string }> = {
      create: { label: 'Created', color: '#34d399' }, update: { label: 'Updated', color: '#60a5fa' },
      delete: { label: 'Deleted', color: '#ba1a1a' }, login: { label: 'Login', color: 'var(--secondary)' },
      logout: { label: 'Logout', color: 'var(--secondary)' }, approve: { label: 'Approved', color: '#34d399' },
      reject: { label: 'Rejected', color: '#ba1a1a' }, receive: { label: 'Received', color: '#a78bfa' },
      status_change: { label: 'Status Changed', color: '#f59e0b' },
    };
    return map[action] || { label: action, color: 'var(--secondary)' };
  };

  const stockLabel = (s: string) => {
    if (s === 'in_stock') return { label: 'In Stock', cls: 'chip-success' };
    if (s === 'low_stock') return { label: 'Low Stock', cls: 'chip-warning' };
    return { label: 'Out of Stock', cls: 'chip-error' };
  };

  const fmtTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <TopBar searchPlaceholder="Search products, stores, users..." />
      <div className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Logistics Overview</p>
            <h1>{isAdmin ? 'Systems are Optimal' : `${currentUser?.storeName ?? 'Store'} Overview`}</h1>
            <p>{isAdmin
              ? `Welcome back, ${currentUser?.name}. Here's a live snapshot of your global operations.`
              : `Welcome back, ${currentUser?.name}. Managing inventory for your store.`}
            </p>
          </div>
          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/inventory')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add Product
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/purchase-orders')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>receipt_long</span>
              New PO
            </button>
            {isAdmin && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transfers')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>
                Transfer
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="metric-grid" style={{ marginBottom: '1.75rem' }}>
          {isAdmin && (
            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/stores')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="metric-card-icon" style={{ background: 'rgba(0,71,141,0.08)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>store</span>
                </div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--tertiary)', background: 'rgba(0,81,74,0.08)', padding: '2px 8px', borderRadius: '1rem' }}>+2 this month</span>
              </div>
              <div className="metric-card-value">{totalStores}</div>
              <div className="metric-card-label">Total Active Stores</div>
            </div>
          )}

          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="metric-card-icon" style={{ background: 'rgba(0,71,141,0.08)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>inventory</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)' }}>
                ₹{(totalStockValue / 100000).toFixed(1)}L value
              </span>
            </div>
            <div className="metric-card-value">{totalProducts}</div>
            <div className="metric-card-label">Total Products</div>
          </div>

          <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/inventory')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="metric-card-icon" style={{ background: 'rgba(186,26,26,0.08)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)' }}>warning</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--error)' }}>{outOfStock} out of stock</span>
            </div>
            <div className="metric-card-value" style={{ color: lowStock > 0 ? 'var(--error)' : 'var(--on-surface)' }}>{lowStock}</div>
            <div className="metric-card-label">Low / Out of Stock</div>
          </div>

          <div className="metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="metric-card-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--amber)' }}>schedule</span>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400e' }}>Needs attention</span>
            </div>
            <div className="metric-card-value" style={{ color: warrantyExpiring > 0 ? '#b45309' : 'var(--on-surface)' }}>{warrantyExpiring}</div>
            <div className="metric-card-label">Warranty Expiring Soon</div>
          </div>

          {isAdmin && (
            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="metric-card-icon" style={{ background: 'rgba(0,81,74,0.08)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>group</span>
                </div>
              </div>
              <div className="metric-card-value">{activeUsers}</div>
              <div className="metric-card-label">Active Users</div>
            </div>
          )}

          {isAdmin && (
            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/purchase-orders')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="metric-card-icon" style={{ background: 'rgba(124,58,237,0.08)' }}>
                  <span className="material-symbols-outlined" style={{ color: '#7c3aed' }}>receipt_long</span>
                </div>
                {pendingPOs > 0 && <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#7c3aed' }}>{pendingPOs} pending</span>}
              </div>
              <div className="metric-card-value" style={{ color: pendingPOs > 0 ? '#7c3aed' : 'var(--on-surface)' }}>{pendingPOs}</div>
              <div className="metric-card-label">POs Awaiting Review</div>
            </div>
          )}

          {pendingTransfers > 0 && (
            <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/transfers')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="metric-card-icon" style={{ background: 'rgba(0,81,74,0.08)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>swap_horiz</span>
                </div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--tertiary)' }}>{pendingTransfers} pending</span>
              </div>
              <div className="metric-card-value" style={{ color: 'var(--tertiary)' }}>{pendingTransfers}</div>
              <div className="metric-card-label">Pending Transfers</div>
            </div>
          )}
        </div>

        {/* Charts Row */}
        <div className="dashboard-charts-row" style={{ marginBottom: '1.75rem' }}>
          <div className="card" style={{ padding: '1.25rem', flex: 2 }}>
            <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>Products by Category</h3>
            <BarChart data={categoryData} />
          </div>
          <div className="card" style={{ padding: '1.25rem', flex: 1.2 }}>
            <h3 className="section-title" style={{ marginBottom: '1rem' }}>Stock Distribution</h3>
            <DonutChart data={stockDonut} />
          </div>
          <div className="card" style={{ padding: '1.25rem', flex: 1.2 }}>
            <h3 className="section-title" style={{ marginBottom: '1rem' }}>Warranty Status</h3>
            <DonutChart data={warrantyDonut} />
          </div>
        </div>

        {/* Bottom section */}
        <div className="activity-section">
          {/* Recent Inventory */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--surface-container)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Recent Inventory</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/inventory')} style={{ fontSize: '0.75rem' }}>
                View all <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Stock</th>
                    <th>Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProducts.map(p => {
                    const stock = stockLabel(p.stockStatus);
                    const warranty = p.warrantyStatus === 'active'
                      ? { label: 'Active', cls: 'chip-success' }
                      : p.warrantyStatus === 'expiring_soon'
                        ? { label: 'Expiring', cls: 'chip-warning' }
                        : { label: 'Expired', cls: 'chip-error' };
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/inventory/${p.id}`)}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{p.sku}</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>{p.quantity}</td>
                        <td><span className={`chip ${stock.cls}`}>{stock.label}</span></td>
                        <td><span className={`chip ${warranty.cls}`}>{warranty.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Recent Activity Feed */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>Recent Activity</h3>
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit-log')} style={{ fontSize: '0.75rem' }}>
                    Full log
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {recentActivity.map((log, i) => {
                  const al = actionLabel(log.action);
                  return (
                    <div key={log.id} style={{
                      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                      padding: '0.625rem 0',
                      borderBottom: i < recentActivity.length - 1 ? '1px solid var(--surface-container)' : 'none',
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: al.color, flexShrink: 0, marginTop: 6 }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', fontWeight: 500, lineHeight: 1.3 }}>
                          <span style={{ fontWeight: 700 }}>{log.userName}</span> · {al.label} {log.entityName}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)', marginTop: 2 }}>{fmtTime(log.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Stores (Admin only) */}
            {isAdmin && (
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 className="section-title">Top Stores by Stock</h3>
                {stores.filter(s => s.status === 'active').slice(0, 4).map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0', borderBottom: '1px solid var(--surface-container)',
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{s.location}</div>
                    </div>
                    <span style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.875rem', color: 'var(--primary)' }}>
                      {s.productCount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
