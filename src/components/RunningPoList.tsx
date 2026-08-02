import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, getNormalizedItemStatus } from '../types';
import { notifySinglePOReport } from '../services/telegramService';
import { OfficialPdfInvoiceModal } from './OfficialPdfInvoiceModal';
import { DeliveryChallanModal } from './dispatch/DeliveryChallanModal';
import { printOfficialRLDeliveryNote } from '../services/officialPdfService';
import { 
  Layers, FileSpreadsheet, Printer, Search, Eye, X, Lock, Unlock, CheckCircle2, AlertCircle, Send, Trash2
} from 'lucide-react';

interface RunningPoListProps {
  pos: PurchaseOrder[];
  title?: string;
  className?: string;
  allowDelete?: boolean;
  allowStatusChange?: boolean;
  onDeletePO?: (poNumber: string) => void;
  onDeletePo?: (poNumber: string) => void;
  onClearAllPOs?: () => void;
  onSelectPo?: (po: PurchaseOrder) => void;
  onHoldPO?: (poNumber: string) => void;
  onReleasePO?: (poNumber: string) => void;
  onUpdatePoStatus?: (poNumber: string, status: string) => void;
  onBulkUpdatePoStatus?: (poNumbers: string[], status: string) => void;
  onBulkDeletePOs?: (poNumbers: string[]) => void;
}

export const RunningPoList: React.FC<RunningPoListProps> = ({ 
  pos, 
  title = "Purchase Orders Management (All & Active Orders)",
  className = "",
  allowDelete = false,
  allowStatusChange = false,
  onDeletePO,
  onDeletePo,
  onClearAllPOs,
  onSelectPo,
  onHoldPO,
  onReleasePO,
  onUpdatePoStatus,
  onBulkUpdatePoStatus,
  onBulkDeletePOs
}) => {
  // Running PO List Filter States
  const [runningPoSearch, setRunningPoSearch] = useState<string>('');
  const [runningPoItemSearch, setRunningPoItemSearch] = useState<string>('');
  const [runningPoDeptFilter, setRunningPoDeptFilter] = useState<string>('ALL');
  const [runningPoLocFilter, setRunningPoLocFilter] = useState<string>('ALL');
  const [runningPoStatusFilter, setRunningPoStatusFilter] = useState<string>('ACTIVE');

  // Bulk selection states
  const [selectedPoNumbers, setSelectedPoNumbers] = useState<Set<string>>(new Set());
  const [bulkStatusSelectValue, setBulkStatusSelectValue] = useState<string>('');

  // Selected PO Modal for detailed report view
  const [selectedPoForDetail, setSelectedPoForDetail] = useState<PurchaseOrder | null>(null);
  const [pdfModalPo, setPdfModalPo] = useState<PurchaseOrder | null>(null);
  const [challanModalPo, setChallanModalPo] = useState<PurchaseOrder | null>(null);
  const [sendingPoNumber, setSendingPoNumber] = useState<string | null>(null);

  // Delete Modals State
  const [poToDelete, setPoToDelete] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);

  const handleSendSinglePoTelegram = async (po: PurchaseOrder) => {
    setSendingPoNumber(po.poNumber);
    const res = await notifySinglePOReport(po, 'Admin User');
    setSendingPoNumber(null);

    if (res && res.success) {
      alert(`✅ PO #${po.poNumber} report posted to Telegram group!`);
    } else {
      alert(res?.error || `Failed to send PO #${po.poNumber} report to Telegram.`);
    }
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPoForDetail) {
        setSelectedPoForDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPoForDetail]);

  // Unique departments
  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    pos.forEach(p => {
      if (p.department?.trim()) depts.add(p.department.trim());
    });
    return Array.from(depts).sort();
  }, [pos]);

  // Unique locations
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    pos.forEach(p => {
      if (p.location?.trim()) locs.add(p.location.trim());
    });
    return Array.from(locs).sort();
  }, [pos]);

  // Filtered Running POs calculation
  const filteredRunningPOs = useMemo(() => {
    return pos.filter(po => {
      // Status filter
      if (runningPoStatusFilter === 'ACTIVE') {
        if (po.purchaseStatus === 'Completed') return false;
      } else if (runningPoStatusFilter === 'Held') {
        if (!po.isHeldByAdmin && po.purchaseStatus !== 'Held' && !(po.items || []).some(i => getNormalizedItemStatus(i) === 'Held')) return false;
      } else if (runningPoStatusFilter !== 'ALL') {
        if (po.purchaseStatus !== runningPoStatusFilter) return false;
      }

      // Department Filter
      if (runningPoDeptFilter !== 'ALL' && (po.department || 'General') !== runningPoDeptFilter) {
        return false;
      }

      // Location Filter
      if (runningPoLocFilter !== 'ALL' && (po.location || 'Central Warehouse') !== runningPoLocFilter) {
        return false;
      }

      // PO Search
      if (runningPoSearch.trim()) {
        const q = runningPoSearch.toLowerCase().trim();
        if (!po.poNumber.toLowerCase().includes(q)) return false;
      }

      // Item Name Search
      if (runningPoItemSearch.trim()) {
        const iq = runningPoItemSearch.toLowerCase().trim();
        const hasItemMatch = (po.items || []).some(item => 
          (item.itemName || '').toLowerCase().includes(iq) ||
          (item.brand || '').toLowerCase().includes(iq)
        );
        if (!hasItemMatch) return false;
      }

      return true;
    });
  }, [pos, runningPoStatusFilter, runningPoDeptFilter, runningPoLocFilter, runningPoSearch, runningPoItemSearch]);

  // Selected POs derived state (respecting active filters)
  const selectedPOs = useMemo(() => {
    return filteredRunningPOs.filter(po => selectedPoNumbers.has(po.poNumber));
  }, [filteredRunningPOs, selectedPoNumbers]);

  const isAllFilteredSelected = useMemo(() => {
    return filteredRunningPOs.length > 0 && filteredRunningPOs.every(po => selectedPoNumbers.has(po.poNumber));
  }, [filteredRunningPOs, selectedPoNumbers]);

  const handleSelectAll = () => {
    const next = new Set(selectedPoNumbers);
    if (isAllFilteredSelected) {
      filteredRunningPOs.forEach(po => next.delete(po.poNumber));
    } else {
      filteredRunningPOs.forEach(po => next.add(po.poNumber));
    }
    setSelectedPoNumbers(next);
  };

  const handleToggleSelectPo = (poNumber: string) => {
    const next = new Set(selectedPoNumbers);
    if (next.has(poNumber)) {
      next.delete(poNumber);
    } else {
      next.add(poNumber);
    }
    setSelectedPoNumbers(next);
  };

  const handleBulkStatusChange = (newStatus: string) => {
    if (!newStatus || selectedPOs.length === 0) return;

    const poNumbers = selectedPOs.map(p => p.poNumber);

    if (onBulkUpdatePoStatus) {
      onBulkUpdatePoStatus(poNumbers, newStatus);
    } else if (onUpdatePoStatus) {
      poNumbers.forEach(poNum => onUpdatePoStatus(poNum, newStatus));
    } else {
      // Local loop update over selected items
      selectedPOs.forEach(po => {
        po.purchaseStatus = newStatus as any;
        if (po.items && Array.isArray(po.items)) {
          po.items.forEach(item => {
            if (newStatus === 'Completed') {
              item.purchaseStatus = 'Purchased';
            } else if (newStatus === 'Pending') {
              item.purchaseStatus = 'Pending';
            } else if (newStatus === 'Held') {
              item.purchaseStatus = 'Held';
            } else if (newStatus === 'Partial') {
              item.purchaseStatus = 'Partial Purchased';
            }
          });
        }
      });
      window.dispatchEvent(new CustomEvent('po_data_updated', { detail: pos }));
    }

    // Clear selection after action completes
    setSelectedPoNumbers(new Set());
    setBulkStatusSelectValue('');
  };

  const handleBulkDelete = () => {
    if (selectedPOs.length === 0) return;

    const poNumbers = selectedPOs.map(p => p.poNumber);
    const deleteHandler = onDeletePO || onDeletePo;

    const confirmMsg = `Are you sure you want to delete ${selectedPOs.length} selected Purchase Order(s)?\n\nPO Numbers: ${poNumbers.slice(0, 5).join(', ')}${poNumbers.length > 5 ? '...' : ''}\n\nThis action cannot be undone.`;

    if (window.confirm(confirmMsg)) {
      if (onBulkDeletePOs) {
        onBulkDeletePOs(poNumbers);
      } else if (deleteHandler) {
        poNumbers.forEach(poNum => deleteHandler(poNum));
      } else {
        const remainingPOs = pos.filter(p => !poNumbers.includes(p.poNumber));
        window.dispatchEvent(new CustomEvent('po_data_updated', { detail: remainingPOs }));
      }
      // Clear selection after action completes
      setSelectedPoNumbers(new Set());
    }
  };

  // Excel (CSV) Export
  const exportRunningPOsToCSV = (targetPOs?: PurchaseOrder[]) => {
    const listToExport = targetPOs || filteredRunningPOs;
    if (listToExport.length === 0) return;

    const headers = [
      "PO Number",
      "Order Date",
      "Location",
      "Department",
      "Status",
      "Total Items",
      "Purchased Items",
      "Pending Items",
      "Hold Items",
      "Progress %",
      "Item Details"
    ];

    const rows = listToExport.map(po => {
      const items = po.items || [];
      const total = items.length;
      const purchased = items.filter(i => i.purchaseStatus === 'Purchased').length;
      const pending = items.filter(i => i.purchaseStatus === 'Pending' || !i.purchaseStatus).length;
      const held = items.filter(i => i.purchaseStatus === 'Held' || i.purchaseStatus === 'Hold').length;
      const progress = total > 0 ? Math.round((purchased / total) * 100) : 0;

      const itemDetailsStr = items.map(i => `${i.itemName} (${i.purchaseStatus || 'Pending'})`).join('; ');

      return [
        `"${po.poNumber || ''}"`,
        `"${po.orderDate || po.createdAt || ''}"`,
        `"${(po.location || 'Central Warehouse').replace(/"/g, '""')}"`,
        `"${(po.department || 'General').replace(/"/g, '""')}"`,
        `"${po.purchaseStatus || 'Pending'}"`,
        `"${total}"`,
        `"${purchased}"`,
        `"${pending}"`,
        `"${held}"`,
        `"${progress}%"`,
        `"${itemDetailsStr.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Running_POs_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export for Filtered Running POs
  const exportRunningPOsToPDF = (targetPOs?: PurchaseOrder[]) => {
    const listToExport = targetPOs || filteredRunningPOs;
    if (listToExport.length === 0) return;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert("Please allow popups to generate PDF/Print report.");
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const activeFiltersText = [
      runningPoStatusFilter !== 'ACTIVE' ? `Status: ${runningPoStatusFilter}` : 'Status: Active Running POs',
      runningPoLocFilter !== 'ALL' ? `Location: ${runningPoLocFilter}` : '',
      runningPoDeptFilter !== 'ALL' ? `Dept: ${runningPoDeptFilter}` : '',
      runningPoSearch ? `PO Search: "${runningPoSearch}"` : '',
      runningPoItemSearch ? `Item Search: "${runningPoItemSearch}"` : ''
    ].filter(Boolean).join(' | ');

    const poCardsHtml = filteredRunningPOs.map((po) => {
      const items = po.items || [];
      const total = items.length;
      const purchased = items.filter(i => i.purchaseStatus === 'Purchased').length;
      const progress = total > 0 ? Math.round((purchased / total) * 100) : 0;
      const st = (po.purchaseStatus || 'Pending').toLowerCase();

      const itemRowsHtml = items.map((item, itemIdx) => {
        const req = item.requestedQty || item.orderedQty || 0;
        const pur = item.purchasedQty || 0;
        const status = item.purchaseStatus || 'Pending';
        const statusClass = status.toLowerCase();

        return `
          <tr class="item-tr" style="background-color: ${itemIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="text-align: center; font-weight: bold; color: #64748b; padding: 6px;">${item.slNumber || itemIdx + 1}</td>
            <td style="font-weight: 600; color: #0f172a; padding: 6px;">${item.itemName}</td>
            <td style="color: #64748b; padding: 6px;">${item.brand || item.category || '-'}</td>
            <td style="text-align: center; font-weight: 600; padding: 6px;">${req} ${item.unit || 'pcs'}</td>
            <td style="text-align: center; font-weight: 600; color: ${pur > 0 ? '#15803d' : '#64748b'}; padding: 6px;">${pur} ${item.unit || 'pcs'}</td>
            <td style="text-align: center; padding: 6px;">
              <span class="status-badge status-${statusClass}">${status}</span>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="po-card">
          <div class="po-header">
            <div>
              <span class="po-number">${po.poNumber}</span>
              <span class="po-meta">📍 ${po.location || 'Central Warehouse'} &nbsp;|&nbsp; 🏢 ${po.department || 'General'}</span>
            </div>
            <div>
              <span class="po-badge badge-${st}">
                ${po.purchaseStatus || 'Pending'} (${purchased}/${total} Purchased - ${progress}%)
              </span>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">SL</th>
                <th>Item Name</th>
                <th style="width: 18%;">Brand / Category</th>
                <th style="width: 14%; text-align: center;">Requested Qty</th>
                <th style="width: 14%; text-align: center;">Purchased Qty</th>
                <th style="width: 16%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${itemRowsHtml || '<tr><td colspan="6" style="padding: 12px; text-align: center; color: #94a3b8;">No items in this PO</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Running PO Report - ${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.4;
          }
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .title { font-size: 18px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.3px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .filters {
            background: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            margin-bottom: 16px;
            border-left: 4px solid #2563eb;
            color: #334155;
          }
          .po-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            margin-bottom: 20px;
            background: #ffffff;
            overflow: hidden;
            page-break-inside: auto;
            break-inside: auto;
          }
          .po-header {
            background: #f8fafc;
            border-bottom: 1px solid #cbd5e1;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .po-number {
            font-size: 13px;
            font-weight: 800;
            color: #1e40af;
            font-family: monospace;
          }
          .po-meta {
            font-size: 11px;
            color: #475569;
            margin-left: 8px;
          }
          .po-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
          }
          .badge-completed { background: #dcfce7; color: #166534; }
          .badge-partial { background: #dbeafe; color: #1e40af; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          .badge-held { background: #f3e8ff; color: #6b21a8; }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .items-table th {
            background: #1e293b;
            color: #ffffff;
            padding: 6px 8px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            text-align: left;
          }
          .items-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
          }
          .status-purchased { background: #dcfce7; color: #166534; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-held, .status-hold { background: #f3e8ff; color: #6b21a8; }
          .item-tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          @media print {
            body { padding: 0 !important; }
            .no-print { display: none !important; }
            .item-tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 8px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer;">
            🖨️ Print / Save PDF
          </button>
          <button onclick="window.close()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 12px; cursor: pointer;">
            ✖ Close Window
          </button>
        </div>

        <div class="report-header">
          <div>
            <div class="title">Running Purchase Orders (Active Report)</div>
            <div class="subtitle">Material Requirements & Dispatch Tracking System</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: bold; color: #1e3a8a;">Total Running POs: ${filteredRunningPOs.length}</div>
            <div style="font-size: 10px; color: #64748b;">Generated: ${todayStr}</div>
          </div>
        </div>

        ${activeFiltersText ? `<div class="filters">🔍 Active Filters: <strong>${activeFiltersText}</strong></div>` : ''}

        ${poCardsHtml || '<p style="text-align: center; color: #94a3b8; padding: 40px;">No running purchase orders match the selected criteria.</p>'}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Export single PO details to printable official RADIANT LIGHTNING Delivery Note / PDF
  const handlePrintPoReport = (po: PurchaseOrder) => {
    printOfficialRLDeliveryNote(po, {
      recipientName: 'CPPA Authorized Receiver',
      companyName: 'C P P A',
      companySubtext: 'الشؤون الخاصة لسمو ولي العهد'
    });
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3 flex flex-col justify-between ${className}`}>
      <div>
        {/* Header & Export Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              {title}
            </h3>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
              {filteredRunningPOs.length} Active
            </span>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={exportRunningPOsToCSV}
              disabled={filteredRunningPOs.length === 0}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
              title="Export Running POs report to Excel (CSV)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Export</span>
            </button>
            <button
              type="button"
              onClick={exportRunningPOsToPDF}
              disabled={filteredRunningPOs.length === 0}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
              title="Export Running POs report as PDF / Print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF Export</span>
            </button>
            {allowDelete && onClearAllPOs && pos.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="Delete all purchase orders"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Options: PO Number, Item Name, Department, Location, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-2">
          {/* PO Number Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={runningPoSearch}
              onChange={(e) => setRunningPoSearch(e.target.value)}
              placeholder="PO Number..."
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Item Name Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={runningPoItemSearch}
              onChange={(e) => setRunningPoItemSearch(e.target.value)}
              placeholder="Item Name..."
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Department Filter */}
          <select
            value={runningPoDeptFilter}
            onChange={(e) => setRunningPoDeptFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Depts</option>
            {uniqueDepartments.map((d, idx) => (
              <option key={`${d}-${idx}`} value={d}>{d}</option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={runningPoLocFilter}
            onChange={(e) => setRunningPoLocFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Locations</option>
            {uniqueLocations.map((l, idx) => (
              <option key={`${l}-${idx}`} value={l}>{l}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={runningPoStatusFilter}
            onChange={(e) => setRunningPoStatusFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ACTIVE">⚡ Active POs</option>
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Only</option>
            <option value="Partial">Partial Only</option>
            <option value="Completed">Completed Only</option>
          </select>
        </div>

        {/* Conditional Bulk Actions Bar */}
        {selectedPOs.length > 0 && (
          <div className="bg-slate-900 text-white rounded-xl p-2.5 sm:px-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-md mt-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold rounded-lg text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{selectedPOs.length} selected</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedPoNumbers(new Set())}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Hold / Release Selected POs Action */}
              {onHoldPO && selectedPOs.some(p => !p.isHeldByAdmin && p.purchaseStatus !== 'Held') && (
                <button
                  type="button"
                  onClick={() => {
                    selectedPOs.filter(p => !p.isHeldByAdmin && p.purchaseStatus !== 'Held').forEach(po => onHoldPO(po.poNumber));
                    setSelectedPoNumbers(new Set());
                  }}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                  title="Hold selected POs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Hold Selected</span>
                </button>
              )}

              {onReleasePO && selectedPOs.some(p => p.isHeldByAdmin || p.purchaseStatus === 'Held') && (
                <button
                  type="button"
                  onClick={() => {
                    selectedPOs.filter(p => p.isHeldByAdmin || p.purchaseStatus === 'Held').forEach(po => onReleasePO(po.poNumber));
                    setSelectedPoNumbers(new Set());
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                  title="Release selected PO holds"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Release Hold Selected</span>
                </button>
              )}

              {/* Export Options */}
              <button
                type="button"
                onClick={() => {
                  exportRunningPOsToCSV(selectedPOs);
                  setSelectedPoNumbers(new Set());
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                title="Export selected POs to Excel (CSV)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel ({selectedPOs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportRunningPOsToPDF(selectedPOs);
                  setSelectedPoNumbers(new Set());
                }}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                title="Export selected POs to PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export PDF ({selectedPOs.length})</span>
              </button>

              {/* Bulk Delete */}
              {allowDelete && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                  title="Delete selected POs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedPOs.length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Running PO Table */}
        {filteredRunningPOs.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-slate-400 text-xs">No running POs match your selected filters.</p>
            {(runningPoSearch || runningPoItemSearch || runningPoDeptFilter !== 'ALL' || runningPoLocFilter !== 'ALL' || runningPoStatusFilter !== 'ACTIVE') && (
              <button
                type="button"
                onClick={() => {
                  setRunningPoSearch('');
                  setRunningPoItemSearch('');
                  setRunningPoDeptFilter('ALL');
                  setRunningPoLocFilter('ALL');
                  setRunningPoStatusFilter('ACTIVE');
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto mt-3 max-h-[550px] overflow-y-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[9px] sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="p-2 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5 accent-blue-600"
                      title={isAllFilteredSelected ? "Deselect all filtered POs" : "Select all filtered POs"}
                    />
                  </th>
                  <th className="p-2">PO Number</th>
                  <th className="p-2">Department</th>
                  <th className="p-2">Location</th>
                  <th className="p-2 text-center">Progress</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRunningPOs.map((po, idx) => {
                  const totalItems = po.items ? po.items.length : 0;
                  const purchasedCount = (po.items || []).filter(i => i.purchaseStatus === 'Purchased').length;
                  const percent = totalItems > 0 ? Math.round((purchasedCount / totalItems) * 100) : 0;
                  const isSelected = selectedPoNumbers.has(po.poNumber);

                  return (
                    <tr 
                      key={po.id ? `${po.id}-${idx}` : `rpo-${idx}`} 
                      className={`hover:bg-blue-50/50 transition cursor-pointer ${isSelected ? 'bg-blue-50/70' : ''}`} 
                      onClick={() => {
                        if (onSelectPo) onSelectPo(po);
                        setSelectedPoForDetail(po);
                      }}
                    >
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectPo(po.poNumber)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5 accent-blue-600"
                        />
                      </td>
                      <td className="p-2 font-mono font-bold text-blue-700">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPoForDetail(po);
                          }}
                          className="hover:underline flex items-center gap-1 group text-left cursor-pointer"
                          title="Click to view detailed PO Details & Dispatch Report"
                        >
                          <span>{po.poNumber}</span>
                          <Eye className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </td>
                      <td className="p-2 text-slate-700">{po.department || 'General'}</td>
                      <td className="p-2 text-slate-700">{po.location || 'Central Warehouse'}</td>
                      <td className="p-2">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-bold text-slate-700">
                            {purchasedCount}/{totalItems} <span className="text-slate-400 font-normal">({percent}%)</span>
                          </span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full transition-all duration-300 ${
                                percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-blue-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          po.purchaseStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          po.purchaseStatus === 'Partial' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          <span>{po.purchaseStatus || 'Pending'}</span>
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendSinglePoTelegram(po);
                            }}
                            disabled={sendingPoNumber === po.poNumber}
                            className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Send this PO Report directly to Telegram"
                          >
                            <Send className={`w-3 h-3 ${sendingPoNumber === po.poNumber ? 'animate-pulse' : ''}`} />
                            <span>Telegram</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPoForDetail(po);
                            }}
                            className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="View full PO details & print report"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Report</span>
                          </button>
                          {(po.isHeldByAdmin || po.purchaseStatus === 'Held' || (po.items || []).some(i => i.purchaseStatus === 'Held')) ? (
                            onReleasePO && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReleasePO(po.poNumber);
                                }}
                                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Release PO Hold"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Release Hold</span>
                              </button>
                            )
                          ) : (
                            onHoldPO && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onHoldPO(po.poNumber);
                                }}
                                className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Hold PO"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Hold</span>
                              </button>
                            )
                          )}
                          {allowDelete && (onDeletePO || onDeletePo) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPoToDelete(po.poNumber);
                              }}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Delete PO"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED PO REPORT MODAL */}
      {selectedPoForDetail && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPoForDetail(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base tracking-tight font-mono text-blue-300">
                      PO #{selectedPoForDetail.poNumber}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      selectedPoForDetail.purchaseStatus === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      selectedPoForDetail.purchaseStatus === 'Partial' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {selectedPoForDetail.purchaseStatus || 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    📍 Location: <span className="text-slate-200 font-medium">{selectedPoForDetail.location || 'Central Warehouse'}</span> • 🏢 Dept: <span className="text-slate-200 font-medium">{selectedPoForDetail.department || 'General'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendSinglePoTelegram(selectedPoForDetail)}
                  disabled={sendingPoNumber === selectedPoForDetail.poNumber}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                  title="Send this PO report summary directly to Telegram"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingPoNumber === selectedPoForDetail.poNumber ? 'animate-pulse' : ''}`} />
                  <span>{sendingPoNumber === selectedPoForDetail.poNumber ? 'Sending...' : 'Send Telegram'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPoForDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              
              {/* Summary Metrics */}
              {(() => {
                const items = selectedPoForDetail.items || [];
                const totalItems = items.length;
                const purchasedCount = items.filter(i => (i.purchasedQty || 0) > 0 || i.purchaseStatus === 'Purchased').length;
                const receivedCount = items.filter(i => (i.warehouseQty || 0) > 0).length;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-[9px] font-bold uppercase text-blue-600">Total Items</span>
                      <p className="text-lg font-black text-blue-900">{totalItems}</p>
                    </div>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <span className="text-[9px] font-bold uppercase text-indigo-600">Purchased Items</span>
                      <p className="text-lg font-black text-indigo-900">{purchasedCount}</p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[9px] font-bold uppercase text-emerald-600">Warehouse Received</span>
                      <p className="text-lg font-black text-emerald-900">{receivedCount}</p>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[9px] font-bold uppercase text-amber-600">Pending Receive</span>
                      <p className="text-lg font-black text-amber-900">{totalItems - receivedCount}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Items Breakdown Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Line Items Detailed Breakdown ({selectedPoForDetail.items?.length || 0})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Dispatch & Receive Status</span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">Brand</th>
                        <th className="p-2.5 text-center">Requested</th>
                        <th className="p-2.5 text-center">Purchased</th>
                        <th className="p-2.5 text-center">Received</th>
                        <th className="p-2.5 text-center">Remaining</th>
                        <th className="p-2.5 text-center">Purchase Status</th>
                        <th className="p-2.5 text-center">Receive Status</th>
                        <th className="p-2.5">Notes / Hold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(selectedPoForDetail.items || []).map((item, idx) => {
                        const req = item.requestedQty || item.orderedQty || 0;
                        const pur = item.purchasedQty || 0;
                        const rec = item.warehouseQty || 0;
                        const rem = Math.max(0, req - rec);

                        return (
                          <tr key={item.id ? `${item.id}-${idx}` : `poitem-${idx}`} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 text-center font-mono font-bold text-slate-500">{item.slNumber || idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{item.itemName}</td>
                            <td className="p-2.5 text-slate-600">{item.brand || 'N/A'}</td>
                            <td className="p-2.5 text-center font-bold text-slate-800">{req} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center font-bold text-blue-700">{pur} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-700">{rec} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center font-bold text-amber-700">{rem} {item.unit || 'pcs'}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.purchaseStatus === 'Purchased' ? 'bg-emerald-100 text-emerald-800' :
                                item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' ? 'bg-purple-100 text-purple-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' ? 'Hold' : (item.purchaseStatus || 'Pending')}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec >= req && req > 0 ? 'bg-purple-100 text-purple-800' :
                                rec > 0 ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {rec >= req && req > 0 ? 'Ready/Received' : rec > 0 ? 'Partial Rec' : 'Pending Rec'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              {item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' ? (
                                <span className="text-purple-700 font-bold">🔒 Hold: {item.holdBy || item.holdByName || 'Admin'}</span>
                              ) : (
                                item.notes || '-'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">
                Created: {selectedPoForDetail.orderDate || selectedPoForDetail.createdAt || 'N/A'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChallanModalPo(selectedPoForDetail)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Official Delivery Challan (Quantity Only, No Price)"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Delivery Challan (No Price)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfModalPo(selectedPoForDetail)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Official RADIANT LIGHTNING Delivery Note & Digital Signature Generator"
                >
                  <span>✍️</span>
                  <span>Official PDF Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintPoReport(selectedPoForDetail)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPoForDetail(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition active:scale-95 shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official RADIANT LIGHTNING Delivery Note & Digital Signature Modal */}
      {pdfModalPo && (
        <OfficialPdfInvoiceModal
          po={pdfModalPo}
          onClose={() => setPdfModalPo(null)}
        />
      )}

      {/* Official Delivery Challan (No Price) Modal */}
      {challanModalPo && (
        <DeliveryChallanModal
          po={challanModalPo}
          onClose={() => setChallanModalPo(null)}
        />
      )}

      {/* Delete Single PO Modal */}
      {poToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Delete Purchase Order</h3>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900 font-mono">PO #{poToDelete}</strong>? This action will remove all line items and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPoToDelete(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const handler = onDeletePO || onDeletePo;
                  if (handler && poToDelete) handler(poToDelete);
                  setPoToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All POs Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">Clear All Purchase Orders</h3>
            </div>
            <p className="text-xs text-slate-600">
              Warning! This will permanently delete <strong>ALL ({pos.length}) purchase orders</strong> from the system database. This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllPOs) onClearAllPOs();
                  setShowClearAllModal(false);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Confirm Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
