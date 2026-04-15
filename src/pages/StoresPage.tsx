import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { Store } from '../types';

interface StoreFormData {
  name: string;
  location: string;
  managerId: string;
  status: 'active' | 'inactive';
}

const emptyForm: StoreFormData = { name: '', location: '', managerId: '', status: 'active' };

export default function StoresPage() {
  const { stores, setStores, users, products, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Store | null>(null);

  const storeManagers = users.filter(u => u.role === 'store_manager');

  const filtered = useMemo(() => {
    return stores.filter(s => {
      const q = search.toLowerCase();
      return !q || s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q);
    });
  }, [stores, search]);

  const openAdd = () => {
    setEditingStore(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Store) => {
    setEditingStore(s);
    setFormData({ name: s.name, location: s.location, managerId: s.managerId || '', status: s.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.location) {
      showToast('Name and location are required.', 'error');
      return;
    }
    const manager = storeManagers.find(u => u.id === formData.managerId);
    if (editingStore) {
      setStores(prev => prev.map(s => s.id === editingStore.id ? {
        ...s, ...formData,
        managerName: manager?.name || undefined,
        productCount: s.productCount,
      } : s));
      showToast('Store updated successfully!');
    } else {
      const newStore: Store = {
        id: 's' + Date.now(),
        name: formData.name, location: formData.location,
        managerId: formData.managerId || undefined,
        managerName: manager?.name,
        productCount: 0,
        status: formData.status,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setStores(prev => [newStore, ...prev]);
      showToast('Store created successfully!');
    }
    setShowModal(false);
  };

  const handleDelete = (s: Store) => {
    setStores(prev => prev.filter(x => x.id !== s.id));
    setDeleteConfirm(null);
    showToast('Store deleted.', 'error');
  };

  const getProductCount = (storeId: string) => products.filter(p => p.storeId === storeId).length;

  return (
    <Layout>
      <TopBar searchPlaceholder="Search stores..." onSearch={setSearch} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Operations</p>
            <h1>Store Management</h1>
            <p>Create and manage all store locations across your network.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <span className="material-symbols-outlined">add_business</span>
            Add Store
          </button>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'rgba(0,71,141,0.08)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>store</span>
            </div>
            <div className="metric-card-value">{stores.length}</div>
            <div className="metric-card-label">Total Stores</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: '#d1fae5', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#065f46' }}>check_circle</span>
            </div>
            <div className="metric-card-value" style={{ color: '#065f46' }}>{stores.filter(s => s.status === 'active').length}</div>
            <div className="metric-card-label">Active Stores</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'rgba(0,81,74,0.08)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>inventory_2</span>
            </div>
            <div className="metric-card-value" style={{ color: 'var(--tertiary)' }}>{products.length}</div>
            <div className="metric-card-label">Total Products</div>
          </div>
        </div>

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {filtered.map(s => {
            const productCount = getProductCount(s.id);
            return (
              <div key={s.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '0.75rem',
                    background: s.status === 'active' ? 'rgba(0,71,141,0.08)' : 'var(--surface-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: s.status === 'active' ? 'var(--primary)' : 'var(--secondary)' }}>store</span>
                  </div>
                  <span className={`chip ${s.status === 'active' ? 'chip-success' : 'chip-neutral'}`}>
                    <span className="status-dot" style={{ background: s.status === 'active' ? '#34d399' : 'var(--secondary)' }} />
                    {s.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'Manrope, sans-serif', marginBottom: '0.25rem' }}>{s.name}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                  {s.location}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)', marginBottom: 2 }}>Products</p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'Manrope, sans-serif', color: 'var(--primary)' }}>{productCount}</p>
                  </div>
                  <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)', marginBottom: 2 }}>Manager</p>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.managerName || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(s)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteConfirm(s)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Also table view */}
        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-toolbar-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search stores..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Store Name</th>
                  <th>Location</th>
                  <th>Manager</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><span className="material-symbols-outlined">store</span><h3>No stores found</h3></div></td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight: 600 }}>{s.name}</div></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{s.location}</td>
                    <td style={{ fontSize: '0.875rem' }}>{s.managerName || <span style={{ color: 'var(--secondary)' }}>Unassigned</span>}</td>
                    <td style={{ fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>{getProductCount(s.id)}</td>
                    <td>
                      <span className={`chip ${s.status === 'active' ? 'chip-success' : 'chip-neutral'}`}>
                        <span className="status-dot" style={{ background: s.status === 'active' ? '#34d399' : 'var(--secondary)' }} />
                        {s.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{s.createdAt}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)} style={{ padding: '0.25rem 0.5rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(s)} style={{ padding: '0.25rem 0.5rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingStore ? 'Edit Store' : 'Add New Store'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Store Name *</label>
              <input className="form-input" value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Downtown Hub A1" />
            </div>
            <div className="form-group">
              <label className="form-label">Location *</label>
              <input className="form-input" value={formData.location}
                onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Mumbai, Maharashtra" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assign Manager</label>
                <select className="form-select" value={formData.managerId}
                  onChange={e => setFormData(f => ({ ...f, managerId: e.target.value }))}>
                  <option value="">No manager</option>
                  {storeManagers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.status}
                  onChange={e => setFormData(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingStore ? 'Save Changes' : 'Create Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="confirm-dialog">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--error-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--on-error-container)', fontSize: 20 }}>store</span>
              </div>
              <div>
                <h3>Delete Store</h3>
                <p style={{ marginTop: '0.25rem' }}>Delete <strong>{deleteConfirm.name}</strong>? Products in this store will remain.</p>
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
