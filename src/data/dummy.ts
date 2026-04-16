import type { User, Store, Product, AppNotification, AuditLog, PurchaseOrder, StockTransfer, Supplier, MaintenanceLog, Bin, StockBatch, RMA, AMCContract, AssetDocument, CycleCount, StockAdjustment, LeadTimeRecord } from '../types';

export const DUMMY_USERS: User[] = [
  { id: 'u1', name: 'Alex Sterling', email: 'alex.sterling@nexus.com', role: 'head_admin', status: 'active', createdAt: '2024-01-10' },
  { id: 'u2', name: 'Jordan Patel', email: 'jordan.patel@nexus.com', role: 'store_manager', storeId: 's1', storeName: 'Downtown Hub A1', status: 'active', createdAt: '2024-02-15' },
  { id: 'u3', name: 'Morgan Lee', email: 'morgan.lee@nexus.com', role: 'store_manager', storeId: 's2', storeName: 'Westside Depot B2', status: 'active', createdAt: '2024-03-05' },
  { id: 'u4', name: 'Riley Chen', email: 'riley.chen@nexus.com', role: 'store_manager', storeId: 's3', storeName: 'North Gate C3', status: 'active', createdAt: '2024-03-22' },
  { id: 'u5', name: 'Avery Smith', email: 'avery.smith@nexus.com', role: 'store_manager', storeId: 's4', storeName: 'Eastview Warehouse D4', status: 'active', createdAt: '2024-04-11' },
  { id: 'u6', name: 'Sam Torres', email: 'sam.torres@nexus.com', role: 'store_manager', storeId: 's5', storeName: 'Harbor Point E5', status: 'active', createdAt: '2024-05-01' },
];

export const DUMMY_STORES: Store[] = [
  { id: 's1', name: 'Downtown Hub A1', location: 'Mumbai, Maharashtra', managerName: 'Jordan Patel', managerId: 'u2', productCount: 142, status: 'active', createdAt: '2024-01-20' },
  { id: 's2', name: 'Westside Depot B2', location: 'Delhi, NCR', managerName: 'Morgan Lee', managerId: 'u3', productCount: 98, status: 'active', createdAt: '2024-02-05' },
  { id: 's3', name: 'North Gate C3', location: 'Bangalore, Karnataka', managerName: 'Riley Chen', managerId: 'u4', productCount: 67, status: 'active', createdAt: '2024-02-20' },
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
  { email: 'riley.chen@nexus.com', password: 'store456', userId: 'u4' },
  { email: 'avery.smith@nexus.com', password: 'store789', userId: 'u5' },
  { email: 'sam.torres@nexus.com', password: 'store321', userId: 'u6' },
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

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const DUMMY_SUPPLIERS: Supplier[] = [
  {
    id: 'sup1', name: 'TechSource India Pvt. Ltd.', contactPerson: 'Rahul Mehta',
    email: 'rahul.mehta@techsource.in', phone: '+91-98201-11234',
    address: 'Plot 14, MIDC, Andheri East, Mumbai, Maharashtra',
    categories: ['Laptops', 'Desktops', 'Mini PCs'],
    status: 'active', rating: 5, totalOrders: 24, createdAt: '2024-01-15',
    notes: 'Primary supplier for all computing hardware. Offers 3-year extended warranty.',
  },
  {
    id: 'sup2', name: 'NetworkPro Solutions', contactPerson: 'Priya Sharma',
    email: 'priya@networkpro.co.in', phone: '+91-99300-55678',
    address: 'C-12, Sector 63, Noida, Uttar Pradesh',
    categories: ['Networking', 'Peripherals'],
    status: 'active', rating: 4, totalOrders: 16, createdAt: '2024-02-01',
    notes: 'Cisco & Ubiquiti authorised reseller.',
  },
  {
    id: 'sup3', name: 'DisplayTech Bangalore', contactPerson: 'Arjun Nair',
    email: 'arjun@displaytech.in', phone: '+91-80456-77890',
    address: '45, Hosur Road, Electronic City, Bangalore, Karnataka',
    categories: ['Monitors'],
    status: 'active', rating: 4, totalOrders: 11, createdAt: '2024-02-20',
  },
  {
    id: 'sup4', name: 'StorageMart Pvt. Ltd.', contactPerson: 'Kavita Rao',
    email: 'kavita@storagemart.in', phone: '+91-44789-12345',
    address: '78, Anna Salai, Chennai, Tamil Nadu',
    categories: ['Storage', 'Power'],
    status: 'active', rating: 3, totalOrders: 9, createdAt: '2024-03-10',
    notes: 'Good pricing on bulk NAS drives. Delivery can be slow.',
  },
  {
    id: 'sup5', name: 'PrintStar Systems', contactPerson: 'Deepak Joshi',
    email: 'deepak@printstar.in', phone: '+91-20567-89012',
    address: '22, Pimpri-Chinchwad, Pune, Maharashtra',
    categories: ['Printers', 'Peripherals'],
    status: 'inactive', rating: 2, totalOrders: 4, createdAt: '2024-04-05',
    notes: 'On hold — SLA breach in last quarter. Under review.',
  },
  {
    id: 'sup6', name: 'Apple Premium Reseller – HYD', contactPerson: 'Sneha Reddy',
    email: 'sneha@applereseller-hyd.in', phone: '+91-40234-56789',
    address: 'Banjara Hills, Road No. 12, Hyderabad, Telangana',
    categories: ['Laptops'],
    status: 'active', rating: 5, totalOrders: 7, createdAt: '2024-03-25',
    notes: 'Official Apple Authorised Reseller. Premium pricing but guaranteed stock.',
  },
];

// ─── Maintenance Logs ─────────────────────────────────────────────────────────

export const DUMMY_MAINTENANCE_LOGS: MaintenanceLog[] = [
  {
    id: 'ml1', productId: 'p3', productName: 'Lenovo ThinkPad X1', sku: 'LTP-X1-C10',
    storeId: 's1', storeName: 'Downtown Hub A1',
    type: 'warranty_claim', description: 'Keyboard unresponsive — raised warranty claim with Lenovo.',
    status: 'completed', cost: 0, scheduledDate: '2026-03-20', completedDate: '2026-03-28',
    technician: 'Lenovo Service Centre', createdBy: 'Jordan Patel', createdAt: '2026-03-18',
    notes: 'Keyboard replaced under warranty. No extra cost.',
  },
  {
    id: 'ml2', productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X',
    storeId: 's1', storeName: 'Downtown Hub A1',
    type: 'preventive', description: 'Annual hardware health check — dust cleaning, thermal paste replacement.',
    status: 'completed', cost: 2500, scheduledDate: '2026-02-10', completedDate: '2026-02-12',
    technician: 'In-house IT Team', createdBy: 'Jordan Patel', createdAt: '2026-02-08',
  },
  {
    id: 'ml3', productId: 'p8', productName: 'APC UPS 1500VA', sku: 'APC-UPS-15',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    type: 'corrective', description: 'Battery failed — unit not holding charge. Replacement battery ordered.',
    status: 'in_progress', cost: 4200, scheduledDate: '2026-04-10',
    technician: 'APC Certified Partner', createdBy: 'Avery Smith', createdAt: '2026-04-09',
    notes: 'Awaiting battery shipment from supplier.',
  },
  {
    id: 'ml4', productId: 'p5', productName: 'Cisco Catalyst 2960', sku: 'CIS-2960-X',
    storeId: 's2', storeName: 'Westside Depot B2',
    type: 'inspection', description: 'Quarterly network switch inspection — port status, firmware check.',
    status: 'completed', cost: 1500, scheduledDate: '2026-03-01', completedDate: '2026-03-01',
    technician: 'NetworkPro Solutions', createdBy: 'Morgan Lee', createdAt: '2026-02-28',
  },
  {
    id: 'ml5', productId: 'p11', productName: 'Ubiquiti UniFi AP', sku: 'UBQ-UAP-AC',
    storeId: 's5', storeName: 'Harbor Point E5',
    type: 'corrective', description: 'Access point dropping connections intermittently. Firmware reset required.',
    status: 'scheduled', scheduledDate: '2026-04-20',
    technician: 'NetworkPro Solutions', createdBy: 'Sam Torres', createdAt: '2026-04-15',
  },
  {
    id: 'ml6', productId: 'p9', productName: 'HP LaserJet Pro M404', sku: 'HPL-404-N',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    type: 'preventive', description: 'Toner replacement and roller cleaning. Scheduled monthly service.',
    status: 'completed', cost: 3800, scheduledDate: '2026-04-05', completedDate: '2026-04-05',
    technician: 'PrintStar Systems', createdBy: 'Avery Smith', createdAt: '2026-04-04',
  },
  {
    id: 'ml7', productId: 'p13', productName: 'Synology DS920+', sku: 'SYN-DS920',
    storeId: 's1', storeName: 'Downtown Hub A1',
    type: 'inspection', description: 'RAID health check — verify disk array integrity and redundancy.',
    status: 'scheduled', scheduledDate: '2026-04-22',
    technician: 'In-house IT Team', createdBy: 'Alex Sterling', createdAt: '2026-04-15',
    notes: 'Schedule before warranty expires in Aug 2025.',
  },
  {
    id: 'ml8', productId: 'p6', productName: 'Apple MacBook Pro 14"', sku: 'APL-MBP-14',
    storeId: 's2', storeName: 'Westside Depot B2',
    type: 'corrective', description: 'Display flickering reported. Sent to Apple Service for diagnosis.',
    status: 'cancelled', scheduledDate: '2026-03-15',
    technician: 'Apple Premium Reseller – HYD', createdBy: 'Morgan Lee', createdAt: '2026-03-14',
    notes: 'Cancelled — user reported issue resolved after macOS update.',
  },
];

// ─── Bins ─────────────────────────────────────────────────────────────────────

export const DUMMY_BINS: Bin[] = [
  // Downtown Hub A1 — Zone A (Laptops/Desktops)
  { id: 'b1',  binCode: 'A-01-R1', zone: 'A', aisle: '01', rack: 'R1', storeId: 's1', storeName: 'Downtown Hub A1', preferredCategory: 'Desktops',   capacity: 50, currentQty: 45, status: 'occupied',    productId: 'p1',  productName: 'Dell OptiPlex 7000',  qrData: 'BIN:A-01-R1|STORE:s1|CAT:Desktops',   createdAt: '2024-01-20', lastActivityAt: '2026-04-14T10:05:00' },
  { id: 'b2',  binCode: 'A-01-R2', zone: 'A', aisle: '01', rack: 'R2', storeId: 's1', storeName: 'Downtown Hub A1', preferredCategory: 'Laptops',    capacity: 20, currentQty: 8,  status: 'occupied',    productId: 'p2',  productName: 'HP ProBook 450 G9',   qrData: 'BIN:A-01-R2|STORE:s1|CAT:Laptops',    createdAt: '2024-01-20', lastActivityAt: '2026-04-14T09:00:00' },
  { id: 'b3',  binCode: 'A-02-R1', zone: 'A', aisle: '02', rack: 'R1', storeId: 's1', storeName: 'Downtown Hub A1', preferredCategory: 'Laptops',    capacity: 20, currentQty: 0,  status: 'empty',       productId: 'p3',  productName: 'Lenovo ThinkPad X1',  qrData: 'BIN:A-02-R1|STORE:s1|CAT:Laptops',    createdAt: '2024-01-20', lastActivityAt: '2026-04-01T08:00:00' },
  { id: 'b4',  binCode: 'A-02-R2', zone: 'A', aisle: '02', rack: 'R2', storeId: 's1', storeName: 'Downtown Hub A1', preferredCategory: 'Storage',    capacity: 40, currentQty: 9,  status: 'occupied',    productId: 'p13', productName: 'Synology DS920+',     qrData: 'BIN:A-02-R2|STORE:s1|CAT:Storage',    createdAt: '2024-02-01', lastActivityAt: '2026-04-10T11:00:00' },
  { id: 'b5',  binCode: 'B-01-R1', zone: 'B', aisle: '01', rack: 'R1', storeId: 's1', storeName: 'Downtown Hub A1', preferredCategory: 'Peripherals', capacity: 30, currentQty: 0, status: 'empty',                                                           qrData: 'BIN:B-01-R1|STORE:s1|CAT:Peripherals', createdAt: '2024-02-01' },
  // Westside Depot B2 — Zone A (Monitors/Networking)
  { id: 'b6',  binCode: 'A-01-R1', zone: 'A', aisle: '01', rack: 'R1', storeId: 's2', storeName: 'Westside Depot B2', preferredCategory: 'Monitors',    capacity: 30, currentQty: 23, status: 'occupied',   productId: 'p4',  productName: 'Samsung 27" 4K Monitor', qrData: 'BIN:A-01-R1|STORE:s2|CAT:Monitors',    createdAt: '2024-02-05', lastActivityAt: '2026-04-08T09:15:00' },
  { id: 'b7',  binCode: 'A-01-R2', zone: 'A', aisle: '01', rack: 'R2', storeId: 's2', storeName: 'Westside Depot B2', preferredCategory: 'Networking',  capacity: 20, currentQty: 5,  status: 'occupied',   productId: 'p5',  productName: 'Cisco Catalyst 2960',    qrData: 'BIN:A-01-R2|STORE:s2|CAT:Networking',  createdAt: '2024-02-05', lastActivityAt: '2026-04-03T12:00:00' },
  { id: 'b8',  binCode: 'A-02-R1', zone: 'A', aisle: '02', rack: 'R1', storeId: 's2', storeName: 'Westside Depot B2', preferredCategory: 'Laptops',     capacity: 15, currentQty: 12, status: 'occupied',   productId: 'p6',  productName: 'Apple MacBook Pro 14"',  qrData: 'BIN:A-02-R1|STORE:s2|CAT:Laptops',     createdAt: '2024-02-05', lastActivityAt: '2026-04-05T10:00:00' },
  { id: 'b9',  binCode: 'B-01-R1', zone: 'B', aisle: '01', rack: 'R1', storeId: 's2', storeName: 'Westside Depot B2', preferredCategory: 'Peripherals', capacity: 25, currentQty: 18, status: 'occupied',  productId: 'p14', productName: 'Jabra Evolve2 85',       qrData: 'BIN:B-01-R1|STORE:s2|CAT:Peripherals', createdAt: '2024-03-01', lastActivityAt: '2026-04-06T14:00:00' },
  { id: 'b10', binCode: 'B-02-R1', zone: 'B', aisle: '02', rack: 'R1', storeId: 's2', storeName: 'Westside Depot B2',                                   capacity: 20, currentQty: 0,  status: 'empty',                                                           qrData: 'BIN:B-02-R1|STORE:s2',                 createdAt: '2024-03-01' },
  // Eastview Warehouse D4 — multiple zones
  { id: 'b11', binCode: 'A-01-R1', zone: 'A', aisle: '01', rack: 'R1', storeId: 's4', storeName: 'Eastview Warehouse D4', preferredCategory: 'Printers', capacity: 25, currentQty: 17, status: 'occupied',  productId: 'p9',  productName: 'HP LaserJet Pro M404',  qrData: 'BIN:A-01-R1|STORE:s4|CAT:Printers',   createdAt: '2024-03-15', lastActivityAt: '2026-04-05T09:00:00' },
  { id: 'b12', binCode: 'A-02-R1', zone: 'A', aisle: '02', rack: 'R1', storeId: 's4', storeName: 'Eastview Warehouse D4', preferredCategory: 'Storage',  capacity: 60, currentQty: 31, status: 'occupied',  productId: 'p12', productName: 'Seagate 4TB NAS Drive', qrData: 'BIN:A-02-R1|STORE:s4|CAT:Storage',    createdAt: '2024-03-15', lastActivityAt: '2026-04-06T11:30:00' },
  { id: 'b13', binCode: 'B-01-R1', zone: 'B', aisle: '01', rack: 'R1', storeId: 's4', storeName: 'Eastview Warehouse D4', preferredCategory: 'Power',    capacity: 20, currentQty: 0,  status: 'empty',     productId: 'p8',  productName: 'APC UPS 1500VA',        qrData: 'BIN:B-01-R1|STORE:s4|CAT:Power',       createdAt: '2024-03-15', lastActivityAt: '2026-03-20T08:00:00' },
  { id: 'b14', binCode: 'C-01-R1', zone: 'C', aisle: '01', rack: 'R1', storeId: 's4', storeName: 'Eastview Warehouse D4',                                capacity: 40, currentQty: 0,  status: 'empty',                                                           qrData: 'BIN:C-01-R1|STORE:s4',                 createdAt: '2024-04-01' },
  // Harbor Point E5
  { id: 'b15', binCode: 'A-01-R1', zone: 'A', aisle: '01', rack: 'R1', storeId: 's5', storeName: 'Harbor Point E5', preferredCategory: 'Mini PCs',    capacity: 20, currentQty: 7, status: 'occupied',    productId: 'p10', productName: 'Intel NUC 12 Pro',  qrData: 'BIN:A-01-R1|STORE:s5|CAT:Mini PCs',    createdAt: '2024-04-01', lastActivityAt: '2026-04-10T10:00:00' },
  { id: 'b16', binCode: 'A-01-R2', zone: 'A', aisle: '01', rack: 'R2', storeId: 's5', storeName: 'Harbor Point E5', preferredCategory: 'Networking',  capacity: 15, currentQty: 2, status: 'occupied',    productId: 'p11', productName: 'Ubiquiti UniFi AP', qrData: 'BIN:A-01-R2|STORE:s5|CAT:Networking',  createdAt: '2024-04-01', lastActivityAt: '2026-04-09T16:00:00' },
  { id: 'b17', binCode: 'B-01-R1', zone: 'B', aisle: '01', rack: 'R1', storeId: 's5', storeName: 'Harbor Point E5',                                    capacity: 30, currentQty: 0, status: 'reserved',                                                          qrData: 'BIN:B-01-R1|STORE:s5',                 createdAt: '2024-04-01' },
];

// ─── Stock Batches (FEFO) ─────────────────────────────────────────────────────

export const DUMMY_BATCHES: StockBatch[] = [
  // Dell OptiPlex 7000 (p1) – 3 batches in bin b1, oldest first
  { id: 'bt1', batchNumber: 'BAT-2024-001', productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X', binId: 'b1', binCode: 'A-01-R1', storeId: 's1', storeName: 'Downtown Hub A1', quantity: 15, expiryDate: '2025-06-01', receivedDate: '2024-06-01', status: 'available', notes: 'Batch 1 – warranty expiring soon' },
  { id: 'bt2', batchNumber: 'BAT-2024-018', productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X', binId: 'b1', binCode: 'A-01-R1', storeId: 's1', storeName: 'Downtown Hub A1', quantity: 20, expiryDate: '2026-06-01', receivedDate: '2024-12-10', status: 'available' },
  { id: 'bt3', batchNumber: 'BAT-2025-007', productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X', binId: 'b1', binCode: 'A-01-R1', storeId: 's1', storeName: 'Downtown Hub A1', quantity: 10, expiryDate: '2027-06-01', receivedDate: '2025-06-05', status: 'available', notes: 'Latest batch' },
  // HP ProBook 450 G9 (p2)
  { id: 'bt4', batchNumber: 'BAT-2023-042', productId: 'p2', productName: 'HP ProBook 450 G9', sku: 'HPB-450G9', binId: 'b2', binCode: 'A-01-R2', storeId: 's1', storeName: 'Downtown Hub A1', quantity: 8, expiryDate: '2026-01-15', receivedDate: '2023-01-15', status: 'available' },
  // Seagate 4TB NAS (p12) – 2 batches
  { id: 'bt5', batchNumber: 'BAT-2024-031', productId: 'p12', productName: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW', binId: 'b12', binCode: 'A-02-R1', storeId: 's4', storeName: 'Eastview Warehouse D4', quantity: 11, expiryDate: '2027-02-01', receivedDate: '2024-02-01', status: 'available' },
  { id: 'bt6', batchNumber: 'BAT-2026-005', productId: 'p12', productName: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW', binId: 'b12', binCode: 'A-02-R1', storeId: 's4', storeName: 'Eastview Warehouse D4', quantity: 20, expiryDate: '2029-02-01', receivedDate: '2026-04-06', status: 'available', notes: 'Received from PO-2026-002' },
  // Samsung Monitor (p4)
  { id: 'bt7', batchNumber: 'BAT-2023-055', productId: 'p4', productName: 'Samsung 27" 4K Monitor', sku: 'SAM-27-4K', binId: 'b6', binCode: 'A-01-R1', storeId: 's2', storeName: 'Westside Depot B2', quantity: 23, expiryDate: '2026-07-01', receivedDate: '2023-07-01', status: 'available' },
  // Apple MacBook Pro (p6) – 2 batches
  { id: 'bt8', batchNumber: 'BAT-2024-003', productId: 'p6', productName: 'Apple MacBook Pro 14"', sku: 'APL-MBP-14', binId: 'b8', binCode: 'A-02-R1', storeId: 's2', storeName: 'Westside Depot B2', quantity: 5, expiryDate: '2025-01-05', receivedDate: '2024-01-05', status: 'available', notes: 'Older batch – pick first' },
  { id: 'bt9', batchNumber: 'BAT-2024-029', productId: 'p6', productName: 'Apple MacBook Pro 14"', sku: 'APL-MBP-14', binId: 'b8', binCode: 'A-02-R1', storeId: 's2', storeName: 'Westside Depot B2', quantity: 7, expiryDate: '2027-01-05', receivedDate: '2024-08-10', status: 'available' },
  // Jabra Evolve2 (p14)
  { id: 'bt10', batchNumber: 'BAT-2023-061', productId: 'p14', productName: 'Jabra Evolve2 85', sku: 'JAB-EV2-85', binId: 'b9', binCode: 'B-01-R1', storeId: 's2', storeName: 'Westside Depot B2', quantity: 4, expiryDate: '2025-06-20', receivedDate: '2023-06-20', status: 'available', notes: 'Warranty expiring soon' },
  // Intel NUC (p10)
  { id: 'bt11', batchNumber: 'BAT-2023-077', productId: 'p10', productName: 'Intel NUC 12 Pro', sku: 'INT-NUC12', binId: 'b15', binCode: 'A-01-R1', storeId: 's5', storeName: 'Harbor Point E5', quantity: 7, expiryDate: '2025-11-01', receivedDate: '2023-11-01', status: 'available' },
  // Synology DS920+ (p13)
  { id: 'bt12', batchNumber: 'BAT-2022-019', productId: 'p13', productName: 'Synology DS920+', sku: 'SYN-DS920', binId: 'b4', binCode: 'A-02-R2', storeId: 's1', storeName: 'Downtown Hub A1', quantity: 9, expiryDate: '2025-08-15', receivedDate: '2022-08-15', status: 'available', notes: 'Warranty expires Aug 2025 – critical batch' },
];

// ─── Stock Transfers ──────────────────────────────────────────────────────────

export const DUMMY_TRANSFERS: StockTransfer[] = [
  {
    id: 'tr1', transferNumber: 'TR-2026-001', status: 'completed', transferType: 'push',
    fromStoreId: 's1', fromStoreName: 'Downtown Hub A1',
    toStoreId: 's2', toStoreName: 'Westside Depot B2',
    productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X',
    quantity: 5, requestedBy: 'Jordan Patel', requestedById: 'u2', requestedByStoreId: 's1',
    approvedBy: 'Alex Sterling',
    notes: 'Westside needs units urgently for client deployment.',
    requestedAt: '2026-04-11T09:30:00', approvedAt: '2026-04-11T15:00:00',
    completedAt: '2026-04-11T16:00:00',
  },
  {
    id: 'tr2', transferNumber: 'TR-2026-002', status: 'in_transit', transferType: 'push',
    fromStoreId: 's4', fromStoreName: 'Eastview Warehouse D4',
    toStoreId: 's5', toStoreName: 'Harbor Point E5',
    productId: 'p12', productName: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW',
    quantity: 10, requestedBy: 'Sam Torres', requestedById: 'u6', requestedByStoreId: 's4',
    approvedBy: 'Alex Sterling',
    notes: 'Harbor Point is expanding NAS storage. Eastview has excess.',
    requestedAt: '2026-04-14T10:00:00', approvedAt: '2026-04-14T16:30:00',
    shippedAt: '2026-04-15T09:00:00', trackingId: 'TRK-2026-7821',
  },
  {
    id: 'tr3', transferNumber: 'TR-2026-003', status: 'pending', transferType: 'push',
    fromStoreId: 's2', fromStoreName: 'Westside Depot B2',
    toStoreId: 's1', toStoreName: 'Downtown Hub A1',
    productId: 'p4', productName: 'Samsung 27" 4K Monitor', sku: 'SAM-27-4K',
    quantity: 5, requestedBy: 'Jordan Patel', requestedById: 'u2', requestedByStoreId: 's2',
    notes: 'Downtown needs monitors for new workstations setup.',
    requestedAt: '2026-04-15T08:45:00',
  },
  {
    id: 'tr4', transferNumber: 'TR-2026-004', status: 'rejected', transferType: 'push',
    fromStoreId: 's3', fromStoreName: 'North Gate C3',
    toStoreId: 's4', toStoreName: 'Eastview Warehouse D4',
    productId: 'p7', productName: 'Logitech MX Master 3', sku: 'LOG-MX3-S',
    quantity: 3, requestedBy: 'Avery Smith', requestedById: 'u5', requestedByStoreId: 's3',
    approvedBy: 'Alex Sterling',
    notes: 'North Gate C3 is inactive — transfer not permitted from inactive store.',
    requestedAt: '2026-04-10T11:00:00', approvedAt: '2026-04-10T14:00:00',
  },
  {
    id: 'tr5', transferNumber: 'TR-2026-005', status: 'pending', transferType: 'push',
    fromStoreId: 's4', fromStoreName: 'Eastview Warehouse D4',
    toStoreId: 's6', toStoreName: 'Sunrise Logistics F6',
    productId: 'p9', productName: 'HP LaserJet Pro M404', sku: 'HPL-404-N',
    quantity: 3, requestedBy: 'Avery Smith', requestedById: 'u5', requestedByStoreId: 's4',
    notes: 'Seeding initial inventory for the new Sunrise store.',
    requestedAt: '2026-04-15T09:00:00',
  },
  {
    id: 'tr6', transferNumber: 'TR-2026-006', status: 'pending', transferType: 'pull',
    fromStoreId: 's1', fromStoreName: 'Downtown Hub A1',
    toStoreId: 's5', toStoreName: 'Harbor Point E5',
    productId: 'p5', productName: 'Cisco Catalyst 2960', sku: 'CIS-2960-X',
    quantity: 2, requestedBy: 'Sam Torres', requestedById: 'u6', requestedByStoreId: 's5',
    notes: 'Harbor Point urgently needs switches for new rack setup. Downtown has excess.',
    requestedAt: '2026-04-16T07:30:00',
  },
];

export const DUMMY_RMAS: RMA[] = [
  {
    id: 'rma1', rmaNumber: 'RMA-2026-001', status: 'sent_to_vendor', priority: 'critical',
    productId: 'p2', productName: 'HP ProBook 450 G9', sku: 'HPB-450G9',
    storeId: 's1', storeName: 'Downtown Hub A1', quantity: 2,
    defectType: 'dead_on_arrival', defectDescription: 'Units failed POST on first boot. No display output, no beep codes. Confirmed DOA.',
    reportedBy: 'Jordan Patel', reportedById: 'u2',
    vendorName: 'HP India Service', vendorContact: '+91-1800-108-4747',
    trackingNumber: 'DTDC-2026-889123',
    initiatedAt: '2026-04-05T10:00:00', receivedAt: '2026-04-06T14:00:00',
    inspectedAt: '2026-04-07T11:00:00', sentToVendorAt: '2026-04-08T09:00:00',
    notes: 'Escalated to HP India. Replacement units expected in 10–15 business days.',
  },
  {
    id: 'rma2', rmaNumber: 'RMA-2026-002', status: 'inspected', priority: 'high',
    productId: 'p3', productName: 'Lenovo ThinkPad X1', sku: 'LTP-X1-C10',
    storeId: 's1', storeName: 'Downtown Hub A1', quantity: 1,
    defectType: 'hardware', defectDescription: 'Keyboard key matrix failure on rows 3-5. Multiple keys unresponsive. Suspected water ingress.',
    reportedBy: 'Jordan Patel', reportedById: 'u2',
    vendorName: 'Lenovo Service Centre', vendorContact: '+91-1800-3000-9990',
    initiatedAt: '2026-04-10T08:30:00', receivedAt: '2026-04-11T10:00:00',
    inspectedAt: '2026-04-12T15:00:00',
    notes: 'Water damage found. Checking if covered under warranty.',
  },
  {
    id: 'rma3', rmaNumber: 'RMA-2026-003', status: 'initiated', priority: 'medium',
    productId: 'p8', productName: 'APC UPS 1500VA', sku: 'APC-UPS-15',
    storeId: 's4', storeName: 'Eastview Warehouse D4', quantity: 1,
    defectType: 'hardware', defectDescription: 'Battery not holding charge. Drops from 100% to 0% in under 5 minutes. Beeping constantly.',
    reportedBy: 'Avery Smith', reportedById: 'u5',
    vendorName: 'Schneider Electric', vendorContact: '+91-1800-103-7466',
    initiatedAt: '2026-04-15T09:15:00',
  },
  {
    id: 'rma4', rmaNumber: 'RMA-2026-004', status: 'resolved', priority: 'low',
    productId: 'p7', productName: 'Logitech MX Master 3', sku: 'LOG-MX3-S',
    storeId: 's3', storeName: 'North Gate C3', quantity: 1,
    defectType: 'hardware', defectDescription: 'Scroll wheel stuttering and skipping. Inconsistent scrolling behaviour confirmed on multiple PCs.',
    reportedBy: 'Riley Chen', reportedById: 'u4',
    vendorName: 'Logitech India', vendorContact: '+91-1800-102-1673',
    resolution: 'replacement', resolutionNotes: 'Replacement unit dispatched by Logitech. Issue confirmed as manufacturing defect.',
    initiatedAt: '2026-03-28T14:00:00', receivedAt: '2026-03-29T10:00:00',
    inspectedAt: '2026-03-30T11:00:00', sentToVendorAt: '2026-04-01T09:00:00',
    resolvedAt: '2026-04-10T16:00:00',
  },
];

export const DUMMY_AMC_CONTRACTS: AMCContract[] = [
  {
    id: 'amc1', contractNumber: 'AMC-2026-001',
    productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X',
    storeId: 's1', storeName: 'Downtown Hub A1',
    vendorName: 'TechCare Solutions', vendorContact: '+91-98765-43210', vendorEmail: 'service@techcare.in',
    startDate: '2026-01-01', endDate: '2026-12-31',
    coverageType: 'comprehensive', serviceFrequency: 'quarterly',
    lastServiceDate: '2026-01-15', nextServiceDate: '2026-04-30',
    annualCost: 45000,
    notes: 'Includes on-site repair, parts, and labour. 4-hour response SLA.',
    createdBy: 'Alex Sterling', createdAt: '2025-12-20T10:00:00',
  },
  {
    id: 'amc2', contractNumber: 'AMC-2026-002',
    productId: 'p9', productName: 'HP LaserJet Pro M404', sku: 'HPL-404-N',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    vendorName: 'PrintCare India', vendorContact: '+91-98234-11122', vendorEmail: 'support@printcare.in',
    startDate: '2025-11-01', endDate: '2026-04-30',
    coverageType: 'parts_only', serviceFrequency: 'half_yearly',
    lastServiceDate: '2025-11-15', nextServiceDate: '2026-05-15',
    annualCost: 18000,
    notes: 'Parts covered up to ₹15,000 per incident. Labour charged separately.',
    createdBy: 'Alex Sterling', createdAt: '2025-10-28T09:00:00',
  },
  {
    id: 'amc3', contractNumber: 'AMC-2026-003',
    productId: 'p13', productName: 'Synology DS920+', sku: 'SYN-DS920',
    storeId: 's1', storeName: 'Downtown Hub A1',
    vendorName: 'NASSecure Systems', vendorContact: '+91-99887-76543', vendorEmail: 'ops@nassecure.io',
    startDate: '2026-02-01', endDate: '2027-01-31',
    coverageType: 'comprehensive', serviceFrequency: 'yearly',
    nextServiceDate: '2027-02-01',
    annualCost: 28000,
    notes: 'Annual health check + firmware updates + drive health monitoring.',
    createdBy: 'Jordan Patel', createdAt: '2026-01-25T11:00:00',
  },
];

export const DUMMY_ASSET_DOCS: AssetDocument[] = [
  {
    id: 'doc1', productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X',
    storeId: 's1', storeName: 'Downtown Hub A1',
    docType: 'manual', title: 'Dell OptiPlex 7000 User Manual',
    fileName: 'Dell_OptiPlex_7000_UserManual_EN.pdf', fileSize: 4215600,
    uploadedBy: 'Jordan Patel', uploadedById: 'u2', uploadedAt: '2026-01-20T10:00:00',
  },
  {
    id: 'doc2', productId: 'p1', productName: 'Dell OptiPlex 7000', sku: 'DOP-7000-X',
    storeId: 's1', storeName: 'Downtown Hub A1',
    docType: 'invoice', title: 'Tax Invoice — Batch Purchase Apr 2022',
    fileName: 'Invoice_DellOptiPlex_Apr2022.pdf', fileSize: 318400,
    uploadedBy: 'Alex Sterling', uploadedById: 'u1', uploadedAt: '2022-06-05T09:00:00',
  },
  {
    id: 'doc3', productId: 'p6', productName: 'Apple MacBook Pro 14"', sku: 'APL-MBP-14',
    storeId: 's2', storeName: 'Westside Depot B2',
    docType: 'insurance', title: 'IT Equipment Insurance Policy 2026',
    fileName: 'InsurancePolicy_MacBookPro_2026.pdf', fileSize: 882200,
    uploadedBy: 'Morgan Lee', uploadedById: 'u3', uploadedAt: '2026-02-10T11:00:00',
    expiryDate: '2027-01-31',
    notes: 'HDFC ERGO. Covers accidental damage & theft.',
  },
  {
    id: 'doc4', productId: 'p5', productName: 'Cisco Catalyst 2960', sku: 'CIS-2960-X',
    storeId: 's2', storeName: 'Westside Depot B2',
    docType: 'compliance_cert', title: 'CE & FCC Compliance Certificate',
    fileName: 'Cisco_Catalyst2960_ComplianceCert.pdf', fileSize: 540000,
    uploadedBy: 'Alex Sterling', uploadedById: 'u1', uploadedAt: '2024-01-10T14:00:00',
  },
  {
    id: 'doc5', productId: 'p9', productName: 'HP LaserJet Pro M404', sku: 'HPL-404-N',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    docType: 'amc_contract', title: 'AMC Contract — PrintCare India 2026',
    fileName: 'AMC_Contract_HPLaserJet_PrintCare_2026.pdf', fileSize: 1240000,
    uploadedBy: 'Avery Smith', uploadedById: 'u5', uploadedAt: '2025-11-01T10:00:00',
    expiryDate: '2026-04-30',
    notes: 'Linked to AMC-2026-002.',
  },
  {
    id: 'doc6', productId: 'p2', productName: 'HP ProBook 450 G9', sku: 'HPB-450G9',
    storeId: 's1', storeName: 'Downtown Hub A1',
    docType: 'warranty_card', title: 'HP International Warranty Card',
    fileName: 'HP_ProBook_WarrantyCard_2023.pdf', fileSize: 210000,
    uploadedBy: 'Jordan Patel', uploadedById: 'u2', uploadedAt: '2023-01-20T09:00:00',
    expiryDate: '2026-01-15',
  },
];

// ─── Cycle Counts ─────────────────────────────────────────────────────────────

export const DUMMY_CYCLE_COUNTS: CycleCount[] = [
  {
    id: 'cc1', ccNumber: 'CC-2026-001',
    storeId: 's1', storeName: 'Downtown Hub A1',
    category: 'Laptops', status: 'completed',
    items: [
      { productId: 'p2', productName: 'HP ProBook 450 G9', sku: 'HPB-450G9', category: 'Laptops', systemQty: 8, countedQty: 7, variance: -1 },
      { productId: 'p3', productName: 'Lenovo ThinkPad X1', sku: 'LTP-X1-C10', category: 'Laptops', systemQty: 0, countedQty: 0, variance: 0 },
    ],
    createdBy: 'Jordan Patel', createdById: 'u2',
    createdAt: '2026-03-10T09:00:00', completedAt: '2026-03-10T11:30:00',
    notes: 'Routine Q1 cycle count for Laptops category.',
  },
  {
    id: 'cc2', ccNumber: 'CC-2026-002',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    category: 'Storage', status: 'in_progress',
    items: [
      { productId: 'p12', productName: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW', category: 'Storage', systemQty: 31, countedQty: 29, variance: -2 },
      { productId: 'p13', productName: 'Synology DS920+', sku: 'SYN-DS920', category: 'Storage', systemQty: 9, countedQty: null, variance: 0 },
    ],
    createdBy: 'Avery Smith', createdById: 'u5',
    createdAt: '2026-04-14T10:00:00',
    notes: 'Spot check after warehouse rearrangement.',
  },
  {
    id: 'cc3', ccNumber: 'CC-2026-003',
    storeId: 's2', storeName: 'Westside Depot B2',
    category: 'Networking', status: 'draft',
    items: [
      { productId: 'p4', productName: 'Samsung 27" 4K Monitor', sku: 'SAM-27-4K', category: 'Monitors', systemQty: 23, countedQty: null, variance: 0 },
      { productId: 'p5', productName: 'Cisco Catalyst 2960', sku: 'CIS-2960-X', category: 'Networking', systemQty: 5, countedQty: null, variance: 0 },
    ],
    createdBy: 'Morgan Lee', createdById: 'u3',
    createdAt: '2026-04-15T14:00:00',
  },
];

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export const DUMMY_STOCK_ADJUSTMENTS: StockAdjustment[] = [
  {
    id: 'adj1', adjNumber: 'ADJ-2026-001',
    productId: 'p2', productName: 'HP ProBook 450 G9', sku: 'HPB-450G9',
    storeId: 's1', storeName: 'Downtown Hub A1',
    reason: 'counting_error', systemQty: 8, adjustedQty: 7, variance: -1,
    status: 'approved',
    notes: 'Variance found during CC-2026-001. One unit likely miscounted in previous audit.',
    requestedBy: 'Jordan Patel', requestedById: 'u2',
    reviewedBy: 'Alex Sterling',
    requestedAt: '2026-03-10T12:00:00', reviewedAt: '2026-03-11T09:00:00',
    cycleCountId: 'cc1',
  },
  {
    id: 'adj2', adjNumber: 'ADJ-2026-002',
    productId: 'p12', productName: 'Seagate 4TB NAS Drive', sku: 'SEA-4TB-IW',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    reason: 'damage', systemQty: 31, adjustedQty: 29, variance: -2,
    status: 'pending',
    notes: '2 units found with cracked PCB during rearrangement. Flagged for disposal.',
    requestedBy: 'Avery Smith', requestedById: 'u5',
    requestedAt: '2026-04-14T14:00:00',
    cycleCountId: 'cc2',
  },
  {
    id: 'adj3', adjNumber: 'ADJ-2026-003',
    productId: 'p7', productName: 'Logitech MX Master 3', sku: 'LOG-MX3-S',
    storeId: 's3', storeName: 'North Gate C3',
    reason: 'theft', systemQty: 3, adjustedQty: 2, variance: -1,
    status: 'approved',
    notes: 'Security audit revealed 1 unit missing. Reported to management.',
    requestedBy: 'Riley Chen', requestedById: 'u4',
    reviewedBy: 'Alex Sterling',
    requestedAt: '2026-02-20T10:00:00', reviewedAt: '2026-02-21T11:00:00',
  },
  {
    id: 'adj4', adjNumber: 'ADJ-2026-004',
    productId: 'p11', productName: 'Ubiquiti UniFi AP', sku: 'UBQ-UAP-AC',
    storeId: 's5', storeName: 'Harbor Point E5',
    reason: 'found', systemQty: 2, adjustedQty: 3, variance: 1,
    status: 'rejected',
    notes: 'Additional unit found in untagged shelf — rejected pending origin verification.',
    requestedBy: 'Sam Torres', requestedById: 'u6',
    reviewedBy: 'Alex Sterling',
    requestedAt: '2026-03-05T09:00:00', reviewedAt: '2026-03-06T10:00:00',
  },
];

// ─── Lead Time Records ────────────────────────────────────────────────────────

export const DUMMY_LEAD_TIME_RECORDS: LeadTimeRecord[] = [
  {
    id: 'lt1', poId: 'po1', poNumber: 'PO-2026-001',
    supplierId: 'sup1', supplierName: 'TechSource India Pvt Ltd',
    storeId: 's1', storeName: 'Downtown Hub A1',
    orderedAt: '2026-01-05T10:00:00', expectedAt: '2026-01-19T00:00:00',
    receivedAt: '2026-01-17T14:00:00', leadDays: 12, expectedLeadDays: 14,
    status: 'received',
    notes: 'Delivered 2 days ahead of schedule.',
  },
  {
    id: 'lt2', poId: 'po2', poNumber: 'PO-2026-002',
    supplierId: 'sup2', supplierName: 'Global Peripherals Co.',
    storeId: 's4', storeName: 'Eastview Warehouse D4',
    orderedAt: '2026-01-20T09:00:00', expectedAt: '2026-02-03T00:00:00',
    receivedAt: '2026-02-10T11:00:00', leadDays: 21, expectedLeadDays: 14,
    status: 'received',
    notes: 'Delayed by 7 days due to port clearance.',
  },
  {
    id: 'lt3', poId: 'po4', poNumber: 'PO-2026-004',
    supplierId: 'sup1', supplierName: 'TechSource India Pvt Ltd',
    storeId: 's5', storeName: 'Harbor Point E5',
    orderedAt: '2026-03-01T10:00:00', expectedAt: '2026-03-15T00:00:00',
    expectedLeadDays: 14,
    status: 'in_transit',
    notes: 'Shipment dispatched. Tracking ID: TIN-20260308-445.',
  },
  {
    id: 'lt4', poId: 'po5', poNumber: 'PO-2026-005',
    supplierId: 'sup3', supplierName: 'NetEquip Solutions',
    storeId: 's2', storeName: 'Westside Depot B2',
    orderedAt: '2026-04-01T09:00:00', expectedAt: '2026-04-10T00:00:00',
    expectedLeadDays: 9,
    status: 'overdue',
    notes: 'Past expected delivery date. Follow-up sent to vendor.',
  },
];
