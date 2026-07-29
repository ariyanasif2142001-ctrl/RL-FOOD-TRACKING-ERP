import type { PurchaseOrder, POItem } from '../types';

/**
 * Service to fetch real-time data from Google Sheets CSV Export or Google Apps Script WebApp.
 */
export async function fetchRealGoogleSheetsData(sheetUrlOrId: string): Promise<PurchaseOrder[] | null> {
  try {
    let fetchUrl = sheetUrlOrId;

    // If it's a Google Sheet edit URL, transform to CSV export URL
    if (sheetUrlOrId.includes('docs.google.com/spreadsheets/d/')) {
      const match = sheetUrlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const spreadsheetId = match[1];
        fetchUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      }
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const text = await response.text();

    // Check if JSON response (from Google AppsScript exec)
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const data = JSON.parse(text);
      if (Array.isArray(data)) return data;
      if (data.orders && Array.isArray(data.orders)) return data.orders;
    }

    // Parse CSV rows if Google Sheet CSV Export format
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return null;

    const parsedOrders: PurchaseOrder[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 4) {
        const poId = cols[0] || `PO-2026-${100 + i}`;
        const supplier = cols[1] || 'General Supplier';
        const orderDate = cols[2] || new Date().toISOString().substring(0, 10);
        const deliveryDate = cols[3] || orderDate;
        const itemName = cols[4] || 'Food Ingredient Item';
        const orderedQty = parseFloat(cols[5]) || 100;
        const unit = cols[6] || 'kg';
        const estimatedUnitPrice = parseFloat(cols[7]) || 4.5;
        const status = (cols[8] as any) || 'Pending';

        let existingPO = parsedOrders.find((p) => p.id === poId);
        if (!existingPO) {
          existingPO = {
            id: poId,
            supplier,
            department: 'Central Kitchen',
            location: 'Main Facility #1',
            orderDate,
            deliveryDate,
            status,
            receiveStatus: 'Pending',
            items: [],
            totalQuantity: 0,
            totalEstimatedCost: 0,
            totalActualCost: 0,
            createdByName: 'Google Sheets Live Sync',
            createdById: 'usr-sheets-1',
          };
          parsedOrders.push(existingPO);
        }

        const item: POItem = {
          id: `item-${poId}-${i}`,
          sku: `ING-ITEM-${i}`,
          name: itemName,
          category: 'Fresh Produce',
          orderedQty,
          unit,
          estimatedUnitPrice,
          purchaseStatus: status,
          receiveStatus: 'Pending',
        };

        existingPO.items.push(item);
        existingPO.totalQuantity += orderedQty;
        existingPO.totalEstimatedCost += orderedQty * estimatedUnitPrice;
      }
    }

    return parsedOrders.length > 0 ? parsedOrders : null;
  } catch (err) {
    console.error('Failed to sync with real Google Sheets data:', err);
    return null;
  }
}
