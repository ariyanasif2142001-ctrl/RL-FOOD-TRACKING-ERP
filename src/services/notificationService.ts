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

/**
 * Triggers device vibration pattern (supported on Mobile Browsers)
 */
export function triggerDeviceVibration(pattern = [400, 150, 400, 150, 600, 200, 800]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibration API error:', e);
    }
  }
}

/**
 * Plays an urgent audio alert chime tone via Web Audio API synthesizer
 */
export function playEmergencyAlertSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'triangle') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Loud 4-step emergency chime ring
    playTone(880, 0, 0.2, 'sawtooth');   // A5
    playTone(1174.66, 0.22, 0.2, 'sawtooth'); // D6
    playTone(1396.91, 0.44, 0.2, 'sawtooth'); // F6
    playTone(1760, 0.66, 0.4, 'triangle'); // A6
  } catch (err) {
    console.warn('Audio alert sound error:', err);
  }
}

// Global BroadcastChannel for real-time user ping alerts across devices/tabs
const userAlertChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('erp_targeted_user_alerts')
  : null;

if (userAlertChannel) {
  userAlertChannel.onmessage = (event) => {
    const data = event.data;
    if (data && data.type === 'TARGETED_USER_ALERT') {
      const currentLoggedInUserId = localStorage.getItem('rl_food_current_user_id') || '';
      const currentLoggedInUserName = localStorage.getItem('rl_food_current_user_name') || '';
      
      // If alert is directed to current user or broadcast all
      if (!data.targetUserId || data.targetUserId === currentLoggedInUserId || data.targetUserName === currentLoggedInUserName) {
        triggerDeviceVibration([500, 200, 500, 200, 1000]);
        playEmergencyAlertSound();
        sendBrowserNotification(`🚨 URGENT ALERT from ${data.senderName || 'Admin'}`, {
          body: data.message || 'You have received an urgent alert signal! Please check your ERP task queue.',
          tag: `user-alert-${Date.now()}`
        });

        // Trigger custom DOM event for on-screen popup alert toast
        window.dispatchEvent(new CustomEvent('ERP_TARGETED_USER_ALERT', { detail: data }));
      }
    }
  };
}

export function sendTargetedUserAlert(
  targetUser: { id: string; name: string; username?: string; role?: string; phone?: string },
  senderName: string = 'Super Admin',
  message?: string
) {
  // 1. Local vibration & audio for instant test feedback
  triggerDeviceVibration([400, 150, 400, 150, 600, 200, 800]);
  playEmergencyAlertSound();

  // 2. Broadcast to other open browser windows / tabs
  if (userAlertChannel) {
    userAlertChannel.postMessage({
      type: 'TARGETED_USER_ALERT',
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      senderName,
      message: message || `🚨 High Priority Alert from ${senderName}! Immediate attention required.`,
      timestamp: new Date().toISOString()
    });
  }

  // 3. Browser notification
  sendBrowserNotification(`🚨 Alert Sent to ${targetUser.name}`, {
    body: `Direct vibration and chime alert dispatched to ${targetUser.name} (@${targetUser.username || targetUser.role}).`,
    tag: `targeted-alert-${targetUser.id}`
  });
}

