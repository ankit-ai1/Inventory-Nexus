export type UserRole = 'head_admin' | 'store_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string;
  storeName?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  managerName?: string;
  managerId?: string;
  productCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  warrantyStartDate: string;
  warrantyEndDate: string;
  storeId: string;
  storeName: string;
  stockStatus: StockStatus;
  warrantyStatus: WarrantyStatus;
  createdAt: string;
  notes?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'warranty_expiring'
  | 'warranty_expired'
  | 'system'
  | 'purchase_order'
  | 'transfer'
  | 'rma'
  | 'amc';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  storeId?: string;
  productId?: string;
  link?: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'status_change'
  | 'approve'
  | 'reject'
  | 'receive';

export type AuditModule =
  | 'product'
  | 'user'
  | 'store'
  | 'purchase_order'
  | 'transfer'
  | 'auth';

export interface AuditChange {
  field: string;
  from: string;
  to: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  module: AuditModule;
  entityId: string;
  entityName: string;
  details: string;
  userId: string;
  userName: string;
  timestamp: string;
  changes?: AuditChange[];
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────

export type POStatus = 'pending' | 'approved' | 'rejected' | 'received' | 'partial';

export interface PurchaseOrderItem {
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  receivedQty?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: POStatus;
  storeId: string;
  storeName: string;
  requestedBy: string;
  requestedById: string;
  items: PurchaseOrderItem[];
  justification: string;
  reviewedBy?: string;
  reviewComment?: string;
  requestedAt: string;
  reviewedAt?: string;
  receivedAt?: string;
  totalValue: number;
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export type SupplierStatus = 'active' | 'inactive';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  status: SupplierStatus;
  rating: 1 | 2 | 3 | 4 | 5;
  totalOrders: number;
  createdAt: string;
  notes?: string;
}

// ─── Maintenance Log ─────────────────────────────────────────────────────────

export type MaintenanceType = 'preventive' | 'corrective' | 'warranty_claim' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MaintenanceLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  storeName: string;
  type: MaintenanceType;
  description: string;
  status: MaintenanceStatus;
  cost?: number;
  scheduledDate: string;
  completedDate?: string;
  technician: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

// ─── Stock Transfers ─────────────────────────────────────────────────────────

export type TransferStatus = 'pending' | 'approved' | 'in_transit' | 'rejected' | 'completed';

export type TransferType = 'push' | 'pull';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  transferType: TransferType;   // push = sending from my store, pull = requesting from another store
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  requestedBy: string;
  requestedById: string;
  requestedByStoreId?: string;  // store that originated the request
  approvedBy?: string;
  notes?: string;
  requestedAt: string;
  approvedAt?: string;
  shippedAt?: string;
  completedAt?: string;
  trackingId?: string;
  receivedByName?: string;
}

// ─── Bin Management ──────────────────────────────────────────────────────────

export type BinStatus = 'empty' | 'occupied' | 'reserved' | 'maintenance';

export interface Bin {
  id: string;
  binCode: string;           // e.g. "A-01-R2" (Zone-Aisle-Rack)
  zone: string;              // "A" | "B" | "C" | "D"
  aisle: string;             // "01" | "02" etc.
  rack: string;              // "R1" | "R2" etc.
  storeId: string;
  storeName: string;
  preferredCategory?: string;
  capacity: number;
  currentQty: number;
  status: BinStatus;
  productId?: string;
  productName?: string;
  qrData: string;
  createdAt: string;
  lastActivityAt?: string;
}

// ─── Stock Batches (FEFO) ────────────────────────────────────────────────────

export type BatchStatus = 'available' | 'reserved' | 'depleted';

export interface StockBatch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  sku: string;
  binId: string;
  binCode: string;
  storeId: string;
  storeName: string;
  quantity: number;
  expiryDate: string;     // used for FEFO sorting
  receivedDate: string;
  status: BatchStatus;
  notes?: string;
}

// ─── RMA (Return Merchandise Authorization) ──────────────────────────────────

export type RMAStatus = 'initiated' | 'received' | 'inspected' | 'sent_to_vendor' | 'resolved' | 'rejected';
export type RMADefectType = 'hardware' | 'software' | 'physical_damage' | 'dead_on_arrival' | 'performance' | 'other';
export type RMAResolution = 'repair' | 'replacement' | 'credit_note' | 'rejected';
export type RMAPriority = 'low' | 'medium' | 'high' | 'critical';

export interface RMA {
  id: string;
  rmaNumber: string;
  status: RMAStatus;
  priority: RMAPriority;
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  storeName: string;
  quantity: number;
  defectType: RMADefectType;
  defectDescription: string;
  reportedBy: string;
  reportedById: string;
  vendorName: string;
  vendorContact?: string;
  trackingNumber?: string;
  resolution?: RMAResolution;
  resolutionNotes?: string;
  initiatedAt: string;
  receivedAt?: string;
  inspectedAt?: string;
  sentToVendorAt?: string;
  resolvedAt?: string;
  notes?: string;
}

// ─── AMC & Service Tracking ───────────────────────────────────────────────────

export type AMCCoverage = 'comprehensive' | 'non_comprehensive' | 'parts_only' | 'labour_only';
export type ServiceFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export interface AMCContract {
  id: string;
  contractNumber: string;
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  storeName: string;
  vendorName: string;
  vendorContact: string;
  vendorEmail?: string;
  startDate: string;
  endDate: string;
  coverageType: AMCCoverage;
  serviceFrequency: ServiceFrequency;
  lastServiceDate?: string;
  nextServiceDate: string;
  annualCost: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// ─── Digital Asset Vault ──────────────────────────────────────────────────────

export type AssetDocType = 'manual' | 'invoice' | 'insurance' | 'warranty_card' | 'amc_contract' | 'compliance_cert' | 'other';

export interface AssetDocument {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  storeName: string;
  docType: AssetDocType;
  title: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedById: string;
  uploadedAt: string;
  expiryDate?: string;
  notes?: string;
}

// ─── Cycle Counting & Reconciliation ─────────────────────────────────────────

export type CycleCountStatus = 'draft' | 'in_progress' | 'completed';

export interface CycleCountItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  systemQty: number;
  countedQty: number | null;   // null = not yet counted
  variance: number;            // countedQty - systemQty (0 if not yet counted)
}

export interface CycleCount {
  id: string;
  ccNumber: string;
  storeId: string;
  storeName: string;
  category: string;            // category being counted, 'All' for full count
  status: CycleCountStatus;
  items: CycleCountItem[];
  createdBy: string;
  createdById: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export type AdjustmentReason = 'damage' | 'theft' | 'counting_error' | 'expiry' | 'found' | 'other';
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';

export interface StockAdjustment {
  id: string;
  adjNumber: string;
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  storeName: string;
  reason: AdjustmentReason;
  systemQty: number;
  adjustedQty: number;
  variance: number;            // adjustedQty - systemQty
  status: AdjustmentStatus;
  notes?: string;
  requestedBy: string;
  requestedById: string;
  reviewedBy?: string;
  requestedAt: string;
  reviewedAt?: string;
  cycleCountId?: string;       // linked cycle count if any
}

// ─── Lead Time & Vendor Intelligence ─────────────────────────────────────────

export type LeadTimeStatus = 'ordered' | 'in_transit' | 'received' | 'overdue';

export interface LeadTimeRecord {
  id: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  storeId: string;
  storeName: string;
  orderedAt: string;
  expectedAt: string;
  receivedAt?: string;
  leadDays?: number;           // actual days from ordered to received
  expectedLeadDays: number;    // promised/expected lead days
  status: LeadTimeStatus;
  notes?: string;
}
