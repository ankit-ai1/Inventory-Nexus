import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { StockTransfer, TransferStatus } from '../types';

const STATUS_INFO: Record<TransferStatus, { label: string; cls: string; icon: string }> = {
  pending: { label: 'Pending Approval', cls: 'chip-warning', icon: 'hourglass_empty' },
  approved: { label: 'Approved', cls: 'chip-info', icon: 'check_circle' },
  rejected: { label: 'Rejected', cls: 'chip-error', icon: 'cancel' },
  completed: { label: 'Completed', cls: 'chip-success', icon: 'task_alt' },
};

interface TransferFormData {
  productId: string;
  toStoreId: string;
  quantity: string;
  notes: string;
}

export default function TransfersPage() {
  const { currentUser, transfers, setTransfers, products, stores, showToast, addAuditLog, addNotification, setProducts } = useApp();
  const isAdmin = currentUser?.role === 'head_admin';

  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [reviewTransfer, setReviewTransfer] = useState<StockTransfer | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [formData, setFormData] = useState<TransferFormData>({ productId: '', toStoreId: '', quantity: '', notes: '' });

  const myTransfers = isAdmin
    ? transfers
    : transfers.filter(t => t.fromStoreId === currentUser?.storeId || t.toStoreId === currentUser?.storeId || t.requestedById === currentUser?.id);

  const filtered = useMemo(() =>
    myTransfers.filter(t => filterStatus === 'all' || t.status === filterStatus),
    [myTransfers, filterStatus]);

  const myProducts = isAdmin
    ? products
    : products.filter(p => p.storeId === currentUser?.storeId);

  const availableDestinations = isAdmin
    ? stores
    : stores.filter(s => s.id !== currentUser?.storeId && s.status === 'active');

  const selectedProduct = products.find(p => p.id === formData.productId);
  const toStore = stores.find(s => s.id === formData.toStoreId);

  const handleSubmitTransfer = () => {
    if (!formData.productId || !formData.toStoreId || !formData.quantity) {
      showToast('Please fill all required fields.', 'error'); return;
    }
    const qty = parseInt(formData.quantity);
    if (!selectedProduct || qty < 1 || qty > selectedProduct.quantity) {
      showToast(`Invalid quantity. Available: ${selectedProduct?.quantity ?? 0}`, 'error'); return;
    }

    const transfer: StockTransfer = {
      id: 'tr' + Date.now(),
      transferNumber: 'TR-2026-' + String(transfers.length + 1).padStart(3, '0'),
      status: 'pending',
      fromStoreId: selectedProduct.storeId,
      fromStoreName: selectedProduct.storeName,
      toStoreId: formData.toStoreId,
      toStoreName: toStore?.name || '',
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      quantity: qty,
      requestedBy: currentUser?.name || '',
      requestedById: currentUser?.id || '',
      notes: formData.notes,
      requestedAt: new Date().toISOString(),
    };

    setTransfers(prev => [transfer, ...prev]);
    addAuditLog({
      action: 'create', module: 'transfer', entityId: transfer.id, entityName: transfer.transferNumber,
      details: `Transfer request: ${qty}x ${selectedProduct.name} from ${selectedProduct.storeName} to ${toStore?.name}`,
    });
    addNotification({
      type: 'transfer', title: 'Transfer Request Submitted',
      message: `${transfer.transferNumber}: ${qty}x ${selectedProduct.name} from ${selectedProduct.storeName} → ${toStore?.name}. Awaiting admin approval.`,
      link: '/transfers',
    });
    showToast(`Transfer ${transfer.transferNumber} submitted for approval!`);
    setShowModal(false);
    setFormData({ productId: '', toStoreId: '', quantity: '', notes: '' });
  };

  const handleReview = () => {
    if (!reviewTransfer) return;
    const newStatus: TransferStatus = reviewAction === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();

    setTransfers(prev => prev.map(t => t.id === reviewTransfer.id ? {
      ...t, status: newStatus, approvedBy: currentUser?.name,
      notes: reviewNotes || t.notes, approvedAt: now,
      ...(reviewAction === 'approve' ? { completedAt: now } : {}),
    } : t));

    // If approved, update stock quantities
    if (reviewAction === 'approve') {
      setProducts(prev => prev.map(p => {
        if (p.id === reviewTransfer.productId && p.storeId === reviewTransfer.fromStoreId) {
          const newQty = Math.max(0, p.quantity - reviewTransfer.quantity);
          return {
            ...p, quantity: newQty,
            stockStatus: newQty === 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock',
          };
        }
        return p;
      }));
    }

    addAuditLog({
      action: reviewAction, module: 'transfer', entityId: reviewTransfer.id, entityName: reviewTransfer.transferNumber,
      details: reviewAction === 'approve'
        ? `Transfer approved and completed. Stock updated.`
        : `Transfer rejected. ${reviewNotes}`,
    });
    addNotification({
      type: 'transfer',
      title: `Transfer ${reviewAction === 'approve' ? 'Approved & Completed' : 'Rejected'}`,
      message: `${reviewTransfer.transferNumber} has been ${reviewAction}d by ${currentUser?.name}.`,
      link: '/transfers',
    });
    showToast(`Transfer ${reviewAction}d successfully!`);
    setReviewTransfer(null);
    setReviewNotes('');
  };

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const stats = {
    pending: myTransfers.filter(t => t.status === 'pending').length,
    completed: myTransfers.filter(t => t.status === 'completed').length,
    approved: myTransfers.filter(t => t.status === 'approved').length,
    rejected: myTransfers.filter(t => t.status === 'rejected').length,
  };

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Logistics</p>
            <h1>Stock Transfers</h1>
            <p>Move inventory between stores with a transparent approval workflow.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <span className="material-symbols-outlined">swap_horiz</span>
            Request Transfer
          </button>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Pending Approval', value: stats.pending, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: 'hourglass_empty' },
            { label: 'Approved', value: stats.approved, color: '#00478d', bg: 'rgba(0,71,141,0.08)', icon: 'check_circle' },
            { label: 'Completed', value: stats.completed, color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: 'task_alt' },
            { label: 'Rejected', value: stats.rejected, color: 'var(--error)', bg: 'rgba(186,26,26,0.08)', icon: 'cancel' },
          ].map(m => (
            <div key={m.label} className="metric-card">
              <div className="metric-card-icon" style={{ background: m.bg, marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: m.color }}>{m.icon}</span>
              </div>
              <div className="metric-card-value" style={{ color: m.color }}>{m.value}</div>
              <div className="metric-card-label">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'completed', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{
                padding: '0.375rem 0.875rem', borderRadius: '2rem', border: '1.5px solid',
                borderColor: filterStatus === s ? 'var(--primary)' : 'var(--outline-variant)',
                background: filterStatus === s ? 'var(--primary)' : 'transparent',
                color: filterStatus === s ? 'white' : 'var(--on-surface)',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {s === 'all' ? 'All Transfers' : STATUS_INFO[s as TransferStatus]?.label || s}
            </button>
          ))}
        </div>

        {/* Transfers list */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">swap_horiz</span>
            <h3>No transfers found</h3>
            <p>Request a transfer to move stock between stores.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filtered.map(t => {
              const si = STATUS_INFO[t.status];
              return (
                <div key={t.id} className="card po-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '0.625rem', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>swap_horiz</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem' }}>{t.transferNumber}</span>
                          <span className={`chip ${si.cls}`}>{si.label}</span>
                        </div>
                        {/* Route display */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, background: 'var(--surface-container)', padding: '2px 8px', borderRadius: '0.375rem' }}>{t.fromStoreName}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--tertiary)' }}>arrow_forward</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, background: 'var(--surface-container)', padding: '2px 8px', borderRadius: '0.375rem' }}>{t.toStoreName}</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                          Requested by {t.requestedBy} · {fmtDate(t.requestedAt)} at {fmtTime(t.requestedAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Manrope, sans-serif', color: 'var(--tertiary)' }}>{t.quantity}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>units</div>
                    </div>
                  </div>

                  {/* Product info */}
                  <div style={{ marginTop: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--secondary)' }}>inventory_2</span>
                    <div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.productName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginLeft: '0.5rem', fontFamily: 'monospace' }}>{t.sku}</span>
                    </div>
                  </div>

                  {t.notes && (
                    <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                      "{t.notes}"
                    </div>
                  )}

                  {t.approvedBy && (
                    <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4, color: t.status === 'rejected' ? 'var(--error)' : 'var(--tertiary)' }}>
                        {t.status === 'rejected' ? 'cancel' : 'check_circle'}
                      </span>
                      <strong>{t.status === 'rejected' ? 'Rejected' : t.status === 'completed' ? 'Approved & Completed'  : 'Approved'}</strong> by {t.approvedBy}
                      {t.approvedAt && ` on ${fmtDate(t.approvedAt)}`}
                    </div>
                  )}

                  {/* Actions */}
                  {isAdmin && t.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm" style={{ background: '#d1fae5', color: '#065f46', border: 'none' }}
                        onClick={() => { setReviewTransfer(t); setReviewAction('approve'); }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                        Approve & Complete
                      </button>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => { setReviewTransfer(t); setReviewAction('reject'); }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Transfer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Request Stock Transfer</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Product to Transfer *</label>
              <select className="form-select" value={formData.productId}
                onChange={e => setFormData(f => ({ ...f, productId: e.target.value, quantity: '' }))}>
                <option value="">Select product...</option>
                {myProducts.filter(p => p.quantity > 0).map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Qty: {p.quantity}) — {p.storeName}</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div><span style={{ color: 'var(--secondary)' }}>Current Store: </span><strong>{selectedProduct.storeName}</strong></div>
                  <div><span style={{ color: 'var(--secondary)' }}>Available: </span><strong style={{ color: 'var(--primary)' }}>{selectedProduct.quantity} units</strong></div>
                  <div><span style={{ color: 'var(--secondary)' }}>SKU: </span><code>{selectedProduct.sku}</code></div>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Destination Store *</label>
                <select className="form-select" value={formData.toStoreId}
                  onChange={e => setFormData(f => ({ ...f, toStoreId: e.target.value }))}>
                  <option value="">Select destination...</option>
                  {availableDestinations.filter(s => s.id !== selectedProduct?.storeId).map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" min="1"
                  max={selectedProduct?.quantity || 999}
                  value={formData.quantity}
                  onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))}
                  placeholder={selectedProduct ? `1–${selectedProduct.quantity}` : '0'} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Reason for transfer, urgency, etc." />
            </div>

            {selectedProduct && formData.toStoreId && formData.quantity && (
              <div style={{ background: 'rgba(0,71,141,0.05)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', border: '1px solid rgba(0,71,141,0.15)' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>Transfer Summary</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  {formData.quantity}× {selectedProduct.name} from <strong>{selectedProduct.storeName}</strong> → <strong>{toStore?.name}</strong>
                </p>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitTransfer}>Submit Transfer Request</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewTransfer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReviewTransfer(null)}>
          <div className="confirm-dialog" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: reviewAction === 'approve' ? '#d1fae5' : 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: reviewAction === 'approve' ? '#065f46' : 'var(--on-error-container)', fontSize: 20 }}>
                  {reviewAction === 'approve' ? 'check_circle' : 'cancel'}
                </span>
              </div>
              <div>
                <h3>{reviewAction === 'approve' ? 'Approve Transfer' : 'Reject Transfer'}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  {reviewTransfer.quantity}× {reviewTransfer.productName} · {reviewTransfer.fromStoreName} → {reviewTransfer.toStoreName}
                </p>
                {reviewAction === 'approve' && (
                  <p style={{ fontSize: '0.8125rem', color: '#065f46', marginTop: '0.25rem', fontWeight: 600 }}>
                    This will immediately deduct {reviewTransfer.quantity} unit(s) from {reviewTransfer.fromStoreName}.
                  </p>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes {reviewAction === 'reject' ? '*' : '(optional)'}</label>
              <input className="form-input" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'approve' ? 'Any notes...' : 'Reason for rejection...'} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReviewTransfer(null)}>Cancel</button>
              <button
                className={`btn ${reviewAction === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleReview}
                disabled={reviewAction === 'reject' && !reviewNotes.trim()}
              >
                {reviewAction === 'approve' ? 'Approve & Complete' : 'Reject Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
