import { PurchaseOrder, User, SheetsConfig } from '../types';
import { getAppConfig, saveAppConfig } from '../config/appConfig';
import { postApi } from './apiClient';

export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  source: 'google_sheets' | 'offline_error';
}

export async function syncWithGoogleSheets(): Promise<SyncResult> {
  const config = getAppConfig();

  if (!config.webAppUrl || config.webAppUrl.trim() === '') {
    return {
      success: false,
      message: 'Google Sheets Web App URL is not set. Please enter it in System Config.',
      timestamp: new Date().toISOString(),
      source: 'offline_error'
    };
  }

  const res = await postApi('PO_LIST');
  if (res.success) {
    saveAppConfig({ ...config });
    return {
      success: true,
      message: 'Successfully synchronized live with Google Sheets Database',
      timestamp: new Date().toISOString(),
      source: 'google_sheets'
    };
  } else {
    return {
      success: false,
      message: res.message || 'Failed to communicate with Google Sheets backend.',
      timestamp: new Date().toISOString(),
      source: 'offline_error'
    };
  }
}

/**
 * Production Google Apps Script (Code.gs) template.
 * Users can copy and paste this into Google Sheets -> Extensions -> Apps Script.
 */
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * ============================================================================
 * RL FOOD PURCHASE TRACKING SYSTEM - PRODUCTION GOOGLE APPS SCRIPT BACKEND
 * ============================================================================
 * Application Version: 1.0.0
 * Database Engine: Google Sheets
 */

// ==================== CONFIG.GS ====================
const CONFIG = {
  APP_NAME: "RL Food Purchase Tracking System",
  APP_VERSION: "1.0.0",
  HOLD_TIME_MS: 5 * 60 * 60 * 1000, // 5 hours hold timer
  SHEETS: {
    USERS: "USERS",
    PO_MASTER: "PO_MASTER",
    PO_ITEMS: "PO_ITEMS",
    HOLD_ITEMS: "HOLD_ITEMS",
    RECEIVE_SUMMARY: "RECEIVE_SUMMARY",
    ACTIVITY_LOG: "ACTIVITY_LOG",
    SESSIONS: "SESSIONS"
  },
  ROLES: {
    ADMIN: "admin",
    PURCHASER: "purchaser",
    WAREHOUSE: "warehouse",
    DISPATCH: "dispatch"
  }
};

// ==================== RESPONSE HELPER ====================
function createJsonResponse(success, message, data) {
  const responseObj = {
    success: Boolean(success),
    message: String(message || ""),
    data: data !== undefined ? data : null,
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(responseObj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== DATABASE SERVICE (Database.gs) ====================
const Database = {
  getSs() {
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  getSheet(sheetName) {
    const ss = this.getSs();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = this.initSheet(ss, sheetName);
    }
    return sheet;
  },

  initSheet(ss, sheetName) {
    const sheet = ss.insertSheet(sheetName);
    let headers = [];
    switch (sheetName) {
      case CONFIG.SHEETS.USERS:
        headers = ["ID", "Name", "Username", "Password", "Role", "Active", "Created Date", "Last Login"];
        break;
      case CONFIG.SHEETS.PO_MASTER:
        headers = ["PO Number", "Order Date", "Delivery Date", "Department", "Location", "Customer Name", "Total Items", "Total Quantity", "Purchase Status", "Receive Status", "Created By", "Created At", "Updated At"];
        break;
      case CONFIG.SHEETS.PO_ITEMS:
        headers = ["Item ID", "PO Number", "Order Date", "Delivery Date", "Department", "Location", "SL Number", "Item Name", "Brand", "Category", "Unit", "Requested Qty", "Purchased Qty", "Remaining Qty", "Purchase Status", "Hold By", "Hold Start Time", "Hold Expire Time", "Purchaser Name", "Purchased At", "Notes", "Warehouse Qty", "Warehouse Verified By", "Warehouse Verified At", "Warehouse Notes", "Created Date", "Updated Date"];
        break;
      case CONFIG.SHEETS.HOLD_ITEMS:
        headers = ["Hold ID", "Item ID", "PO Number", "Item Name", "Hold By", "Hold Start Time", "Hold Expire Time", "Status", "Updated At"];
        break;
      case CONFIG.SHEETS.RECEIVE_SUMMARY:
        headers = ["PO Number", "Item Name", "Ordered Qty", "Purchased Qty", "Received Qty", "Remaining Qty", "Receive Status", "Verified By", "Verified At"];
        break;
      case CONFIG.SHEETS.ACTIVITY_LOG:
        headers = ["Log ID", "Timestamp", "User", "Role", "Action", "Details"];
        break;
      case CONFIG.SHEETS.SESSIONS:
        headers = ["Token", "User ID", "Username", "Role", "Created At", "Expires At", "Status"];
        break;
      default:
        headers = ["ID", "Data"];
    }
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#0f172a")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    return sheet;
  },

  getAllRows(sheetName) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0];
    return data.slice(1).map((row, idx) => {
      const obj = { _rowIndex: idx + 2 };
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });
  },

  findRow(sheetName, colName, value) {
    const rows = this.getAllRows(sheetName);
    return rows.find(r => String(r[colName]).trim().toLowerCase() === String(value).trim().toLowerCase());
  },

  insert(sheetName, rowArray) {
    const sheet = this.getSheet(sheetName);
    sheet.appendRow(rowArray);
  },

  batchInsert(sheetName, rowsArray) {
    if (!rowsArray || !rowsArray.length) return;
    const sheet = this.getSheet(sheetName);
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsArray.length, rowsArray[0].length).setValues(rowsArray);
  },

  updateRow(sheetName, keyCol, keyValue, updatedObj) {
    const sheet = this.getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;
    const headers = data[0];
    const keyIdx = headers.indexOf(keyCol);
    if (keyIdx === -1) return false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyIdx]).trim().toLowerCase() === String(keyValue).trim().toLowerCase()) {
        Object.keys(updatedObj).forEach(k => {
          const cIdx = headers.indexOf(k);
          if (cIdx !== -1) {
            sheet.getRange(i + 1, cIdx + 1).setValue(updatedObj[k]);
          }
        });
        return true;
      }
    }
    return false;
  },

  clearData(sheetName) {
    const sheet = this.getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
  }
};

// ==================== TRANSACTION LOCK SERVICE ====================
function withLock(callback) {
  const lock = LockService.getScriptLock();
  try {
    const acquired = lock.tryLock(15000);
    if (!acquired) {
      return createJsonResponse(false, "Server is currently busy. Please try again in a few seconds.", null);
    }
    return callback();
  } catch (err) {
    return createJsonResponse(false, "Lock error: " + err.toString(), null);
  } finally {
    lock.releaseLock();
  }
}

// ==================== PASSWORD HASHING HELPER ====================
function hashPassword(password, salt) {
  salt = String(salt || "RL_FOOD_AUTH_SALT_2026").trim().toLowerCase();
  const passStr = String(password || "").trim();
  if (typeof Utilities !== "undefined" && Utilities.computeDigest) {
    const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, passStr + ":" + salt, Utilities.Charset.UTF_8);
    let txtHash = "";
    for (let i = 0; i < rawHash.length; i++) {
      let byteVal = rawHash[i];
      if (byteVal < 0) byteVal += 256;
      let byteStr = byteVal.toString(16);
      if (byteStr.length === 1) byteStr = "0" + byteStr;
      txtHash += byteStr;
    }
    return "SHA256$" + txtHash;
  }
  // Fallback for non-GAS JS runtimes
  let hash = 0;
  const str = passStr + ":" + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "SHA256$" + Math.abs(hash).toString(16);
}

function verifyPassword(inputPassword, storedPasswordHash, salt) {
  if (!storedPasswordHash) return false;
  const trimmedStored = String(storedPasswordHash).trim();
  const trimmedInput = String(inputPassword).trim();

  if (trimmedStored.startsWith("SHA256$")) {
    const expectedHash = hashPassword(trimmedInput, salt);
    return trimmedStored === expectedHash;
  }

  // Backwards compatibility for plain text stored passwords
  return trimmedStored === trimmedInput;
}

// ==================== AUDIT / ACTIVITY LOG SERVICE ====================
function logActivity(user, role, action, details) {
  try {
    const logId = "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const timestamp = new Date().toISOString();
    Database.insert(CONFIG.SHEETS.ACTIVITY_LOG, [
      logId, timestamp, user || "System", role || "System", action, details || ""
    ]);
  } catch (e) {
    Logger.log("Activity log failure: " + e.toString());
  }
}

// ==================== INITIAL SEEDING ====================
function seedInitialDataIfEmpty() {
  const users = Database.getAllRows(CONFIG.SHEETS.USERS);
  if (users.length === 0) {
    const defaultUsers = [
      ["u-takmil", "RL TAKMIL", "RL TAKMIL", "RL4829", "admin", "Active", "2026-01-01", ""],
      ["u-mustaq", "RL MUSTAQ", "RL MUSTAQ", "RL7314", "admin", "Active", "2026-01-01", ""],
      ["u-polash", "RL POLASH", "RL POLASH", "RL2958", "admin", "Active", "2026-01-01", ""],
      ["u-murshid", "RL MURSHID", "RL MURSHID", "RL8163", "admin", "Active", "2026-01-01", ""],
      ["u-samir", "RL SAMIR", "RL SAMIR", "RL5027", "admin", "Active", "2026-01-01", ""],
      ["u-nisam", "RL NISAM", "RL NISAM", "RL9481", "admin", "Active", "2026-01-01", ""],
      ["u-iqbal", "RL IQBAL", "RL IQBAL", "RL3921", "purchaser", "Active", "2026-01-01", ""],
      ["u-minhaz", "RL MINHAZ", "RL MINHAZ", "RL8410", "purchaser", "Active", "2026-01-01", ""],
      ["u-asraf", "RL ASRAF", "RL ASRAF", "RL1052", "purchaser", "Active", "2026-01-01", ""],
      ["u-asif", "RL ASIF", "RL ASIF", "RL6394", "purchaser", "Active", "2026-01-01", ""],
      ["u-sadaka", "RL SADAKA", "RL SADAKA", "RL2841", "purchaser", "Active", "2026-01-01", ""],
      ["u-saher", "RL SAHER", "RL SAHER", "RL7103", "purchaser", "Active", "2026-01-01", ""],
      ["u-niyas", "RL NIYAS", "RL NIYAS", "RL5920", "purchaser", "Active", "2026-01-01", ""],
      ["u-nadir", "RL NADIR", "RL NADIR", "RL3482", "purchaser", "Active", "2026-01-01", ""],
      ["u-manoj", "RL MANOJ", "RL MANOJ", "RL9105", "purchaser", "Active", "2026-01-01", ""],
      ["u-alamin", "RL AL AMIN", "RL AL AMIN", "RL4719", "warehouse", "Active", "2026-01-01", ""],
      ["u-asiq", "RL ASIQ", "RL ASIQ", "RL8204", "warehouse", "Active", "2026-01-01", ""],
      ["u-emdadul", "RL EMDADUL", "RL EMDADUL", "RL1938", "warehouse", "Active", "2026-01-01", ""],
      ["u-opu", "RL OPU", "RL OPU", "RL6052", "warehouse", "Active", "2026-01-01", ""],
      ["u-nahid", "RL NAHID", "RL NAHID", "RL3184", "dispatch", "Active", "2026-01-01", ""],
      ["u-ismail", "RL ISMAIL", "RL ISMAIL", "RL9201", "dispatch", "Active", "2026-01-01", ""],
      ["u-atiq", "RL ATIQ", "RL ATIQ", "RL5832", "dispatch", "Active", "2026-01-01", ""],
      ["u-obaidul", "RL OBAIDUL", "RL OBAIDUL", "RL1473", "dispatch", "Active", "2026-01-01", ""],
      ["u-tamim", "RL TAMIM", "RL TAMIM", "RL8520", "dispatch", "Active", "2026-01-01", ""],
      ["u-rakib", "RL RAKIB", "RL RAKIB", "RL4096", "dispatch", "Active", "2026-01-01", ""]
    ];
    const defaultUsersHashed = defaultUsers.map(u => [
      u[0], u[1], u[2], hashPassword(u[3], String(u[2]).trim().toLowerCase()), u[4], u[5], u[6], u[7]
    ]);
    Database.batchInsert(CONFIG.SHEETS.USERS, defaultUsersHashed);
  }
}

// ==================== PO ASSEMBLY HELPER ====================
function normalizeItemRow(i) {
  let itemId = String(i["Item ID"] || "");
  let poNumber = String(i["PO Number"] || "");
  let orderDate = String(i["Order Date"] || "");
  let deliveryDate = String(i["Delivery Date"] || "");
  let department = String(i["Department"] || "");
  let location = String(i["Location"] || "");
  let slNumber = i["SL Number"];
  let itemName = String(i["Item Name"] || "");
  let brand = String(i["Brand"] || "");
  let category = String(i["Category"] || "");
  let unit = String(i["Unit"] || "");
  let requestedQty = i["Requested Qty"];
  let purchasedQty = i["Purchased Qty"] || 0;
  let remainingQty = i["Remaining Qty"];
  let purchaseStatus = String(i["Purchase Status"] || "Pending");

  const commonUnits = ["PKT", "PCS", "KG", "BOX", "CASE", "BAG", "TIN", "BOTTLE", "CAN", "GRAM", "LTR", "PORTION", "NOS"];
  const isDateRegex = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/;

  // Check if raw CSV layout was pasted into PO_ITEMS columns directly
  if (
    orderDate.toUpperCase().includes("PO") || 
    location.length > 15 || 
    commonUnits.includes(itemName.toUpperCase().trim()) || 
    (itemId.match(isDateRegex) && !poNumber.toUpperCase().startsWith("PO"))
  ) {
    if (orderDate.toUpperCase().includes("PO") || itemId.match(isDateRegex)) {
      const realOrderDate = itemId.match(isDateRegex) ? itemId : orderDate;
      const realLocation = poNumber;
      const realPoNumber = orderDate.toUpperCase().includes("PO") ? orderDate : (location.toUpperCase().startsWith("PO") ? location : poNumber);
      const realDept = deliveryDate;
      const realSl = department;
      const realItemName = location.length > 2 && !location.toUpperCase().startsWith("PO") ? location : (slNumber && String(slNumber).length > 3 ? String(slNumber) : itemName);
      const realBrand = slNumber;
      const realUnit = itemName;
      const realQty = brand;
      const realDeliveryDate = category;

      itemId = "item-" + (realPoNumber || "po") + "-" + realSl;
      poNumber = realPoNumber;
      orderDate = realOrderDate;
      deliveryDate = realDeliveryDate;
      department = realDept;
      location = realLocation;
      slNumber = Number(realSl) || 1;
      itemName = realItemName;
      brand = String(realBrand || "N/A");
      unit = String(realUnit || "Pcs");
      requestedQty = Number(realQty) || 0;
      remainingQty = Math.max(0, requestedQty - Number(purchasedQty));
    }
  }

  const reqNum = Number(requestedQty) || 0;
  const purNum = Number(purchasedQty) || 0;
  const remNum = remainingQty !== undefined && remainingQty !== "" ? Number(remainingQty) : Math.max(0, reqNum - purNum);

  let holdByStr = i["Hold By"] ? String(i["Hold By"]).trim() : undefined;
  let holdStartStr = i["Hold Start Time"] ? String(i["Hold Start Time"]).trim() : undefined;
  let holdExpireStr = i["Hold Expire Time"] ? String(i["Hold Expire Time"]).trim() : undefined;

  const isPurchasedItem = (reqNum > 0 && purNum >= reqNum) || purchaseStatus.toLowerCase() === 'purchased' || purchaseStatus.toLowerCase() === 'completed';
  if ((holdByStr || holdStartStr || purchaseStatus.toLowerCase() === 'held' || purchaseStatus.toLowerCase() === 'hold') && !isPurchasedItem) {
    purchaseStatus = 'Held';
  }

  return {
    id: itemId || ("item-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4)),
    poId: poNumber,
    poNumber: poNumber || "PO-UNKNOWN",
    orderDate: orderDate || new Date().toISOString().split('T')[0],
    deliveryDate: deliveryDate || orderDate,
    department: department || "General",
    location: location || "Central Warehouse",
    slNumber: Number(slNumber) || 1,
    itemName: itemName || "Unnamed Item",
    brand: brand || "N/A",
    category: category || department || "General",
    unit: unit || "Pcs",
    requestedQty: reqNum,
    orderedQty: reqNum,
    purchasedQty: purNum,
    remainingQty: remNum,
    purchaseStatus: purchaseStatus,
    holdBy: holdByStr,
    holdStartTime: holdStartStr,
    holdExpireTime: holdExpireStr,
    purchaserName: i["Purchaser Name"] ? String(i["Purchaser Name"]) : undefined,
    purchasedAt: i["Purchased At"] ? String(i["Purchased At"]) : undefined,
    notes: i["Notes"] ? String(i["Notes"]) : undefined,
    warehouseQty: i["Warehouse Qty"] !== "" && i["Warehouse Qty"] !== undefined ? Number(i["Warehouse Qty"]) : undefined,
    warehouseVerifiedBy: i["Warehouse Verified By"] ? String(i["Warehouse Verified By"]) : undefined,
    warehouseVerifiedAt: i["Warehouse Verified At"] ? String(i["Warehouse Verified At"]) : undefined,
    warehouseNotes: i["Warehouse Notes"] ? String(i["Warehouse Notes"]) : undefined,
    createdDate: String(i["Created Date"] || new Date().toISOString().split('T')[0]),
    updatedDate: String(i["Updated Date"] || new Date().toISOString().split('T')[0])
  };
}

function assemblePOs() {
  const masters = Database.getAllRows(CONFIG.SHEETS.PO_MASTER);
  const itemsRaw = Database.getAllRows(CONFIG.SHEETS.PO_ITEMS);
  const holdRows = Database.getAllRows(CONFIG.SHEETS.HOLD_ITEMS);

  // Active holds map from dedicated HOLD_ITEMS sheet
  const activeHoldsMap = {};
  holdRows.forEach(h => {
    if (String(h["Status"]).toLowerCase() === 'active') {
      activeHoldsMap[String(h["Item ID"]).trim()] = {
        holdBy: String(h["Hold By"] || ""),
        holdStartTime: String(h["Hold Start Time"] || ""),
        holdExpireTime: ""
      };
    }
  });

  const items = itemsRaw.map(r => {
    const item = normalizeItemRow(r);
    const activeHold = activeHoldsMap[String(item.id).trim()];

    const isExplicitlyUnheldInPoItems = (item.purchaseStatus === 'Pending' || item.purchaseStatus === 'Partial Purchased' || item.purchaseStatus === 'Purchased') && (!item.holdBy || item.holdBy.trim() === '');

    if (activeHold && !isExplicitlyUnheldInPoItems && item.purchaseStatus !== 'Purchased' && item.purchaseStatus !== 'Completed') {
      item.purchaseStatus = 'Held';
      item.holdBy = activeHold.holdBy || item.holdBy;
      item.holdStartTime = activeHold.holdStartTime || item.holdStartTime;
      item.holdExpireTime = activeHold.holdExpireTime || item.holdExpireTime;
    } else if (activeHold && isExplicitlyUnheldInPoItems) {
      Database.updateRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", item.id, {
        "Status": "Released",
        "Updated At": new Date().toISOString()
      });
    }

    return item;
  });

  const poNumberSet = new Set();
  masters.forEach(m => {
    if (m["PO Number"] && String(m["PO Number"]).trim()) {
      poNumberSet.add(String(m["PO Number"]).trim());
    }
  });
  items.forEach(i => {
    if (i.poNumber && String(i.poNumber).trim()) {
      poNumberSet.add(String(i.poNumber).trim());
    }
  });

  const posList = [];

  poNumberSet.forEach(poNumber => {
    const m = masters.find(m => String(m["PO Number"]).trim() === poNumber);
    const poItems = items.filter(i => String(i.poNumber).trim() === poNumber);

    if (poItems.length === 0 && !m) {
      return;
    }

    const firstItem = poItems[0];
    const orderDate = m ? String(m["Order Date"] || "") : (firstItem ? firstItem.orderDate : "");
    const deliveryDate = m ? String(m["Delivery Date"] || "") : (firstItem ? firstItem.deliveryDate : "");
    const department = m ? String(m["Department"] || "") : (firstItem ? firstItem.department : "");
    const location = m ? String(m["Location"] || "") : (firstItem ? firstItem.location : "");
    const customerName = m ? String(m["Customer Name"] || "Client Store") : "Client Store";

    const totalItems = poItems.length;
    const totalQuantity = poItems.reduce((sum, item) => sum + (item.requestedQty || 0), 0);

    const allPurchased = poItems.length > 0 && poItems.every(i => i.purchaseStatus === 'Purchased' || (i.remainingQty === 0 && i.purchasedQty > 0));
    const anyPurchased = poItems.some(i => i.purchasedQty > 0 || i.purchaseStatus === 'Partial Purchased' || i.purchaseStatus === 'Purchased');
    const purchaseStatus = allPurchased ? 'Completed' : (anyPurchased ? 'Partial' : 'Pending');

    posList.push({
      id: poNumber,
      poNumber: poNumber,
      customerName: customerName,
      orderDate: orderDate,
      deliveryDate: deliveryDate,
      department: department,
      location: location,
      totalItems: totalItems,
      totalQuantity: totalQuantity,
      purchaseStatus: purchaseStatus,
      isHeldByAdmin: false,
      holdByAdmin: "",
      receiveStatus: m ? String(m["Receive Status"] || "Pending") : "Pending",
      status: purchaseStatus.toLowerCase(),
      createdBy: m ? String(m["Created By"] || "Admin") : "Admin",
      createdAt: m ? String(m["Created At"] || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: m ? String(m["Updated At"] || new Date().toISOString()) : new Date().toISOString(),
      items: poItems
    });
  });

  return posList;
}

// ==================== GET HANDLER ====================
function doGet(e) {
  try {
    seedInitialDataIfEmpty();
    const action = e && e.parameter ? e.parameter.action : "CONFIG";

    if (action === "CONFIG" || action === "STATUS") {
      return createJsonResponse(true, "RL Food Backend v" + CONFIG.APP_VERSION + " Active", {
        appName: CONFIG.APP_NAME,
        appVersion: CONFIG.APP_VERSION,
        status: "ONLINE"
      });
    }

    return createJsonResponse(true, "Google Apps Script Backend Operational", { version: CONFIG.APP_VERSION });
  } catch (err) {
    return createJsonResponse(false, "Server Error: " + err.toString(), null);
  }
}

// ==================== SESSION TOKEN MANAGEMENT ====================
const activeSessions = {};

function generateSessionToken(userObj) {
  const token = "SESS-" + Date.now() + "-" + Math.floor(Math.random() * 1000000000).toString(36).toUpperCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  activeSessions[token] = {
    token: token,
    userId: String(userObj.id || ""),
    username: String(userObj.username || userObj.name || ""),
    role: String(userObj.role || ""),
    createdAt: now.toISOString(),
    expiresAt: expiresAt,
    status: "Active"
  };
  try {
    Database.insert(CONFIG.SHEETS.SESSIONS, [
      token, String(userObj.id || ""), String(userObj.username || userObj.name || ""), String(userObj.role || ""), now.toISOString(), expiresAt, "Active"
    ]);
  } catch (err) {
    // ignore if SESSIONS sheet insertion skipped
  }
  return token;
}

function verifySessionToken(payload) {
  const token = String(payload.token || (payload.user && payload.user.token) || "").trim();
  if (!token) {
    return { valid: false, message: "Unauthorized: Session token missing or invalid. Please log in again." };
  }

  // Check memory store
  let sess = activeSessions[token];

  if (!sess) {
    try {
      const rows = Database.getAllRows(CONFIG.SHEETS.SESSIONS);
      const found = rows.find(r => String(r["Token"]).trim() === token && String(r["Status"]).toLowerCase() === "active");
      if (found) {
        const exp = String(found["Expires At"] || "");
        if (exp && new Date(exp).getTime() <= new Date().getTime()) {
          Database.updateRow(CONFIG.SHEETS.SESSIONS, "Token", token, { "Status": "Expired" });
          return { valid: false, message: "Unauthorized: Session expired. Please log in again." };
        }
        sess = {
          token: token,
          userId: String(found["User ID"]),
          username: String(found["Username"]),
          role: String(found["Role"]),
          createdAt: String(found["Created At"]),
          expiresAt: exp
        };
        activeSessions[token] = sess;
      }
    } catch (e) {
      // ignore sheet lookup errors
    }
  }

  if (sess) {
    if (sess.expiresAt && new Date(sess.expiresAt).getTime() <= new Date().getTime()) {
      delete activeSessions[token];
      return { valid: false, message: "Unauthorized: Session expired. Please log in again." };
    }
    return { valid: true, session: sess };
  }

  return { valid: false, message: "Unauthorized: Invalid or expired session token. Access denied." };
}

// ==================== POST HANDLER ====================
function doPost(e) {
  try {
    seedInitialDataIfEmpty();
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse(false, "Invalid POST body", null);
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // LOGIN
    if (action === "LOGIN") {
      const username = String(payload.username || "").trim().toLowerCase();
      const password = String(payload.password || "").trim();
      const users = Database.getAllRows(CONFIG.SHEETS.USERS);

      const found = users.find(u => {
        const uName = String(u["Username"]).trim().toLowerCase();
        if (uName !== username) return false;
        const storedPass = String(u["Password"]).trim();
        return verifyPassword(password, storedPass, uName);
      });

      if (!found) {
        return createJsonResponse(false, "Invalid username or password.", null);
      }

      // Automatically upgrade plain text password to hashed format in sheet if needed
      const storedPass = String(found["Password"]).trim();
      if (!storedPass.startsWith("SHA256$")) {
        const uName = String(found["Username"]).trim().toLowerCase();
        const hashedNew = hashPassword(password, uName);
        try {
          Database.updateRow(CONFIG.SHEETS.USERS, "ID", found["ID"], {
            "Password": hashedNew
          });
        } catch (e) {
          // ignore error if unable to update row
        }
      }

      if (String(found["Active"]).toLowerCase() === "inactive") {
        return createJsonResponse(false, "Your account is inactive. Please contact system admin.", null);
      }

      // Update last login
      Database.updateRow(CONFIG.SHEETS.USERS, "ID", found["ID"], {
        "Last Login": new Date().toISOString()
      });

      const userObj = {
        id: String(found["ID"]),
        name: String(found["Name"]),
        username: String(found["Username"]),
        role: String(found["Role"]).toLowerCase(),
        active: String(found["Active"]).toLowerCase() === "active",
        createdDate: String(found["Created Date"])
      };

      const token = generateSessionToken(userObj);
      userObj.token = token;

      logActivity(userObj.name, userObj.role, "User Login", "Logged into portal");
      return createJsonResponse(true, "Authentication successful", { user: userObj, token: token });
    }

    // USERS LIST / UPDATE
    if (action === "USERS") {
      if (payload.subAction === "UPDATE_USERS" && payload.users) {
        const auth = verifySessionToken(payload);
        if (!auth.valid) return createJsonResponse(false, auth.message, null);
        return withLock(() => {
          Database.clearData(CONFIG.SHEETS.USERS);
          const userRows = payload.users.map(u => {
            let passToStore = u.password || "123";
            const uName = String(u.username || u.name || "").trim().toLowerCase();
            if (!passToStore.startsWith("SHA256$")) {
              passToStore = hashPassword(passToStore, uName);
            }
            return [
              u.id, u.name, u.username, passToStore, u.role, u.active ? "Active" : "Inactive", u.createdDate || "2026-01-01", ""
            ];
          });
          Database.batchInsert(CONFIG.SHEETS.USERS, userRows);
          logActivity(payload.user ? payload.user.name : "Admin", "admin", "Update Users", "Updated user roster");
          return createJsonResponse(true, "Users roster updated successfully", { users: payload.users });
        });
      }

      const rows = Database.getAllRows(CONFIG.SHEETS.USERS);
      const userList = rows.map(u => ({
        id: String(u["ID"]),
        name: String(u["Name"]),
        username: String(u["Username"]),
        role: String(u["Role"]).toLowerCase(),
        active: String(u["Active"]).toLowerCase() === "active",
        createdDate: String(u["Created Date"])
      }));
      return createJsonResponse(true, "Users fetched successfully", { users: userList });
    }

    // PO_LIST
    if (action === "PO_LIST" || action === "DISPATCH_LIST" || action === "WAREHOUSE_LIST") {
      const pos = assemblePOs();
      return createJsonResponse(true, "POs loaded from Master Database", { pos });
    }

    // PO_IMPORT
    if (action === "PO_IMPORT") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const newPOs = payload.pos || [];
        const currentUser = payload.user || { name: "Admin", role: "admin" };

        newPOs.forEach(po => {
          // Check if PO exists
          const existingMaster = Database.findRow(CONFIG.SHEETS.PO_MASTER, "PO Number", po.poNumber);
          if (!existingMaster) {
            Database.insert(CONFIG.SHEETS.PO_MASTER, [
              po.poNumber, po.orderDate, po.deliveryDate || "", po.department || "General", po.location || "General Warehouse", po.customerName || "Client", po.totalItems || (po.items ? po.items.length : 0), po.totalQuantity || 0, po.purchaseStatus || "Pending", po.receiveStatus || "Pending", currentUser.name, new Date().toISOString(), new Date().toISOString()
            ]);
          } else {
            Database.updateRow(CONFIG.SHEETS.PO_MASTER, "PO Number", po.poNumber, {
              "Order Date": po.orderDate,
              "Delivery Date": po.deliveryDate || "",
              "Department": po.department || "General",
              "Location": po.location || "General Warehouse",
              "Customer Name": po.customerName || "Client",
              "Total Items": po.totalItems || (po.items ? po.items.length : 0),
              "Total Quantity": po.totalQuantity || 0,
              "Purchase Status": po.purchaseStatus || "Pending",
              "Is Held By Admin": po.isHeldByAdmin ? "TRUE" : "FALSE",
              "Hold By Admin": po.holdByAdmin || "",
              "Updated At": new Date().toISOString()
            });
          }

          if (po.items && po.items.length) {
            po.items.forEach(item => {
              const existingItem = Database.findRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", item.id);
              const requested = item.requestedQty || item.orderedQty || 0;
              const purchased = item.purchasedQty || 0;
              const remaining = item.remainingQty !== undefined ? item.remainingQty : Math.max(0, requested - purchased);
              const pStatus = item.purchaseStatus || "Pending";
              const holdBy = item.holdBy || "";
              const holdStart = item.holdStartTime || "";
              const holdExpire = item.holdExpireTime || "";
              const purchaserName = item.purchaserName || "";
              const purchasedAt = item.purchasedAt || "";

              if (!existingItem) {
                Database.insert(CONFIG.SHEETS.PO_ITEMS, [
                  item.id, po.poNumber, item.orderDate || po.orderDate, item.deliveryDate || po.deliveryDate || "", item.department || po.department || "", item.location || po.location || "", item.slNumber || 1, item.itemName, item.brand || "N/A", item.category || "General", item.unit || "Pcs", requested, purchased, remaining, pStatus, holdBy, holdStart, holdExpire, purchaserName, purchasedAt, item.notes || "", item.warehouseQty !== undefined ? item.warehouseQty : "", item.warehouseVerifiedBy || "", item.warehouseVerifiedAt || "", item.warehouseNotes || "", new Date().toISOString(), new Date().toISOString()
                ]);
              } else {
                Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", item.id, {
                  "Item Name": item.itemName,
                  "Brand": item.brand || "N/A",
                  "Category": item.category || "General",
                  "Unit": item.unit || "Pcs",
                  "Requested Qty": requested,
                  "Purchased Qty": purchased,
                  "Remaining Qty": remaining,
                  "Purchase Status": pStatus,
                  "Hold By": holdBy,
                  "Hold Start Time": holdStart,
                  "Hold Expire Time": holdExpire,
                  "Purchaser Name": purchaserName,
                  "Purchased At": purchasedAt,
                  "Notes": item.notes || "",
                  "Order Date": item.orderDate || po.orderDate,
                  "Delivery Date": item.deliveryDate || po.deliveryDate || "",
                  "Department": item.department || po.department || "",
                  "Location": item.location || po.location || "",
                  "Updated Date": new Date().toISOString()
                });
              }

              if ((holdBy || pStatus === 'Held' || pStatus === 'Hold') && purchased < requested) {
                const existingHoldRow = Database.findRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", item.id);
                const nowIso = new Date().toISOString();
                if (existingHoldRow) {
                  Database.updateRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", item.id, {
                    "Hold By": holdBy,
                    "Hold Start Time": holdStart || nowIso,
                    "Hold Expire Time": holdExpire || "",
                    "Status": "Active",
                    "Updated At": nowIso
                  });
                } else {
                  const holdId = "HOLD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
                  Database.insert(CONFIG.SHEETS.HOLD_ITEMS, [
                    holdId, item.id, po.poNumber, item.itemName, holdBy, holdStart || nowIso, holdExpire || "", "Active", nowIso
                  ]);
                }
              } else {
                const existingHoldRow = Database.findRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", item.id);
                if (existingHoldRow) {
                  Database.updateRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", item.id, {
                    "Status": "Released",
                    "Updated At": new Date().toISOString()
                  });
                }
              }
            });
          }
        });

        logActivity(currentUser.name, currentUser.role, "PO Import", "Imported/Updated " + newPOs.length + " POs");
        const pos = assemblePOs();
        return createJsonResponse(true, "Imported POs successfully into Google Sheets", { pos });
      });
    }

    // PO_DELETE
    if (action === "PO_DELETE") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const poNumber = String(payload.poNumber || "").trim();
        const currentUser = payload.user || { name: "Admin", role: "admin" };

        if (!poNumber) {
          return createJsonResponse(false, "PO Number is required for deletion.", null);
        }

        // 1. Delete from PO_MASTER
        const masterSheet = Database.getSheet(CONFIG.SHEETS.PO_MASTER);
        const mData = masterSheet.getDataRange().getValues();
        for (let i = mData.length - 1; i >= 1; i--) {
          if (String(mData[i][0]).trim().toLowerCase() === poNumber.toLowerCase()) {
            masterSheet.deleteRow(i + 1);
          }
        }

        // 2. Delete from PO_ITEMS
        const itemsSheet = Database.getSheet(CONFIG.SHEETS.PO_ITEMS);
        const iData = itemsSheet.getDataRange().getValues();
        for (let i = iData.length - 1; i >= 1; i--) {
          if (String(iData[i][1]).trim().toLowerCase() === poNumber.toLowerCase() || String(iData[i][2]).trim().toLowerCase() === poNumber.toLowerCase()) {
            itemsSheet.deleteRow(i + 1);
          }
        }

        // 3. Delete from HOLD_ITEMS
        const holdSheet = Database.getSheet(CONFIG.SHEETS.HOLD_ITEMS);
        const hData = holdSheet.getDataRange().getValues();
        for (let i = hData.length - 1; i >= 1; i--) {
          if (String(hData[i][2]).trim().toLowerCase() === poNumber.toLowerCase()) {
            holdSheet.deleteRow(i + 1);
          }
        }

        // 4. Delete from RECEIVE_SUMMARY
        const recSheet = Database.getSheet(CONFIG.SHEETS.RECEIVE_SUMMARY);
        const rData = recSheet.getDataRange().getValues();
        for (let i = rData.length - 1; i >= 1; i--) {
          if (String(rData[i][0]).trim().toLowerCase() === poNumber.toLowerCase()) {
            recSheet.deleteRow(i + 1);
          }
        }

        logActivity(currentUser.name, currentUser.role, "Delete PO", "Deleted PO " + poNumber);
        const pos = assemblePOs();
        return createJsonResponse(true, "Purchase Order " + poNumber + " deleted permanently from Google Sheets.", { pos });
      });
    }

    // PO_CLEAR_ALL
    if (action === "PO_CLEAR_ALL") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const currentUser = payload.user || { name: "Admin", role: "admin" };

        Database.clearData(CONFIG.SHEETS.PO_MASTER);
        Database.clearData(CONFIG.SHEETS.PO_ITEMS);
        Database.clearData(CONFIG.SHEETS.HOLD_ITEMS);
        Database.clearData(CONFIG.SHEETS.RECEIVE_SUMMARY);

        logActivity(currentUser.name, currentUser.role, "Clear All POs", "Cleared all Purchase Orders");
        return createJsonResponse(true, "All Purchase Orders cleared from Google Sheets.", { pos: [] });
      });
    }

    // PO_HOLD
    if (action === "PO_HOLD") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const poNumber = String(payload.poNumber || "").trim();
        const user = payload.user || { name: "Admin", role: "admin" };

        const masterRow = Database.findRow(CONFIG.SHEETS.PO_MASTER, "PO Number", poNumber);
        if (!masterRow) {
          return createJsonResponse(false, "Purchase Order not found.", null);
        }

        Database.updateRow(CONFIG.SHEETS.PO_MASTER, "PO Number", poNumber, {
          "Is Held By Admin": "TRUE",
          "Hold By Admin": user.name,
          "Purchase Status": "Held",
          "Updated At": new Date().toISOString()
        });

        logActivity(user.name, user.role, "Admin Hold PO", "Placed admin hold on PO " + poNumber);
        const pos = assemblePOs();
        return createJsonResponse(true, "Purchase Order placed on Admin Hold.", { pos });
      });
    }

    // PO_RELEASE
    if (action === "PO_RELEASE") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const poNumber = String(payload.poNumber || "").trim();
        const user = payload.user || { name: "Admin", role: "admin" };

        const masterRow = Database.findRow(CONFIG.SHEETS.PO_MASTER, "PO Number", poNumber);
        if (!masterRow) {
          return createJsonResponse(false, "Purchase Order not found.", null);
        }

        Database.updateRow(CONFIG.SHEETS.PO_MASTER, "PO Number", poNumber, {
          "Is Held By Admin": "FALSE",
          "Hold By Admin": "",
          "Updated At": new Date().toISOString()
        });

        // Release items of this PO
        const items = Database.getAllRows(CONFIG.SHEETS.PO_ITEMS).filter(i => String(i["PO Number"]) === poNumber);
        const nowIso = new Date().toISOString();

        items.forEach(item => {
          const itemIdStr = String(item["Item ID"]);
          const purQty = Number(item["Purchased Qty"] || 0);
          const reqQty = Number(item["Requested Qty"] || 0);
          const status = purQty >= reqQty ? "Purchased" : (purQty > 0 ? "Partial Purchased" : "Pending");

          Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemIdStr, {
            "Purchase Status": status,
            "Hold By": "",
            "Hold Start Time": "",
            "Hold Expire Time": "",
            "Updated Date": nowIso
          });
        });

        logActivity(user.name, user.role, "Admin Release PO", "Released admin hold on PO " + poNumber);
        const pos = assemblePOs();
        return createJsonResponse(true, "Purchase Order released from Admin Hold.", { pos });
      });
    }

    // PURCHASE_HOLD
    if (action === "PURCHASE_HOLD") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const itemId = payload.itemId;
        const user = payload.user;
        const itemRow = Database.findRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId);

        if (!itemRow) {
          return createJsonResponse(false, "Item not found in database.", null);
        }

        const currentStatus = String(itemRow["Purchase Status"]);
        const currentHoldBy = String(itemRow["Hold By"] || "");

        if (currentHoldBy && currentHoldBy.trim() !== "" && currentHoldBy !== user.name) {
          return createJsonResponse(false, "Item is currently held by purchaser: " + currentHoldBy, null);
        }

        if (currentStatus === "Purchased") {
          return createJsonResponse(false, "Cannot hold an item that is already fully purchased.", null);
        }

        const now = new Date();
        const startTimeStr = payload.holdStartTime || now.toISOString();

        Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId, {
          "Purchase Status": "Held",
          "Hold By": user.name,
          "Hold Start Time": startTimeStr,
          "Hold Expire Time": "",
          "Updated Date": now.toISOString()
        });

        // Sync to dedicated HOLD_ITEMS sheet in Google Sheets
        const existingHoldRow = Database.findRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", itemId);
        if (existingHoldRow) {
          Database.updateRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", itemId, {
            "Hold By": user.name,
            "Hold Start Time": startTimeStr,
            "Hold Expire Time": "",
            "Status": "Active",
            "Updated At": now.toISOString()
          });
        } else {
          const holdId = "HOLD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
          Database.insert(CONFIG.SHEETS.HOLD_ITEMS, [
            holdId, itemId, itemRow["PO Number"], itemRow["Item Name"], user.name, startTimeStr, "", "Active", now.toISOString()
          ]);
        }

        logActivity(user.name, user.role, "Hold Item", "Placed hold on item " + itemRow["Item Name"] + " (" + itemId + ")");
        const pos = assemblePOs();
        return createJsonResponse(true, "Item placed on hold.", { pos });
      });
    }

    // PURCHASE_RELEASE
    if (action === "PURCHASE_RELEASE") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const itemId = payload.itemId;
        const user = payload.user;

        const itemRow = Database.findRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId);
        if (!itemRow) {
          return createJsonResponse(false, "Item not found.", null);
        }

        if (user.role === 'admin') {
          return createJsonResponse(false, "Admin cannot release purchaser holds. Only the purchaser who placed the hold can unhold.", null);
        }

        const currentHoldBy = String(itemRow["Hold By"] || "").trim();
        if (currentHoldBy && currentHoldBy !== user.name) {
          return createJsonResponse(false, "Cannot release hold placed by another purchaser (" + currentHoldBy + ").", null);
        }

        const reqQty = Number(itemRow["Requested Qty"] || 0);
        const purQty = Number(itemRow["Purchased Qty"] || 0);
        const newStatus = purQty >= reqQty ? "Purchased" : (purQty > 0 ? "Partial Purchased" : "Pending");

        Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId, {
          "Purchase Status": newStatus,
          "Hold By": "",
          "Hold Start Time": "",
          "Hold Expire Time": "",
          "Updated Date": new Date().toISOString()
        });

        // Update dedicated HOLD_ITEMS sheet status
        Database.updateRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", itemId, {
          "Status": "Released",
          "Updated At": new Date().toISOString()
        });

        logActivity(user.name, user.role, "Release Hold", "Released hold on item " + (itemRow["Item Name"] || itemId));
        const pos = assemblePOs();
        return createJsonResponse(true, "Item hold released.", { pos });
      });
    }

    // PURCHASE_SAVE
    if (action === "PURCHASE_SAVE") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const itemId = payload.itemId;
        const qtyToPurchase = Number(payload.purchasedQty || 0);
        const notes = String(payload.notes || "");
        const user = payload.user;

        const itemRow = Database.findRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId);
        if (!itemRow) {
          return createJsonResponse(false, "Item not found.", null);
        }

        const currentHoldBy = String(itemRow["Hold By"] || "").trim();

        if (currentHoldBy && currentHoldBy !== user.name) {
          return createJsonResponse(false, "Cannot purchase. Item is currently held by purchaser: " + currentHoldBy, null);
        }

        const reqQty = Number(itemRow["Requested Qty"] || 0);
        const prevPurchased = Number(itemRow["Purchased Qty"] || 0);
        const remaining = Math.max(0, reqQty - prevPurchased);

        if (qtyToPurchase <= 0) {
          return createJsonResponse(false, "Purchased quantity must be greater than zero.", null);
        }

        if (qtyToPurchase > remaining) {
          return createJsonResponse(false, "Quantity (" + qtyToPurchase + ") exceeds remaining quantity (" + remaining + ")", null);
        }

        const newPurchased = prevPurchased + qtyToPurchase;
        const newRemaining = Math.max(0, reqQty - newPurchased);
        const newStatus = newRemaining === 0 ? "Purchased" : "Partial Purchased";

        const now = new Date().toISOString();
        Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId, {
          "Purchased Qty": newPurchased,
          "Remaining Qty": newRemaining,
          "Purchase Status": newStatus,
          "Purchaser Name": user.name,
          "Purchased At": now,
          "Notes": notes ? (itemRow["Notes"] ? itemRow["Notes"] + "; " + notes : notes) : itemRow["Notes"],
          "Hold By": "",
          "Hold Start Time": "",
          "Hold Expire Time": "",
          "Updated Date": now
        });

        // Release any active hold in HOLD_ITEMS sheet
        Database.updateRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", itemId, {
          "Status": "Released",
          "Updated At": now
        });

        // Update Master PO Purchase Status
        const poNumber = String(itemRow["PO Number"]);
        const poItems = Database.getAllRows(CONFIG.SHEETS.PO_ITEMS).filter(i => String(i["PO Number"]) === poNumber);
        const allCompleted = poItems.every(i => Number(i["Remaining Qty"]) === 0 || String(i["Purchase Status"]) === "Purchased");
        const anyPurchased = poItems.some(i => Number(i["Purchased Qty"]) > 0);
        const masterStatus = allCompleted ? "Completed" : anyPurchased ? "Partial" : "Pending";

        Database.updateRow(CONFIG.SHEETS.PO_MASTER, "PO Number", poNumber, {
          "Purchase Status": masterStatus,
          "Updated At": now
        });

        logActivity(user.name, user.role, "Purchase Recorded", "Purchased " + qtyToPurchase + " units of " + itemRow["Item Name"]);
        const pos = assemblePOs();
        return createJsonResponse(true, "Purchase recorded successfully.", { pos });
      });
    }

    // PURCHASE_RETURN
    if (action === "PURCHASE_RETURN") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const itemId = payload.itemId;
        const user = payload.user || { name: "Purchaser", role: "purchaser" };

        const itemRow = Database.findRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId);
        if (!itemRow) {
          return createJsonResponse(false, "Item not found.", null);
        }

        const reqQty = Number(itemRow["Requested Qty"] || 0);
        const now = new Date().toISOString();

        Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId, {
          "Purchased Qty": 0,
          "Remaining Qty": reqQty,
          "Purchase Status": "Pending",
          "Purchaser Name": "",
          "Purchased At": "",
          "Notes": "",
          "Hold By": "",
          "Hold Start Time": "",
          "Hold Expire Time": "",
          "Warehouse Qty": 0,
          "Warehouse Verified By": "",
          "Warehouse Verified At": "",
          "Updated Date": now
        });

        // Update Master PO Purchase Status
        const poNumber = String(itemRow["PO Number"]);
        const poItems = Database.getAllRows(CONFIG.SHEETS.PO_ITEMS).filter(i => String(i["PO Number"]) === poNumber);
        const allCompleted = poItems.every(i => Number(i["Remaining Qty"]) === 0 || String(i["Purchase Status"]) === "Purchased");
        const anyPurchased = poItems.some(i => Number(i["Purchased Qty"]) > 0);
        const masterStatus = allCompleted ? "Completed" : anyPurchased ? "Partial" : "Pending";

        Database.updateRow(CONFIG.SHEETS.PO_MASTER, "PO Number", poNumber, {
          "Purchase Status": masterStatus,
          "Updated At": now
        });

        logActivity(user.name, user.role, "Purchase Returned", "Returned item " + itemRow["Item Name"] + " back to pending");
        const pos = assemblePOs();
        return createJsonResponse(true, "Item status returned to pending.", { pos });
      });
    }

    // WAREHOUSE_RECEIVE
    if (action === "WAREHOUSE_RECEIVE") {
      const auth = verifySessionToken(payload);
      if (!auth.valid) return createJsonResponse(false, auth.message, null);
      return withLock(() => {
        const itemId = payload.itemId;
        const user = payload.user;

        const itemRow = Database.findRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId);
        if (!itemRow) {
          return createJsonResponse(false, "Item not found.", null);
        }

        const reqQty = Number(itemRow["Requested Qty"] || 0);
        const purchasedQty = Number(itemRow["Purchased Qty"] || 0);

        if (purchasedQty <= 0) {
          return createJsonResponse(false, "Item has not been purchased yet.", null);
        }

        const recQty = purchasedQty; // Received Qty automatically equals Purchased Qty
        const now = new Date().toISOString();

        Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemId, {
          "Warehouse Qty": recQty,
          "Warehouse Verified By": user.name,
          "Warehouse Verified At": now,
          "Updated Date": now
        });

        // Upsert RECEIVE_SUMMARY
        const recSummary = Database.findRow(CONFIG.SHEETS.RECEIVE_SUMMARY, "Item Name", itemRow["Item Name"]);
        const isCompleted = recQty >= reqQty;
        const recStatus = isCompleted ? "Completed" : "Partial";

        if (recSummary) {
          Database.updateRow(CONFIG.SHEETS.RECEIVE_SUMMARY, "Item Name", itemRow["Item Name"], {
            "Received Qty": recQty,
            "Remaining Qty": Math.max(0, reqQty - recQty),
            "Receive Status": recStatus,
            "Verified By": user.name,
            "Verified At": now
          });
        } else {
          Database.insert(CONFIG.SHEETS.RECEIVE_SUMMARY, [
            itemRow["PO Number"], itemRow["Item Name"], reqQty, purchasedQty, recQty, Math.max(0, reqQty - recQty), recStatus, user.name, now
          ]);
        }

        // Update Master PO Receive Status
        const poNumber = String(itemRow["PO Number"]);
        const poItems = Database.getAllRows(CONFIG.SHEETS.PO_ITEMS).filter(i => String(i["PO Number"]) === poNumber);
        const allRec = poItems.every(i => Number(i["Warehouse Qty"]) > 0 && Number(i["Warehouse Qty"]) >= Number(i["Requested Qty"]));
        const anyRec = poItems.some(i => Number(i["Warehouse Qty"]) > 0);
        const masterRecStatus = allRec ? "Completed" : anyRec ? "Partial" : "Pending";

        Database.updateRow(CONFIG.SHEETS.PO_MASTER, "PO Number", poNumber, {
          "Receive Status": masterRecStatus,
          "Updated At": now
        });

        logActivity(user.name, user.role, "Warehouse Receive", "Confirmed receive for " + itemRow["Item Name"] + " (" + poNumber + ")");
        const pos = assemblePOs();
        return createJsonResponse(true, "Received item verified successfully.", { pos });
      });
    }

    // ACTIVITY
    if (action === "ACTIVITY") {
      const logs = Database.getAllRows(CONFIG.SHEETS.ACTIVITY_LOG).reverse().map(l => ({
        id: String(l["Log ID"]),
        timestamp: String(l["Timestamp"]),
        user: String(l["User"]),
        role: String(l["Role"]),
        action: String(l["Action"]),
        details: String(l["Details"])
      }));
      return createJsonResponse(true, "Activity logs loaded", { logs });
    }

    // DASHBOARD
    if (action === "DASHBOARD") {
      const masters = Database.getAllRows(CONFIG.SHEETS.PO_MASTER);
      const items = Database.getAllRows(CONFIG.SHEETS.PO_ITEMS);

      const totalPO = masters.length;
      const pendingPO = masters.filter(m => String(m["Purchase Status"]) === "Pending").length;
      const partialPO = masters.filter(m => String(m["Purchase Status"]) === "Partial").length;
      const completedPO = masters.filter(m => String(m["Purchase Status"]) === "Completed").length;

      const pendingItems = items.filter(i => String(i["Purchase Status"]) === "Pending").length;
      const heldItems = items.filter(i => String(i["Purchase Status"]) === "Held").length;
      const purchasedItems = items.filter(i => String(i["Purchase Status"]) === "Purchased" || String(i["Purchase Status"]) === "Partial Purchased").length;

      return createJsonResponse(true, "Dashboard metrics loaded", {
        metrics: {
          totalPO, pendingPO, partialPO, completedPO, pendingItems, heldItems, purchasedItems
        },
        recentPOs: masters.slice(-10).reverse()
      });
    }

    return createJsonResponse(false, "Unknown action: " + action, null);
  } catch (err) {
    return createJsonResponse(false, "Server Error: " + err.toString(), null);
  }
}

// ==================== TIME-DRIVEN AUTOMATED TRIGGERS ====================
/**
 * Automatically releases expired 10-minute holds back to "Pending"
 * Set up a 1-minute time-driven trigger in Apps Script calling this function.
 */
function autoReleaseExpiredHoldsCron() {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) return;

    try {
      const items = Database.getAllRows(CONFIG.SHEETS.PO_ITEMS);
      const now = new Date().getTime();
      let count = 0;

      items.forEach(item => {
        if (String(item["Purchase Status"]) === "Held" && item["Hold Expire Time"]) {
          const expireTime = new Date(String(item["Hold Expire Time"])).getTime();
          if (now >= expireTime) {
            const itemIdStr = String(item["Item ID"]);
            Database.updateRow(CONFIG.SHEETS.PO_ITEMS, "Item ID", itemIdStr, {
              "Purchase Status": "Pending",
              "Hold By": "",
              "Hold Start Time": "",
              "Hold Expire Time": "",
              "Updated Date": new Date().toISOString()
            });
            Database.updateRow(CONFIG.SHEETS.HOLD_ITEMS, "Item ID", itemIdStr, {
              "Status": "Expired",
              "Updated At": new Date().toISOString()
            });
            count++;
          }
        }
      });

      if (count > 0) {
        logActivity("System Trigger", "cron", "Auto Release Holds", "Released " + count + " expired item hold(s)");
      }
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    Logger.log("Auto release cron failed: " + e.toString());
  }
}

/**
 * Setup Helper: Call once from Apps Script editor to create the 1-minute cron trigger automatically
 */
function setupTriggers() {
  // Delete existing triggers for autoReleaseExpiredHoldsCron to avoid duplicate triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "autoReleaseExpiredHoldsCron") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new time-driven 1-minute trigger
  ScriptApp.newTrigger("autoReleaseExpiredHoldsCron")
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log("Successfully created 1-minute automated hold release trigger.");
}
`;
}
