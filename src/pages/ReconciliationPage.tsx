import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { CycleCount, CycleCountItem, StockAdjustment, AdjustmentReason } from '../types';
import Layout from '../components/Layout';

const SUPABASE_ON = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function agingTier(days: number): { label: string; color: string; bg: string } {
  if (days < 30)  return { label: 'Fresh',   color: '#1a7f4e', bg: '#d1fae5' };
  if (days < 90)  return { label: 'Normal',  color: '#1d6fbd', bg: '#dbeafe' };
  if (days < 180) return { label: 'Aging',   color: '#b45309', bg: '#fef3c7' };
  return               { label: 'Old',     color: '#b91c1c', bg: '#fee2e2' };
}

const REASON_LABELS: Record<AdjustmentReason, string> = {
  damage: 'Damage', theft: 'Theft', counting_error: 'Counting Error',
  expiry: 'Expiry', found: 'Found Extra', other: 'Other',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const {
    currentUser, stores, products,
    cycleCounts, setCycleCounts,
    stockAdjustments, setStockAdjustments,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === 'head_admin';
  const [tab, setTab] = useState<'cycle' | 'adjustments' | 'aging'>('cycle');

  // ── Cycle Counting state ──────────────────────────────────────────────────
  const [ccStoreFilter, setCcStoreFilter] = useState(isAdmin ? '' : currentUser?.storeId ?? '');
  const [ccStatusFilter, setCcStatusFilter] = useState('');
  const [showNewCCModal, setShowNewCCModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [activeCCId, setActiveCCId] = useState<string | null>(null);
  const [countDraft, setCountDraft] = useState<Record<string, string>>({});

  // new CC form
  const [newCCStore, setNewCCStore] = useState(isAdmin ? '' : currentUser?.storeId ?? '');
  const [newCCCat, setNewCCCat] = useState('');
  const [newCCType, setNewCCType] = useState<'full' | 'category' | 'spot'>('category');
  const [newCCDate, setNewCCDate] = useState(new Date().toISOString().slice(0, 10));
  const [newCCPriority, setNewCCPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [newCCAssignee, setNewCCAssignee] = useState('');
  const [newCCNotes, setNewCCNotes] = useState('');
  const [newCCSpotProds, setNewCCSpotProds] = useState<string[]>([]);

  // ── Adjustment state ──────────────────────────────────────────────────────
  const [adjStoreFilter, setAdjStoreFilter] = useState(isAdmin ? '' : currentUser?.storeId ?? '');
  const [adjStatusFilter, setAdjStatusFilter] = useState('');
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjProdId, setAdjProdId] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState<AdjustmentReason>('counting_error');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjStore, setAdjStore] = useState(isAdmin ? '' : currentUser?.storeId ?? '');

  // ── Aging state ───────────────────────────────────────────────────────────
  const [agingStoreFilter, setAgingStoreFilter] = useState(isAdmin ? '' : currentUser?.storeId ?? '');
  const [agingTierFilter, setAgingTierFilter] = useState('');

  // ─── Derived data ─────────────────────────────────────────────────────────

  const visibleStores = useMemo(() =>
    isAdmin ? stores : stores.filter(s => s.id === currentUser?.storeId),
    [isAdmin, stores, currentUser]
  );

  const categories = useMemo(() =>
    [...new Set(products.map(p => p.category))].sort(),
    [products]
  );

  const filteredCCs = useMemo(() => {
    return cycleCounts
      .filter(cc => (!ccStoreFilter || cc.storeId === ccStoreFilter))
      .filter(cc => (!ccStatusFilter || cc.status === ccStatusFilter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [cycleCounts, ccStoreFilter, ccStatusFilter]);

  const filteredAdjs = useMemo(() => {
    return stockAdjustments
      .filter(a => (!adjStoreFilter || a.storeId === adjStoreFilter))
      .filter(a => (!adjStatusFilter || a.status === adjStatusFilter))
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }, [stockAdjustments, adjStoreFilter, adjStatusFilter]);

  const agingProducts = useMemo(() => {
    const base = products
      .filter(p => !agingStoreFilter || p.storeId === agingStoreFilter)
      .map(p => ({ ...p, days: daysSince(p.createdAt), tier: agingTier(daysSince(p.createdAt)) }))
      .sort((a, b) => b.days - a.days);
    if (!agingTierFilter) return base;
    return base.filter(p => p.tier.label === agingTierFilter);
  }, [products, agingStoreFilter, agingTierFilter]);

  const activeCC = cycleCounts.find(cc => cc.id === activeCCId);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleCreateCC() {
    if (!newCCStore) { showToast('Please select a store', 'error'); return; }
    if (newCCType === 'category' && !newCCCat) { showToast('Please select a category', 'error'); return; }
    if (newCCType === 'spot' && newCCSpotProds.length === 0) { showToast('Select at least one product for spot check', 'error'); return; }

    let storeProds;
    if (newCCType === 'full') {
      storeProds = products.filter(p => p.storeId === newCCStore);
    } else if (newCCType === 'category') {
      storeProds = products.filter(p => p.storeId === newCCStore && p.category === newCCCat);
    } else {
      storeProds = products.filter(p => newCCSpotProds.includes(p.id));
    }

    if (storeProds.length === 0) { showToast('No products found for selected criteria', 'error'); return; }

    const storeName = stores.find(s => s.id === newCCStore)?.name ?? '';
    const id = 'cc' + Date.now();
    const num = (cycleCounts.length + 1).toString().padStart(3, '0');
    const categoryLabel = newCCType === 'full' ? 'All' : newCCType === 'spot' ? 'Spot Check' : newCCCat;
    const items = storeProds.map(p => ({
      productId: p.id, productName: p.name, sku: p.sku, category: p.category,
      systemQty: p.quantity, countedQty: null, variance: 0,
    }));

    const newCC: CycleCount = {
      id, ccNumber: `CC-2026-${num}`,
      storeId: newCCStore, storeName, category: categoryLabel,
      status: 'draft',
      items,
      createdBy: newCCAssignee || currentUser!.name, createdById: currentUser!.id,
      createdAt: newCCDate ? new Date(newCCDate).toISOString() : new Date().toISOString(),
      notes: newCCNotes || undefined,
    };

    if (SUPABASE_ON) {
      const { error } = await supabase.from('cycle_counts').insert({
        id: newCC.id, cc_number: newCC.ccNumber, store_id: newCC.storeId, store_name: newCC.storeName,
        category: newCC.category, status: newCC.status, items: JSON.stringify(newCC.items),
        created_by: newCC.createdBy, created_by_id: newCC.createdById,
        created_at: newCC.createdAt, notes: newCC.notes || null,
      });
      if (error) { showToast('Failed to create cycle count: ' + error.message, 'error'); return; }
    }

    setCycleCounts(prev => [newCC, ...prev]);
    showToast(`Cycle count ${newCC.ccNumber} created`);
    setShowNewCCModal(false);
    // reset form
    setNewCCStore(isAdmin ? '' : currentUser?.storeId ?? '');
    setNewCCCat(''); setNewCCType('category'); setNewCCNotes('');
    setNewCCAssignee(''); setNewCCPriority('normal'); setNewCCSpotProds([]);
    setNewCCDate(new Date().toISOString().slice(0, 10));
  }

  function openCountModal(cc: CycleCount) {
    setActiveCCId(cc.id);
    const draft: Record<string, string> = {};
    cc.items.forEach(item => {
      draft[item.productId] = item.countedQty !== null ? String(item.countedQty) : '';
    });
    setCountDraft(draft);
    setShowCountModal(true);
  }

  async function saveCountDraft() {
    if (!activeCC) return;
    let updatedCC: CycleCount | null = null;
    setCycleCounts(prev => prev.map(cc => {
      if (cc.id !== activeCCId) return cc;
      const updatedItems: CycleCountItem[] = cc.items.map(item => {
        const raw = countDraft[item.productId];
        const counted = raw !== '' && raw !== undefined ? Number(raw) : null;
        return { ...item, countedQty: counted, variance: counted !== null ? counted - item.systemQty : 0 };
      });
      const allCounted = updatedItems.every(i => i.countedQty !== null);
      const newStatus = allCounted ? 'in_progress' : cc.status === 'draft' ? 'in_progress' : cc.status;
      const updated = { ...cc, items: updatedItems, status: newStatus as 'draft' | 'in_progress' | 'completed' };
      updatedCC = updated;
      return updated;
    }));
    if (SUPABASE_ON && updatedCC) {
      await supabase.from('cycle_counts').update({
        items: JSON.stringify((updatedCC as CycleCount).items),
        status: (updatedCC as CycleCount).status,
      }).eq('id', activeCCId);
    }
    showToast('Counts saved');
    setShowCountModal(false);
  }

  async function completeCC(ccId: string) {
    const cc = cycleCounts.find(c => c.id === ccId);
    if (!cc) return;
    const allCounted = cc.items.every(i => i.countedQty !== null);
    if (!allCounted) { showToast('Count all items before completing', 'error'); return; }
    const completedAt = new Date().toISOString();
    if (SUPABASE_ON) {
      await supabase.from('cycle_counts').update({ status: 'completed', completed_at: completedAt }).eq('id', ccId);
    }
    setCycleCounts(prev => prev.map(c =>
      c.id === ccId ? { ...c, status: 'completed', completedAt } : c
    ));
    showToast(`${cc.ccNumber} marked complete`);
  }

  async function handleCreateAdj() {
    if (!adjProdId || !adjQty || !adjStore) { showToast('Fill all required fields', 'error'); return; }
    const prod = products.find(p => p.id === adjProdId);
    if (!prod) return;
    const adjusted = Number(adjQty);
    if (adjusted < 0) { showToast('Adjusted quantity cannot be negative', 'error'); return; }
    const storeName = stores.find(s => s.id === adjStore)?.name ?? '';
    const id = 'adj' + Date.now();
    const num = (stockAdjustments.length + 1).toString().padStart(3, '0');
    const newAdj: StockAdjustment = {
      id, adjNumber: `ADJ-2026-${num}`,
      productId: prod.id, productName: prod.name, sku: prod.sku,
      storeId: adjStore, storeName,
      reason: adjReason, systemQty: prod.quantity, adjustedQty: adjusted,
      variance: adjusted - prod.quantity,
      status: 'pending',
      notes: adjNotes || undefined,
      requestedBy: currentUser!.name, requestedById: currentUser!.id,
      requestedAt: new Date().toISOString(),
    };
    if (SUPABASE_ON) {
      const { error } = await supabase.from('stock_adjustments').insert({
        id: newAdj.id, adj_number: newAdj.adjNumber,
        product_id: newAdj.productId, product_name: newAdj.productName, sku: newAdj.sku,
        store_id: newAdj.storeId, store_name: newAdj.storeName,
        reason: newAdj.reason, system_qty: newAdj.systemQty, adjusted_qty: newAdj.adjustedQty,
        variance: newAdj.variance, status: newAdj.status, notes: newAdj.notes || null,
        requested_by: newAdj.requestedBy, requested_by_id: newAdj.requestedById,
        requested_at: newAdj.requestedAt,
      });
      if (error) { showToast('Failed to submit adjustment: ' + error.message, 'error'); return; }
    }
    setStockAdjustments(prev => [newAdj, ...prev]);
    showToast(`Adjustment ${newAdj.adjNumber} submitted for approval`);
    setShowAdjModal(false);
    setAdjProdId(''); setAdjQty(''); setAdjNotes('');
    setAdjReason('counting_error');
  }

  async function reviewAdj(adjId: string, decision: 'approved' | 'rejected') {
    const reviewedAt = new Date().toISOString();
    if (SUPABASE_ON) {
      await supabase.from('stock_adjustments').update({
        status: decision, reviewed_by: currentUser!.name, reviewed_at: reviewedAt,
      }).eq('id', adjId);
    }
    setStockAdjustments(prev => prev.map(a =>
      a.id === adjId
        ? { ...a, status: decision, reviewedBy: currentUser!.name, reviewedAt }
        : a
    ));
    showToast(`Adjustment ${decision}`);
  }

  // ─── Status badge ─────────────────────────────────────────────────────────

  const ccStatusColor = (s: string) => ({
    draft: { color: '#6b7280', bg: '#f3f4f6' },
    in_progress: { color: '#1d6fbd', bg: '#dbeafe' },
    completed: { color: '#1a7f4e', bg: '#d1fae5' },
  }[s] ?? { color: '#6b7280', bg: '#f3f4f6' });

  const adjStatusColor = (s: string) => ({
    pending: { color: '#b45309', bg: '#fef3c7' },
    approved: { color: '#1a7f4e', bg: '#d1fae5' },
    rejected: { color: '#b91c1c', bg: '#fee2e2' },
  }[s] ?? { color: '#6b7280', bg: '#f3f4f6' });

  // ─── Shared tab bar ───────────────────────────────────────────────────────

  const tabs = [
    { key: 'cycle', label: 'Cycle Counting', icon: 'restart_alt' },
    { key: 'adjustments', label: 'Discrepancy Reports', icon: 'tune' },
    { key: 'aging', label: 'Inventory Aging', icon: 'schedule' },
  ] as const;

  return (
    <Layout>
      {/* ── Page header row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 6 }}>Stock Audit</h1>
          <p style={{ color: 'var(--secondary)', margin: 0, fontSize: '0.875rem' }}>
            Cycle counts, stock adjustments, and inventory aging analysis
          </p>
        </div>

        {/* Action button — top-right */}
        <div style={{ flexShrink: 0 }}>
          {tab === 'cycle' && (
            <button
              onClick={() => setShowNewCCModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--primary) 0%, #1a56db 100%)',
                color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(59,130,246,0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(59,130,246,0.35)'; }}
            >
              <span className="material-symbols-outlined filled" style={{ fontSize: 20 }}>add_circle</span>
              New Count
            </button>
          )}
          {tab === 'adjustments' && (
            <button
              onClick={() => setShowAdjModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: '#fff', fontWeight: 600, fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(124,58,237,0.45)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(124,58,237,0.35)'; }}
            >
              <span className="material-symbols-outlined filled" style={{ fontSize: 20 }}>add_circle</span>
              New Adjustment
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar-scroll">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 500, flexShrink: 0,
              color: tab === t.key ? 'var(--primary)' : 'var(--secondary)',
              borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Cycle Counting ── */}
      {tab === 'cycle' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {isAdmin && (
              <select className="form-select" style={{ minWidth: 180 }} value={ccStoreFilter} onChange={e => setCcStoreFilter(e.target.value)}>
                <option value="">All Stores</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select className="form-select" style={{ minWidth: 160 }} value={ccStatusFilter} onChange={e => setCcStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {filteredCCs.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">restart_alt</span>
              <p>No cycle counts found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredCCs.map(cc => {
                const counted = cc.items.filter(i => i.countedQty !== null).length;
                const withVariance = cc.items.filter(i => i.variance !== 0).length;
                const sc = ccStatusColor(cc.status);
                const progress = cc.items.length ? Math.round((counted / cc.items.length) * 100) : 0;
                return (
                  <div key={cc.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{cc.ccNumber}</span>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                            {cc.status.replace('_', ' ')}
                          </span>
                          {withVariance > 0 && (
                            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>
                              {withVariance} variance{withVariance > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--secondary)' }}>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>store</span> {cc.storeName}</span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>category</span> {cc.category}</span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>person</span> {cc.createdBy}</span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>calendar_today</span> {fmtDate(cc.createdAt)}</span>
                          {cc.completedAt && <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>check_circle</span> Done {fmtDate(cc.completedAt)}</span>}
                        </div>

                        {/* Progress bar */}
                        {cc.status !== 'completed' && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--secondary)', marginBottom: 4 }}>
                              <span>Progress: {counted}/{cc.items.length} items counted</span>
                              <span>{progress}%</span>
                            </div>
                            <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        )}

                        {/* Variance summary for completed */}
                        {cc.status === 'completed' && (
                          <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: '0.82rem' }}>
                            <span style={{ color: '#1a7f4e' }}><strong>{cc.items.filter(i => i.variance === 0).length}</strong> matched</span>
                            <span style={{ color: '#b91c1c' }}><strong>{cc.items.filter(i => i.variance < 0).length}</strong> short</span>
                            <span style={{ color: '#b45309' }}><strong>{cc.items.filter(i => i.variance > 0).length}</strong> surplus</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {cc.status !== 'completed' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openCountModal(cc)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
                            {cc.status === 'draft' ? 'Start Count' : 'Enter Counts'}
                          </button>
                        )}
                        {cc.status === 'in_progress' && (
                          <button className="btn btn-primary btn-sm" onClick={() => completeCC(cc.id)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                            Complete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items table (completed) */}
                    {cc.status === 'completed' && cc.items.some(i => i.variance !== 0) && (
                      <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: 8 }}>VARIANCES</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '6px 16px', fontSize: '0.82rem' }}>
                          {['Product', 'System', 'Counted', 'Variance'].map(h => (
                            <span key={h} style={{ fontWeight: 600, color: 'var(--secondary)', fontSize: '0.75rem' }}>{h}</span>
                          ))}
                          {cc.items.filter(i => i.variance !== 0).map(item => (
                            <>
                              <span key={item.productId + 'n'}>{item.productName} <span style={{ color: 'var(--secondary)', fontSize: '0.75rem' }}>{item.sku}</span></span>
                              <span key={item.productId + 's'} style={{ textAlign: 'right' }}>{item.systemQty}</span>
                              <span key={item.productId + 'c'} style={{ textAlign: 'right' }}>{item.countedQty}</span>
                              <span key={item.productId + 'v'} style={{ textAlign: 'right', fontWeight: 700, color: item.variance < 0 ? '#b91c1c' : '#b45309' }}>
                                {item.variance > 0 ? '+' : ''}{item.variance}
                              </span>
                            </>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Discrepancy Adjustments ── */}
      {tab === 'adjustments' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {isAdmin && (
              <select className="form-select" style={{ minWidth: 180 }} value={adjStoreFilter} onChange={e => setAdjStoreFilter(e.target.value)}>
                <option value="">All Stores</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            <select className="form-select" style={{ minWidth: 160 }} value={adjStatusFilter} onChange={e => setAdjStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {filteredAdjs.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">tune</span>
              <p>No adjustments found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredAdjs.map(adj => {
                const sc = adjStatusColor(adj.status);
                return (
                  <div key={adj.id} className="card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700 }}>{adj.adjNumber}</span>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                            {adj.status}
                          </span>
                          <span style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                            background: '#f3f4f6', color: '#374151',
                          }}>
                            {REASON_LABELS[adj.reason]}
                          </span>
                          <span style={{ fontWeight: 700, color: adj.variance < 0 ? '#b91c1c' : adj.variance > 0 ? '#b45309' : '#6b7280', fontSize: '0.875rem' }}>
                            {adj.variance > 0 ? '+' : ''}{adj.variance} units
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{adj.productName} <span style={{ color: 'var(--secondary)', fontWeight: 400, fontSize: '0.82rem' }}>{adj.sku}</span></div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--secondary)' }}>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>store</span> {adj.storeName}</span>
                          <span>System: <strong style={{ color: 'var(--text)' }}>{adj.systemQty}</strong></span>
                          <span>Adjusted: <strong style={{ color: 'var(--text)' }}>{adj.adjustedQty}</strong></span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>person</span> {adj.requestedBy} · {fmtDate(adj.requestedAt)}</span>
                          {adj.reviewedBy && <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>verified</span> {adj.reviewedBy}</span>}
                        </div>
                        {adj.notes && <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--secondary)', fontStyle: 'italic' }}>{adj.notes}</div>}
                      </div>

                      {isAdmin && adj.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" style={{ color: '#b91c1c', borderColor: '#fca5a5' }} onClick={() => reviewAdj(adj.id, 'rejected')}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                            Reject
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => reviewAdj(adj.id, 'approved')}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Inventory Aging ── */}
      {tab === 'aging' && (
        <div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'Fresh', desc: '< 30 days', color: '#1a7f4e', bg: '#d1fae5' },
              { label: 'Normal', desc: '30–90 days', color: '#1d6fbd', bg: '#dbeafe' },
              { label: 'Aging', desc: '90–180 days', color: '#b45309', bg: '#fef3c7' },
              { label: 'Old', desc: '> 180 days', color: '#b91c1c', bg: '#fee2e2' },
            ].map(t => (
              <span
                key={t.label}
                onClick={() => setAgingTierFilter(prev => prev === t.label ? '' : t.label)}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                  background: t.bg, color: t.color, cursor: 'pointer',
                  outline: agingTierFilter === t.label ? `2px solid ${t.color}` : 'none',
                  outlineOffset: 2,
                }}
              >
                {t.label} <span style={{ fontWeight: 400, opacity: 0.8 }}>· {t.desc}</span>
              </span>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              {isAdmin && (
                <select className="form-select" style={{ minWidth: 180 }} value={agingStoreFilter} onChange={e => setAgingStoreFilter(e.target.value)}>
                  <option value="">All Stores</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {agingProducts.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">schedule</span>
              <p>No products found</p>
            </div>
          ) : (
            <div className="table-scroll-wrap" style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: 'var(--border)', textAlign: 'left' }}>
                    {['Product', 'SKU', 'Category', 'Store', 'Qty', 'Age', 'Tier'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.78rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agingProducts.map((p, idx) => (
                    <tr key={p.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--secondary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.sku}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--secondary)' }}>{p.category}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--secondary)' }}>{p.storeName}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>{p.quantity}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: p.days > 180 ? '#b91c1c' : p.days > 90 ? '#b45309' : 'var(--secondary)' }}>
                        {p.days}d
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: p.tier.bg, color: p.tier.color }}>
                          {p.tier.label}
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

      {/* ── Modal: New Cycle Count (Enhanced) ── */}
      {showNewCCModal && (() => {
        // compute preview inside IIFE so it's reactive
        const previewProds = !newCCStore ? [] :
          newCCType === 'full' ? products.filter(p => p.storeId === newCCStore) :
          newCCType === 'category' && newCCCat ? products.filter(p => p.storeId === newCCStore && p.category === newCCCat) :
          newCCType === 'spot' ? products.filter(p => newCCSpotProds.includes(p.id)) : [];

        const storeProdsForSpot = newCCStore ? products.filter(p => p.storeId === newCCStore) : [];

        const priorityColors: Record<string, { color: string; bg: string; border: string }> = {
          normal:  { color: '#1d6fbd', bg: '#eff6ff', border: '#bfdbfe' },
          high:    { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
          urgent:  { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
        };
        const pc = priorityColors[newCCPriority];

        return (
          <div className="modal-overlay" onClick={() => setShowNewCCModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620, width: '95vw' }}>

              {/* Modal header with gradient */}
              <div style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #1a56db 100%)',
                borderRadius: '12px 12px 0 0', padding: '20px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined filled" style={{ color: '#fff', fontSize: 22 }}>restart_alt</span>
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>New Cycle Count</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem' }}>Schedule a physical stock verification</div>
                  </div>
                </div>
                <button onClick={() => setShowNewCCModal(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>

                {/* Section 1 — Count Scope */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Count Scope</span>
                  </div>

                  {/* Store */}
                  <div className="form-group">
                    <label className="form-label">Store <span style={{ color: '#b91c1c' }}>*</span></label>
                    <select className="form-select" value={newCCStore} onChange={e => { setNewCCStore(e.target.value); setNewCCSpotProds([]); }} disabled={!isAdmin}>
                      <option value="">— Select store —</option>
                      {visibleStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {/* Count type cards */}
                  <div className="form-group">
                    <label className="form-label">Count Type <span style={{ color: '#b91c1c' }}>*</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {([
                        { key: 'full',     icon: 'select_all',   title: 'Full Store',   desc: 'Count everything' },
                        { key: 'category', icon: 'category',     title: 'By Category',  desc: 'One category only' },
                        { key: 'spot',     icon: 'search',       title: 'Spot Check',   desc: 'Specific products' },
                      ] as const).map(opt => (
                        <div
                          key={opt.key}
                          onClick={() => { setNewCCType(opt.key); setNewCCCat(''); setNewCCSpotProds([]); }}
                          style={{
                            padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                            border: `2px solid ${newCCType === opt.key ? 'var(--primary)' : 'var(--border)'}`,
                            background: newCCType === opt.key ? '#eff6ff' : 'var(--surface)',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 22, color: newCCType === opt.key ? 'var(--primary)' : 'var(--secondary)', display: 'block', marginBottom: 4 }}>{opt.icon}</span>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: newCCType === opt.key ? 'var(--primary)' : 'var(--text)' }}>{opt.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', marginTop: 2 }}>{opt.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category selector (only for 'category' type) */}
                  {newCCType === 'category' && (
                    <div className="form-group">
                      <label className="form-label">Category <span style={{ color: '#b91c1c' }}>*</span></label>
                      <select className="form-select" value={newCCCat} onChange={e => setNewCCCat(e.target.value)}>
                        <option value="">— Select category —</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Spot check product selector */}
                  {newCCType === 'spot' && newCCStore && (
                    <div className="form-group">
                      <label className="form-label">Select Products <span style={{ color: '#b91c1c' }}>*</span></label>
                      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 180, overflowY: 'auto' }}>
                        {storeProdsForSpot.length === 0 ? (
                          <div style={{ padding: '12px 14px', color: 'var(--secondary)', fontSize: '0.85rem' }}>No products in this store</div>
                        ) : storeProdsForSpot.map(p => (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: newCCSpotProds.includes(p.id) ? '#eff6ff' : 'transparent' }}>
                            <input
                              type="checkbox"
                              checked={newCCSpotProds.includes(p.id)}
                              onChange={e => setNewCCSpotProds(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))}
                              style={{ accentColor: 'var(--primary)', width: 15, height: 15 }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontFamily: 'monospace' }}>{p.sku} · Qty: {p.quantity}</div>
                            </div>
                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 20, background: p.stockStatus === 'in_stock' ? '#d1fae5' : p.stockStatus === 'low_stock' ? '#fef3c7' : '#fee2e2', color: p.stockStatus === 'in_stock' ? '#1a7f4e' : p.stockStatus === 'low_stock' ? '#b45309' : '#b91c1c' }}>
                              {p.stockStatus.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                      {newCCSpotProds.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: '0.8rem', color: 'var(--primary)' }}>{newCCSpotProds.length} product{newCCSpotProds.length > 1 ? 's' : ''} selected</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2 — Schedule & Priority */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>2</div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Schedule & Priority</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Scheduled Date</label>
                      <input type="date" className="form-input" value={newCCDate} onChange={e => setNewCCDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Assigned To</label>
                      <input type="text" className="form-input" value={newCCAssignee} onChange={e => setNewCCAssignee(e.target.value)} placeholder={currentUser?.name ?? 'Name of counter'} />
                    </div>
                  </div>

                  {/* Priority selector */}
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {([
                        { key: 'normal', label: 'Normal', icon: 'radio_button_unchecked' },
                        { key: 'high',   label: 'High',   icon: 'priority_high' },
                        { key: 'urgent', label: 'Urgent', icon: 'warning' },
                      ] as const).map(p => {
                        const pc2 = priorityColors[p.key];
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setNewCCPriority(p.key)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                              border: `2px solid ${newCCPriority === p.key ? pc2.border : 'var(--border)'}`,
                              background: newCCPriority === p.key ? pc2.bg : 'var(--surface)',
                              color: newCCPriority === p.key ? pc2.color : 'var(--secondary)',
                              transition: 'all 0.15s',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{p.icon}</span>
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Instructions / Notes</label>
                    <textarea
                      className="form-input" rows={2} value={newCCNotes}
                      onChange={e => setNewCCNotes(e.target.value)}
                      placeholder="Any specific instructions for the counter, areas to focus on, etc."
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* Section 3 — Live Preview */}
                {previewProds.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a7f4e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>3</div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Preview</span>
                      <span style={{ marginLeft: 'auto', padding: '2px 12px', borderRadius: 20, background: '#d1fae5', color: '#1a7f4e', fontSize: '0.78rem', fontWeight: 700 }}>
                        {previewProds.length} item{previewProds.length !== 1 ? 's' : ''} will be counted
                      </span>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'In Stock', count: previewProds.filter(p => p.stockStatus === 'in_stock').length, color: '#1a7f4e', bg: '#d1fae5' },
                        { label: 'Low Stock', count: previewProds.filter(p => p.stockStatus === 'low_stock').length, color: '#b45309', bg: '#fef3c7' },
                        { label: 'Out of Stock', count: previewProds.filter(p => p.stockStatus === 'out_of_stock').length, color: '#b91c1c', bg: '#fee2e2' },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: s.bg }}>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.count}</div>
                          <div style={{ fontSize: '0.72rem', color: s.color, opacity: 0.8 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Product list */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxHeight: 180, overflowY: 'auto' }}>
                      {previewProds.map((p, idx) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--secondary)', flexShrink: 0 }}>inventory_2</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontFamily: 'monospace' }}>{p.sku}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 700 }}>{p.quantity}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>in system</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state when store not selected */}
                {!newCCStore && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--secondary)', fontSize: '0.85rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8, opacity: 0.4 }}>store</span>
                    Select a store to preview products
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-variant)', borderRadius: '0 0 12px 12px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--secondary)' }}>
                  {previewProds.length > 0
                    ? <><span style={{ color: '#1a7f4e', fontWeight: 600 }}>{previewProds.length} products</span> · {stores.find(s => s.id === newCCStore)?.name}</>
                    : 'Fill in the scope to see a preview'
                  }
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setShowNewCCModal(false)}>Cancel</button>
                  <button
                    onClick={handleCreateCC}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, var(--primary) 0%, #1a56db 100%)',
                      color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                      opacity: previewProds.length === 0 ? 0.5 : 1,
                    }}
                    disabled={previewProds.length === 0}
                  >
                    <span className="material-symbols-outlined filled" style={{ fontSize: 18 }}>add_circle</span>
                    Create Count
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Modal: Enter Counts ── */}
      {showCountModal && activeCC && (
        <div className="modal-overlay" onClick={() => setShowCountModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>Enter Physical Counts — {activeCC.ccNumber}</h3>
              <button className="modal-close" onClick={() => setShowCountModal(false)}>×</button>
            </div>
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ background: 'var(--surface-variant)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--secondary)' }}>
                Enter the physical count for each item. Leave blank for items not yet counted.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: '8px 12px', alignItems: 'center' }}>
                {['Product', 'System', 'Counted', 'Variance'].map(h => (
                  <span key={h} style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'uppercase' }}>{h}</span>
                ))}
                {activeCC.items.map(item => {
                  const counted = countDraft[item.productId];
                  const countedNum = counted !== '' && counted !== undefined ? Number(counted) : null;
                  const variance = countedNum !== null ? countedNum - item.systemQty : null;
                  return (
                    <>
                      <div key={item.productId + 'n'}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontFamily: 'monospace' }}>{item.sku}</div>
                      </div>
                      <span key={item.productId + 's'} style={{ textAlign: 'center', color: 'var(--secondary)' }}>{item.systemQty}</span>
                      <input
                        key={item.productId + 'i'}
                        type="number" min="0"
                        className="form-input"
                        style={{ padding: '6px 8px', textAlign: 'center' }}
                        value={countDraft[item.productId] ?? ''}
                        onChange={e => setCountDraft(prev => ({ ...prev, [item.productId]: e.target.value }))}
                        placeholder="—"
                      />
                      <span key={item.productId + 'v'} style={{
                        textAlign: 'center', fontWeight: 700,
                        color: variance === null ? 'var(--secondary)' : variance === 0 ? '#1a7f4e' : variance < 0 ? '#b91c1c' : '#b45309',
                      }}>
                        {variance === null ? '—' : variance > 0 ? `+${variance}` : variance}
                      </span>
                    </>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCountModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCountDraft}>Save Counts</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: New Adjustment ── */}
      {showAdjModal && (
        <div className="modal-overlay" onClick={() => setShowAdjModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>New Stock Adjustment</h3>
              <button className="modal-close" onClick={() => setShowAdjModal(false)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">Store *</label>
                  <select className="form-select" value={adjStore} onChange={e => { setAdjStore(e.target.value); setAdjProdId(''); }}>
                    <option value="">Select store</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-select" value={adjProdId} onChange={e => setAdjProdId(e.target.value)}>
                  <option value="">Select product</option>
                  {products.filter(p => !adjStore || p.storeId === adjStore).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (System: {p.quantity})</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Actual / Adjusted Qty *</label>
                  <input type="number" min="0" className="form-input" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <select className="form-select" value={adjReason} onChange={e => setAdjReason(e.target.value as AdjustmentReason)}>
                    {(Object.keys(REASON_LABELS) as AdjustmentReason[]).map(r => (
                      <option key={r} value={r}>{REASON_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
              {adjProdId && adjQty && (
                <div style={{ padding: '10px 14px', background: 'var(--surface-variant)', borderRadius: 8, fontSize: '0.85rem', marginBottom: 10 }}>
                  Variance: <strong style={{ color: Number(adjQty) - (products.find(p => p.id === adjProdId)?.quantity ?? 0) < 0 ? '#b91c1c' : '#b45309' }}>
                    {Number(adjQty) - (products.find(p => p.id === adjProdId)?.quantity ?? 0) > 0 ? '+' : ''}
                    {Number(adjQty) - (products.find(p => p.id === adjProdId)?.quantity ?? 0)} units
                  </strong>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={3} value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Reason details, reference ticket, etc." style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdjModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateAdj}>Submit for Approval</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
