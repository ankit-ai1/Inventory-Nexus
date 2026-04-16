import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { MaintenanceLog, MaintenanceType, MaintenanceStatus } from '../types';

const SUPABASE_ON = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

interface MaintenanceFormData {
  productId: string;
  type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  cost: string;
  scheduledDate: string;
  completedDate: string;
  technician: string;
  notes: string;
}

const emptyForm: MaintenanceFormData = {
  productId: '', type: 'preventive', description: '', status: 'scheduled',
  cost: '', scheduledDate: '', completedDate: '', technician: '', notes: '',
};

const TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  warranty_claim: 'Warranty Claim',
  inspection: 'Inspection',
};

const TYPE_COLORS: Record<MaintenanceType, { bg: string; color: string }> = {
  preventive: { bg: '#dbeafe', color: '#1e40af' },
  corrective: { bg: '#fee2e2', color: '#991b1b' },
  warranty_claim: { bg: '#fef3c7', color: '#92400e' },
  inspection: { bg: '#d1fae5', color: '#065f46' },
};

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  scheduled: 'chip-info',
  in_progress: 'chip-warning',
  completed: 'chip-success',
  cancelled: 'chip-error',
};

export default function MaintenancePage() {
  const { maintenanceLogs, setMaintenanceLogs, products, stores, currentUser, showToast, addAuditLog } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [formData, setFormData] = useState<MaintenanceFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<MaintenanceLog | null>(null);
  const [viewLog, setViewLog] = useState<MaintenanceLog | null>(null);

  const isAdmin = currentUser?.role === 'head_admin';

  const visibleProducts = isAdmin ? products : products.filter(p => p.storeId === currentUser?.storeId);

  const filtered = useMemo(() => {
    const logs = isAdmin ? maintenanceLogs : maintenanceLogs.filter(l => l.storeId === currentUser?.storeId);
    return logs.filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.productName.toLowerCase().includes(q) || l.technician.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
      const matchType = filterType === 'all' || l.type === filterType;
      const matchStatus = filterStatus === 'all' || l.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [maintenanceLogs, search, filterType, filterStatus, isAdmin, currentUser]);

  const openAdd = () => {
    setEditingLog(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (l: MaintenanceLog) => {
    setEditingLog(l);
    setFormData({
      productId: l.productId, type: l.type, description: l.description,
      status: l.status, cost: l.cost != null ? String(l.cost) : '',
      scheduledDate: l.scheduledDate, completedDate: l.completedDate || '',
      technician: l.technician, notes: l.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.productId || !formData.description || !formData.scheduledDate || !formData.technician) {
      showToast('Product, description, date and technician are required.', 'error');
      return;
    }
    const product = products.find(p => p.id === formData.productId);
    const store = stores.find(s => s.id === product?.storeId);
    if (editingLog) {
      if (SUPABASE_ON) {
        const { error } = await supabase.from('maintenance_logs').update({
          product_id: formData.productId,
          product_name: product?.name || editingLog.productName,
          sku: product?.sku || editingLog.sku,
          store_id: product?.storeId || editingLog.storeId,
          store_name: store?.name || editingLog.storeName,
          type: formData.type, description: formData.description,
          status: formData.status,
          cost: formData.cost ? Number(formData.cost) : null,
          scheduled_date: formData.scheduledDate,
          completed_date: formData.completedDate || null,
          technician: formData.technician,
          notes: formData.notes || null,
        }).eq('id', editingLog.id);
        if (error) { showToast('Failed to update maintenance log.', 'error'); return; }
      }
      setMaintenanceLogs(prev => prev.map(l => l.id === editingLog.id ? {
        ...l, ...formData,
        cost: formData.cost ? Number(formData.cost) : undefined,
        completedDate: formData.completedDate || undefined,
        notes: formData.notes || undefined,
        productName: product?.name || l.productName,
        sku: product?.sku || l.sku,
        storeId: product?.storeId || l.storeId,
        storeName: store?.name || l.storeName,
      } : l));
      addAuditLog({ action: 'update', module: 'product', entityId: editingLog.id, entityName: editingLog.productName, details: `Maintenance log updated for "${editingLog.productName}".` });
      showToast('Maintenance log updated!');
    } else {
      const newLog: MaintenanceLog = {
        id: 'ml' + Date.now(),
        productId: formData.productId,
        productName: product?.name || '',
        sku: product?.sku || '',
        storeId: product?.storeId || '',
        storeName: store?.name || '',
        type: formData.type, description: formData.description,
        status: formData.status,
        cost: formData.cost ? Number(formData.cost) : undefined,
        scheduledDate: formData.scheduledDate,
        completedDate: formData.completedDate || undefined,
        technician: formData.technician,
        createdBy: currentUser?.name || '',
        createdAt: new Date().toISOString().slice(0, 10),
        notes: formData.notes || undefined,
      };
      if (SUPABASE_ON) {
        const { error } = await supabase.from('maintenance_logs').insert({
          id: newLog.id, product_id: newLog.productId, product_name: newLog.productName,
          sku: newLog.sku, store_id: newLog.storeId, store_name: newLog.storeName,
          type: newLog.type, description: newLog.description, status: newLog.status,
          cost: newLog.cost ?? null, scheduled_date: newLog.scheduledDate,
          completed_date: newLog.completedDate || null, technician: newLog.technician,
          created_by: newLog.createdBy, created_at: newLog.createdAt, notes: newLog.notes || null,
        });
        if (error) { showToast('Failed to create maintenance log: ' + error.message, 'error'); return; }
      }
      setMaintenanceLogs(prev => [newLog, ...prev]);
      addAuditLog({ action: 'create', module: 'product', entityId: newLog.id, entityName: newLog.productName, details: `Maintenance log created for "${newLog.productName}".` });
      showToast('Maintenance log created!');
    }
    setShowModal(false);
  };

  const handleDelete = async (l: MaintenanceLog) => {
    if (SUPABASE_ON) {
      const { error } = await supabase.from('maintenance_logs').delete().eq('id', l.id);
      if (error) { showToast('Failed to delete maintenance log.', 'error'); setDeleteConfirm(null); return; }
    }
    setMaintenanceLogs(prev => prev.filter(x => x.id !== l.id));
    addAuditLog({ action: 'delete', module: 'product', entityId: l.id, entityName: l.productName, details: `Maintenance log deleted for "${l.productName}".` });
    setDeleteConfirm(null);
    showToast('Maintenance log removed.', 'error');
  };

  const allLogs = isAdmin ? maintenanceLogs : maintenanceLogs.filter(l => l.storeId === currentUser?.storeId);
  const scheduled = allLogs.filter(l => l.status === 'scheduled').length;
  const inProgress = allLogs.filter(l => l.status === 'in_progress').length;
  const completed = allLogs.filter(l => l.status === 'completed').length;
  const totalCost = allLogs.reduce((a, l) => a + (l.cost || 0), 0);

  return (
    <Layout>
      <TopBar searchPlaceholder="Search maintenance logs..." onSearch={setSearch} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Asset Health</p>
            <h1>Maintenance Log</h1>
            <p>Track preventive, corrective maintenance, and warranty claims across all assets.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <span className="material-symbols-outlined">build</span>
            Log Maintenance
          </button>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: '#dbeafe', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#1e40af' }}>event</span>
            </div>
            <div className="metric-card-value" style={{ color: '#1e40af' }}>{scheduled}</div>
            <div className="metric-card-label">Scheduled</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'var(--amber-container)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-amber)' }}>sync</span>
            </div>
            <div className="metric-card-value" style={{ color: 'var(--on-amber)' }}>{inProgress}</div>
            <div className="metric-card-label">In Progress</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: '#d1fae5', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#065f46' }}>task_alt</span>
            </div>
            <div className="metric-card-value" style={{ color: '#065f46' }}>{completed}</div>
            <div className="metric-card-label">Completed</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'rgba(0,71,141,0.08)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>currency_rupee</span>
            </div>
            <div className="metric-card-value">₹{totalCost.toLocaleString('en-IN')}</div>
            <div className="metric-card-label">Total Cost</div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-toolbar-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search by product, technician..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-toolbar-actions">
              <select className="form-select" style={{ minWidth: 150, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                {(Object.keys(TYPE_LABELS) as MaintenanceType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
              <select className="form-select" style={{ minWidth: 150, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                {(Object.keys(STATUS_LABELS) as MaintenanceStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Store</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Technician</th>
                  <th>Scheduled</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9}>
                    <div className="empty-state">
                      <span className="material-symbols-outlined">build</span>
                      <h3>No maintenance logs found</h3>
                      <p>Start by logging a maintenance task for a product.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.productName}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{l.sku}</div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{l.storeName}</td>
                    <td>
                      <span className="chip" style={{ background: TYPE_COLORS[l.type].bg, color: TYPE_COLORS[l.type].color, fontSize: '0.6875rem' }}>
                        {TYPE_LABELS[l.type]}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.description}>
                        {l.description}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{l.technician}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{l.scheduledDate}</td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {l.cost != null ? `₹${l.cost.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td>
                      <span className={`chip ${STATUS_COLORS[l.status]}`} style={{ fontSize: '0.6875rem' }}>
                        {STATUS_LABELS[l.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setViewLog(l)} title="View">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEdit(l)} title="Edit">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                        {isAdmin && (
                          <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setDeleteConfirm(l)} title="Delete">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid var(--surface-container)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{filtered.length} of {allLogs.length} records</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>{editingLog ? 'Edit Maintenance Log' : 'Log New Maintenance'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-select" value={formData.productId}
                onChange={e => setFormData(f => ({ ...f, productId: e.target.value }))}>
                <option value="">Select a product...</option>
                {visibleProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.storeName}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Maintenance Type *</label>
                <select className="form-select" value={formData.type}
                  onChange={e => setFormData(f => ({ ...f, type: e.target.value as MaintenanceType }))}>
                  {(Object.keys(TYPE_LABELS) as MaintenanceType[]).map(t => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select className="form-select" value={formData.status}
                  onChange={e => setFormData(f => ({ ...f, status: e.target.value as MaintenanceStatus }))}>
                  {(Object.keys(STATUS_LABELS) as MaintenanceStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-input" rows={2} value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the maintenance work..." style={{ resize: 'vertical' }} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Technician / Service Provider *</label>
                <input className="form-input" value={formData.technician}
                  onChange={e => setFormData(f => ({ ...f, technician: e.target.value }))}
                  placeholder="e.g. In-house IT Team" />
              </div>
              <div className="form-group">
                <label className="form-label">Cost (₹)</label>
                <input className="form-input" type="number" min={0} value={formData.cost}
                  onChange={e => setFormData(f => ({ ...f, cost: e.target.value }))}
                  placeholder="0 for warranty / no cost" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Scheduled Date *</label>
                <input className="form-input" type="date" value={formData.scheduledDate}
                  onChange={e => setFormData(f => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Completed Date</label>
                <input className="form-input" type="date" value={formData.completedDate}
                  onChange={e => setFormData(f => ({ ...f, completedDate: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional additional notes..." style={{ resize: 'vertical' }} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingLog ? 'Save Changes' : 'Create Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewLog && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewLog(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Maintenance Details</h3>
              <button className="modal-close" onClick={() => setViewLog(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '1rem', background: 'var(--surface-container)', borderRadius: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: TYPE_COLORS[viewLog.type].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: TYPE_COLORS[viewLog.type].color, fontSize: 20 }}>build</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{viewLog.productName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{viewLog.sku} · {viewLog.storeName}</div>
                </div>
                <span className={`chip ${STATUS_COLORS[viewLog.status]}`}>{STATUS_LABELS[viewLog.status]}</span>
              </div>
              {[
                { icon: 'category', label: 'Type', value: TYPE_LABELS[viewLog.type] },
                { icon: 'description', label: 'Description', value: viewLog.description },
                { icon: 'engineering', label: 'Technician', value: viewLog.technician },
                { icon: 'event', label: 'Scheduled Date', value: viewLog.scheduledDate },
                { icon: 'task_alt', label: 'Completed Date', value: viewLog.completedDate || '—' },
                { icon: 'currency_rupee', label: 'Cost', value: viewLog.cost != null ? `₹${viewLog.cost.toLocaleString('en-IN')}` : 'No cost / Warranty' },
                { icon: 'person', label: 'Logged By', value: viewLog.createdBy },
                { icon: 'calendar_today', label: 'Logged On', value: viewLog.createdAt },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary)', marginTop: 2 }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{row.label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{row.value}</div>
                  </div>
                </div>
              ))}
              {viewLog.notes && (
                <div style={{ padding: '0.75rem', background: 'var(--amber-container)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--on-amber)' }}>
                  <strong>Note:</strong> {viewLog.notes}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewLog(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setViewLog(null); openEdit(viewLog); }}>Edit Log</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="confirm-dialog">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--on-error-container)', fontSize: 20 }}>delete</span>
              </div>
              <div>
                <h3>Delete Maintenance Log</h3>
                <p style={{ marginTop: '0.25rem' }}>
                  Delete the maintenance record for <strong>{deleteConfirm.productName}</strong>? This cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
