import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';

// ─── Reusable chart components ────────────────────────────────────────────────

function HBarChart({ data, color = 'var(--primary)' }: {
  data: { label: string; value: number; sub?: string; color?: string }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', fontWeight: 600 }}>{d.label}</span>
              {d.sub && <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', marginLeft: '0.5rem' }}>{d.sub}</span>}
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface)' }}>{d.value}</span>
          </div>
          <div style={{ height: 8, background: 'var(--surface-container)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${(d.value / max) * 100}%`,
              background: d.color || color,
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color, bg }: {
  label: string; value: string | number; sub?: string;
  icon: string; color: string; bg: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-icon" style={{ background: bg, marginBottom: '0.5rem' }}>
        <span className="material-symbols-outlined" style={{ color }}>{icon}</span>
      </div>
      <div className="metric-card-value" style={{ color }}>{value}</div>
      <div className="metric-card-label">{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

function VelocityBadge({ score }: { score: number }) {
  if (score >= 4) return <span className="chip chip-success"  style={{ fontSize: '0.7rem' }}>Fast Mover</span>;
  if (score >= 2) return <span className="chip chip-info"    style={{ fontSize: '0.7rem' }}>Moderate</span>;
  return               <span className="chip chip-warning"  style={{ fontSize: '0.7rem' }}>Slow Mover</span>;
}

export default function WarehouseAnalyticsPage() {
  const { products, transfers, bins, batches, stores, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'head_admin';

  const [storeFilter, setStoreFilter] = useState(isAdmin ? 'all' : (currentUser?.storeId || 'all'));
  const [activeTab, setActiveTab] = useState<'overview' | 'velocity' | 'bins' | 'transit'>('overview');

  const myProducts = useMemo(() =>
    isAdmin
      ? products
      : products.filter(p => p.storeId === currentUser?.storeId),
    [products, isAdmin, currentUser]);

  const myTransfers = useMemo(() =>
    isAdmin
      ? transfers
      : transfers.filter(t => t.fromStoreId === currentUser?.storeId || t.toStoreId === currentUser?.storeId),
    [transfers, isAdmin, currentUser]);

  const myBins = useMemo(() =>
    isAdmin
      ? (storeFilter === 'all' ? bins : bins.filter(b => b.storeId === storeFilter))
      : bins.filter(b => b.storeId === currentUser?.storeId),
    [bins, isAdmin, currentUser, storeFilter]);

  // ─── Stock Velocity calculation ───────────────────────────────────────────
  // Velocity = number of completed transfers involving this product + quantity moved
  const velocityData = useMemo(() => {
    const completedTransfers = transfers.filter(t => t.status === 'completed' || t.status === 'in_transit');
    const counts: Record<string, { count: number; qty: number; productName: string; sku: string; storeId: string }> = {};

    completedTransfers.forEach(t => {
      const key = t.productId;
      if (!counts[key]) counts[key] = { count: 0, qty: 0, productName: t.productName, sku: t.sku, storeId: t.fromStoreId };
      counts[key].count += 1;
      counts[key].qty += t.quantity;
    });

    return Object.entries(counts)
      .map(([productId, data]) => ({
        productId,
        ...data,
        score: data.count + Math.floor(data.qty / 5),
      }))
      .sort((a, b) => b.score - a.score);
  }, [transfers]);

  // Slow movers = products with quantity > 0 but no recent transfers
  const slowMovers = useMemo(() => {
    const movedProductIds = new Set(transfers.filter(t => t.status === 'completed').map(t => t.productId));
    return myProducts
      .filter(p => p.quantity > 0 && !movedProductIds.has(p.id))
      .sort((a, b) => b.quantity - a.quantity);
  }, [myProducts, transfers]);

  // ─── Bin utilization ──────────────────────────────────────────────────────
  const binUtilization = useMemo(() => {
    const totalCapacity = myBins.reduce((s, b) => s + b.capacity, 0);
    const totalUsed = myBins.reduce((s, b) => s + b.currentQty, 0);
    const byStore = stores
      .filter(s => isAdmin ? true : s.id === currentUser?.storeId)
      .map(s => {
        const storeBins = bins.filter(b => b.storeId === s.id);
        const cap = storeBins.reduce((x, b) => x + b.capacity, 0);
        const used = storeBins.reduce((x, b) => x + b.currentQty, 0);
        return {
          label: s.name,
          value: cap > 0 ? Math.round((used / cap) * 100) : 0,
          sub: `${used}/${cap} units`,
          color: cap > 0 && (used / cap) > 0.8 ? '#ef4444' : cap > 0 && (used / cap) > 0.5 ? '#f59e0b' : '#10b981',
        };
      })
      .filter(s => s.value > 0 || bins.some(b => b.storeId === stores.find(st => st.name === s.label)?.id));

    return { totalCapacity, totalUsed, byStore };
  }, [myBins, bins, stores, isAdmin, currentUser]);

  // ─── Transfer metrics ──────────────────────────────────────────────────────
  const transitMetrics = useMemo(() => {
    const inTransit    = transfers.filter(t => t.status === 'in_transit');
    const completed    = transfers.filter(t => t.status === 'completed');
    const pending      = transfers.filter(t => t.status === 'pending');
    const rejected     = transfers.filter(t => t.status === 'rejected');

    // Average transit time (approved → completed) in hours
    const completedWithTimes = completed.filter(t => t.shippedAt && t.completedAt);
    const avgTransitHrs = completedWithTimes.length > 0
      ? Math.round(completedWithTimes.reduce((s, t) => {
          return s + (new Date(t.completedAt!).getTime() - new Date(t.shippedAt!).getTime()) / 3600000;
        }, 0) / completedWithTimes.length)
      : null;

    return { inTransit, completed, pending, rejected, avgTransitHrs };
  }, [transfers]);

  // ─── FEFO urgency ─────────────────────────────────────────────────────────
  const urgentBatches = useMemo(() =>
    batches
      .filter(b => {
        const days = Math.floor((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
        return days < 90 && b.status === 'available' && b.quantity > 0 &&
          (isAdmin || b.storeId === currentUser?.storeId);
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    [batches, isAdmin, currentUser]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const daysTo  = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Analytics</p>
            <h1>Warehouse Analytics</h1>
            <p>Real-time logistics insights — stock velocity, bin utilization, and transit monitoring.</p>
          </div>
          {isAdmin && (
            <select className="form-select" style={{ width: 'auto', minWidth: 180 }}
              value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
              <option value="all">All Stores</option>
              {stores.filter(s => s.status === 'active').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* KPI row */}
        <div className="metric-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <StatCard label="Bin Utilization"   value={`${Math.round(binUtilization.totalCapacity > 0 ? (binUtilization.totalUsed / binUtilization.totalCapacity) * 100 : 0)}%`}
            sub={`${binUtilization.totalUsed}/${binUtilization.totalCapacity} units`}
            icon="donut_large" color="#00478d" bg="rgba(0,71,141,0.08)" />
          <StatCard label="In Transit"        value={transitMetrics.inTransit.length}
            sub="awaiting receipt"
            icon="local_shipping" color="#f59e0b" bg="rgba(245,158,11,0.10)" />
          <StatCard label="Slow Movers"       value={slowMovers.length}
            sub="never transferred"
            icon="inventory_2" color="#94a3b8" bg="rgba(148,163,184,0.12)" />
          <StatCard label="Urgent Batches"    value={urgentBatches.length}
            sub="expiring in <90 days"
            icon="warning" color="#ef4444" bg="rgba(239,68,68,0.08)" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--outline-variant)', marginBottom: '1.5rem' }}>
          {([
            { key: 'overview', label: 'Overview',          icon: 'dashboard' },
            { key: 'velocity', label: 'Stock Velocity',    icon: 'trending_up' },
            { key: 'bins',     label: 'Bin Utilization',   icon: 'grid_view' },
            { key: 'transit',  label: 'Transit Tracker',   icon: 'local_shipping' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.625rem 1.25rem', border: 'none', background: 'none',
                borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -2, color: activeTab === t.key ? 'var(--primary)' : 'var(--secondary)',
                fontWeight: activeTab === t.key ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>

            {/* FEFO Urgent Batches */}
            <div className="card" style={{ gridColumn: urgentBatches.length === 0 ? 'span 1' : 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined filled" style={{ color: '#ef4444' }}>warning</span>
                <h3 style={{ margin: 0 }}>FEFO Urgent Batches</h3>
                {urgentBatches.length > 0 && (
                  <span className="chip chip-error" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>{urgentBatches.length} urgent</span>
                )}
              </div>
              {urgentBatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--secondary)', fontSize: '0.875rem' }}>
                  <span className="material-symbols-outlined" style={{ display: 'block', fontSize: 32, marginBottom: '0.5rem', color: '#10b981' }}>check_circle</span>
                  All batches are within safe expiry window
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {urgentBatches.slice(0, 5).map(b => {
                    const days = daysTo(b.expiryDate);
                    return (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: days < 0 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', border: `1px solid ${days < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{b.productName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>{b.batchNumber} · Bin {b.binCode}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: days < 0 ? '#ef4444' : '#f59e0b' }}>
                            {days < 0 ? `${Math.abs(days)}d expired` : `${days}d left`}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>{b.quantity} units</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Slow Movers */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#94a3b8' }}>inventory_2</span>
                <h3 style={{ margin: 0 }}>Slow Moving Items</h3>
                <span className="chip chip-neutral" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>{slowMovers.length} items</span>
              </div>
              {slowMovers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--secondary)', fontSize: '0.875rem' }}>
                  All items have had recent movement
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {slowMovers.slice(0, 6).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--outline-variant)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>{p.storeName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.quantity}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', display: 'block' }}>units idle</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer Summary */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>swap_horiz</span>
                <h3 style={{ margin: 0 }}>Transfer Summary</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Pending Approval', value: transitMetrics.pending.length,    color: '#f59e0b' },
                  { label: 'In Transit',        value: transitMetrics.inTransit.length,  color: '#00478d' },
                  { label: 'Completed',         value: transitMetrics.completed.length,  color: '#10b981' },
                  { label: 'Rejected',          value: transitMetrics.rejected.length,   color: '#ef4444' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: r.color, fontSize: '1rem' }}>{r.value}</span>
                  </div>
                ))}
                {transitMetrics.avgTransitHrs !== null && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', fontSize: '0.8125rem', textAlign: 'center', color: 'var(--secondary)' }}>
                    Avg transit time: <strong style={{ color: 'var(--on-surface)' }}>{transitMetrics.avgTransitHrs}h</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Bin Status Breakdown */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>grid_view</span>
                <h3 style={{ margin: 0 }}>Bin Status Breakdown</h3>
              </div>
              {(() => {
                const occupied    = myBins.filter(b => b.status === 'occupied').length;
                const empty       = myBins.filter(b => b.status === 'empty').length;
                const reserved    = myBins.filter(b => b.status === 'reserved').length;
                const maintenance = myBins.filter(b => b.status === 'maintenance').length;
                const total       = myBins.length;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {[
                      { label: 'Occupied',    value: occupied,    color: '#10b981' },
                      { label: 'Empty',       value: empty,       color: '#94a3b8' },
                      { label: 'Reserved',    value: reserved,    color: '#3b82f6' },
                      { label: 'Maintenance', value: maintenance, color: '#ef4444' },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: '0.8125rem' }}>
                          <span style={{ color: 'var(--on-surface-variant)' }}>{s.label}</span>
                          <span style={{ fontWeight: 700 }}>{s.value} <span style={{ fontWeight: 400, color: 'var(--secondary)' }}>({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span></span>
                        </div>
                        <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${total > 0 ? (s.value / total) * 100 : 0}%`, background: s.color, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── VELOCITY TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'velocity' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Stock Velocity — Movement by Product</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  Score based on number of transfers and total quantity moved. Higher = faster moving.
                </p>
              </div>
              {velocityData.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 0' }}>
                  <span className="material-symbols-outlined">trending_up</span>
                  <p>No completed transfers yet to calculate velocity.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {velocityData.map((item, idx) => (
                    <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--outline-variant)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: idx === 0 ? 'var(--primary)' : idx === 1 ? '#3b82f6' : 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: idx <= 1 ? 'white' : 'var(--secondary)' }}>#{idx + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.productName}</span>
                            <VelocityBadge score={item.score} />
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                            <span>{item.count} transfer{item.count !== 1 ? 's' : ''}</span>
                            <span><strong style={{ color: 'var(--on-surface)' }}>{item.qty}</strong> units moved</span>
                          </div>
                        </div>
                        <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${(item.score / (velocityData[0]?.score || 1)) * 100}%`,
                            background: item.score >= 4 ? '#10b981' : item.score >= 2 ? '#3b82f6' : '#f59e0b',
                            transition: 'width 0.6s',
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slow Movers table */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>warning</span>
                <h3 style={{ margin: 0 }}>Slow Moving Inventory</h3>
                <span className="chip chip-warning" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>Optimize storage space</span>
              </div>
              {slowMovers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--secondary)' }}>All products have recent movement.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Store</th>
                        <th>Category</th>
                        <th>Qty Idle</th>
                        <th>Value at Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slowMovers.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td><code style={{ fontSize: '0.75rem' }}>{p.sku}</code></td>
                          <td style={{ fontSize: '0.8125rem' }}>{p.storeName}</td>
                          <td><span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>{p.category}</span></td>
                          <td style={{ fontWeight: 700, color: p.quantity > 20 ? '#ef4444' : '#f59e0b' }}>{p.quantity}</td>
                          <td style={{ fontWeight: 600 }}>₹{(p.price * p.quantity).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BIN UTILIZATION TAB ───────────────────────────────────────────────── */}
        {activeTab === 'bins' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            <div className="card">
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Utilization by Store</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  Percentage of bin capacity currently occupied per warehouse.
                </p>
              </div>
              {binUtilization.byStore.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', textAlign: 'center' }}>No bin data available.</p>
              ) : (
                <HBarChart data={binUtilization.byStore} color="#00478d" />
              )}
            </div>

            <div className="card">
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Bin Fill Levels</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  Current quantity vs capacity per bin (showing occupied bins).
                </p>
              </div>
              {myBins.filter(b => b.status === 'occupied').length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '0.875rem' }}>No occupied bins.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 360, overflowY: 'auto' }}>
                  {myBins.filter(b => b.status === 'occupied').map(bin => {
                    const pct = bin.capacity > 0 ? Math.round((bin.currentQty / bin.capacity) * 100) : 0;
                    return (
                      <div key={bin.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                          <span style={{ fontWeight: 600 }}>{bin.binCode}</span>
                          <span style={{ color: 'var(--secondary)' }}>{bin.currentQty}/{bin.capacity} · {pct}%</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981', transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Empty bins suggestion */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined filled" style={{ color: '#10b981' }}>tips_and_updates</span>
                <h3 style={{ margin: 0 }}>Available Empty Bins</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bin Code</th>
                      <th>Store</th>
                      <th>Zone</th>
                      <th>Aisle</th>
                      <th>Rack</th>
                      <th>Capacity</th>
                      <th>Preferred Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBins.filter(b => b.status === 'empty').length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--secondary)', padding: '1.5rem' }}>No empty bins available</td></tr>
                    ) : (
                      myBins.filter(b => b.status === 'empty').map(bin => (
                        <tr key={bin.id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{bin.binCode}</td>
                          <td style={{ fontSize: '0.8125rem' }}>{bin.storeName}</td>
                          <td><span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>Zone {bin.zone}</span></td>
                          <td>{bin.aisle}</td>
                          <td>{bin.rack}</td>
                          <td><strong>{bin.capacity}</strong> units</td>
                          <td>{bin.preferredCategory ? <span className="chip chip-info" style={{ fontSize: '0.7rem' }}>{bin.preferredCategory}</span> : <span style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>Any</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSIT TRACKER TAB ───────────────────────────────────────────────── */}
        {activeTab === 'transit' && (
          <div>
            {transitMetrics.inTransit.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">local_shipping</span>
                <h3>No active shipments</h3>
                <p>All transfers have been received or are pending approval.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {transitMetrics.inTransit.map(t => {
                  const shippedMs = t.shippedAt ? Date.now() - new Date(t.shippedAt).getTime() : 0;
                  const hoursInTransit = Math.round(shippedMs / 3600000);
                  return (
                    <div key={t.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>{t.transferNumber}</span>
                            <span className="chip chip-info">In Transit</span>
                            {t.trackingId && (
                              <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', background: 'var(--surface-container)', padding: '2px 6px', borderRadius: '0.25rem', color: 'var(--secondary)' }}>
                                {t.trackingId}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, background: 'var(--surface-container)', padding: '2px 8px', borderRadius: '0.375rem' }}>{t.fromStoreName}</span>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f59e0b' }}>local_shipping</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, background: 'var(--surface-container)', padding: '2px 8px', borderRadius: '0.375rem' }}>{t.toStoreName}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--tertiary)', fontFamily: 'Manrope, sans-serif' }}>{t.quantity}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>units</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--secondary)' }}>inventory_2</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.productName}</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--secondary)' }}>{t.sku}</span>
                      </div>

                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                        <div>
                          <span style={{ color: 'var(--secondary)' }}>Approved by: </span>
                          <strong>{t.approvedBy}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--secondary)' }}>Shipped: </span>
                          <strong>{t.shippedAt ? fmtDate(t.shippedAt) : '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--secondary)' }}>In transit: </span>
                          <strong style={{ color: hoursInTransit > 48 ? '#ef4444' : '#f59e0b' }}>{hoursInTransit}h</strong>
                        </div>
                      </div>

                      {/* Transit progress bar */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--secondary)', marginBottom: 4 }}>
                          <span>Dispatched from {t.fromStoreName}</span>
                          <span>Pending at {t.toStoreName}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--surface-container)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ height: '100%', width: '60%', borderRadius: 4, background: 'linear-gradient(90deg, #10b981, #f59e0b)', animation: 'none' }} />
                          <div style={{ position: 'absolute', top: 0, left: '60%', width: 10, height: 10, background: '#f59e0b', borderRadius: '50%', transform: 'translateY(-1px) translateX(-5px)', border: '2px solid white' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed transfers history */}
            {transitMetrics.completed.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Recent Completed Transfers</h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Transfer #</th>
                        <th>Product</th>
                        <th>Route</th>
                        <th>Qty</th>
                        <th>Shipped</th>
                        <th>Received</th>
                        <th>Transit Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitMetrics.completed.slice(0, 8).map(t => {
                        const hrs = t.shippedAt && t.completedAt
                          ? Math.round((new Date(t.completedAt).getTime() - new Date(t.shippedAt).getTime()) / 3600000)
                          : null;
                        return (
                          <tr key={t.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.transferNumber}</td>
                            <td style={{ fontSize: '0.8125rem' }}>{t.productName}</td>
                            <td style={{ fontSize: '0.75rem' }}>{t.fromStoreName} → {t.toStoreName}</td>
                            <td><strong>{t.quantity}</strong></td>
                            <td style={{ fontSize: '0.75rem' }}>{t.shippedAt ? fmtDate(t.shippedAt) : '—'}</td>
                            <td style={{ fontSize: '0.75rem' }}>{t.completedAt ? fmtDate(t.completedAt) : '—'}</td>
                            <td>{hrs !== null ? <span className="chip chip-success" style={{ fontSize: '0.7rem' }}>{hrs}h</span> : <span style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
