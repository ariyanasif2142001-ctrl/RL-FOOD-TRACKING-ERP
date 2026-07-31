import { getAppConfig, TelegramConfig } from '../config/appConfig';
import { PurchaseOrder, POItem, MasterStatus, AuditLog, getNormalizedItemStatus } from '../types';
import { 
  notifyBrowserNewPO, 
  notifyBrowserBulkPO, 
  notifyBrowserItemHold, 
  notifyBrowserItemPurchased, 
  notifyBrowserWarehouseReceived, 
  notifyBrowserPODispatched 
} from './notificationService';

/**
 * Telegram Bot Notification Service
 * Sends real-time alerts to Telegram Channels, Groups, or Admin Chat IDs completely FREE via official Telegram Bot API.
 */

export interface SendMessageResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface SendTelegramOptions {
  silent?: boolean;
  includeButtons?: boolean;
  customUrl?: string;
  inlineKeyboard?: TelegramInlineButton[][];
}

/**
  * Safely escape HTML characters in user input to prevent Telegram API 400 Bad Request errors
  */
function escapeHtml(text: unknown): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Low-level function to send raw Telegram message via HTTPS
 */
export async function sendTelegramMessage(
  messageHtml: string,
  overrideConfig?: { botToken: string; chatId: string },
  options?: SendTelegramOptions
): Promise<SendMessageResult> {
  const config = getAppConfig();
  const telegram = overrideConfig || config.telegramConfig;

  if (!telegram || (!telegram.botToken && !overrideConfig?.botToken) || (!telegram.chatId && !overrideConfig?.chatId)) {
    return { success: false, error: 'Telegram Bot Token or Chat ID is not configured.' };
  }

  const token = telegram.botToken.trim();
  const chatId = telegram.chatId.trim();

  if (!token || !chatId || token.includes('YOUR_') || token.length < 10 || !token.includes(':')) {
    return { success: false, error: 'Telegram Bot Token or Chat ID is unconfigured or invalid format.' };
  }

  const isSilent = options?.silent ?? config.telegramConfig?.silentMode ?? false;
  const showButton = options?.includeButtons ?? config.telegramConfig?.includeWebAppLink ?? true;
  const targetUrl = options?.customUrl || config.telegramConfig?.webAppDisplayUrl || 'https://rlfood-tracking-erp.netlify.app/';

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: messageHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    disable_notification: isSilent
  };

  if (options?.inlineKeyboard && options.inlineKeyboard.length > 0) {
    payload.reply_markup = {
      inline_keyboard: options.inlineKeyboard
    };
  } else if (showButton && targetUrl && targetUrl.startsWith('http')) {
    payload.reply_markup = {
      inline_keyboard: [
        [
          {
            text: '🌐 Open RL Food PO Tracker',
            url: targetUrl
          }
        ]
      ]
    };
  }

  try {
    // 1. Attempt with HTML parse mode
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.ok) {
      return { success: true, message: 'Message sent successfully to Telegram!' };
    }

    // 2. Fallback: If HTML parsing failed (400 Bad Request), retry as plain text cleanly
    if (!data.ok && data.description && (data.description.toLowerCase().includes('parse') || data.description.toLowerCase().includes('entity') || data.description.toLowerCase().includes('button'))) {
      const plainText = messageHtml.replace(/<[^>]+>/g, '');
      const fallbackResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
          disable_web_page_preview: true,
          disable_notification: isSilent
        })
      });
      const fallbackData = await fallbackResponse.json();
      if (fallbackData.ok) {
        return { success: true, message: 'Message sent successfully via plain text fallback.' };
      }
    }

    return { 
      success: false, 
      error: `Telegram API Error (${data.error_code}): ${data.description || 'Failed to send'}` 
    };
  } catch (err: unknown) {
    console.error('Telegram Service Fetch Error:', err);
    return { 
      success: false, 
      error: (err as Error).message || 'Network error connecting to Telegram API.' 
    };
  }
}

/**
 * Test Telegram Bot connection with custom credentials
 */
export async function testTelegramBotConnection(botToken: string, chatId: string): Promise<SendMessageResult> {
  const testMessage = `<b>🔔 RL FOOD ERP - TELEGRAM NOTIFICATION CONNECTED!</b>\n\n` +
    `✅ <i>Your Telegram Bot configuration is active and working properly.</i>\n\n` +
    `📅 <b>Connected Time:</b> ${new Date().toLocaleString()}\n` +
    `🚀 <i>All selected ERP events will now trigger real-time instant alerts to this channel.</i>`;

  return sendTelegramMessage(testMessage, { botToken, chatId });
}

/**
 * Automatically detect Chat ID for private group/channel/user from Telegram getUpdates
 */
export async function detectTelegramChatId(botToken: string): Promise<{
  success: boolean;
  chatId?: string;
  chatTitle?: string;
  type?: string;
  error?: string;
}> {
  const token = botToken.trim();
  if (!token) return { success: false, error: 'Bot Token is required.' };

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to fetch updates' };
    }

    const updates = data.result || [];
    if (updates.length === 0) {
      return {
        success: false,
        error: 'No recent messages found. Please add @rl_food_notify_bot to your group, send any message (e.g. "test") in the group, and click this button again!'
      };
    }

    // Look for latest message or chat member update
    for (let i = updates.length - 1; i >= 0; i--) {
      const u = updates[i];
      const chat = u.message?.chat || u.my_chat_member?.chat || u.channel_post?.chat;
      if (chat && chat.id) {
        return {
          success: true,
          chatId: String(chat.id),
          chatTitle: chat.title || chat.first_name || chat.username || 'Group/Chat',
          type: chat.type
        };
      }
    }

    return {
      success: false,
      error: 'Could not find chat ID in updates. Send a message in your group and retry.'
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message || 'Failed to connect to Telegram.' };
  }
}

/**
 * Event Notifier: New Purchase Order Imported
 */
export async function notifyNewPOImported(
  poNumber: string,
  department: string,
  location: string,
  itemCount: number,
  totalQty: number,
  importedBy: string
) {
  // Fire browser notification
  notifyBrowserNewPO(poNumber, department, itemCount, importedBy).catch(() => {});

  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onNewPO === false) return;

  const msg = `<b>📋 NEW PURCHASE ORDER IMPORTED</b>\n\n` +
    `<b>PO Number:</b> <code>${escapeHtml(poNumber)}</code>\n` +
    `🏢 <b>Department:</b> ${escapeHtml(department || 'General')}\n` +
    `📍 <b>Location:</b> ${escapeHtml(location || 'Central Warehouse')}\n` +
    `📦 <b>Total Items:</b> ${itemCount} items\n` +
    `📊 <b>Total Quantity:</b> ${totalQty}\n` +
    `👤 <b>Imported By:</b> ${escapeHtml(importedBy)}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg);
}

/**
 * Event Notifier: Bulk Purchase Orders Imported (1,000+ items optimized)
 */
export async function notifyBulkPOImported(
  totalPOs: number,
  totalItems: number,
  totalQuantity: number,
  importedBy: string,
  samplePoNumbers?: string[]
) {
  // Fire browser notification
  notifyBrowserBulkPO(totalPOs, totalItems, importedBy).catch(() => {});

  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onPoImport === false) return;

  const poListStr = samplePoNumbers && samplePoNumbers.length > 0 
    ? `\n📄 <b>POs Sample:</b> <code>${samplePoNumbers.slice(0, 5).map(p => escapeHtml(p)).join(', ')}${samplePoNumbers.length > 5 ? '...' : ''}</code>`
    : '';

  const msg = `<b>🚀 BULK PO IMPORT COMPLETED</b>\n\n` +
    `📊 <b>Total POs:</b> ${totalPOs} Orders\n` +
    `📦 <b>Total Items:</b> ${totalItems.toLocaleString()} items\n` +
    `⚖️ <b>Total Quantity:</b> ${totalQuantity.toLocaleString()}\n` +
    `👤 <b>Imported By:</b> ${escapeHtml(importedBy)}${poListStr}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg);
}

/**
 * Event Notifier: Purchaser Holds Item
 */
export async function notifyItemHold(
  poNumber: string,
  itemName: string,
  purchaserName: string,
  notes?: string
) {
  // Fire browser notification
  notifyBrowserItemHold(poNumber, itemName, purchaserName, notes).catch(() => {});

  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onItemHold === false) return;

  const msg = `<b>🔒 ITEM PLACED ON HOLD</b>\n\n` +
    `<b>PO Number:</b> <code>${escapeHtml(poNumber)}</code>\n` +
    `📦 <b>Item:</b> <b>${escapeHtml(itemName)}</b>\n` +
    `👤 <b>Purchaser:</b> ${escapeHtml(purchaserName)}\n` +
    `📝 <b>Reason/Notes:</b> ${escapeHtml(notes || 'Purchaser Hold')}\n` +
    `⏰ <b>Hold Time:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg);
}

/**
 * Event Notifier: Item Purchased
 */
export async function notifyItemPurchased(
  poNumber: string,
  itemName: string,
  purchasedQty: number,
  unit: string,
  marketPrice: number,
  purchaserName: string,
  notes?: string
) {
  // Fire browser notification
  notifyBrowserItemPurchased(poNumber, itemName, purchasedQty, unit, purchaserName).catch(() => {});

  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onPurchased === false) return;

  const priceFormatted = marketPrice > 0 ? ` (৳${marketPrice})` : '';
  const safeNotes = notes ? `\n📝 <b>Notes:</b> ${escapeHtml(notes)}` : '';

  const msg = `<b>🛒 ITEM PURCHASED</b>\n\n` +
    `<b>PO Number:</b> <code>${escapeHtml(poNumber)}</code>\n` +
    `📦 <b>Item:</b> <b>${escapeHtml(itemName)}</b>\n` +
    `🔢 <b>Purchased Qty:</b> ${purchasedQty} ${escapeHtml(unit)}${priceFormatted}\n` +
    `👤 <b>Purchaser:</b> ${escapeHtml(purchaserName)}${safeNotes}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg);
}

/**
 * Event Notifier: Warehouse Receive Verified
 */
export async function notifyWarehouseReceived(
  poNumber: string,
  itemName: string,
  receivedQty: number,
  unit: string,
  receiverName: string,
  notes?: string
) {
  // Fire browser notification
  notifyBrowserWarehouseReceived(poNumber, itemName, receivedQty, unit, receiverName).catch(() => {});

  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onWarehouseReceived === false) return;

  const safeNotes = notes ? `\n📝 <b>Notes:</b> ${escapeHtml(notes)}` : '';

  const msg = `<b>📦 WAREHOUSE GOODS RECEIVED</b>\n\n` +
    `<b>PO Number:</b> <code>${escapeHtml(poNumber)}</code>\n` +
    `📦 <b>Item:</b> <b>${escapeHtml(itemName)}</b>\n` +
    `✅ <b>Verified Qty:</b> ${receivedQty} ${escapeHtml(unit)}\n` +
    `👤 <b>Warehouse Manager:</b> ${escapeHtml(receiverName)}${safeNotes}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg);
}

/**
 * Event Notifier: PO Dispatched
 */
export async function notifyPODispatched(
  poNumber: string,
  customerName: string,
  dispatcherName: string,
  notes?: string
) {
  // Fire browser notification
  notifyBrowserPODispatched(poNumber, customerName, dispatcherName).catch(() => {});

  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onDispatched === false) return;

  const msg = `<b>🚚 DISPATCH COMPLETED</b>\n\n` +
    `<b>PO Number:</b> <code>${escapeHtml(poNumber)}</code>\n` +
    `👤 <b>Customer:</b> ${escapeHtml(customerName || 'N/A')}\n` +
    `🚚 <b>Dispatched By:</b> ${escapeHtml(dispatcherName)}\n` +
    `📝 <b>Notes:</b> ${escapeHtml(notes || 'Goods dispatched successfully')}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg);
}

/**
 * Event Notifier: System Activity / Audit Log
 */
export async function notifyActivityLog(
  user: string,
  role: string,
  action: string,
  details: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onActivityLog === false) return;

  const safeUser = user || 'System/Guest';
  const safeRole = role || 'admin';
  const safeAction = action || 'System Action';
  const safeDetails = details && details.length > 1000 ? details.substring(0, 1000) + '...' : (details || 'N/A');

  const msg = `<b>⚡ SYSTEM ACTIVITY LOG</b>\n\n` +
    `👤 <b>User:</b> <b>${escapeHtml(safeUser)}</b> (${escapeHtml(safeRole.toUpperCase())})\n` +
    `📌 <b>Action:</b> ${escapeHtml(safeAction)}\n` +
    `📝 <b>Details:</b> ${escapeHtml(safeDetails)}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg);
}

/**
 * Event Notifier: Daily Summary Digest Report
 */
export async function notifyDailySummaryReport(
  pos: PurchaseOrder[],
  userCount = 0,
  triggeredBy = 'Admin',
  targetChatId?: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;
  if (config.telegramConfig?.notifyEvents?.onDailySummary === false && !targetChatId) return;

  let totalPOs = pos.length;
  let totalItems = 0;
  let pendingItems = 0;
  let holdItems = 0;
  let purchasedItems = 0;
  let warehouseReceivedItems = 0;
  let totalQty = 0;
  let fulfilledQty = 0;

  pos.forEach(po => {
    (po.items || []).forEach(item => {
      totalItems++;
      const itemQty = item.requestedQty || item.orderedQty || 0;
      totalQty += itemQty;
      const status = getNormalizedItemStatus(item);

      if (status === 'Held') {
        holdItems++;
      } else if (status === 'Purchased') {
        purchasedItems++;
        fulfilledQty += (item.purchasedQty || itemQty);
      } else if (status === 'Partial Purchased') {
        purchasedItems++;
        fulfilledQty += (item.purchasedQty || 0);
      } else if (item.warehouseQty && item.warehouseQty >= itemQty) {
        warehouseReceivedItems++;
        fulfilledQty += itemQty;
      } else {
        pendingItems++;
      }
    });
  });

  const completionRate = totalQty > 0 ? Math.round((fulfilledQty / totalQty) * 100) : 0;
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const msg = `<b>📊 DAILY PURCHASE & INVENTORY SUMMARY REPORT</b>\n` +
    `📅 <i>${dateStr}</i>\n\n` +
    `📦 <b>Total Active POs:</b> ${totalPOs} Orders\n` +
    `📋 <b>Total Line Items:</b> ${totalItems.toLocaleString()} items\n\n` +
    `<b>STATUS BREAKDOWN:</b>\n` +
    `⏳ <b>Pending Purchase:</b> ${pendingItems.toLocaleString()} items\n` +
    `⏸️ <b>On Hold:</b> ${holdItems.toLocaleString()} items\n` +
    `🛒 <b>Purchased / In-Transit:</b> ${purchasedItems.toLocaleString()} items\n` +
    `🏬 <b>Received at Warehouse:</b> ${warehouseReceivedItems.toLocaleString()} items\n\n` +
    `📈 <b>Fulfillment Progress:</b> ${completionRate}% (${fulfilledQty.toLocaleString()} / ${totalQty.toLocaleString()} units)\n` +
    (userCount > 0 ? `👥 <b>Active Team Users:</b> ${userCount} Users\n` : '') +
    `👤 <b>Report Generated By:</b> ${escapeHtml(triggeredBy)}\n` +
    `⏰ <b>Report Time:</b> ${new Date().toLocaleTimeString()}`;

  const overrideConfig = targetChatId && config.telegramConfig?.botToken ? { botToken: config.telegramConfig.botToken, chatId: targetChatId } : undefined;
  return sendTelegramMessage(msg, overrideConfig, { includeButtons: true });
}

/**
 * Specialized Report 1: Pending Purchases Urgent Report
 */
export async function notifyPendingPurchasesReport(
  pos: PurchaseOrder[],
  triggeredBy = 'Admin',
  targetChatId?: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;

  const pendingList: Array<{ poNumber: string; itemName: string; qty: number; unit: string; dept: string }> = [];

  pos.forEach(po => {
    (po.items || []).forEach(item => {
      const status = getNormalizedItemStatus(item);
      if (status === 'Pending') {
        pendingList.push({
          poNumber: po.poNumber || 'N/A',
          itemName: item.itemName || 'Unnamed Item',
          qty: item.requestedQty || item.orderedQty || 0,
          unit: item.unit || 'units',
          dept: po.department || 'General'
        });
      }
    });
  });

  const totalPendingCount = pendingList.length;
  const topItems = pendingList.slice(0, 8); // top 8 items preview

  let itemsFormatted = '';
  if (totalPendingCount === 0) {
    itemsFormatted = `<i>🎉 Great news! There are currently 0 pending items. All purchases are up to date!</i>\n`;
  } else {
    itemsFormatted = topItems.map((i, idx) =>
      `${idx + 1}. <b>${escapeHtml(i.itemName)}</b> — ${i.qty} ${escapeHtml(i.unit)} (PO: <code>${escapeHtml(i.poNumber)}</code> | ${escapeHtml(i.dept)})`
    ).join('\n');

    if (totalPendingCount > 8) {
      itemsFormatted += `\n<i>...and ${totalPendingCount - 8} more pending items.</i>`;
    }
  }

  const msg = `<b>🛒 URGENT PENDING PURCHASES REPORT</b>\n` +
    `📅 <i>${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</i>\n\n` +
    `⚠️ <b>Total Pending Line Items:</b> ${totalPendingCount} Items needing purchase\n\n` +
    `<b>SUMMARY LIST:</b>\n` +
    `${itemsFormatted}\n\n` +
    `👤 <b>Requested By:</b> ${escapeHtml(triggeredBy)}\n` +
    `⏰ <b>Generated:</b> ${new Date().toLocaleTimeString()}`;

  const overrideConfig = targetChatId && config.telegramConfig?.botToken ? { botToken: config.telegramConfig.botToken, chatId: targetChatId } : undefined;
  return sendTelegramMessage(msg, overrideConfig, { includeButtons: true });
}

/**
 * Specialized Report 2: On-Hold Items Report
 */
export async function notifyHoldItemsReport(
  pos: PurchaseOrder[],
  triggeredBy = 'Admin',
  targetChatId?: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;

  const holdList: Array<{ poNumber: string; itemName: string; reason: string; heldBy: string }> = [];

  pos.forEach(po => {
    (po.items || []).forEach(item => {
      const status = getNormalizedItemStatus(item);
      if (status === 'Held' || po.isHeldByAdmin) {
        holdList.push({
          poNumber: po.poNumber || 'N/A',
          itemName: item.itemName || 'Unnamed Item',
          reason: item.holdReason || (item as { reason?: string }).reason || (po as { holdReason?: string }).holdReason || 'No reason specified',
          heldBy: item.holdBy || 'Admin'
        });
      }
    });
  });

  const totalHoldCount = holdList.length;
  const topHolds = holdList.slice(0, 8);

  let holdsFormatted = '';
  if (totalHoldCount === 0) {
    holdsFormatted = `<i>✅ No items are currently on hold. Operations are flowing smoothly!</i>\n`;
  } else {
    holdsFormatted = topHolds.map((h, idx) =>
      `${idx + 1}. <b>${escapeHtml(h.itemName)}</b> (PO: <code>${escapeHtml(h.poNumber)}</code>)\n` +
      `   💬 Reason: <i>"${escapeHtml(h.reason)}"</i>`
    ).join('\n\n');

    if (totalHoldCount > 8) {
      holdsFormatted += `\n<i>...and ${totalHoldCount - 8} more hold items.</i>`;
    }
  }

  const msg = `<b>⏸️ ON-HOLD ITEMS DIGEST REPORT</b>\n` +
    `📅 <i>${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</i>\n\n` +
    `🛑 <b>Total Items On Hold:</b> ${totalHoldCount} Items\n\n` +
    `<b>HOLD DETAILS:</b>\n` +
    `${holdsFormatted}\n\n` +
    `👤 <b>Report Generated By:</b> ${escapeHtml(triggeredBy)}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  const overrideConfig = targetChatId && config.telegramConfig?.botToken ? { botToken: config.telegramConfig.botToken, chatId: targetChatId } : undefined;
  return sendTelegramMessage(msg, overrideConfig, { includeButtons: true });
}

/**
 * Specialized Report 3: Purchased & In-Transit Dispatch Status
 */
export async function notifyPurchasedInTransitReport(
  pos: PurchaseOrder[],
  triggeredBy = 'Admin',
  targetChatId?: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;

  const purchasedList: Array<{ poNumber: string; itemName: string; qty: number; supplier: string; date: string }> = [];

  pos.forEach(po => {
    (po.items || []).forEach(item => {
      const status = getNormalizedItemStatus(item);
      if (status === 'Purchased' || status === 'Partial Purchased') {
        purchasedList.push({
          poNumber: po.poNumber || 'N/A',
          itemName: item.itemName || 'Unnamed Item',
          qty: item.purchasedQty || item.requestedQty || 0,
          supplier: item.supplierName || (item as { supplier?: string }).supplier || 'Standard Supplier',
          date: item.purchasedAt || po.orderDate || 'Today'
        });
      }
    });
  });

  const totalPurchasedCount = purchasedList.length;
  const topList = purchasedList.slice(0, 8);

  let listFormatted = '';
  if (totalPurchasedCount === 0) {
    listFormatted = `<i>ℹ️ No items currently in-transit/purchased state.</i>\n`;
  } else {
    listFormatted = topList.map((p, idx) =>
      `${idx + 1}. <b>${escapeHtml(p.itemName)}</b> — Qty: ${p.qty} (PO: <code>${escapeHtml(p.poNumber)}</code>)\n` +
      `   🚚 Supplier: ${escapeHtml(p.supplier)}`
    ).join('\n');

    if (totalPurchasedCount > 8) {
      listFormatted += `\n<i>...and ${totalPurchasedCount - 8} more items in-transit.</i>`;
    }
  }

  const msg = `<b>🚚 PURCHASED & IN-TRANSIT GOODS REPORT</b>\n` +
    `📅 <i>${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</i>\n\n` +
    `🛒 <b>Active Purchases in Transit:</b> ${totalPurchasedCount} Items\n\n` +
    `<b>IN-TRANSIT SHIPMENTS:</b>\n` +
    `${listFormatted}\n\n` +
    `👤 <b>Generated By:</b> ${escapeHtml(triggeredBy)}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  const overrideConfig = targetChatId && config.telegramConfig?.botToken ? { botToken: config.telegramConfig.botToken, chatId: targetChatId } : undefined;
  return sendTelegramMessage(msg, overrideConfig, { includeButtons: true });
}

/**
 * Specialized Report 4: Warehouse Receiving & Stock Report
 */
export async function notifyWarehouseInventoryReport(
  pos: PurchaseOrder[],
  triggeredBy = 'Admin',
  targetChatId?: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return;

  const warehouseList: Array<{ poNumber: string; itemName: string; qty: number; location: string }> = [];

  pos.forEach(po => {
    (po.items || []).forEach(item => {
      if (item.warehouseQty && item.warehouseQty > 0) {
        warehouseList.push({
          poNumber: po.poNumber || 'N/A',
          itemName: item.itemName || 'Unnamed Item',
          qty: item.warehouseQty,
          location: po.location || 'Central Warehouse'
        });
      }
    });
  });

  const totalWhCount = warehouseList.length;
  const topList = warehouseList.slice(0, 8);

  let listFormatted = '';
  if (totalWhCount === 0) {
    listFormatted = `<i>🏬 No items currently logged in warehouse staging area.</i>\n`;
  } else {
    listFormatted = topList.map((w, idx) =>
      `${idx + 1}. <b>${escapeHtml(w.itemName)}</b> — Staged: ${w.qty} units (PO: <code>${escapeHtml(w.poNumber)}</code> | ${escapeHtml(w.location)})`
    ).join('\n');

    if (totalWhCount > 8) {
      listFormatted += `\n<i>...and ${totalWhCount - 8} more warehouse items.</i>`;
    }
  }

  const msg = `<b>🏬 WAREHOUSE RECEIVING & STAGING REPORT</b>\n` +
    `📅 <i>${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</i>\n\n` +
    `📦 <b>Received Warehouse Line Items:</b> ${totalWhCount} Items\n\n` +
    `<b>STAGED ITEMS:</b>\n` +
    `${listFormatted}\n\n` +
    `👤 <b>Generated By:</b> ${escapeHtml(triggeredBy)}\n` +
    `⏰ <b>Time:</b> ${new Date().toLocaleTimeString()}`;

  const overrideConfig = targetChatId && config.telegramConfig?.botToken ? { botToken: config.telegramConfig.botToken, chatId: targetChatId } : undefined;
  return sendTelegramMessage(msg, overrideConfig, { includeButtons: true });
}

/**
 * Custom Telegram Alert Broadcast
 */
export async function sendCustomTelegramAlert(
  customMessage: string,
  triggeredBy = 'Admin',
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL' = 'NORMAL',
  targetChatId?: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) return { success: false, error: 'Telegram Bot is currently disabled in Settings.' };

  const priorityHeader = priority === 'CRITICAL' 
    ? '🚨 <b>CRITICAL BROADCAST ALERT</b> 🚨'
    : priority === 'URGENT'
    ? '⚠️ <b>URGENT ANNOUNCEMENT</b> ⚠️'
    : '📢 <b>CUSTOM TELEGRAM ALERT</b>';

  const timeStr = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const msg = `${priorityHeader}\n\n` +
    `💬 <b>Message:</b>\n` +
    `${escapeHtml(customMessage)}\n\n` +
    `👤 <b>Sent By:</b> ${escapeHtml(triggeredBy)}\n` +
    `⏰ <b>Time:</b> ${escapeHtml(timeStr)}`;

  const overrideConfig = targetChatId && config.telegramConfig?.botToken ? { botToken: config.telegramConfig.botToken, chatId: targetChatId } : undefined;
  return sendTelegramMessage(msg, overrideConfig, { includeButtons: true });
}

/**
 * Helper to get clean SL Number string
 */
function getItemSlNo(item: POItem, fallbackIndex: number): string {
  if (item.slNumber !== undefined && item.slNumber !== null && String(item.slNumber).trim() !== '') {
    const num = parseInt(String(item.slNumber), 10);
    if (!isNaN(num)) {
      return String(num).padStart(2, '0');
    }
    return String(item.slNumber).trim();
  }
  return String(fallbackIndex + 1).padStart(2, '0');
}

/**
 * Single PO Detailed Report Notification
 */
export async function notifySinglePOReport(
  po: PurchaseOrder,
  triggeredBy = 'Admin',
  targetChatId?: string
) {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) {
    return { success: false, error: 'Telegram Bot is not enabled in settings. Please enable Telegram Notifications in Telegram Settings.' };
  }

  const items = po.items || [];
  const totalItems = items.length;
  const purchasedItems = items.filter(i => {
    const s = getNormalizedItemStatus(i);
    return s === 'Purchased';
  }).length;
  const pendingItems = items.filter(i => {
    const s = getNormalizedItemStatus(i);
    return s === 'Pending';
  }).length;
  const heldItems = items.filter(i => {
    const s = getNormalizedItemStatus(i);
    return s === 'Held';
  }).length;

  const statusBadge = po.purchaseStatus === 'Completed' ? '✅ COMPLETED' :
    po.purchaseStatus === 'Partial' ? '🔄 PARTIAL' :
    po.purchaseStatus === 'Held' ? '⏸️ ON HOLD' : '⏳ PENDING';

  // Chunking to handle big POs without exceeding Telegram's 4096 char limit per request
  const CHUNK_SIZE = 10; // 10 items per message batch keeps text safely under 3000 chars
  const totalChunks = Math.ceil(items.length / CHUNK_SIZE) || 1;

  let lastResult: SendMessageResult = { success: false, error: 'No items in PO' };

  for (let c = 0; c < totalChunks; c++) {
    const chunkItems = items.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);

    const chunkDetails = chunkItems.map((item, idxWithinChunk) => {
      const globalIdx = c * CHUNK_SIZE + idxWithinChunk;
      const sl = getItemSlNo(item, globalIdx);
      const status = getNormalizedItemStatus(item);
      let statusEmoji = '⏳';
      if (status === 'Purchased') statusEmoji = '✅';
      else if (status === 'Partial Purchased') statusEmoji = '🔄';
      else if (status === 'Held') statusEmoji = '⏸️';

      let line = `<b>SL# ${sl}</b> | ${statusEmoji} <b>${escapeHtml(item.itemName)}</b>\n` +
        `   • Req Qty: <b>${item.requestedQty || item.orderedQty || 0}</b> ${escapeHtml(item.unit || 'units')}` +
        (item.purchasedQty ? ` | Bought: <b>${item.purchasedQty}</b>` : '') +
        `\n   • Status: <b>${escapeHtml(status)}</b>`;

      if (item.brand && item.brand.trim() !== '') {
        line += ` | Brand: <i>${escapeHtml(item.brand)}</i>`;
      }
      if (status === 'Held' && (item.holdReason || (item as { reason?: string }).reason)) {
        line += `\n   • Hold Reason: <i>"${escapeHtml(item.holdReason || (item as { reason?: string }).reason)}"</i>`;
      }
      return line;
    }).join('\n\n');

    let msg = '';
    if (c === 0) {
      // Main header on chunk 1
      msg = `<b>📋 PURCHASE ORDER REPORT SUMMARY</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔖 <b>PO Number:</b> <code>${escapeHtml(po.poNumber)}</code>\n` +
        `📊 <b>PO Status:</b> ${statusBadge}\n` +
        `🏢 <b>Department:</b> ${escapeHtml(po.department || 'General')}\n` +
        `📍 <b>Outlet/Location:</b> ${escapeHtml(po.location || 'Central Warehouse')}\n` +
        `📅 <b>Order Date:</b> ${escapeHtml(po.orderDate || 'N/A')}\n\n` +
        `📦 <b>Summary Stats:</b>\n` +
        ` • Total Line Items: ${totalItems}\n` +
        ` • ✅ Purchased: ${purchasedItems}\n` +
        ` • ⏳ Pending: ${pendingItems}\n` +
        ` • ⏸️ On Hold: ${heldItems}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>📄 LINE ITEM DETAILS ${totalChunks > 1 ? `(Part 1/${totalChunks})` : ''}:</b>\n\n` +
        `${chunkDetails || '<i>No line items registered</i>'}\n\n` +
        ((po as { remarks?: string }).remarks || po.dispatchNotes ? `💬 <b>PO Notes:</b> <i>"${escapeHtml((po as { remarks?: string }).remarks || po.dispatchNotes)}"</i>\n\n` : '') +
        `👤 <b>Sent By:</b> ${escapeHtml(triggeredBy)}\n` +
        `⏰ <b>Timestamp:</b> ${new Date().toLocaleTimeString()}`;
    } else {
      // Continuation header for chunks 2, 3, etc.
      msg = `<b>📋 PO #${escapeHtml(po.poNumber)} — LINE ITEM DETAILS (Part ${c + 1}/${totalChunks})</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${chunkDetails}\n\n` +
        `⏰ <b>Timestamp:</b> ${new Date().toLocaleTimeString()}`;
    }

    const overrideConfig = targetChatId && config.telegramConfig?.botToken ? { botToken: config.telegramConfig.botToken, chatId: targetChatId } : undefined;
    
    let inlineKeyboard: TelegramInlineButton[][] | undefined = undefined;
    if (c === totalChunks - 1) {
      const targetUrl = config.telegramConfig?.webAppDisplayUrl || 'https://rlfood-tracking-erp.netlify.app/';
      inlineKeyboard = [];
      const pendingItemsList = items.filter(i => getNormalizedItemStatus(i) === 'Pending');
      if (pendingItemsList.length > 0) {
        const first = pendingItemsList[0];
        const cleanName = first.itemName.length > 14 ? first.itemName.slice(0, 14) + '…' : first.itemName;
        inlineKeyboard.push([
          { text: `✅ Buy ${cleanName}`, callback_data: `buy:${po.poNumber}:${first.id}` },
          { text: `⏸️ Hold`, callback_data: `hold:${po.poNumber}:${first.id}` },
          { text: `🏬 Receive`, callback_data: `rcv:${po.poNumber}:${first.id}` }
        ]);
      }
      inlineKeyboard.push([
        { text: '✅ Buy All Items', callback_data: `buy_all:${po.poNumber}` },
        { text: '🏬 Receive All Staging', callback_data: `rcv_all:${po.poNumber}` }
      ]);
      inlineKeyboard.push([
        { text: '🌐 Open RL Food Web Portal', url: targetUrl }
      ]);
    }

    lastResult = await sendTelegramMessage(msg, overrideConfig, { 
      includeButtons: c === totalChunks - 1,
      inlineKeyboard
    });

    if (!lastResult.success) {
      return lastResult;
    }

    // Small delay between chunk requests to comply with Telegram API rate limits
    if (c < totalChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  return lastResult;
}

/**
 * Helper to convert Bengali digits (০-৯) to standard English numbers (0-9)
 */
function convertBanglaDigitsToEnglish(text: string): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let res = text;
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(banglaDigits[i], 'g'), String(i));
  }
  return res;
}

/**
 * Answer Telegram Callback Queries (removes loading spinner on inline button click)
 */
async function answerTelegramCallback(token: string, callbackQueryId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false })
    });
  } catch {
    // ignore background network errors
  }
}

/**
 * Speech / Voice / Natural Language Telegram Command Execution Engine
 * Parses English and Bengali voice note transcripts or natural messages
 * Example inputs:
 *  - "PO 102 এর 10 kg Apple receive করা হয়েছে"
 *  - "Buy 50kg Sugar for PO-101"
 *  - "PO 105 Fish hold quality problem"
 *  - "/buy PO-102 Apple"
 *  - "/hold PO-102 Apple Out of stock"
 */
export function parseAndExecuteTelegramInstruction(
  rawInput: string,
  currentPOs: PurchaseOrder[],
  senderName: string
): { updatedPOs: PurchaseOrder[]; logMessage: string; responseHtml: string; success: boolean } {
  const normalizedText = convertBanglaDigitsToEnglish(rawInput.trim());
  const lower = normalizedText.toLowerCase();

  // 1. Extract PO Number (PO-102, PO 102, PO102, 102)
  const poMatch = normalizedText.match(/PO[- ]?(\d+)/i) || normalizedText.match(/(\d+)\s*(po|পিও)/i);
  let targetPO: PurchaseOrder | undefined;
  if (poMatch) {
    const poDigits = poMatch[1];
    targetPO = currentPOs.find(p => p.poNumber.toLowerCase().includes(poDigits.toLowerCase()));
  }

  // 2. Identify Action Intent
  const isPurchase = /buy|bought|purchased|কেনা|কিনেছি|পারচেজ|ক্রয়|পরিশোধ|কিনে|অ্যাপ্রুভ|approve/i.test(lower);
  const isHold = /hold|onhold|আটক|হোল্ড|স্থগিত|সমস্যা|কোয়ালিটি|মান খারাপ|পজ|pause/i.test(lower);
  const isReceive = /receive|received|warehouse|রিসিভ|পেয়েছি|গুদাম|স্টক|পৌঁছেছে|ইনভেন্টরি/i.test(lower);
  const isRelease = /release|unhold|মুক্ত|ছাড়|অনহোল্ড/i.test(lower);

  // 3. Extract quantity if specified (e.g. 10 kg, 50 units, 50, ১০)
  const qtyMatch = normalizedText.match(/(\d+(\.\d+)?)\s*(kg|g|units|pcs|bag|boxes|কেজি|গ্রাম|পিস|বস্তা|টি|কেজী)?/i);
  const extractedQty = qtyMatch ? parseFloat(qtyMatch[1]) : undefined;

  // 4. Extract item name keyword or match against targetPO items
  let targetItemIndex = -1;
  let targetItem: POItem | undefined;

  if (targetPO && targetPO.items && targetPO.items.length > 0) {
    for (let i = 0; i < targetPO.items.length; i++) {
      const item = targetPO.items[i];
      const nameLower = item.itemName.toLowerCase();
      if (lower.includes(nameLower) || nameLower.split(' ').some(word => word.length > 2 && lower.includes(word))) {
        targetItemIndex = i;
        targetItem = item;
        break;
      }
    }

    if (!targetItem) {
      if (isPurchase || isHold) {
        targetItemIndex = targetPO.items.findIndex(i => getNormalizedItemStatus(i) !== 'Purchased');
        if (targetItemIndex >= 0) targetItem = targetPO.items[targetItemIndex];
      } else if (isReceive) {
        targetItemIndex = targetPO.items.findIndex(i => (i.purchasedQty || 0) > 0);
        if (targetItemIndex >= 0) targetItem = targetPO.items[targetItemIndex];
      }
      if (!targetItem && targetPO.items.length > 0) {
        targetItemIndex = 0;
        targetItem = targetPO.items[0];
      }
    }
  } else if (!targetPO) {
    for (const po of currentPOs) {
      for (let i = 0; i < (po.items || []).length; i++) {
        const item = po.items[i];
        if (lower.includes(item.itemName.toLowerCase())) {
          targetPO = po;
          targetItem = item;
          targetItemIndex = i;
          break;
        }
      }
      if (targetPO) break;
    }
  }

  if (!targetPO) {
    return {
      updatedPOs: currentPOs,
      logMessage: '',
      success: false,
      responseHtml: `⚠️ <b>Could Not Identify PO Number!</b>\n\n` +
        `Please specify a valid PO Number (e.g. <code>/buy PO-102 Apple</code> or <i>"PO 102 এর 10 kg Apple receive করা হয়েছে"</i>).`
    };
  }

  if (!targetItem) {
    return {
      updatedPOs: currentPOs,
      logMessage: '',
      success: false,
      responseHtml: `⚠️ <b>No Matching Item Found in PO <code>${targetPO.poNumber}</code>!</b>\n\n` +
        `Use <code>/po ${targetPO.poNumber}</code> to list all line items in this purchase order.`
    };
  }

  const updatedPOs = currentPOs.map(po => {
    if (po.id !== targetPO!.id && po.poNumber !== targetPO!.poNumber) return po;

    const newItems = (po.items || []).map(item => {
      if (item.id !== targetItem!.id && item.itemName !== targetItem!.itemName) return item;

      if (isPurchase) {
        const reqQty = item.requestedQty || item.orderedQty || 1;
        const finalPurQty = extractedQty || reqQty;
        return {
          ...item,
          purchasedQty: finalPurQty,
          purchaseStatus: finalPurQty >= reqQty ? ('Purchased' as const) : ('Partial Purchased' as const),
          purchasedAt: new Date().toISOString(),
          purchaserName: `Telegram User (@${senderName})`,
          holdBy: '',
          holdStartTime: '',
          holdExpireTime: ''
        };
      } else if (isHold) {
        const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
        const nowIso = new Date().toISOString();
        const expireIso = new Date(Date.now() + FIVE_HOURS_MS).toISOString();
        return {
          ...item,
          purchaseStatus: 'Held' as const,
          holdBy: `Telegram User (@${senderName})`,
          holdStartTime: nowIso,
          holdExpireTime: expireIso,
          notes: rawInput
        };
      } else if (isReceive) {
        const reqQty = item.requestedQty || item.orderedQty || 1;
        const finalRcvQty = extractedQty || item.purchasedQty || reqQty;
        return {
          ...item,
          warehouseQty: finalRcvQty,
          warehouseVerifiedBy: `Telegram User (@${senderName})`,
          warehouseVerifiedAt: new Date().toISOString(),
          warehouseNotes: 'Verified via Telegram Command/Voice'
        };
      } else if (isRelease) {
        return {
          ...item,
          purchaseStatus: (item.purchasedQty || 0) > 0 ? ('Partial Purchased' as const) : ('Pending' as const),
          holdBy: '',
          holdStartTime: '',
          holdExpireTime: ''
        };
      }
      return item;
    });

    const allPur = newItems.every(i => i.purchaseStatus === 'Purchased');
    const anyPur = newItems.some(i => i.purchaseStatus === 'Purchased' || i.purchaseStatus === 'Partial Purchased');
    const anyHeld = newItems.some(i => i.purchaseStatus === 'Held');
    const newMasterStatus: MasterStatus = allPur ? 'Completed' : (anyPur ? 'Partial' : (anyHeld ? 'Held' : 'Pending'));

    return {
      ...po,
      purchaseStatus: newMasterStatus,
      items: newItems
    };
  });

  const updatedItemObj = updatedPOs
    .find(p => p.poNumber === targetPO!.poNumber)
    ?.items.find(i => i.id === targetItem!.id);

  let actionTitle = 'ACTION PROCESSED';
  let statusEmoji = '⚡';
  if (isPurchase) {
    actionTitle = 'ITEM PURCHASED & APPROVED';
    statusEmoji = '✅';
  } else if (isHold) {
    actionTitle = 'ITEM PLACED ON HOLD (5-HR AUTO TIMER)';
    statusEmoji = '⏸️';
  } else if (isReceive) {
    actionTitle = 'WAREHOUSE STAGING RECEIVED';
    statusEmoji = '🏬';
  } else if (isRelease) {
    actionTitle = 'HOLD RELEASED';
    statusEmoji = '🔓';
  }

  const logMsg = `${statusEmoji} Telegram @${senderName}: ${actionTitle} for PO ${targetPO.poNumber} - ${targetItem.itemName}`;

  const responseHtml = `<b>${statusEmoji} ${actionTitle} VIA TELEGRAM ACTION!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 <b>PO Number:</b> <code>${targetPO.poNumber}</code>\n` +
    `🛒 <b>Item Name:</b> ${escapeHtml(targetItem.itemName)}\n` +
    `📦 <b>Req Qty:</b> ${targetItem.requestedQty || 0} ${escapeHtml(targetItem.unit || '')}\n` +
    (isPurchase ? `✅ <b>Purchased Qty:</b> ${updatedItemObj?.purchasedQty || targetItem.requestedQty} ${escapeHtml(targetItem.unit || '')}\n` : '') +
    (isHold ? `⏸️ <b>Hold By:</b> ${escapeHtml(updatedItemObj?.holdBy || senderName)}\n⏱️ <b>Expires:</b> 5 Hours\n` : '') +
    (isReceive ? `🏬 <b>Warehouse Staged Qty:</b> ${updatedItemObj?.warehouseQty || targetItem.requestedQty} ${escapeHtml(targetItem.unit || '')}\n` : '') +
    `👤 <b>Executed By:</b> Telegram User (@${escapeHtml(senderName)})\n` +
    `⏰ <b>Timestamp:</b> ${new Date().toLocaleTimeString()}`;

  return {
    updatedPOs,
    logMessage: logMsg,
    success: true,
    responseHtml
  };
}

/**
 * Interactive 2-Way Command Listener for Telegram Bot
 */
export async function processTelegramUpdates(
  pos: PurchaseOrder[],
  onStateUpdate?: (updatedPOs: PurchaseOrder[], logMessage: string) => void
): Promise<{
  processedCount: number;
  lastCommand?: string;
  error?: string;
}> {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled || !config.telegramConfig.botToken) {
    return { processedCount: 0, error: 'Telegram Bot is disabled or missing bot token.' };
  }

  const telegram = config.telegramConfig;
  const token = config.telegramConfig.botToken.trim();
  if (!token || token.includes('YOUR_') || token.length < 10 || !token.includes(':')) {
    return { processedCount: 0, error: 'Telegram Bot token is unconfigured or invalid format.' };
  }
  const storedOffsetStr = localStorage.getItem('rl_telegram_last_offset');
  let currentOffset = storedOffsetStr ? parseInt(storedOffsetStr, 10) : 0;

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${currentOffset}&timeout=0`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      return { processedCount: 0, error: data.description || 'Failed to fetch updates from Telegram API.' };
    }

    const updates = data.result || [];
    if (updates.length === 0) {
      return { processedCount: 0 };
    }

    let processedCount = 0;
    let lastCommand = '';
    let currentPOs = [...pos];

    for (const u of updates) {
      const updateId = u.update_id;
      if (updateId >= currentOffset) {
        currentOffset = updateId + 1;
        localStorage.setItem('rl_telegram_last_offset', String(currentOffset));
      }

      // A. HANDLE TELEGRAM INLINE BUTTON CALLBACK QUERIES (One-Tap Approvals & Actions)
      if (u.callback_query) {
        const cb = u.callback_query;
        const cbId = cb.id;
        const cbData = String(cb.data || '');
        const chatId = String(cb.message?.chat?.id || telegram.chatId);
        const senderName = cb.from?.first_name || cb.from?.username || 'Telegram User';

        await answerTelegramCallback(token, cbId, 'Processing 1-tap action...');
        processedCount++;
        lastCommand = `callback:${cbData}`;

        if (cbData.startsWith('buy:') || cbData.startsWith('hold:') || cbData.startsWith('rcv:')) {
          const parts = cbData.split(':');
          const act = parts[0];
          const poNum = parts[1];
          const itemId = parts[2];

          let simulatedText = '';
          if (act === 'buy') simulatedText = `/buy ${poNum} item ${itemId}`;
          else if (act === 'hold') simulatedText = `/hold ${poNum} item ${itemId} Hold via Telegram 1-Tap`;
          else if (act === 'rcv') simulatedText = `/receive ${poNum} item ${itemId}`;

          const res = parseAndExecuteTelegramInstruction(simulatedText, currentPOs, senderName);
          if (res.success) {
            currentPOs = res.updatedPOs;
            if (onStateUpdate) {
              onStateUpdate(currentPOs, res.logMessage);
            }
            await sendTelegramMessage(res.responseHtml, { botToken: token, chatId }, { includeButtons: true });
          }
        }
        else if (cbData.startsWith('buy_all:') || cbData.startsWith('rcv_all:') || cbData.startsWith('hold_po:')) {
          const parts = cbData.split(':');
          const act = parts[0];
          const poNum = parts[1];

          const targetPO = currentPOs.find(p => p.poNumber.toLowerCase() === poNum.toLowerCase() || p.poNumber.toLowerCase().includes(poNum.toLowerCase()));
          if (targetPO) {
            currentPOs = currentPOs.map(p => {
              if (p.id !== targetPO.id && p.poNumber !== targetPO.poNumber) return p;
              const newItems = (p.items || []).map(i => {
                if (act === 'buy_all') {
                  const req = i.requestedQty || i.orderedQty || 1;
                  return {
                    ...i,
                    purchasedQty: req,
                    purchaseStatus: 'Purchased' as const,
                    purchasedAt: new Date().toISOString(),
                    purchaserName: `Telegram 1-Tap (@${senderName})`,
                    holdBy: '',
                    holdStartTime: '',
                    holdExpireTime: ''
                  };
                } else if (act === 'rcv_all') {
                  const req = i.requestedQty || i.orderedQty || 1;
                  return {
                    ...i,
                    warehouseQty: req,
                    warehouseVerifiedBy: `Telegram 1-Tap (@${senderName})`,
                    warehouseVerifiedAt: new Date().toISOString()
                  };
                } else if (act === 'hold_po') {
                  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
                  return {
                    ...i,
                    purchaseStatus: 'Held' as const,
                    holdBy: `Telegram 1-Tap (@${senderName})`,
                    holdStartTime: new Date().toISOString(),
                    holdExpireTime: new Date(Date.now() + FIVE_HOURS_MS).toISOString()
                  };
                }
                return i;
              });
              const masterStatus: MasterStatus = act === 'buy_all' ? 'Completed' : (act === 'hold_po' ? 'Held' : p.purchaseStatus);
              return { ...p, purchaseStatus: masterStatus, items: newItems };
            });

            const actionLabel = act === 'buy_all' ? 'ALL ITEMS PURCHASED' : (act === 'rcv_all' ? 'ALL STAGING RECEIVED' : 'PO PLACED ON HOLD');
            const logMsg = `⚡ Telegram @${senderName}: ${actionLabel} for PO ${targetPO.poNumber}`;
            if (onStateUpdate) {
              onStateUpdate(currentPOs, logMsg);
            }

            const cardMsg = `<b>⚡ BULK ACTION PROCESSED FOR PO <code>${targetPO.poNumber}</code>!</b>\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `📌 <b>Action:</b> ${actionLabel}\n` +
              `📦 <b>Total Items Affected:</b> ${targetPO.items.length}\n` +
              `👤 <b>Executed By:</b> Telegram @${senderName}\n` +
              `⏰ <b>Timestamp:</b> ${new Date().toLocaleTimeString()}`;
            await sendTelegramMessage(cardMsg, { botToken: token, chatId }, { includeButtons: true });
          }
        }
        continue;
      }

      // B. HANDLE TELEGRAM MESSAGES (Commands, Voice Notes & Speech Transcripts)
      const msg = u.message || u.edited_message || u.channel_post;
      if (!msg) continue;

      const chatId = String(msg.chat.id);
      const senderName = msg.from?.first_name || msg.from?.username || 'Telegram User';

      // 1. Handle Voice Note messages
      if (msg.voice || msg.audio) {
        processedCount++;
        lastCommand = 'voice_note';
        const speechText = msg.caption || msg.text || '';
        if (speechText.trim().length > 0) {
          const res = parseAndExecuteTelegramInstruction(speechText, currentPOs, senderName);
          if (res.success) {
            currentPOs = res.updatedPOs;
            if (onStateUpdate) {
              onStateUpdate(currentPOs, res.logMessage);
            }
          }
          await sendTelegramMessage(res.responseHtml, { botToken: token, chatId }, { includeButtons: true });
        } else {
          const voiceResp = `<b>🎙️ VOICE COMMAND RECEIVED FROM @${escapeHtml(senderName)}!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<i>The voice note was received successfully.</i>\n\n` +
            `💡 <b>How to process speech commands:</b>\n` +
            `1. Send your voice note with a audio caption (e.g. <code>PO 102 10 kg Apple receive</code>).\n` +
            `2. Or type command: <code>/voice PO 102 এর চিনি ১০ কেজি কেনা হয়েছে</code>\n\n` +
            `<i>Bot will automatically update ERP inventory database & log audit history!</i>`;
          await sendTelegramMessage(voiceResp, { botToken: token, chatId }, { includeButtons: true });
        }
        continue;
      }

      if (!msg.text) continue;

      const rawText = msg.text.trim();

      // Check for direct Action Commands (/buy, /hold, /receive, /release, /voice) or Natural Text Speech
      const lowerText = rawText.toLowerCase();

      if (
        lowerText.startsWith('/buy') ||
        lowerText.startsWith('/approve') ||
        lowerText.startsWith('/hold') ||
        lowerText.startsWith('/receive') ||
        lowerText.startsWith('/release') ||
        lowerText.startsWith('/voice')
      ) {
        processedCount++;
        lastCommand = rawText;
        const res = parseAndExecuteTelegramInstruction(rawText, currentPOs, senderName);
        if (res.success) {
          currentPOs = res.updatedPOs;
          if (onStateUpdate) {
            onStateUpdate(currentPOs, res.logMessage);
          }
        }
        await sendTelegramMessage(res.responseHtml, { botToken: token, chatId }, { includeButtons: true });
        continue;
      }

      if (!rawText.startsWith('/')) {
        // Natural speech text (e.g. "PO 102 এর 10 kg Apple receive করা হয়েছে")
        if (lowerText.includes('po') || lowerText.includes('পিও')) {
          const res = parseAndExecuteTelegramInstruction(rawText, currentPOs, senderName);
          if (res.success) {
            processedCount++;
            lastCommand = rawText;
            currentPOs = res.updatedPOs;
            if (onStateUpdate) {
              onStateUpdate(currentPOs, res.logMessage);
            }
            await sendTelegramMessage(res.responseHtml, { botToken: token, chatId }, { includeButtons: true });
          }
        }
        continue;
      }

      // Standard Navigation & Report Slash Commands
      const parts = rawText.split(/\s+/);
      const fullCmd = parts[0].toLowerCase();
      const cmd = fullCmd.split('@')[0];
      const arg = parts.slice(1).join(' ').trim();

      lastCommand = `${cmd} ${arg}`.trim();
      processedCount++;

      if (cmd === '/start' || cmd === '/help') {
        const webAppUrl = telegram.webAppDisplayUrl || 'https://rlfood-tracking-erp.netlify.app/';
        const helpMsg = `<b>🤖 RL FOOD ERP - TELEGRAM INTERACTIVE BOT</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Welcome <b>${escapeHtml(senderName)}</b>! Here are the interactive commands & speech triggers:\n\n` +
          `⚡ <b>1-TAP ACTION COMMANDS:</b>\n` +
          `• <code>/buy &lt;PO&gt; &lt;ITEM&gt;</code> — Mark item as purchased & approved\n` +
          `• <code>/hold &lt;PO&gt; &lt;ITEM&gt; &lt;REASON&gt;</code> — Put item on 5-hour hold\n` +
          `• <code>/receive &lt;PO&gt; &lt;ITEM&gt; [QTY]</code> — Log warehouse staging stock\n` +
          `• <code>/voice &lt;text&gt;</code> — Process Bangla/English voice command note\n\n` +
          `📊 <b>ERP REPORT COMMANDS:</b>\n` +
          `🌐 <code>/app</code> — Get live RL Food Web Portal link\n` +
          `📊 <code>/status</code> — Overall ERP status summary\n` +
          `📌 <code>/po &lt;PO_NUMBER&gt;</code> — Detailed item report for a PO\n` +
          `⏳ <code>/pending</code> — Pending purchase list\n` +
          `⏸️ <code>/hold</code> — Active hold items list\n` +
          `✅ <code>/purchased</code> — Completed items report\n` +
          `🏬 <code>/warehouse</code> — Warehouse staging inventory\n` +
          `🔍 <code>/search &lt;item_name&gt;</code> — Search item across all POs\n\n` +
          `<i>💡 Open Portal directly: <a href="${escapeHtml(webAppUrl)}">${escapeHtml(webAppUrl)}</a></i>`;
        await sendTelegramMessage(helpMsg, { botToken: token, chatId }, { includeButtons: true, customUrl: webAppUrl });
      } 
      else if (cmd === '/app' || cmd === '/link' || cmd === '/url' || cmd === '/portal' || cmd === '/website') {
        const webAppUrl = telegram.webAppDisplayUrl || 'https://rlfood-tracking-erp.netlify.app/';
        const appMsg = `<b>🌐 RL FOOD ERP - WEB APPLICATION PORTAL</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `Click below to open the live RL Food PO Tracker & Inventory Portal:\n\n` +
          `🔗 <b>Direct Web Portal Link:</b>\n` +
          `<a href="${escapeHtml(webAppUrl)}">${escapeHtml(webAppUrl)}</a>\n\n` +
          `📱 <i>Track POs, approve purchases, view hold reasons, and manage warehouse dispatch in real-time!</i>`;
        await sendTelegramMessage(appMsg, { botToken: token, chatId }, { includeButtons: true, customUrl: webAppUrl });
      }
      else if (cmd === '/status' || cmd === '/summary' || cmd === '/stats') {
        if (arg) {
          const matchedPO = currentPOs.find(p => p.poNumber.toLowerCase() === arg.toLowerCase() || p.poNumber.toLowerCase().includes(arg.toLowerCase()));
          if (matchedPO) {
            await notifySinglePOReport(matchedPO, `Telegram User (@${msg.from?.username || senderName})`, chatId);
          } else {
            await notifyDailySummaryReport(currentPOs, 0, `Telegram User (@${msg.from?.username || senderName})`, chatId);
          }
        } else {
          await notifyDailySummaryReport(currentPOs, 0, `Telegram User (@${msg.from?.username || senderName})`, chatId);
        }
      } 
      else if (cmd === '/po') {
        if (!arg) {
          await sendTelegramMessage(
            `⚠️ <b>Missing PO Number!</b> Please specify a PO number. Example: <code>/po PO-102</code>`,
            { botToken: token, chatId }
          );
        } else {
          const matchedPO = currentPOs.find(p => p.poNumber.toLowerCase() === arg.toLowerCase() || p.poNumber.toLowerCase().includes(arg.toLowerCase()));
          if (matchedPO) {
            await notifySinglePOReport(matchedPO, `Telegram User (@${msg.from?.username || senderName})`, chatId);
          } else {
            await sendTelegramMessage(
              `❌ <b>PO Not Found!</b> No Purchase Order matching "<code>${escapeHtml(arg)}</code>" was found in RL Food ERP database. Use <code>/status</code> to check all active POs.`,
              { botToken: token, chatId }
            );
          }
        }
      } 
      else if (cmd === '/pending') {
        await notifyPendingPurchasesReport(currentPOs, `Telegram User (@${msg.from?.username || senderName})`, chatId);
      } 
      else if (cmd === '/hold' || cmd === '/onhold') {
        await notifyHoldItemsReport(currentPOs, `Telegram User (@${msg.from?.username || senderName})`, chatId);
      } 
      else if (cmd === '/purchased' || cmd === '/transit') {
        await notifyPurchasedInTransitReport(currentPOs, `Telegram User (@${msg.from?.username || senderName})`, chatId);
      } 
      else if (cmd === '/warehouse' || cmd === '/stock') {
        await notifyWarehouseInventoryReport(currentPOs, `Telegram User (@${msg.from?.username || senderName})`, chatId);
      }
      else if (cmd === '/search') {
        if (!arg) {
          await sendTelegramMessage(
            `⚠️ <b>Missing Search Keyword!</b> Example: <code>/search Apples</code>`,
            { botToken: token, chatId }
          );
        } else {
          const matches: { item: POItem; poNumber: string }[] = [];
          const q = arg.toLowerCase();
          currentPOs.forEach(p => {
            (p.items || []).forEach(item => {
              if (
                item.itemName.toLowerCase().includes(q) ||
                (item.brand || '').toLowerCase().includes(q) ||
                p.poNumber.toLowerCase().includes(q)
              ) {
                matches.push({ item, poNumber: p.poNumber });
              }
            });
          });

          if (matches.length === 0) {
            await sendTelegramMessage(
              `🔍 <b>No items found matching "<code>${escapeHtml(arg)}</code>"</b>.`,
              { botToken: token, chatId }
            );
          } else {
            const resultLines = matches.slice(0, 15).map((m, idx) => {
              const status = getNormalizedItemStatus(m.item);
              let icon = '⏳';
              if (status === 'Purchased') icon = '✅';
              else if (status === 'Held') icon = '⏸️';
              return `${idx + 1}. ${icon} <b>${escapeHtml(m.item.itemName)}</b> (PO: <code>${m.poNumber}</code>) | Req: ${m.item.requestedQty || 0} ${escapeHtml(m.item.unit || '')} | Status: <b>${status}</b>`;
            }).join('\n');

            const searchMsg = `🔍 <b>SEARCH RESULTS FOR "${escapeHtml(arg)}" (${matches.length} found):</b>\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `${resultLines}\n\n` +
              (matches.length > 15 ? `<i>Showing first 15 of ${matches.length} matching items.</i>\n` : '') +
              `⏰ <b>Timestamp:</b> ${new Date().toLocaleTimeString()}`;

            await sendTelegramMessage(searchMsg, { botToken: token, chatId });
          }
        }
      }
      else {
        // Fallback for unknown slash command
        const unknownMsg = `❓ <b>Unknown Command "<code>${escapeHtml(cmd)}</code>"</b>\n\n` +
          `Available commands:\n` +
          `• <code>/buy &lt;PO&gt; &lt;Item&gt;</code> — Approve purchase\n` +
          `• <code>/hold &lt;PO&gt; &lt;Item&gt;</code> — Put on hold\n` +
          `• <code>/receive &lt;PO&gt; &lt;Item&gt;</code> — Warehouse receive\n` +
          `• <code>/status</code> — ERP status report\n` +
          `• <code>/app</code> — Direct link to RL Food Web Portal\n` +
          `• <code>/help</code> — Show full command guide`;
        await sendTelegramMessage(unknownMsg, { botToken: token, chatId }, { includeButtons: true });
      }
    }

    return { processedCount, lastCommand };
  } catch (err: unknown) {
    console.warn('Telegram background polling notice:', (err as Error)?.message || err);
    return { processedCount: 0, error: (err as Error)?.message || 'Failed to connect to Telegram update polling.' };
  }
}

/**
 * Broadcast Activity Audit Logs Summary to Telegram
 */
export async function notifyAuditLogsSummaryReport(
  logs: AuditLog[],
  triggeredBy: string = 'System Admin'
): Promise<SendMessageResult> {
  const recentLogs = (logs || []).slice(0, 12);
  if (recentLogs.length === 0) {
    return sendTelegramMessage('<b>📜 ACTIVITY AUDIT LOG REPORT</b>\n\n<i>No audit log records recorded yet.</i>');
  }

  const logLines = recentLogs.map((log, idx) => {
    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A';
    return `${idx + 1}. <b>[${escapeHtml(log.user || 'User')}]</b> (${escapeHtml(log.action || 'Action')}): <i>"${escapeHtml(log.details || '')}"</i> — <code>${timeStr}</code>`;
  }).join('\n\n');

  const msg = `<b>📜 RECENT SYSTEM ACTIVITY AUDIT LOG (Last 12 Records)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${logLines}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 <b>Total System Records:</b> ${logs.length}\n` +
    `👤 <b>Sent By:</b> ${escapeHtml(triggeredBy)}\n` +
    `⏰ <b>Timestamp:</b> ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg, undefined, { includeButtons: true });
}

export interface DiscrepancyAlertParams {
  poNumber: string;
  itemName: string;
  purchaserName?: string;
  orderedQty: number;
  purchasedQty: number;
  receivedQty: number;
  passedQty: number;
  damagedQty: number;
  shortageQty: number;
  unit: string;
  qcNotes?: string;
  receiverName: string;
}

/**
 * Event Notifier: Quality & Discrepancy Alert to Purchaser & Admin
 * Triggered when damaged/rejected quantity > 0 or receiving shortage occurs
 */
export async function notifyDiscrepancyAlert(params: DiscrepancyAlertParams): Promise<SendMessageResult> {
  const config = getAppConfig();
  if (!config.telegramConfig?.enabled) {
    return { success: false, message: 'Telegram disabled' };
  }

  const hasDamaged = params.damagedQty > 0;
  const hasShortage = params.shortageQty > 0;

  let alertHeader = '🚨 <b>WAREHOUSE DISCREPANCY & QC ALERT!</b>';
  if (hasDamaged && hasShortage) {
    alertHeader = '🚨 <b>CRITICAL ALERT: DAMAGED GOODS & SHORTAGE REPORTED!</b>';
  } else if (hasDamaged) {
    alertHeader = '⚠️ <b>QUALITY ALERT: DAMAGED / REJECTED GOODS REPORTED!</b>';
  } else if (hasShortage) {
    alertHeader = '📦 <b>RECEIVING SHORTAGE ALERT!</b>';
  }

  const msg = `${alertHeader}\n` +
    `📢 <b>Attention Purchaser:</b> <b>${escapeHtml(params.purchaserName || 'Purchasing Team')}</b>\n\n` +
    `📋 <b>PO Number:</b> <code>${escapeHtml(params.poNumber)}</code>\n` +
    `📦 <b>Item:</b> <b>${escapeHtml(params.itemName)}</b>\n` +
    `👤 <b>Assigned Purchaser:</b> ${escapeHtml(params.purchaserName || 'Unassigned')}\n` +
    `🏬 <b>Verified By (Receiver):</b> ${escapeHtml(params.receiverName)}\n\n` +
    `<b>📊 BATCH QUANTITY SUMMARY:</b>\n` +
    `🛒 Purchased Qty: <b>${params.purchasedQty} ${escapeHtml(params.unit)}</b>\n` +
    `🚛 Delivered Batch Qty: <b>${params.receivedQty} ${escapeHtml(params.unit)}</b>\n` +
    `✅ Passed QC Qty: <b>${params.passedQty} ${escapeHtml(params.unit)}</b>\n` +
    (params.damagedQty > 0 ? `❌ <b>Damaged / Rejected:</b> <code style="color:red">${params.damagedQty} ${escapeHtml(params.unit)}</code>\n` : '') +
    (params.shortageQty > 0 ? `⚠️ <b>Shortage (Pending Delivery):</b> <code>${params.shortageQty} ${escapeHtml(params.unit)}</code>\n` : '') +
    `\n📝 <b>QC / Discrepancy Remarks:</b>\n` +
    `<i>"${escapeHtml(params.qcNotes || 'No specific QC note provided.')}"</i>\n\n` +
    `⏰ <b>Report Time:</b> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

  return sendTelegramMessage(msg, undefined, { includeButtons: true });
}

