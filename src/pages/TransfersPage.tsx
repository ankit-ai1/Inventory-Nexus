import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { StockTransfer, TransferStatus, TransferType } from '../types';

const SUPABASE_ON = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

const STATUS_INFO: Record<TransferStatus, { label: string; cls: string; icon: string }> = {
  pending:    { label: 'Pending Approval', cls: 'chip-warning', icon: 'hourglass_empty' },
  approved:   { label: 'Approved',         cls: 'chip-info',    icon: 'check_circle' },
  in_transit: { label: 'In Transit',       cls: 'chip-info',    icon: 'local_shipping' },
  rejected:   { label: 'Rejected',         cls: 'chip-error',   icon: 'cancel' },
  completed:  { label: 'Completed',        cls: 'chip-success', icon: 'task_alt' },
};

interface TransferFormData {
  productId: string;
  toStoreId: string;
  quantity: string;
  notes: string;
}

interface PullFormData {
  fromStoreId: string;
  productId: string;
  quantity: string;
  notes: string;
}

export default function TransfersPage() {
  const { currentUser, transfers, setTransfers, products, stores, showToast, addAuditLog, addNotification, setProducts } = useApp();
  const isAdmin = currentUser?.role === 'head_admin';

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'push' | 'pull'>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<TransferType>('push');
  const [reviewTransfer, setReviewTransfer] = useState<StockTransfer | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  // Push form
  const [formData, setFormData] = useState<TransferFormData>({ productId: '', toStoreId: '', quantity: '', notes: '' });
  // Pull form
  const [pullData, setPullData] = useState<PullFormData>({ fromStoreId: '', productId: '', quantity: '', notes: '' });

  const myTransfers = isAdmin
    ? transfers
    : transfers.filter(t =>
        t.fromStoreId === currentUser?.storeId ||
        t.toStoreId === currentUser?.storeId ||
        t.requestedById === currentUser?.id
      );

  const filtered = useMemo(() =>
    myTransfers.filter(t => {
      const statusMatch = filterStatus === 'all' || t.status === filterStatus;
      const typeMatch = filterType === 'all' || (t.transferType || 'push') === filterType;
      return statusMatch && typeMatch;
    }),
    [myTransfers, filterStatus, filterType]);

  // Products from my store (for push)
  const myProducts = isAdmin
    ? products
    : products.filter(p => p.storeId === currentUser?.storeId);

  // Available destinations (for push)
  const availableDestinations = isAdmin
    ? stores
    : stores.filter(s => s.id !== currentUser?.storeId && s.status === 'active');

  // Available source stores (for pull) — not my own store
  const availableSources = stores.filter(s => s.id !== currentUser?.storeId && s.status === 'active');

  // Products at the selected source store (for pull)
  const sourceProducts = pullData.fromStoreId
    ? products.filter(p => p.storeId === pullData.fromStoreId && p.quantity > 0)
    : [];

  const selectedProduct = products.find(p => p.id === formData.productId);
  const toStore = stores.find(s => s.id === formData.toStoreId);

  const selectedPullProduct = products.find(p => p.id === pullData.productId);
  const pullFromStore = stores.find(s => s.id === pullData.fromStoreId);

  // ── Push Transfer ─────────────────────────────────────────────────────────
  const handleSubmitPush = async () => {
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
      transferType: 'push',
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
      requestedByStoreId: currentUser?.storeId,
      notes: formData.notes,
      requestedAt: new Date().toISOString(),
    };

    if (SUPABASE_ON) {
      const { error } = await supabase.from('stock_transfers').insert({
        id: transfer.id, transfer_number: transfer.transferNumber, status: transfer.status,
        transfer_type: transfer.transferType, from_store_id: transfer.fromStoreId,
        from_store_name: transfer.fromStoreName, to_store_id: transfer.toStoreId,
        to_store_name: transfer.toStoreName, product_id: transfer.productId,
        product_name: transfer.productName, sku: transfer.sku, quantity: transfer.quantity,
        requested_by: transfer.requestedBy, requested_by_id: transfer.requestedById,
        requested_by_store_id: transfer.requestedByStoreId || null,
        notes: transfer.notes || null, requested_at: transfer.requestedAt,
      });
      if (error) { showToast('Failed to submit transfer: ' + error.message, 'error'); return; }
    }
    setTransfers(prev => [transfer, ...prev]);
    addAuditLog({
      action: 'create', module: 'transfer', entityId: transfer.id, entityName: transfer.transferNumber,
      details: `Push transfer: ${qty}× ${selectedProduct.name} from ${selectedProduct.storeName} → ${toStore?.name}`,
    });
    addNotification({
      type: 'transfer', title: 'Transfer Request Submitted',
      message: `${transfer.transferNumber}: ${qty}× ${selectedProduct.name} from ${selectedProduct.storeName} → ${toStore?.name}. Awaiting admin approval.`,
      link: '/transfers',
    });
    showToast(`Transfer ${transfer.transferNumber} submitted for approval!`);
    setShowModal(false);
    setFormData({ productId: '', toStoreId: '', quantity: '', notes: '' });
  };

  // ── Pull (Stock Request) ──────────────────────────────────────────────────
  const handleSubmitPull = async () => {
    if (!pullData.fromStoreId || !pullData.productId || !pullData.quantity) {
      showToast('Please fill all required fields.', 'error'); return;
    }
    const qty = parseInt(pullData.quantity);
    if (!selectedPullProduct || qty < 1 || qty > selectedPullProduct.quantity) {
      showToast(`Invalid quantity. Available at source: ${selectedPullProduct?.quantity ?? 0}`, 'error'); return;
    }

    const myStore = stores.find(s => s.id === currentUser?.storeId);
    const transfer: StockTransfer = {
      id: 'tr' + Date.now(),
      transferNumber: 'TR-2026-' + String(transfers.length + 1).padStart(3, '0'),
      status: 'pending',
      transferType: 'pull',
      fromStoreId: selectedPullProduct.storeId,
      fromStoreName: selectedPullProduct.storeName,
      toStoreId: currentUser?.storeId || '',
      toStoreName: myStore?.name || currentUser?.storeName || '',
      productId: selectedPullProduct.id,
      productName: selectedPullProduct.name,
      sku: selectedPullProduct.sku,
      quantity: qty,
      requestedBy: currentUser?.name || '',
      requestedById: currentUser?.id || '',
      requestedByStoreId: currentUser?.storeId,
      notes: pullData.notes,
      requestedAt: new Date().toISOString(),
    };

    if (SUPABASE_ON) {
      const { error } = await supabase.from('stock_transfers').insert({
        id: transfer.id, transfer_number: transfer.transferNumber, status: transfer.status,
        transfer_type: transfer.transferType, from_store_id: transfer.fromStoreId,
        from_store_name: transfer.fromStoreName, to_store_id: transfer.toStoreId,
        to_store_name: transfer.toStoreName, product_id: transfer.productId,
        product_name: transfer.productName, sku: transfer.sku, quantity: transfer.quantity,
        requested_by: transfer.requestedBy, requested_by_id: transfer.requestedById,
        requested_by_store_id: transfer.requestedByStoreId || null,
        notes: transfer.notes || null, requested_at: transfer.requestedAt,
      });
      if (error) { showToast('Failed to submit request: ' + error.message, 'error'); return; }
    }
    setTransfers(prev => [transfer, ...prev]);
    addAuditLog({
      action: 'create', module: 'transfer', entityId: transfer.id, entityName: transfer.transferNumber,
      details: `Stock request: ${qty}× ${selectedPullProduct.name} requested from ${selectedPullProduct.storeName} by ${currentUser?.name} (${myStore?.name})`,
    });
    addNotification({
      type: 'transfer', title: 'Stock Request Submitted',
      message: `${transfer.transferNumber}: ${currentUser?.name} requested ${qty}× ${selectedPullProduct.name} from ${selectedPullProduct.storeName}. Awaiting admin approval.`,
      link: '/transfers',
    });
    showToast(`Stock request ${transfer.transferNumber} submitted! Awaiting admin approval.`);
    setShowModal(false);
    setPullData({ fromStoreId: '', productId: '', quantity: '', notes: '' });
  };

  // ── Admin Review ──────────────────────────────────────────────────────────
  const handleReview = async () => {
    if (!reviewTransfer) return;
    const now = new Date().toISOString();

    if (reviewAction === 'approve') {
      const trackingId = 'TRK-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);

      if (SUPABASE_ON) {
        const { error } = await supabase.from('stock_transfers').update({
          status: 'in_transit',
          approved_by: currentUser?.name,
          approved_at: now,
          shipped_at: now,
          tracking_id: trackingId,
          notes: reviewNotes || reviewTransfer.notes || null,
        }).eq('id', reviewTransfer.id);
        if (error) { showToast('Failed to approve transfer: ' + error.message, 'error'); return; }

        // Deduct stock from source product
        const srcProduct = products.find(p => p.id === reviewTransfer.productId && p.storeId === reviewTransfer.fromStoreId);
        if (srcProduct) {
          const newQty = Math.max(0, srcProduct.quantity - reviewTransfer.quantity);
          const newStatus = newQty === 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock';
          await supabase.from('products').update({ quantity: newQty, stock_status: newStatus }).eq('id', srcProduct.id);
        }
      }

      setTransfers(prev => prev.map(t => t.id === reviewTransfer.id ? {
        ...t,
        status: 'in_transit' as TransferStatus,
        approvedBy: currentUser?.name,
        approvedAt: now,
        shippedAt: now,
        trackingId,
        notes: reviewNotes || t.notes,
      } : t));

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

      addAuditLog({
        action: 'approve', module: 'transfer', entityId: reviewTransfer.id, entityName: reviewTransfer.transferNumber,
        details: `Transfer approved. Stock deducted from ${reviewTransfer.fromStoreName}. In-transit with tracking: ${trackingId}.`,
      });
      addNotification({
        type: 'transfer', title: 'Transfer Approved & In Transit',
        message: `${reviewTransfer.transferNumber} approved and dispatched. Tracking: ${trackingId}. Awaiting receipt at ${reviewTransfer.toStoreName}.`,
        link: '/transfers',
      });
      showToast(`Transfer approved! Now in-transit. Tracking: ${trackingId}`);

    } else {
      if (SUPABASE_ON) {
        const { error } = await supabase.from('stock_transfers').update({
          status: 'rejected',
          approved_by: currentUser?.name,
          approved_at: now,
          notes: reviewNotes || reviewTransfer.notes || null,
        }).eq('id', reviewTransfer.id);
        if (error) { showToast('Failed to reject transfer: ' + error.message, 'error'); return; }
      }
      setTransfers(prev => prev.map(t => t.id === reviewTransfer.id ? {
        ...t, status: 'rejected' as TransferStatus,
        approvedBy: currentUser?.name, approvedAt: now,
        notes: reviewNotes || t.notes,
      } : t));
      addAuditLog({
        action: 'reject', module: 'transfer', entityId: reviewTransfer.id, entityName: reviewTransfer.transferNumber,
        details: `Transfer rejected. ${reviewNotes}`,
      });
      addNotification({
        type: 'transfer', title: 'Transfer Rejected',
        message: `${reviewTransfer.transferNumber} has been rejected by ${currentUser?.name}.`,
        link: '/transfers',
      });
      showToast('Transfer rejected.');
    }

    setReviewTransfer(null);
    setReviewNotes('');
  };

  // ── Confirm Receipt ───────────────────────────────────────────────────────
  const handleConfirmReceipt = async (transfer: StockTransfer) => {
    const now = new Date().toISOString();

    if (SUPABASE_ON) {
      const { error } = await supabase.from('stock_transfers').update({
        status: 'completed',
        completed_at: now,
        received_by_name: currentUser?.name,
      }).eq('id', transfer.id);
      if (error) { showToast('Failed to confirm receipt: ' + error.message, 'error'); return; }

      // Add stock to destination
      const destProduct = products.find(p => p.id === transfer.productId && p.storeId === transfer.toStoreId);
      if (destProduct) {
        const newQty = destProduct.quantity + transfer.quantity;
        const newStatus = newQty === 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock';
        await supabase.from('products').update({ quantity: newQty, stock_status: newStatus }).eq('id', destProduct.id);
      } else {
        // Create a new product entry at destination store
        const srcProduct = products.find(p => p.id === transfer.productId);
        if (srcProduct) {
          const destStore = stores.find(s => s.id === transfer.toStoreId);
          const newId = 'p' + Date.now();
          const newStatus = transfer.quantity <= 10 ? 'low_stock' : 'in_stock';
          await supabase.from('products').insert({
            id: newId, name: srcProduct.name, sku: srcProduct.sku, category: srcProduct.category,
            quantity: transfer.quantity, price: srcProduct.price,
            store_id: transfer.toStoreId, store_name: destStore?.name || transfer.toStoreName,
            stock_status: newStatus, created_at: now,
            warranty_start_date: srcProduct.warrantyStartDate || null,
            warranty_end_date: srcProduct.warrantyEndDate || null,
            warranty_status: srcProduct.warrantyStatus || null,
            notes: srcProduct.notes || null,
          });
        }
      }
    }

    setTransfers(prev => prev.map(t => t.id === transfer.id ? {
      ...t, status: 'completed' as TransferStatus, completedAt: now, receivedByName: currentUser?.name,
    } : t));

    setProducts(prev => {
      const destProduct = prev.find(p => p.id === transfer.productId && p.storeId === transfer.toStoreId);
      if (destProduct) {
        const newQty = destProduct.quantity + transfer.quantity;
        return prev.map(p => p.id === transfer.productId && p.storeId === transfer.toStoreId ? {
          ...p, quantity: newQty,
          stockStatus: newQty === 0 ? 'out_of_stock' : newQty <= 10 ? 'low_stock' : 'in_stock',
        } : p);
      }
      const srcProduct = prev.find(p => p.id === transfer.productId);
      if (srcProduct) {
        const newQty = transfer.quantity;
        const destStore = stores.find(s => s.id === transfer.toStoreId);
        return [...prev, {
          ...srcProduct,
          id: 'p' + Date.now(),
          storeId: transfer.toStoreId,
          storeName: destStore?.name || transfer.toStoreName,
          quantity: newQty,
          stockStatus: newQty <= 10 ? 'low_stock' : 'in_stock',
          createdAt: now,
        }];
      }
      return prev;
    });

    addAuditLog({
      action: 'receive', module: 'transfer', entityId: transfer.id, entityName: transfer.transferNumber,
      details: `Transfer received by ${currentUser?.name} at ${transfer.toStoreName}. ${transfer.quantity}× ${transfer.productName} added to inventory.`,
    });
    addNotification({
      type: 'transfer', title: 'Transfer Completed',
      message: `${transfer.transferNumber} received at ${transfer.toStoreName}. ${transfer.quantity}× ${transfer.productName} added to stock.`,
      link: '/transfers',
    });
    showToast(`Receipt confirmed! ${transfer.quantity}× ${transfer.productName} added to ${transfer.toStoreName}.`);
  };

  const canConfirmReceipt = (t: StockTransfer) => {
    if (t.status !== 'in_transit') return false;
    if (isAdmin) return true;
    return currentUser?.storeId === t.toStoreId;
  };

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const stats = {
    pending:    myTransfers.filter(t => t.status === 'pending').length,
    in_transit: myTransfers.filter(t => t.status === 'in_transit').length,
    completed:  myTransfers.filter(t => t.status === 'completed').length,
    rejected:   myTransfers.filter(t => t.status === 'rejected').length,
  };

  const openModal = () => { setModalTab('push'); setShowModal(true); };

  return (
    <Layout>
      <TopBar />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Logistics</p>
            <h1>Stock Transfers</h1>
            <p>Send stock to another store or request stock from another store — with a transparent 3-stage approval workflow.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn btn-secondary" onClick={() => { setModalTab('pull'); setShowModal(true); }}>
              <span className="material-symbols-outlined">download</span>
              Request Stock
            </button>
            <button className="btn btn-primary" onClick={openModal}>
              <span className="material-symbols-outlined">upload</span>
              Send Stock
            </button>
          </div>
        </div>

        {/* In-transit callout */}
        {stats.in_transit > 0 && (
          <div style={{ background: 'rgba(0,71,141,0.06)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(0,71,141,0.2)', display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
            <span className="material-symbols-outlined filled" style={{ color: 'var(--primary)' }}>local_shipping</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{stats.in_transit} shipment{stats.in_transit > 1 ? 's' : ''} currently in transit</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginLeft: '0.5rem' }}>— awaiting confirmation at destination stores.</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setFilterStatus('in_transit')}>View</button>
          </div>
        )}

        {/* Stats */}
        <div className="metric-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Pending Approval', value: stats.pending,    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: 'hourglass_empty' },
            { label: 'In Transit',       value: stats.in_transit, color: '#00478d', bg: 'rgba(0,71,141,0.08)',    icon: 'local_shipping' },
            { label: 'Completed',        value: stats.completed,  color: '#34d399', bg: 'rgba(52,211,153,0.1)',   icon: 'task_alt' },
            { label: 'Rejected',         value: stats.rejected,   color: 'var(--error)', bg: 'rgba(186,26,26,0.08)', icon: 'cancel' },
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
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'in_transit', 'completed', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{
                  padding: '0.375rem 0.875rem', borderRadius: '2rem', border: '1.5px solid',
                  borderColor: filterStatus === s ? 'var(--primary)' : 'var(--outline-variant)',
                  background: filterStatus === s ? 'var(--primary)' : 'transparent',
                  color: filterStatus === s ? 'white' : 'var(--on-surface)',
                  fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {s === 'all' ? 'All' : STATUS_INFO[s as TransferStatus]?.label || s}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--outline-variant)', margin: '0 0.25rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {([
              { key: 'all', label: 'All Types' },
              { key: 'push', label: 'Outgoing' },
              { key: 'pull', label: 'Requests' },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setFilterType(key)}
                style={{
                  padding: '0.375rem 0.875rem', borderRadius: '2rem', border: '1.5px solid',
                  borderColor: filterType === key ? '#7c3aed' : 'var(--outline-variant)',
                  background: filterType === key ? '#7c3aed' : 'transparent',
                  color: filterType === key ? 'white' : 'var(--on-surface)',
                  fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Transfers list */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">swap_horiz</span>
            <h3>No transfers found</h3>
            <p>Send stock to another store or request stock from a store.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filtered.map(t => {
              const si = STATUS_INFO[t.status];
              const isPull = (t.transferType || 'push') === 'pull';
              return (
                <div key={t.id} className="card po-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '0.625rem', background: isPull ? 'rgba(124,58,237,0.1)' : 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: isPull ? '#7c3aed' : 'var(--tertiary)' }}>
                          {isPull ? 'download' : 'upload'}
                        </span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem' }}>{t.transferNumber}</span>
                          <span className={`chip ${si.cls}`}>{si.label}</span>
                          <span style={{
                            fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '2rem',
                            background: isPull ? 'rgba(124,58,237,0.12)' : 'rgba(0,71,141,0.1)',
                            color: isPull ? '#7c3aed' : 'var(--primary)',
                          }}>
                            {isPull ? 'Stock Request' : 'Outgoing'}
                          </span>
                          {t.trackingId && (
                            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', background: 'var(--surface-container)', padding: '2px 6px', borderRadius: '0.25rem', color: 'var(--secondary)' }}>
                              {t.trackingId}
                            </span>
                          )}
                        </div>

                        {/* Route */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, background: 'var(--surface-container)', padding: '2px 8px', borderRadius: '0.375rem' }}>{t.fromStoreName}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: isPull ? '#7c3aed' : 'var(--tertiary)' }}>arrow_forward</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, background: 'var(--surface-container)', padding: '2px 8px', borderRadius: '0.375rem' }}>{t.toStoreName}</span>
                        </div>

                        <div style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                          {isPull ? 'Requested by' : 'Sent by'} {t.requestedBy} · {fmtDate(t.requestedAt)} at {fmtTime(t.requestedAt)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Manrope, sans-serif', color: isPull ? '#7c3aed' : 'var(--tertiary)' }}>{t.quantity}</div>
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
                    {isPull && t.status === 'pending' && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>
                        Awaiting admin approval to pull from {t.fromStoreName}
                      </span>
                    )}
                  </div>

                  {/* In-transit timeline */}
                  {t.status === 'in_transit' && (
                    <div style={{ marginTop: '0.75rem', background: 'rgba(0,71,141,0.04)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', border: '1px solid rgba(0,71,141,0.12)' }}>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10b981' }}>check_circle</span>
                          <span style={{ color: 'var(--secondary)' }}>Approved:</span>
                          <strong>{t.approvedAt ? fmtDate(t.approvedAt) : '—'}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#f59e0b' }}>local_shipping</span>
                          <span style={{ color: 'var(--secondary)' }}>Shipped:</span>
                          <strong>{t.shippedAt ? fmtDate(t.shippedAt) : '—'}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>hourglass_empty</span>
                          <span style={{ color: 'var(--secondary)' }}>Awaiting receipt at <strong>{t.toStoreName}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {t.notes && (
                    <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                      "{t.notes}"
                    </div>
                  )}

                  {(t.approvedBy && t.status !== 'in_transit') && (
                    <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4, color: t.status === 'rejected' ? 'var(--error)' : 'var(--tertiary)' }}>
                        {t.status === 'rejected' ? 'cancel' : 'check_circle'}
                      </span>
                      <strong>{t.status === 'rejected' ? 'Rejected' : t.status === 'completed' ? 'Completed' : 'Approved'}</strong> by {t.approvedBy}
                      {t.approvedAt && ` on ${fmtDate(t.approvedAt)}`}
                      {t.receivedByName && ` · Received by ${t.receivedByName}`}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {isAdmin && t.status === 'pending' && (
                      <>
                        <button className="btn btn-sm" style={{ background: '#d1fae5', color: '#065f46', border: 'none' }}
                          onClick={() => { setReviewTransfer(t); setReviewAction('approve'); }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>local_shipping</span>
                          Approve & Dispatch
                        </button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => { setReviewTransfer(t); setReviewAction('reject'); }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                          Reject
                        </button>
                      </>
                    )}
                    {canConfirmReceipt(t) && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleConfirmReceipt(t)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>qr_code_scanner</span>
                        Confirm Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Transfer Modal (Send / Request) ─────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Stock Transfer</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderRadius: '0.625rem', overflow: 'hidden', border: '1.5px solid var(--outline-variant)' }}>
              {([
                { key: 'push' as TransferType, label: 'Send Stock', icon: 'upload', desc: 'Push stock from my store to another' },
                { key: 'pull' as TransferType, label: 'Request Stock', icon: 'download', desc: 'Request stock from another store' },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setModalTab(tab.key)}
                  style={{
                    flex: 1, padding: '0.75rem 1rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: modalTab === tab.key ? (tab.key === 'pull' ? '#7c3aed' : 'var(--primary)') : 'var(--surface-container-low)',
                    color: modalTab === tab.key ? 'white' : 'var(--on-surface-variant)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{tab.label}</span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', opacity: 0.8 }}>{tab.desc}</span>
                </button>
              ))}
            </div>

            {/* ── PUSH Form ── */}
            {modalTab === 'push' && (
              <>
                <div className="form-group">
                  <label className="form-label">Product to Send *</label>
                  <select className="form-select" value={formData.productId}
                    onChange={e => setFormData(f => ({ ...f, productId: e.target.value, quantity: '' }))}>
                    <option value="">Select product from my store...</option>
                    {myProducts.filter(p => p.quantity > 0).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Qty: {p.quantity}) — {p.storeName}</option>
                    ))}
                  </select>
                </div>

                {selectedProduct && (
                  <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div><span style={{ color: 'var(--secondary)' }}>Store: </span><strong>{selectedProduct.storeName}</strong></div>
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
                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                      Workflow: Request → Admin Approval & Dispatch → In-Transit → Confirm Receipt
                    </p>
                  </div>
                )}

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSubmitPush}>Submit Transfer</button>
                </div>
              </>
            )}

            {/* ── PULL Form ── */}
            {modalTab === 'pull' && (
              <>
                <div style={{ background: 'rgba(124,58,237,0.06)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', border: '1px solid rgba(124,58,237,0.2)', fontSize: '0.8125rem', color: '#5b21b6' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>info</span>
                    <span>You are <strong>requesting</strong> stock from another store. An admin will review and approve before the transfer happens.</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Request From (Source Store) *</label>
                  <select className="form-select" value={pullData.fromStoreId}
                    onChange={e => setPullData(f => ({ ...f, fromStoreId: e.target.value, productId: '', quantity: '' }))}>
                    <option value="">Select source store...</option>
                    {availableSources.map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
                    ))}
                  </select>
                </div>

                {pullData.fromStoreId && (
                  <div className="form-group">
                    <label className="form-label">Product to Request *</label>
                    {sourceProducts.length === 0 ? (
                      <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                        No available stock at {pullFromStore?.name}.
                      </div>
                    ) : (
                      <select className="form-select" value={pullData.productId}
                        onChange={e => setPullData(f => ({ ...f, productId: e.target.value, quantity: '' }))}>
                        <option value="">Select product...</option>
                        {sourceProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Available: {p.quantity}) — SKU: {p.sku}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {selectedPullProduct && (
                  <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div><span style={{ color: 'var(--secondary)' }}>Available at source: </span><strong style={{ color: '#7c3aed' }}>{selectedPullProduct.quantity} units</strong></div>
                      <div><span style={{ color: 'var(--secondary)' }}>SKU: </span><code>{selectedPullProduct.sku}</code></div>
                      <div><span style={{ color: 'var(--secondary)' }}>Category: </span><strong>{selectedPullProduct.category}</strong></div>
                    </div>
                  </div>
                )}

                {selectedPullProduct && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Quantity Requested *</label>
                      <input className="form-input" type="number" min="1"
                        max={selectedPullProduct.quantity}
                        value={pullData.quantity}
                        onChange={e => setPullData(f => ({ ...f, quantity: e.target.value }))}
                        placeholder={`1–${selectedPullProduct.quantity}`} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Reason / Notes</label>
                  <input className="form-input" value={pullData.notes}
                    onChange={e => setPullData(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Why do you need this stock? Urgency, low stock situation, etc." />
                </div>

                {selectedPullProduct && pullData.quantity && (
                  <div style={{ background: 'rgba(124,58,237,0.05)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', border: '1px solid rgba(124,58,237,0.2)' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.25rem' }}>Request Summary</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                      Requesting <strong>{pullData.quantity}× {selectedPullProduct.name}</strong> from <strong>{pullFromStore?.name}</strong> → your store
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                      Workflow: Stock Request → Admin Approval → Dispatch from {pullFromStore?.name} → In-Transit → Confirm Receipt
                    </p>
                  </div>
                )}

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} onClick={handleSubmitPull}>
                    Submit Stock Request
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Admin Review Modal ──────────────────────────────────────────────── */}
      {reviewTransfer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReviewTransfer(null)}>
          <div className="confirm-dialog" style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: reviewAction === 'approve' ? '#d1fae5' : 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: reviewAction === 'approve' ? '#065f46' : 'var(--on-error-container)', fontSize: 20 }}>
                  {reviewAction === 'approve' ? 'local_shipping' : 'cancel'}
                </span>
              </div>
              <div>
                <h3>{reviewAction === 'approve' ? 'Approve & Dispatch Transfer' : 'Reject Transfer'}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                  {reviewTransfer.quantity}× {reviewTransfer.productName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem', fontSize: '0.8125rem' }}>
                  <span style={{ fontWeight: 600, background: 'var(--surface-container)', padding: '1px 6px', borderRadius: '0.25rem' }}>{reviewTransfer.fromStoreName}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                  <span style={{ fontWeight: 600, background: 'var(--surface-container)', padding: '1px 6px', borderRadius: '0.25rem' }}>{reviewTransfer.toStoreName}</span>
                  {(reviewTransfer.transferType || 'push') === 'pull' && (
                    <span style={{ fontSize: '0.6875rem', background: 'rgba(124,58,237,0.12)', color: '#7c3aed', padding: '1px 6px', borderRadius: '2rem', fontWeight: 700, marginLeft: 4 }}>
                      Stock Request
                    </span>
                  )}
                </div>
                {reviewAction === 'approve' && (
                  <p style={{ fontSize: '0.8125rem', color: '#065f46', marginTop: '0.375rem', fontWeight: 600 }}>
                    Stock will be deducted from {reviewTransfer.fromStoreName} and marked In-Transit until {reviewTransfer.toStoreName} confirms receipt.
                  </p>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes {reviewAction === 'reject' ? '*' : '(optional)'}</label>
              <input className="form-input" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'approve' ? 'Any dispatch notes...' : 'Reason for rejection...'} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setReviewTransfer(null)}>Cancel</button>
              <button
                className={`btn ${reviewAction === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleReview}
                disabled={reviewAction === 'reject' && !reviewNotes.trim()}
              >
                {reviewAction === 'approve' ? 'Approve & Dispatch' : 'Reject Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
