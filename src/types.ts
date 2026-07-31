export type UserRole = 'admin' | 'purchaser' | 'warehouse' | 'dispatch';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  phone?: string;
  active: boolean;
  status?: 'Active' | 'Inactive';
  createdDate?: string;
  lastLogin?: string;
  token?: string;
  avatar?: string;
}

export type ItemPurchaseStatus = 'Pending' | 'Hold' | 'Held' | 'Partial Purchased' | 'Purchased';
export type MasterStatus = 'Pending' | 'Partial' | 'Completed' | 'Hold' | 'Held';

export const getNormalizedItemStatus = (item: {
  purchaseStatus?: string;
  requestedQty?: number;
  orderedQty?: number;
  purchasedQty?: number;
  holdBy?: string;
  holdById?: string;
  holdByName?: string;
  holdStartTime?: string;
  holdSince?: string;
  holdExpireTime?: string;
  isHeldByAdmin?: boolean;
}): ItemPurchaseStatus => {
  const rawStatus = String(item.purchaseStatus || '').trim().toLowerCase();
  const reqQty = item.requestedQty || item.orderedQty || 0;
  const purQty = item.purchasedQty || 0;

  const isPurchased = rawStatus === 'purchased' || rawStatus === 'completed' || (reqQty > 0 && purQty >= reqQty);
  if (isPurchased) {
    return 'Purchased';
  }

  const isHeldStatus = rawStatus === 'held' || rawStatus === 'hold' || Boolean(item.isHeldByAdmin);
  const hasHoldUser = Boolean((item.holdBy && String(item.holdBy).trim() !== '') || (item.holdByName && String(item.holdByName).trim() !== '') || (item.holdById && String(item.holdById).trim() !== ''));

  if (isHeldStatus || hasHoldUser) {
    return 'Held';
  }

  if (rawStatus === 'partial purchased' || rawStatus === 'partial' || (purQty > 0 && purQty < reqQty)) {
    return 'Partial Purchased';
  }

  return 'Pending';
};

export interface ReceiveBatchLog {
  id: string;
  timestamp: string;
  receivedQty: number;
  passedQty: number;
  damagedQty: number;
  qcNotes?: string;
  receivedBy: string;
}

export interface MasterSKUEntry {
  id: string;
  customerItemName: string;
  customerItemCode?: string;
  internalSKU: string;
  internalItemName: string;
  internalUnit: string;
  category?: string;
  brand?: string;
  slNo?: number | string;
  costPrice?: number | string;
  sellingPrice?: number | string;
  assignedTo?: string;
  sheetName?: string;
  lastUpdated?: string;
}

export interface POItem {
  id: string; // Row ID
  poId: string;
  poNumber: string;
  orderDate?: string;
  deliveryDate?: string;
  department?: string;
  location?: string;
  slNumber?: number | string;
  itemName: string; // Active displayed name (or internal item name)
  customerItemName?: string; // Original customer PO item name
  customerUnit?: string; // Original customer PO unit
  customerItemCode?: string; // Original customer item code
  internalItemName?: string; // Company stock item name
  internalUnit?: string; // Company stock unit
  internalItemCode?: string; // Company stock SKU code
  convertedItemName?: string;
  convertedSku?: string;
  receivedQty?: number;
  brand?: string;
  category: string;
  unit: string; // Active displayed unit (or internal unit)
  requestedQty: number; // Ordered Qty
  orderedQty?: number;
  purchasedQty: number;
  remainingQty: number; // Ordered Qty - Purchased Qty
  purchaseStatus: ItemPurchaseStatus;
  holdBy?: string;
  holdReason?: string;
  holdById?: string;
  holdByName?: string;
  holdStartTime?: string;
  holdSince?: string;
  holdExpireTime?: string;
  purchaserId?: string;
  purchaserName?: string;
  supplierName?: string;
  purchasedAt?: string;
  marketPrice?: number;
  unitPrice?: number;
  sku?: string;
  notes?: string;
  warehouseQty?: number;
  warehouseVerifiedBy?: string;
  warehouseVerifiedAt?: string;
  warehouseNotes?: string;
  passedQty?: number;
  damagedQty?: number;
  qcStatus?: 'Passed' | 'Partial Damaged' | 'Rejected' | 'Pending QC';
  qcNotes?: string;
  backorderQty?: number;
  receiveLogs?: ReceiveBatchLog[];
  createdDate?: string;
  updatedDate?: string;
}

export type POStatus = 'pending' | 'in_progress' | 'purchased' | 'verified' | 'dispatched';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  customerName: string;
  supplierName?: string;
  orderDate: string;
  deliveryDate?: string;
  department?: string;
  location?: string;
  totalItems: number;
  totalQuantity: number;
  purchaseStatus: MasterStatus;
  receiveStatus: MasterStatus;
  status: POStatus;
  items: POItem[];
  deliveryNotes?: DeliveryNoteRecord[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  dispatchedBy?: string;
  dispatchNotes?: string;
  isHeldByAdmin?: boolean;
  holdByAdmin?: string;
  adminHoldAt?: string;
}

export interface DeliveryNoteItem {
  id: string;
  poItemId?: string;
  poItemName?: string;
  sku: string;
  itemName: string;
  brand?: string;
  unit: string;
  requestedQty: number;
  deliveredQty: number;
  acceptedQty?: number;
  returnedQty?: number;
  isConfirmed?: boolean;
  isReturned?: boolean;
  returnReason?: string;
  unitPrice?: number;
  notes?: string;
}

export interface DeliveryNoteRecord {
  id: string;
  challanNumber: string;
  poId: string;
  poNumber: string;
  customerName: string;
  deliveryDate: string;
  dispatchOfficer: string;
  recipientName?: string;
  notes?: string;
  createdDate: string;
  status: 'Delivered' | 'Pending Invoice' | 'Invoiced' | 'Delivery Confirmed' | 'Partially Returned' | 'Fully Returned';
  deliveryConfirmedAt?: string;
  deliveryConfirmedBy?: string;
  invoiceNumber?: string;
  invoicedAt?: string;
  items: DeliveryNoteItem[];
  companyName?: string;
  companySubtext?: string;
}

export interface ReceiveSummaryRow {
  poNumber: string;
  itemName: string;
  orderedQty: number;
  purchasedQty: number;
  receivedQty: number;
  remainingQty: number;
  receiveStatus: MasterStatus;
  receiverName?: string;
  receiveDate?: string;
}

export interface SheetsConfig {
  sheetId: string;
  webAppUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  details: string;
}

// PO Excel/CSV Import Types
export interface RawPOImportRow {
  rowIndex: number;
  orderDate: string;
  location: string;
  poNumber: string;
  department: string;
  slNumber: string;
  itemName: string;
  brand: string;
  unit: string;
  qty: number | string;
  deliveryDate: string;
}

export interface ImportRowValidationError {
  rowIndex: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportPreviewAnalysis {
  totalRows: number;
  totalPOs: number;
  duplicatePOsCount: number;
  newPOsCount: number;
  validRowsCount: number;
  invalidRowsCount: number;
  warnings: string[];
  errors: ImportRowValidationError[];
  parsedRows: RawPOImportRow[];
}

export interface ImportExecutionResult {
  success: boolean;
  totalPOsImported: number;
  totalPOsUpdated: number;
  totalItemsImported: number;
  totalItemsUpdated: number;
  timeTakenMs: number;
  warnings: string[];
  timestamp: string;
  updatedPOs?: PurchaseOrder[];
}

