import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { Product } from '../types';

type Tab = 'summary' | 'low_stock' | 'warranty' | 'categories' | 'movement';

function exportCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Simple donut SVG for category breakdown
function CategoryDonut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p style={{ color: 'var(--secondary)', fontSize: '0.8125rem' }}>No data</p>;
  const r = 50; const cx = 64; const cy = 64;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map(d => {
    const dash = (d.value / total) * circumference;
    const seg = { ...d, dash, offset };
    offset += dash;
    return seg;
  });
  const COLORS = ['#00478d', '#00514a', '#7c3aed', '#f59e0b', '#ba1a1a', '#0891b2', '#be185d', '#15803d', '#c2410c'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
        {segments.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={COLORS[i % COLORS.length]} strokeWidth="14"
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-(s.offset) + circumference / 4}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" fontWeight="900" fill="var(--on-surface)" fontFamily="Manrope, sans-serif">{total}</text>
        <text x={cx} y={cx + 10} textAnchor="middle" fontSize="9" fill="var(--secondary)">products</text>
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem' }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{d.label}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface)', marginLeft: 'auto', paddingLeft: '0.5rem' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { currentUser, products, stores, auditLogs } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const isAdmin = currentUser?.role === 'head_admin';

  const myProducts = isAdmin ? products : products.filter(p => p.storeId === currentUser?.storeId);

  // ── Stock Summary ──────────────────────────────────────────────
  const storeSummary = useMemo(() => {
    const storeIds = isAdmin
      ? [...new Set(products.map(p => p.storeId))]
      : [currentUser?.storeId || ''];
    return storeIds.map(sid => {
      const ps = products.filter(p => p.storeId === sid);
      const store = stores.find(s => s.id === sid);
      return {
        storeId: sid, storeName: store?.name || sid,
        total: ps.length, inStock: ps.filter(p => p.stockStatus === 'in_stock').length,
        lowStock: ps.filter(p => p.stockStatus === 'low_stock').length,
        outOfStock: ps.filter(p => p.stockStatus === 'out_of_stock').length,
        totalValue: ps.reduce((s, p) => s + p.price * p.quantity, 0),
      };
    });
  }, [products, stores, isAdmin, currentUser]);

  // ── Low Stock ──────────────────────────────────────────────────
  const lowStockProducts = useMemo(() =>
    myProducts.filter(p => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock')
      .sort((a, b) => a.quantity - b.quantity),
    [myProducts]);

  // ── Warranty ───────────────────────────────────────────────────
  const warrantyProducts = useMemo(() =>
    myProducts.filter(p => p.warrantyStatus === 'expiring_soon' || p.warrantyStatus === 'expired')
      .sort((a, b) => a.warrantyEndDate.localeCompare(b.warrantyEndDate)),
    [myProducts]);

  const daysUntilExpiry = (dateStr: string) => {
    const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
    return diff;
  };

  // ── Category Breakdown ─────────────────────────────────────────
  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    myProducts.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
    return Object.entries(cats).map(([label, value]) => ({ label, value, color: '' })).sort((a, b) => b.value - a.value);
  }, [myProducts]);

  const tabs: { id: Tab; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: 'summary', label: 'Stock Summary', icon: 'summarize' },
    { id: 'low_stock', label: 'Low Stock', icon: 'warning' },
    { id: 'warranty', label: 'Warranty Expiry', icon: 'schedule' },
    { id: 'categories', label: 'Category Breakdown', icon: 'pie_chart' },
    { id: 'movement', label: 'Inventory Movement', icon: 'timeline', adminOnly: true },
  ];

  const chipCls = (status: string) => {
    if (status === 'in_stock') return 'chip-success';
    if (status === 'low_stock') return 'chip-warning';
    if (status === 'out_of_stock') return 'chip-error';
    if (status === 'active') return 'chip-success';
    if (status === 'expiring_soon') return 'chip-warning';
    if (status === 'expired') return 'chip-error';
    return 'chip-neutral';
  };

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <p className="page-header-label">Analytics & Insights</p>
          <h1>Reports</h1>
          <p>Data-driven visibility into your inventory health, stock levels, and warranty lifecycle.</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav" style={{ marginBottom: '1.5rem' }}>
          {tabs.filter(t => !t.adminOnly || isAdmin).map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Stock Summary ── */}
        {activeTab === 'summary' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}>Stock Summary{isAdmin ? ' — All Stores' : ` — ${currentUser?.storeName}`}</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                [['Store', 'Total Products', 'In Stock', 'Low Stock', 'Out of Stock', 'Total Value (INR)'],
                  ...storeSummary.map(s => [s.storeName, s.total, s.inStock, s.lowStock, s.outOfStock, s.totalValue])],
                'stock-summary.csv')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Export CSV
              </button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {isAdmin && <th>Store</th>}
                    <th>Total Products</th>
                    <th>In Stock</th>
                    <th>Low Stock</th>
                    <th>Out of Stock</th>
                    <th>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {storeSummary.map(s => (
                    <tr key={s.storeId}>
                      {isAdmin && <td style={{ fontWeight: 600 }}>{s.storeName}</td>}
                      <td style={{ fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>{s.total}</td>
                      <td><span className="chip chip-success">{s.inStock}</span></td>
                      <td><span className="chip chip-warning">{s.lowStock}</span></td>
                      <td><span className="chip chip-error">{s.outOfStock}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{(s.totalValue / 100000).toFixed(2)}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="metric-grid" style={{ marginTop: '1.5rem' }}>
              {[
                { label: 'Grand Total Products', value: myProducts.length, icon: 'inventory_2', color: 'var(--primary)' },
                { label: 'Total In Stock', value: myProducts.filter(p => p.stockStatus === 'in_stock').length, icon: 'check_circle', color: '#34d399' },
                { label: 'Items Need Restocking', value: myProducts.filter(p => p.stockStatus !== 'in_stock').length, icon: 'warning', color: '#f59e0b' },
                { label: 'Total Stock Value', value: `₹${(myProducts.reduce((s, p) => s + p.price * p.quantity, 0) / 100000).toFixed(1)}L`, icon: 'payments', color: 'var(--primary)' },
              ].map(m => (
                <div key={m.label} className="metric-card">
                  <div className="metric-card-icon" style={{ background: `${m.color}18`, marginBottom: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ color: m.color }}>{m.icon}</span>
                  </div>
                  <div className="metric-card-value" style={{ color: m.color }}>{m.value}</div>
                  <div className="metric-card-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Low Stock ── */}
        {activeTab === 'low_stock' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}>Low Stock & Out of Stock Items</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: 4 }}>{lowStockProducts.length} items require attention</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                [['Product', 'SKU', 'Category', 'Quantity', 'Status', 'Store', 'Unit Price'],
                  ...lowStockProducts.map(p => [p.name, p.sku, p.category, p.quantity, p.stockStatus, p.storeName, p.price])],
                'low-stock-report.csv')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Export CSV
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">inventory</span>
                <h3>All stocked up!</h3>
                <p>No items are currently low or out of stock.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      {isAdmin && <th>Store</th>}
                      <th>Unit Price</th>
                      <th>Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{p.sku}</div>
                        </td>
                        <td><span className="chip chip-neutral">{p.category}</span></td>
                        <td>
                          <span style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: p.quantity === 0 ? 'var(--error)' : '#f59e0b', fontSize: '1.125rem' }}>{p.quantity}</span>
                        </td>
                        <td><span className={`chip ${chipCls(p.stockStatus)}`}>{p.stockStatus === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}</span></td>
                        {isAdmin && <td style={{ fontSize: '0.8125rem' }}>{p.storeName}</td>}
                        <td>₹{p.price.toLocaleString()}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', padding: '2px 10px', borderRadius: '1rem', fontWeight: 700 }}>
                            Raise PO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Warranty Expiry ── */}
        {activeTab === 'warranty' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}>Warranty Expiry Report</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: 4 }}>
                  {warrantyProducts.filter(p => p.warrantyStatus === 'expiring_soon').length} expiring soon ·{' '}
                  {warrantyProducts.filter(p => p.warrantyStatus === 'expired').length} expired
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                [['Product', 'SKU', 'Category', 'Warranty End', 'Days Remaining', 'Status', 'Store'],
                  ...warrantyProducts.map(p => [p.name, p.sku, p.category, p.warrantyEndDate, Math.max(0, daysUntilExpiry(p.warrantyEndDate)), p.warrantyStatus, p.storeName])],
                'warranty-expiry-report.csv')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Export CSV
              </button>
            </div>

            {warrantyProducts.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">verified</span>
                <h3>All warranties are healthy!</h3>
                <p>No items expiring within 30 days.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Warranty End</th>
                      <th>Days Left</th>
                      <th>Status</th>
                      {isAdmin && <th>Store</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {warrantyProducts.map(p => {
                      const days = daysUntilExpiry(p.warrantyEndDate);
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{p.sku}</div>
                          </td>
                          <td><span className="chip chip-neutral">{p.category}</span></td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{p.warrantyEndDate}</td>
                          <td>
                            <span style={{
                              fontWeight: 800, fontFamily: 'Manrope, sans-serif',
                              color: days < 0 ? 'var(--error)' : days <= 7 ? '#ba1a1a' : '#b45309',
                            }}>
                              {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days} days`}
                            </span>
                          </td>
                          <td><span className={`chip ${chipCls(p.warrantyStatus)}`}>{p.warrantyStatus === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}</span></td>
                          {isAdmin && <td style={{ fontSize: '0.8125rem' }}>{p.storeName}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Category Breakdown ── */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}>Products by Category</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                [['Category', 'Count', '% of Total'],
                  ...categories.map(c => [c.label, c.value, ((c.value / myProducts.length) * 100).toFixed(1) + '%'])],
                'category-breakdown.csv')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Export CSV
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <CategoryDonut data={categories} />
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Category</th><th>Count</th><th>Share</th></tr></thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.label}>
                        <td style={{ fontWeight: 600 }}>{c.label}</td>
                        <td style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>{c.value}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ height: 6, width: 80, background: 'var(--surface-container)', borderRadius: 3 }}>
                              <div style={{ height: '100%', width: `${(c.value / myProducts.length) * 100}%`, background: 'var(--primary)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{((c.value / myProducts.length) * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Movement (Admin only) ── */}
        {activeTab === 'movement' && isAdmin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800 }}>Inventory Movement Log</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                [['Action', 'Module', 'Item', 'Details', 'User', 'Timestamp'],
                  ...auditLogs.filter(l => l.module === 'product').map(l => [l.action, l.module, l.entityName, l.details, l.userName, l.timestamp])],
                'inventory-movement.csv')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Export CSV
              </button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Product</th>
                    <th>Details</th>
                    <th>By</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.filter(l => l.module === 'product').map(l => {
                    const ac = l.action === 'create' ? { label: 'Added', cls: 'chip-success' }
                      : l.action === 'update' ? { label: 'Updated', cls: 'chip-info' }
                      : l.action === 'delete' ? { label: 'Deleted', cls: 'chip-error' }
                      : { label: l.action, cls: 'chip-neutral' };
                    return (
                      <tr key={l.id}>
                        <td><span className={`chip ${ac.cls}`}>{ac.label}</span></td>
                        <td style={{ fontWeight: 600 }}>{l.entityName}</td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{l.details}</td>
                        <td style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{l.userName}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                          {new Date(l.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ·{' '}
                          {new Date(l.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
