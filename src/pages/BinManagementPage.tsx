import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type { Bin, StockBatch, BinStatus } from '../types';

const CATEGORIES = ['Desktops', 'Laptops', 'Monitors', 'Networking', 'Peripherals', 'Power', 'Printers', 'Mini PCs', 'Storage'];

const BIN_STATUS_INFO: Record<BinStatus, { label: string; cls: string; color: string; bg: string; icon: string }> = {
  empty:       { label: 'Empty',       cls: 'chip-neutral',  color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: 'check_box_outline_blank' },
  occupied:    { label: 'Occupied',    cls: 'chip-success',  color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: 'inventory_2' },
  reserved:    { label: 'Reserved',    cls: 'chip-info',     color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: 'lock' },
  maintenance: { label: 'Maintenance', cls: 'chip-error',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: 'construction' },
};

function makeBinCode(zone: string, aisle: string, rack: string) {
  const z = zone.trim().toUpperCase();
  const a = aisle.trim().padStart(2, '0');
  const r = rack.trim().toUpperCase().startsWith('R') ? rack.trim().toUpperCase() : 'R' + rack.trim();
  return `${z}-${a}-${r}`;
}

function FEFOBadge({ expiryDate }: { expiryDate: string }) {
  const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0)  return <span className="chip chip-error"   style={{ fontSize: '0.7rem' }}>Expired</span>;
  if (days < 90) return <span className="chip chip-warning" style={{ fontSize: '0.7rem' }}>Expires in {days}d</span>;
  return              <span className="chip chip-success"  style={{ fontSize: '0.7rem' }}>{days}d left</span>;
}

// ─── Zone Map cell ────────────────────────────────────────────────────────────
function BinCell({ bin, onClick }: { bin: Bin; onClick: () => void }) {
  const si = BIN_STATUS_INFO[bin.status];
  return (
    <div
      title={`${bin.binCode} — ${si.label}${bin.productName ? '\n' + bin.productName : ''}`}
      onClick={onClick}
      style={{
        width: 64, minHeight: 52, borderRadius: '0.5rem', background: si.bg,
        border: `1.5px solid ${si.color}`, cursor: 'pointer', padding: '4px 6px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.1s, box-shadow 0.1s', gap: 2,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.06)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: si.color }}>{si.icon}</span>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, fontFamily: 'monospace', color: si.color, lineHeight: 1.2, textAlign: 'center' }}>{bin.rack}</span>
      {bin.currentQty > 0 && (
        <span style={{ fontSize: '0.55rem', color: si.color, opacity: 0.8 }}>{bin.currentQty}u</span>
      )}
    </div>
  );
}

export default function BinManagementPage() {
  const { bins, setBins, batches, setBatches, stores, products, currentUser, showToast, addAuditLog } = useApp();
  const isAdmin = currentUser?.role === 'head_admin';

  // ─── Tab & filter state ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'bins' | 'zonemap' | 'fefo' | 'qr'>('bins');
  const [filterStore, setFilterStore]   = useState(isAdmin ? 'all' : (currentUser?.storeId || 'all'));
  const [filterStatus, setFilterStatus] = useState<BinStatus | 'all'>('all');
  const [filterZone, setFilterZone]     = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [attentionDismissed, setAttentionDismissed] = useState(false);

  // ─── Assign product ───────────────────────────────────────────────────────
  const [selectedBin, setSelectedBin]     = useState<Bin | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBin, setAssignBin]   = useState<Bin | null>(null);
  const [assignProductId, setAssignProductId] = useState('');
  const [assignQty, setAssignQty] = useState('');

  // ─── Move stock ───────────────────────────────────────────────────────────
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveSrcBin, setMoveSrcBin] = useState<Bin | null>(null);
  const [moveDestBinId, setMoveDestBinId] = useState('');
  const [moveQty, setMoveQty] = useState('');

  // ─── FEFO filters ─────────────────────────────────────────────────────────
  const [fefoProductFilter, setFefoProductFilter] = useState('all');
  const [fefoStoreFilter, setFefoStoreFilter] = useState(isAdmin ? 'all' : (currentUser?.storeId || 'all'));

  // ─── QR mode ──────────────────────────────────────────────────────────────
  const [qrMode, setQrMode] = useState<'bin' | 'batch'>('bin');

  // ─── Add single bin modal ─────────────────────────────────────────────────
  const [showAddBin, setShowAddBin] = useState(false);
  const [newBin, setNewBin] = useState({
    storeId: isAdmin ? '' : (currentUser?.storeId || ''),
    zone: '', aisle: '', rack: '', capacity: '', preferredCategory: '',
  });
  const newBinCode = newBin.zone && newBin.aisle && newBin.rack
    ? makeBinCode(newBin.zone, newBin.aisle, newBin.rack) : '';

  const newBinDuplicate = useMemo(() => {
    if (!newBinCode || !newBin.storeId) return false;
    return bins.some(b => b.storeId === newBin.storeId && b.binCode === newBinCode);
  }, [bins, newBinCode, newBin.storeId]);

  // ─── Bulk zone setup modal ────────────────────────────────────────────────
  const [showBulkZone, setShowBulkZone] = useState(false);
  const [bulk, setBulk] = useState({
    storeId: isAdmin ? '' : (currentUser?.storeId || ''),
    zone: '', aisles: '2', racksPerAisle: '3',
    capacity: '30', preferredCategory: '',
  });

  const bulkPreview = useMemo(() => {
    const aisleCount  = parseInt(bulk.aisles)  || 0;
    const rackCount   = parseInt(bulk.racksPerAisle) || 0;
    if (!bulk.zone || aisleCount < 1 || rackCount < 1 || !bulk.storeId) return [];
    const items: { binCode: string; duplicate: boolean }[] = [];
    for (let a = 1; a <= aisleCount; a++) {
      for (let r = 1; r <= rackCount; r++) {
        const code = makeBinCode(bulk.zone, String(a), String(r));
        const dup  = bins.some(b => b.storeId === bulk.storeId && b.binCode === code);
        items.push({ binCode: code, duplicate: dup });
      }
    }
    return items;
  }, [bulk, bins]);

  const bulkDuplicateCount = bulkPreview.filter(p => p.duplicate).length;
  const bulkNewCount       = bulkPreview.filter(p => !p.duplicate).length;

  // ─── Derived data ─────────────────────────────────────────────────────────
  const visibleBins = useMemo(() => bins.filter(b => {
    if (!isAdmin && b.storeId !== currentUser?.storeId) return false;
    if (filterStore !== 'all' && b.storeId !== filterStore) return false;
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (filterZone !== 'all' && b.zone !== filterZone) return false;
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      return (b.productName?.toLowerCase().includes(q) || b.binCode.toLowerCase().includes(q));
    }
    return true;
  }), [bins, filterStore, filterStatus, filterZone, productSearch, isAdmin, currentUser]);

  // ─── Attention items ──────────────────────────────────────────────────────
  const attentionItems = useMemo(() => {
    const scopedBins = isAdmin
      ? (filterStore === 'all' ? bins : bins.filter(b => b.storeId === filterStore))
      : bins.filter(b => b.storeId === currentUser?.storeId);
    return {
      nearFull:    scopedBins.filter(b => b.capacity > 0 && (b.currentQty / b.capacity) >= 0.85 && b.status === 'occupied'),
      maintenance: scopedBins.filter(b => b.status === 'maintenance'),
      overCapacity: scopedBins.filter(b => b.capacity > 0 && b.currentQty > b.capacity),
    };
  }, [bins, filterStore, isAdmin, currentUser]);

  const hasAttention = !attentionDismissed && (
    attentionItems.nearFull.length > 0 ||
    attentionItems.maintenance.length > 0 ||
    attentionItems.overCapacity.length > 0
  );

  const allZones = useMemo(() => {
    const scopedBins = isAdmin
      ? (filterStore === 'all' ? bins : bins.filter(b => b.storeId === filterStore))
      : bins.filter(b => b.storeId === currentUser?.storeId);
    return [...new Set(scopedBins.map(b => b.zone))].sort();
  }, [bins, filterStore, isAdmin, currentUser]);

  const stats = useMemo(() => ({
    total:    visibleBins.length,
    occupied: visibleBins.filter(b => b.status === 'occupied').length,
    empty:    visibleBins.filter(b => b.status === 'empty').length,
    utilization: visibleBins.length > 0
      ? Math.round((visibleBins.reduce((s, b) => s + b.currentQty, 0) /
                    Math.max(1, visibleBins.reduce((s, b) => s + b.capacity, 0))) * 100)
      : 0,
  }), [visibleBins]);

  // Zone map grouped data
  const zoneMapStore = useMemo(() => {
    const storeBins = isAdmin
      ? (filterStore === 'all' ? bins : bins.filter(b => b.storeId === filterStore))
      : bins.filter(b => b.storeId === currentUser?.storeId);
    const map: Record<string, Record<string, Bin[]>> = {};
    storeBins.forEach(b => {
      if (!map[b.zone]) map[b.zone] = {};
      if (!map[b.zone][b.aisle]) map[b.zone][b.aisle] = [];
      map[b.zone][b.aisle].push(b);
    });
    // Sort racks within each aisle
    Object.values(map).forEach(aisles =>
      Object.values(aisles).forEach(racks =>
        racks.sort((a, b) => a.rack.localeCompare(b.rack, undefined, { numeric: true }))));
    return map;
  }, [bins, filterStore, isAdmin, currentUser]);

  // FEFO
  const fefoProducts = useMemo(() => {
    const ids = [...new Set(batches.map(b => b.productId))];
    return ids.map(id => batches.find(b => b.productId === id)!);
  }, [batches]);

  const fefoVisible = useMemo(() =>
    batches
      .filter(b => {
        if (!isAdmin && b.storeId !== currentUser?.storeId) return false;
        if (fefoStoreFilter !== 'all' && b.storeId !== fefoStoreFilter) return false;
        if (fefoProductFilter !== 'all' && b.productId !== fefoProductFilter) return false;
        return b.status !== 'depleted';
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    [batches, fefoProductFilter, fefoStoreFilter, isAdmin, currentUser]);

  const fefoGroups = useMemo(() => {
    const g: Record<string, StockBatch[]> = {};
    fefoVisible.forEach(b => { if (!g[b.productId]) g[b.productId] = []; g[b.productId].push(b); });
    return g;
  }, [fefoVisible]);

  const qrStoreBins    = useMemo(() => bins.filter(b => isAdmin ? true : b.storeId === currentUser?.storeId), [bins, isAdmin, currentUser]);
  const qrStoreBatches = useMemo(() => batches.filter(b => isAdmin ? true : b.storeId === currentUser?.storeId), [batches, isAdmin, currentUser]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddBin = () => {
    if (!newBin.storeId || !newBin.zone || !newBin.aisle || !newBin.rack || !newBin.capacity) {
      showToast('Please fill all required fields.', 'error'); return;
    }
    if (newBinDuplicate) { showToast(`Bin ${newBinCode} already exists in this store.`, 'error'); return; }
    const cap = parseInt(newBin.capacity);
    if (cap < 1 || cap > 9999) { showToast('Capacity must be between 1 and 9999.', 'error'); return; }
    const store = stores.find(s => s.id === newBin.storeId);
    const bin: Bin = {
      id: 'b' + Date.now(),
      binCode: newBinCode,
      zone: newBin.zone.trim().toUpperCase(),
      aisle: newBin.aisle.trim().padStart(2, '0'),
      rack: newBin.rack.trim().toUpperCase().startsWith('R') ? newBin.rack.trim().toUpperCase() : 'R' + newBin.rack.trim().toUpperCase(),
      storeId: newBin.storeId,
      storeName: store?.name || '',
      preferredCategory: newBin.preferredCategory || undefined,
      capacity: cap, currentQty: 0, status: 'empty',
      qrData: `BIN:${newBinCode}|STORE:${newBin.storeId}${newBin.preferredCategory ? '|CAT:' + newBin.preferredCategory : ''}`,
      createdAt: new Date().toISOString(),
    };
    setBins(prev => [...prev, bin]);
    addAuditLog({ action: 'create', module: 'store', entityId: bin.id, entityName: bin.binCode, details: `New bin created: ${bin.binCode} at ${store?.name}` });
    showToast(`Bin ${newBinCode} created!`);
    setShowAddBin(false);
    setNewBin({ storeId: isAdmin ? '' : (currentUser?.storeId || ''), zone: '', aisle: '', rack: '', capacity: '', preferredCategory: '' });
  };

  const handleBulkCreate = () => {
    if (!bulk.storeId || !bulk.zone || !bulk.aisles || !bulk.racksPerAisle || !bulk.capacity) {
      showToast('Please fill all required fields.', 'error'); return;
    }
    if (bulkNewCount === 0) { showToast('All bins in this zone already exist.', 'error'); return; }
    const cap = parseInt(bulk.capacity);
    const store = stores.find(s => s.id === bulk.storeId);
    const newBins: Bin[] = bulkPreview
      .filter(p => !p.duplicate)
      .map((p, i) => {
        const parts = p.binCode.split('-');
        const zone  = parts[0];
        const aisle = parts[1];
        const rack  = parts.slice(2).join('-');
        return {
          id: 'b' + Date.now() + i,
          binCode: p.binCode, zone, aisle, rack,
          storeId: bulk.storeId,
          storeName: store?.name || '',
          preferredCategory: bulk.preferredCategory || undefined,
          capacity: cap, currentQty: 0, status: 'empty' as BinStatus,
          qrData: `BIN:${p.binCode}|STORE:${bulk.storeId}${bulk.preferredCategory ? '|CAT:' + bulk.preferredCategory : ''}`,
          createdAt: new Date().toISOString(),
        };
      });
    setBins(prev => [...prev, ...newBins]);
    addAuditLog({ action: 'create', module: 'store', entityId: bulk.storeId, entityName: `Zone ${bulk.zone.toUpperCase()}`, details: `Bulk zone setup: ${newBins.length} bins created in Zone ${bulk.zone.toUpperCase()} at ${store?.name}` });
    showToast(`${newBins.length} bins created in Zone ${bulk.zone.toUpperCase()}!`);
    setShowBulkZone(false);
    setBulk({ storeId: isAdmin ? '' : (currentUser?.storeId || ''), zone: '', aisles: '2', racksPerAisle: '3', capacity: '30', preferredCategory: '' });
  };

  const handleDeleteBin = (bin: Bin) => {
    if (bin.status === 'occupied') { showToast('Cannot delete an occupied bin. Clear it first.', 'error'); return; }
    setBins(prev => prev.filter(b => b.id !== bin.id));
    showToast(`Bin ${bin.binCode} deleted.`);
  };

  const handleMoveStock = () => {
    if (!moveSrcBin || !moveDestBinId || !moveQty) { showToast('Fill all fields.', 'error'); return; }
    const qty = parseInt(moveQty);
    if (!qty || qty < 1 || qty > moveSrcBin.currentQty) {
      showToast(`Invalid quantity. Available: ${moveSrcBin.currentQty}`, 'error'); return;
    }
    const destBin = bins.find(b => b.id === moveDestBinId);
    if (!destBin) return;
    const destAvailableSpace = destBin.capacity - destBin.currentQty;
    if (qty > destAvailableSpace) {
      showToast(`Destination only has space for ${destAvailableSpace} units.`, 'error'); return;
    }

    setBins(prev => prev.map(b => {
      if (b.id === moveSrcBin.id) {
        const newQty = b.currentQty - qty;
        return newQty === 0
          ? { ...b, currentQty: 0, status: 'empty' as BinStatus, productId: undefined, productName: undefined, lastActivityAt: new Date().toISOString() }
          : { ...b, currentQty: newQty, lastActivityAt: new Date().toISOString() };
      }
      if (b.id === moveDestBinId) {
        return {
          ...b,
          status: 'occupied' as BinStatus,
          productId: moveSrcBin.productId,
          productName: moveSrcBin.productName,
          currentQty: b.currentQty + qty,
          lastActivityAt: new Date().toISOString(),
        };
      }
      return b;
    }));

    addAuditLog({
      action: 'update', module: 'product',
      entityId: moveSrcBin.id, entityName: moveSrcBin.binCode,
      details: `Moved ${qty}× ${moveSrcBin.productName} from bin ${moveSrcBin.binCode} → ${destBin.binCode}`,
    });
    showToast(`Moved ${qty} units from ${moveSrcBin.binCode} → ${destBin.binCode}`);
    setShowMoveModal(false);
    setMoveSrcBin(null); setMoveDestBinId(''); setMoveQty('');
  };

  const handleAssign = () => {
    if (!assignBin || !assignProductId) { showToast('Select a product.', 'error'); return; }
    const qty = parseInt(assignQty);
    if (!qty || qty < 1) { showToast('Enter a valid quantity.', 'error'); return; }
    const product = products.find(p => p.id === assignProductId);
    if (!product) return;
    setBins(prev => prev.map(b => b.id === assignBin.id ? {
      ...b, status: 'occupied' as BinStatus,
      productId: product.id, productName: product.name,
      currentQty: qty, lastActivityAt: new Date().toISOString(),
    } : b));
    const newBatch: StockBatch = {
      id: 'bt' + Date.now(),
      batchNumber: 'BAT-' + new Date().getFullYear() + '-' + String(batches.length + 1).padStart(3, '0'),
      productId: product.id, productName: product.name, sku: product.sku,
      binId: assignBin.id, binCode: assignBin.binCode,
      storeId: assignBin.storeId, storeName: assignBin.storeName,
      quantity: qty, expiryDate: product.warrantyEndDate,
      receivedDate: new Date().toISOString().split('T')[0], status: 'available',
    };
    setBatches(prev => [newBatch, ...prev]);
    addAuditLog({ action: 'update', module: 'product', entityId: assignBin.id, entityName: assignBin.binCode, details: `Bin ${assignBin.binCode} assigned: ${qty}× ${product.name}` });
    showToast(`Bin ${assignBin.binCode} assigned to ${product.name}!`);
    setShowAssignModal(false);
    setAssignBin(null); setAssignProductId(''); setAssignQty('');
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Layout>
      <TopBar />
      <div className="page-content">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Warehouse Operations</p>
            <h1>Bin Management</h1>
            <p>Bin-level tracking, FEFO picking strategy & QR code operations.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setShowBulkZone(true)}>
              <span className="material-symbols-outlined">add_chart</span>
              Bulk Zone Setup
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddBin(true)}>
              <span className="material-symbols-outlined">add_box</span>
              Add Bin
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="metric-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Total Bins',    value: stats.total,           color: '#00478d', bg: 'rgba(0,71,141,0.08)',    icon: 'grid_view' },
            { label: 'Occupied',      value: stats.occupied,        color: '#10b981', bg: 'rgba(16,185,129,0.10)',  icon: 'inventory_2' },
            { label: 'Empty / Free',  value: stats.empty,           color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: 'check_box_outline_blank' },
            { label: 'Utilization %', value: `${stats.utilization}%`, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', icon: 'donut_large' },
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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--outline-variant)', marginBottom: '1.5rem', overflowX: 'auto' }}>
          {([
            { key: 'bins',    label: 'Bin List',       icon: 'view_list' },
            { key: 'zonemap', label: 'Zone Map',        icon: 'map' },
            { key: 'fefo',    label: 'FEFO Picking',   icon: 'sort' },
            { key: 'qr',      label: 'QR Code Labels', icon: 'qr_code_2' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.625rem 1.25rem', border: 'none', background: 'none',
                borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: -2, color: activeTab === t.key ? 'var(--primary)' : 'var(--secondary)',
                fontWeight: activeTab === t.key ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── BIN LIST TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'bins' && (
          <>
            {/* Filters row */}
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
              {isAdmin && (
                <select className="form-select" style={{ width: 'auto', minWidth: 170 }}
                  value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                  <option value="all">All Stores</option>
                  {stores.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <select className="form-select" style={{ width: 'auto' }}
                value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                <option value="all">All Zones</option>
                {allZones.map(z => <option key={z} value={z}>Zone {z}</option>)}
              </select>
              <select className="form-select" style={{ width: 'auto' }}
                value={filterStatus} onChange={e => setFilterStatus(e.target.value as BinStatus | 'all')}>
                <option value="all">All Statuses</option>
                {(Object.keys(BIN_STATUS_INFO) as BinStatus[]).map(s => (
                  <option key={s} value={s}>{BIN_STATUS_INFO[s].label}</option>
                ))}
              </select>
              {/* Product Locator */}
              <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: productSearch ? 'var(--primary)' : 'var(--secondary)', pointerEvents: 'none' }}>
                  search
                </span>
                <input
                  className="form-input"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Locate product or bin…"
                  style={{ paddingLeft: '2.125rem', paddingRight: productSearch ? '2rem' : undefined }}
                />
                {productSearch && (
                  <button onClick={() => setProductSearch('')}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                )}
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--secondary)', whiteSpace: 'nowrap' }}>
                {visibleBins.length} bin{visibleBins.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Product locator banner */}
            {productSearch.trim() && (
              <div style={{ background: 'rgba(0,71,141,0.06)', borderRadius: '0.625rem', padding: '0.625rem 1rem', marginBottom: '1rem', border: '1px solid rgba(0,71,141,0.2)', display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>location_on</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Locating:</span>
                <span style={{ color: 'var(--on-surface)' }}>"{productSearch}"</span>
                <span style={{ color: 'var(--secondary)' }}>— {visibleBins.length} bin{visibleBins.length !== 1 ? 's' : ''} found</span>
                <button onClick={() => setProductSearch('')} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>Clear</button>
              </div>
            )}

            {/* Needs Attention callout */}
            {hasAttention && (
              <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>warning</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ef4444' }}>Needs Attention</span>
                  </div>
                  <button onClick={() => setAttentionDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', display: 'flex', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {attentionItems.overCapacity.length > 0 && (
                    <button onClick={() => setFilterStatus('occupied')}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>
                      {attentionItems.overCapacity.length} over capacity
                    </button>
                  )}
                  {attentionItems.nearFull.length > 0 && (
                    <button onClick={() => setFilterStatus('occupied')}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#d97706', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>battery_alert</span>
                      {attentionItems.nearFull.length} near full (≥85%)
                    </button>
                  )}
                  {attentionItems.maintenance.length > 0 && (
                    <button onClick={() => setFilterStatus('maintenance')}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>construction</span>
                      {attentionItems.maintenance.length} in maintenance
                    </button>
                  )}
                </div>
              </div>
            )}

            {visibleBins.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">grid_view</span>
                <h3>No bins found</h3>
                <p>Click "Add Bin" or "Bulk Zone Setup" to create bins.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {visibleBins.map(bin => {
                  const si = BIN_STATUS_INFO[bin.status];
                  const fillPct = bin.capacity > 0 ? Math.round((bin.currentQty / bin.capacity) * 100) : 0;
                  const barColor = fillPct > 80 ? '#ef4444' : fillPct > 50 ? '#f59e0b' : '#10b981';
                  const isSelected = selectedBin?.id === bin.id;
                  return (
                    <div key={bin.id}
                      onClick={() => setSelectedBin(isSelected ? null : bin)}
                      style={{
                        background: 'var(--surface)',
                        borderRadius: '0.875rem',
                        border: isSelected ? `2px solid var(--primary)` : '2px solid var(--outline-variant)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                        boxShadow: isSelected ? '0 0 0 3px rgba(0,71,141,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--outline-variant)'; }}
                    >
                      {/* Status accent strip */}
                      <div style={{ height: 4, background: si.color, opacity: 0.85 }} />

                      <div style={{ padding: '0.875rem 1rem' }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: si.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: si.color }}>{si.icon}</span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                                {bin.binCode}
                              </div>
                              {isAdmin && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {bin.storeName}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: '2rem',
                              background: si.bg, color: si.color,
                            }}>
                              {si.label}
                            </span>
                            {bin.status === 'empty' && (
                              <button
                                title="Delete bin"
                                onClick={e => { e.stopPropagation(); handleDeleteBin(bin); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline-variant)', padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '0.25rem', transition: 'color 0.15s' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--error)'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--outline-variant)'}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Location pills */}
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
                          {[
                            { label: 'Zone', value: bin.zone },
                            { label: 'Aisle', value: bin.aisle },
                            { label: 'Rack', value: bin.rack },
                          ].map(item => (
                            <span key={item.label} style={{
                              fontSize: '0.6875rem', padding: '2px 7px', borderRadius: '0.375rem',
                              background: 'var(--surface-container)', color: 'var(--secondary)', fontWeight: 600,
                            }}>
                              {item.label} {item.value}
                            </span>
                          ))}
                          {bin.preferredCategory && (
                            <span style={{
                              fontSize: '0.6875rem', padding: '2px 7px', borderRadius: '0.375rem',
                              background: 'rgba(0,81,74,0.08)', color: 'var(--tertiary)', fontWeight: 600,
                            }}>
                              {bin.preferredCategory}
                            </span>
                          )}
                        </div>

                        {/* Product name (if occupied) */}
                        {bin.productName && (
                          <div style={{
                            fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)',
                            marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem',
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--tertiary)', flexShrink: 0 }}>inventory_2</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bin.productName}</span>
                          </div>
                        )}

                        {/* Capacity bar */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--secondary)', fontWeight: 500 }}>
                              {bin.currentQty} / {bin.capacity} units
                            </span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: barColor }}>{fillPct}%</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--surface-container)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '99px',
                              width: `${fillPct}%`, background: barColor,
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>

                        {/* Actions */}
                        {bin.status === 'empty' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={e => { e.stopPropagation(); setAssignBin(bin); setShowAssignModal(true); }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add_box</span>
                            Assign Product
                          </button>
                        )}
                        {bin.status === 'occupied' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={e => { e.stopPropagation(); setMoveSrcBin(bin); setMoveDestBinId(''); setMoveQty(''); setShowMoveModal(true); }}
                              title="Move stock to another bin"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>move_up</span>
                              Move
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1, justifyContent: 'center' }}
                              onClick={e => { e.stopPropagation(); setActiveTab('qr'); setSelectedBin(bin); }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>qr_code_2</span>
                              QR
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ flex: 1, justifyContent: 'center', background: 'rgba(245,158,11,0.1)', color: '#92400e', border: '1px solid rgba(245,158,11,0.25)' }}
                              onClick={e => {
                                e.stopPropagation();
                                setBins(prev => prev.map(b => b.id === bin.id ? {
                                  ...b, status: 'empty' as BinStatus,
                                  productId: undefined, productName: undefined,
                                  currentQty: 0, lastActivityAt: new Date().toISOString(),
                                } : b));
                                showToast(`Bin ${bin.binCode} cleared.`);
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>clear_all</span>
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── ZONE MAP TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'zonemap' && (
          <>
            {/* Store filter */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
              {isAdmin && (
                <select className="form-select" style={{ width: 'auto', minWidth: 180 }}
                  value={filterStore} onChange={e => setFilterStore(e.target.value)}>
                  <option value="all">All Stores</option>
                  {stores.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {/* Legend */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                {(Object.entries(BIN_STATUS_INFO) as [BinStatus, typeof BIN_STATUS_INFO[BinStatus]][]).map(([k, si]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--secondary)' }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: si.bg, border: `1.5px solid ${si.color}` }} />
                    {si.label}
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(zoneMapStore).length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">map</span>
                <h3>No bins to display</h3>
                <p>Create bins using "Add Bin" or "Bulk Zone Setup".</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.keys(zoneMapStore).sort().map(zone => (
                  <div key={zone} className="card" style={{ overflow: 'hidden' }}>
                    {/* Zone header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'white', fontWeight: 900, fontFamily: 'Manrope, sans-serif', fontSize: '1rem' }}>{zone}</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '1rem' }}>Zone {zone}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                          {Object.keys(zoneMapStore[zone]).length} aisle{Object.keys(zoneMapStore[zone]).length !== 1 ? 's' : ''} ·{' '}
                          {Object.values(zoneMapStore[zone]).reduce((s, r) => s + r.length, 0)} bin{Object.values(zoneMapStore[zone]).reduce((s, r) => s + r.length, 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        {(Object.keys(BIN_STATUS_INFO) as BinStatus[]).map(st => {
                          const cnt = Object.values(zoneMapStore[zone]).flat().filter(b => b.status === st).length;
                          if (cnt === 0) return null;
                          return <span key={st} className={`chip ${BIN_STATUS_INFO[st].cls}`} style={{ fontSize: '0.7rem' }}>{cnt} {BIN_STATUS_INFO[st].label}</span>;
                        })}
                      </div>
                    </div>

                    {/* Aisles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      {Object.keys(zoneMapStore[zone]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(aisle => (
                        <div key={aisle}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>view_agenda</span>
                            Aisle {aisle}
                            <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>({zoneMapStore[zone][aisle].length} rack{zoneMapStore[zone][aisle].length !== 1 ? 's' : ''})</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {zoneMapStore[zone][aisle].map(bin => (
                              <BinCell key={bin.id} bin={bin}
                                onClick={() => {
                                  setSelectedBin(bin);
                                  setActiveTab('bins');
                                  setFilterZone(zone);
                                }} />
                            ))}
                            {/* Add rack button for this aisle */}
                            <div
                              title="Add a rack to this aisle"
                              onClick={() => {
                                const store = zoneMapStore[zone][aisle][0];
                                setNewBin(prev => ({
                                  ...prev,
                                  storeId: store.storeId,
                                  zone,
                                  aisle,
                                  rack: String(zoneMapStore[zone][aisle].length + 1),
                                }));
                                setShowAddBin(true);
                              }}
                              style={{ width: 64, minHeight: 52, borderRadius: '0.5rem', background: 'none', border: '1.5px dashed var(--outline-variant)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: 'var(--secondary)', transition: 'border-color 0.15s, color 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--primary)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--outline-variant)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--secondary)'; }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                              <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>Rack</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── FEFO TAB ──────────────────────────────────────────────────────────── */}
        {activeTab === 'fefo' && (
          <>
            <div style={{ background: 'rgba(0,81,74,0.06)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(0,81,74,0.15)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined filled" style={{ color: 'var(--tertiary)', marginTop: 2 }}>info</span>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--tertiary)', marginBottom: '0.25rem', fontSize: '0.875rem' }}>FEFO — First Expired, First Out</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  Batches are sorted by expiry date. The system highlights which batch to pick first, preventing dead-stock.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {isAdmin && (
                <select className="form-select" style={{ width: 'auto', minWidth: 180 }}
                  value={fefoStoreFilter} onChange={e => setFefoStoreFilter(e.target.value)}>
                  <option value="all">All Stores</option>
                  {stores.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              <select className="form-select" style={{ width: 'auto', minWidth: 180 }}
                value={fefoProductFilter} onChange={e => setFefoProductFilter(e.target.value)}>
                <option value="all">All Products</option>
                {fefoProducts.map(b => <option key={b.productId} value={b.productId}>{b.productName}</option>)}
              </select>
            </div>

            {Object.keys(fefoGroups).length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">sort</span>
                <h3>No batch data</h3>
                <p>Assign products to bins to create batches for FEFO picking.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.entries(fefoGroups).map(([productId, productBatches]) => {
                  const first = productBatches[0];
                  const daysToExpiry = Math.floor((new Date(first.expiryDate).getTime() - Date.now()) / 86400000);
                  const isUrgent = daysToExpiry < 90;
                  return (
                    <div key={productId} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <span style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem' }}>{first.productName}</span>
                            {isUrgent && <span className="chip chip-warning" style={{ fontSize: '0.7rem' }}>Urgent Pick</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontFamily: 'monospace' }}>{first.sku}</div>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                          {productBatches.length} batch{productBatches.length > 1 ? 'es' : ''} · {productBatches.reduce((s, b) => s + b.quantity, 0)} units
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {productBatches.map((batch, idx) => (
                          <div key={batch.id}
                            style={{ background: idx === 0 ? (isUrgent ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.06)') : 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', border: idx === 0 ? `1px solid ${isUrgent ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)'}` : '1px solid transparent', cursor: 'pointer' }}
                            onClick={() => setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                {idx === 0 && <span style={{ background: isUrgent ? '#f59e0b' : '#10b981', color: 'white', fontSize: '0.625rem', fontWeight: 800, padding: '2px 6px', borderRadius: '0.25rem', letterSpacing: '0.05em' }}>PICK FIRST</span>}
                                <span style={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'monospace' }}>{batch.batchNumber}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Bin: <strong>{batch.binCode}</strong></span>
                                {isAdmin && <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{batch.storeName}</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FEFOBadge expiryDate={batch.expiryDate} />
                                <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.875rem' }}>{batch.quantity} units</span>
                              </div>
                            </div>
                            {selectedBatch?.id === batch.id && (
                              <div style={{ marginTop: '0.625rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--secondary)', borderTop: '1px solid var(--outline-variant)', paddingTop: '0.5rem' }}>
                                <div><span>Received: </span><strong>{fmtDate(batch.receivedDate)}</strong></div>
                                <div><span>Expires: </span><strong>{fmtDate(batch.expiryDate)}</strong></div>
                                <div><span>Store: </span><strong>{batch.storeName}</strong></div>
                                {batch.notes && <div style={{ flexBasis: '100%', fontStyle: 'italic' }}>"{batch.notes}"</div>}
                                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
                                  onClick={e => { e.stopPropagation(); setActiveTab('qr'); setSelectedBatch(batch); setQrMode('batch'); }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>qr_code_2</span>
                                  View QR Label
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── QR CODE TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'qr' && (
          <>
            <div style={{ background: 'rgba(0,71,141,0.06)', borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.25rem', border: '1px solid rgba(0,71,141,0.15)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined filled" style={{ color: 'var(--primary)', marginTop: 2 }}>qr_code_2</span>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem', fontSize: '0.875rem' }}>QR-Driven Operations</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  Scan with any mobile device to perform put-away, picking, and transfers instantly.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button onClick={() => setQrMode('bin')} className={qrMode === 'bin' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>grid_view</span>
                Bin QR Codes
              </button>
              <button onClick={() => setQrMode('batch')} className={qrMode === 'batch' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>inventory</span>
                Batch QR Codes
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {qrMode === 'bin' && qrStoreBins.map(bin => {
                const isSel = selectedBin?.id === bin.id;
                return (
                  <div key={bin.id} className="card" style={{ cursor: 'pointer', textAlign: 'center', border: isSel ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.15s' }}
                    onClick={() => setSelectedBin(isSel ? null : bin)}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <QRCodeSVG value={bin.qrData} size={120} level="M" includeMargin={false} />
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '1rem', marginBottom: '0.25rem' }}>{bin.binCode}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Zone {bin.zone} · {bin.storeName}</div>
                    {bin.productName && <div style={{ fontSize: '0.75rem', color: 'var(--tertiary)', fontWeight: 600, marginTop: '0.25rem' }}>{bin.productName}</div>}
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className={`chip ${BIN_STATUS_INFO[bin.status].cls}`} style={{ fontSize: '0.7rem' }}>{BIN_STATUS_INFO[bin.status].label}</span>
                    </div>
                    <div style={{ marginTop: '0.625rem', padding: '0.375rem 0.5rem', background: 'var(--surface-container-low)', borderRadius: '0.375rem', fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--secondary)', wordBreak: 'break-all' }}>
                      {bin.qrData}
                    </div>
                  </div>
                );
              })}
              {qrMode === 'batch' && qrStoreBatches.filter(b => b.status !== 'depleted').map(batch => {
                const isSel = selectedBatch?.id === batch.id;
                const qrValue = `BATCH:${batch.batchNumber}|PRODUCT:${batch.sku}|BIN:${batch.binCode}|STORE:${batch.storeId}|QTY:${batch.quantity}|EXP:${batch.expiryDate}`;
                return (
                  <div key={batch.id} className="card" style={{ cursor: 'pointer', textAlign: 'center', border: isSel ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.15s' }}
                    onClick={() => setSelectedBatch(isSel ? null : batch)}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <QRCodeSVG value={qrValue} size={120} level="M" includeMargin={false} />
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{batch.batchNumber}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface)' }}>{batch.productName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>Bin: {batch.binCode}</div>
                    <div style={{ marginTop: '0.375rem', display: 'flex', justifyContent: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <FEFOBadge expiryDate={batch.expiryDate} />
                      <span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>{batch.quantity} units</span>
                    </div>
                    <div style={{ marginTop: '0.625rem', padding: '0.375rem 0.5rem', background: 'var(--surface-container-low)', borderRadius: '0.375rem', fontSize: '0.6rem', fontFamily: 'monospace', color: 'var(--secondary)', wordBreak: 'break-all' }}>
                      {qrValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ══ ADD SINGLE BIN MODAL ══════════════════════════════════════════════════ */}
      {showAddBin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddBin(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Add New Bin</h3>
              <button className="modal-close" onClick={() => setShowAddBin(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Live bin code preview */}
            {newBinCode && (
              <div style={{ background: newBinDuplicate ? 'rgba(239,68,68,0.06)' : 'rgba(0,71,141,0.06)', border: `1px solid ${newBinDuplicate ? 'rgba(239,68,68,0.3)' : 'rgba(0,71,141,0.2)'}`, borderRadius: '0.625rem', padding: '0.625rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: newBinDuplicate ? '#ef4444' : 'var(--primary)' }}>{newBinDuplicate ? 'error' : 'qr_code_2'}</span>
                <div>
                  <div style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '1.125rem', color: newBinDuplicate ? '#ef4444' : 'var(--primary)' }}>{newBinCode}</div>
                  <div style={{ fontSize: '0.75rem', color: newBinDuplicate ? '#ef4444' : 'var(--secondary)' }}>
                    {newBinDuplicate ? 'This bin code already exists in this store.' : 'Auto-generated bin code'}
                  </div>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="form-group">
                <label className="form-label">Store *</label>
                <select className="form-select" value={newBin.storeId}
                  onChange={e => setNewBin(p => ({ ...p, storeId: e.target.value }))}>
                  <option value="">Select store...</option>
                  {stores.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Zone *</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" value={newBin.zone}
                    onChange={e => setNewBin(p => ({ ...p, zone: e.target.value.toUpperCase() }))}
                    placeholder="e.g. A, B, COLD" maxLength={10} />
                </div>
                {/* Suggest existing zones */}
                {allZones.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>Existing:</span>
                    {allZones.map(z => (
                      <button key={z} type="button"
                        className="btn btn-sm"
                        style={{ padding: '1px 8px', fontSize: '0.7rem', background: newBin.zone === z ? 'var(--primary)' : 'var(--surface-container)', color: newBin.zone === z ? 'white' : 'var(--on-surface)', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        onClick={() => setNewBin(p => ({ ...p, zone: z }))}>
                        {z}
                      </button>
                    ))}
                    <button type="button"
                      className="btn btn-sm"
                      style={{ padding: '1px 8px', fontSize: '0.7rem', background: 'none', border: '1px dashed var(--outline-variant)', borderRadius: '0.375rem', cursor: 'pointer', color: 'var(--tertiary)' }}
                      onClick={() => setNewBin(p => ({ ...p, zone: '' }))}>
                      + New Zone
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Aisle *</label>
                <input className="form-input" value={newBin.aisle}
                  onChange={e => setNewBin(p => ({ ...p, aisle: e.target.value }))}
                  placeholder="e.g. 01, 02, 03" maxLength={5} />
              </div>
              <div className="form-group">
                <label className="form-label">Rack *</label>
                <input className="form-input" value={newBin.rack}
                  onChange={e => setNewBin(p => ({ ...p, rack: e.target.value }))}
                  placeholder="e.g. 1, R2, R3" maxLength={5} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Capacity (units) *</label>
                <input className="form-input" type="number" min="1" max="9999"
                  value={newBin.capacity}
                  onChange={e => setNewBin(p => ({ ...p, capacity: e.target.value }))}
                  placeholder="e.g. 30" />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Category</label>
                <select className="form-select" value={newBin.preferredCategory}
                  onChange={e => setNewBin(p => ({ ...p, preferredCategory: e.target.value }))}>
                  <option value="">Any category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddBin(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddBin} disabled={newBinDuplicate || !newBinCode}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_box</span>
                Create Bin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BULK ZONE SETUP MODAL ═════════════════════════════════════════════════ */}
      {showBulkZone && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBulkZone(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Bulk Zone Setup</h3>
              <button className="modal-close" onClick={() => setShowBulkZone(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginBottom: '1rem' }}>
              Create an entire zone at once — specify aisles and racks per aisle. Bin codes auto-generate as <code>ZONE-AISLE-RACK</code>.
            </p>

            {isAdmin && (
              <div className="form-group">
                <label className="form-label">Store *</label>
                <select className="form-select" value={bulk.storeId}
                  onChange={e => setBulk(p => ({ ...p, storeId: e.target.value }))}>
                  <option value="">Select store...</option>
                  {stores.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Zone Name *</label>
                <input className="form-input" value={bulk.zone}
                  onChange={e => setBulk(p => ({ ...p, zone: e.target.value.toUpperCase() }))}
                  placeholder="e.g. C, D, COLD" maxLength={10} />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Aisles *</label>
                <input className="form-input" type="number" min="1" max="20"
                  value={bulk.aisles} onChange={e => setBulk(p => ({ ...p, aisles: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Racks per Aisle *</label>
                <input className="form-input" type="number" min="1" max="20"
                  value={bulk.racksPerAisle} onChange={e => setBulk(p => ({ ...p, racksPerAisle: e.target.value }))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Capacity per Bin *</label>
                <input className="form-input" type="number" min="1" max="9999"
                  value={bulk.capacity} onChange={e => setBulk(p => ({ ...p, capacity: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Category</label>
                <select className="form-select" value={bulk.preferredCategory}
                  onChange={e => setBulk(p => ({ ...p, preferredCategory: e.target.value }))}>
                  <option value="">Any category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Live preview */}
            {bulkPreview.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    Preview — {bulkPreview.length} bin{bulkPreview.length !== 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                    {bulkNewCount > 0 && <span className="chip chip-success" style={{ fontSize: '0.7rem' }}>{bulkNewCount} new</span>}
                    {bulkDuplicateCount > 0 && <span className="chip chip-warning" style={{ fontSize: '0.7rem' }}>{bulkDuplicateCount} skip (exist)</span>}
                  </div>
                </div>
                <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.375rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.625rem' }}>
                  {bulkPreview.map(p => (
                    <span key={p.binCode}
                      style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 600, padding: '2px 7px', borderRadius: '0.25rem', background: p.duplicate ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: p.duplicate ? '#92400e' : '#065f46', border: `1px solid ${p.duplicate ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}` }}>
                      {p.binCode}{p.duplicate ? ' ⚠' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkZone(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkCreate} disabled={bulkNewCount === 0}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_chart</span>
                Create {bulkNewCount} Bin{bulkNewCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ASSIGN PRODUCT MODAL ══════════════════════════════════════════════════ */}
      {showAssignModal && assignBin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssignModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Assign Product to Bin {assignBin.binCode}</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div><span style={{ color: 'var(--secondary)' }}>Zone: </span><strong>Zone {assignBin.zone}</strong></div>
                <div><span style={{ color: 'var(--secondary)' }}>Aisle: </span><strong>{assignBin.aisle}</strong></div>
                <div><span style={{ color: 'var(--secondary)' }}>Rack: </span><strong>{assignBin.rack}</strong></div>
                <div><span style={{ color: 'var(--secondary)' }}>Capacity: </span><strong>{assignBin.capacity} units</strong></div>
                {assignBin.preferredCategory && <div><span style={{ color: 'var(--secondary)' }}>Preferred: </span><strong>{assignBin.preferredCategory}</strong></div>}
              </div>
            </div>

            {assignBin.preferredCategory && (
              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tertiary)', marginBottom: '0.375rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>tips_and_updates</span>
                  Recommended — {assignBin.preferredCategory}:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {products.filter(p => p.category === assignBin.preferredCategory && p.storeId === assignBin.storeId && p.quantity > 0).slice(0, 3).map(p => (
                    <button key={p.id} className="btn btn-secondary btn-sm"
                      style={{ background: assignProductId === p.id ? 'var(--primary)' : undefined, color: assignProductId === p.id ? 'white' : undefined }}
                      onClick={() => setAssignProductId(p.id)}>
                      {p.name} ({p.quantity})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-select" value={assignProductId} onChange={e => setAssignProductId(e.target.value)}>
                <option value="">Select product...</option>
                {products.filter(p => p.storeId === assignBin.storeId && p.quantity > 0).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.quantity} available)</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-input" type="number" min="1" max={assignBin.capacity}
                value={assignQty} onChange={e => setAssignQty(e.target.value)}
                placeholder={`1–${assignBin.capacity}`} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_box</span>
                Assign to Bin
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══ MOVE STOCK MODAL ═════════════════════════════════════════════════════ */}
      {showMoveModal && moveSrcBin && (() => {
        const moveQtyNum = parseInt(moveQty) || 0;
        const destBin = bins.find(b => b.id === moveDestBinId);
        const destSpace = destBin ? destBin.capacity - destBin.currentQty : 0;
        const sameStoreDestBins = bins.filter(b =>
          b.id !== moveSrcBin.id &&
          b.storeId === moveSrcBin.storeId &&
          b.status !== 'maintenance' &&
          (b.status === 'empty' || (b.status === 'occupied' && b.productId === moveSrcBin.productId))
        );
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMoveModal(false)}>
            <div className="modal">
              <div className="modal-header">
                <h3>Move Stock</h3>
                <button className="modal-close" onClick={() => setShowMoveModal(false)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {/* Source info */}
              <div style={{ background: 'var(--surface-container-low)', borderRadius: '0.5rem', padding: '0.75rem 0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#10b981' }}>inventory_2</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem' }}>{moveSrcBin.binCode}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moveSrcBin.productName}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'Manrope, sans-serif', color: '#10b981' }}>{moveSrcBin.currentQty}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)' }}>units</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Destination Bin *</label>
                {sameStoreDestBins.length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                    No compatible destination bins available in this store.
                  </div>
                ) : (
                  <select className="form-select" value={moveDestBinId} onChange={e => setMoveDestBinId(e.target.value)}>
                    <option value="">Select destination bin…</option>
                    {sameStoreDestBins.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.binCode} — {b.status === 'empty' ? `Empty (${b.capacity} cap)` : `${b.productName} (${b.currentQty}/${b.capacity})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {destBin && (
                <div style={{ background: 'rgba(59,130,246,0.06)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8125rem', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div><span style={{ color: 'var(--secondary)' }}>Destination: </span><strong>{destBin.binCode}</strong></div>
                    <div><span style={{ color: 'var(--secondary)' }}>Available space: </span><strong style={{ color: destSpace > 0 ? '#10b981' : '#ef4444' }}>{destSpace} units</strong></div>
                    <div><span style={{ color: 'var(--secondary)' }}>Current: </span><strong>{destBin.currentQty}/{destBin.capacity}</strong></div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Quantity to Move *</label>
                <input className="form-input" type="number" min="1" max={moveSrcBin.currentQty}
                  value={moveQty} onChange={e => setMoveQty(e.target.value)}
                  placeholder={`1–${moveSrcBin.currentQty}`} />
                {moveQtyNum > 0 && moveQtyNum <= moveSrcBin.currentQty && (
                  <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--secondary)' }}>
                    After move: <strong>{moveSrcBin.binCode}</strong> → {moveSrcBin.currentQty - moveQtyNum} units
                    {destBin && <span> · <strong>{destBin.binCode}</strong> → {destBin.currentQty + moveQtyNum} units</span>}
                    {moveSrcBin.currentQty - moveQtyNum === 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}> (source will be emptied)</span>}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleMoveStock}
                  disabled={!moveDestBinId || !moveQty || moveQtyNum < 1 || moveQtyNum > moveSrcBin.currentQty || (!!destBin && moveQtyNum > destSpace)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>move_up</span>
                  Move {moveQtyNum > 0 ? `${moveQtyNum} Units` : 'Stock'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}
