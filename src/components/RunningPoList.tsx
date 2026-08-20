import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, getNormalizedItemStatus } from '../types';
import { notifySinglePOReport } from '../services/telegramService';
import { printPurchaseOrderReport } from '../services/officialPdfService';
import { DepartmentPieChart } from './admin/DepartmentPieChart';
import { 
  Layers, FileSpreadsheet, Printer, Search, Eye, X, Lock, Unlock, CheckCircle2, AlertCircle, Send, Trash2,
  LayoutGrid, List, MapPin, Building2, Clock, RotateCw, Sparkles, ShoppingBag, PieChart, ChevronDown, ChevronUp
} from 'lucide-react';

interface RunningPoListProps {
  pos: PurchaseOrder[];
  title?: string;
  className?: string;
  allowDelete?: boolean;
  allowStatusChange?: boolean;
  allowDeptChart?: boolean;
  showHeader?: boolean;
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

const getDeptBadgeClass = (deptName?: string) => {
  const d = (deptName || '').toLowerCase();
  if (d.includes('food') || d.includes('beverage') || d.includes('kitchen') || d.includes('bakery')) {
    return 'bg-amber-100/90 text-amber-900 border-amber-200/90';
  }
  if (d.includes('fruit') || d.includes('veg') || d.includes('fresh') || d.includes('produce')) {
    return 'bg-emerald-100/90 text-emerald-900 border-emerald-200/90';
  }
  if (d.includes('meat') || d.includes('fish') || d.includes('poultry') || d.includes('sea')) {
    return 'bg-rose-100/90 text-rose-900 border-rose-200/90';
  }
  if (d.includes('maint') || d.includes('eng') || d.includes('house') || d.includes('tech')) {
    return 'bg-indigo-100/90 text-indigo-900 border-indigo-200/90';
  }
  if (d.includes('store') || d.includes('ware') || d.includes('logis') || d.includes('central')) {
    return 'bg-cyan-100/90 text-cyan-900 border-cyan-200/90';
  }
  return 'bg-blue-100/90 text-blue-900 border-blue-200/90';
};

const getStatusBadgeConfig = (status?: string, isHeld?: boolean) => {
  if (isHeld || status === 'Held') {
    return {
      label: 'On Hold',
      bg: 'bg-purple-100 text-purple-900 border-purple-200/90',
      gradient: 'bg-gradient-to-r from-purple-600 to-indigo-600',
      accentBorder: 'border-l-purple-500',
      cardBorder: 'border-purple-200 hover:border-purple-300',
      lightBg: 'bg-purple-50/30',
      icon: Lock,
    };
  }
  if (status === 'Completed') {
    return {
      label: 'Completed',
      bg: 'bg-emerald-100 text-emerald-900 border-emerald-200/90',
      gradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      accentBorder: 'border-l-emerald-500',
      cardBorder: 'border-emerald-200 hover:border-emerald-300',
      lightBg: 'bg-emerald-50/30',
      icon: CheckCircle2,
    };
  }
  if (status === 'Partial') {
    return {
      label: 'Partial',
      bg: 'bg-blue-100 text-blue-900 border-blue-200/90',
      gradient: 'bg-gradient-to-r from-blue-500 to-cyan-600',
      accentBorder: 'border-l-blue-500',
      cardBorder: 'border-blue-200 hover:border-blue-300',
      lightBg: 'bg-blue-50/30',
      icon: RotateCw,
    };
  }
  return {
    label: 'Pending',
    bg: 'bg-amber-100 text-amber-900 border-amber-200/90',
    gradient: 'bg-gradient-to-r from-amber-500 to-orange-500',
    accentBorder: 'border-l-amber-500',
    cardBorder: 'border-amber-200 hover:border-amber-300',
    lightBg: 'bg-amber-50/30',
    icon: Clock,
  };
};

const ROW_COLOR_PALETTE = [
  {
    bg: 'bg-amber-50/80',
    hoverBg: 'hover:bg-amber-100/90',
    selectedBg: 'bg-amber-100',
    deepBg: 'bg-amber-600',
    deepText: 'text-amber-800',
    border: 'border-amber-200/80',
    accentBorder: 'border-l-amber-500',
    stroke: '#d97706',
  },
  {
    bg: 'bg-emerald-50/80',
    hoverBg: 'hover:bg-emerald-100/90',
    selectedBg: 'bg-emerald-100',
    deepBg: 'bg-emerald-600',
    deepText: 'text-emerald-800',
    border: 'border-emerald-200/80',
    accentBorder: 'border-l-emerald-500',
    stroke: '#059669',
  },
  {
    bg: 'bg-sky-50/80',
    hoverBg: 'hover:bg-sky-100/90',
    selectedBg: 'bg-sky-100',
    deepBg: 'bg-sky-600',
    deepText: 'text-sky-800',
    border: 'border-sky-200/80',
    accentBorder: 'border-l-sky-500',
    stroke: '#0284c7',
  },
  {
    bg: 'bg-violet-50/80',
    hoverBg: 'hover:bg-violet-100/90',
    selectedBg: 'bg-violet-100',
    deepBg: 'bg-violet-600',
    deepText: 'text-violet-800',
    border: 'border-violet-200/80',
    accentBorder: 'border-l-violet-500',
    stroke: '#7c3aed',
  },
  {
    bg: 'bg-rose-50/80',
    hoverBg: 'hover:bg-rose-100/90',
    selectedBg: 'bg-rose-100',
    deepBg: 'bg-rose-600',
    deepText: 'text-rose-800',
    border: 'border-rose-200/80',
    accentBorder: 'border-l-rose-500',
    stroke: '#e11d48',
  },
  {
    bg: 'bg-indigo-50/80',
    hoverBg: 'hover:bg-indigo-100/90',
    selectedBg: 'bg-indigo-100',
    deepBg: 'bg-indigo-600',
    deepText: 'text-indigo-800',
    border: 'border-indigo-200/80',
    accentBorder: 'border-l-indigo-500',
    stroke: '#4f46e5',
  },
  {
    bg: 'bg-teal-50/80',
    hoverBg: 'hover:bg-teal-100/90',
    selectedBg: 'bg-teal-100',
    deepBg: 'bg-teal-600',
    deepText: 'text-teal-800',
    border: 'border-teal-200/80',
    accentBorder: 'border-l-teal-500',
    stroke: '#0d9488',
  },
  {
    bg: 'bg-orange-50/80',
    hoverBg: 'hover:bg-orange-100/90',
    selectedBg: 'bg-orange-100',
    deepBg: 'bg-orange-600',
    deepText: 'text-orange-800',
    border: 'border-orange-200/80',
    accentBorder: 'border-l-orange-500',
    stroke: '#ea580c',
  },
];

const getDayOfMonth = (dateStr?: string, defaultVal = '01') => {
  if (!dateStr) return defaultVal;
  const str = String(dateStr).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return String(d.getDate()).padStart(2, '0');
  }
  const match = str.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/) || str.match(/\b(\d{1,2})\b/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 31) return String(num).padStart(2, '0');
  }
  return defaultVal;
};

export const RunningPoList: React.FC<RunningPoListProps> = ({ 
  pos, 
  title = "Purchase Orders Management (All & Active Orders)",
  className = "",
  allowDelete = false,
  allowStatusChange = false,
  allowDeptChart = true,
  showHeader = true,
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showDeptChart, setShowDeptChart] = useState<boolean>(true);

  // Department Breakdown calculation
  const departmentBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    pos.forEach(p => {
      const d = p.department?.trim() || 'General';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [pos]);

  // Bulk selection states
  const [selectedPoNumbers, setSelectedPoNumbers] = useState<Set<string>>(new Set());
  const [bulkStatusSelectValue, setBulkStatusSelectValue] = useState<string>('');

  // Selected PO Modal for detailed report view
  const [selectedPoForDetail, setSelectedPoForDetail] = useState<PurchaseOrder | null>(null);
  const [poDetailFilter, setPoDetailFilter] = useState<'all' | 'complete' | 'partial' | 'hold' | 'pending'>('all');
  const [sendingPoNumber, setSendingPoNumber] = useState<string | null>(null);

  useEffect(() => {
    setPoDetailFilter('all');
  }, [selectedPoForDetail?.poNumber, selectedPoForDetail?.id]);

  const getFilteredPoForExport = (): PurchaseOrder => {
    if (!selectedPoForDetail) return {} as PurchaseOrder;
    if (poDetailFilter === 'all') return selectedPoForDetail;

    const items = selectedPoForDetail.items || [];
    const filteredItems = items.filter(item => {
      const req = item.requestedQty || item.orderedQty || 0;
      const pur = item.purchasedQty || 0;
      const isHold = item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' || (item as any).isHeld;

      if (poDetailFilter === 'complete') {
        return (pur >= req && req > 0) || item.purchaseStatus === 'Purchased';
      }
      if (poDetailFilter === 'partial') {
        return pur > 0 && pur < req;
      }
      if (poDetailFilter === 'hold') {
        return isHold;
      }
      if (poDetailFilter === 'pending') {
        return pur === 0 && !isHold;
      }
      return true;
    });

    const filterLabelMap: Record<string, string> = {
      complete: 'Complete Purchase',
      partial: 'Partial Items',
      hold: 'Hold Items',
      pending: 'Pending Purchase'
    };

    const filterLabel = filterLabelMap[poDetailFilter] || 'Filtered Items';
    const reportTitle = `${filterLabel} Report — PO #${selectedPoForDetail.poNumber}`;

    return {
      ...selectedPoForDetail,
      items: filteredItems,
      reportTitle
    } as PurchaseOrder & { reportTitle?: string };
  };

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

  // Export single PO details to printable Purchase Order Report PDF
  const handlePrintPoReport = (po: PurchaseOrder) => {
    printPurchaseOrderReport(po);
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3 flex flex-col justify-between ${className}`}>
      <div>
        {/* Header & Export Buttons */}
        {showHeader && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-700/80 shadow-xl shadow-slate-950/20 mb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.4),0_2px_0_rgba(29,78,216,1)] border border-blue-300/30 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2.5 flex-wrap">
                  <span>{title}</span>
                  <span className="px-3 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-mono font-black rounded-full shadow-[0_2px_8px_rgba(37,99,235,0.4)] border border-blue-300/40">
                    {filteredRunningPOs.length} Active
                  </span>
                </h3>
                <p className="text-xs text-slate-300 font-medium hidden sm:block mt-0.5">
                  Live PO tracking with instant status filters, search, and Telegram dispatching
                </p>
              </div>
            </div>

            {/* Export, Actions & View Mode Toggle */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border border-blue-300/40'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border border-blue-300/40'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Cards Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              {allowDeptChart && (
                <button
                  type="button"
                  onClick={() => setShowDeptChart(!showDeptChart)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-150 flex items-center gap-1.5 cursor-pointer border ${
                    showDeptChart
                      ? 'bg-gradient-to-b from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-[0_4px_12px_rgba(16,185,129,0.35),0_2px_0_rgba(5,150,105,1)] border-emerald-300/40'
                      : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40'
                  }`}
                  title="Toggle Department Breakdown Pie Chart"
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Dept Chart</span>
                  {showDeptChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => exportRunningPOsToCSV()}
                disabled={filteredRunningPOs.length === 0}
                className="px-3 py-1.5 bg-gradient-to-b from-teal-500 via-emerald-600 to-teal-700 hover:from-teal-600 hover:to-teal-800 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[0_4px_12px_rgba(20,184,166,0.35),0_2px_0_rgba(15,118,110,1)] active:translate-y-0.5 active:shadow-none border border-teal-300/40 transition-all cursor-pointer"
                title="Export Running POs report to Excel (CSV)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => exportRunningPOsToPDF()}
                disabled={filteredRunningPOs.length === 0}
                className="px-3 py-1.5 bg-gradient-to-b from-blue-500 via-indigo-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[0_4px_12px_rgba(37,99,235,0.35),0_2px_0_rgba(29,78,216,1)] active:translate-y-0.5 active:shadow-none border border-blue-300/40 transition-all cursor-pointer"
                title="Export Running POs report as PDF / Print"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF Report</span>
              </button>

              {allowDelete && onClearAllPOs && pos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-b from-rose-500 via-red-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white border border-rose-300/40 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[0_4px_12px_rgba(225,29,72,0.35),0_2px_0_rgba(190,18,60,1)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  title="Delete all purchase orders"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Department Breakdown Pie Chart Banner */}
        {allowDeptChart && showDeptChart && (
          <div className="pt-3">
            <DepartmentPieChart
              departmentBreakdown={departmentBreakdown}
              onSelectDepartment={(dept) => setRunningPoDeptFilter(dept)}
              activeSelectedDept={runningPoDeptFilter}
            />
          </div>
        )}

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
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-500 font-mono font-bold text-slate-800"
            />
          </div>

          {/* Item Name Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={runningPoItemSearch}
              onChange={(e) => setRunningPoItemSearch(e.target.value)}
              placeholder="Search Item Name..."
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800"
            />
          </div>

          {/* Department Filter */}
          <select
            value={runningPoDeptFilter}
            onChange={(e) => setRunningPoDeptFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Depts ({uniqueDepartments.length})</option>
            {uniqueDepartments.map((d, idx) => (
              <option key={`${d}-${idx}`} value={d}>{d}</option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={runningPoLocFilter}
            onChange={(e) => setRunningPoLocFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Locations ({uniqueLocations.length})</option>
            {uniqueLocations.map((l, idx) => (
              <option key={`${l}-${idx}`} value={l}>{l}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={runningPoStatusFilter}
            onChange={(e) => setRunningPoStatusFilter(e.target.value)}
            className="w-full px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value="ACTIVE">⚡ Active POs</option>
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending Only</option>
            <option value="Partial">Partial Only</option>
            <option value="Completed">Completed Only</option>
            <option value="Held">Held Only</option>
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

        {/* Running PO Content */}
        {filteredRunningPOs.length === 0 ? (
          <div className="text-center py-10 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 mt-3">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="text-slate-500 text-xs font-bold">No running POs match your selected criteria.</p>
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
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* CARDS GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredRunningPOs.map((po, idx) => {
              const totalItems = po.items ? po.items.length : 0;
              const purchasedCount = (po.items || []).filter(i => i.purchaseStatus === 'Purchased').length;
              const percent = totalItems > 0 ? Math.round((purchasedCount / totalItems) * 100) : 0;
              const isSelected = selectedPoNumbers.has(po.poNumber);
              const isHeld = po.isHeldByAdmin || po.purchaseStatus === 'Held' || (po.items || []).some(i => i.purchaseStatus === 'Held');

              const statusCfg = getStatusBadgeConfig(po.purchaseStatus, isHeld);
              const deptBadgeClass = getDeptBadgeClass(po.department);
              const StatusIcon = statusCfg.icon;

              return (
                <div
                  key={po.id ? `${po.id}-${idx}` : `card-po-${idx}`}
                  onClick={() => {
                    if (onSelectPo) onSelectPo(po);
                    setSelectedPoForDetail(po);
                  }}
                  className={`group bg-white rounded-2xl border ${statusCfg.cardBorder} shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between relative ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''
                  }`}
                >
                  {/* Top Color Accent Line */}
                  <div className={`h-1.5 w-full ${statusCfg.gradient}`} />

                  <div className="p-3.5 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelectPo(po.poNumber);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 accent-blue-600"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-slate-900 text-sm group-hover:text-blue-600 transition">
                              #{po.poNumber}
                            </span>
                            {isHeld && (
                              <span className="p-0.5 bg-purple-100 text-purple-700 rounded" title="Held PO">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {po.orderDate || po.createdAt ? new Date(po.orderDate || po.createdAt!).toLocaleDateString() : 'Active PO'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 shadow-2xs ${statusCfg.bg}`}>
                        <StatusIcon className="w-3 h-3 shrink-0" />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* Department & Location Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 truncate max-w-[140px] ${deptBadgeClass}`}>
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{po.department || 'General'}</span>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium border border-slate-200 flex items-center gap-1 truncate max-w-[130px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{po.location || 'Central Warehouse'}</span>
                      </span>
                    </div>

                    {/* Items Snippet (First 3) */}
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-slate-400 pb-1 border-b border-slate-200/60">
                        <span>Item Preview</span>
                        <span>{totalItems} Items Total</span>
                      </div>
                      {(po.items || []).slice(0, 3).map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center justify-between text-[11px] gap-2">
                          <span className="text-slate-800 font-bold truncate">{item.itemName}</span>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0 font-medium">
                            {item.requestedQty || item.orderedQty || 0} {item.unit || 'pcs'}
                          </span>
                        </div>
                      ))}
                      {totalItems > 3 && (
                        <div className="text-[10px] font-bold text-blue-600 text-right pt-0.5">
                          +{totalItems - 3} more items...
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-600">Fulfillment Progress</span>
                        <span className="font-mono text-slate-900">
                          {purchasedCount}/{totalItems} <span className="text-blue-600 font-extrabold">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            percent === 100
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : percent > 0
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendSinglePoTelegram(po);
                      }}
                      disabled={sendingPoNumber === po.poNumber}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                      title="Send to Telegram"
                    >
                      <Send className={`w-3 h-3 text-emerald-600 ${sendingPoNumber === po.poNumber ? 'animate-pulse' : ''}`} />
                      <span>Telegram</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPoForDetail(po);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-blue-600" />
                        <span>Report</span>
                      </button>

                      {isHeld ? (
                        onReleasePO && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReleasePO(po.poNumber);
                            }}
                            className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition cursor-pointer"
                            title="Release Hold"
                          >
                            <Unlock className="w-3.5 h-3.5 text-amber-600" />
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
                            className="p-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition cursor-pointer"
                            title="Hold PO"
                          >
                            <Lock className="w-3.5 h-3.5 text-purple-600" />
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
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition cursor-pointer"
                          title="Delete PO"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="overflow-x-auto mt-3 max-h-[560px] overflow-y-auto border border-slate-200 rounded-2xl shadow-2xs bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white font-extrabold uppercase text-[9px] tracking-wider sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-2.5 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-400 text-blue-500 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5 accent-blue-600"
                      title={isAllFilteredSelected ? "Deselect all filtered POs" : "Select all filtered POs"}
                    />
                  </th>
                  <th className="p-2.5">PO Number</th>
                  <th className="p-2.5">Department</th>
                  <th className="p-2.5">Location</th>
                  <th className="p-2.5 text-center">Progress</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 font-medium">
                {filteredRunningPOs.map((po, idx) => {
                  const totalItems = po.items ? po.items.length : 0;
                  const purchasedCount = (po.items || []).filter(i => i.purchaseStatus === 'Purchased').length;
                  const percent = totalItems > 0 ? Math.round((purchasedCount / totalItems) * 100) : 0;
                  const isSelected = selectedPoNumbers.has(po.poNumber);
                  const isHeld = po.isHeldByAdmin || po.purchaseStatus === 'Held' || (po.items || []).some(i => i.purchaseStatus === 'Held');

                  const statusCfg = getStatusBadgeConfig(po.purchaseStatus, isHeld);
                  const deptBadgeClass = getDeptBadgeClass(po.department);
                  const StatusIcon = statusCfg.icon;

                  // Rotating color palette theme per row
                  const rowTheme = ROW_COLOR_PALETTE[idx % ROW_COLOR_PALETTE.length];

                  // Date Badges (Order Day & Delivery Day)
                  const orderDay = getDayOfMonth(po.orderDate || po.createdAt, '01');
                  const deliveryDay = getDayOfMonth(po.deliveryDate || po.items?.[0]?.deliveryDate || po.orderDate || po.createdAt, orderDay);

                  return (
                    <tr 
                      key={po.id ? `${po.id}-${idx}` : `rpo-${idx}`} 
                      className={`transition-colors duration-200 ease-in-out cursor-pointer border-l-4 ${rowTheme.accentBorder} ${
                        isSelected ? `${rowTheme.selectedBg} font-semibold shadow-2xs` : rowTheme.bg
                      } ${rowTheme.hoverBg}`} 
                      onClick={() => {
                        if (onSelectPo) onSelectPo(po);
                        setSelectedPoForDetail(po);
                      }}
                    >
                      {/* Checkbox Column */}
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectPo(po.poNumber)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5 accent-blue-600"
                        />
                      </td>

                      {/* PO Number Column with Order Date Badge */}
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {/* Order Date Badge (34x34px rounded square) */}
                          <span
                            className={`w-8 h-8 ${rowTheme.deepBg} text-white rounded-lg flex items-center justify-center font-mono font-black text-xs shadow-xs shrink-0 cursor-default`}
                            title={`Order Day: ${orderDay} (${po.orderDate || po.createdAt || 'Active'})`}
                          >
                            {orderDay}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPoForDetail(po);
                            }}
                            className="hover:text-blue-600 flex items-center gap-1.5 group text-left cursor-pointer"
                            title="Click to view detailed PO Details & Dispatch Report"
                          >
                            <span className="text-xs font-black">#{po.poNumber}</span>
                            <Eye className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition" />
                          </button>
                        </div>
                      </td>

                      {/* Department Column */}
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border inline-block truncate max-w-[150px] ${deptBadgeClass}`}>
                          {po.department || 'General'}
                        </span>
                      </td>

                      {/* Location Column */}
                      <td className="p-2.5 text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{po.location || 'Central Warehouse'}</span>
                        </span>
                      </td>

                      {/* Progress Column with Ring/Donut Chart */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90 overflow-visible">
                              {/* Empty gray background ring */}
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth="3.5"
                              />
                              {/* Overlaid colored arc */}
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={rowTheme.stroke}
                                strokeWidth="3.8"
                                strokeDasharray={`${percent}, 100`}
                                strokeLinecap="round"
                                className="transition-all duration-500 ease-out"
                              />
                            </svg>
                            <span className="absolute font-mono font-black text-[9px] text-slate-800">
                              {percent}%
                            </span>
                          </div>
                          <div className="flex flex-col text-left font-mono leading-tight">
                            <span className="text-[10px] font-bold text-slate-800">
                              {purchasedCount}/{totalItems}
                            </span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                              {percent === 100 ? 'Done' : 'Items'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="p-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1 shadow-2xs ${statusCfg.bg}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Telegram */}
                          <button
                            type="button"
                            onClick={() => handleSendSinglePoTelegram(po)}
                            disabled={sendingPoNumber === po.poNumber}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Send this PO Report directly to Telegram"
                          >
                            <Send className={`w-3 h-3 text-emerald-600 ${sendingPoNumber === po.poNumber ? 'animate-pulse' : ''}`} />
                            <span className="hidden xl:inline">Telegram</span>
                          </button>

                          {/* Report */}
                          <button
                            type="button"
                            onClick={() => setSelectedPoForDetail(po)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="View full PO details & print report"
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span className="hidden xl:inline">Report</span>
                          </button>

                          {/* Hold / Release Hold */}
                          {isHeld ? (
                            onReleasePO && (
                              <button
                                type="button"
                                onClick={() => onReleasePO(po.poNumber)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Release PO Hold"
                              >
                                <Unlock className="w-3 h-3 text-amber-600" />
                                <span className="hidden xl:inline">Release</span>
                              </button>
                            )
                          ) : (
                            onHoldPO && (
                              <button
                                type="button"
                                onClick={() => onHoldPO(po.poNumber)}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Hold PO"
                              >
                                <Lock className="w-3 h-3 text-purple-600" />
                                <span className="hidden xl:inline">Hold</span>
                              </button>
                            )
                          )}

                          {/* Delivery Date Badge (~30px, immediately before Delete button) */}
                          <span
                            className={`w-7 h-7 ${rowTheme.deepBg} text-white rounded-lg flex items-center justify-center font-mono font-black text-[11px] shadow-xs shrink-0 cursor-default`}
                            title={`Delivery Day: ${deliveryDay}`}
                          >
                            {deliveryDay}
                          </span>

                          {/* Delete */}
                          {allowDelete && (onDeletePO || onDeletePo) && (
                            <button
                              type="button"
                              onClick={() => setPoToDelete(po.poNumber)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-lg transition cursor-pointer"
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

                const completeCount = items.filter(i => {
                  const req = i.requestedQty || i.orderedQty || 0;
                  const pur = i.purchasedQty || 0;
                  return (pur >= req && req > 0) || i.purchaseStatus === 'Purchased';
                }).length;

                const partialCount = items.filter(i => {
                  const req = i.requestedQty || i.orderedQty || 0;
                  const pur = i.purchasedQty || 0;
                  return pur > 0 && pur < req;
                }).length;

                const holdCount = items.filter(i => 
                  i.purchaseStatus === 'Held' || i.purchaseStatus === 'Hold' || (i as any).isHeld
                ).length;

                const pendingCount = items.filter(i => {
                  const pur = i.purchasedQty || 0;
                  const isHold = i.purchaseStatus === 'Held' || i.purchaseStatus === 'Hold' || (i as any).isHeld;
                  return pur === 0 && !isHold;
                }).length;

                const filteredItems = items.filter(item => {
                  if (poDetailFilter === 'all') return true;
                  const req = item.requestedQty || item.orderedQty || 0;
                  const pur = item.purchasedQty || 0;
                  const isHold = item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' || (item as any).isHeld;

                  if (poDetailFilter === 'complete') {
                    return (pur >= req && req > 0) || item.purchaseStatus === 'Purchased';
                  }
                  if (poDetailFilter === 'partial') {
                    return pur > 0 && pur < req;
                  }
                  if (poDetailFilter === 'hold') {
                    return isHold;
                  }
                  if (poDetailFilter === 'pending') {
                    return pur === 0 && !isHold;
                  }
                  return true;
                });

                const getFilteredPoForExport = (): PurchaseOrder => {
                  if (poDetailFilter === 'all') {
                    return selectedPoForDetail;
                  }

                  const filterLabelMap: Record<string, string> = {
                    complete: 'Complete Purchase',
                    partial: 'Partial Items',
                    hold: 'Hold Items',
                    pending: 'Pending Purchase'
                  };

                  const filterLabel = filterLabelMap[poDetailFilter] || 'Filtered Items';
                  const reportTitle = `${filterLabel} Report — PO #${selectedPoForDetail.poNumber}`;

                  return {
                    ...selectedPoForDetail,
                    items: filteredItems,
                    reportTitle
                  } as PurchaseOrder & { reportTitle?: string };
                };

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-center">
                      {/* Total Items */}
                      <button
                        type="button"
                        onClick={() => setPoDetailFilter('all')}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                          poDetailFilter === 'all'
                            ? 'bg-blue-600 text-white ring-4 ring-blue-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                            : 'bg-blue-600 text-white hover:bg-blue-700 opacity-90 hover:opacity-100 font-medium'
                        }`}
                      >
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-100">Total Items</span>
                        <p className="text-xl font-black text-white mt-1">{totalItems}</p>
                        <span className="text-[9px] font-semibold text-blue-200 mt-0.5">
                          {poDetailFilter === 'all' ? '● Show All' : 'Click to Reset'}
                        </span>
                      </button>

                      {/* Complete Purchase */}
                      <button
                        type="button"
                        onClick={() => setPoDetailFilter(prev => prev === 'complete' ? 'all' : 'complete')}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                          poDetailFilter === 'complete'
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 opacity-90 hover:opacity-100 font-medium'
                        }`}
                      >
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-100">Complete Purchase</span>
                        <p className="text-xl font-black text-white mt-1">{completeCount}</p>
                        <span className="text-[9px] font-semibold text-emerald-200 mt-0.5">
                          {poDetailFilter === 'complete' ? '● Filtered' : 'Filter Items'}
                        </span>
                      </button>

                      {/* Partial Items */}
                      <button
                        type="button"
                        onClick={() => setPoDetailFilter(prev => prev === 'partial' ? 'all' : 'partial')}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                          poDetailFilter === 'partial'
                            ? 'bg-orange-500 text-white ring-4 ring-orange-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                            : 'bg-orange-500 text-white hover:bg-orange-600 opacity-90 hover:opacity-100 font-medium'
                        }`}
                      >
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-orange-100">Partial Items</span>
                        <p className="text-xl font-black text-white mt-1">{partialCount}</p>
                        <span className="text-[9px] font-semibold text-orange-200 mt-0.5">
                          {poDetailFilter === 'partial' ? '● Filtered' : 'Filter Items'}
                        </span>
                      </button>

                      {/* Hold Items */}
                      <button
                        type="button"
                        onClick={() => setPoDetailFilter(prev => prev === 'hold' ? 'all' : 'hold')}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                          poDetailFilter === 'hold'
                            ? 'bg-purple-600 text-white ring-4 ring-purple-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                            : 'bg-purple-600 text-white hover:bg-purple-700 opacity-90 hover:opacity-100 font-medium'
                        }`}
                      >
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-100">Hold Items</span>
                        <p className="text-xl font-black text-white mt-1">{holdCount}</p>
                        <span className="text-[9px] font-semibold text-purple-200 mt-0.5">
                          {poDetailFilter === 'hold' ? '● Filtered' : 'Filter Items'}
                        </span>
                      </button>

                      {/* Pending Purchase */}
                      <button
                        type="button"
                        onClick={() => setPoDetailFilter(prev => prev === 'pending' ? 'all' : 'pending')}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                          poDetailFilter === 'pending'
                            ? 'bg-amber-600 text-white ring-4 ring-amber-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                            : 'bg-amber-600 text-white hover:bg-amber-700 opacity-90 hover:opacity-100 font-medium'
                        }`}
                      >
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-100">Pending Purchase</span>
                        <p className="text-xl font-black text-white mt-1">{pendingCount}</p>
                        <span className="text-[9px] font-semibold text-amber-200 mt-0.5">
                          {poDetailFilter === 'pending' ? '● Filtered' : 'Filter Items'}
                        </span>
                      </button>
                    </div>

                    {/* Items Breakdown Table */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>Line Items Detailed Breakdown ({filteredItems.length}/{items.length})</span>
                          {poDetailFilter !== 'all' && (
                            <button
                              type="button"
                              onClick={() => setPoDetailFilter('all')}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] font-bold transition cursor-pointer"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">Purchase Status</span>
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
                              <th className="p-2.5 text-center">Remaining</th>
                              <th className="p-2.5 text-center">Purchase Status</th>
                              <th className="p-2.5">Notes / Hold</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredItems.map((item, idx) => {
                              const req = item.requestedQty || item.orderedQty || 0;
                              const pur = item.purchasedQty || 0;
                              const rem = Math.max(0, req - pur);

                              return (
                                <tr key={item.id ? `${item.id}-${idx}` : `poitem-${idx}`} className="hover:bg-slate-50 transition">
                                  <td className="p-2.5 text-center font-mono font-bold text-slate-500">{item.slNumber || idx + 1}</td>
                                  <td className="p-2.5 font-bold text-slate-900">{item.itemName}</td>
                                  <td className="p-2.5 text-slate-600">{item.brand || 'N/A'}</td>
                                  <td className="p-2.5 text-center font-bold text-slate-800">{req} {item.unit || 'pcs'}</td>
                                  <td className="p-2.5 text-center font-bold text-blue-700">{pur} {item.unit || 'pcs'}</td>
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
                            {filteredItems.length === 0 && (
                              <tr>
                                <td colSpan={8} className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50">
                                  No line items match the selected filter ({poDetailFilter}).
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Buttons override within closure */}
                    <div className="hidden">
                      {/* Hidden marker */}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">
                Created: {selectedPoForDetail.orderDate || selectedPoForDetail.createdAt || 'N/A'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintPoReport(getFilteredPoForExport())}
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
