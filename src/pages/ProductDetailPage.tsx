import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { products, auditLogs, transfers, stores, currentUser } = useApp();
  const navigate = useNavigate();

  const product = products.find(p => p.id === id);
  const isAdmin = currentUser?.role === 'head_admin';

  if (!product) {
    return (
      <Layout>
        <TopBar />
        <div className="page-content">
          <div className="empty-state">
            <span className="material-symbols-outlined">inventory_2</span>
            <h3>Product not found</h3>
            <p>This product may have been deleted.</p>
            <button className="btn btn-primary" onClick={() => navigate('/inventory')}>Back to Inventory</button>
          </div>
        </div>
      </Layout>
    );
  }

  const productLogs = auditLogs.filter(l => l.entityId === id || (l.module === 'product' && l.entityName === product.name));
  const productTransfers = transfers.filter(t => t.productId === id);
  const store = stores.find(s => s.id === product.storeId);

  const stockInfo = () => {
    if (product.stockStatus === 'in_stock') return { label: 'In Stock', cls: 'chip-success', icon: 'check_circle', color: '#34d399' };
    if (product.stockStatus === 'low_stock') return { label: 'Low Stock', cls: 'chip-warning', icon: 'warning', color: '#f59e0b' };
    return { label: 'Out of Stock', cls: 'chip-error', icon: 'error', color: '#ba1a1a' };
  };

  const warrantyInfo = () => {
    if (product.warrantyStatus === 'active') return { label: 'Active', cls: 'chip-success', icon: 'verified', color: '#34d399' };
    if (product.warrantyStatus === 'expiring_soon') return { label: 'Expiring Soon', cls: 'chip-warning', icon: 'schedule', color: '#f59e0b' };
    return { label: 'Expired', cls: 'chip-error', icon: 'cancel', color: '#ba1a1a' };
  };

  const stock = stockInfo();
  const warranty = warrantyInfo();

  const categoryIcons: Record<string, string> = {
    Desktops: 'computer', Laptops: 'laptop', Monitors: 'monitor', Networking: 'router',
    Peripherals: 'mouse', Power: 'bolt', Printers: 'print', 'Mini PCs': 'memory', Storage: 'storage',
  };

  const actionLabel = (action: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      create: { label: 'Created', color: '#065f46', bg: '#d1fae5' },
      update: { label: 'Updated', color: '#1d4ed8', bg: '#dbeafe' },
      delete: { label: 'Deleted', color: '#ba1a1a', bg: 'var(--error-container)' },
      approve: { label: 'Approved', color: '#065f46', bg: '#d1fae5' },
      reject: { label: 'Rejected', color: '#ba1a1a', bg: 'var(--error-container)' },
      receive: { label: 'Received', color: '#5b21b6', bg: '#ede9fe' },
    };
    return map[action] || { label: action, color: 'var(--secondary)', bg: 'var(--surface-container)' };
  };

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const transferStatusBadge = (status: string) => {
    if (status === 'completed') return 'chip-success';
    if (status === 'approved') return 'chip-info';
    if (status === 'pending') return 'chip-warning';
    return 'chip-error';
  };

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        {/* Back + Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/inventory')} style={{ marginBottom: '1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Back to Inventory
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '0.875rem',
                background: 'linear-gradient(135deg, var(--primary-fixed), var(--secondary-container))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span className="material-symbols-outlined filled" style={{ fontSize: 28, color: 'var(--primary)' }}>
                  {categoryIcons[product.category] || 'inventory_2'}
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.5rem', fontFamily: 'Manrope, sans-serif', fontWeight: 900 }}>{product.name}</h1>
                  <span className={`chip ${stock.cls}`}>{stock.label}</span>
                  <span className={`chip ${warranty.cls}`}>{warranty.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)', fontFamily: 'monospace' }}>{product.sku}</span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.6875rem' }}>{product.category}</span>
                  {isAdmin && <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{product.storeName}</span>}
                </div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/inventory')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
              Edit Product
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Stock Info */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="section-title">Stock Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Current Quantity</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Manrope, sans-serif', color: stock.color }}>{product.quantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Unit Price</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>₹{product.price.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Total Value</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>₹{(product.price * product.quantity).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Status</span>
                <span className={`chip ${stock.cls}`}>{stock.label}</span>
              </div>
            </div>
          </div>

          {/* Warranty Info */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="section-title">Warranty Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Warranty Status</span>
                <span className={`chip ${warranty.cls}`}>{warranty.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Start Date</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{product.warrantyStartDate || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>End Date</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{product.warrantyEndDate || '—'}</span>
              </div>
              {product.warrantyEndDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Days Remaining</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: warranty.color }}>
                    {Math.max(0, Math.floor((new Date(product.warrantyEndDate).getTime() - Date.now()) / 86400000))} days
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Store & Meta */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="section-title">Store & Metadata</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Store</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{product.storeName}</span>
              </div>
              {store && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Location</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface)' }}>{store.location}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Category</span>
                <span className="chip chip-neutral" style={{ fontSize: '0.6875rem' }}>{product.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Date Added</span>
                <span style={{ fontSize: '0.8125rem' }}>{fmtDate(product.createdAt)}</span>
              </div>
              {product.notes && (
                <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.625rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notes</span>
                  <p style={{ fontSize: '0.8125rem', marginTop: 4, color: 'var(--on-surface)' }}>{product.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Activity Timeline */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>Activity Timeline</h3>
            {productLogs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8125rem', padding: '2rem 0' }}>
                No activity recorded for this product.
              </div>
            ) : (
              <div className="timeline">
                {productLogs.map((log, i) => {
                  const al = actionLabel(log.action);
                  return (
                    <div key={log.id} className={`timeline-item ${i === productLogs.length - 1 ? 'last' : ''}`}>
                      <div className="timeline-dot" style={{ background: al.bg, border: `2px solid ${al.color}` }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 10, color: al.color }}>
                          {log.action === 'create' ? 'add' : log.action === 'update' ? 'edit' : log.action === 'delete' ? 'delete' : 'circle'}
                        </span>
                      </div>
                      <div className="timeline-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{log.userName}</span>
                          <span style={{ fontSize: '0.6875rem', padding: '1px 8px', borderRadius: '1rem', background: al.bg, color: al.color, fontWeight: 700 }}>{al.label}</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: 2 }}>{log.details}</div>
                        {log.changes && log.changes.length > 0 && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {log.changes.map((c, ci) => (
                              <div key={ci} style={{ fontSize: '0.6875rem', background: 'var(--surface-container-low)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>{c.field}:</span>
                                <span style={{ color: 'var(--error)', textDecoration: 'line-through' }}>{c.from}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 10, color: 'var(--secondary)' }}>arrow_forward</span>
                                <span style={{ color: '#065f46', fontWeight: 600 }}>{c.to}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)', marginTop: 4 }}>
                          {fmtDate(log.timestamp)} at {fmtTime(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transfer History */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>Transfer History</h3>
            {productTransfers.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8125rem', padding: '2rem 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: '0.5rem', display: 'block', opacity: 0.3 }}>swap_horiz</span>
                No transfers recorded for this product.
              </div>
            ) : productTransfers.map(t => (
              <div key={t.id} style={{ padding: '0.875rem', background: 'var(--surface-container-low)', borderRadius: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>{t.transferNumber}</span>
                  <span className={`chip ${transferStatusBadge(t.status)}`} style={{ fontSize: '0.6875rem' }}>{t.status}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 600 }}>{t.fromStoreName}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--secondary)' }}>arrow_forward</span>
                  <span style={{ fontWeight: 600 }}>{t.toStoreName}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  {t.quantity} units · {fmtDate(t.requestedAt)}
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transfers')} style={{ width: '100%', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>
              Request Transfer
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
