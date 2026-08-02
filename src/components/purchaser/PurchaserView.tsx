import React, { useState, useEffect } from 'react';
import { PurchaseOrder, POItem, User, getNormalizedItemStatus } from '../../types';
import { RunningPoList } from '../RunningPoList';
import { 
  ShoppingBag, Search, Clock, CheckCircle2, Filter, 
  ChevronDown, ChevronUp, Lock, RefreshCw, X, History, Sparkles, AlertTriangle, RotateCcw, Printer, FileText
} from 'lucide-react';

interface PurchaserViewProps {
  pos: PurchaseOrder[];
  currentUser: User;
  onHoldItem: (itemId: string) => { success: boolean; message: string };
  onReleaseHold: (itemId: string) => { success: boolean; message: string };
  onRecordPurchase: (itemId: string, purchasedQty: number, notes: string) => { success: boolean; message: string };
  onReturnItem?: (itemId: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  onSync?: () => void;
  isSyncing?: boolean;
}

export const PurchaserView: React.FC<PurchaserViewProps> = ({
  pos,
  currentUser,
  onHoldItem,
  onReleaseHold,
  onRecordPurchase,
  onReturnItem,
  onSync,
  isSyncing
}) => {
  // Load Saved Filters from localStorage
  const savedFiltersStr = localStorage.getItem('purchaser_filters');
  const initialFilters = savedFiltersStr ? JSON.parse(savedFiltersStr) : {
    location: 'all',
    department: 'all',
    poNumber: 'all',
    itemName: ''
  };

  // Filters State - Default Collapsed
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [filterLocation, setFilterLocation] = useState<string>(initialFilters.location || 'all');
  const [filterDepartment, setFilterDepartment] = useState<string>(initialFilters.department || 'all');
  const [filterPoNumber, setFilterPoNumber] = useState<string>(initialFilters.poNumber || 'all');
  const [filterItemName, setFilterItemName] = useState<string>(initialFilters.itemName || '');

  // Persist Filters
  useEffect(() => {
    localStorage.setItem('purchaser_filters', JSON.stringify({
      location: filterLocation,
      department: filterDepartment,
      poNumber: filterPoNumber,
      itemName: filterItemName
    }));
  }, [filterLocation, filterDepartment, filterPoNumber, filterItemName]);

  // Status Filter: 'pending' | 'hold' | 'partial' | 'today'
  const [statusFilter, setStatusFilter] = useState<'pending' | 'hold' | 'partial' | 'today'>('pending');

  // Card Expansion State (itemId -> boolean)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Purchase Modal State
  const [purchaseModalItem, setPurchaseModalItem] = useState<POItem | null>(null);
  const [purchaseQtyInput, setPurchaseQtyInput] = useState<string>('');
  const [purchaseNotesInput, setPurchaseNotesInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionLoadingItemId, setActionLoadingItemId] = useState<string | null>(null);

  // Hold View Scope ('my' = holds by logged in purchaser, 'all' = all holds in ERP system)
  const [holdViewScope, setHoldViewScope] = useState<'my' | 'all'>('my');

  // History Toggle
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const showNotification = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Normalize status helper
  const normalizeStatus = (status?: string): 'Pending' | 'Held' | 'Purchased' | 'Partial Purchased' => {
    if (!status) return 'Pending';
    const s = String(status).trim().toLowerCase();
    if (s === 'held' || s === 'hold') return 'Held';
    if (s === 'purchased' || s === 'completed') return 'Purchased';
    if (s === 'partial purchased' || s === 'partial') return 'Partial Purchased';
    return 'Pending';
  };

  // All PO items for purchaser view mapped across all POs
  const allItems: POItem[] = pos.flatMap(po => {
    return (po.items || []).map(item => {
      const normStatus = getNormalizedItemStatus({
        ...item,
        isHeldByAdmin: po.isHeldByAdmin || po.purchaseStatus === 'Held'
      });
      const isHeld = normStatus === 'Held' || po.isHeldByAdmin || po.purchaseStatus === 'Held';

      return {
        ...item,
        purchaseStatus: isHeld ? ('Held' as const) : normStatus,
        holdBy: isHeld ? (item.holdBy || item.holdByName || item.purchaserName || po.holdByAdmin || po.createdBy || 'Admin') : '',
        holdById: isHeld ? (item.holdById || '') : '',
        holdByName: isHeld ? (item.holdByName || item.holdBy || item.purchaserName || po.holdByAdmin || po.createdBy || 'Admin') : '',
        holdStartTime: isHeld ? (item.holdStartTime || item.holdSince || po.adminHoldAt || new Date().toISOString()) : '',
        holdSince: isHeld ? (item.holdSince || item.holdStartTime || po.adminHoldAt || new Date().toISOString()) : '',
        holdExpireTime: '',
        poNumber: item.poNumber || po.poNumber,
        location: item.location || po.location || 'Central Warehouse',
        department: item.department || po.department || 'General',
        orderDate: item.orderDate || po.orderDate,
        deliveryDate: item.deliveryDate || po.deliveryDate
      };
    });
  });

  // Filter out POs that are explicitly placed on Hold by Admin for PO metrics
  const purchaserPOs = pos.filter(po => !po.isHeldByAdmin);

  // Dropdown lists
  const locations = Array.from(new Set(allItems.map(i => i.location || 'Central Warehouse'))).filter(Boolean);
  const departments = Array.from(new Set(allItems.map(i => i.department || 'General'))).filter(Boolean);
  const poNumbers = Array.from(new Set(purchaserPOs.map(p => p.poNumber))).filter(Boolean);

  // Active sanitized filter values so stale filters don't hide newly imported POs
  const activeLocationFilter = (filterLocation === 'all' || locations.includes(filterLocation)) ? filterLocation : 'all';
  const activeDepartmentFilter = (filterDepartment === 'all' || departments.includes(filterDepartment)) ? filterDepartment : 'all';
  const activePoNumberFilter = (filterPoNumber === 'all' || poNumbers.includes(filterPoNumber)) ? filterPoNumber : 'all';

  // Date check helper for today's purchases
  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  };

  // System-wide Metrics (exact calculations matching Purchaser Viewable POs)
  const systemTotalPO = purchaserPOs.length;
  const systemPendingPO = purchaserPOs.filter(p => p.purchaseStatus === 'Pending' || p.status === 'pending').length;
  const systemPartialPO = purchaserPOs.filter(p => p.purchaseStatus === 'Partial' || p.status === 'in_progress').length;
  const systemCompletedPO = purchaserPOs.filter(p => p.purchaseStatus === 'Completed' || p.status === 'purchased' || p.status === 'verified').length;

  const systemTotalItems = allItems.length;
  const systemPendingItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Pending').length;
  const systemHeldItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Held').length;
  const systemPartialItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Partial Purchased').length;
  const systemPurchasedItemsCount = allItems.filter(i => getNormalizedItemStatus(i) === 'Purchased').length;

  // Personal / Actionable Counts
  const myPendingItems = allItems.filter(item => getNormalizedItemStatus(item) === 'Pending');

  const myHoldItems = allItems.filter(item => {
    const isHeld = getNormalizedItemStatus(item) === 'Held';
    const holdByStr = String(item.holdBy || item.holdByName || '').trim().toLowerCase();
    const holdByIdStr = String(item.holdById || '').trim();
    const currentNameStr = String(currentUser.name || '').trim().toLowerCase();
    const currentIdStr = String(currentUser.id || '').trim();
    return isHeld && (holdByStr === currentNameStr || (holdByIdStr && holdByIdStr === currentIdStr));
  });

  const myPurchasedItems = allItems.filter(item => {
    const st = getNormalizedItemStatus(item);
    return (item.purchaserId === currentUser.id || item.purchaserName === currentUser.name) && 
           (st === 'Purchased' || st === 'Partial Purchased');
  });

  const myTodayPurchases = allItems.filter(item => {
    const isPurchasedByMe = (item.purchaserName === currentUser.name || item.purchaserId === currentUser.id || !item.purchaserName);
    const st = getNormalizedItemStatus(item);
    const isPurchased = (item.purchasedQty && item.purchasedQty > 0) || st === 'Purchased' || st === 'Partial Purchased';
    if (!isPurchased || !isPurchasedByMe) return false;

    const purchasedToday = isToday(item.purchasedAt) || isToday(item.updatedDate);
    return purchasedToday;
  });

  // Filter items
  const filteredItems = allItems.filter(item => {
    const st = getNormalizedItemStatus(item);

    // 1. Status Tab
    if (statusFilter === 'pending') {
      if (st !== 'Pending') return false;
    } else if (statusFilter === 'hold') {
      if (st !== 'Held') return false;
      if (holdViewScope === 'my') {
        const holdByStr = String(item.holdBy || '').trim().toLowerCase();
        const currentNameStr = String(currentUser.name || '').trim().toLowerCase();
        if (holdByStr !== currentNameStr) return false;
      }
    } else if (statusFilter === 'partial') {
      if (st !== 'Partial Purchased') return false;
    } else if (statusFilter === 'today') {
      const isPurchasedByMe = (item.purchaserName === currentUser.name || item.purchaserId === currentUser.id || !item.purchaserName);
      const isPurchased = (item.purchasedQty && item.purchasedQty > 0) || st === 'Purchased' || st === 'Partial Purchased';
      if (!isPurchased || !isPurchasedByMe) return false;

      const purchasedToday = isToday(item.purchasedAt) || isToday(item.updatedDate);
      if (!purchasedToday) return false;
    }

    // 2. Expandable Filter Panel
    if (activeLocationFilter !== 'all' && (item.location || 'Central Warehouse') !== activeLocationFilter) return false;
    if (activeDepartmentFilter !== 'all' && (item.department || 'General') !== activeDepartmentFilter) return false;
    if (activePoNumberFilter !== 'all' && item.poNumber !== activePoNumberFilter) return false;

    // 3. Item Name Filter
    if (filterItemName.trim() !== '') {
      const q = filterItemName.toLowerCase();
      if (!item.itemName.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const purchaseHistoryItems = allItems.filter(item => {
    return item.purchasedQty > 0 || item.purchaseStatus === 'Purchased' || item.purchaseStatus === 'Partial Purchased';
  });

  const toggleCardExpand = (itemId: string) => {
    setExpandedCards(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleHoldClick = async (e: React.MouseEvent, item: POItem) => {
    e.stopPropagation();
    if (actionLoadingItemId === item.id) return;
    setActionLoadingItemId(item.id);
    try {
      const res = await Promise.resolve(onHoldItem(item.id));
      if (res.success) {
        showNotification(res.message, 'success');
        if (onSync) onSync();
      } else {
        showNotification(res.message, 'error');
      }
    } catch {
      showNotification('Failed to hold item. Please try again.', 'error');
    } finally {
      setActionLoadingItemId(null);
    }
  };

  const handleReleaseHoldClick = async (e: React.MouseEvent, item: POItem) => {
    e.stopPropagation();
    if (actionLoadingItemId === item.id) return;
    setActionLoadingItemId(item.id);
    try {
      const res = await Promise.resolve(onReleaseHold(item.id));
      if (res.success) {
        showNotification(res.message, 'success');
        if (onSync) onSync();
      } else {
        showNotification(res.message, 'error');
      }
    } catch {
      showNotification('Failed to release hold. Please try again.', 'error');
    } finally {
      setActionLoadingItemId(null);
    }
  };

  const handleReturnClick = async (e: React.MouseEvent, item: POItem) => {
    e.stopPropagation();
    if (actionLoadingItemId === item.id || isSubmitting) return;
    if (!onReturnItem) return;

    setActionLoadingItemId(item.id);
    try {
      const res = await Promise.resolve(onReturnItem(item.id));
      if (res.success) {
        showNotification(res.message || `Returned "${item.itemName}" back to Pending list`, 'success');
        if (onSync) onSync();
      } else {
        showNotification(res.message || 'Failed to return item', 'error');
      }
    } catch (err: unknown) {
      showNotification((err as Error)?.message || 'Failed to return item', 'error');
    } finally {
      setActionLoadingItemId(null);
    }
  };

  const openPurchasePopup = (e: React.MouseEvent, item: POItem) => {
    e.stopPropagation();
    if (isSubmitting || actionLoadingItemId === item.id) return;
    const currentRemaining = item.remainingQty !== undefined ? item.remainingQty : item.requestedQty;
    
    if (item.purchaseStatus === 'Held' && item.holdBy && item.holdBy !== currentUser.name) {
      showNotification("This item is currently on hold by another purchaser.", 'error');
      return;
    }

    setPurchaseModalItem(item);
    setPurchaseQtyInput(currentRemaining.toString());
    setPurchaseNotesInput('');
    setModalError(null);
  };

  const handleConfirmPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseModalItem || isSubmitting) return;

    const qty = parseFloat(purchaseQtyInput);
    const currentRemaining = purchaseModalItem.remainingQty !== undefined ? purchaseModalItem.remainingQty : purchaseModalItem.requestedQty;

    if (isNaN(qty) || qty <= 0) {
      setModalError('Purchased Quantity must be greater than zero.');
      return;
    }

    if (qty > currentRemaining) {
      setModalError(`Purchased Quantity (${qty}) cannot exceed Remaining Quantity (${currentRemaining}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await Promise.resolve(onRecordPurchase(purchaseModalItem.id, qty, purchaseNotesInput.trim()));
      if (res.success) {
        showNotification(res.message, 'success');
        setPurchaseModalItem(null);
        if (onSync) onSync();
      } else {
        setModalError(res.message);
      }
    } catch (err: unknown) {
      setModalError((err as Error)?.message || 'Error recording purchase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCountdown = () => 'On Hold';

  const hasActiveFilters = activeLocationFilter !== 'all' || activeDepartmentFilter !== 'all' || activePoNumberFilter !== 'all' || !!filterItemName;

  // Print & Save PDF Report for Purchaser
  const handlePrintPurchaserPdf = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert("Please allow popups to generate and save PDF report.");
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const activeTabLabel = showHistory 
      ? 'Purchase History Report'
      : statusFilter === 'pending' ? 'Pending Items Market Report'
      : statusFilter === 'hold' ? (holdViewScope === 'my' ? 'My Holds Report' : 'All System Holds Report')
      : statusFilter === 'partial' ? 'Partial Purchased Items Report'
      : 'Today\'s Purchases Report';

    const itemsToPrint = showHistory ? purchaseHistoryItems : filteredItems;

    const rowsHtml = itemsToPrint.map((item, idx) => {
      const st = getNormalizedItemStatus(item);
      const req = item.requestedQty || item.orderedQty || 0;
      const pur = item.purchasedQty || 0;
      const unit = item.unit || 'pcs';
      const statusColor = st === 'Purchased' ? '#166534' : st === 'Held' ? '#6b21a8' : st === 'Partial Purchased' ? '#1e40af' : '#92400e';
      const statusBg = st === 'Purchased' ? '#dcfce7' : st === 'Held' ? '#f3e8ff' : st === 'Partial Purchased' ? '#dbeafe' : '#fef3c7';

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold; font-family: monospace; color: #1e293b;">${item.poNumber || '-'}</td>
          <td style="padding: 8px; font-weight: 700; color: #0f172a;">${item.itemName}</td>
          <td style="padding: 8px; color: #475569;">${item.brand || '-'}</td>
          <td style="padding: 8px; color: #475569;">${item.department || '-'}</td>
          <td style="padding: 8px; color: #475569;">${item.location || '-'}</td>
          <td style="padding: 8px; text-align: center; font-weight: 700; color: #0f172a;">${req} ${unit}</td>
          <td style="padding: 8px; text-align: center; font-weight: 700; color: ${pur > 0 ? '#15803d' : '#64748b'};">${pur} ${unit}</td>
          <td style="padding: 8px; text-align: center;">
            <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; display: inline-block;">
              ${st}
            </span>
          </td>
          <td style="padding: 8px; font-size: 11px; color: #475569;">
            ${st === 'Held' ? `🔒 Hold by: ${item.holdBy || item.holdByName || 'Admin'}` : (item.notes || '-')}
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>RL FOOD - Purchaser Report (${currentUser.name})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              margin: 0;
              padding: 24px;
              color: #0f172a;
              background-color: #ffffff;
            }
            .no-print {
              display: flex;
              justify-content: flex-end;
              gap: 8px;
              margin-bottom: 20px;
            }
            .btn-print {
              padding: 10px 20px;
              background-color: #6b21a8;
              color: #ffffff;
              border: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 13px;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn-close {
              padding: 10px 16px;
              background-color: #e2e8f0;
              color: #334155;
              border: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 13px;
              cursor: pointer;
            }
            .header-box {
              border-bottom: 3px solid #6b21a8;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 800;
              color: #581c87;
              letter-spacing: -0.5px;
            }
            .sub-title {
              font-size: 14px;
              font-weight: 700;
              color: #475569;
              margin-top: 2px;
            }
            .meta-text {
              font-size: 12px;
              color: #64748b;
              text-align: right;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .kpi-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
            }
            .kpi-label {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #64748b;
            }
            .kpi-val {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th {
              background-color: #f1f5f9;
              color: #334155;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 10px;
              padding: 10px 8px;
              text-align: left;
              border-bottom: 2px solid #cbd5e1;
            }
            .footer-note {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #e2e8f0;
              font-size: 11px;
              color: #94a3b8;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              .no-print {
                display: none !important;
              }
              body {
                padding: 0;
              }
              @page {
                size: A4 landscape;
                margin: 12mm 10mm 12mm 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn-print" onclick="window.print()">🖨️ Save as PDF / Print</button>
            <button class="btn-close" onclick="window.close()">Close Window</button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px;">
            <div>
              <h1 style="font-family: 'Times New Roman', serif; font-size: 26px; font-weight: 800; color: #111; letter-spacing: 1px; margin: 0;">RADIANT LIGHTNING</h1>
              <div style="background-color: #769d24; color: #fff; padding: 2px 14px; border-radius: 4px; font-style: italic; font-size: 14px; display: inline-block; margin-top: 2px; font-weight: bold;">
                Premium Food Supply
              </div>
              <div style="font-size: 13px; font-weight: 800; color: #581c87; margin-top: 6px;">${activeTabLabel}</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #334155; font-weight: bold;">
              <div style="font-size: 36px; font-weight: 900; color: #2e382b; letter-spacing: -2px; line-height: 1;">RL</div>
              <div><strong>Purchaser:</strong> ${currentUser.name}</div>
              <div><strong>Generated:</strong> ${todayStr}</div>
              <div><strong>Total Items:</strong> ${itemsToPrint.length}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Pending Items</div>
              <div class="kpi-val" style="color: #d97706;">${myPendingItems.length}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">My Holds</div>
              <div class="kpi-val" style="color: #7e22ce;">${myHoldItems.length}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Partial Items</div>
              <div class="kpi-val" style="color: #1d4ed8;">${systemPartialItemsCount}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Report Items</div>
              <div class="kpi-val" style="color: #0f172a;">${itemsToPrint.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">SL</th>
                <th style="width: 12%;">PO Number</th>
                <th>Item Name</th>
                <th style="width: 12%;">Brand</th>
                <th style="width: 12%;">Department</th>
                <th style="width: 12%;">Location</th>
                <th style="width: 10%; text-align: center;">Req Qty</th>
                <th style="width: 10%; text-align: center;">Pur Qty</th>
                <th style="width: 12%; text-align: center;">Status</th>
                <th style="width: 14%;">Notes / Hold</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="10" style="padding: 20px; text-align: center; color: #94a3b8;">No items found for this report</td></tr>'}
            </tbody>
          </table>

          <div style="margin-top: 30px; border-top: 1.5px solid #6b7280; padding-top: 8px; text-align: center; font-size: 10px; font-weight: bold; color: #111;">
            <div style="direction: rtl; font-family: 'Amiri', serif; font-size: 12px; margin-bottom: 2px;">
              المملكة العربية السعودية - الرياض - ت: ٢٤٤٤ ٦٩٥ ٥٦ ٩٦٦+ - ٣٥٧٦ ٤١١ ٥٠ ٩٦٦+ - ست: ١٠١٠٧٩٤٠٧٥
            </div>
            <div>
              Riyadh - Kingdom of Saudi Arabia Tel: +966 56 695 2444, +966 50 411 3576 - C.R 1010794075
            </div>
            <div style="color: #769d24;">
              ✉ sales@radiantlightning.com
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="max-w-2xl mx-auto px-2.5 sm:px-4 py-3 space-y-3 font-sans text-slate-900">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 mx-auto px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 border ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
            : 'bg-rose-900 text-rose-100 border-rose-700'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span className="flex-1">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Bar - Compact Enterprise ERP */}
      <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold leading-tight">Purchaser Dashboard</h1>
          <p className="text-[11px] text-slate-400">Purchaser: <span className="text-slate-200 font-bold">{currentUser.name}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPurchaserPdf}
            className="px-2.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs border border-purple-600 active:scale-95 cursor-pointer"
            title="Print or Save PDF Report of Purchaser Items"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save PDF</span>
            <span className="inline sm:hidden">PDF</span>
          </button>
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
              title="Sync Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              showHistory ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* SYSTEM OPERATIONS KPI BANNER - Matches Admin Dashboard Metrics */}
      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span className="flex items-center gap-1 text-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            System Operations Metrics
          </span>
          <span className="text-slate-500 font-medium">Total POs: <strong className="text-slate-900 font-bold">{systemTotalPO}</strong> | Total Items: <strong className="text-slate-900 font-bold">{systemTotalItems}</strong></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
          <div className="bg-white border border-amber-200 p-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-amber-700 uppercase block">Pending Items</span>
            <span className="text-sm font-black text-amber-900">{systemPendingItemsCount}</span>
          </div>
          <div className="bg-white border border-purple-200 p-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-purple-700 uppercase block">System Holds</span>
            <span className="text-sm font-black text-purple-900">{systemHeldItemsCount}</span>
          </div>
          <div className="bg-white border border-blue-200 p-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">Partial Items</span>
            <span className="text-sm font-black text-blue-900">{systemPartialItemsCount}</span>
          </div>
          <div className="bg-white border border-emerald-200 p-1.5 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Purchased Items</span>
            <span className="text-sm font-black text-emerald-900">{systemPurchasedItemsCount}</span>
          </div>
        </div>
      </div>

      {/* RUNNING PO LIST (ACTIVE ORDERS) */}
      <RunningPoList pos={pos} allowDelete={false} allowStatusChange={false} />

      {/* COMPACT EXPANDABLE FILTER PANEL - Default Collapsed */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Panel</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>{isFilterExpanded ? 'Hide' : 'Expand'}</span>
            {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isFilterExpanded && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Field 1: Location */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                <select
                  value={activeLocationFilter}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-xs"
                >
                  <option value="all">All Locations</option>
                  {locations.map((loc, idx) => (
                    <option key={`${loc}-${idx}`} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Field 2: Department */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Department</label>
                <select
                  value={activeDepartmentFilter}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-xs"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept, idx) => (
                    <option key={`${dept}-${idx}`} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Field 3: PO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">PO Number</label>
                <select
                  value={activePoNumberFilter}
                  onChange={(e) => setFilterPoNumber(e.target.value)}
                  className="w-full mt-0.5 p-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-xs"
                >
                  <option value="all">All PO Numbers</option>
                  {poNumbers.map((po, idx) => (
                    <option key={`${po}-${idx}`} value={po}>{po}</option>
                  ))}
                </select>
              </div>

              {/* Field 4: Item Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Item Name</label>
                <div className="relative mt-0.5">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={filterItemName}
                    onChange={(e) => setFilterItemName(e.target.value)}
                    placeholder="Search item name..."
                    className="w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs outline-hidden"
                  />
                  {filterItemName && (
                    <button 
                      onClick={() => setFilterItemName('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setFilterLocation('all');
                    setFilterDepartment('all');
                    setFilterPoNumber('all');
                    setFilterItemName('');
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STATUS TABS */}
      {!showHistory && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Pending</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 rounded-full font-bold shrink-0">
                {myPendingItems.length}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('hold')}
              className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                statusFilter === 'hold'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">Hold</span>
              <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 rounded-full font-bold shrink-0" title={`My Holds: ${myHoldItems.length} | System Total: ${systemHeldItemsCount}`}>
                {myHoldItems.length} / {systemHeldItemsCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('partial')}
              className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                statusFilter === 'partial'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Partial</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 rounded-full font-bold shrink-0">
                {systemPartialItemsCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('today')}
              className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                statusFilter === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Today Purchase</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 rounded-full font-bold shrink-0">
                {myTodayPurchases.length}
              </span>
            </button>
          </div>

          {/* Scope selector when viewing Hold items */}
          {statusFilter === 'hold' && (
            <div className="bg-purple-50 border border-purple-200 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-purple-950">
                <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-purple-950">
                    {holdViewScope === 'my' 
                      ? `Showing ${myHoldItems.length} item(s) on hold by ${currentUser.name}` 
                      : `Showing all ${systemHeldItemsCount} item(s) on hold across system`}
                  </span>
                  <span className="text-[10px] text-purple-700 font-normal">
                    {holdViewScope === 'my'
                      ? `(System total holds: ${systemHeldItemsCount})`
                      : `(Your personal holds: ${myHoldItems.length})`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-purple-200 shadow-2xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHoldViewScope('my')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition flex items-center gap-1.5 ${
                    holdViewScope === 'my' 
                      ? 'bg-purple-700 text-white shadow-2xs' 
                      : 'text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <span>My Holds</span>
                  <span className="bg-purple-200 text-purple-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">{myHoldItems.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHoldViewScope('all')}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition flex items-center gap-1.5 ${
                    holdViewScope === 'all' 
                      ? 'bg-purple-700 text-white shadow-2xs' 
                      : 'text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <span>All System Holds</span>
                  <span className="bg-purple-200 text-purple-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">{systemHeldItemsCount}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASER BUYING LIST */}
      {!showHistory ? (
        <div className="space-y-2">
          {/* List Header Bar with Quick Save PDF Button */}
          <div className="flex items-center justify-between bg-slate-100/90 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-700" />
              <span>
                {statusFilter === 'pending' ? 'Pending Market Items' :
                 statusFilter === 'hold' ? 'Hold Items List' :
                 statusFilter === 'partial' ? 'Partial Purchased Items' : 'Today\'s Purchases'}
                ({filteredItems.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handlePrintPurchaserPdf}
              className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer"
              title="Print or Save PDF Report of current items"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Save PDF</span>
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-slate-200 space-y-1">
              <Clock className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-slate-700 font-bold text-xs">No market items match selected status / filters.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isExpanded = !!expandedCards[item.id];
              const holdByNorm = String(item.holdBy || '').trim().toLowerCase();
              const userNorm = String(currentUser.name || '').trim().toLowerCase();
              const isHeldByMe = item.purchaseStatus === 'Held' && holdByNorm === userNorm;
              const isHeldByOther = item.purchaseStatus === 'Held' && Boolean(holdByNorm) && holdByNorm !== userNorm;
              
              const orderedQty = item.requestedQty || item.orderedQty || 0;
              const purchasedQty = item.purchasedQty || 0;
              const remainingQty = item.remainingQty !== undefined ? item.remainingQty : Math.max(0, orderedQty - purchasedQty);

              return (
                <div
                  key={item.id ? `${item.id}-${idx}` : `item-${idx}`}
                  onClick={() => toggleCardExpand(item.id)}
                  className={`bg-white rounded-xl border transition-all shadow-2xs overflow-hidden cursor-pointer ${
                    isHeldByMe 
                      ? 'border-purple-300 bg-purple-50/10' 
                      : item.purchaseStatus === 'Partial Purchased'
                      ? 'border-blue-300 bg-blue-50/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* DEFAULT COLLAPSED CARD: PO Number, Item Name, Status, HOLD button, PURCHASE button. NOTHING ELSE. */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {item.poNumber}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          item.purchaseStatus === 'Held' ? 'bg-purple-100 text-purple-800' :
                          item.purchaseStatus === 'Partial Purchased' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.purchaseStatus === 'Held' ? 'Hold' : (item.purchaseStatus || 'Pending')}
                        </span>
                        {item.purchaseStatus === 'Held' && (
                          <span className="text-[11px] font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>Held By: {item.holdBy || item.holdByName || 'Admin'}</span>
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px] font-black shrink-0">
                        SL #{idx + 1}
                      </span>
                      <span>{item.itemName}</span>
                    </h2>

                    {/* Notice if item is held by another purchaser */}
                    {isHeldByOther && (
                      <div className="bg-purple-100/90 border border-purple-300 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold text-purple-950">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          <span>Held by: <span className="font-black text-purple-900">{item.holdBy}</span></span>
                        </span>
                        <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                          Locked
                        </span>
                      </div>
                    )}

                    {/* IF TODAY PURCHASE: SHOW PURCHASED QTY DISPLAY & RETURN BUTTON */}
                    {statusFilter === 'today' ? (
                      <div className="space-y-2 mt-1">
                        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">Today Purchased</span>
                              <p className="text-xs font-bold text-emerald-950">
                                Purchased: <span className="text-sm font-black text-emerald-700">{purchasedQty} {item.unit}</span>
                                {orderedQty > 0 && (
                                  <span className="text-[11px] font-medium text-slate-500 ml-1.5">(Ordered: {orderedQty} {item.unit})</span>
                                )}
                              </p>
                            </div>
                          </div>
                          {remainingQty > 0 ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold shrink-0">
                              Rem: {remainingQty} {item.unit}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold shrink-0">
                              Completed
                            </span>
                          )}
                        </div>

                        {/* RETURN ITEM BUTTON */}
                        <button
                          onClick={(e) => handleReturnClick(e, item)}
                          disabled={actionLoadingItemId === item.id || isSubmitting}
                          className="w-full min-h-[38px] bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 text-amber-700 ${actionLoadingItemId === item.id ? 'animate-spin' : ''}`} />
                          <span>{actionLoadingItemId === item.id ? 'Returning Item...' : 'Return Item to Pending'}</span>
                        </button>
                      </div>
                    ) : (
                      /* TWO LARGE TOUCH-FRIENDLY BUTTONS: [ HOLD ] and [ PURCHASE ] */
                      <div className="flex items-center gap-2 pt-1">
                        {item.purchaseStatus === 'Held' && isHeldByMe ? (
                          <button
                            onClick={(e) => handleReleaseHoldClick(e, item)}
                            disabled={actionLoadingItemId === item.id || isSubmitting}
                            className="flex-1 min-h-[40px] bg-purple-100 hover:bg-purple-200 disabled:opacity-40 text-purple-900 border border-purple-300 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                            title="Cancel hold & return item to Pending list"
                          >
                            <Lock className={`w-3.5 h-3.5 text-purple-700 ${actionLoadingItemId === item.id ? 'animate-spin' : ''}`} />
                            {actionLoadingItemId === item.id ? 'Releasing...' : 'RELEASE HOLD (REVERT TO PENDING)'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleHoldClick(e, item)}
                            disabled={isHeldByOther || item.purchaseStatus === 'Partial Purchased' || actionLoadingItemId === item.id || isSubmitting}
                            className="flex-1 min-h-[40px] bg-slate-100 hover:bg-purple-100 disabled:opacity-40 text-slate-800 hover:text-purple-900 border border-slate-200 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                            title={isHeldByOther ? `Locked: Currently on hold by ${item.holdBy}` : "Hold item"}
                          >
                            <Lock className={`w-3.5 h-3.5 text-purple-600 ${actionLoadingItemId === item.id ? 'animate-spin' : ''}`} />
                            {actionLoadingItemId === item.id ? 'Holding...' : 'HOLD ITEM'}
                          </button>
                        )}

                        <button
                          onClick={(e) => openPurchasePopup(e, item)}
                          disabled={isHeldByOther || isSubmitting || actionLoadingItemId === item.id}
                          className="flex-1 min-h-[40px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98"
                          title={isHeldByOther ? `Locked: Currently on hold by ${item.holdBy}` : "Record purchase"}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          PURCHASE
                        </button>
                      </div>
                    )}
                  </div>

                  {/* EXPANDED CARD DETAILS */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-3 space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Brand</p>
                          <p className="font-medium text-slate-800">{item.brand || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Unit</p>
                          <p className="font-bold text-slate-900">{item.unit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Ordered Qty</p>
                          <p className="font-bold text-slate-900">{orderedQty} {item.unit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Purchased Qty</p>
                          <p className="font-bold text-emerald-700">{purchasedQty} {item.unit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Remaining Qty</p>
                          <p className="font-bold text-amber-700">{remainingQty} {item.unit}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Department</p>
                          <p className="font-medium text-slate-800">{item.department || 'General'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                          <p className="font-medium text-slate-800">{item.location || 'Central Warehouse'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Delivery Date</p>
                          <p className="font-medium text-slate-800">{item.deliveryDate || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Hold Remaining Time if held */}
                      {item.purchaseStatus === 'Held' && (
                        <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5 text-purple-600" />
                            Hold By: {item.holdBy}
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                            Status: On Hold
                          </span>
                        </div>
                      )}

                      {/* Expanded Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {statusFilter !== 'today' && (
                          <button
                            onClick={(e) => openPurchasePopup(e, item)}
                            disabled={isHeldByOther || isSubmitting || actionLoadingItemId === item.id}
                            className="flex-1 min-h-[38px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition"
                          >
                            Confirm Purchase
                          </button>
                        )}
                        {statusFilter !== 'today' && item.purchaseStatus === 'Held' && isHeldByMe && (
                          <button
                            onClick={(e) => handleReleaseHoldClick(e, item)}
                            disabled={actionLoadingItemId === item.id || isSubmitting}
                            className="flex-1 min-h-[38px] bg-purple-100 hover:bg-purple-200 disabled:opacity-40 text-purple-800 font-bold text-xs rounded-lg transition"
                          >
                            {actionLoadingItemId === item.id ? 'Releasing...' : 'Release Hold'}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCardExpand(item.id); }}
                          className={`${statusFilter === 'today' ? 'w-full' : 'px-3'} min-h-[38px] bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg border border-slate-200`}
                        >
                          Collapse
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              Completed Purchases Today
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPurchaserPdf}
                className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Save PDF / Print History Report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Save PDF</span>
              </button>
              <button onClick={() => setShowHistory(false)} className="text-xs font-bold text-blue-600 hover:underline">
                Back to List
              </button>
            </div>
          </div>

          {purchaseHistoryItems.length === 0 ? (
            <p className="text-center py-4 text-xs text-slate-400">No purchases recorded today.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {purchaseHistoryItems.map((item, idx) => (
                <div key={item.id ? `${item.id}-${idx}` : `hist-${idx}`} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-blue-700">{item.poNumber}</span>
                    <p className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-800 text-white font-mono text-[10px] font-black shrink-0">
                        SL #{idx + 1}
                      </span>
                      <span>{item.itemName}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Purchased: <span className="font-bold text-emerald-700">{item.purchasedQty} {item.unit}</span> ({item.purchaseStatus})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleReturnClick(e, item)}
                    disabled={actionLoadingItemId === item.id || isSubmitting}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] rounded-lg transition flex items-center gap-1 shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 text-amber-700 ${actionLoadingItemId === item.id ? 'animate-spin' : ''}`} />
                    <span>{actionLoadingItemId === item.id ? 'Returning...' : 'Return to Pending'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PURCHASE POPUP MODAL */}
      {purchaseModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleConfirmPurchaseSubmit}
            className="bg-white rounded-t-2xl sm:rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {purchaseModalItem.poNumber}
                </span>
                <h3 className="font-bold text-slate-900 text-sm leading-tight mt-0.5">
                  {purchaseModalItem.itemName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Ordered Target</span>
                <p className="font-bold text-slate-800">{purchaseModalItem.requestedQty || purchaseModalItem.orderedQty} {purchaseModalItem.unit}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Max Remaining</span>
                <p className="font-bold text-amber-700">
                  {purchaseModalItem.remainingQty !== undefined ? purchaseModalItem.remainingQty : purchaseModalItem.requestedQty} {purchaseModalItem.unit}
                </p>
              </div>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-800 uppercase">
                Purchased Qty ({purchaseModalItem.unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                value={purchaseQtyInput}
                onChange={(e) => {
                  setPurchaseQtyInput(e.target.value);
                  setModalError(null);
                }}
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-lg font-bold text-base text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 uppercase">
                Optional Remarks
              </label>
              <textarea
                rows={2}
                value={purchaseNotesInput}
                onChange={(e) => setPurchaseNotesInput(e.target.value)}
                placeholder="Market vendor notes, batch notes..."
                className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPurchaseModalItem(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center justify-center gap-2 active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Purchase</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
