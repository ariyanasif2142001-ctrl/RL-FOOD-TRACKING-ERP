import React, { useState, useEffect, useCallback } from 'react';
import { PurchaseOrder, User, AuditLog, getNormalizedItemStatus } from '../../types';
import { SystemTestsRunner } from './SystemTestsRunner';
import { SystemDocsGuide } from './SystemDocsGuide';
import { TelegramSettings } from './TelegramSettings';
import { 
  notifyDailySummaryReport, 
  notifyPendingPurchasesReport, 
  notifyHoldItemsReport, 
  notifySinglePOReport,
  sendCustomTelegramAlert
} from '../../services/telegramService';
import { RunningPoList } from '../RunningPoList';
import { DiscrepancyAlertHub } from '../DiscrepancyAlertHub';
import { AdminPoSlider } from './AdminPoSlider';
import { FruitOrbitStats } from './FruitOrbitStats';
import { printPurchaseOrderReport } from '../../services/officialPdfService';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { AdminPoImportSection } from './AdminPoImportSection';
import { AdminUsersSection } from './AdminUsersSection';
import { AdminAuditLogsSection } from './AdminAuditLogsSection';
import { AdminReportModal } from './AdminReportModal';
import { AdminPoDetailModal } from './AdminPoDetailModal';
import { AdminCustomAlertModal } from './AdminCustomAlertModal';
import { AdminGlobalSearchModal } from './AdminGlobalSearchModal';
import { 
  Trash2, X, AlertCircle, Zap, Eye, Printer, ChevronDown, ChevronUp, Download, Layers
} from 'lucide-react';

interface AdminDashboardProps {
  pos: PurchaseOrder[];
  users: User[];
  auditLogs: AuditLog[];
  onImportPOs: (newPOs: PurchaseOrder[]) => void;
  onUpdateUsers: (users: User[]) => void;
  onSync: () => void;
  onDeletePO?: (poNumber: string) => void;
  onClearAllPOs?: () => void;
  onHoldPO?: (poNumber: string) => void;
  onReleasePO?: (poNumber: string) => void;
  onShowToast?: (msg: string, isSuccess?: boolean) => void;
  isSyncing: boolean;
  currentUser: User;
  externalActiveTab?: 'dashboard' | 'import' | 'users' | 'telegram' | 'tests' | 'docs' | 'logs';
  onSelectAdminTab?: (tab: 'dashboard' | 'import' | 'users' | 'telegram' | 'tests' | 'docs' | 'logs') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  pos,
  users,
  auditLogs,
  onImportPOs,
  onUpdateUsers,
  onSync,
  onDeletePO,
  onClearAllPOs,
  onHoldPO,
  onReleasePO,
  onShowToast,
  isSyncing,
  currentUser,
  externalActiveTab,
  onSelectAdminTab
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'dashboard' | 'import' | 'users' | 'telegram' | 'tests' | 'docs' | 'logs'>('dashboard');
  
  const activeTab = externalActiveTab || internalActiveTab;

  const setActiveTab = (tab: 'dashboard' | 'import' | 'users' | 'telegram' | 'tests' | 'docs' | 'logs') => {
    setInternalActiveTab(tab);
    if (onSelectAdminTab) onSelectAdminTab(tab);
  };
  
  // Instant Search & Status Filter state
  const [healthMsg, setHealthMsg] = useState<string | null>(null);
  const [isSendingTelegramSummary, setIsSendingTelegramSummary] = useState<boolean>(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);

  // Keyboard shortcut Ctrl+K / Cmd+K to open Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Custom Telegram Broadcast Alert State
  const [isCustomAlertModalOpen, setIsCustomAlertModalOpen] = useState<boolean>(false);
  const [customAlertText, setCustomAlertText] = useState<string>('');
  const [customAlertPriority, setCustomAlertPriority] = useState<'NORMAL' | 'URGENT' | 'CRITICAL'>('NORMAL');
  const [isSendingCustomAlert, setIsSendingCustomAlert] = useState<boolean>(false);

  const handleSendCustomAlert = async () => {
    if (!customAlertText.trim()) {
      alert('Please enter a custom alert message.');
      return;
    }

    setIsSendingCustomAlert(true);
    const res = await sendCustomTelegramAlert(
      customAlertText.trim(),
      currentUser.name,
      customAlertPriority
    );
    setIsSendingCustomAlert(false);

    if (res && res.success) {
      alert('📢 Custom Alert sent to Telegram group successfully!');
      setCustomAlertText('');
      setIsCustomAlertModalOpen(false);
    } else {
      alert(res?.error || 'Failed to send Custom Alert to Telegram. Please check Telegram Bot settings.');
    }
  };

  const handleSendTelegramReport = async (type: 'master' | 'pending' | 'hold') => {
    setIsSendingTelegramSummary(true);

    let res: { success: boolean; error?: string } | null = null;
    let title = '';

    if (type === 'master') {
      title = '📊 Daily Master Summary Digest';
      res = await notifyDailySummaryReport(pos, users.length, currentUser.name);
    } else if (type === 'pending') {
      title = '🛒 Urgent Pending Purchases Report';
      res = await notifyPendingPurchasesReport(pos, currentUser.name);
    } else if (type === 'hold') {
      title = '⏸️ On-Hold Items Report';
      res = await notifyHoldItemsReport(pos, currentUser.name);
    }

    setIsSendingTelegramSummary(false);

    if (res && res.success) {
      alert(`${title} sent to Telegram group successfully!`);
    } else {
      alert(res?.error || 'Failed to send report to Telegram. Please verify Telegram Bot Token & Chat ID in settings.');
    }
  };

  const [sendingPoNumber, setSendingPoNumber] = useState<string | null>(null);

  const handleSendSinglePoTelegram = async (po: PurchaseOrder) => {
    setSendingPoNumber(po.poNumber);
    const res = await notifySinglePOReport(po, currentUser.name);
    setSendingPoNumber(null);

    if (res && res.success) {
      alert(`✅ PO #${po.poNumber} summary report sent to Telegram group successfully!`);
    } else {
      alert(res?.error || `Failed to send PO #${po.poNumber} to Telegram. Please check Telegram Bot settings.`);
    }
  };

  // Hold Purchaser Filter State
  const [holdPurchaserFilter, setHoldPurchaserFilter] = useState<string>('ALL');
  const [isHoldMonitorExpanded, setIsHoldMonitorExpanded] = useState<boolean>(false);

  // Running PO List Filter State
  const [runningPoSearch, setRunningPoSearch] = useState<string>('');
  const [runningPoItemSearch, setRunningPoItemSearch] = useState<string>('');
  const [runningPoDeptFilter, setRunningPoDeptFilter] = useState<string>('ALL');
  const [runningPoLocFilter, setRunningPoLocFilter] = useState<string>('ALL');
  const [runningPoStatusFilter, setRunningPoStatusFilter] = useState<string>('ACTIVE');

  // Clickable Stat Card Report Modal State
  const [selectedReport, setSelectedReport] = useState<'total_po' | 'pending_po' | 'partial_po' | 'completed_po' | 'pending_items' | 'hold_items' | 'partial_items' | 'purchased_items' | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportPurchaserFilter, setReportPurchaserFilter] = useState<string>('ALL');

  // Helper to get User Avatar / Photo URL with fallback
  const getUserAvatar = useCallback((userName: string) => {
    const norm = (userName || '').trim().toLowerCase();
    const found = users.find(u => 
      (u.name || '').trim().toLowerCase() === norm ||
      (u.username || '').trim().toLowerCase() === norm ||
      norm.includes((u.name || '').trim().toLowerCase())
    );
    if (found?.avatar && found.avatar.trim()) {
      return found.avatar.trim();
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=0f172a&color=ffffff&bold=true`;
  }, [users]);

  const [selectedPoForDetail, setSelectedPoForDetail] = useState<PurchaseOrder | null>(null);

  const handleRunHealthCheck = () => {
    setHealthMsg('⚡ Running ERP System Health Verification...');
    setTimeout(() => {
      setHealthMsg(`✅ System Health 100% OK | ${pos.length} Active POs | ${users.length} Authorized Users | Database Sync Active.`);
    }, 300);
  };

  // Modals & Export state
  const [poToDelete, setPoToDelete] = useState<string | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // METRICS CALCULATIONS
  const allItems = pos.flatMap(p => {
    return (p.items || []).map(i => {
      const normStatus = getNormalizedItemStatus({
        ...i,
        isHeldByAdmin: p.isHeldByAdmin || p.purchaseStatus === 'Held'
      });
      const isHeld = normStatus === 'Held' || p.isHeldByAdmin || p.purchaseStatus === 'Held';

      return {
        ...i,
        poNumber: i.poNumber || p.poNumber,
        department: i.department || p.department || 'General',
        purchaseStatus: isHeld ? ('Held' as const) : normStatus,
        holdBy: isHeld ? (i.holdBy || i.holdByName || i.purchaserName || p.holdByAdmin || p.createdBy || 'Admin') : '',
        holdById: isHeld ? (i.holdById || '') : '',
        holdByName: isHeld ? (i.holdByName || i.holdBy || i.purchaserName || p.holdByAdmin || p.createdBy || 'Admin') : '',
        holdStartTime: isHeld ? (i.holdStartTime || i.holdSince || p.adminHoldAt || new Date().toISOString()) : '',
        holdSince: isHeld ? (i.holdSince || i.holdStartTime || p.adminHoldAt || new Date().toISOString()) : '',
        holdExpireTime: ''
      };
    });
  });

  // 1. Total PO
  const totalPO = pos.length;
  // 2. Pending PO
  const pendingPO = pos.filter(p => p.purchaseStatus === 'Pending' || p.status === 'pending').length;
  // 3. Partial PO
  const partialPO = pos.filter(p => p.purchaseStatus === 'Partial' || p.status === 'in_progress').length;
  // 4. Completed PO
  const completedPO = pos.filter(p => p.purchaseStatus === 'Completed' || p.status === 'purchased' || p.status === 'verified').length;

  // 5. Pending Items
  const pendingItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Pending').length;
  // 6. Held Items
  const heldItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Held').length;
  // 7. Partial Purchased Items
  const partialItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Partial Purchased').length;
  // 8. Completed Purchased Items
  const purchasedItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Purchased').length;

  // Currently Held Items for Held Monitor
  const heldItemsList = allItems.filter(i => getNormalizedItemStatus(i) === 'Held');

  const uniqueHoldPurchasers = React.useMemo(() => {
    const set = new Set<string>();
    heldItemsList.forEach(i => {
      const p = i.holdBy || i.holdByName || 'Admin';
      set.add(p);
    });
    return Array.from(set).sort();
  }, [heldItemsList]);

  const displayHeldItems = React.useMemo(() => {
    if (holdPurchaserFilter === 'ALL') return heldItemsList;
    return heldItemsList.filter(i => (i.holdBy || i.holdByName || 'Admin') === holdPurchaserFilter);
  }, [heldItemsList, holdPurchaserFilter]);

  // Activity Logs sorted descending by timestamp
  const recentActivityLogs = React.useMemo(() => {
    const logs = auditLogs || [];
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.timestamp || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.timestamp || (b as any).createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [auditLogs]);

  const formatActivityTimestamp = (ts?: string) => {
    if (!ts) return 'Recently';
    const dateObj = new Date(ts);
    if (isNaN(dateObj.getTime())) return String(ts);
    const datePart = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timePart = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${datePart} · ${timePart}`;
  };

  const formatRoleLabel = (roleStr?: string) => {
    if (!roleStr) return 'User';
    const r = roleStr.toLowerCase().trim();
    if (r === 'super_admin' || r === 'superadmin') return 'Super Admin';
    if (r === 'purchaser') return 'Purchaser';
    if (r === 'admin') return 'Admin';
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  // Department & Location Summaries
  const departmentBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pos.forEach(p => {
      const d = p.department?.trim() || 'General';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [pos]);

  const locationBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pos.forEach(p => {
      const l = p.location?.trim() || 'Default';
      counts[l] = (counts[l] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [pos]);

  // Running PO List memoized calculations
  const uniqueDepartments = React.useMemo(() => {
    const depts = new Set<string>();
    pos.forEach(p => {
      if (p.department?.trim()) depts.add(p.department.trim());
    });
    return Array.from(depts).sort();
  }, [pos]);

  const uniqueLocations = React.useMemo(() => {
    const locs = new Set<string>();
    pos.forEach(p => {
      if (p.location?.trim()) locs.add(p.location.trim());
    });
    return Array.from(locs).sort();
  }, [pos]);

  const filteredRunningPOs = React.useMemo(() => {
    return pos.filter(po => {
      if (runningPoStatusFilter === 'ACTIVE') {
        if (po.purchaseStatus === 'Completed') return false;
      } else if (runningPoStatusFilter === 'Held') {
        if (!po.isHeldByAdmin && po.purchaseStatus !== 'Held' && !(po.items || []).some(i => getNormalizedItemStatus(i) === 'Held')) return false;
      } else if (runningPoStatusFilter !== 'ALL') {
        if (po.purchaseStatus !== runningPoStatusFilter) return false;
      }

      if (runningPoDeptFilter !== 'ALL' && (po.department || 'General') !== runningPoDeptFilter) {
        return false;
      }

      if (runningPoLocFilter !== 'ALL' && (po.location || 'Central Warehouse') !== runningPoLocFilter) {
        return false;
      }

      if (runningPoSearch.trim()) {
        const q = runningPoSearch.toLowerCase().trim();
        if (!po.poNumber.toLowerCase().includes(q)) return false;
      }

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

  const exportRunningPOsToCSV = () => {
    if (filteredRunningPOs.length === 0) return;

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

    const rows = filteredRunningPOs.map(po => {
      const items = po.items || [];
      const total = items.length;
      const purchased = items.filter(i => i.purchaseStatus === 'Purchased').length;
      const pending = items.filter(i => i.purchaseStatus === 'Pending' || !i.purchaseStatus).length;
      const held = items.filter(i => i.purchaseStatus === 'Held').length;
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

  const exportRunningPOsToPDF = () => {
    if (filteredRunningPOs.length === 0) return;

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
          @page { size: A4 portrait; margin: 12mm 10mm 12mm 10mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #0f172a; background: #ffffff; font-size: 11px; line-height: 1.4; }
          .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 14px; }
          .title { font-size: 18px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.3px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .filters { background: #f1f5f9; padding: 6px 12px; border-radius: 6px; font-size: 11px; margin-bottom: 16px; border-left: 4px solid #2563eb; color: #334155; }
          .po-card { border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px; background: #ffffff; overflow: hidden; page-break-inside: auto; break-inside: auto; }
          .po-header { background: #f8fafc; border-bottom: 1px solid #cbd5e1; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid; break-inside: avoid; }
          .po-number { font-size: 13px; font-weight: 800; color: #1e40af; font-family: monospace; }
          .po-meta { font-size: 11px; color: #475569; margin-left: 8px; }
          .po-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
          .badge-completed { background: #dcfce7; color: #166534; }
          .badge-partial { background: #dbeafe; color: #1e40af; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .items-table th { background: #f1f5f9; color: #334155; padding: 6px 8px; font-weight: 700; text-transform: uppercase; font-size: 9px; border-bottom: 1px solid #cbd5e1; text-align: left; }
          .items-table td { border-bottom: 1px solid #e2e8f0; }
          .item-tr { page-break-inside: avoid !important; break-inside: avoid !important; }
          .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
          .status-purchased { background: #dcfce7; color: #15803d; }
          .status-held { background: #f3e8ff; color: #7e22ce; }
          .status-pending { background: #fef3c7; color: #b45309; }
          @media print {
            body { padding: 0 !important; background: #fff !important; }
            .no-print { display: none !important; }
            .item-tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            .po-header { page-break-inside: avoid !important; break-inside: avoid !important; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="title">📋 RUNNING PURCHASE ORDERS REPORT</div>
            <div class="subtitle">Generated: ${todayStr} | Total Active POs: ${filteredRunningPOs.length}</div>
          </div>
          <div class="no-print" style="display: flex; gap: 8px;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print / Save as PDF</button>
            <button onclick="window.close()" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">✖ Close Window</button>
          </div>
        </div>

        ${activeFiltersText ? `<div class="filters"><strong>Applied Filters:</strong> ${activeFiltersText}</div>` : ''}

        <div class="po-cards-container">
          ${poCardsHtml}
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Clickable Stat Card Report Data Builder
  const getReportData = () => {
    let title = '';
    let type: 'po' | 'item' = 'po';
    let filteredPos: PurchaseOrder[] = [];
    let filteredItems: typeof allItems = [];

    const q = reportSearchQuery.toLowerCase().trim();

    if (selectedReport === 'total_po') {
      title = 'Total Purchase Orders Report';
      type = 'po';
      filteredPos = pos.filter(p => !q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q));
    } else if (selectedReport === 'pending_po') {
      title = 'Pending Purchase Orders Report';
      type = 'po';
      filteredPos = pos.filter(p => (p.purchaseStatus === 'Pending' || p.status === 'pending') && (!q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q)));
    } else if (selectedReport === 'partial_po') {
      title = 'Partial Purchased POs Report';
      type = 'po';
      filteredPos = pos.filter(p => (p.purchaseStatus === 'Partial' || p.status === 'in_progress') && (!q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q)));
    } else if (selectedReport === 'completed_po') {
      title = 'Completed Purchase Orders Report';
      type = 'po';
      filteredPos = pos.filter(p => (p.purchaseStatus === 'Completed' || p.status === 'purchased') && (!q || p.poNumber.toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q)));
    } else if (selectedReport === 'pending_items') {
      title = 'Pending Line Items Report';
      type = 'item';
      filteredItems = allItems.filter(i => getNormalizedItemStatus(i) === 'Pending' && (!q || i.itemName.toLowerCase().includes(q) || i.poNumber.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q)));
    } else if (selectedReport === 'hold_items') {
      title = 'On-Hold Line Items Report';
      type = 'item';
      filteredItems = allItems.filter(i => {
        if (getNormalizedItemStatus(i) !== 'Held') return false;
        if (reportPurchaserFilter !== 'ALL' && (i.holdBy || i.holdByName || 'Admin') !== reportPurchaserFilter) return false;
        if (q && !i.itemName.toLowerCase().includes(q) && !i.poNumber.toLowerCase().includes(q) && !(i.holdBy || i.holdByName || '').toLowerCase().includes(q)) return false;
        return true;
      });
    } else if (selectedReport === 'partial_items') {
      title = 'Partial Purchased Items Report';
      type = 'item';
      filteredItems = allItems.filter(i => getNormalizedItemStatus(i) === 'Partial Purchased' && (!q || i.itemName.toLowerCase().includes(q) || i.poNumber.toLowerCase().includes(q)));
    } else if (selectedReport === 'purchased_items') {
      title = 'Completed Purchased Line Items Report';
      type = 'item';
      filteredItems = allItems.filter(i => getNormalizedItemStatus(i) === 'Purchased' && (!q || i.itemName.toLowerCase().includes(q) || i.poNumber.toLowerCase().includes(q)));
    }

    return { title, type, posList: filteredPos, items: filteredItems };
  };

  const handleExportReportCSV = () => {
    const data = getReportData();
    if (data.type === 'po') {
      if (data.posList.length === 0) return;
      const headers = ["PO Number", "Location", "Department", "Order Date", "Status", "Items Count"];
      const rows = data.posList.map(p => [
        `"${p.poNumber}"`,
        `"${(p.location || 'Central Warehouse').replace(/"/g, '""')}"`,
        `"${(p.department || 'General').replace(/"/g, '""')}"`,
        `"${p.orderDate || p.createdAt || ''}"`,
        `"${p.purchaseStatus || 'Pending'}"`,
        `"${p.items?.length || 0}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (data.items.length === 0) return;
      const headers = ["PO Number", "Item Name", "Brand", "Department", "Requested Qty", "Status", "Notes/HoldBy"];
      const rows = data.items.map(i => [
        `"${i.poNumber}"`,
        `"${i.itemName.replace(/"/g, '""')}"`,
        `"${(i.brand || '').replace(/"/g, '""')}"`,
        `"${(i.department || '').replace(/"/g, '""')}"`,
        `"${i.requestedQty || i.orderedQty || 0} ${i.unit || 'pcs'}"`,
        `"${i.purchaseStatus || 'Pending'}"`,
        `"${(i.purchaseStatus === 'Held' ? `Hold: ${i.holdBy || i.holdByName || 'Admin'}` : i.notes || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrintPoReport = (po: PurchaseOrder) => {
    printPurchaseOrderReport(po);
  };

  const handleExportSinglePoExcel = (po: PurchaseOrder) => {
    const headers = ["PO Number", "Order Date", "Department", "Location", "SL", "Item Name", "Brand", "Requested Qty", "Purchased Qty", "Status"];
    const rows = (po.items || []).map((i, idx) => [
      `"${po.poNumber}"`,
      `"${po.orderDate || po.createdAt || ''}"`,
      `"${po.department || ''}"`,
      `"${po.location || ''}"`,
      `"${i.slNumber || idx + 1}"`,
      `"${i.itemName.replace(/"/g, '""')}"`,
      `"${(i.brand || '').replace(/"/g, '""')}"`,
      `"${i.requestedQty || i.orderedQty || 0} ${i.unit || 'pcs'}"`,
      `"${i.purchasedQty || 0} ${i.unit || 'pcs'}"`,
      `"${i.purchaseStatus || 'Pending'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `PO_${po.poNumber}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeletePoConfirm = () => {
    if (poToDelete && onDeletePO) {
      onDeletePO(poToDelete);
      setPoToDelete(null);
    }
  };

  const handleClearAllConfirm = () => {
    if (onClearAllPOs) {
      onClearAllPOs();
      setIsClearAllOpen(false);
    }
  };

  const handleDeleteUserConfirm = () => {
    if (userToDelete) {
      const updated = users.filter(u => u.id !== userToDelete);
      onUpdateUsers(updated);
      setUserToDelete(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-4 font-sans text-slate-900 w-full min-h-screen">
      
      {/* Header Navigation Banner */}
      <AdminDashboardHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setIsCustomAlertModalOpen={setIsCustomAlertModalOpen}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        isSendingTelegramSummary={isSendingTelegramSummary}
        isSendingCustomAlert={isSendingCustomAlert}
        onSync={onSync}
        isSyncing={isSyncing}
        handleSendTelegramReport={handleSendTelegramReport}
        usersCount={users.length}
      />

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          
          {/* Smart Discrepancy Alerts & PO Slider */}
          <DiscrepancyAlertHub pos={pos} />
          <AdminPoSlider pos={pos} />

          {/* FRUIT ORBIT STATS */}
          <FruitOrbitStats
            totalPO={totalPO}
            pendingPO={pendingPO}
            partialPO={partialPO}
            completedPO={completedPO}
            pendingItemsCount={pendingItemsCount}
            heldItemsCount={heldItemsCount}
            partialItemsCount={partialItemsCount}
            purchasedItemsCount={purchasedItemsCount}
            onSelectReport={(reportKey) => {
              setSelectedReport(reportKey);
              setReportSearchQuery('');
              if (reportKey === 'hold_items') {
                setReportPurchaserFilter('ALL');
              }
            }}
          />

          {/* Quick Admin Actions & ERP System Health Status Bar */}
          <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] rounded uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                ERP Master Control
              </span>
              <p className="text-xs text-slate-300 font-medium">
                {healthMsg || `Real-time sync active across ${pos.length} Purchase Orders and ${users.length} authorized users.`}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleRunHealthCheck}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>⚡ System Health Check</span>
              </button>
              {onClearAllPOs && (
                <button
                  type="button"
                  onClick={() => setIsClearAllOpen(true)}
                  className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Clear all POs from database"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear All POs</span>
                </button>
              )}
            </div>
          </div>

          {/* MAIN CONTAINER: RUNNING PO LIST & PURCHASER HOLD MONITOR */}
          <div className="space-y-4">
            
            {/* Running PO List (Full Width) */}
            <RunningPoList
              pos={pos}
              allowDelete={true}
              allowStatusChange={currentUser?.role === 'super_admin' || currentUser?.isSuperAdmin || currentUser?.name === 'RL TAKMIL' || currentUser?.name === 'RL MUSTAQ'}
              onHoldPO={onHoldPO}
              onReleasePO={onReleasePO}
              onSelectPo={(po) => setSelectedPoForDetail(po)}
              onDeletePO={(poNumber) => {
                if (onDeletePO) onDeletePO(poNumber);
                else setPoToDelete(poNumber);
              }}
              onDeletePo={(poNumber) => {
                if (onDeletePO) onDeletePO(poNumber);
                else setPoToDelete(poNumber);
              }}
              onClearAllPOs={onClearAllPOs}
            />

            {/* TWO-COLUMN SPLIT: PURCHASER HOLD MONITOR (LEFT) & ACTIVITY LOG (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* LEFT: PURCHASER HOLD MONITOR PANEL */}
              <div className="bg-white rounded-2xl border border-purple-200 p-4 space-y-3 shadow-2xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-100 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 bg-purple-100 text-purple-800 rounded-xl font-bold text-sm">🔒</span>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                          <span>Purchaser Hold Monitor</span>
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-xs font-black rounded-full border border-purple-200">
                            {heldItemsList.length} Items Locked
                          </span>
                        </h3>
                        <p className="text-[10px] text-slate-500">Items locked for active purchasing</p>
                      </div>
                    </div>

                    {/* Filter Purchaser */}
                    {uniqueHoldPurchasers.length > 0 && (
                      <div className="w-full sm:w-48">
                        <select
                          value={holdPurchaserFilter}
                          onChange={(e) => setHoldPurchaserFilter(e.target.value)}
                          className="w-full p-2 bg-purple-50/60 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                        >
                          <option value="ALL">All Purchasers ({uniqueHoldPurchasers.length})</option>
                          {uniqueHoldPurchasers.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Held Items List Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {displayHeldItems.map((item, idx) => {
                      const holderName = item.holdBy || item.holdByName || 'Admin';
                      const avatarUrl = getUserAvatar(holderName);

                      return (
                        <div key={idx} className="p-3 bg-purple-50/40 border border-purple-200/80 rounded-xl space-y-2 text-xs hover:bg-purple-50 transition shadow-2xs">
                          <div className="flex items-start justify-between gap-1.5">
                            <div>
                              <span className="font-mono font-bold text-purple-900 text-xs">PO #{item.poNumber}</span>
                              <h4 className="font-bold text-slate-900 text-xs leading-tight line-clamp-2">{item.itemName}</h4>
                            </div>
                            <span className="px-2 py-0.5 bg-purple-200 text-purple-900 text-[9px] font-black rounded uppercase shrink-0">
                              Hold
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-purple-100">
                            <div className="flex items-center gap-1.5">
                              <img src={avatarUrl} alt={holderName} className="w-4 h-4 rounded-full object-cover border border-purple-300 shrink-0" />
                              <span className="font-bold text-purple-900">{holderName}</span>
                            </div>
                            <span className="font-bold text-slate-800">{item.requestedQty || item.orderedQty || 0} {item.unit || 'pcs'}</span>
                          </div>
                        </div>
                      );
                    })}

                    {displayHeldItems.length === 0 && (
                      <div className="col-span-full p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No items currently on hold
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: ACTIVITY LOG PANEL */}
              <div className="bg-white rounded-2xl border border-purple-200 p-4 space-y-3 shadow-2xs flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 bg-purple-100 text-purple-800 rounded-xl font-bold text-sm">📋</span>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                          <span>Activity Log</span>
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-xs font-black rounded-full border border-purple-200">
                            {recentActivityLogs.length} Events
                          </span>
                        </h3>
                        <p className="text-[10px] text-slate-500">Live audit trail & recent user actions</p>
                      </div>
                    </div>
                  </div>

                  {/* Activity Log Scrollable List */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {recentActivityLogs.map((log, idx) => {
                      const userName = log.user || (log as any).userName || (log as any).userEmail || 'System';
                      const avatarUrl = getUserAvatar(userName);
                      const matchingUser = users.find(u => 
                        (u.name || '').trim().toLowerCase() === userName.trim().toLowerCase() ||
                        (u.username || '').trim().toLowerCase() === userName.trim().toLowerCase()
                      );
                      const rawRole = log.role || matchingUser?.role || 'admin';
                      const formattedRole = formatRoleLabel(rawRole);

                      return (
                        <div 
                          key={log.id ? `${log.id}-${idx}` : `log-${idx}`} 
                          className="p-3 bg-purple-50/40 border border-purple-200/80 rounded-xl space-y-2 text-xs hover:bg-purple-50 transition shadow-2xs"
                        >
                          {/* Top: User Photo / Avatar */}
                          <div className="flex items-start gap-2.5">
                            <img
                              src={avatarUrl}
                              alt={userName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-purple-200 shadow-2xs shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute('src', `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6b21a8&color=ffffff&bold=true`);
                              }}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs truncate leading-snug">{userName}</span>
                              {/* Role displayed directly below avatar/name */}
                              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-200/90 rounded-md text-[9px] font-black uppercase tracking-wide w-fit mt-0.5">
                                {formattedRole}
                              </span>
                            </div>
                          </div>

                          {/* Activity Description */}
                          <div className="bg-white/80 p-2.5 rounded-lg border border-purple-100 space-y-1">
                            <div className="font-extrabold text-purple-950 text-xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span>
                              <span>{log.action}</span>
                            </div>
                            {log.details && (
                              <p className="text-slate-700 text-[11px] leading-relaxed pl-3 font-medium">
                                {log.details}
                              </p>
                            )}
                          </div>

                          {/* Date and Time */}
                          <div className="text-[10px] font-mono text-slate-500 font-semibold pt-0.5 flex items-center justify-between">
                            <span>{formatActivityTimestamp(log.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {recentActivityLogs.length === 0 && (
                      <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No activity logs recorded yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* PO IMPORT TAB */}
      {activeTab === 'import' && (
        <AdminPoImportSection
          pos={pos}
          onImportPOs={onImportPOs}
        />
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <AdminUsersSection
          users={users}
          onUpdateUsers={onUpdateUsers}
          currentUser={currentUser}
          setUserToDelete={(u) => setUserToDelete(u ? u.id : null)}
        />
      )}

      {/* TELEGRAM BOT TAB */}
      {activeTab === 'telegram' && (
        <TelegramSettings onShowToast={onShowToast} />
      )}

      {/* SYSTEM TESTS TAB */}
      {activeTab === 'tests' && (
        <SystemTestsRunner
          pos={pos}
          users={users}
          currentUser={currentUser}
        />
      )}

      {/* SETUP & GUIDES TAB */}
      {activeTab === 'docs' && (
        <SystemDocsGuide />
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'logs' && (
        <AdminAuditLogsSection
          auditLogs={auditLogs}
          users={users}
          onShowToast={(title, message, type) => onShowToast?.(message, type === 'success')}
        />
      )}

      {/* MODAL: DELETE PO CONFIRMATION */}
      {poToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Delete PO #{poToDelete}?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete Purchase Order <strong>#{poToDelete}</strong>? This action will remove all line items and cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPoToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePoConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Delete PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CLEAR ALL POS CONFIRMATION */}
      {isClearAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Clear ALL Purchase Orders?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-rose-700">Warning:</strong> This will erase all {pos.length} Purchase Orders and line items from local storage.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Clear All POs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Delete User Account?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this user from the authorized roster?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLICKABLE STAT CARD REPORT MODAL */}
      <AdminReportModal
        selectedReport={selectedReport}
        setSelectedReport={setSelectedReport}
        reportSearchQuery={reportSearchQuery}
        setReportSearchQuery={setReportSearchQuery}
        reportPurchaserFilter={reportPurchaserFilter}
        setReportPurchaserFilter={setReportPurchaserFilter}
        getReportData={getReportData}
        handleExportReportCSV={handleExportReportCSV}
        setSelectedPoForDetail={setSelectedPoForDetail}
        uniqueHoldPurchasers={uniqueHoldPurchasers}
      />

      {/* INDIVIDUAL PO DETAILS MODAL */}
      <AdminPoDetailModal
        selectedPoForDetail={selectedPoForDetail}
        setSelectedPoForDetail={setSelectedPoForDetail}
        handleSendSinglePoTelegram={handleSendSinglePoTelegram}
        sendingPoNumber={sendingPoNumber}
        handlePrintPoReport={handlePrintPoReport}
        handleExportSinglePoExcel={handleExportSinglePoExcel}
      />

      {/* Custom Telegram Broadcast Alert Modal */}
      <AdminCustomAlertModal
        isCustomAlertModalOpen={isCustomAlertModalOpen}
        setIsCustomAlertModalOpen={setIsCustomAlertModalOpen}
        customAlertText={customAlertText}
        setCustomAlertText={setCustomAlertText}
        customAlertPriority={customAlertPriority}
        setCustomAlertPriority={setCustomAlertPriority}
        isSendingCustomAlert={isSendingCustomAlert}
        handleSendCustomAlert={handleSendCustomAlert}
      />

      {/* Global Universal Search Across All POs & Items Modal */}
      <AdminGlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        pos={pos}
        onSelectPO={(po) => setSelectedPoForDetail(po)}
      />

    </div>
  );
};
