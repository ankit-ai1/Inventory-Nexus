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
  | 'transfer';

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

// ─── Stock Transfers ─────────────────────────────────────────────────────────

export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface StockTransfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
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
  approvedBy?: string;
  notes?: string;
  requestedAt: string;
  approvedAt?: string;
  completedAt?: string;
}
