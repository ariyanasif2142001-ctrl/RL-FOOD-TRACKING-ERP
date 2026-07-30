import * as XLSX from 'xlsx';
import { MasterSKUEntry, POItem } from '../types';

const STORAGE_KEY_MASTER_SKU = 'rl_master_sku_mappings';
const STORAGE_KEY_SKU_URL = 'rl_master_sku_sheet_url';

const DB_NAME = 'RL_MasterSKU_DB';
const DB_VERSION = 1;
const STORE_NAME = 'sku_mappings';

let cachedMasterSKUMappings: MasterSKUEntry[] | null = null;

function initDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      resolve((e.target as IDBOpenDBRequest).result);
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

async function saveToIndexedDB(mappings: MasterSKUEntry[]): Promise<void> {
  try {
    const db = await initDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const entry of mappings) {
      store.put(entry);
    }
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }
}

async function loadFromIndexedDB(): Promise<MasterSKUEntry[] | null> {
  try {
    const db = await initDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result && req.result.length > 0 ? req.result : null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    return null;
  }
}

// Pre-load from IndexedDB on startup if available
if (typeof window !== 'undefined') {
  loadFromIndexedDB().then(idbMappings => {
    if (idbMappings && idbMappings.length > 0) {
      cachedMasterSKUMappings = idbMappings;
    }
  });
}

export const INITIAL_MASTER_SKUS: MasterSKUEntry[] = [
  {
    id: 'sku-1',
    customerItemName: 'GLASSA CREAM WHITE VINEGAR OF MODENA MUSSINI 150 ML',
    customerItemCode: 'KT100439',
    internalSKU: 'IP00780',
    internalItemName: 'GLASSA CREAM WHITE VINEGAR OF MODENA MUSSINI 150 ML',
    internalUnit: 'PCS',
    category: 'VINEGAR',
    lastUpdated: '2026-07-29'
  },
  {
    id: 'sku-2',
    customerItemName: 'CHANA MASALA POWDER 200 GM',
    customerItemCode: 'KT100161',
    internalSKU: 'IP00781',
    internalItemName: 'CHANA MASALA POWDER 200 GM',
    internalUnit: 'PCS',
    category: 'SPICES',
    lastUpdated: '2026-07-29'
  },
  {
    id: 'sku-3',
    customerItemName: 'DEGGI MIRCH MDH 100 GM',
    customerItemCode: 'KT100161',
    internalSKU: 'IP00782',
    internalItemName: 'DEGGI MIRCH MDH 100 GM',
    internalUnit: 'PCS',
    category: 'SPICES',
    lastUpdated: '2026-07-29'
  },
  {
    id: 'sku-4',
    customerItemName: 'MUSTARD OIL PRAN 500 ML',
    customerItemCode: 'KT100105',
    internalSKU: 'IP00783',
    internalItemName: 'MUSTARD OIL PRAN 500 ML',
    internalUnit: 'PCS',
    category: 'OIL',
    lastUpdated: '2026-07-29'
  },
  {
    id: 'sku-5',
    customerItemName: 'ARBORIO RISO RICE 1 KG (PRIMORISO)',
    customerItemCode: 'KT100582',
    internalSKU: 'IP00784',
    internalItemName: 'ARBORIO RISO RICE 1 KG (PRIMORISO)',
    internalUnit: 'PCS',
    category: 'RICE',
    lastUpdated: '2026-07-29'
  }
];

export function getMasterSKUMappings(): MasterSKUEntry[] {
  if (cachedMasterSKUMappings && cachedMasterSKUMappings.length > 0) {
    return cachedMasterSKUMappings;
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY_MASTER_SKU) || sessionStorage.getItem(STORAGE_KEY_MASTER_SKU);
    if (!data) {
      cachedMasterSKUMappings = INITIAL_MASTER_SKUS;
      return INITIAL_MASTER_SKUS;
    }
    cachedMasterSKUMappings = JSON.parse(data);
    return cachedMasterSKUMappings || INITIAL_MASTER_SKUS;
  } catch (err) {
    console.error('Failed to load Master SKU mappings:', err);
    cachedMasterSKUMappings = INITIAL_MASTER_SKUS;
    return INITIAL_MASTER_SKUS;
  }
}

export function saveMasterSKUMappings(mappings: MasterSKUEntry[]): void {
  cachedMasterSKUMappings = mappings;
  saveToIndexedDB(mappings);

  try {
    const json = JSON.stringify(mappings);
    localStorage.setItem(STORAGE_KEY_MASTER_SKU, json);
  } catch (err: any) {
    console.warn('LocalStorage quota exceeded for Master SKU mappings. Using IndexedDB & in-memory cache.', err);
    try {
      const truncated = mappings.slice(0, 300);
      localStorage.setItem(STORAGE_KEY_MASTER_SKU, JSON.stringify(truncated));
    } catch (_) {
      // Ignore quota fallback error
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('master_sku_updated', { detail: { count: mappings.length } }));
  }
}

export function getMasterSKUSheetUrl(): string {
  return localStorage.getItem(STORAGE_KEY_SKU_URL) || '';
}

export function saveMasterSKUSheetUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_SKU_URL, url.trim());
}

/**
 * Normalizes Dropbox or Google Sheets URLs into direct download links
 */
export function normalizeDownloadUrl(url: string): string {
  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Handle Dropbox URL
  if (cleanUrl.includes('dropbox.com')) {
    cleanUrl = cleanUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    cleanUrl = cleanUrl.replace('dl=0', 'raw=1');
    if (!cleanUrl.includes('raw=1') && !cleanUrl.includes('dl=1')) {
      cleanUrl += cleanUrl.includes('?') ? '&raw=1' : '?raw=1';
    }
    return cleanUrl;
  }

  // Handle Google Sheets URL
  if (cleanUrl.includes('docs.google.com/spreadsheets')) {
    if (!cleanUrl.includes('output=csv') && !cleanUrl.includes('/pub')) {
      // Convert standard sheet view URL to CSV export URL
      const matches = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (matches && matches[1]) {
        const sheetId = matches[1];
        const gidMatch = cleanUrl.match(/gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }
    }
  }

  return cleanUrl;
}

/**
 * Parses an Excel workbook specifically looking for the "MASTAR DATA" sheet or user's target sheet.
 * Extracts: SL NO | New Desc | Unit | Fixed By Date | SKU NAME | NAME | cost price | Fix Selling price 2026
 */
export function extractSKUsFromWorkbook(workbook: XLSX.WorkBook, preferredSheetName?: string): { targetSheetName: string; availableSheets: string[]; entries: MasterSKUEntry[] } {
  const availableSheets = workbook.SheetNames || [];
  if (availableSheets.length === 0) {
    throw new Error('Workbook contains no sheets.');
  }

  let targetSheetName = preferredSheetName;
  if (!targetSheetName || !availableSheets.includes(targetSheetName)) {
    // Priority order to auto-detect the Master SKU sheet
    targetSheetName =
      availableSheets.find(s => s.toUpperCase().trim() === 'MASTAR DATA' || s.toUpperCase().trim() === 'MASTAR_DATA') ||
      availableSheets.find(s => s.toUpperCase().includes('MASTAR')) ||
      availableSheets.find(s => s.toUpperCase().trim() === 'MASTER DATA' || s.toUpperCase().trim() === 'MASTER_DATA') ||
      availableSheets.find(s => s.toUpperCase().includes('MASTER')) ||
      availableSheets.find(s => s.toUpperCase().includes('SKU')) ||
      availableSheets[0];
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error(`Sheet '${targetSheetName}' not found in workbook.`);
  }

  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];
  if (!matrix || matrix.length < 2) {
    throw new Error(`No data rows found in sheet '${targetSheetName}'.`);
  }

  const headers = (matrix[0] || []).map(h => String(h || '').trim().toUpperCase());

  // Column detection based on user's exact MASTAR DATA sheet layout:
  // SL NO | New Desc | Unit | Fixed By Date | SKU NAME | NAME | cost price | Fix Selling price 2026 | COST UPDATED DATE
  let colDesc = headers.findIndex(h => h.includes('NEW DESC') || h.includes('NEW_DESC') || h.includes('DESCRIPTION') || h === 'ITEM NAME' || h.includes('CUSTOMER ITEM') || h === 'ITEM');
  let colSKU = headers.findIndex(h => h.includes('SKU NAME') || h.includes('SKU_NAME') || h === 'SKU' || h.includes('INTERNAL SKU') || h.includes('ITEM CODE'));
  let colUnit = headers.findIndex(h => h.includes('UNIT') || h.includes('UOM'));
  let colSLNo = headers.findIndex(h => h.includes('SL NO') || h.includes('SL_NO') || h === 'SL');
  let colAssignedTo = headers.findIndex(h => h === 'NAME' || h.includes('ASSIGNED') || h.includes('FIXED BY'));
  let colCostPrice = headers.findIndex(h => h.includes('COST PRICE') || h.includes('COST'));
  let colSellingPrice = headers.findIndex(h => h.includes('SELLING PRICE') || h.includes('FIX SELLING'));
  let colCategory = headers.findIndex(h => h.includes('CATEGORY') || h.includes('DEPT'));

  // Positional fallbacks matching MASTAR DATA columns
  if (colDesc === -1) colDesc = 1; // Col B: New Desc
  if (colUnit === -1) colUnit = 2; // Col C: Unit
  if (colSKU === -1) colSKU = 4; // Col E: SKU NAME (e.g. LP005167)
  if (colSLNo === -1) colSLNo = 0; // Col A: SL NO (e.g. 5167)

  const entries: MasterSKUEntry[] = [];
  const today = new Date().toISOString().split('T')[0];

  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length === 0) continue;

    const descVal = String(row[colDesc] || '').trim();
    const skuVal = colSKU !== -1 ? String(row[colSKU] || '').trim() : '';
    const unitVal = colUnit !== -1 ? String(row[colUnit] || '').trim() : 'PCS';
    const slNoVal = colSLNo !== -1 ? String(row[colSLNo] || '').trim() : '';
    const assignedVal = colAssignedTo !== -1 ? String(row[colAssignedTo] || '').trim() : '';
    const costPriceVal = colCostPrice !== -1 ? String(row[colCostPrice] || '').trim() : '';
    const sellingPriceVal = colSellingPrice !== -1 ? String(row[colSellingPrice] || '').trim() : '';
    const categoryVal = colCategory !== -1 ? String(row[colCategory] || '').trim() : 'General';

    if (descVal || skuVal) {
      entries.push({
        id: `sku-${targetSheetName.toLowerCase().replace(/\s+/g, '')}-${i}-${Date.now()}`,
        customerItemName: descVal,
        customerItemCode: slNoVal ? `SL-${slNoVal}` : undefined,
        internalSKU: skuVal || (slNoVal ? `LP00${slNoVal}` : `SKU-${i}`),
        internalItemName: descVal,
        internalUnit: (unitVal || 'PCS').toUpperCase(),
        category: categoryVal || 'General',
        slNo: slNoVal,
        costPrice: costPriceVal,
        sellingPrice: sellingPriceVal,
        assignedTo: assignedVal,
        sheetName: targetSheetName,
        lastUpdated: today
      });
    }
  }

  return { targetSheetName, availableSheets, entries };
}

/**
 * Syncs Master SKU mappings from a URL (Dropbox direct link or Google Sheet CSV export)
 */
export async function fetchAndSyncMasterSKUsFromUrl(rawUrl: string, preferredSheetName?: string): Promise<{ success: boolean; count: number; message: string; availableSheets?: string[]; targetSheetName?: string }> {
  try {
    const directUrl = normalizeDownloadUrl(rawUrl);
    if (!directUrl) {
      return { success: false, count: 0, message: 'Please enter a valid Dropbox or Google Sheets URL.' };
    }

    // Append unique cache buster query parameter to guarantee fetching latest Excel version from Dropbox
    const separator = directUrl.includes('?') ? '&' : '?';
    const cacheBusterUrl = `${directUrl}${separator}_cb=${Date.now()}`;

    // Use server proxy directly for cross-origin sheet URLs (Dropbox/Google Sheets) to bypass browser CORS constraints cleanly
    let response: Response;
    const proxyUrl = `/api/proxy-sheet?url=${encodeURIComponent(directUrl)}`;

    try {
      response = await fetch(proxyUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        // Fallback to direct client fetch if proxy endpoint is unavailable
        response = await fetch(cacheBusterUrl);
      }
    } catch (proxyErr) {
      response = await fetch(cacheBusterUrl);
    }

    if (!response || !response.ok) {
      throw new Error(`Failed to download sheet file (HTTP ${response?.status || 'Unknown'})`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const { targetSheetName, availableSheets, entries } = extractSKUsFromWorkbook(workbook, preferredSheetName);

    if (entries.length > 0) {
      saveMasterSKUMappings(entries);
      saveMasterSKUSheetUrl(rawUrl);
      return {
        success: true,
        count: entries.length,
        targetSheetName,
        availableSheets,
        message: `Successfully synced ${entries.length} Master SKU entries from sheet '${targetSheetName}'!`
      };
    } else {
      return { success: false, count: 0, message: `No valid SKU mappings found in sheet '${targetSheetName}'.` };
    }
  } catch (err: any) {
    console.error('Master SKU Sync error:', err);
    return { success: false, count: 0, message: `Failed to fetch sheet: ${err?.message || 'Network error'}` };
  }
}

/**
 * Matches an item against the Master SKU mapping database
 */
export function matchPOItemToMasterSKU(item: Partial<POItem>, mappings?: MasterSKUEntry[]): Partial<POItem> {
  const masterList = mappings || getMasterSKUMappings();
  if (!masterList || masterList.length === 0) return item;

  const rawCustomerName = (item.customerItemName || item.itemName || '').trim().toUpperCase();
  const rawCustomerCode = (item.customerItemCode || item.sku || '').trim().toUpperCase();

  // Try exact match by Customer Code first
  let match = masterList.find(m => m.customerItemCode && m.customerItemCode.trim().toUpperCase() === rawCustomerCode);
  
  // Try exact match by Customer Item Name
  if (!match) {
    match = masterList.find(m => m.customerItemName.trim().toUpperCase() === rawCustomerName);
  }

  // Try partial match by Customer Item Name
  if (!match && rawCustomerName.length > 4) {
    match = masterList.find(m => rawCustomerName.includes(m.customerItemName.trim().toUpperCase()) || m.customerItemName.trim().toUpperCase().includes(rawCustomerName));
  }

  if (match) {
    const parsedPrice = match.sellingPrice !== undefined && match.sellingPrice !== null && match.sellingPrice !== ''
      ? parseFloat(String(match.sellingPrice))
      : (match.costPrice !== undefined && match.costPrice !== null && match.costPrice !== '' ? parseFloat(String(match.costPrice)) : undefined);

    return {
      ...item,
      customerItemName: item.customerItemName || item.itemName,
      customerUnit: item.customerUnit || item.unit,
      customerItemCode: item.customerItemCode || match.customerItemCode,
      internalItemName: match.internalItemName,
      internalUnit: match.internalUnit,
      internalItemCode: match.internalSKU,
      sku: match.internalSKU,
      unitPrice: parsedPrice !== undefined && !isNaN(parsedPrice) ? parsedPrice : item.unitPrice,
      // Default displayed name/unit to Internal SKU values if present
      itemName: match.internalItemName || item.itemName,
      unit: match.internalUnit || item.unit
    };
  }

  return item;
}

/**
 * Re-evaluates purchase order items against current Master SKU database
 */
export function reMatchPOsWithMasterSKU(pos: any[], mappings?: MasterSKUEntry[]): any[] {
  const masterList = mappings || getMasterSKUMappings();
  if (!masterList || masterList.length === 0 || !pos || pos.length === 0) return pos;

  return pos.map(po => {
    if (!po || !po.items) return po;
    let hasChanges = false;
    const updatedItems = po.items.map((item: any) => {
      const matched = matchPOItemToMasterSKU(item, masterList);
      if (
        matched.sku !== item.sku ||
        matched.itemName !== item.itemName ||
        matched.unitPrice !== item.unitPrice ||
        matched.unit !== item.unit ||
        matched.internalItemCode !== item.internalItemCode ||
        matched.internalItemName !== item.internalItemName
      ) {
        hasChanges = true;
        return { ...item, ...matched };
      }
      return item;
    });

    return hasChanges ? { ...po, items: updatedItems } : po;
  });
}

const STORAGE_KEY_SAVED_PO_SKUS = 'rl_po_item_sku_saved_v1';

export function getPoItemSkuMapping(
  poNumber: string,
  poItemId?: string,
  poItemName?: string
): { sku: string; itemName: string; unit: string; brand?: string; sellingPrice?: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_PO_SKUS);
    if (!raw) return null;
    const map = JSON.parse(raw);

    const normPo = (poNumber || '').trim().toLowerCase();
    const normName = (poItemName || '').trim().toLowerCase();

    if (poItemId && map[`${normPo}__id__${poItemId}`]) {
      return map[`${normPo}__id__${poItemId}`];
    }
    if (normName && map[`${normPo}__name__${normName}`]) {
      return map[`${normPo}__name__${normName}`];
    }
    if (normName && map[`global__name__${normName}`]) {
      return map[`global__name__${normName}`];
    }
  } catch (err) {
    console.error('Failed to get PO Item SKU mapping:', err);
  }
  return null;
}

export function savePoItemSkuMapping(
  poNumber: string,
  poItemId?: string,
  poItemName?: string,
  skuData?: { sku: string; itemName: string; unit: string; brand?: string; sellingPrice?: number }
): void {
  if (!skuData) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_PO_SKUS);
    const map = raw ? JSON.parse(raw) : {};

    const normPo = (poNumber || '').trim().toLowerCase();
    const normName = (poItemName || '').trim().toLowerCase();

    if (poItemId) map[`${normPo}__id__${poItemId}`] = skuData;
    if (normName) map[`${normPo}__name__${normName}`] = skuData;
    if (normName) map[`global__name__${normName}`] = skuData;

    localStorage.setItem(STORAGE_KEY_SAVED_PO_SKUS, JSON.stringify(map));

    // Update local POs if they exist in localStorage
    const localPosRaw = localStorage.getItem('rl_food_local_pos');
    if (localPosRaw) {
      const pos = JSON.parse(localPosRaw);
      if (Array.isArray(pos)) {
        let updatedAny = false;
        const updatedPos = pos.map((p: any) => {
          if (p.poNumber && p.poNumber.trim().toLowerCase() === normPo) {
            const nextItems = (p.items || []).map((item: any) => {
              const matchById = poItemId && item.id === poItemId;
              const matchByName = normName && item.itemName && item.itemName.trim().toLowerCase() === normName;
              if (matchById || matchByName) {
                updatedAny = true;
                return {
                  ...item,
                  sku: skuData.sku,
                  internalItemCode: skuData.sku,
                  internalItemName: skuData.itemName,
                  internalUnit: skuData.unit,
                  brand: skuData.brand || item.brand
                };
              }
              return item;
            });
            return { ...p, items: nextItems };
          }
          return p;
        });

        if (updatedAny) {
          localStorage.setItem('rl_food_local_pos', JSON.stringify(updatedPos));
        }
      }
    }

    // Trigger update event
    window.dispatchEvent(new CustomEvent('po_sku_mapping_updated', { detail: { poNumber, poItemId, poItemName, skuData } }));
  } catch (err) {
    console.error('Failed to save PO Item SKU mapping:', err);
  }
}

