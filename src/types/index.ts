export type UserRole = 'admin' | 'purchaser' | 'receiver' | 'manager';

export type FoodCategory = 'Vegetables' | 'Bakery' | 'Fish' | 'Meat';

export type PurchaseStatus = 'Pending' | 'On Hold' | 'Purchased' | 'Returned';
export type ReceiveStatus = 'Pending' | 'Partial Received' | 'Received';
export type ThemeMode = 'light' | 'dark';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department?: string;
  location?: string;
  online?: boolean;
  active?: boolean;
  lastLogin?: string;
}

export interface POItem {
  id: string;
  sku: string;
  name: string;
  category: FoodCategory | string;
  orderedQty: number;
  unit: string;
  estimatedUnitPrice: number;
  purchasedQty?: number;
  actualUnitPrice?: number;
  receivedQty?: number;
  receiptNumber?: string;
  notes?: string;
  purchaseStatus: PurchaseStatus;
  receiveStatus: ReceiveStatus;
  heldBy?: string;
  heldAt?: string;
  purchasedAt?: string;
  purchaserName?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  department: string;
  location: string;
  orderDate: string;
  deliveryDate: string;
  status: PurchaseStatus | 'Partial Purchased';
  receiveStatus: ReceiveStatus;
  items: POItem[];
  totalQuantity: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  createdByName: string;
  createdById: string;
  notes?: string;
}

export interface MasterSKU {
  id: string;
  supplierSKU: string;
  internalSKU: string;
  name: string;
  category: FoodCategory | string;
  unit: string;
  supplier: string;
  lastUpdated: string;
  conversionFactor?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'LOGIN' | 'PO_CREATE' | 'PURCHASE_HOLD' | 'PURCHASE_RELEASE' | 'PURCHASE_SAVE' | 'PURCHASE_RETURN' | 'WAREHOUSE_RECEIVE' | 'SYSTEM_SYNC';
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
  type: 'info' | 'success' | 'warning';
  source?: 'telegram' | 'sheets' | 'system';
}

export interface SyncStatusInfo {
  status: 'synced' | 'syncing' | 'error';
  lastSyncTime: Date;
  secondsAgo: number;
  sheetsUrl: string;
  totalRecordsSynced: number;
}
