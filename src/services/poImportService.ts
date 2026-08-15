import * as XLSX from 'xlsx';
import {
  RawPOImportRow,
  ImportRowValidationError,
  ImportPreviewAnalysis,
  ImportExecutionResult,
  PurchaseOrder,
  POItem,
  MasterStatus,
  ItemPurchaseStatus,
  User,
  MasterSKUEntry
} from '../types';
import { getCurrentUser } from './storage';
import { notifyNewPOImported, notifyBulkPOImported } from './telegramService';
import { matchPOItemToMasterSKU, getMasterSKUMappings } from './skuService';
import { fetchPOsFromSupabase } from './apiClient';

// Expected Excel Header Mapping
const REQUIRED_HEADERS = [
  'ORDER DATE',
  'LOCATION',
  'PO NUMBER',
  'DEPARTMENT',
  'SL NUMBER',
  'ITEM NAME',
  'BRAND',
  'UNIT',
  'QTY',
  'DELIVERY DATE'
];

/**
 * Parses Raw File (Excel .xlsx / .xls or CSV text) into structured rows
 */
export async function parsePOFile(file: File): Promise<{ rows: RawPOImportRow[]; parseError?: string }> {
  try {
    if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text();
      return parsePOText(text);
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { rows: [], parseError: 'The uploaded file contains no sheets.' };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to 2D array matrix
    const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as (string | number)[][];
    
    if (!matrix || matrix.length === 0) {
      return { rows: [], parseError: 'The uploaded spreadsheet is empty.' };
    }

    return parseMatrixToRows(matrix);
  } catch (err: unknown) {
    // If file is text based fallback
    try {
      const text = await file.text();
      if (text && text.trim()) {
        return parsePOText(text);
      }
    } catch {}
    return { rows: [], parseError: `Failed to parse file: ${(err as Error)?.message || 'Invalid format'}` };
  }
}

/**
 * Generates and downloads a sample PO XLSX template file
 */
export function downloadSampleXLSXTemplate() {
  const headers = REQUIRED_HEADERS;
  const sampleData = [
    headers,
    [
      '2026-07-22',
      'Central Warehouse Bay 1',
      'PO-2026-101',
      'Fresh Produce',
      1,
      'Organic Fresh Tomatoes',
      'AgriFresh',
      'kg',
      150,
      '2026-07-23'
    ],
    [
      '2026-07-22',
      'Central Warehouse Bay 1',
      'PO-2026-101',
      'Fresh Produce',
      2,
      'Red Bell Peppers',
      'AgriFresh',
      'kg',
      80,
      '2026-07-23'
    ],
    [
      '2026-07-22',
      'Cold Storage A',
      'PO-2026-102',
      'Meats & Frozen',
      1,
      'Fresh Chicken Breast',
      'Prime Poultry',
      'kg',
      120,
      '2026-07-22'
    ],
    [
      '2026-07-22',
      'Cold Storage A',
      'PO-2026-102',
      'Meats & Frozen',
      2,
      'Beef Ribeye Cuts',
      'Prime Poultry',
      'kg',
      45,
      '2026-07-22'
    ]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // ORDER DATE
    { wch: 22 }, // LOCATION
    { wch: 15 }, // PO NUMBER
    { wch: 18 }, // DEPARTMENT
    { wch: 10 }, // SL NUMBER
    { wch: 25 }, // ITEM NAME
    { wch: 15 }, // BRAND
    { wch: 8 },  // UNIT
    { wch: 10 }, // QTY
    { wch: 12 }  // DELIVERY DATE
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PO_Import_Template');
  
  XLSX.writeFile(workbook, 'PO_Import_Sample_Template.xlsx');
}

/**
 * Generates and downloads a large scale (1,000+ items) sample XLSX template file
 */
export function downloadLargeScaleSampleXLSXTemplate(targetItemsCount = 1000) {
  const headers = REQUIRED_HEADERS;
  const sampleData: (string | number)[][] = [headers];

  const departments = ['Fresh Produce', 'Dairy & Refrigerated', 'Grocery & Staples', 'Frozen Foods', 'Beverages', 'Hardware & Tools', 'Office Supplies', 'Electronics & IT'];
  const locations = ['Central Warehouse Bay 1', 'Cold Storage Unit A', 'North Distribution Hub', 'South Regional Facility'];
  const brands = ['AgriFresh', 'DairyChoice', 'GoldenGrain', 'FrostKing', 'AquaClear', 'ProTool', 'OfficeMax', 'TechPro'];
  const units = ['kg', 'Pcs', 'Box', 'Case', 'Pack', 'Ltr', 'Bags', 'Tin'];
  
  const sampleItemsList = [
    'Organic Fresh Tomatoes', 'Red Bell Peppers', 'Fresh Chicken Breast', 'Beef Ribeye Cuts',
    'Full Cream Whole Milk', 'Cheddar Cheese Blocks', 'Basmati Premium Rice 5kg', 'Refined Sunflower Oil 2L',
    'Frozen Green Peas 1kg', 'Natural Mineral Water Case', 'Stainless Steel Hand Tools Set', 'Heavy Duty Paper Towels',
    'Ergonomic Wireless Mouse', 'A4 Printing Paper ream', 'Whole Grain Wheat Flour', 'Greek Style Yogurt',
    'Organic Honey Jar 500g', 'Ground Arabica Coffee', 'Almond Milk 1L Box', 'Dark Chocolate Bars 100g'
  ];

  const itemsPerPO = 20;
  const poCount = Math.ceil(targetItemsCount / itemsPerPO);
  let totalGenerated = 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (let p = 1; p <= poCount && totalGenerated < targetItemsCount; p++) {
    const poNum = `PO-2026-BULK-${1000 + p}`;
    const dept = departments[(p - 1) % departments.length];
    const loc = locations[(p - 1) % locations.length];
    const brand = brands[(p - 1) % brands.length];

    for (let i = 1; i <= itemsPerPO && totalGenerated < targetItemsCount; i++) {
      totalGenerated++;
      const itemBase = sampleItemsList[(totalGenerated - 1) % sampleItemsList.length];
      const itemName = `${itemBase} (Lot #${totalGenerated})`;
      const unit = units[(totalGenerated - 1) % units.length];
      const qty = Math.floor(Math.random() * 250) + 10;

      sampleData.push([
        todayStr,
        loc,
        poNum,
        dept,
        i,
        itemName,
        brand,
        unit,
        qty,
        nextWeekStr
      ]);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 20 },
    { wch: 10 }, { wch: 32 }, { wch: 15 }, { wch: 8 },
    { wch: 10 }, { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '1000_Items_PO_Import');
  XLSX.writeFile(workbook, `PO_Import_1000_Items_Sample_Template.xlsx`);
}

/**
 * Exports current Purchase Orders and items to an XLSX file
 */
export function exportPOsToXLSX(pos: PurchaseOrder[]) {
  const exportRows: (string | number)[][] = [REQUIRED_HEADERS];

  pos.forEach(po => {
    (po.items || []).forEach((item, idx) => {
      exportRows.push([
        po.orderDate || '',
        po.location || item.location || 'Central Warehouse',
        po.poNumber,
        po.department || item.department || 'General',
        item.slNumber || (idx + 1),
        item.itemName,
        item.brand || 'N/A',
        item.unit || 'Pcs',
        item.requestedQty || item.orderedQty || 0,
        po.deliveryDate || item.deliveryDate || ''
      ]);
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);
  
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 18 },
    { wch: 10 },
    { wch: 25 },
    { wch: 15 },
    { wch: 8 },
    { wch: 10 },
    { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase_Orders');

  const fileName = `Purchase_Orders_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Parses raw text (e.g. CSV or tab-delimited paste) into structured rows
 */
export function parsePOText(rawText: string): { rows: RawPOImportRow[]; parseError?: string } {
  if (!rawText || !rawText.trim()) {
    return { rows: [], parseError: 'No data provided in text input.' };
  }

  const lines = rawText.trim().split(/\r?\n/);
  const matrix = lines.map(line => line.split(line.includes('\t') ? '\t' : ',').map(cell => cell.trim()));
  
  return parseMatrixToRows(matrix);
}

function parseMatrixToRows(matrix: (string | number)[][]): { rows: RawPOImportRow[]; parseError?: string } {
  if (matrix.length === 0) {
    return { rows: [], parseError: 'Spreadsheet has no rows.' };
  }

  // Find header row (usually row 0 or first non-empty row)
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, matrix.length); i++) {
    const row = matrix[i];
    if (row && Array.isArray(row) && row.length > 0) {
      const normalizedRow = row.map(cell => String(cell || '').trim().toUpperCase());
      const hasKeyHeaders = normalizedRow.some(h => 
        h.includes('PO') || h.includes('ITEM') || h.includes('ORDER') || h.includes('LOCATION') || h.includes('QTY') || h.includes('DEPARTMENT')
      );
      if (hasKeyHeaders) {
        headerRowIndex = i;
        headers = normalizedRow;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    headers = (matrix[0] || []).map(cell => String(cell || '').trim().toUpperCase());
  }

  // Map column names to indexes
  const colIndexes: Record<string, number> = {};
  
  headers.forEach((h, idx) => {
    const cleanHeader = h.replace(/[^A-Z0-9\s]/g, ' ').trim();

    // 1. DELIVERY DATE (check before ORDER DATE to avoid false matches)
    if (cleanHeader.includes('DELIVERY') || cleanHeader.includes('DUE') || cleanHeader.includes('REQUIRED DATE')) {
      colIndexes['DELIVERY DATE'] = idx;
    }
    // 2. ORDER DATE
    else if ((cleanHeader.includes('ORDER') && cleanHeader.includes('DATE')) || cleanHeader === 'PO DATE' || cleanHeader === 'DATE' || cleanHeader === 'ORDER DATE') {
      colIndexes['ORDER DATE'] = idx;
    }
    // 3. LOCATION
    else if (cleanHeader.includes('LOCATION') || cleanHeader.includes('DEST') || cleanHeader.includes('SITE') || cleanHeader.includes('WAREHOUSE') || cleanHeader.includes('BRANCH')) {
      colIndexes['LOCATION'] = idx;
    }
    // 4. PO NUMBER (Explicit check, ignoring "ITEM ID" or "SL NO")
    else if (
      cleanHeader === 'PO' || 
      cleanHeader === 'PO NUMBER' || 
      cleanHeader === 'PO NO' || 
      cleanHeader === 'PO ID' || 
      cleanHeader === 'PURCHASE ORDER' || 
      cleanHeader === 'ORDER NO' ||
      (cleanHeader.includes('PO') && !cleanHeader.includes('ITEM') && !cleanHeader.includes('DATE') && !cleanHeader.includes('SL'))
    ) {
      colIndexes['PO NUMBER'] = idx;
    }
    // 5. DEPARTMENT
    else if (cleanHeader.includes('DEPT') || cleanHeader.includes('DEPARTMENT') || cleanHeader === 'CATEGORY' || cleanHeader === 'SECTION') {
      colIndexes['DEPARTMENT'] = idx;
    }
    // 6. SL NUMBER
    else if (
      cleanHeader === 'SL' || 
      cleanHeader === 'SL NUMBER' || 
      cleanHeader === 'SL NO' || 
      cleanHeader === 'S NO' || 
      cleanHeader === 'SERIAL' || 
      cleanHeader === 'LINE NO'
    ) {
      colIndexes['SL NUMBER'] = idx;
    }
    // 7. ITEM NAME (Ensure "ITEM ID" is excluded)
    else if (
      cleanHeader === 'ITEM NAME' || 
      cleanHeader === 'ITEM' || 
      cleanHeader === 'PRODUCT' || 
      cleanHeader === 'PRODUCT NAME' || 
      cleanHeader === 'DESCRIPTION' || 
      cleanHeader === 'ITEM DESCRIPTION' || 
      cleanHeader === 'MATERIAL'
    ) {
      colIndexes['ITEM NAME'] = idx;
    }
    // 8. BRAND
    else if (cleanHeader.includes('BRAND') || cleanHeader.includes('MAKE') || cleanHeader.includes('MANUFACTURER') || cleanHeader.includes('SUPPLIER')) {
      colIndexes['BRAND'] = idx;
    }
    // 9. UNIT
    else if (cleanHeader === 'UNIT' || cleanHeader === 'UOM' || cleanHeader === 'PACK' || cleanHeader === 'UNIT OF MEASURE') {
      colIndexes['UNIT'] = idx;
    }
    // 10. QTY
    else if (cleanHeader.includes('QTY') || cleanHeader.includes('QUANTITY') || cleanHeader.includes('COUNT') || cleanHeader === 'AMOUNT') {
      colIndexes['QTY'] = idx;
    }
  });

  // Fallback positional indexing if no headers were matched
  const hasMinMappings = colIndexes['PO NUMBER'] !== undefined || colIndexes['ITEM NAME'] !== undefined;
  if (!hasMinMappings) {
    // Standard default template order: ORDER DATE, LOCATION, PO NUMBER, DEPARTMENT, SL NUMBER, ITEM NAME, BRAND, UNIT, QTY, DELIVERY DATE
    colIndexes['ORDER DATE'] = 0;
    colIndexes['LOCATION'] = 1;
    colIndexes['PO NUMBER'] = 2;
    colIndexes['DEPARTMENT'] = 3;
    colIndexes['SL NUMBER'] = 4;
    colIndexes['ITEM NAME'] = 5;
    colIndexes['BRAND'] = 6;
    colIndexes['UNIT'] = 7;
    colIndexes['QTY'] = 8;
    colIndexes['DELIVERY DATE'] = 9;
  }

  const parsedRows: RawPOImportRow[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || !Array.isArray(row) || row.every(cell => !cell || String(cell).trim() === '')) {
      continue; // Skip blank row
    }

    let orderDate = colIndexes['ORDER DATE'] !== undefined ? String(row[colIndexes['ORDER DATE']] || '').trim() : '';
    let location = colIndexes['LOCATION'] !== undefined ? String(row[colIndexes['LOCATION']] || '').trim() : '';
    let poNumber = colIndexes['PO NUMBER'] !== undefined ? String(row[colIndexes['PO NUMBER']] || '').trim() : '';
    let department = colIndexes['DEPARTMENT'] !== undefined ? String(row[colIndexes['DEPARTMENT']] || '').trim() : '';
    let slNumber = colIndexes['SL NUMBER'] !== undefined ? String(row[colIndexes['SL NUMBER']] || '').trim() : '';
    let itemName = colIndexes['ITEM NAME'] !== undefined ? String(row[colIndexes['ITEM NAME']] || '').trim() : '';
    let brand = colIndexes['BRAND'] !== undefined ? String(row[colIndexes['BRAND']] || '').trim() : '';
    let unit = colIndexes['UNIT'] !== undefined ? String(row[colIndexes['UNIT']] || '').trim() : '';
    let qtyRaw = colIndexes['QTY'] !== undefined ? row[colIndexes['QTY']] : '';
    let deliveryDate = colIndexes['DELIVERY DATE'] !== undefined ? String(row[colIndexes['DELIVERY DATE']] || '').trim() : '';

    // Smart Value Correction Engine:
    // 1. If poNumber looks like a date (e.g. 22-07-2026) and orderDate looks like PO (PO-1540-07...), swap them
    const isDateRegex = /^\d{2,4}[-\/]\d{1,2}[-\/]\d{2,4}$/;
    if (isDateRegex.test(poNumber) && (orderDate.toUpperCase().includes('PO') || orderDate.length > 3)) {
      const temp = poNumber;
      poNumber = orderDate;
      orderDate = temp;
    }

    // 2. If location looks like a PO Number, swap location & poNumber
    if (location.toUpperCase().startsWith('PO-') && !poNumber.toUpperCase().startsWith('PO-')) {
      const temp = location;
      location = poNumber;
      poNumber = temp;
    }

    // 3. If itemName looks like a common Unit ('Pkt', 'Pcs', 'Kg', 'Box', 'Case') or number, search row cells for true item name
    const commonUnits = ['PKT', 'PCS', 'KG', 'BOX', 'CASE', 'BAG', 'TIN', 'BOTTLE', 'CAN', 'GRAM', 'LTR'];
    if (commonUnits.includes(itemName.toUpperCase()) || !isNaN(Number(itemName))) {
      // Find a string in row that looks like a product description
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (val && val.length > 3 && isNaN(Number(val)) && !isDateRegex.test(val) && !val.toUpperCase().startsWith('PO-') && !commonUnits.includes(val.toUpperCase())) {
          if (c === colIndexes['UNIT']) {
            unit = itemName; // swap unit
          }
          itemName = val;
          break;
        }
      }
    }

    parsedRows.push({
      rowIndex: r + 1,
      orderDate: orderDate || new Date().toISOString().split('T')[0],
      location: location || 'Central Warehouse',
      poNumber: poNumber || `PO-${Date.now()}`,
      department: department || 'General',
      slNumber: slNumber || String(parsedRows.length + 1),
      itemName: itemName || `Imported Item ${parsedRows.length + 1}`,
      brand: brand || 'N/A',
      unit: unit || 'Pcs',
      qty: qtyRaw,
      deliveryDate: deliveryDate || orderDate || new Date().toISOString().split('T')[0]
    });
  }

  return { rows: parsedRows };
}

/**
 * Validates parsed rows against strict business rules before import
 */
export function validateAndAnalyzePOImport(rows: RawPOImportRow[], existingPOs: PurchaseOrder[]): ImportPreviewAnalysis {
  const errors: ImportRowValidationError[] = [];
  const warnings: string[] = [];
  
  if (rows.length === 0) {
    errors.push({
      rowIndex: 0,
      column: 'FILE',
      message: 'No valid data rows found in the uploaded file.',
      severity: 'error'
    });
  }

  const existingPOMap = new Map<string, PurchaseOrder>();
  existingPOs.forEach(po => existingPOMap.set(po.poNumber.trim().toUpperCase(), po));

  const filePOs = new Set<string>();
  let validRowsCount = 0;
  let invalidRowsCount = 0;

  rows.forEach(row => {
    let rowHasError = false;

    // Check missing PO Number
    if (!row.poNumber || !row.poNumber.trim()) {
      errors.push({
        rowIndex: row.rowIndex,
        column: 'PO NUMBER',
        message: `Row ${row.rowIndex}: Missing mandatory PO Number.`,
        severity: 'error'
      });
      rowHasError = true;
    } else {
      filePOs.add(row.poNumber.trim().toUpperCase());
    }

    // Check missing Item Name
    if (!row.itemName || !row.itemName.trim()) {
      errors.push({
        rowIndex: row.rowIndex,
        column: 'ITEM NAME',
        message: `Row ${row.rowIndex}: Missing mandatory Item Name.`,
        severity: 'error'
      });
      rowHasError = true;
    }

    // Check Quantity
    const qtyVal = typeof row.qty === 'number' ? row.qty : parseFloat(String(row.qty).replace(/,/g, ''));
    if (isNaN(qtyVal) || qtyVal <= 0) {
      errors.push({
        rowIndex: row.rowIndex,
        column: 'QTY',
        message: `Row ${row.rowIndex}: Invalid Quantity value '${row.qty}'. Must be a positive number.`,
        severity: 'error'
      });
      rowHasError = true;
    }

    if (rowHasError) {
      invalidRowsCount++;
    } else {
      validRowsCount++;
    }
  });

  // Calculate duplicate vs new POs
  let duplicatePOsCount = 0;
  let newPOsCount = 0;

  filePOs.forEach(poNum => {
    if (existingPOMap.has(poNum)) {
      duplicatePOsCount++;
    } else {
      newPOsCount++;
    }
  });

  if (duplicatePOsCount > 0) {
    warnings.push(`${duplicatePOsCount} existing Purchase Order(s) detected in database. Existing PO metadata and items will be updated without creating duplicate records.`);
  }

  return {
    totalRows: rows.length,
    totalPOs: filePOs.size,
    duplicatePOsCount,
    newPOsCount,
    validRowsCount,
    invalidRowsCount,
    warnings,
    errors,
    parsedRows: rows
  };
}

/**
 * Pure function: Executes PO item merging, quantity updates, and bundle generation
 * against a given base array of POs without side-effecting remote database queries.
 */
export function processPOMergeAndImport(
  rawRows: RawPOImportRow[],
  basePOs: PurchaseOrder[],
  options?: {
    currentUser?: User;
    masterSKUMappings?: MasterSKUEntry[];
    notify?: boolean;
  }
): ImportExecutionResult {
  const startTime = performance.now();
  const warnings: string[] = [];
  const currentUser: User = options?.currentUser || getCurrentUser() || { id: 'u1', name: 'Admin', email: 'admin@system.local', role: 'admin', active: true };
  const masterSKUMappings = options?.masterSKUMappings || getMasterSKUMappings();
  const shouldNotify = options?.notify ?? true;

  // Map of existing POs by PO Number (case insensitive)
  const poMap = new Map<string, PurchaseOrder>();
  basePOs.forEach(po => poMap.set(po.poNumber.trim().toUpperCase(), JSON.parse(JSON.stringify(po))));

  // Group imported rows by PO Number
  const rowsByPO = new Map<string, RawPOImportRow[]>();
  rawRows.forEach(row => {
    const key = row.poNumber.trim().toUpperCase();
    if (!rowsByPO.has(key)) {
      rowsByPO.set(key, []);
    }
    rowsByPO.get(key)!.push(row);
  });

  let totalPOsImported = 0;
  let totalPOsUpdated = 0;
  let totalItemsImported = 0;
  let totalItemsUpdated = 0;
  let totalImportedQuantity = 0;

  const newPoNumbersSample: string[] = [];
  const updatedPOsList: PurchaseOrder[] = [];
  let seqCounter = 0;

  // Process each PO group
  rowsByPO.forEach((importRows, poKey) => {
    const firstRow = importRows[0];
    const poNumber = firstRow.poNumber.trim();
    const orderDate = firstRow.orderDate || new Date().toISOString().split('T')[0];
    const deliveryDate = firstRow.deliveryDate || orderDate;
    const department = firstRow.department || 'General';
    const location = firstRow.location || 'General Warehouse';
    const nowMs = Date.now();
    const nowIso = new Date().toISOString();

    if (poMap.has(poKey)) {
      // UPDATE EXISTING PO
      totalPOsUpdated++;
      const existingPO = poMap.get(poKey)!;
      
      existingPO.orderDate = orderDate;
      existingPO.deliveryDate = deliveryDate;
      existingPO.department = department;
      existingPO.location = location;
      existingPO.updatedAt = nowIso;
      existingPO.isHeldByAdmin = false;
      existingPO.holdByAdmin = '';

      const existingItemsMap = new Map<string, POItem>();
      existingPO.items.forEach(item => {
        const itemKey = `${item.slNumber || ''}_${item.itemName.trim().toUpperCase()}`;
        existingItemsMap.set(itemKey, item);
      });

      const processedItemKeys = new Set<string>();
      const updatedItemsList: POItem[] = [];

      importRows.forEach((impRow, idx) => {
        const qtyVal = typeof impRow.qty === 'number' ? impRow.qty : parseFloat(String(impRow.qty).replace(/,/g, '')) || 0;
        totalImportedQuantity += qtyVal;
        const itemKey = `${impRow.slNumber || ''}_${impRow.itemName.trim().toUpperCase()}`;
        const existingItem = existingItemsMap.get(itemKey) || existingPO.items.find(i => i.itemName.trim().toUpperCase() === impRow.itemName.trim().toUpperCase());

        if (existingItem) {
          totalItemsUpdated++;
          const oldQty = existingItem.requestedQty || existingItem.orderedQty || 0;
          existingItem.requestedQty = qtyVal;
          existingItem.orderedQty = qtyVal;
          existingItem.slNumber = impRow.slNumber || existingItem.slNumber || (idx + 1);
          existingItem.itemName = impRow.itemName;
          existingItem.brand = impRow.brand || existingItem.brand;
          existingItem.unit = impRow.unit || existingItem.unit;
          existingItem.department = department;
          existingItem.location = location;
          existingItem.deliveryDate = deliveryDate;
          existingItem.orderDate = orderDate;
          existingItem.updatedDate = nowIso.split('T')[0];

          // Reset hold fields when re-importing if no explicit hold info is in row
          existingItem.holdBy = '';
          existingItem.holdById = '';
          existingItem.holdByName = '';
          existingItem.holdStartTime = '';
          existingItem.holdSince = '';
          existingItem.holdExpireTime = '';
          existingItem.isHeldByAdmin = false;
          if (existingItem.purchaseStatus === 'Held') {
            existingItem.purchaseStatus = 'Pending';
          }

          const purchased = existingItem.purchasedQty || 0;
          existingItem.remainingQty = Math.max(0, qtyVal - purchased);
          
          if (oldQty !== qtyVal && warnings.length < 15) {
            warnings.push(`PO ${poNumber} - '${impRow.itemName}': Quantity updated from ${oldQty} to ${qtyVal}. Remaining Qty recalculated to ${existingItem.remainingQty}.`);
          }

          updatedItemsList.push(existingItem);
          processedItemKeys.add(existingItem.id);
        } else {
          totalItemsImported++;
          seqCounter++;
          const newItemId = `item-${nowMs}-${seqCounter}-${Math.random().toString(36).substring(2, 6)}`;
          const rawNewItem: POItem = {
            id: newItemId,
            poId: existingPO.id,
            poNumber,
            orderDate,
            deliveryDate,
            department,
            location,
            slNumber: impRow.slNumber || (existingPO.items.length + idx + 1),
            itemName: impRow.itemName,
            customerItemName: impRow.itemName,
            customerUnit: impRow.unit || 'Pcs',
            brand: impRow.brand || 'N/A',
            category: department,
            unit: impRow.unit || 'Pcs',
            requestedQty: qtyVal,
            orderedQty: qtyVal,
            purchasedQty: 0,
            remainingQty: qtyVal,
            purchaseStatus: 'Pending',
            holdBy: '',
            holdById: '',
            holdByName: '',
            holdStartTime: '',
            holdSince: '',
            holdExpireTime: '',
            createdDate: nowIso.split('T')[0],
            updatedDate: nowIso.split('T')[0]
          };
          const newItem = matchPOItemToMasterSKU(rawNewItem, masterSKUMappings) as POItem;
          updatedItemsList.push(newItem);
        }
      });

      existingPO.items = updatedItemsList;
      existingPO.totalItems = updatedItemsList.length;
      existingPO.totalQuantity = updatedItemsList.reduce((sum, item) => sum + (item.requestedQty || item.orderedQty || 0), 0);
      
      const allPurchased = updatedItemsList.every(i => i.purchaseStatus === 'Purchased' || (i.remainingQty === 0 && i.purchasedQty > 0));
      const anyPurchased = updatedItemsList.some(i => i.purchasedQty > 0 || i.purchaseStatus === 'Partial Purchased' || i.purchaseStatus === 'Purchased');
      existingPO.purchaseStatus = allPurchased ? 'Completed' : anyPurchased ? 'Partial' : 'Pending';

      updatedPOsList.push(existingPO);
    } else {
      totalPOsImported++;
      newPoNumbersSample.push(poNumber);
      seqCounter++;
      const poId = `po-${nowMs}-${seqCounter}-${Math.random().toString(36).substring(2, 6)}`;
      const itemsList: POItem[] = [];

      importRows.forEach((impRow, idx) => {
        totalItemsImported++;
        seqCounter++;
        const qtyVal = typeof impRow.qty === 'number' ? impRow.qty : parseFloat(String(impRow.qty).replace(/,/g, '')) || 0;
        totalImportedQuantity += qtyVal;
        const itemId = `item-${nowMs}-${seqCounter}-${Math.random().toString(36).substring(2, 6)}`;

        const rawItem: POItem = {
          id: itemId,
          poId,
          poNumber,
          orderDate,
          deliveryDate,
          department,
          location,
          slNumber: impRow.slNumber || (idx + 1),
          itemName: impRow.itemName,
          customerItemName: impRow.itemName,
          customerUnit: impRow.unit || 'Pcs',
          brand: impRow.brand || 'N/A',
          category: department,
          unit: impRow.unit || 'Pcs',
          requestedQty: qtyVal,
          orderedQty: qtyVal,
          purchasedQty: 0,
          remainingQty: qtyVal,
          purchaseStatus: 'Pending',
          holdBy: '',
          holdById: '',
          holdByName: '',
          holdStartTime: '',
          holdSince: '',
          holdExpireTime: '',
          createdDate: nowIso.split('T')[0],
          updatedDate: nowIso.split('T')[0]
        };
        const matchedItem = matchPOItemToMasterSKU(rawItem, masterSKUMappings) as POItem;
        itemsList.push(matchedItem);
      });

      const totalQuantity = itemsList.reduce((sum, item) => sum + item.requestedQty, 0);

      const newPO: PurchaseOrder = {
        id: poId,
        poNumber,
        customerName: `${department} (${location})`,
        orderDate,
        deliveryDate,
        department,
        location,
        totalItems: itemsList.length,
        totalQuantity,
        purchaseStatus: 'Pending',
        receiveStatus: 'Pending',
        status: 'pending',
        isHeldByAdmin: false,
        holdByAdmin: '',
        items: itemsList,
        createdBy: currentUser.name,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      updatedPOsList.push(newPO);

      // Trigger individual Telegram notification only if single or small import (<3 POs)
      if (shouldNotify && rowsByPO.size <= 2) {
        notifyNewPOImported(
          newPO.poNumber,
          newPO.department || 'General',
          newPO.location || 'Central Warehouse',
          newPO.totalItems,
          newPO.totalQuantity,
          currentUser.name
        );
      }
    }
  });

  // If bulk import (>2 POs or bulk mode), send 1 aggregated bulk notification
  if (shouldNotify && rowsByPO.size > 2 && totalPOsImported > 0) {
    notifyBulkPOImported(
      totalPOsImported,
      totalItemsImported + totalItemsUpdated,
      totalImportedQuantity,
      currentUser.name,
      newPoNumbersSample
    );
  }

  const endTime = performance.now();

  return {
    success: true,
    totalPOsImported,
    totalPOsUpdated,
    totalItemsImported,
    totalItemsUpdated,
    timeTakenMs: Math.round(endTime - startTime),
    warnings,
    timestamp: new Date().toISOString(),
    updatedPOs: updatedPOsList
  };
}

/**
 * Executes the PO Import with transaction & duplicate merging rules.
 * In production when Supabase is configured, it ALWAYS fetches fresh records
 * from Supabase to prevent stale state overwrites.
 */
export async function executePOImport(
  rawRows: RawPOImportRow[],
  existingPOs?: PurchaseOrder[]
): Promise<ImportExecutionResult> {
  const currentUser: User = getCurrentUser() || { id: 'u1', name: 'Admin', email: 'admin@system.local', role: 'admin', active: true };
  const masterSKUMappings = getMasterSKUMappings();

  // Always fetch current/fresh PO data from Supabase if available
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co');

  let basePOs: PurchaseOrder[] = [];
  if (isSupabaseConfigured) {
    const freshPOsFromDb = await fetchPOsFromSupabase();
    if (freshPOsFromDb === null) {
      return {
        success: false,
        totalPOsImported: 0,
        totalPOsUpdated: 0,
        totalItemsImported: 0,
        totalItemsUpdated: 0,
        timeTakenMs: 0,
        warnings: ['Database connection error. Failed to load fresh records from Supabase for import.'],
        timestamp: new Date().toISOString(),
        updatedPOs: []
      };
    }
    basePOs = freshPOsFromDb || [];
  } else {
    basePOs = existingPOs || [];
  }

  return processPOMergeAndImport(rawRows, basePOs, {
    currentUser,
    masterSKUMappings,
    notify: true
  });
}
