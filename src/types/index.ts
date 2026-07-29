export type UserRole = 'admin' | 'purchaser' | 'receiver' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  active: boolean;
  online: boolean;
  lastLogin: string;
  department: string;
}

export type PurchaseStatus = 'Pending' | 'Partial Purchased' | 'Purchased' | 'On Hold' | 'Returned';
export type ReceiveStatus = 'Pending' | 'Partial Received' | 'Received';

export interface POItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  orderedQty: number;
  unit: string;
  estimatedUnitPrice: number;
  purchasedQty?: number;
  actualUnitPrice?: number;
  heldBy?: string; // Purchaser Name
  heldAt?: string;
  purchaseStatus: PurchaseStatus;
  receiveStatus: ReceiveStatus;
  receivedQty?: number;
  purchasedAt?: string;
  purchaserName?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  department: string;
  location: string;
  orderDate: string;
  deliveryDate: string;
  status: PurchaseStatus;
  receiveStatus: ReceiveStatus;
  items: POItem[];
  totalQuantity: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  createdByName: string;
  createdById: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'LOGIN' | 'PURCHASE_HOLD' | 'PURCHASE_RELEASE' | 'PURCHASE_SAVE' | 'PURCHASE_RETURN' | 'WAREHOUSE_RECEIVE' | 'SYSTEM_SYNC' | 'PO_CREATE' | 'EXPORT_DATA' | 'SKU_MAP_UPDATE';
  details: string;
  user: string;
  role: UserRole;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  source?: 'telegram' | 'sheets' | 'system';
}

export interface MasterSKU {
  id: string;
  internalSKU: string;
  supplierSKU: string;
  name: string;
  category: string;
  supplier: string;
  unit: string;
  conversionFactor: number;
  lastUpdated: string;
}

export interface SyncStatusInfo {
  status: 'synced' | 'syncing' | 'error';
  lastSyncTime: Date;
  secondsAgo: number;
  sheetsUrl: string;
  totalRecordsSynced: number;
}

export type ThemeMode = 'light' | 'dark';
