import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing — falling back to dummy data');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

// ─── Select strings (snake_case → camelCase aliases) ─────────────────────────

export const PROFILE_SELECT = `
  id, name, email, role,
  storeId:store_id, storeName:store_name,
  status, createdAt:created_at
`;

export const STORE_SELECT = `
  id, name, location,
  managerName:manager_name, managerId:manager_id,
  productCount:product_count, status, createdAt:created_at
`;

export const PRODUCT_SELECT = `
  id, name, sku, category, quantity, price, notes,
  warrantyStartDate:warranty_start_date,
  warrantyEndDate:warranty_end_date,
  storeId:store_id, storeName:store_name,
  stockStatus:stock_status, warrantyStatus:warranty_status,
  createdAt:created_at
`;

export const NOTIFICATION_SELECT = `
  id, type, title, message, read,
  createdAt:created_at,
  storeId:store_id, productId:product_id, link
`;

export const AUDIT_SELECT = `
  id, action, module, details,
  entityId:entity_id, entityName:entity_name,
  userId:user_id, userName:user_name,
  timestamp, changes
`;

export const PO_SELECT = `
  id, status, items, justification,
  totalValue:total_value,
  poNumber:po_number,
  storeId:store_id, storeName:store_name,
  requestedBy:requested_by, requestedById:requested_by_id,
  reviewedBy:reviewed_by, reviewComment:review_comment,
  requestedAt:requested_at, reviewedAt:reviewed_at, receivedAt:received_at
`;

export const TRANSFER_SELECT = `
  id, status, quantity, notes,
  transferNumber:transfer_number,
  transferType:transfer_type,
  fromStoreId:from_store_id, fromStoreName:from_store_name,
  toStoreId:to_store_id, toStoreName:to_store_name,
  productId:product_id, productName:product_name, sku,
  requestedBy:requested_by, requestedById:requested_by_id,
  requestedByStoreId:requested_by_store_id,
  approvedBy:approved_by,
  requestedAt:requested_at, approvedAt:approved_at,
  shippedAt:shipped_at, completedAt:completed_at,
  trackingId:tracking_id, receivedByName:received_by_name
`;

export const SUPPLIER_SELECT = `
  id, name, email, phone, address, categories,
  status, rating, notes,
  contactPerson:contact_person,
  totalOrders:total_orders,
  createdAt:created_at
`;

export const MAINTENANCE_SELECT = `
  id, type, description, status, cost, technician, notes,
  productId:product_id, productName:product_name, sku,
  storeId:store_id, storeName:store_name,
  scheduledDate:scheduled_date, completedDate:completed_date,
  createdBy:created_by, createdAt:created_at
`;

export const BIN_SELECT = `
  id, zone, aisle, rack, capacity, status, notes,
  binCode:bin_code,
  storeId:store_id, storeName:store_name,
  preferredCategory:preferred_category,
  currentQty:current_qty,
  productId:product_id, productName:product_name,
  qrData:qr_data,
  createdAt:created_at, lastActivityAt:last_activity_at
`;

export const BATCH_SELECT = `
  id, quantity, notes,
  batchNumber:batch_number,
  productId:product_id, productName:product_name, sku,
  binId:bin_id, binCode:bin_code,
  storeId:store_id, storeName:store_name,
  expiryDate:expiry_date, receivedDate:received_date, status
`;

export const RMA_SELECT = `
  id, status, priority, quantity, notes,
  rmaNumber:rma_number,
  productId:product_id, productName:product_name, sku,
  storeId:store_id, storeName:store_name,
  defectType:defect_type, defectDescription:defect_description,
  reportedBy:reported_by, reportedById:reported_by_id,
  vendorName:vendor_name, vendorContact:vendor_contact,
  trackingNumber:tracking_number,
  resolution, resolutionNotes:resolution_notes,
  initiatedAt:initiated_at, receivedAt:received_at,
  inspectedAt:inspected_at, sentToVendorAt:sent_to_vendor_at,
  resolvedAt:resolved_at
`;

export const AMC_SELECT = `
  id, notes,
  contractNumber:contract_number,
  productId:product_id, productName:product_name, sku,
  storeId:store_id, storeName:store_name,
  vendorName:vendor_name, vendorContact:vendor_contact, vendorEmail:vendor_email,
  startDate:start_date, endDate:end_date,
  coverageType:coverage_type, serviceFrequency:service_frequency,
  lastServiceDate:last_service_date, nextServiceDate:next_service_date,
  annualCost:annual_cost,
  createdBy:created_by, createdAt:created_at
`;

export const ASSET_DOC_SELECT = `
  id, title, notes,
  fileName:file_name, fileSize:file_size,
  docType:doc_type,
  productId:product_id, productName:product_name, sku,
  storeId:store_id, storeName:store_name,
  uploadedBy:uploaded_by, uploadedById:uploaded_by_id,
  uploadedAt:uploaded_at, expiryDate:expiry_date
`;

export const CYCLE_COUNT_SELECT = `
  id, category, status, items, notes,
  ccNumber:cc_number,
  storeId:store_id, storeName:store_name,
  createdBy:created_by, createdById:created_by_id,
  createdAt:created_at, completedAt:completed_at
`;

export const ADJ_SELECT = `
  id, reason, status, notes,
  adjNumber:adj_number,
  productId:product_id, productName:product_name, sku,
  storeId:store_id, storeName:store_name,
  systemQty:system_qty, adjustedQty:adjusted_qty, variance,
  requestedBy:requested_by, requestedById:requested_by_id,
  reviewedBy:reviewed_by,
  requestedAt:requested_at, reviewedAt:reviewed_at,
  cycleCountId:cycle_count_id
`;

export const LEAD_TIME_SELECT = `
  id, status, notes,
  poId:po_id, poNumber:po_number,
  supplierId:supplier_id, supplierName:supplier_name,
  storeId:store_id, storeName:store_name,
  orderedAt:ordered_at, expectedAt:expected_at, receivedAt:received_at,
  leadDays:lead_days, expectedLeadDays:expected_lead_days
`;
