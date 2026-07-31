/**
 * Browser Notification Service for RL Food ERP
 * Safe, cross-browser notification handler supporting both Notification API and ServiceWorker.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

export interface ShowNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

/**
 * Triggers a browser notification with silent fallback if permission is denied or unsupported.
 */
export async function sendBrowserNotification(title: string, options?: ShowNotificationOptions): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const defaultIcon = '/favicon.svg';
  const notifOptions: NotificationOptions = {
    body: options?.body || '',
    icon: options?.icon || defaultIcon,
    badge: options?.badge || defaultIcon,
    tag: options?.tag,
    data: options?.data,
  };

  try {
    // 1. Prefer ServiceWorker registration showNotification if available
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active && 'showNotification' in reg) {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    }

    // 2. Fallback to standard Notification constructor
    const notification = new Notification(title, notifOptions);
    notification.onclick = function (event) {
      event.preventDefault();
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    // Fail silently per requirement 4
    console.warn('Browser notification skipped/failed silently:', err);
    return false;
  }
}

/* Event Specific Notification Helpers */

export function notifyBrowserNewPO(poNumber: string, department: string, itemCount: number, importedBy: string) {
  return sendBrowserNotification(`New PO Created: #${poNumber}`, {
    body: `PO #${poNumber} (${department || 'General'}) created with ${itemCount} items by ${importedBy || 'User'}.`,
    tag: `po-new-${poNumber}`
  });
}

export function notifyBrowserBulkPO(totalPOs: number, totalItems: number, importedBy: string) {
  return sendBrowserNotification(`Bulk POs Created`, {
    body: `${totalPOs} Purchase Orders (${totalItems} total items) imported by ${importedBy || 'User'}.`,
    tag: `po-bulk-${Date.now()}`
  });
}

export function notifyBrowserItemHold(poNumber: string, itemName: string, purchaserName: string, notes?: string) {
  const reasonText = notes ? ` Reason: ${notes}` : '';
  return sendBrowserNotification(`Item Placed on Hold`, {
    body: `PO #${poNumber}: "${itemName}" put on hold by ${purchaserName}.${reasonText}`,
    tag: `item-hold-${poNumber}-${itemName}`
  });
}

export function notifyBrowserItemPurchased(poNumber: string, itemName: string, purchasedQty: number, unit: string, purchaserName: string) {
  return sendBrowserNotification(`Item Marked Purchased`, {
    body: `PO #${poNumber}: "${itemName}" (${purchasedQty} ${unit || 'pcs'}) purchased by ${purchaserName}.`,
    tag: `item-purchased-${poNumber}-${itemName}`
  });
}

export function notifyBrowserWarehouseReceived(poNumber: string, itemName: string, receivedQty: number, unit: string, receiverName: string) {
  return sendBrowserNotification(`Warehouse Received Item`, {
    body: `PO #${poNumber}: "${itemName}" (${receivedQty} ${unit || 'pcs'}) verified & received by ${receiverName}.`,
    tag: `warehouse-receive-${poNumber}-${itemName}`
  });
}

export function notifyBrowserPODispatched(poNumber: string, customerName: string, dispatcherName: string) {
  return sendBrowserNotification(`PO Dispatched`, {
    body: `PO #${poNumber} dispatched to ${customerName || 'Customer'} by ${dispatcherName}.`,
    tag: `po-dispatch-${poNumber}`
  });
}
