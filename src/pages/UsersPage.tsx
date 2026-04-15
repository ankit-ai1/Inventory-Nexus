import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { User, UserRole } from '../types';

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  storeId: string;
  status: 'active' | 'inactive';
}

const emptyForm: UserFormData = { name: '', email: '', role: 'store_manager', storeId: '', status: 'active' };

export default function UsersPage() {
  const { users, setUsers, stores, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = filterRole === 'all' || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  const openAdd = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, role: u.role, storeId: u.storeId || '', status: u.status });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      showToast('Name and email are required.', 'error');
      return;
    }
    const store = stores.find(s => s.id === formData.storeId);
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u, ...formData,
        storeName: store?.name || u.storeName,
      } : u));
      showToast('User updated successfully!');
    } else {
      const newUser: User = {
        id: 'u' + Date.now(),
        name: formData.name, email: formData.email,
        role: formData.role, storeId: formData.storeId,
        storeName: store?.name,
        status: formData.status,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setUsers(prev => [newUser, ...prev]);
      showToast('User created successfully!');
    }
    setShowModal(false);
  };

  const handleToggleStatus = (u: User) => {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x));
    showToast(`User ${u.status === 'active' ? 'disabled' : 'enabled'}.`);
  };

  const handleDelete = (u: User) => {
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setDeleteConfirm(null);
    showToast('User deleted.', 'error');
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const avatarColors = ['#00478d', '#00514a', '#515f74', '#7c3aed', '#b45309'];

  return (
    <Layout>
      <TopBar searchPlaceholder="Search users..." onSearch={setSearch} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Team & Access</p>
            <h1>User Management</h1>
            <p>Create users, assign roles, and manage store access.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <span className="material-symbols-outlined">person_add</span>
            Add User
          </button>
        </div>

        {/* Stats row */}
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'rgba(0,71,141,0.08)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>group</span>
            </div>
            <div className="metric-card-value">{users.length}</div>
            <div className="metric-card-label">Total Users</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: '#d1fae5', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#065f46' }}>check_circle</span>
            </div>
            <div className="metric-card-value" style={{ color: '#065f46' }}>{users.filter(u => u.status === 'active').length}</div>
            <div className="metric-card-label">Active Users</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon" style={{ background: 'rgba(0,81,74,0.08)', marginBottom: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>manage_accounts</span>
            </div>
            <div className="metric-card-value" style={{ color: 'var(--tertiary)' }}>{users.filter(u => u.role === 'store_manager').length}</div>
            <div className="metric-card-label">Store Managers</div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-toolbar-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-toolbar-actions">
              <select className="form-select" style={{ minWidth: 140, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="head_admin">Head Admin</option>
                <option value="store_manager">Store Manager</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Assigned Store</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <span className="material-symbols-outlined">group</span>
                        <h3>No users found</h3>
                        <p>Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((u, i) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: avatarColors[i % avatarColors.length],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.6875rem', fontWeight: 800,
                          fontFamily: 'Manrope, sans-serif', flexShrink: 0,
                        }}>{getInitials(u.name)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`chip ${u.role === 'head_admin' ? 'chip-info' : 'chip-neutral'}`}>
                        {u.role === 'head_admin' ? 'Head Admin' : 'Store Manager'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: u.storeName ? 'var(--on-surface)' : 'var(--secondary)' }}>
                      {u.storeName || '—'}
                    </td>
                    <td>
                      <span className={`chip ${u.status === 'active' ? 'chip-success' : 'chip-error'}`}>
                        <span className="status-dot" style={{ background: u.status === 'active' ? '#34d399' : '#ba1a1a' }} />
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{u.createdAt}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} style={{ padding: '0.25rem 0.5rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: '0.25rem 0.5rem', background: u.status === 'active' ? 'var(--amber-container)' : '#d1fae5', color: u.status === 'active' ? 'var(--on-amber)' : '#065f46' }}
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === 'active' ? 'Disable user' : 'Enable user'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            {u.status === 'active' ? 'block' : 'check_circle'}
                          </span>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(u)} style={{ padding: '0.25rem 0.5rem' }}>
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
            <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
              {filtered.length} of {users.length} users
            </span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jordan Patel" />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="email@nexus.com" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={formData.role}
                  onChange={e => setFormData(f => ({ ...f, role: e.target.value as UserRole }))}>
                  <option value="head_admin">Head Admin</option>
                  <option value="store_manager">Store Manager</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Store</label>
                <select className="form-select" value={formData.storeId}
                  onChange={e => setFormData(f => ({ ...f, storeId: e.target.value }))}>
                  <option value="">No store assigned</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={formData.status}
                onChange={e => setFormData(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingUser ? 'Save Changes' : 'Create User'}
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
                <span className="material-symbols-outlined" style={{ color: 'var(--on-error-container)', fontSize: 20 }}>person_remove</span>
              </div>
              <div>
                <h3>Delete User</h3>
                <p style={{ marginTop: '0.25rem' }}>
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will revoke their access.
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
