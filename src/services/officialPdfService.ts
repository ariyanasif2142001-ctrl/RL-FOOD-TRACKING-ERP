import { PurchaseOrder, POItem } from '../types';

/**
 * Service to generate exact RADIANT LIGHTNING (RL) Official Delivery Note / PO Invoice PDF
 * Matches exact Header & Footer from RADIANT LIGHTNING Premium Food Supply official pad.
 */

export interface InvoiceOptions {
  recipientName?: string;
  dispatchOfficer?: string;
  signatureDataUrl?: string;
  dnNumber?: string;
  deliveryDate?: string;
  companyName?: string;
  companySubtext?: string;
  poNumber?: string;
  department?: string;
  location?: string;
  includePrices?: boolean; // Default false for Delivery Note
  displayNameMode?: 'internal' | 'customer' | 'dual'; // Dual-name display option
  vatRate?: number; // e.g., 0.15 for 15%
  items?: POItem[];
}

export function generateOfficialRLDeliveryNoteHtml(po: PurchaseOrder, options?: InvoiceOptions): string {
  const recipientName = options?.recipientName || '';
  const signatureDataUrl = options?.signatureDataUrl || '';
  const dnNumber = options?.dnNumber || `${po.poNumber.replace(/^PO-?/i, '')}-DN`;
  const deliveryDateStr = options?.deliveryDate || (po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  const vatRate = options?.vatRate !== undefined ? options.vatRate : 0.15;
  const companyName = options?.companyName || 'C P P A';
  const companySubtext = options?.companySubtext || 'الشؤون الخاصة لسمو ولي العهد';
  const poNumber = options?.poNumber || po.poNumber;
  const department = options?.department || po.department || 'WH';
  const location = options?.location || po.location || 'ADF';
  const includePrices = options?.includePrices ?? false; // Default false as requested
  const displayNameMode = options?.displayNameMode || 'internal';

  const items = (options?.items && options.items.length > 0) ? options.items : (po.items || []);

  let subTotal = 0;
  const itemRowsHtml = items.map((item, idx) => {
    const qty = item.warehouseQty || item.purchasedQty || item.requestedQty || item.orderedQty || 1;
    const unitPrice = item.unitPrice || item.marketPrice || 67.20;
    const lineTotal = qty * unitPrice;
    subTotal += lineTotal;

    const seqNo = 125 + idx;
    
    // Name & Unit formatting based on displayNameMode
    let displayedName = item.internalItemName || item.itemName;
    let displayedUnit = (item.internalUnit || item.unit || 'PCS').toUpperCase();
    let sku = item.internalItemCode || item.sku || `IP00${780 + idx}`;

    if (displayNameMode === 'customer') {
      displayedName = item.customerItemName || item.itemName;
      displayedUnit = (item.customerUnit || item.unit || 'PCS').toUpperCase();
      sku = item.customerItemCode || item.sku || `KT${100400 + idx}`;
    } else if (displayNameMode === 'dual') {
      const custName = item.customerItemName || item.itemName;
      const intName = item.internalItemName || item.itemName;
      const intCode = item.internalItemCode || item.sku || `IP00${780 + idx}`;
      displayedName = `${custName} <div style="font-size: 10px; font-weight: normal; color: #374151; margin-top: 2px;">(Internal SKU: ${intName} [${intCode}])</div>`;
    }

    return `
      <tr style="border-bottom: 1px solid #000; font-size: 11px; font-weight: bold;">
        <td style="border: 1px solid #000; padding: 7px 4px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 7px 4px; text-align: center;">${seqNo}</td>
        <td style="border: 1px solid #000; padding: 7px 4px; text-align: center; font-family: monospace;">${sku}</td>
        <td style="border: 1px solid #000; padding: 7px 8px; text-align: left; text-transform: uppercase;">
          ${displayedName}
          ${item.brand ? `<span style="color: #4b5563; font-size: 10px; font-weight: normal; margin-left: 4px;">(${escapeHtml(item.brand)})</span>` : ''}
        </td>
        <td style="border: 1px solid #000; padding: 7px 4px; text-align: center;">${displayedUnit}</td>
        <td style="border: 1px solid #000; padding: 7px 4px; text-align: center;">${qty}</td>
        ${includePrices ? `
          <td style="border: 1px solid #000; padding: 7px 6px; text-align: right;">${unitPrice.toFixed(2)}</td>
          <td style="border: 1px solid #000; padding: 7px 6px; text-align: right;">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        ` : ''}
      </tr>
    `;
  }).join('');

  const vatAmount = subTotal * vatRate;
  const grandTotal = subTotal + vatAmount;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RL Food Delivery Note - ${po.poNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@700&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 15mm 12mm 25mm 12mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 20px 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .brand-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .brand-title {
      font-family: "Times New Roman", Times, serif;
      font-size: 32px;
      font-weight: 800;
      color: #111111;
      letter-spacing: 1.5px;
      margin: 0;
      line-height: 1;
    }

    .brand-badge {
      background-color: #769d24;
      color: #ffffff;
      padding: 3px 18px 4px 18px;
      border-radius: 6px;
      font-family: "Georgia", "Brush Script MT", cursive, serif;
      font-size: 17px;
      font-style: italic;
      display: inline-block;
      margin-top: 4px;
    }

    .logo-right {
      display: flex;
      align-items: center;
      position: relative;
    }

    .rl-logo-text {
      font-size: 56px;
      font-weight: 900;
      color: #2e382b;
      font-family: Arial, Helvetica, sans-serif;
      letter-spacing: -3px;
      line-height: 0.9;
      position: relative;
    }

    .rl-leaf-svg {
      position: absolute;
      top: -6px;
      right: -16px;
      width: 32px;
      height: 32px;
    }

    .doc-title {
      text-align: center;
      margin-bottom: 22px;
    }

    .doc-title h2 {
      font-size: 17px;
      font-weight: 900;
      letter-spacing: 1.2px;
      color: #000;
      text-transform: uppercase;
      margin: 0;
    }

    .meta-boxes {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }

    .meta-box {
      flex: 1;
      border: 1.5px solid #000000;
      border-radius: 12px;
      padding: 12px 16px;
      min-height: 90px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .company-title {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }

    .company-name {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
      letter-spacing: 1px;
    }

    .company-arabic {
      font-size: 14px;
      font-weight: bold;
      direction: rtl;
      text-align: right;
      font-family: 'Amiri', 'Traditional Arabic', serif;
    }

    .dn-grid {
      display: grid;
      grid-template-columns: 120px 12px 1fr;
      row-gap: 3px;
      font-size: 11px;
      font-weight: bold;
    }

    table.items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 20px;
      border: 1.5px solid #000000;
    }

    table.items-table th {
      background-color: #d1d5db;
      color: #000000;
      border: 1px solid #000000;
      padding: 7px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 10px;
    }

    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 15px;
      margin-bottom: 60px;
      font-size: 11px;
      font-weight: bold;
      page-break-inside: avoid;
    }

    .signature-area {
      width: 50%;
    }

    .sig-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }

    .totals-area {
      width: 45%;
    }

    table.totals-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      font-size: 11px;
      font-weight: bold;
    }

    table.totals-table td {
      padding: 7px 10px;
    }

    .footer-fixed {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10px;
      color: #111111;
      font-weight: bold;
      border-top: 1.5px solid #6b7280;
      padding: 6px 16px 8px 16px;
      background: #ffffff;
      z-index: 1000;
    }

    .arabic-footer {
      direction: rtl;
      font-family: 'Amiri', 'Traditional Arabic', serif;
      font-size: 11.5px;
      margin-bottom: 2px;
    }

    .english-footer {
      letter-spacing: 0.2px;
      font-size: 9.5px;
      margin-bottom: 2px;
    }

    .page-number-box {
      font-size: 9px;
      font-weight: 800;
      color: #334155;
      background: #f1f5f9;
      padding: 1px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      white-space: nowrap;
    }

    .page-number-box::after {
      content: "Page " counter(page) " of " counter(pages);
    }

    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding-bottom: 75px !important;
      }
      .footer-fixed {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }
  </style>
</head>
<body>

  <!-- Print Action Controls (Screen Only) -->
  <div class="no-print" style="background: #1e293b; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; color: #ffffff;">
    <div style="font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">📄</span>
      <span>RADIANT LIGHTNING Official PO Delivery Note / Invoice PDF</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
        <span>🖨️</span> Save PDF / Print Invoice
      </button>
      <button onclick="window.close()" style="background: #475569; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
        ✖ Close
      </button>
    </div>
  </div>

  <!-- HEADER (Same as attached image) -->
  <div class="header-container">
    <div class="brand-left">
      <h1 class="brand-title">RADIANT LIGHTNING</h1>
      <div class="brand-badge">Premium Food Supply</div>
    </div>
    <div class="logo-right">
      <div class="rl-logo-text">
        RL
        <svg class="rl-leaf-svg" viewBox="0 0 24 24" fill="#769d24">
          <path d="M17,8C15,4 10,4 10,4C10,4 10,9 14,11C15.6,11.8 17.5,11.5 19,10.5C20.5,9.5 21,7 21,7C21,7 19,7.5 17,8Z"/>
          <path d="M12,12C9,10 5,11 5,11C5,11 7,15 10,16C11.5,16.5 13.2,16 14.5,15C15.8,14 16,12 16,12C16,12 14,12.5 12,12Z"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- DOCUMENT TITLE -->
  <div class="doc-title">
    <h2>DELIVERY NOTE</h2>
  </div>

  <!-- METADATA BOXES (Same rounded style as attached image) -->
  <div class="meta-boxes">
    <!-- Left Box -->
    <div class="meta-box">
      <div class="company-title">COMPANY</div>
      <div class="company-name">${escapeHtml(companyName)}</div>
      <div class="company-arabic">${escapeHtml(companySubtext)}</div>
    </div>
    <!-- Right Box -->
    <div class="meta-box">
      <div class="dn-grid">
        <span>DN NUMBER</span><span>:</span><span>${escapeHtml(dnNumber)}</span>
        <span>DELIVERY DATE</span><span>:</span><span>${escapeHtml(deliveryDateStr)}</span>
        <span>PO NUMBER</span><span>:</span><span>${escapeHtml(poNumber)}</span>
        <span>DEPARTMENT</span><span>:</span><span>${escapeHtml(department)}</span>
        <span>LOCATION</span><span>:</span><span>${escapeHtml(location)}</span>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE (Exact columns matching image) -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50px;">
          <div>SL No.</div>
          <div style="font-size: 11px;">رقم</div>
        </th>
        <th style="width: 70px;">PO SEQ NO.</th>
        <th style="width: 95px;">SKU</th>
        <th style="text-align: left; padding-left: 8px; padding-right: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span>DESCRIPTION</span>
            <span style="font-size: 11px;">وصف</span>
          </div>
        </th>
        <th style="width: 65px;">
          <div>UOP</div>
          <div style="font-size: 11px;">وحدة</div>
        </th>
        <th style="width: 60px;">
          <div>QTY</div>
          <div style="font-size: 11px;">الكمية</div>
        </th>
        ${includePrices ? `
          <th style="width: 80px; text-align: right; padding-right: 6px;">UNIT PRICE</th>
          <th style="width: 90px; text-align: right; padding-right: 6px;">TOTAL</th>
        ` : ''}
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
  </table>

  <!-- BOTTOM SECTION (Signatures & Grand Totals) -->
  <div class="bottom-section" style="${!includePrices ? 'display: block;' : ''}">
    <!-- Signature Area -->
    <div class="signature-area" style="width: ${includePrices ? '50%' : '100%'};">
      <div class="sig-row">
        <span>RECIPIENT NAME :</span>
        <span style="border-bottom: 1.5px solid #000; padding-bottom: 2px; flex: 1; font-weight: 800; font-size: 12px; color: #1e3a8a;">
          ${escapeHtml(recipientName)}
        </span>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 8px;">
        <span>SIGNATURE :</span>
        <div style="flex: 1; min-height: 70px; border-bottom: 1.5px solid #000; position: relative; display: flex; align-items: flex-end;">
          ${signatureDataUrl ? `<img src="${signatureDataUrl}" style="max-height: 65px; max-width: 200px; object-fit: contain; margin-bottom: 2px;" />` : ''}
        </div>
      </div>
    </div>

    ${includePrices ? `
    <!-- Totals Table -->
    <div class="totals-area">
      <table class="totals-table">
        <tr style="border-bottom: 1px solid #000;">
          <td style="border-right: 1px solid #000; text-align: center; width: 50%;">SUB TOTAL</td>
          <td style="text-align: right;">${subTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-bottom: 1px solid #000;">
          <td style="border-right: 1px solid #000; text-align: center;">VAT 15 %</td>
          <td style="text-align: right;">${vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="border-right: 1px solid #000; text-align: center; font-size: 12px; font-weight: 900;">GRAND TOTAL</td>
          <td style="text-align: right; font-size: 12px; font-weight: 900;">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>
    ` : ''}
  </div>

  <!-- FOOTER (Fixed at absolute bottom of every page with Page X of Y) -->
  <div class="footer-fixed">
    <div class="arabic-footer">
      المملكة العربية السعودية - الرياض - ت: +٩٦٦ ٥٦ ٦٩٥ ٢٤٤٤ - +٩٦٦ ٥٠ ٤١١ ٣٥٧٦ - س.ت ١٠١٠٧٩٤٠٧٥
    </div>
    <div class="english-footer">
      Riyadh - Kingdom of Saudi Arabia Tel: +966 56 695 2444, +966 50 411 3576 - C.R 1010794075
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px;">
      <div style="flex: 1; text-align: center; color: #769d24; font-size: 10px; font-weight: bold; margin-left: 60px;">
        ✉ theradiantriyadh@gmail.com
      </div>
      <div class="page-number-box"></div>
    </div>
  </div>

</body>
</html>
  `;
}

export function printOfficialRLDeliveryNote(po: PurchaseOrder, options?: InvoiceOptions) {
  const printWin = window.open('', '_blank', 'width=1000,height=850');
  if (!printWin) {
    alert("Please allow popups to open and print the Official Delivery Note / PO Invoice.");
    return;
  }
  const html = generateOfficialRLDeliveryNoteHtml(po, options);
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

export interface DeliveryChallanOptions {
  challanNumber?: string;
  deliveryDate?: string;
  recipientName?: string;
  dispatchOfficer?: string;
  notes?: string;
  companyName?: string;
  companySubtext?: string;
  items?: POItem[];
}

export function generateOfficialDeliveryChallanNoPriceHtml(po: PurchaseOrder, options?: DeliveryChallanOptions): string {
  const recipientName = options?.recipientName || 'Authorized Receiver';
  const challanNumber = options?.challanNumber || `DC-${po.poNumber.replace(/^PO-?/i, '')}`;
  const deliveryDateStr = options?.deliveryDate || (po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  const dispatchOfficer = options?.dispatchOfficer || 'System Dispatch Officer';
  const companyName = options?.companyName || 'RL FOOD / C P P A';
  const companySubtext = options?.companySubtext || 'الشؤون الخاصة لسمو ولي العهد';

  const items = (options?.items && options.items.length > 0) ? options.items : (po.items || []);
  let totalDeliveredQtySum = 0;
  let totalOrderedQtySum = 0;

  const itemRowsHtml = items.map((item, idx) => {
    const ordered = item.requestedQty || item.orderedQty || 0;
    const delivered = item.passedQty ?? item.warehouseQty ?? item.purchasedQty ?? ordered;
    const damaged = item.damagedQty || 0;
    const backorder = Math.max(0, ordered - delivered);

    totalOrderedQtySum += ordered;
    totalDeliveredQtySum += delivered;

    const sku = item.sku || `SKU-${100 + idx}`;
    const uop = (item.unit || 'PCS').toUpperCase();

    return `
      <tr style="border-bottom: 1px solid #000; font-size: 11px; font-weight: bold; background-color: ${damaged > 0 ? '#fff1f2' : (idx % 2 === 0 ? '#ffffff' : '#fafafa')};">
        <td style="border: 1px solid #000; padding: 8px 4px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #000; padding: 8px 4px; text-align: center; font-family: monospace;">${escapeHtml(sku)}</td>
        <td style="border: 1px solid #000; padding: 8px 8px; text-align: left; text-transform: uppercase;">
          <div style="font-size: 11.5px; font-weight: 800; color: #000;">${escapeHtml(item.itemName)}</div>
          ${item.brand ? `<div style="color: #4b5563; font-size: 10px; font-weight: normal; margin-top: 2px;">Brand: ${escapeHtml(item.brand)}</div>` : ''}
          ${item.qcNotes ? `<div style="color: #b91c1c; font-size: 10px; font-weight: bold; margin-top: 2px;">QC Note: ${escapeHtml(item.qcNotes)}</div>` : ''}
        </td>
        <td style="border: 1px solid #000; padding: 8px 4px; text-align: center; font-weight: 800;">${escapeHtml(uop)}</td>
        <td style="border: 1px solid #000; padding: 8px 4px; text-align: center; font-weight: 800; color: #1e3a8a;">${ordered}</td>
        <td style="border: 1px solid #000; padding: 8px 4px; text-align: center; font-weight: 900; color: #15803d; font-size: 12px; background-color: #f0fdf4;">${delivered}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Delivery Challan (No Price) - ${po.poNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 20mm 10mm;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 16px 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .brand-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .brand-title {
      font-family: "Times New Roman", Times, serif;
      font-size: 32px;
      font-weight: 800;
      color: #111111;
      letter-spacing: 1.5px;
      margin: 0;
      line-height: 1;
    }

    .brand-badge {
      background-color: #769d24;
      color: #ffffff;
      padding: 3px 18px 4px 18px;
      border-radius: 4px;
      font-family: "Georgia", "Brush Script MT", cursive, serif;
      font-size: 16px;
      font-style: italic;
      display: inline-block;
      margin-top: 4px;
    }

    .logo-right {
      display: flex;
      align-items: center;
      position: relative;
    }

    .rl-logo-text {
      font-size: 56px;
      font-weight: 900;
      color: #2e382b;
      font-family: Arial, Helvetica, sans-serif;
      letter-spacing: -3px;
      line-height: 0.9;
      position: relative;
    }

    .rl-leaf-svg {
      position: absolute;
      top: -6px;
      right: -16px;
      width: 32px;
      height: 32px;
    }

    .watermark {
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.045;
      z-index: -10;
      pointer-events: none;
      text-align: center;
    }

    .watermark-text {
      font-size: 240px;
      font-weight: 900;
      color: #2e382b;
      font-family: Arial, Helvetica, sans-serif;
      position: relative;
      display: inline-block;
      letter-spacing: -10px;
    }

    .watermark-leaf {
      position: absolute;
      top: -20px;
      right: -60px;
      width: 130px;
      height: 130px;
    }

    .doc-banner {
      background-color: #0f172a;
      color: #ffffff;
      padding: 6px 16px;
      border-radius: 6px;
      text-align: center;
      margin-bottom: 16px;
    }

    .doc-banner h2 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin: 0;
      text-transform: uppercase;
    }

    .doc-banner p {
      font-size: 10px;
      margin: 2px 0 0 0;
      color: #94a3b8;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .meta-boxes {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .meta-box {
      flex: 1;
      border: 1.5px solid #000000;
      border-radius: 8px;
      padding: 10px 14px;
      background-color: #fafafa;
    }

    .meta-title {
      font-size: 10px;
      font-weight: 900;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 110px 10px 1fr;
      row-gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }

    table.items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 16px;
      border: 1.5px solid #000000;
    }

    table.items-table thead {
      display: table-header-group;
    }

    table.items-table tr {
      page-break-inside: avoid;
    }

    table.items-table th {
      background-color: #e2e8f0;
      color: #0f172a;
      border: 1px solid #000000;
      padding: 8px 4px;
      text-align: center;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
    }

    table.items-table tfoot td {
      background-color: #f1f5f9;
      border: 1.5px solid #000000;
      padding: 8px;
      font-weight: 900;
      font-size: 11px;
    }

    .footer-fixed {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9.5px;
      color: #0f172a;
      font-weight: 700;
      border-top: 1.5px solid #0f172a;
      padding: 6px 16px 8px 16px;
      background: #ffffff;
      z-index: 1000;
    }

    .page-number-box {
      font-size: 9px;
      font-weight: 800;
      color: #334155;
      background: #f1f5f9;
      padding: 1px 8px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
      white-space: nowrap;
    }

    .page-number-box::after {
      content: "Page " counter(page) " of " counter(pages);
    }

    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding-bottom: 75px !important;
      }
      .footer-fixed {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }
  </style>
</head>
<body>

  <!-- BACKGROUND WATERMARK (Exact RADIANT LIGHTNING Watermark) -->
  <div class="watermark">
    <div class="watermark-text">
      RL
      <svg class="watermark-leaf" viewBox="0 0 24 24" fill="#769d24">
        <path d="M17,8C15,4 10,4 10,4C10,4 10,9 14,11C15.6,11.8 17.5,11.5 19,10.5C20.5,9.5 21,7 21,7C21,7 19,7.5 17,8Z"/>
        <path d="M12,12C9,10 5,11 5,11C5,11 7,15 10,16C11.5,16.5 13.2,16 14.5,15C15.8,14 16,12 16,12C16,12 14,12.5 12,12Z"/>
      </svg>
    </div>
  </div>

  <!-- Screen Print Controls -->
  <div class="no-print" style="background: #0f172a; padding: 12px 20px; border-radius: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; color: #ffffff;">
    <div style="font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">🚚</span>
      <span>RL FOOD Official Delivery Challan (Quantity Only • No Prices)</span>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" style="background: #16a34a; color: #ffffff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
        <span>🖨️</span> Print / Save PDF Delivery Challan
      </button>
      <button onclick="window.close()" style="background: #475569; color: #ffffff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
        ✖ Close
      </button>
    </div>
  </div>

  <!-- OFFICIAL LETTERHEAD HEADER -->
  <div class="header-container">
    <div class="brand-left">
      <h1 class="brand-title">RADIANT LIGHTNING</h1>
      <div class="brand-badge">Premium Food Supply</div>
    </div>
    <div class="logo-right">
      <div class="rl-logo-text">
        RL
        <svg class="rl-leaf-svg" viewBox="0 0 24 24" fill="#769d24">
          <path d="M17,8C15,4 10,4 10,4C10,4 10,9 14,11C15.6,11.8 17.5,11.5 19,10.5C20.5,9.5 21,7 21,7C21,7 19,7.5 17,8Z"/>
          <path d="M12,12C9,10 5,11 5,11C5,11 7,15 10,16C11.5,16.5 13.2,16 14.5,15C15.8,14 16,12 16,12C16,12 14,12.5 12,12Z"/>
        </svg>
      </div>
    </div>
  </div>

  <!-- DOCUMENT BANNER -->
  <div class="doc-banner">
    <h2>OFFICIAL DELIVERY CHALLAN (مذكرة تسليم البضاعة)</h2>
    <p>QUANTITY VERIFICATION ONLY • STRICTLY NO FINANCIAL AMOUNTS / PRICE INCLUDED</p>
  </div>

  <!-- METADATA BOXES -->
  <div class="meta-boxes">
    <!-- Left Box: Client / Consignee Details -->
    <div class="meta-box">
      <div class="meta-title">CONSIGNEE / DELIVER TO (الجهة المستلمة)</div>
      <div class="info-grid">
        <span>COMPANY / DEPT</span><span>:</span><span>${escapeHtml(companyName)}</span>
        <span>LOCATION</span><span>:</span><span>${escapeHtml(po.location || 'Central Warehouse')}</span>
        <span>DEPARTMENT</span><span>:</span><span>${escapeHtml(po.department || 'General Operations')}</span>
        <span>RECIPIENT NAME</span><span>:</span><span>${escapeHtml(recipientName)}</span>
      </div>
    </div>

    <!-- Right Box: Dispatch Info -->
    <div class="meta-box">
      <div class="meta-title">CHALLAN & DISPATCH INFO (بيانات التسليم)</div>
      <div class="info-grid">
        <span>CHALLAN NO</span><span>:</span><span style="font-family: monospace; font-weight: 900; color: #2563eb;">${escapeHtml(challanNumber)}</span>
        <span>PO NUMBER</span><span>:</span><span style="font-family: monospace;">${escapeHtml(po.poNumber)}</span>
        <span>DELIVERY DATE</span><span>:</span><span>${escapeHtml(deliveryDateStr)}</span>
        <span>DISPATCH OFFICER</span><span>:</span><span>${escapeHtml(dispatchOfficer)}</span>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE (STRICTLY NO PRICE COLUMNS) -->
  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 45px;">SL<br/><span style="font-size: 9px;">رقم</span></th>
        <th style="width: 110px;">SKU / CODE</th>
        <th style="text-align: left; padding-left: 8px;">ITEM DESCRIPTION & SPECIFICATION<br/><span style="font-size: 9px;">وصف البضاعة والمواصفات</span></th>
        <th style="width: 70px;">UNIT<br/><span style="font-size: 9px;">الوحدة</span></th>
        <th style="width: 85px;">ORDERED<br/><span style="font-size: 9px;">المطلوب</span></th>
        <th style="width: 95px;">DELIVERED<br/><span style="font-size: 9px;">المسلم</span></th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align: right; padding-right: 12px; font-weight: 900;">TOTAL SUMMARY QUANTITIES:</td>
        <td style="text-align: center; color: #1e3a8a; font-weight: 800;">${totalOrderedQtySum}</td>
        <td style="text-align: center; color: #15803d; font-size: 13px; font-weight: 900; background-color: #dcfce7;">${totalDeliveredQtySum}</td>
      </tr>
    </tfoot>
  </table>

  ${options?.notes ? `
    <div style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 24px;">
      <strong>SPECIAL DELIVERY INSTRUCTIONS / NOTES:</strong> ${escapeHtml(options.notes)}
    </div>
  ` : ''}

  <!-- SIGNATURE ACKNOWLEDGEMENT BLOCK -->
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; margin-bottom: 24px; page-break-inside: avoid;">
    <div style="width: 48%; border: 1.5px solid #0f172a; border-radius: 6px; padding: 10px 12px; background: #fafafa;">
      <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">DISPATCH OFFICER (اسم مسؤول التسليم)</div>
      <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 18px;">${escapeHtml(dispatchOfficer)}</div>
      <div style="border-top: 1px dashed #64748b; padding-top: 4px; font-size: 9.5px; color: #64748b; font-weight: 700;">Authorized Signature & Stamp:</div>
    </div>
    
    <div style="width: 48%; border: 1.5px solid #0f172a; border-radius: 6px; padding: 10px 12px; background: #fafafa;">
      <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">RECIPIENT ACKNOWLEDGEMENT (استلام البضاعة)</div>
      <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 18px;">Recipient: ${escapeHtml(recipientName)}</div>
      <div style="border-top: 1px dashed #64748b; padding-top: 4px; font-size: 9.5px; color: #64748b; font-weight: 700;">Received Signature & Date:</div>
    </div>
  </div>

  <!-- FIXED FOOTER (Fixed at absolute bottom of every page with Page X of Y) -->
  <div class="footer-fixed">
    <div style="direction: rtl; font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 11.5px; margin-bottom: 2px;">
      المملكة العربية السعودية - الرياض - ت: +٩٦٦ ٥٦ ٦٩٥ ٢٤٤٤ - +٩٦٦ ٥٠ ٤١١ ٣٥٧٦ - س.ت ١٠١٠٧٩٤٠٧٥
    </div>
    <div style="font-size: 9.5px; margin-bottom: 2px;">
      Riyadh - Kingdom of Saudi Arabia Tel: +966 56 695 2444, +966 50 411 3576 - C.R 1010794075
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px;">
      <div style="flex: 1; text-align: center; color: #769d24; font-size: 10px; font-weight: bold; margin-left: 60px;">
        ✉ theradiantriyadh@gmail.com
      </div>
      <div class="page-number-box"></div>
    </div>
  </div>

</body>
</html>
  `;
}

export function printOfficialDeliveryChallanNoPrice(po: PurchaseOrder, options?: DeliveryChallanOptions) {
  const printWin = window.open('', '_blank', 'width=1000,height=850');
  if (!printWin) {
    alert("Please allow popups to open and print the Official Delivery Challan.");
    return;
  }
  const html = generateOfficialDeliveryChallanNoPriceHtml(po, options);
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
