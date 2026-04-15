import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useNavigate } from 'react-router-dom';
import type { Product, StockStatus, WarrantyStatus } from '../types';

const CATEGORIES = ['Desktops', 'Laptops', 'Monitors', 'Networking', 'Peripherals', 'Power', 'Printers', 'Mini PCs', 'Storage'];

function getStockStatus(qty: number): StockStatus {
  if (qty === 0) return 'out_of_stock';
  if (qty <= 10) return 'low_stock';
  return 'in_stock';
}

function getWarrantyStatus(endDate: string): WarrantyStatus {
  const end = new Date(endDate);
  const now = new Date();
  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff <= 30) return 'expiring_soon';
  return 'active';
}

interface ProductFormData {
  name: string; sku: string; category: string;
  quantity: string; price: string;
  warrantyStartDate: string; warrantyEndDate: string;
  storeId: string; notes: string;
}

const emptyForm: ProductFormData = {
  name: '', sku: '', category: 'Laptops', quantity: '',
  price: '', warrantyStartDate: '', warrantyEndDate: '', storeId: '', notes: '',
};

function exportToCSV(products: Product[], filename = 'inventory.csv') {
  const headers = ['Name', 'SKU', 'Category', 'Quantity', 'Price (INR)', 'Stock Status', 'Warranty Start', 'Warranty End', 'Warranty Status', 'Store', 'Added On'];
  const rows = products.map(p => [
    `"${p.name}"`, p.sku, p.category, p.quantity, p.price,
    p.stockStatus === 'in_stock' ? 'In Stock' : p.stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock',
    p.warrantyStartDate, p.warrantyEndDate,
    p.warrantyStatus === 'active' ? 'Active' : p.warrantyStatus === 'expiring_soon' ? 'Expiring Soon' : 'Expired',
    `"${p.storeName}"`, p.createdAt,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryPage() {
  const { currentUser, products, setProducts, stores, showToast, addAuditLog } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'head_admin';

  const [search, setSearch] = useState('');
  const [filterStock, setFilterStock] = useState('all');
  const [filterWarranty, setFilterWarranty] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  const myProducts = isAdmin ? products : products.filter(p => p.storeId === currentUser?.storeId);

  const filtered = useMemo(() => {
    return myProducts.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchStock = filterStock === 'all' || p.stockStatus === filterStock;
      const matchWarranty = filterWarranty === 'all' || p.warrantyStatus === filterWarranty;
      const matchStore = filterStore === 'all' || p.storeId === filterStore;
      return matchSearch && matchStock && matchWarranty && matchStore;
    });
  }, [myProducts, search, filterStock, filterWarranty, filterStore]);

  const openAdd = () => {
    setEditingProduct(null);
    setFormData({ ...emptyForm, storeId: isAdmin ? '' : (currentUser?.storeId || '') });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({ name: p.name, sku: p.sku, category: p.category, quantity: String(p.quantity), price: String(p.price), warrantyStartDate: p.warrantyStartDate, warrantyEndDate: p.warrantyEndDate, storeId: p.storeId, notes: p.notes || '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.sku || !formData.quantity || !formData.price || !formData.storeId) {
      showToast('Please fill all required fields.', 'error');
      return;
    }
    const store = stores.find(s => s.id === formData.storeId);
    const qty = parseInt(formData.quantity);
    const stockStatus = getStockStatus(qty);
    const warrantyStatus = getWarrantyStatus(formData.warrantyEndDate || new Date().toISOString().slice(0, 10));

    if (editingProduct) {
      const changes = [];
      if (editingProduct.quantity !== qty) changes.push({ field: 'Quantity', from: String(editingProduct.quantity), to: String(qty) });
      if (editingProduct.price !== parseFloat(formData.price)) changes.push({ field: 'Price', from: String(editingProduct.price), to: formData.price });
      if (editingProduct.name !== formData.name) changes.push({ field: 'Name', from: editingProduct.name, to: formData.name });

      setProducts(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p, ...formData, quantity: qty, price: parseFloat(formData.price),
        storeName: store?.name || p.storeName, stockStatus, warrantyStatus,
      } : p));
      addAuditLog({ action: 'update', module: 'product', entityId: editingProduct.id, entityName: formData.name, details: `Product updated`, changes });
      showToast('Product updated successfully!');
    } else {
      const newProduct: Product = {
        id: 'p' + Date.now(), name: formData.name, sku: formData.sku, category: formData.category,
        quantity: qty, price: parseFloat(formData.price), warrantyStartDate: formData.warrantyStartDate,
        warrantyEndDate: formData.warrantyEndDate, storeId: formData.storeId,
        storeName: store?.name || '', stockStatus, warrantyStatus,
        createdAt: new Date().toISOString().slice(0, 10), notes: formData.notes,
      };
      setProducts(prev => [newProduct, ...prev]);
      addAuditLog({ action: 'create', module: 'product', entityId: newProduct.id, entityName: newProduct.name, details: `Product added to ${store?.name}` });
      showToast('Product added successfully!');
    }
    setShowModal(false);
  };

  const handleDelete = (p: Product) => {
    setProducts(prev => prev.filter(x => x.id !== p.id));
    addAuditLog({ action: 'delete', module: 'product', entityId: p.id, entityName: p.name, details: `Product deleted from ${p.storeName}` });
    setDeleteConfirm(null);
    showToast('Product deleted.', 'error');
  };

  const stockInfo = (s: string) => {
    if (s === 'in_stock') return { label: 'In Stock', cls: 'chip-success' };
    if (s === 'low_stock') return { label: 'Low Stock', cls: 'chip-warning' };
    return { label: 'Out of Stock', cls: 'chip-error' };
  };

  const warrantyInfo = (s: string) => {
    if (s === 'active') return { label: 'Active', cls: 'chip-success' };
    if (s === 'expiring_soon') return { label: 'Expiring Soon', cls: 'chip-warning' };
    return { label: 'Expired', cls: 'chip-error' };
  };

  const totalValue = filtered.reduce((sum, p) => sum + p.price * p.quantity, 0);

  return (
    <Layout>
      <TopBar searchPlaceholder="Search by product name, SKU..." onSearch={setSearch} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Assets & Stock</p>
            <h1>Inventory</h1>
            <p>Real-time oversight of stock distribution and warranty lifecycle.</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <span className="material-symbols-outlined">add</span>
            Add Product
          </button>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="metric-card" style={{ gridColumn: 'span 2' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Total Stock Value</p>
            <div className="metric-card-value" style={{ color: 'var(--primary)', fontSize: '2rem' }}>
              ₹{(totalValue / 100000).toFixed(2)}L
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--tertiary)', marginTop: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>+12.4% this quarter</span>
            </div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--error)' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Stock Alerts</p>
            <div className="metric-card-value">{myProducts.filter(p => p.stockStatus === 'out_of_stock').length}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: 4 }}>Items at 0 quantity</p>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--tertiary)' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Warranty Watch</p>
            <div className="metric-card-value">{myProducts.filter(p => p.warrantyStatus === 'expiring_soon').length}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: 4 }}>Expiring within 30 days</p>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-toolbar-search">
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="table-toolbar-actions">
              <select className="form-select" style={{ minWidth: 130, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterStock} onChange={e => setFilterStock(e.target.value)}>
                <option value="all">All Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
              <select className="form-select" style={{ minWidth: 150, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterWarranty} onChange={e => setFilterWarranty(e.target.value)}>
                <option value="all">All Warranty</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
              {isAdmin && (
                <select className="form-select" style={{ minWidth: 150, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                  value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                  <option value="all">All Stores</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(filtered, 'inventory-export.csv')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                Export CSV
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Stock Status</th>
                  <th>Warranty End</th>
                  <th>Warranty Status</th>
                  {isAdmin && <th>Store</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 9 : 8}>
                    <div className="empty-state">
                      <span className="material-symbols-outlined">inventory_2</span>
                      <h3>No products found</h3>
                      <p>Try adjusting your search or filters.</p>
                    </div>
                  </td></tr>
                ) : filtered.map(p => {
                  const stock = stockInfo(p.stockStatus);
                  const warranty = warrantyInfo(p.warrantyStatus);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>{p.sku}</div>
                      </td>
                      <td><span className="chip chip-neutral">{p.category}</span></td>
                      <td style={{ fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>{p.quantity}</td>
                      <td style={{ fontWeight: 600 }}>₹{p.price.toLocaleString()}</td>
                      <td><span className={`chip ${stock.cls}`}>{stock.label}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>{p.warrantyEndDate}</td>
                      <td><span className={`chip ${warranty.cls}`}>{warranty.label}</span></td>
                      {isAdmin && <td style={{ fontSize: '0.8125rem' }}>{p.storeName}</td>}
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/inventory/${p.id}`)}
                            style={{ padding: '0.25rem 0.5rem' }} title="View details">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}
                            style={{ padding: '0.25rem 0.5rem' }} title="Edit">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(p)}
                            style={{ padding: '0.25rem 0.5rem' }} title="Delete">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid var(--surface-container)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
              Showing <strong>{filtered.length}</strong> of <strong>{myProducts.length}</strong> products
            </span>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dell OptiPlex 7000" />
              </div>
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="form-input" value={formData.sku}
                  onChange={e => setFormData(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. DOP-7000-X" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" min="0" value={formData.quantity}
                  onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input className="form-input" type="number" min="0" value={formData.price}
                  onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Store *</label>
                <select className="form-select" value={formData.storeId}
                  onChange={e => setFormData(f => ({ ...f, storeId: e.target.value }))} disabled={!isAdmin}>
                  <option value="">Select store...</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Warranty Start Date</label>
                <input className="form-input" type="date" value={formData.warrantyStartDate}
                  onChange={e => setFormData(f => ({ ...f, warrantyStartDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Warranty End Date</label>
                <input className="form-input" type="date" value={formData.warrantyEndDate}
                  onChange={e => setFormData(f => ({ ...f, warrantyEndDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about this product" />
            </div>

            {formData.quantity !== '' && (
              <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)' }}>Stock Status</span>
                  <div style={{ marginTop: 4 }}>
                    <span className={`chip ${stockInfo(getStockStatus(parseInt(formData.quantity) || 0)).cls}`}>
                      {stockInfo(getStockStatus(parseInt(formData.quantity) || 0)).label}
                    </span>
                  </div>
                </div>
                {formData.warrantyEndDate && (
                  <div>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)' }}>Warranty Status</span>
                    <div style={{ marginTop: 4 }}>
                      <span className={`chip ${warrantyInfo(getWarrantyStatus(formData.warrantyEndDate)).cls}`}>
                        {warrantyInfo(getWarrantyStatus(formData.warrantyEndDate)).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingProduct ? 'Save Changes' : 'Add Product'}
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
                <span className="material-symbols-outlined" style={{ color: 'var(--on-error-container)', fontSize: 20 }}>delete</span>
              </div>
              <div>
                <h3>Delete Product</h3>
                <p style={{ marginTop: '0.25rem' }}>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
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
