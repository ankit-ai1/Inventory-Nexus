import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { PurchaseOrder } from '../types';
import Layout from '../components/Layout';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span
          key={s}
          className={`material-symbols-outlined ${s <= value ? 'filled' : ''}`}
          onClick={() => onChange?.(s)}
          style={{
            fontSize: 18, color: s <= value ? '#f59e0b' : '#d1d5db',
            cursor: onChange ? 'pointer' : 'default',
          }}
        >
          star
        </span>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function VendorIntelligencePage() {
  const {
    currentUser, suppliers, setSuppliers,
    purchaseOrders, setPurchaseOrders,
    leadTimeRecords,
    showToast,
  } = useApp();

  const isAdmin = currentUser?.role === 'head_admin';

  const [tab, setTab] = useState<'scorecard' | 'leadtime' | 'receiving'>('scorecard');

  // ── Scorecard state ───────────────────────────────────────────────────────
  const [supSearch, setSupSearch] = useState('');
  const [supStatusFilter, setSupStatusFilter] = useState('');
  const [editingSupId, setEditingSupId] = useState<string | null>(null);
  const [editDelivery, setEditDelivery] = useState(0);
  const [editQuality, setEditQuality] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  // ── Lead time state ───────────────────────────────────────────────────────
  const [ltSupFilter, setLtSupFilter] = useState('');

  // ── Partial receiving state ───────────────────────────────────────────────
  const [recvPOId, setRecvPOId] = useState<string | null>(null);
  const [recvQtys, setRecvQtys] = useState<Record<string, string>>({});

  // ─── Derived data ─────────────────────────────────────────────────────────

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(s => !supStatusFilter || s.status === supStatusFilter)
      .filter(s => !supSearch || s.name.toLowerCase().includes(supSearch.toLowerCase()) || s.contactPerson.toLowerCase().includes(supSearch.toLowerCase()))
      .sort((a, b) => b.rating - a.rating);
  }, [suppliers, supSearch, supStatusFilter]);

  // Per-supplier aggregates from lead time records
  const supLeadStats = useMemo(() => {
    const stats: Record<string, { totalOrders: number; onTime: number; totalDays: number; completed: number }> = {};
    leadTimeRecords.forEach(r => {
      if (!stats[r.supplierId]) stats[r.supplierId] = { totalOrders: 0, onTime: 0, totalDays: 0, completed: 0 };
      stats[r.supplierId].totalOrders++;
      if (r.status === 'received' && r.leadDays !== undefined) {
        stats[r.supplierId].completed++;
        stats[r.supplierId].totalDays += r.leadDays;
        if (r.leadDays <= r.expectedLeadDays) stats[r.supplierId].onTime++;
      }
    });
    return stats;
  }, [leadTimeRecords]);

  const filteredLTRecords = useMemo(() => {
    return leadTimeRecords
      .filter(r => !ltSupFilter || r.supplierId === ltSupFilter)
      .sort((a, b) => b.orderedAt.localeCompare(a.orderedAt));
  }, [leadTimeRecords, ltSupFilter]);

  // POs eligible for partial receiving: approved or partial, not fully received
  const receivablePOs = useMemo(() => {
    return purchaseOrders.filter(po =>
      (po.status === 'approved' || po.status === 'partial') &&
      po.items.some(item => (item.receivedQty ?? 0) < item.quantity)
    );
  }, [purchaseOrders]);

  const activeRecvPO = purchaseOrders.find(p => p.id === recvPOId);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function openEditSup(supId: string) {
    const sup = suppliers.find(s => s.id === supId);
    if (!sup) return;
    setEditingSupId(supId);
    setEditDelivery(sup.rating);
    setEditQuality(sup.rating);
    setEditNotes(sup.notes ?? '');
  }

  function saveSupRating() {
    if (!editingSupId) return;
    const combined = Math.round((editDelivery + editQuality) / 2) as 1 | 2 | 3 | 4 | 5;
    setSuppliers(prev => prev.map(s =>
      s.id === editingSupId ? { ...s, rating: combined, notes: editNotes } : s
    ));
    showToast('Vendor ratings updated');
    setEditingSupId(null);
  }

  function openReceiving(po: PurchaseOrder) {
    setRecvPOId(po.id);
    const qtys: Record<string, string> = {};
    po.items.forEach((item, idx) => {
      qtys[String(idx)] = '';
    });
    setRecvQtys(qtys);
  }

  function submitReceiving() {
    if (!activeRecvPO) return;
    const updatedItems = activeRecvPO.items.map((item, idx) => {
      const entered = Number(recvQtys[String(idx)] ?? 0);
      const alreadyReceived = item.receivedQty ?? 0;
      const newReceived = Math.min(alreadyReceived + entered, item.quantity);
      return { ...item, receivedQty: newReceived };
    });
    const allReceived = updatedItems.every(i => (i.receivedQty ?? 0) >= i.quantity);
    const newStatus = allReceived ? 'received' as const : 'partial' as const;

    setPurchaseOrders(prev => prev.map(po =>
      po.id === recvPOId
        ? { ...po, items: updatedItems, status: newStatus, receivedAt: allReceived ? new Date().toISOString() : po.receivedAt }
        : po
    ));
    showToast(allReceived ? `PO ${activeRecvPO.poNumber} fully received` : `Partial receipt recorded for ${activeRecvPO.poNumber}`);
    setRecvPOId(null);
    setRecvQtys({});
  }

  // ─── Status chip helpers ──────────────────────────────────────────────────

  const ltStatusColor = (s: string) => ({
    ordered:    { color: '#1d6fbd', bg: '#dbeafe' },
    in_transit: { color: '#7c3aed', bg: '#ede9fe' },
    received:   { color: '#1a7f4e', bg: '#d1fae5' },
    overdue:    { color: '#b91c1c', bg: '#fee2e2' },
  }[s] ?? { color: '#6b7280', bg: '#f3f4f6' });

  const poStatusColor = (s: string) => ({
    approved: { color: '#1a7f4e', bg: '#d1fae5' },
    partial:  { color: '#b45309', bg: '#fef3c7' },
  }[s] ?? { color: '#6b7280', bg: '#f3f4f6' });

  const tabs = [
    { key: 'scorecard', label: 'Vendor Scorecard', icon: 'leaderboard' },
    { key: 'leadtime',  label: 'Lead Time Analytics', icon: 'timeline' },
    { key: 'receiving', label: 'Partial Receiving', icon: 'move_to_inbox' },
  ] as const;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>Vendor & Procurement Intelligence</h1>
          <p style={{ color: 'var(--secondary)', margin: 0, fontSize: '0.875rem' }}>
            Vendor ratings, lead time analytics, and partial receiving workflow
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 500,
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

      {/* ── Tab 1: Vendor Scorecard ── */}
      {tab === 'scorecard' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--secondary)', pointerEvents: 'none' }}>search</span>
              <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search vendors…" value={supSearch} onChange={e => setSupSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ minWidth: 140 }} value={supStatusFilter} onChange={e => setSupStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Summary metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Vendors', value: suppliers.length, icon: 'local_shipping', color: '#1d6fbd' },
              { label: 'Active', value: suppliers.filter(s => s.status === 'active').length, icon: 'check_circle', color: '#1a7f4e' },
              { label: 'Top Rated (★5)', value: suppliers.filter(s => s.rating === 5).length, icon: 'star', color: '#f59e0b' },
              { label: 'On Watchlist', value: suppliers.filter(s => s.status === 'inactive' || s.rating <= 2).length, icon: 'warning', color: '#b91c1c' },
            ].map(m => (
              <div key={m.label} className="metric-card" style={{ padding: '16px 20px' }}>
                <div className="metric-card-icon" style={{ background: m.color + '22', color: m.color }}>
                  <span className="material-symbols-outlined filled" style={{ fontSize: 20 }}>{m.icon}</span>
                </div>
                <div className="metric-card-value">{m.value}</div>
                <div className="metric-card-label">{m.label}</div>
              </div>
            ))}
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">local_shipping</span>
              <p>No vendors found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredSuppliers.map(sup => {
                const stats = supLeadStats[sup.id];
                const avgLead = stats && stats.completed > 0 ? Math.round(stats.totalDays / stats.completed) : null;
                const onTimePct = stats && stats.completed > 0 ? Math.round((stats.onTime / stats.completed) * 100) : null;
                return (
                  <div key={sup.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{sup.name}</span>
                          <span style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                            background: sup.status === 'active' ? '#d1fae5' : '#fee2e2',
                            color: sup.status === 'active' ? '#1a7f4e' : '#b91c1c',
                          }}>
                            {sup.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--secondary)', marginBottom: 10 }}>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>person</span> {sup.contactPerson}</span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>mail</span> {sup.email}</span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>phone</span> {sup.phone}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                          {sup.categories.map(c => (
                            <span key={c} style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', background: 'var(--surface-variant)', color: 'var(--secondary)', border: '1px solid var(--border)' }}>{c}</span>
                          ))}
                        </div>

                        {/* Rating + stats row */}
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', marginBottom: 2 }}>OVERALL RATING</div>
                            <StarRating value={sup.rating} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', marginBottom: 2 }}>TOTAL ORDERS</div>
                            <div style={{ fontWeight: 600 }}>{sup.totalOrders}</div>
                          </div>
                          {avgLead !== null && (
                            <div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', marginBottom: 2 }}>AVG LEAD TIME</div>
                              <div style={{ fontWeight: 600 }}>{avgLead} days</div>
                            </div>
                          )}
                          {onTimePct !== null && (
                            <div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--secondary)', marginBottom: 2 }}>ON-TIME DELIVERY</div>
                              <div style={{ fontWeight: 600, color: onTimePct >= 80 ? '#1a7f4e' : onTimePct >= 60 ? '#b45309' : '#b91c1c' }}>{onTimePct}%</div>
                            </div>
                          )}
                        </div>

                        {sup.notes && (
                          <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--secondary)', fontStyle: 'italic' }}>{sup.notes}</div>
                        )}
                      </div>

                      {isAdmin && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditSup(sup.id)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                          Update Rating
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Lead Time Analytics ── */}
      {tab === 'leadtime' && (
        <div>
          {/* Per-supplier summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            {suppliers.filter(s => supLeadStats[s.id]).map(sup => {
              const stats = supLeadStats[sup.id];
              const avgLead = stats.completed > 0 ? Math.round(stats.totalDays / stats.completed) : null;
              const onTimePct = stats.completed > 0 ? Math.round((stats.onTime / stats.completed) * 100) : null;
              return (
                <div
                  key={sup.id}
                  className="card"
                  style={{ padding: 16, cursor: 'pointer', outline: ltSupFilter === sup.id ? '2px solid var(--primary)' : 'none' }}
                  onClick={() => setLtSupFilter(prev => prev === sup.id ? '' : sup.id)}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>{sup.name}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: 'var(--secondary)', fontSize: '0.72rem' }}>ORDERS</div>
                      <div style={{ fontWeight: 600 }}>{stats.totalOrders}</div>
                    </div>
                    {avgLead !== null && (
                      <div>
                        <div style={{ color: 'var(--secondary)', fontSize: '0.72rem' }}>AVG LEAD</div>
                        <div style={{ fontWeight: 600 }}>{avgLead}d</div>
                      </div>
                    )}
                    {onTimePct !== null && (
                      <div>
                        <div style={{ color: 'var(--secondary)', fontSize: '0.72rem' }}>ON-TIME</div>
                        <div style={{ fontWeight: 600, color: onTimePct >= 80 ? '#1a7f4e' : onTimePct >= 60 ? '#b45309' : '#b91c1c' }}>{onTimePct}%</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {ltSupFilter && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>
                Showing records for: <strong style={{ color: 'var(--text)' }}>{suppliers.find(s => s.id === ltSupFilter)?.name}</strong>
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setLtSupFilter('')}>Clear</button>
            </div>
          )}

          {filteredLTRecords.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">timeline</span>
              <p>No lead time records found</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--border)', textAlign: 'left' }}>
                    {['PO Number', 'Supplier', 'Store', 'Ordered', 'Expected', 'Received', 'Lead Days', 'vs Target', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLTRecords.map((r, idx) => {
                    const sc = ltStatusColor(r.status);
                    const delta = r.leadDays !== undefined ? r.leadDays - r.expectedLeadDays : null;
                    return (
                      <tr key={r.id} style={{ borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.poNumber}</td>
                        <td style={{ padding: '10px 14px' }}>{suppliers.find(s => s.id === r.supplierId)?.name ?? r.supplierName}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--secondary)' }}>{r.storeName}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--secondary)', whiteSpace: 'nowrap' }}>{fmtDate(r.orderedAt)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--secondary)', whiteSpace: 'nowrap' }}>{fmtDate(r.expectedAt)}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--secondary)', whiteSpace: 'nowrap' }}>{r.receivedAt ? fmtDate(r.receivedAt) : '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{r.leadDays !== undefined ? `${r.leadDays}d` : '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: delta === null ? 'var(--secondary)' : delta <= 0 ? '#1a7f4e' : '#b91c1c' }}>
                          {delta === null ? '—' : delta === 0 ? 'On time' : delta < 0 ? `${Math.abs(delta)}d early` : `+${delta}d late`}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Partial Receiving ── */}
      {tab === 'receiving' && (
        <div>
          <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 20, fontSize: '0.875rem', color: '#1d6fbd', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginTop: 1, flexShrink: 0 }}>info</span>
            <span>Record partial or full stock receipts for approved purchase orders. Each item can be received incrementally until the full ordered quantity is met.</span>
          </div>

          {receivablePOs.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined">move_to_inbox</span>
              <p>No approved POs awaiting receipt</p>
              <span style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>All approved POs have been fully received.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {receivablePOs.map(po => {
                const sc = poStatusColor(po.status);
                const totalOrdered = po.items.reduce((s, i) => s + i.quantity, 0);
                const totalReceived = po.items.reduce((s, i) => s + (i.receivedQty ?? 0), 0);
                const pct = totalOrdered ? Math.round((totalReceived / totalOrdered) * 100) : 0;
                return (
                  <div key={po.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700 }}>{po.poNumber}</span>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                            {po.status}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--secondary)' }}>{fmtCurrency(po.totalValue)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--secondary)', marginBottom: 10 }}>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>store</span> {po.storeName}</span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>person</span> {po.requestedBy}</span>
                          <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>calendar_today</span> {fmtDate(po.requestedAt)}</span>
                        </div>

                        {/* Items with received progress */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                          {po.items.map((item, idx) => {
                            const received = item.receivedQty ?? 0;
                            const remaining = item.quantity - received;
                            const itemPct = item.quantity ? Math.round((received / item.quantity) * 100) : 0;
                            return (
                              <div key={idx} style={{ background: 'var(--surface-variant)', borderRadius: 8, padding: '8px 12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                                  <span style={{ fontWeight: 500 }}>{item.productName} <span style={{ color: 'var(--secondary)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{item.sku}</span></span>
                                  <span style={{ color: 'var(--secondary)', fontSize: '0.8rem' }}>
                                    <strong style={{ color: remaining > 0 ? '#b45309' : '#1a7f4e' }}>{received}</strong>/{item.quantity} received
                                    {remaining > 0 && <span style={{ color: '#b91c1c' }}> · {remaining} pending</span>}
                                  </span>
                                </div>
                                <div style={{ background: 'var(--border)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                                  <div style={{ width: `${itemPct}%`, height: '100%', background: itemPct === 100 ? '#1a7f4e' : 'var(--primary)', borderRadius: 4, transition: 'width 0.3s' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Overall progress */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--secondary)', marginBottom: 4 }}>
                          <span>Overall: {totalReceived}/{totalOrdered} units received</span>
                          <span>{pct}%</span>
                        </div>
                        <div style={{ background: 'var(--border)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                      </div>

                      <button className="btn btn-primary btn-sm" onClick={() => openReceiving(po)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>move_to_inbox</span>
                        Record Receipt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Update Vendor Rating ── */}
      {editingSupId && (
        <div className="modal-overlay" onClick={() => setEditingSupId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Update Vendor Rating</h3>
              <button className="modal-close" onClick={() => setEditingSupId(null)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>{suppliers.find(s => s.id === editingSupId)?.name}</div>
              <div className="form-group">
                <label className="form-label">Delivery Performance</label>
                <StarRating value={editDelivery} onChange={setEditDelivery} />
              </div>
              <div className="form-group">
                <label className="form-label">Product Quality</label>
                <StarRating value={editQuality} onChange={setEditQuality} />
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--surface-variant)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--secondary)', marginBottom: 12 }}>
                Combined rating: <strong style={{ color: 'var(--text)' }}>{Math.round((editDelivery + editQuality) / 2)} / 5</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Performance notes, SLA comments…" style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingSupId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSupRating}>Save Rating</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Record Receipt ── */}
      {recvPOId && activeRecvPO && (
        <div className="modal-overlay" onClick={() => setRecvPOId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Record Receipt — {activeRecvPO.poNumber}</h3>
              <button className="modal-close" onClick={() => setRecvPOId(null)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--surface-variant)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--secondary)' }}>
                Enter the quantity received in this delivery. Quantities already received are shown in green.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', gap: '8px 12px', alignItems: 'center' }}>
                {['Product', 'Ordered', 'Received', 'This Batch'].map(h => (
                  <span key={h} style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--secondary)', textTransform: 'uppercase' }}>{h}</span>
                ))}
                {activeRecvPO.items.map((item, idx) => {
                  const received = item.receivedQty ?? 0;
                  const remaining = item.quantity - received;
                  return (
                    <>
                      <div key={idx + 'n'}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontFamily: 'monospace' }}>{item.sku}</div>
                      </div>
                      <span key={idx + 'o'} style={{ textAlign: 'center', color: 'var(--secondary)' }}>{item.quantity}</span>
                      <span key={idx + 'r'} style={{ textAlign: 'center', color: received > 0 ? '#1a7f4e' : 'var(--secondary)', fontWeight: received > 0 ? 600 : 400 }}>{received}</span>
                      <input
                        key={idx + 'i'}
                        type="number" min="0" max={remaining}
                        className="form-input"
                        style={{ padding: '6px 8px', textAlign: 'center' }}
                        value={recvQtys[String(idx)] ?? ''}
                        onChange={e => setRecvQtys(prev => ({ ...prev, [String(idx)]: e.target.value }))}
                        placeholder={`/${remaining}`}
                        disabled={remaining === 0}
                      />
                    </>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRecvPOId(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={submitReceiving}
                disabled={Object.values(recvQtys).every(v => !v || Number(v) === 0)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
