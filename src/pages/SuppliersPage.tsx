import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { Supplier } from '../types';

interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string;
  status: 'active' | 'inactive';
  rating: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

const emptyForm: SupplierFormData = {
  name: '', contactPerson: '', email: '', phone: '',
  address: '', categories: '', status: 'active', rating: 3, notes: '',
};

const ALL_CATEGORIES = ['Laptops', 'Desktops', 'Monitors', 'Networking', 'Peripherals', 'Power', 'Printers', 'Mini PCs', 'Storage'];

function StarRating({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="material-symbols-outlined filled"
          style={{ fontSize: 14, color: i <= value ? '#f59e0b' : 'var(--surface-container-high)' }}>
          star
        </span>
      ))}
    </div>
  );
}

export default function SuppliersPage() {
  const { suppliers, setSuppliers, showToast, addAuditLog } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.contactPerson.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchCat = filterCategory === 'all' || s.categories.includes(filterCategory);
      return matchSearch && matchStatus && matchCat;
    });
  }, [suppliers, search, filterStatus, filterCategory]);

  const openAdd = () => {
    setEditingSupplier(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name, contactPerson: s.contactPerson, email: s.email,
      phone: s.phone, address: s.address, categories: s.categories.join(', '),
      status: s.status, rating: s.rating, notes: s.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.contactPerson || !formData.email) {
      showToast('Name, contact person, and email are required.', 'error');
      return;
    }
    const cats = formData.categories.split(',').map(c => c.trim()).filter(Boolean);
    if (editingSupplier) {
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? {
        ...s, ...formData, categories: cats, notes: formData.notes || undefined,
      } : s));
      addAuditLog({ action: 'update', module: 'store', entityId: editingSupplier.id, entityName: formData.name, details: `Supplier "${formData.name}" updated.` });
      showToast('Supplier updated successfully!');
    } else {
      const newSupplier: Supplier = {
        id: 'sup' + Date.now(),
        name: formData.name, contactPerson: formData.contactPerson,
        email: formData.email, phone: formData.phone, address: formData.address,
        categories: cats, status: formData.status, rating: formData.rating,
        totalOrders: 0, createdAt: new Date().toISOString().slice(0, 10),
        notes: formData.notes || undefined,
      };
      setSuppliers(prev => [newSupplier, ...prev]);
      addAuditLog({ action: 'create', module: 'store', entityId: newSupplier.id, entityName: newSupplier.name, details: `New supplier "${newSupplier.name}" added.` });
      showToast('Supplier added successfully!');
    }
    setShowModal(false);
  };

  const handleDelete = (s: Supplier) => {
    setSuppliers(prev => prev.filter(x => x.id !== s.id));
    addAuditLog({ action: 'delete', module: 'store', entityId: s.id, entityName: s.name, details: `Supplier "${s.name}" deleted.` });
    setDeleteConfirm(null);
    showToast('Supplier removed.', 'error');
  };

  const handleToggleStatus = (s: Supplier) => {
    const newStatus = s.status === 'active' ? 'inactive' : 'active';
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, status: newStatus } : x));
    showToast(`Supplier ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
  };

  const activeCount = suppliers.filter(s => s.status === 'active').length;
  const avgRating = suppliers.length ? (suppliers.reduce((a, s) => a + s.rating, 0) / suppliers.length).toFixed(1) : '—';
  const totalOrders = suppliers.reduce((a, s) => a + s.totalOrders, 0);

  return (
    <Layout>
      <TopBar searchPlaceholder="Search suppliers..." onSearch={setSearch} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Procurement</p>
            <h1>Supplier Management</h1>
            <p>Manage vendor contacts, categories supplied, and performance ratings.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <span className="material-symbols-outlined">add_business</span>
            Add Supplier
          </button>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'rgba(0,71,141,0.08)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>local_shipping</span>
            </div>
            <div className="metric-card-value">{suppliers.length}</div>
            <div className="metric-card-label">Total Suppliers</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: '#d1fae5', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#065f46' }}>check_circle</span>
            </div>
            <div className="metric-card-value" style={{ color: '#065f46' }}>{activeCount}</div>
            <div className="metric-card-label">Active Suppliers</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: '#fef3c7', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#92400e' }}>star</span>
            </div>
            <div className="metric-card-value" style={{ color: '#92400e' }}>{avgRating}</div>
            <div className="metric-card-label">Avg Rating</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'rgba(0,81,74,0.08)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>receipt_long</span>
            </div>
            <div className="metric-card-value" style={{ color: 'var(--tertiary)' }}>{totalOrders}</div>
            <div className="metric-card-label">Total Orders</div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-toolbar-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-toolbar-actions">
              <select className="form-select" style={{ minWidth: 130, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select className="form-select" style={{ minWidth: 150, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Contact Person</th>
                  <th>Categories</th>
                  <th>Rating</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <span className="material-symbols-outlined">local_shipping</span>
                      <h3>No suppliers found</h3>
                      <p>Try adjusting your search or filters.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{s.email}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{s.contactPerson}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{s.phone}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {s.categories.map(c => (
                          <span key={c} className="chip chip-neutral" style={{ fontSize: '0.6875rem', padding: '0.1rem 0.5rem' }}>{c}</span>
                        ))}
                      </div>
                    </td>
                    <td><StarRating value={s.rating} /></td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 600 }}>{s.totalOrders}</td>
                    <td>
                      <span className={`chip ${s.status === 'active' ? 'chip-success' : 'chip-error'}`}>
                        <span className="status-dot" style={{ background: s.status === 'active' ? '#34d399' : '#ba1a1a' }} />
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setViewSupplier(s)} title="View details">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEdit(s)} title="Edit">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: '0.25rem 0.5rem', background: s.status === 'active' ? 'var(--amber-container)' : '#d1fae5', color: s.status === 'active' ? 'var(--on-amber)' : '#065f46' }}
                          onClick={() => handleToggleStatus(s)}
                          title={s.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{s.status === 'active' ? 'block' : 'check_circle'}</span>
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setDeleteConfirm(s)} title="Delete">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid var(--surface-container)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{filtered.length} of {suppliers.length} suppliers</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input className="form-input" value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. TechSource India" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Person *</label>
                <input className="form-input" value={formData.contactPerson}
                  onChange={e => setFormData(f => ({ ...f, contactPerson: e.target.value }))} placeholder="e.g. Rahul Mehta" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="contact@supplier.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="+91-98200-00000" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={formData.address}
                onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, State" />
            </div>

            <div className="form-group">
              <label className="form-label">Categories Supplied (comma separated)</label>
              <input className="form-input" value={formData.categories}
                onChange={e => setFormData(f => ({ ...f, categories: e.target.value }))}
                placeholder="e.g. Laptops, Desktops, Monitors" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                {ALL_CATEGORIES.map(c => (
                  <button key={c} type="button"
                    style={{
                      fontSize: '0.6875rem', padding: '0.15rem 0.5rem', borderRadius: 999, border: '1px solid var(--outline)',
                      background: formData.categories.includes(c) ? 'var(--primary)' : 'transparent',
                      color: formData.categories.includes(c) ? 'white' : 'var(--secondary)', cursor: 'pointer',
                    }}
                    onClick={() => {
                      const cats = formData.categories.split(',').map(x => x.trim()).filter(Boolean);
                      const updated = cats.includes(c) ? cats.filter(x => x !== c) : [...cats, c];
                      setFormData(f => ({ ...f, categories: updated.join(', ') }));
                    }}>{c}</button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.status}
                  onChange={e => setFormData(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <select className="form-select" value={formData.rating}
                  onChange={e => setFormData(f => ({ ...f, rating: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 }))}>
                  <option value={5}>★★★★★ Excellent</option>
                  <option value={4}>★★★★☆ Good</option>
                  <option value={3}>★★★☆☆ Average</option>
                  <option value={2}>★★☆☆☆ Below Average</option>
                  <option value={1}>★☆☆☆☆ Poor</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes about this supplier..." style={{ resize: 'vertical' }} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingSupplier ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewSupplier && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewSupplier(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Supplier Details</h3>
              <button className="modal-close" onClick={() => setViewSupplier(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface-container)', borderRadius: '0.75rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined filled" style={{ color: 'white', fontSize: 22 }}>local_shipping</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{viewSupplier.name}</div>
                  <StarRating value={viewSupplier.rating} />
                </div>
                <span className={`chip ${viewSupplier.status === 'active' ? 'chip-success' : 'chip-error'}`} style={{ marginLeft: 'auto' }}>
                  {viewSupplier.status}
                </span>
              </div>
              {[
                { icon: 'person', label: 'Contact Person', value: viewSupplier.contactPerson },
                { icon: 'email', label: 'Email', value: viewSupplier.email },
                { icon: 'call', label: 'Phone', value: viewSupplier.phone },
                { icon: 'location_on', label: 'Address', value: viewSupplier.address },
                { icon: 'receipt_long', label: 'Total Orders', value: String(viewSupplier.totalOrders) },
                { icon: 'calendar_today', label: 'Member Since', value: viewSupplier.createdAt },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary)', marginTop: 2 }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{row.label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{row.value || '—'}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary)', marginTop: 2 }}>category</span>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>Categories</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {viewSupplier.categories.map(c => (
                      <span key={c} className="chip chip-neutral" style={{ fontSize: '0.6875rem' }}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>
              {viewSupplier.notes && (
                <div style={{ padding: '0.75rem', background: 'var(--amber-container)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--on-amber)' }}>
                  <strong>Note:</strong> {viewSupplier.notes}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewSupplier(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { setViewSupplier(null); openEdit(viewSupplier); }}>Edit Supplier</button>
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
                <h3>Remove Supplier</h3>
                <p style={{ marginTop: '0.25rem' }}>
                  Are you sure you want to remove <strong>{deleteConfirm.name}</strong>? This cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
