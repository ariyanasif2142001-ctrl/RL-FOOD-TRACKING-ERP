import * as XLSX from 'xlsx';
import { MasterSKUEntry, POItem, PurchaseOrder } from '../types';
import { supabase } from './supabaseClient';

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

export const mapRowToMasterSKU = (row: any): MasterSKUEntry => ({
  id: String(row.id),
  customerItemName: row.customer_item_name || row.customerItemName || '',
  customerItemCode: row.customer_item_code || row.customerItemCode || undefined,
  internalSKU: row.internal_sku || row.internalSKU || '',
  internalItemName: row.internal_item_name || row.internalItemName || '',
  internalUnit: row.internal_unit || row.internalUnit || 'PCS',
  category: row.category || undefined,
  brand: row.brand || undefined,
  slNo: row.sl_no || row.slNo || undefined,
  costPrice: row.cost_price !== null && row.cost_price !== undefined ? row.cost_price : row.costPrice,
  sellingPrice: row.selling_price !== null && row.selling_price !== undefined ? row.selling_price : row.sellingPrice,
  assignedTo: row.assigned_to || row.assignedTo || undefined,
  sheetName: row.sheet_name || row.sheetName || undefined,
  lastUpdated: row.last_updated || row.lastUpdated || undefined
});

export const mapMasterSKUToRow = (entry: MasterSKUEntry) => ({
  id: entry.id,
  customer_item_name: entry.customerItemName,
  customer_item_code: entry.customerItemCode || null,
  internal_sku: entry.internalSKU,
  internal_item_name: entry.internalItemName,
  internal_unit: entry.internalUnit || 'PCS',
  category: entry.category || null,
  brand: entry.brand || null,
  sl_no: entry.slNo ? String(entry.slNo) : null,
  cost_price: entry.costPrice !== undefined && entry.costPrice !== '' ? Number(entry.costPrice) : null,
  selling_price: entry.sellingPrice !== undefined && entry.sellingPrice !== '' ? Number(entry.sellingPrice) : null,
  assigned_to: entry.assignedTo || null,
  sheet_name: entry.sheetName || null,
  last_updated: entry.lastUpdated || new Date().toISOString()
});

/**
 * Fetches all Master SKU mappings from Supabase DB, updating local cache.
 */
export async function fetchMasterSKUsFromSupabase(): Promise<MasterSKUEntry[]> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    return cachedMasterSKUMappings || getLocalMasterSKUMappings();
  }

  try {
    const { data: rows, error } = await supabase
      .from('master_skus')
      .select('*')
      .order('internal_sku', { ascending: true });

    if (error) {
      console.warn('[Supabase Master SKUs Fetch Notice]', error.message);
      return cachedMasterSKUMappings || getLocalMasterSKUMappings();
    }

    if (rows && rows.length > 0) {
      const fetched = rows.map(mapRowToMasterSKU);
      cachedMasterSKUMappings = fetched;
      saveToIndexedDB(fetched);
      try {
        localStorage.setItem(STORAGE_KEY_MASTER_SKU, JSON.stringify(fetched.slice(0, 300)));
      } catch (_) {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('master_sku_updated', { detail: { count: fetched.length } }));
      }
      return fetched;
    }
  } catch (err) {
    console.error('Failed to load Master SKUs from Supabase:', err);
  }

  return cachedMasterSKUMappings || getLocalMasterSKUMappings();
}

/**
 * Async batch upsert Master SKU entries into Supabase DB.
 */
export async function saveMasterSKUsToSupabase(mappings: MasterSKUEntry[]): Promise<void> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co' || !mappings || mappings.length === 0) {
    return;
  }

  try {
    const rows = mappings.map(mapMasterSKUToRow);
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from('master_skus').upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.warn('[Supabase Master SKU Batch Upsert Notice]', error.message);
      }
    }
  } catch (err) {
    console.error('Error saving Master SKUs to Supabase:', err);
  }
}

// Initialize Realtime subscription for master_skus table in Supabase
if (typeof window !== 'undefined') {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    fetchMasterSKUsFromSupabase();
    try {
      supabase
        .channel('public:master_skus')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'master_skus' }, async () => {
          await fetchMasterSKUsFromSupabase();
        })
        .subscribe();
    } catch (rtErr) {
      console.warn('Realtime subscription error on master_skus:', rtErr);
    }
  }
}

function getLocalMasterSKUMappings(): MasterSKUEntry[] {
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

export function getMasterSKUMappings(): MasterSKUEntry[] {
  if (cachedMasterSKUMappings && cachedMasterSKUMappings.length > 0) {
    return cachedMasterSKUMappings;
  }
  return getLocalMasterSKUMappings();
}

export function saveMasterSKUMappings(mappings: MasterSKUEntry[]): void {
  cachedMasterSKUMappings = mappings;
  saveToIndexedDB(mappings);

  try {
    const json = JSON.stringify(mappings);
    localStorage.setItem(STORAGE_KEY_MASTER_SKU, json);
  } catch (err: unknown) {
    console.warn('LocalStorage quota exceeded for Master SKU mappings. Using IndexedDB & in-memory cache.', err);
    try {
      const truncated = mappings.slice(0, 300);
      localStorage.setItem(STORAGE_KEY_MASTER_SKU, JSON.stringify(truncated));
    } catch (_) {
      // Ignore quota fallback error
    }
  }

  // Asynchronously save to Supabase
  saveMasterSKUsToSupabase(mappings);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('master_sku_updated', { detail: { count: mappings.length } }));
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
      itemName: match.internalItemName || item.itemName,
      unit: match.internalUnit || item.unit
    };
  }

  return item;
}

/**
 * Re-evaluates purchase order items against current Master SKU database
 */
export function reMatchPOsWithMasterSKU(pos: PurchaseOrder[], mappings?: MasterSKUEntry[]): PurchaseOrder[] {
  const masterList = mappings || getMasterSKUMappings();
  if (!masterList || masterList.length === 0 || !pos || pos.length === 0) return pos;

  return pos.map(po => {
    if (!po || !po.items) return po;
    let hasChanges = false;
    const updatedItems = po.items.map((item: POItem) => {
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

    const localPosRaw = localStorage.getItem('rl_food_local_pos');
    if (localPosRaw) {
      const pos = JSON.parse(localPosRaw);
      if (Array.isArray(pos)) {
        let updatedAny = false;
        const updatedPos = pos.map((p: PurchaseOrder) => {
          if (p.poNumber && p.poNumber.trim().toLowerCase() === normPo) {
            const nextItems = (p.items || []).map((item: POItem) => {
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

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('po_sku_mapping_updated', { detail: { poNumber, poItemId, poItemName, skuData } }));
    }, 0);
  } catch (err) {
    console.error('Failed to save PO Item SKU mapping:', err);
  }
}
