import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { PurchaseOrder, POStatus, PurchaseOrderItem } from '../types';

const SUPABASE_ON = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const STATUS_INFO: Record<POStatus, { label: string; cls: string; icon: string }> = {
  pending: { label: 'Pending Review', cls: 'chip-warning', icon: 'hourglass_empty' },
  approved: { label: 'Approved', cls: 'chip-info', icon: 'check_circle' },
  rejected: { label: 'Rejected', cls: 'chip-error', icon: 'cancel' },
  received: { label: 'Received', cls: 'chip-success', icon: 'inventory' },
  partial: { label: 'Partial', cls: 'chip-warning', icon: 'incomplete_circle' },
};

const CATEGORIES = ['Desktops', 'Laptops', 'Monitors', 'Networking', 'Peripherals', 'Power', 'Printers', 'Mini PCs', 'Storage'];

interface POFormData {
  justification: string;
  items: PurchaseOrderItem[];
  storeId: string;
}

const emptyItem = (): PurchaseOrderItem => ({ productName: '', sku: '', category: 'Laptops', quantity: 1, price: 0 });

export default function PurchaseOrdersPage() {
  const { currentUser, purchaseOrders, setPurchaseOrders, stores, showToast, addAuditLog, addNotification } = useApp();
  const isAdmin = currentUser?.role === 'head_admin';

  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const [reviewPO, setReviewPO] = useState<PurchaseOrder | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [formData, setFormData] = useState<POFormData>({ justification: '', items: [emptyItem()], storeId: '' });

  const myPOs = isAdmin
    ? purchaseOrders
    : purchaseOrders.filter(p => p.requestedById === currentUser?.id);

  const filtered = useMemo(() =>
    myPOs.filter(p => filterStatus === 'all' || p.status === filterStatus),
    [myPOs, filterStatus]);

  const myStore = isAdmin
    ? stores.find(s => s.id === formData.storeId)
    : stores.find(s => s.id === currentUser?.storeId);

  const handleAddItem = () => setFormData(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const handleRemoveItem = (i: number) => setFormData(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const handleItemChange = (i: number, field: keyof PurchaseOrderItem, value: string | number) => {
    setFormData(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));
  };

  const totalFormValue = formData.items.reduce((s, i) => s + i.quantity * i.price, 0);

  const handleSubmitPO = async () => {
    if (isAdmin && !formData.storeId) { showToast('Please select a store.', 'error'); return; }
    if (!formData.justification.trim()) { showToast('Please enter a justification.', 'error'); return; }
    if (formData.items.some(i => !i.productName || !i.sku || i.quantity < 1)) {
      showToast('Please fill all item fields.', 'error'); return;
    }
    const targetStoreId = isAdmin ? formData.storeId : (currentUser?.storeId || '');
    const po: PurchaseOrder = {
      id: 'po' + Date.now(),
      poNumber: 'PO-2026-' + String(purchaseOrders.length + 1).padStart(3, '0'),
      status: 'pending',
      storeId: targetStoreId,
      storeName: myStore?.name || currentUser?.storeName || '',
      requestedBy: currentUser?.name || '',
      requestedById: currentUser?.id || '',
      items: formData.items,
      justification: formData.justification,
      requestedAt: new Date().toISOString(),
      totalValue: totalFormValue,
    };
    if (SUPABASE_ON) {
      const { error } = await supabase.from('purchase_orders').insert({
        id: po.id, po_number: po.poNumber, status: po.status,
        store_id: po.storeId, store_name: po.storeName,
        requested_by: po.requestedBy, requested_by_id: po.requestedById,
        items: JSON.stringify(po.items), justification: po.justification,
        requested_at: po.requestedAt, total_value: po.totalValue,
      });
      if (error) { showToast('Failed to submit PO: ' + error.message, 'error'); return; }
    }
    setPurchaseOrders(prev => [po, ...prev]);
    addAuditLog({ action: 'create', module: 'purchase_order', entityId: po.id, entityName: po.poNumber, details: `PO raised for ${formData.items.length} item(s) — ₹${totalFormValue.toLocaleString()}` });
    addNotification({ type: 'purchase_order', title: 'New Purchase Order', message: `${po.poNumber} submitted by ${po.requestedBy}. Awaiting admin review.`, link: '/purchase-orders' });
    showToast(`Purchase Order ${po.poNumber} submitted!`);
    setShowModal(false);
    setFormData({ justification: '', items: [emptyItem()], storeId: '' });
  };

  const handleReview = async () => {
    if (!reviewPO) return;
    const newStatus: POStatus = reviewAction === 'approve' ? 'approved' : 'rejected';
    const now = new Date().toISOString();
    if (SUPABASE_ON) {
      await supabase.from('purchase_orders').update({
        status: newStatus, reviewed_by: currentUser?.name,
        review_comment: reviewComment || null, reviewed_at: now,
      }).eq('id', reviewPO.id);
    }
    setPurchaseOrders(prev => prev.map(p => p.id === reviewPO.id ? {
      ...p, status: newStatus, reviewedBy: currentUser?.name, reviewComment, reviewedAt: now,
    } : p));
    addAuditLog({ action: reviewAction, module: 'purchase_order', entityId: reviewPO.id, entityName: reviewPO.poNumber, details: reviewComment || `PO ${reviewAction}d by admin` });
    addNotification({
      type: 'purchase_order',
      title: `Purchase Order ${reviewAction === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `${reviewPO.poNumber} has been ${reviewAction}d. ${reviewComment ? `Comment: ${reviewComment}` : ''}`,
      link: '/purchase-orders',
    });
    showToast(`PO ${reviewAction}d successfully!`);
    setReviewPO(null);
    setReviewComment('');
  };

  const handleReceive = async (po: PurchaseOrder) => {
    const now = new Date().toISOString();
    if (SUPABASE_ON) {
      await supabase.from('purchase_orders').update({
        status: 'received', received_at: now,
      }).eq('id', po.id);
    }
    setPurchaseOrders(prev => prev.map(p => p.id === po.id ? {
      ...p, status: 'received' as POStatus, receivedAt: now,
    } : p));
    addAuditLog({ action: 'receive', module: 'purchase_order', entityId: po.id, entityName: po.poNumber, details: 'Stock received and inventory updated' });
    showToast('Stock marked as received!');
  };

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const stats = {
    pending: purchaseOrders.filter(p => p.status === 'pending').length,
    approved: myPOs.filter(p => p.status === 'approved').length,
    received: myPOs.filter(p => p.status === 'received').length,
    rejected: myPOs.filter(p => p.status === 'rejected').length,
  };

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Procurement</p>
            <h1>Purchase Orders</h1>
            <p>Raise purchase requests, track approval status, and confirm stock receipt.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <span className="material-symbols-outlined">add</span>
            Raise New PO
          </button>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: isAdmin ? 'Awaiting Review' : 'My Pending', value: isAdmin ? stats.pending : myPOs.filter(p => p.status === 'pending').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: 'hourglass_empty' },
            { label: 'Approved', value: stats.approved, color: '#00478d', bg: 'rgba(0,71,141,0.08)', icon: 'check_circle' },
            { label: 'Received', value: stats.received, color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: 'inventory' },
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
          {['all', 'pending', 'approved', 'received', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{
                padding: '0.375rem 0.875rem', borderRadius: '2rem', border: '1.5px solid',
                borderColor: filterStatus === s ? 'var(--primary)' : 'var(--outline-variant)',
                background: filterStatus === s ? 'var(--primary)' : 'transparent',
                color: filterStatus === s ? 'white' : 'var(--on-surface)',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {s === 'all' ? 'All POs' : STATUS_INFO[s as POStatus]?.label || s}
            </button>
          ))}
        </div>

        {/* PO List */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">receipt_long</span>
            <h3>No purchase orders found</h3>
            <p>{!isAdmin ? 'Raise a new purchase order to request stock.' : 'No orders match the current filter.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filtered.map(po => {
              const si = STATUS_INFO[po.status];
              return (
                <div key={po.id} className="card po-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '0.625rem', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>receipt_long</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem' }}>{po.poNumber}</span>
                          <span className={`chip ${si.cls}`}>{si.label}</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                          {isAdmin ? `${po.storeName} · ` : ''}{po.requestedBy} · {fmtDate(po.requestedAt)} at {fmtTime(po.requestedAt)}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                          "{po.justification}"
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'Manrope, sans-serif', color: 'var(--primary)' }}>
                        ₹{po.totalValue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{po.items.length} item(s)</div>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div style={{ marginTop: '0.875rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {po.items.map((item, i) => (
                      <div key={i} style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 600 }}>{item.productName}</span>
                        <span style={{ color: 'var(--secondary)' }}> × {item.quantity}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700, marginLeft: '0.375rem' }}>₹{item.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {po.reviewComment && (
                    <div style={{ marginTop: '0.75rem', background: po.status === 'rejected' ? 'var(--error-container)' : '#d1fae5', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.8125rem' }}>
                      <span style={{ fontWeight: 700, color: po.status === 'rejected' ? 'var(--on-error-container)' : '#065f46' }}>
                        {po.reviewedBy}: </span>
                      <span style={{ color: po.status === 'rejected' ? 'var(--on-error-container)' : '#065f46' }}>{po.reviewComment}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewPO(po)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                      View Details
                    </button>
                    {isAdmin && po.status === 'pending' && (
                      <>
                        <button className="btn btn-sm" style={{ background: '#d1fae5', color: '#065f46', border: 'none' }}
                          onClick={() => { setReviewPO(po); setReviewAction('approve'); }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                          Approve
                        </button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => { setReviewPO(po); setReviewAction('reject'); }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                          Reject
                        </button>
                      </>
                    )}
                    {!isAdmin && po.status === 'approved' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleReceive(po)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>inventory</span>
                        Mark as Received
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raise PO Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>Raise Purchase Order</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {isAdmin ? (
              <div className="form-group">
                <label className="form-label">Store *</label>
                <select className="form-select" value={formData.storeId}
                  onChange={e => setFormData(f => ({ ...f, storeId: e.target.value }))}>
                  <option value="">Select store...</option>
                  {stores.filter(s => s.status === 'active').map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                Raising for: <strong style={{ color: 'var(--on-surface)' }}>{myStore?.name || currentUser?.storeName || '—'}</strong>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Justification *</label>
              <input className="form-input" value={formData.justification}
                onChange={e => setFormData(f => ({ ...f, justification: e.target.value }))}
                placeholder="Why is this purchase needed?" />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Items *</label>
                <button className="btn btn-ghost btn-sm" onClick={handleAddItem}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Add Item
                </button>
              </div>
              {formData.items.map((item, i) => (
                <div key={i} style={{ background: 'var(--surface-container-low)', borderRadius: '0.625rem', padding: '0.875rem', marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)' }}>Item {i + 1}</span>
                    {formData.items.length > 1 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveItem(i)} style={{ color: 'var(--error)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>remove_circle</span>
                      </button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input className="form-input" value={item.productName}
                        onChange={e => handleItemChange(i, 'productName', e.target.value)} placeholder="e.g. HP ProBook 450" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">SKU *</label>
                      <input className="form-input" value={item.sku}
                        onChange={e => handleItemChange(i, 'sku', e.target.value)} placeholder="e.g. HPB-450" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={item.category}
                        onChange={e => handleItemChange(i, 'category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Qty *</label>
                      <input className="form-input" type="number" min="1" value={item.quantity}
                        onChange={e => handleItemChange(i, 'quantity', parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit Price (₹) *</label>
                      <input className="form-input" type="number" min="0" value={item.price || ''}
                        onChange={e => handleItemChange(i, 'price', parseFloat(e.target.value) || 0)} placeholder="0" />
                    </div>
                  </div>
                </div>
              ))}
              {totalFormValue > 0 && (
                <div style={{ textAlign: 'right', padding: '0.5rem 0.875rem', fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: 'var(--primary)' }}>
                  Total: ₹{totalFormValue.toLocaleString()}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitPO}>Submit Purchase Order</button>
            </div>
          </div>
        </div>
      )}

      {/* View PO Details Modal */}
      {viewPO && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewPO(null)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{viewPO.poNumber}</h3>
              <button className="modal-close" onClick={() => setViewPO(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span className={`chip ${STATUS_INFO[viewPO.status].cls}`}>{STATUS_INFO[viewPO.status].label}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>Raised by {viewPO.requestedBy} on {fmtDate(viewPO.requestedAt)}</span>
            </div>
            <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--on-surface-variant)' }}>
              "{viewPO.justification}"
            </div>
            <table className="data-table" style={{ marginBottom: '1rem' }}>
              <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
              <tbody>
                {viewPO.items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.productName}</td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{item.sku}</td>
                    <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                    <td>₹{item.price.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{(item.quantity * item.price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '1rem' }}>
              Grand Total: ₹{viewPO.totalValue.toLocaleString()}
            </div>
            {viewPO.reviewedBy && (
              <div style={{ padding: '0.75rem', background: viewPO.status === 'rejected' ? 'var(--error-container)' : '#d1fae5', borderRadius: '0.5rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <strong>{viewPO.reviewedBy}</strong> ({viewPO.status === 'approved' ? 'Approved' : 'Rejected'} on {viewPO.reviewedAt ? fmtDate(viewPO.reviewedAt) : '—'}):
                {viewPO.reviewComment && <span> {viewPO.reviewComment}</span>}
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewPO(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Review (Approve/Reject) Modal */}
      {reviewPO && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReviewPO(null)}>
          <div className="confirm-dialog" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: reviewAction === 'approve' ? '#d1fae5' : 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: reviewAction === 'approve' ? '#065f46' : 'var(--on-error-container)', fontSize: 20 }}>
                  {reviewAction === 'approve' ? 'check_circle' : 'cancel'}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h3>{reviewAction === 'approve' ? 'Approve' : 'Reject'} Purchase Order</h3>
                <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                  {reviewPO.poNumber} · {reviewPO.storeName} · ₹{reviewPO.totalValue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Comment {reviewAction === 'reject' ? '*' : '(optional)'}</label>
              <input className="form-input" value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder={reviewAction === 'approve' ? 'Approval note...' : 'Reason for rejection...'} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReviewPO(null)}>Cancel</button>
              <button
                className={`btn ${reviewAction === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleReview}
                disabled={reviewAction === 'reject' && !reviewComment.trim()}
              >
                {reviewAction === 'approve' ? 'Approve PO' : 'Reject PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
