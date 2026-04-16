import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import type {
  RMA, RMAStatus, RMAPriority, RMADefectType, RMAResolution,
  AMCContract, AMCCoverage, ServiceFrequency,
  AssetDocument, AssetDocType,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function computeNextServiceDate(base: string, freq: ServiceFrequency): string {
  const d = new Date(base);
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (freq === 'half_yearly') d.setMonth(d.getMonth() + 6);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function fmtFileSize(bytes: number): string {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── RMA constants ────────────────────────────────────────────────────────────

const RMA_STEPS: RMAStatus[] = ['initiated', 'received', 'inspected', 'sent_to_vendor', 'resolved'];
const RMA_STEP_LABELS: Record<RMAStatus, string> = {
  initiated: 'Initiated', received: 'Received', inspected: 'Inspected',
  sent_to_vendor: 'Sent to Vendor', resolved: 'Resolved', rejected: 'Rejected',
};
const RMA_NEXT: Record<RMAStatus, RMAStatus | null> = {
  initiated: 'received', received: 'inspected', inspected: 'sent_to_vendor',
  sent_to_vendor: 'resolved', resolved: null, rejected: null,
};
const PRIORITY_STYLE: Record<RMAPriority, { bg: string; color: string; label: string }> = {
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Critical' },
  high:     { bg: '#ffedd5', color: '#9a3412', label: 'High' },
  medium:   { bg: '#fef3c7', color: '#92400e', label: 'Medium' },
  low:      { bg: '#f1f5f9', color: '#475569', label: 'Low' },
};
const DEFECT_LABELS: Record<RMADefectType, string> = {
  hardware: 'Hardware', software: 'Software', physical_damage: 'Physical Damage',
  dead_on_arrival: 'Dead on Arrival', performance: 'Performance', other: 'Other',
};
const RESOLUTION_LABELS: Record<RMAResolution, string> = {
  repair: 'Repaired', replacement: 'Replacement', credit_note: 'Credit Note', rejected: 'Rejected',
};

// ─── AMC constants ────────────────────────────────────────────────────────────

const COVERAGE_STYLE: Record<AMCCoverage, { bg: string; color: string; label: string }> = {
  comprehensive:     { bg: '#d1fae5', color: '#065f46', label: 'Comprehensive' },
  non_comprehensive: { bg: '#dbeafe', color: '#1e40af', label: 'Non-Comprehensive' },
  parts_only:        { bg: '#fef3c7', color: '#92400e', label: 'Parts Only' },
  labour_only:       { bg: '#f3e8ff', color: '#6b21a8', label: 'Labour Only' },
};
const FREQ_LABELS: Record<ServiceFrequency, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: 'Half-Yearly', yearly: 'Yearly',
};

// ─── Asset Doc constants ──────────────────────────────────────────────────────

const DOC_ICONS: Record<AssetDocType, string> = {
  manual: 'menu_book', invoice: 'receipt', insurance: 'shield',
  warranty_card: 'verified', amc_contract: 'handshake',
  compliance_cert: 'gpp_good', other: 'description',
};
const DOC_LABELS: Record<AssetDocType, string> = {
  manual: 'Manual', invoice: 'Invoice', insurance: 'Insurance',
  warranty_card: 'Warranty Card', amc_contract: 'AMC Contract',
  compliance_cert: 'Compliance Cert', other: 'Other',
};

// ─── RMA Form ─────────────────────────────────────────────────────────────────

interface RMAFormData {
  productId: string; quantity: string; defectType: RMADefectType;
  defectDescription: string; vendorName: string; vendorContact: string;
  priority: RMAPriority; notes: string;
}
const emptyRMAForm: RMAFormData = {
  productId: '', quantity: '1', defectType: 'hardware',
  defectDescription: '', vendorName: '', vendorContact: '',
  priority: 'medium', notes: '',
};

// ─── AMC Form ─────────────────────────────────────────────────────────────────

interface AMCFormData {
  productId: string; vendorName: string; vendorContact: string; vendorEmail: string;
  startDate: string; endDate: string; coverageType: AMCCoverage;
  serviceFrequency: ServiceFrequency; annualCost: string; notes: string;
}
const emptyAMCForm: AMCFormData = {
  productId: '', vendorName: '', vendorContact: '', vendorEmail: '',
  startDate: '', endDate: '', coverageType: 'comprehensive',
  serviceFrequency: 'quarterly', annualCost: '', notes: '',
};

// ─── Upload Form ──────────────────────────────────────────────────────────────

interface UploadFormData {
  productId: string; docType: AssetDocType; title: string;
  fileName: string; expiryDate: string; notes: string;
}
const emptyUploadForm: UploadFormData = {
  productId: '', docType: 'manual', title: '', fileName: '', expiryDate: '', notes: '',
};

// ─── Resolve Modal state ──────────────────────────────────────────────────────

interface ResolveState { rma: RMA; resolution: RMAResolution; notes: string }

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QualityCompliancePage() {
  const {
    rmas, setRmas, amcContracts, setAmcContracts,
    assetDocs, setAssetDocs, products, stores,
    currentUser, showToast,
  } = useApp();

  const isAdmin = currentUser?.role === 'head_admin';
  const [activeTab, setActiveTab] = useState<'rma' | 'amc' | 'vault'>('rma');

  // ── RMA state ──
  const [filterRMAStatus, setFilterRMAStatus] = useState<'all' | RMAStatus>('all');
  const [filterRMAPriority, setFilterRMAPriority] = useState<'all' | RMAPriority>('all');
  const [showCreateRMA, setShowCreateRMA] = useState(false);
  const [rmaForm, setRmaForm] = useState<RMAFormData>(emptyRMAForm);
  const [expandedRMA, setExpandedRMA] = useState<string | null>(null);
  const [resolveState, setResolveState] = useState<ResolveState | null>(null);

  // ── AMC state ──
  const [showCreateAMC, setShowCreateAMC] = useState(false);
  const [amcForm, setAmcForm] = useState<AMCFormData>(emptyAMCForm);

  // ── Vault state ──
  const [filterDocType, setFilterDocType] = useState<'all' | AssetDocType>('all');
  const [filterDocProduct, setFilterDocProduct] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormData>(emptyUploadForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const visibleProducts = isAdmin ? products : products.filter(p => p.storeId === currentUser?.storeId);

  // ── Visible RMAs ──
  const visibleRMAs = useMemo(() => {
    const base = isAdmin ? rmas : rmas.filter(r => r.storeId === currentUser?.storeId);
    return base.filter(r => {
      const matchStatus = filterRMAStatus === 'all' || r.status === filterRMAStatus;
      const matchPriority = filterRMAPriority === 'all' || r.priority === filterRMAPriority;
      return matchStatus && matchPriority;
    });
  }, [rmas, isAdmin, currentUser, filterRMAStatus, filterRMAPriority]);

  const allVisibleRMAs = isAdmin ? rmas : rmas.filter(r => r.storeId === currentUser?.storeId);
  const rmaActiveCount = allVisibleRMAs.filter(r => r.status !== 'resolved' && r.status !== 'rejected').length;
  const rmaCriticalCount = allVisibleRMAs.filter(r => r.priority === 'critical').length;
  const rmaVendorCount = allVisibleRMAs.filter(r => r.status === 'sent_to_vendor').length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const rmaResolvedMonth = allVisibleRMAs.filter(r => r.resolvedAt?.startsWith(currentMonth)).length;

  // ── Visible AMCs ──
  const visibleAMCs = isAdmin ? amcContracts : amcContracts.filter(c => c.storeId === currentUser?.storeId);
  const amcActive = visibleAMCs.filter(c => daysUntil(c.endDate) > 0).length;
  const amcExpiringSoon = visibleAMCs.filter(c => { const d = daysUntil(c.endDate); return d > 0 && d <= 60; }).length;
  const amcExpired = visibleAMCs.filter(c => daysUntil(c.endDate) <= 0).length;
  const amcDueService = visibleAMCs.filter(c => daysUntil(c.nextServiceDate) <= 14).length;
  const amcServiceSoon = visibleAMCs.some(c => daysUntil(c.nextServiceDate) <= 7);

  // ── Visible Docs ──
  const visibleDocs = useMemo(() => {
    const base = isAdmin ? assetDocs : assetDocs.filter(d => d.storeId === currentUser?.storeId);
    return base.filter(d => {
      const matchType = filterDocType === 'all' || d.docType === filterDocType;
      const matchProduct = !filterDocProduct || d.productName.toLowerCase().includes(filterDocProduct.toLowerCase());
      return matchType && matchProduct;
    });
  }, [assetDocs, isAdmin, currentUser, filterDocType, filterDocProduct]);

  const docGroups = useMemo(() => {
    const map = new Map<string, { productName: string; sku: string; docs: AssetDocument[] }>();
    visibleDocs.forEach(d => {
      if (!map.has(d.productId)) map.set(d.productId, { productName: d.productName, sku: d.sku, docs: [] });
      map.get(d.productId)!.docs.push(d);
    });
    return Array.from(map.values());
  }, [visibleDocs]);

  const docTotal = visibleDocs.length;
  const docExpiring = visibleDocs.filter(d => d.expiryDate && daysUntil(d.expiryDate) >= 0 && daysUntil(d.expiryDate) <= 30).length;
  const docProductsCovered = new Set(visibleDocs.map(d => d.productId)).size;

  // ── RMA Handlers ──
  const handleCreateRMA = () => {
    if (!rmaForm.productId || !rmaForm.defectDescription || !rmaForm.vendorName) {
      showToast('Product, defect description and vendor name are required.', 'error');
      return;
    }
    const product = products.find(p => p.id === rmaForm.productId);
    if (!product) return;
    const store = stores.find(s => s.id === product.storeId);
    const newRMA: RMA = {
      id: 'rma' + Date.now(),
      rmaNumber: 'RMA-' + new Date().getFullYear() + '-' + String(rmas.length + 1).padStart(3, '0'),
      status: 'initiated',
      priority: rmaForm.priority,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      storeId: product.storeId,
      storeName: store?.name || product.storeName,
      quantity: Number(rmaForm.quantity) || 1,
      defectType: rmaForm.defectType,
      defectDescription: rmaForm.defectDescription,
      reportedBy: currentUser?.name || '',
      reportedById: currentUser?.id || '',
      vendorName: rmaForm.vendorName,
      vendorContact: rmaForm.vendorContact || undefined,
      initiatedAt: new Date().toISOString(),
      notes: rmaForm.notes || undefined,
    };
    setRmas(prev => [newRMA, ...prev]);
    showToast('Return request ' + newRMA.rmaNumber + ' created successfully!');
    setShowCreateRMA(false);
    setRmaForm(emptyRMAForm);
  };

  const handleAdvanceRMA = (rma: RMA) => {
    const next = RMA_NEXT[rma.status];
    if (!next) return;
    const now = new Date().toISOString();
    const update: Partial<RMA> = { status: next };
    if (next === 'received') update.receivedAt = now;
    else if (next === 'inspected') update.inspectedAt = now;
    else if (next === 'sent_to_vendor') update.sentToVendorAt = now;
    else if (next === 'resolved') update.resolvedAt = now;
    setRmas(prev => prev.map(r => r.id === rma.id ? { ...r, ...update } : r));
    showToast('Status updated to ' + RMA_STEP_LABELS[next] + '.');
  };

  const handleRejectRMA = (rma: RMA) => {
    setRmas(prev => prev.map(r => r.id === rma.id ? { ...r, status: 'rejected' } : r));
    showToast('Return request ' + rma.rmaNumber + ' rejected.', 'error');
  };

  const handleResolveRMA = () => {
    if (!resolveState) return;
    const { rma, resolution, notes } = resolveState;
    setRmas(prev => prev.map(r => r.id === rma.id ? {
      ...r, status: 'resolved', resolution, resolutionNotes: notes || undefined,
      resolvedAt: new Date().toISOString(),
    } : r));
    showToast('Return request ' + rma.rmaNumber + ' marked as resolved.');
    setResolveState(null);
  };

  // ── AMC Handlers ──
  const handleLogService = (contract: AMCContract) => {
    const todayStr = today();
    const nextService = computeNextServiceDate(todayStr, contract.serviceFrequency);
    setAmcContracts(prev => prev.map(c => c.id === contract.id
      ? { ...c, lastServiceDate: todayStr, nextServiceDate: nextService }
      : c));
    showToast('Service logged for ' + contract.productName + '. Next service: ' + nextService + '.');
  };

  const handleCreateAMC = () => {
    if (!amcForm.productId || !amcForm.vendorName || !amcForm.startDate || !amcForm.endDate) {
      showToast('Product, vendor name and dates are required.', 'error');
      return;
    }
    const product = products.find(p => p.id === amcForm.productId);
    if (!product) return;
    const store = stores.find(s => s.id === product.storeId);
    const next = computeNextServiceDate(amcForm.startDate, amcForm.serviceFrequency);
    const newAMC: AMCContract = {
      id: 'amc' + Date.now(),
      contractNumber: 'AMC-' + new Date().getFullYear() + '-' + String(amcContracts.length + 1).padStart(3, '0'),
      productId: product.id, productName: product.name, sku: product.sku,
      storeId: product.storeId, storeName: store?.name || product.storeName,
      vendorName: amcForm.vendorName, vendorContact: amcForm.vendorContact,
      vendorEmail: amcForm.vendorEmail || undefined,
      startDate: amcForm.startDate, endDate: amcForm.endDate,
      coverageType: amcForm.coverageType, serviceFrequency: amcForm.serviceFrequency,
      nextServiceDate: next,
      annualCost: Number(amcForm.annualCost) || 0,
      notes: amcForm.notes || undefined,
      createdBy: currentUser?.name || '',
      createdAt: new Date().toISOString(),
    };
    setAmcContracts(prev => [newAMC, ...prev]);
    showToast('AMC contract ' + newAMC.contractNumber + ' created!');
    setShowCreateAMC(false);
    setAmcForm(emptyAMCForm);
  };

  // ── Vault Handlers ──
  const handleUpload = () => {
    if (!uploadForm.productId || !uploadForm.title || (!uploadForm.fileName && !selectedFile)) {
      showToast('Product, title and file are required.', 'error');
      return;
    }
    const product = products.find(p => p.id === uploadForm.productId);
    if (!product) return;
    const store = stores.find(s => s.id === product.storeId);
    const newDoc: AssetDocument = {
      id: 'doc' + Date.now(),
      productId: product.id, productName: product.name, sku: product.sku,
      storeId: product.storeId, storeName: store?.name || product.storeName,
      docType: uploadForm.docType, title: uploadForm.title,
      fileName: selectedFile ? selectedFile.name : uploadForm.fileName,
      fileSize: selectedFile ? selectedFile.size : Math.floor(Math.random() * 1000000) + 100000,
      uploadedBy: currentUser?.name || '',
      uploadedById: currentUser?.id || '',
      uploadedAt: new Date().toISOString(),
      expiryDate: uploadForm.expiryDate || undefined,
      notes: uploadForm.notes || undefined,
    };
    setAssetDocs(prev => [newDoc, ...prev]);
    showToast('Document "' + newDoc.title + '" uploaded successfully!');
    setShowUploadModal(false);
    setUploadForm(emptyUploadForm);
    setSelectedFile(null);
  };

  const handleDeleteDoc = (doc: AssetDocument) => {
    setAssetDocs(prev => prev.filter(d => d.id !== doc.id));
    showToast('Document removed.', 'error');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      <TopBar searchPlaceholder="Search quality & compliance..." onSearch={() => {}} />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <p className="page-header-label">Compliance</p>
            <h1>Quality &amp; Compliance</h1>
            <p>Track product returns & replacements, AMC contracts, and store important documents.</p>
          </div>
          {activeTab === 'rma' && (
            <button className="btn btn-primary" onClick={() => setShowCreateRMA(true)}>
              <span className="material-symbols-outlined">assignment_return</span>
              New Return Request
            </button>
          )}
          {activeTab === 'amc' && isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCreateAMC(true)}>
              <span className="material-symbols-outlined">add_circle</span>
              New AMC Contract
            </button>
          )}
          {activeTab === 'vault' && (
            <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
              <span className="material-symbols-outlined">upload_file</span>
              Upload Document
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--surface-container)' }}>
          {([['rma', 'assignment_return', 'Return & Replacement'], ['amc', 'engineering', 'AMC & Service'], ['vault', 'folder_open', 'Documents']] as const).map(([tab, icon, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.625rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2, color: activeTab === tab ? 'var(--primary)' : 'var(--secondary)',
              fontWeight: activeTab === tab ? 600 : 400, fontSize: '0.875rem', transition: 'all 0.15s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: RMA ── */}
        {activeTab === 'rma' && (
          <div>
            {/* Stats */}
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#ffedd5', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#9a3412' }}>pending_actions</span>
                </div>
                <div className="metric-card-value" style={{ color: '#9a3412' }}>{rmaActiveCount}</div>
                <div className="metric-card-label">Active Returns</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#fee2e2', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#991b1b' }}>priority_high</span>
                </div>
                <div className="metric-card-value" style={{ color: '#991b1b' }}>{rmaCriticalCount}</div>
                <div className="metric-card-label">Critical Priority</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#dbeafe', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#1e40af' }}>local_shipping</span>
                </div>
                <div className="metric-card-value" style={{ color: '#1e40af' }}>{rmaVendorCount}</div>
                <div className="metric-card-label">Sent to Vendor</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#d1fae5', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#065f46' }}>task_alt</span>
                </div>
                <div className="metric-card-value" style={{ color: '#065f46' }}>{rmaResolvedMonth}</div>
                <div className="metric-card-label">Resolved This Month</div>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <select className="form-select" style={{ minWidth: 160, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterRMAStatus} onChange={e => setFilterRMAStatus(e.target.value as 'all' | RMAStatus)}>
                <option value="all">All Statuses</option>
                {(Object.keys(RMA_STEP_LABELS) as RMAStatus[]).map(s => (
                  <option key={s} value={s}>{RMA_STEP_LABELS[s]}</option>
                ))}
              </select>
              <select className="form-select" style={{ minWidth: 160, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterRMAPriority} onChange={e => setFilterRMAPriority(e.target.value as 'all' | RMAPriority)}>
                <option value="all">All Priorities</option>
                {(Object.keys(PRIORITY_STYLE) as RMAPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_STYLE[p].label}</option>
                ))}
              </select>
            </div>

            {/* RMA Cards */}
            {visibleRMAs.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">assignment_return</span>
                <h3>No return requests found</h3>
                <p>Raise a return request when a product is defective or needs replacement.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {visibleRMAs.map(rma => {
                  const expanded = expandedRMA === rma.id;
                  const stepIndex = RMA_STEPS.indexOf(rma.status);
                  const pStyle = PRIORITY_STYLE[rma.priority];
                  const nextStatus = RMA_NEXT[rma.status];
                  return (
                    <div key={rma.id} className="card" style={{ padding: '1.25rem' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{rma.rmaNumber}</span>
                            <span className="chip" style={{ background: pStyle.bg, color: pStyle.color, fontSize: '0.6875rem', fontWeight: 700 }}>{pStyle.label}</span>
                            {rma.status === 'rejected' ? (
                              <span className="chip chip-error" style={{ fontSize: '0.6875rem' }}>Rejected</span>
                            ) : (
                              <span className="chip chip-info" style={{ fontSize: '0.6875rem' }}>{RMA_STEP_LABELS[rma.status]}</span>
                            )}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rma.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{rma.sku} · {rma.storeName} · Qty: {rma.quantity}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="chip" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.6875rem' }}>
                            {DEFECT_LABELS[rma.defectType]}
                          </span>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => setExpandedRMA(expanded ? null : rma.id)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              {expanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Status stepper */}
                      {rma.status !== 'rejected' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: '1rem', marginBottom: '0.5rem' }}>
                          {RMA_STEPS.map((step, i) => {
                            const active = i <= stepIndex;
                            return (
                              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < RMA_STEPS.length - 1 ? 1 : 'none' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                  <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: active ? 'var(--primary)' : 'var(--surface-container)',
                                    border: active ? '2px solid var(--primary)' : '2px solid var(--outline-variant)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                  }}>
                                    {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                                  </div>
                                  <span style={{ fontSize: '0.625rem', color: active ? 'var(--primary)' : 'var(--secondary)', whiteSpace: 'nowrap', fontWeight: active ? 600 : 400 }}>
                                    {RMA_STEP_LABELS[step]}
                                  </span>
                                </div>
                                {i < RMA_STEPS.length - 1 && (
                                  <div style={{ flex: 1, height: 2, background: i < stepIndex ? 'var(--primary)' : 'var(--surface-container)', margin: '0 0.25rem', marginBottom: '1rem' }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Expanded detail */}
                      {expanded && (
                        <div style={{ marginTop: '0.75rem', padding: '0.875rem', background: 'var(--surface-container)', borderRadius: '0.625rem' }}>
                          <div style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>Defect Description: </span>
                            {rma.defectDescription}
                          </div>
                          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                            <div><span style={{ color: 'var(--secondary)' }}>Vendor: </span>{rma.vendorName}</div>
                            {rma.vendorContact && <div><span style={{ color: 'var(--secondary)' }}>Contact: </span>{rma.vendorContact}</div>}
                            {rma.trackingNumber && <div><span style={{ color: 'var(--secondary)' }}>Tracking: </span>{rma.trackingNumber}</div>}
                            <div><span style={{ color: 'var(--secondary)' }}>Reported by: </span>{rma.reportedBy}</div>
                            <div><span style={{ color: 'var(--secondary)' }}>Initiated: </span>{fmtDate(rma.initiatedAt)}</div>
                          </div>
                          {rma.notes && (
                            <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--amber-container)', borderRadius: '0.375rem', fontSize: '0.8125rem', color: 'var(--on-amber)' }}>
                              <strong>Note:</strong> {rma.notes}
                            </div>
                          )}
                          {(rma.status === 'resolved' || rma.status === 'rejected') && rma.resolution && (
                            <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#d1fae5', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#065f46' }}>
                              <strong>Resolution:</strong> {RESOLUTION_LABELS[rma.resolution]}
                              {rma.resolutionNotes && ' — ' + rma.resolutionNotes}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {isAdmin && rma.status !== 'resolved' && rma.status !== 'rejected' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
                          {nextStatus && nextStatus !== 'resolved' && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleAdvanceRMA(rma)}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
                              Mark as {RMA_STEP_LABELS[nextStatus]}
                            </button>
                          )}
                          {nextStatus === 'resolved' && (
                            <button className="btn btn-primary btn-sm" onClick={() => setResolveState({ rma, resolution: 'repair', notes: '' })}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>task_alt</span>
                              Resolve Return
                            </button>
                          )}
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectRMA(rma)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cancel</span>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: AMC ── */}
        {activeTab === 'amc' && (
          <div>
            {/* Service due callout */}
            {amcServiceSoon && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.125rem', background: '#fef3c7', borderRadius: '0.75rem', marginBottom: '1.25rem', border: '1px solid #fcd34d' }}>
                <span className="material-symbols-outlined" style={{ color: '#92400e', flexShrink: 0 }}>warning</span>
                <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
                  <strong>Service Due Soon</strong> — One or more contracts have a service due within the next 7 days. Please coordinate with the vendor.
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#d1fae5', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#065f46' }}>contract</span>
                </div>
                <div className="metric-card-value" style={{ color: '#065f46' }}>{amcActive}</div>
                <div className="metric-card-label">Active Contracts</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#fef3c7', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#92400e' }}>schedule</span>
                </div>
                <div className="metric-card-value" style={{ color: '#92400e' }}>{amcExpiringSoon}</div>
                <div className="metric-card-label">Expiring in 60 days</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#fee2e2', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#991b1b' }}>event_busy</span>
                </div>
                <div className="metric-card-value" style={{ color: '#991b1b' }}>{amcExpired}</div>
                <div className="metric-card-label">Expired</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#dbeafe', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#1e40af' }}>build_circle</span>
                </div>
                <div className="metric-card-value" style={{ color: '#1e40af' }}>{amcDueService}</div>
                <div className="metric-card-label">Due for Service</div>
              </div>
            </div>

            {visibleAMCs.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">engineering</span>
                <h3>No AMC contracts</h3>
                <p>No annual maintenance contracts have been added yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
                {visibleAMCs.map(contract => {
                  const daysEnd = daysUntil(contract.endDate);
                  const daysService = daysUntil(contract.nextServiceDate);
                  const totalDays = Math.max(1, Math.round((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / 86400000));
                  const elapsed = Math.max(0, Math.round((new Date().getTime() - new Date(contract.startDate).getTime()) / 86400000));
                  const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
                  const cvStyle = COVERAGE_STYLE[contract.coverageType];
                  const serviceColor = daysService < 0 ? '#991b1b' : daysService <= 14 ? '#92400e' : '#065f46';
                  const serviceBg = daysService < 0 ? '#fee2e2' : daysService <= 14 ? '#fef3c7' : '#d1fae5';
                  return (
                    <div key={contract.id} className="card" style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--secondary)', marginBottom: '0.125rem' }}>{contract.contractNumber}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{contract.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{contract.sku} · {contract.storeName}</div>
                        </div>
                        <span className="chip" style={{ background: cvStyle.bg, color: cvStyle.color, fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                          {cvStyle.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', color: 'var(--secondary)', marginRight: '0.25rem' }}>business</span>
                        {contract.vendorName}
                        <span style={{ color: 'var(--secondary)', marginLeft: '0.5rem' }}>{contract.vendorContact}</span>
                      </div>

                      {/* Contract period + progress */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>
                          <span>{contract.startDate}</span>
                          <span>{contract.endDate} {daysEnd > 0 ? `(${daysEnd}d left)` : '(Expired)'}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: progress + '%', height: '100%', background: daysEnd > 60 ? 'var(--primary)' : daysEnd > 0 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.8125rem' }}>
                          <span style={{ color: 'var(--secondary)' }}>Frequency: </span>
                          <span className="chip" style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.6875rem' }}>{FREQ_LABELS[contract.serviceFrequency]}</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                          Last service: {contract.lastServiceDate ? fmtDate(contract.lastServiceDate) : 'Never'}
                        </div>
                      </div>

                      {/* Next service countdown */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', background: serviceBg, borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: serviceColor, fontWeight: 600 }}>NEXT SERVICE</div>
                          <div style={{ fontSize: '0.8125rem', color: serviceColor }}>{fmtDate(contract.nextServiceDate)}</div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: serviceColor }}>
                          {daysService < 0 ? Math.abs(daysService) + 'd overdue' : daysService === 0 ? 'Today!' : daysService + 'd'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>₹{contract.annualCost.toLocaleString('en-IN')}<span style={{ fontSize: '0.6875rem', fontWeight: 400, color: 'var(--secondary)' }}>/yr</span></div>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleLogService(contract)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                          Log Service Done
                        </button>
                      </div>
                      {contract.notes && (
                        <div style={{ marginTop: '0.625rem', fontSize: '0.75rem', color: 'var(--secondary)', fontStyle: 'italic' }}>{contract.notes}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: VAULT ── */}
        {activeTab === 'vault' && (
          <div>
            {/* Stats */}
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: 'rgba(0,71,141,0.08)', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>folder</span>
                </div>
                <div className="metric-card-value">{docTotal}</div>
                <div className="metric-card-label">Total Documents</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#fef3c7', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#92400e' }}>event_upcoming</span>
                </div>
                <div className="metric-card-value" style={{ color: '#92400e' }}>{docExpiring}</div>
                <div className="metric-card-label">Expiring in 30 days</div>
              </div>
              <div className="metric-card">
                <div className="metric-card-icon" style={{ background: '#d1fae5', marginBottom: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ color: '#065f46' }}>devices</span>
                </div>
                <div className="metric-card-value" style={{ color: '#065f46' }}>{docProductsCovered}</div>
                <div className="metric-card-label">Products Covered</div>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <select className="form-select" style={{ minWidth: 160, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                value={filterDocType} onChange={e => setFilterDocType(e.target.value as 'all' | AssetDocType)}>
                <option value="all">All Doc Types</option>
                {(Object.keys(DOC_LABELS) as AssetDocType[]).map(t => (
                  <option key={t} value={t}>{DOC_LABELS[t]}</option>
                ))}
              </select>
              <input className="form-input" style={{ minWidth: 220, borderRadius: '0.5rem', padding: '0.4rem 0.75rem' }}
                placeholder="Search by product..." value={filterDocProduct}
                onChange={e => setFilterDocProduct(e.target.value)} />
            </div>

            {docGroups.length === 0 ? (
              <div className="empty-state">
                <span className="material-symbols-outlined">folder_open</span>
                <h3>No documents yet</h3>
                <p>Attach manuals, invoices, insurance papers, and warranty cards to your products.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {docGroups.map(group => (
                  <div key={group.productName}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>inventory_2</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{group.productName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{group.sku}</span>
                      <span className="chip" style={{ background: 'var(--surface-container)', color: 'var(--secondary)', fontSize: '0.6875rem' }}>
                        {group.docs.length} doc{group.docs.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                      {group.docs.map(doc => {
                        const expiryDays = doc.expiryDate ? daysUntil(doc.expiryDate) : null;
                        const expiryWarn = expiryDays !== null && expiryDays >= 0 && expiryDays <= 30;
                        return (
                          <div key={doc.id} className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.625rem' }}>
                              <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'rgba(0,71,141,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>{DOC_ICONS[doc.docType]}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.title}>{doc.title}</div>
                                <span className="chip" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.625rem' }}>{DOC_LABELS[doc.docType]}</span>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.fileName}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: '0.25rem' }}>attach_file</span>
                              {doc.fileName} · {fmtFileSize(doc.fileSize)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: '0.375rem' }}>
                              Uploaded {fmtDate(doc.uploadedAt)} by {doc.uploadedBy}
                            </div>
                            {doc.expiryDate && (
                              <div style={{ fontSize: '0.75rem', color: expiryWarn ? '#92400e' : 'var(--secondary)', marginBottom: '0.375rem', fontWeight: expiryWarn ? 600 : 400 }}>
                                {expiryWarn && <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: '0.25rem' }}>warning</span>}
                                Expires: {fmtDate(doc.expiryDate)}
                                {expiryWarn && ` (${expiryDays}d)`}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem' }}>
                              <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => showToast('Document preview requires a backend integration.')}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                                View
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }}
                                onClick={() => handleDeleteDoc(doc)} title="Delete">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create RMA Modal ── */}
      {showCreateRMA && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateRMA(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>New Return Request</h3>
              <button className="modal-close" onClick={() => setShowCreateRMA(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-select" value={rmaForm.productId}
                onChange={e => setRmaForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">Select a product...</option>
                {visibleProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {p.storeName}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Defect Type *</label>
                <select className="form-select" value={rmaForm.defectType}
                  onChange={e => setRmaForm(f => ({ ...f, defectType: e.target.value as RMADefectType }))}>
                  {(Object.keys(DEFECT_LABELS) as RMADefectType[]).map(d => <option key={d} value={d}>{DEFECT_LABELS[d]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority *</label>
                <select className="form-select" value={rmaForm.priority}
                  onChange={e => setRmaForm(f => ({ ...f, priority: e.target.value as RMAPriority }))}>
                  {(Object.keys(PRIORITY_STYLE) as RMAPriority[]).map(p => <option key={p} value={p}>{PRIORITY_STYLE[p].label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Defect Description *</label>
              <textarea className="form-input" rows={3} value={rmaForm.defectDescription}
                onChange={e => setRmaForm(f => ({ ...f, defectDescription: e.target.value }))}
                placeholder="Describe the defect in detail..." style={{ resize: 'vertical' }} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vendor / Service Centre *</label>
                <input className="form-input" value={rmaForm.vendorName}
                  onChange={e => setRmaForm(f => ({ ...f, vendorName: e.target.value }))}
                  placeholder="e.g. HP India Service" />
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Contact</label>
                <input className="form-input" value={rmaForm.vendorContact}
                  onChange={e => setRmaForm(f => ({ ...f, vendorContact: e.target.value }))}
                  placeholder="+91-..." />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" min={1} value={rmaForm.quantity}
                onChange={e => setRmaForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={rmaForm.notes}
                onChange={e => setRmaForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..." style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateRMA(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateRMA}>Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve RMA Modal ── */}
      {resolveState && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setResolveState(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Resolve Return — {resolveState.rma.rmaNumber}</h3>
              <button className="modal-close" onClick={() => setResolveState(null)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Resolution *</label>
              <select className="form-select" value={resolveState.resolution}
                onChange={e => setResolveState(s => s ? { ...s, resolution: e.target.value as RMAResolution } : s)}>
                {(Object.keys(RESOLUTION_LABELS) as RMAResolution[]).map(r => <option key={r} value={r}>{RESOLUTION_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Resolution Notes</label>
              <textarea className="form-input" rows={3} value={resolveState.notes}
                onChange={e => setResolveState(s => s ? { ...s, notes: e.target.value } : s)}
                placeholder="Describe the resolution outcome..." style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResolveState(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResolveRMA}>Mark Resolved</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create AMC Modal ── */}
      {showCreateAMC && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateAMC(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3>New AMC Contract</h3>
              <button className="modal-close" onClick={() => setShowCreateAMC(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-select" value={amcForm.productId}
                onChange={e => setAmcForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">Select a product...</option>
                {visibleProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {p.storeName}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vendor Name *</label>
                <input className="form-input" value={amcForm.vendorName}
                  onChange={e => setAmcForm(f => ({ ...f, vendorName: e.target.value }))}
                  placeholder="e.g. TechCare Solutions" />
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Contact</label>
                <input className="form-input" value={amcForm.vendorContact}
                  onChange={e => setAmcForm(f => ({ ...f, vendorContact: e.target.value }))}
                  placeholder="+91-..." />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Vendor Email</label>
              <input className="form-input" type="email" value={amcForm.vendorEmail}
                onChange={e => setAmcForm(f => ({ ...f, vendorEmail: e.target.value }))}
                placeholder="service@vendor.com" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input className="form-input" type="date" value={amcForm.startDate}
                  onChange={e => setAmcForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input className="form-input" type="date" value={amcForm.endDate}
                  onChange={e => setAmcForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Coverage Type</label>
                <select className="form-select" value={amcForm.coverageType}
                  onChange={e => setAmcForm(f => ({ ...f, coverageType: e.target.value as AMCCoverage }))}>
                  {(Object.keys(COVERAGE_STYLE) as AMCCoverage[]).map(c => <option key={c} value={c}>{COVERAGE_STYLE[c].label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Service Frequency</label>
                <select className="form-select" value={amcForm.serviceFrequency}
                  onChange={e => setAmcForm(f => ({ ...f, serviceFrequency: e.target.value as ServiceFrequency }))}>
                  {(Object.keys(FREQ_LABELS) as ServiceFrequency[]).map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Annual Cost (₹)</label>
              <input className="form-input" type="number" min={0} value={amcForm.annualCost}
                onChange={e => setAmcForm(f => ({ ...f, annualCost: e.target.value }))}
                placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={amcForm.notes}
                onChange={e => setAmcForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..." style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateAMC(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateAMC}>Create Contract</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Doc Modal ── */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUploadModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Upload Document</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-select" value={uploadForm.productId}
                onChange={e => setUploadForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">Select a product...</option>
                {visibleProducts.map(p => <option key={p.id} value={p.id}>{p.name} — {p.storeName}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Document Type *</label>
                <select className="form-select" value={uploadForm.docType}
                  onChange={e => setUploadForm(f => ({ ...f, docType: e.target.value as AssetDocType }))}>
                  {(Object.keys(DOC_LABELS) as AssetDocType[]).map(t => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input className="form-input" value={uploadForm.title}
                onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Dell OptiPlex User Manual" />
            </div>
            <div className="form-group">
              <label className="form-label">File *</label>
              <input type="file" className="form-input" style={{ padding: '0.375rem 0.75rem' }}
                onChange={e => {
                  const file = e.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  if (file) setUploadForm(f => ({ ...f, fileName: file.name }));
                }} />
              {!selectedFile && (
                <input className="form-input" style={{ marginTop: '0.5rem' }} value={uploadForm.fileName}
                  onChange={e => setUploadForm(f => ({ ...f, fileName: e.target.value }))}
                  placeholder="Or enter file name manually..." />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-input" type="date" value={uploadForm.expiryDate}
                onChange={e => setUploadForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={uploadForm.notes}
                onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..." style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload}>Upload Document</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
