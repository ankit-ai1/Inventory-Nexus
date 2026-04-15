import type { User, Store, Product, AppNotification, AuditLog, PurchaseOrder, StockTransfer } from '../types';

export const DUMMY_USERS: User[] = [
  { id: 'u1', name: 'Alex Sterling', email: 'alex.sterling@nexus.com', role: 'head_admin', status: 'active', createdAt: '2024-01-10' },
  { id: 'u2', name: 'Jordan Patel', email: 'jordan.patel@nexus.com', role: 'store_manager', storeId: 's1', storeName: 'Downtown Hub A1', status: 'active', createdAt: '2024-02-15' },
  { id: 'u3', name: 'Morgan Lee', email: 'morgan.lee@nexus.com', role: 'store_manager', storeId: 's2', storeName: 'Westside Depot B2', status: 'active', createdAt: '2024-03-05' },
  { id: 'u4', name: 'Riley Chen', email: 'riley.chen@nexus.com', role: 'store_manager', storeId: 's3', storeName: 'North Gate C3', status: 'inactive', createdAt: '2024-03-22' },
  { id: 'u5', name: 'Avery Smith', email: 'avery.smith@nexus.com', role: 'store_manager', storeId: 's4', storeName: 'Eastview Warehouse D4', status: 'active', createdAt: '2024-04-11' },
  { id: 'u6', name: 'Sam Torres', email: 'sam.torres@nexus.com', role: 'store_manager', storeId: 's5', storeName: 'Harbor Point E5', status: 'active', createdAt: '2024-05-01' },
];

export const DUMMY_STORES: Store[] = [
  { id: 's1', name: 'Downtown Hub A1', location: 'Mumbai, Maharashtra', managerName: 'Jordan Patel', managerId: 'u2', productCount: 142, status: 'active', createdAt: '2024-01-20' },
  { id: 's2', name: 'Westside Depot B2', location: 'Delhi, NCR', managerName: 'Morgan Lee', managerId: 'u3', productCount: 98, status: 'active', createdAt: '2024-02-05' },
  { id: 's3', name: 'North Gate C3', location: 'Bangalore, Karnataka', managerName: 'Riley Chen', managerId: 'u4', productCount: 67, status: 'inactive', createdAt: '2024-02-20' },
  { id: 's4', name: 'Eastview Warehouse D4', location: 'Chennai, Tamil Nadu', managerName: 'Avery Smith', managerId: 'u5', productCount: 215, status: 'active', createdAt: '2024-03-15' },
  { id: 's5', name: 'Harbor Point E5', location: 'Hyderabad, Telangana', managerName: 'Sam Torres', managerId: 'u6', productCount: 88, status: 'active', createdAt: '2024-04-01' },
  { id: 's6', name: 'Sunrise Logistics F6', location: 'Pune, Maharashtra', productCount: 0, status: 'active', createdAt: '2024-05-10' },
];

function getStockStatus(qty: number) {
  if (qty === 0) return 'out_of_stock' as const;
  if (qty <= 10) return 'low_stock' as const;
  return 'in_stock' as const;
}

function getWarrantyStatus(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired' as const;
  if (diff <= 30) return 'expiring_soon' as const;
  return 'active' as const;
}

const rawProducts = [
  { id: 'p1', name: 'Dell OptiPlex 7000', sku: 'DOP-7000-X', category: 'Desktops', quantity: 45, price: 82500, wStart: '2022-06-01', wEnd: '2025-06-01', storeId: 's1', storeName: 'Downtown Hub A1' },
  { id: 'p2', name: 'HP ProBook 450 G9', sku: 'HPB-450G9', category: 'Laptops', quantity: 8, price: 62000, wStart: '2023-01-15', wEnd: '2026-01-15', storeId: 's1', storeName: 'Downtown Hub A1' },
  { id: 'p3', name: 'Lenovo ThinkPad X1', sku: 'LTP-X1-C10', category: 'Laptops', quantity: 0, price: 135000, wStart: '2022-03-10', wEnd: '2025-03-10', storeId: 's1', storeName: 'Downtown Hub A1' },
  { id: 'p4', name: 'Samsung 27" 4K Monitor', sku: 'SAM-27-4K', category: 'Monitors', quantity: 23, price: 38000, wStart: '2023-07-01', wEnd: '2026-07-01', storeId: 's2', storeName: 'Westside Depot B2' },
  { id: 'p5', name: 'Cisco Catalyst 2960', sku: 'CIS-2960-X', category: 'Networking', quantity: 5, price: 45000, wStart: '2021-11-20', wEnd: '2024-11-20', storeId: 's2', storeName: 'Westside Depot B2' },
  { id: 'p6', name: 'Apple MacBook Pro 14"', sku: 'APL-MBP-14', category: 'Laptops', quantity: 12, price: 210000, wStart: '2024-01-05', wEnd: '2027-01-05', storeId: 's2', storeName: 'Westside Depot B2' },
  { id: 'p7', name: 'Logitech MX Master 3', sku: 'LOG-MX3-S', category: 'Peripherals', quantity: 3, price: 9500, wStart: '2023-09-01', wEnd: '2025-09-01', storeId: 's3', storeName: 'North Gate C3' },
  { id: 'p8', name: 'APC UPS 1500VA', sku: 'APC-UPS-15', category: 'Power', quantity: 0, price: 18500, wStart: '2022-05-15', wEnd: '2024-05-15', storeId: 's4', storeName: 'Eastview Warehouse D4' },
  { id: 'p9', name: 'HP LaserJet Pro M404', sku: 'HPL-404-N', category: 'Printers', quantity: 17, price: 28000, wStart: '2023-03-20', wEnd: '2026-03-20', storeId: 's4', storeName: 'Eastview Warehouse D4' },
  { id: 'p10', name: 'Intel NUC 12 Pro', sku: 'INT-NUC12', category: 'Mini PCs', quantity: 7, price: 55000, wStart: '2023-11-01', wEnd: '2025-11-01', storeId: 's5', storeName: 'Harbor Point E5' },
  { id: 'p11', name: 'Ubiquiti UniFi AP', sku: 'UBQ-UAP-AC', category: 'Networking', quantity: 2, price: 14000, wStart: '2023-04-10', wEnd: '2025-04-10', storeId: 's5', storeName: 'Harbor Point E5' },
  { id: 'p12', name: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW', category: 'Storage', quantity: 31, price: 8200, wStart: '2024-02-01', wEnd: '2027-02-01', storeId: 's4', storeName: 'Eastview Warehouse D4' },
  { id: 'p13', name: 'Synology DS920+', sku: 'SYN-DS920', category: 'Storage', quantity: 9, price: 48000, wStart: '2022-08-15', wEnd: '2025-08-15', storeId: 's1', storeName: 'Downtown Hub A1' },
  { id: 'p14', name: 'Jabra Evolve2 85', sku: 'JAB-EV2-85', category: 'Peripherals', quantity: 4, price: 22000, wStart: '2023-06-20', wEnd: '2025-06-20', storeId: 's2', storeName: 'Westside Depot B2' },
  { id: 'p15', name: 'Asus ProArt PA278', sku: 'ASUS-PA278', category: 'Monitors', quantity: 0, price: 52000, wStart: '2021-12-01', wEnd: '2024-12-01', storeId: 's3', storeName: 'North Gate C3' },
];

export const DUMMY_PRODUCTS: Product[] = rawProducts.map(p => ({
  ...p,
  warrantyStartDate: p.wStart,
  warrantyEndDate: p.wEnd,
  stockStatus: getStockStatus(p.quantity),
  warrantyStatus: getWarrantyStatus(p.wEnd),
  createdAt: p.wStart,
}));

export const LOGIN_CREDENTIALS = [
  { email: 'alex.sterling@nexus.com', password: 'admin123', userId: 'u1' },
  { email: 'jordan.patel@nexus.com', password: 'store123', userId: 'u2' },
  { email: 'morgan.lee@nexus.com', password: 'store123', userId: 'u3' },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const DUMMY_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1', type: 'out_of_stock', read: false,
    title: 'Out of Stock Alert',
    message: 'Lenovo ThinkPad X1 (Downtown Hub A1) has reached 0 units.',
    createdAt: '2026-04-15T08:12:00', storeId: 's1', productId: 'p3', link: '/inventory/p3',
  },
  {
    id: 'n2', type: 'out_of_stock', read: false,
    title: 'Out of Stock Alert',
    message: 'APC UPS 1500VA (Eastview Warehouse D4) has reached 0 units.',
    createdAt: '2026-04-15T08:10:00', storeId: 's4', productId: 'p8', link: '/inventory/p8',
  },
  {
    id: 'n3', type: 'low_stock', read: false,
    title: 'Low Stock Warning',
    message: 'HP ProBook 450 G9 — only 8 units left at Downtown Hub A1.',
    createdAt: '2026-04-14T14:30:00', storeId: 's1', productId: 'p2', link: '/inventory/p2',
  },
  {
    id: 'n4', type: 'low_stock', read: true,
    title: 'Low Stock Warning',
    message: 'Cisco Catalyst 2960 — only 5 units left at Westside Depot B2.',
    createdAt: '2026-04-14T11:00:00', storeId: 's2', productId: 'p5', link: '/inventory/p5',
  },
  {
    id: 'n5', type: 'low_stock', read: false,
    title: 'Low Stock Warning',
    message: 'Ubiquiti UniFi AP — only 2 units left at Harbor Point E5.',
    createdAt: '2026-04-13T09:45:00', storeId: 's5', productId: 'p11', link: '/inventory/p11',
  },
  {
    id: 'n6', type: 'warranty_expiring', read: false,
    title: 'Warranty Expiring Soon',
    message: 'Dell OptiPlex 7000 warranty expires on 2025-06-01 (47 days remaining).',
    createdAt: '2026-04-13T09:00:00', storeId: 's1', productId: 'p1', link: '/inventory/p1',
  },
  {
    id: 'n7', type: 'warranty_expiring', read: true,
    title: 'Warranty Expiring Soon',
    message: 'Lenovo ThinkPad X1 warranty expired on 2025-03-10.',
    createdAt: '2026-04-12T10:00:00', storeId: 's1', productId: 'p3',
  },
  {
    id: 'n8', type: 'purchase_order', read: true,
    title: 'Purchase Order Approved',
    message: 'PO-2026-001 has been approved by Alex Sterling. Items are on their way.',
    createdAt: '2026-04-12T15:30:00', link: '/purchase-orders',
  },
  {
    id: 'n9', type: 'transfer', read: true,
    title: 'Transfer Completed',
    message: 'Transfer TR-2026-001 of 5 units of Dell OptiPlex 7000 from Downtown Hub to Westside Depot is complete.',
    createdAt: '2026-04-11T16:00:00', link: '/transfers',
  },
  {
    id: 'n10', type: 'system', read: true,
    title: 'System Announcement',
    message: 'Inventory Nexus v2.0 is now live. New features: Reports, Notifications, Purchase Orders, and Transfers.',
    createdAt: '2026-04-10T09:00:00',
  },
];

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const DUMMY_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'al1', action: 'login', module: 'auth', entityId: 'u1',
    entityName: 'Alex Sterling', details: 'Admin logged in',
    userId: 'u1', userName: 'Alex Sterling', timestamp: '2026-04-15T08:00:00',
  },
  {
    id: 'al2', action: 'create', module: 'product', entityId: 'p2',
    entityName: 'HP ProBook 450 G9', details: 'Product added to Downtown Hub A1',
    userId: 'u2', userName: 'Jordan Patel', timestamp: '2026-04-14T10:20:00',
  },
  {
    id: 'al3', action: 'update', module: 'product', entityId: 'p1',
    entityName: 'Dell OptiPlex 7000',
    details: 'Quantity updated from 50 to 45',
    userId: 'u2', userName: 'Jordan Patel', timestamp: '2026-04-14T10:05:00',
    changes: [{ field: 'Quantity', from: '50', to: '45' }],
  },
  {
    id: 'al4', action: 'approve', module: 'purchase_order', entityId: 'po1',
    entityName: 'PO-2026-001', details: 'Purchase order approved by Head Admin',
    userId: 'u1', userName: 'Alex Sterling', timestamp: '2026-04-12T15:30:00',
  },
  {
    id: 'al5', action: 'create', module: 'purchase_order', entityId: 'po1',
    entityName: 'PO-2026-001', details: 'Purchase order raised by Jordan Patel for 10x HP ProBook',
    userId: 'u2', userName: 'Jordan Patel', timestamp: '2026-04-12T09:00:00',
  },
  {
    id: 'al6', action: 'approve', module: 'transfer', entityId: 'tr1',
    entityName: 'TR-2026-001', details: 'Stock transfer approved and completed',
    userId: 'u1', userName: 'Alex Sterling', timestamp: '2026-04-11T16:00:00',
  },
  {
    id: 'al7', action: 'create', module: 'transfer', entityId: 'tr1',
    entityName: 'TR-2026-001', details: 'Transfer request: 5x Dell OptiPlex 7000 from Downtown Hub to Westside Depot',
    userId: 'u2', userName: 'Jordan Patel', timestamp: '2026-04-11T09:30:00',
  },
  {
    id: 'al8', action: 'delete', module: 'product', entityId: 'px1',
    entityName: 'Old Keyboard Model K1', details: 'Product deleted (discontinued)',
    userId: 'u5', userName: 'Avery Smith', timestamp: '2026-04-10T14:00:00',
  },
  {
    id: 'al9', action: 'status_change', module: 'user', entityId: 'u4',
    entityName: 'Riley Chen', details: 'User account disabled',
    userId: 'u1', userName: 'Alex Sterling', timestamp: '2026-04-09T11:00:00',
    changes: [{ field: 'Status', from: 'active', to: 'inactive' }],
  },
  {
    id: 'al10', action: 'create', module: 'store', entityId: 's6',
    entityName: 'Sunrise Logistics F6', details: 'New store added in Pune, Maharashtra',
    userId: 'u1', userName: 'Alex Sterling', timestamp: '2026-04-08T10:00:00',
  },
  {
    id: 'al11', action: 'update', module: 'product', entityId: 'p4',
    entityName: 'Samsung 27" 4K Monitor', details: 'Price updated',
    userId: 'u3', userName: 'Morgan Lee', timestamp: '2026-04-08T09:15:00',
    changes: [{ field: 'Price', from: '35000', to: '38000' }],
  },
  {
    id: 'al12', action: 'reject', module: 'purchase_order', entityId: 'po3',
    entityName: 'PO-2026-003', details: 'PO rejected — budget exceeded this quarter',
    userId: 'u1', userName: 'Alex Sterling', timestamp: '2026-04-07T14:00:00',
  },
  {
    id: 'al13', action: 'receive', module: 'purchase_order', entityId: 'po2',
    entityName: 'PO-2026-002', details: 'Stock received — inventory updated automatically',
    userId: 'u5', userName: 'Avery Smith', timestamp: '2026-04-06T11:30:00',
  },
  {
    id: 'al14', action: 'create', module: 'user', entityId: 'u6',
    entityName: 'Sam Torres', details: 'New user created and assigned to Harbor Point E5',
    userId: 'u1', userName: 'Alex Sterling', timestamp: '2026-04-05T09:00:00',
  },
  {
    id: 'al15', action: 'login', module: 'auth', entityId: 'u2',
    entityName: 'Jordan Patel', details: 'Store Manager logged in',
    userId: 'u2', userName: 'Jordan Patel', timestamp: '2026-04-05T08:30:00',
  },
];

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const DUMMY_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po1', poNumber: 'PO-2026-001', status: 'received',
    storeId: 's1', storeName: 'Downtown Hub A1',
    requestedBy: 'Jordan Patel', requestedById: 'u2',
    items: [
      { productName: 'HP ProBook 450 G9', sku: 'HPB-450G9', category: 'Laptops', quantity: 10, price: 62000 },
    ],
    justification: 'Running low on laptops for onboarding new staff next month.',
    reviewedBy: 'Alex Sterling', reviewComment: 'Approved. Priority delivery requested.',
    requestedAt: '2026-04-12T09:00:00', reviewedAt: '2026-04-12T15:30:00',
    receivedAt: '2026-04-13T11:00:00', totalValue: 620000,
  },
  {
    id: 'po2', poNumber: 'PO-2026-002', status: 'received',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    requestedBy: 'Avery Smith', requestedById: 'u5',
    items: [
      { productName: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW', category: 'Storage', quantity: 20, price: 8200 },
      { productName: 'APC UPS 1500VA', sku: 'APC-UPS-15', category: 'Power', quantity: 5, price: 18500 },
    ],
    justification: 'Storage expansion project underway. UPS units needed for server room.',
    reviewedBy: 'Alex Sterling', reviewComment: 'Approved. Good planning ahead.',
    requestedAt: '2026-04-03T10:00:00', reviewedAt: '2026-04-04T09:00:00',
    receivedAt: '2026-04-06T11:30:00', totalValue: 256500,
  },
  {
    id: 'po3', poNumber: 'PO-2026-003', status: 'rejected',
    storeId: 's2', storeName: 'Westside Depot B2',
    requestedBy: 'Morgan Lee', requestedById: 'u3',
    items: [
      { productName: 'Apple MacBook Pro 14"', sku: 'APL-MBP-14', category: 'Laptops', quantity: 8, price: 210000 },
    ],
    justification: 'Request for high-performance laptops for design team.',
    reviewedBy: 'Alex Sterling', reviewComment: 'Rejected — budget limit exceeded this quarter. Re-raise in Q3.',
    requestedAt: '2026-04-05T14:00:00', reviewedAt: '2026-04-07T14:00:00',
    totalValue: 1680000,
  },
  {
    id: 'po4', poNumber: 'PO-2026-004', status: 'approved',
    storeId: 's5', storeName: 'Harbor Point E5',
    requestedBy: 'Sam Torres', requestedById: 'u6',
    items: [
      { productName: 'Intel NUC 12 Pro', sku: 'INT-NUC12', category: 'Mini PCs', quantity: 5, price: 55000 },
      { productName: 'Ubiquiti UniFi AP', sku: 'UBQ-UAP-AC', category: 'Networking', quantity: 4, price: 14000 },
    ],
    justification: 'Expanding network infrastructure for new warehouse section.',
    reviewedBy: 'Alex Sterling', reviewComment: 'Approved. Co-ordinate delivery date with supplier.',
    requestedAt: '2026-04-13T11:00:00', reviewedAt: '2026-04-14T10:00:00',
    totalValue: 331000,
  },
  {
    id: 'po5', poNumber: 'PO-2026-005', status: 'pending',
    storeId: 's1', storeName: 'Downtown Hub A1',
    requestedBy: 'Jordan Patel', requestedById: 'u2',
    items: [
      { productName: 'Lenovo ThinkPad X1', sku: 'LTP-X1-C10', category: 'Laptops', quantity: 6, price: 135000 },
    ],
    justification: 'Critical restock needed — ThinkPads are completely out of stock.',
    requestedAt: '2026-04-15T07:30:00', totalValue: 810000,
  },
];

// ─── Stock Transfers ──────────────────────────────────────────────────────────

export const DUMMY_TRANSFERS: StockTransfer[] = [
  {
    id: 'tr1', transferNumber: 'TR-2026-001', status: 'completed',
    fromStoreId: 's1', fromStoreName: 'Downtown Hub A1',
    toStoreId: 's2', toStoreName: 'Westside Depot B2',
    productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X',
    quantity: 5, requestedBy: 'Jordan Patel', requestedById: 'u2',
    approvedBy: 'Alex Sterling',
    notes: 'Westside needs units urgently for client deployment.',
    requestedAt: '2026-04-11T09:30:00', approvedAt: '2026-04-11T15:00:00',
    completedAt: '2026-04-11T16:00:00',
  },
  {
    id: 'tr2', transferNumber: 'TR-2026-002', status: 'approved',
    fromStoreId: 's4', fromStoreName: 'Eastview Warehouse D4',
    toStoreId: 's5', toStoreName: 'Harbor Point E5',
    productId: 'p12', productName: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW',
    quantity: 10, requestedBy: 'Sam Torres', requestedById: 'u6',
    approvedBy: 'Alex Sterling',
    notes: 'Harbor Point is expanding NAS storage. Eastview has excess.',
    requestedAt: '2026-04-14T10:00:00', approvedAt: '2026-04-14T16:30:00',
  },
  {
    id: 'tr3', transferNumber: 'TR-2026-003', status: 'pending',
    fromStoreId: 's2', fromStoreName: 'Westside Depot B2',
    toStoreId: 's1', toStoreName: 'Downtown Hub A1',
    productId: 'p4', productName: 'Samsung 27" 4K Monitor', sku: 'SAM-27-4K',
    quantity: 5, requestedBy: 'Jordan Patel', requestedById: 'u2',
    notes: 'Downtown needs monitors for new workstations setup.',
    requestedAt: '2026-04-15T08:45:00',
  },
  {
    id: 'tr4', transferNumber: 'TR-2026-004', status: 'rejected',
    fromStoreId: 's3', fromStoreName: 'North Gate C3',
    toStoreId: 's4', toStoreName: 'Eastview Warehouse D4',
    productId: 'p7', productName: 'Logitech MX Master 3', sku: 'LOG-MX3-S',
    quantity: 3, requestedBy: 'Avery Smith', requestedById: 'u5',
    approvedBy: 'Alex Sterling',
    notes: 'North Gate C3 is inactive — transfer not permitted from inactive store.',
    requestedAt: '2026-04-10T11:00:00', approvedAt: '2026-04-10T14:00:00',
  },
  {
    id: 'tr5', transferNumber: 'TR-2026-005', status: 'pending',
    fromStoreId: 's4', fromStoreName: 'Eastview Warehouse D4',
    toStoreId: 's6', toStoreName: 'Sunrise Logistics F6',
    productId: 'p9', productName: 'HP LaserJet Pro M404', sku: 'HPL-404-N',
    quantity: 3, requestedBy: 'Avery Smith', requestedById: 'u5',
    notes: 'Seeding initial inventory for the new Sunrise store.',
    requestedAt: '2026-04-15T09:00:00',
  },
];
