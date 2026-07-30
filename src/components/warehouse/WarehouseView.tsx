import React, { useState, useEffect } from 'react';
import { PurchaseOrder, POItem, User } from '../../types';
import { Warehouse, CheckCircle2, Clock, Search, Filter, RefreshCw, Printer, AlertTriangle, ShieldCheck, History, Send, AlertCircle } from 'lucide-react';

interface WarehouseViewProps {
  pos: PurchaseOrder[];
  currentUser: User;
  onReceiveComplete: (
    itemId: string,
    receivedBatchQty?: number,
    passedBatchQty?: number,
    damagedBatchQty?: number,
    qcNotes?: string
  ) => { success: boolean; message: string } | Promise<{ success: boolean; message: string }>;
  onSync?: () => void;
  isSyncing?: boolean;
}

export const WarehouseView: React.FC<WarehouseViewProps> = ({
  pos,
  currentUser,
  onReceiveComplete,
  onSync,
  isSyncing
}) => {
  // Load Filters from localStorage
  const savedFiltersStr = localStorage.getItem('warehouse_filters');
  const initialFilters = savedFiltersStr ? JSON.parse(savedFiltersStr) : {
    location: 'all',
    department: 'all',
    poNumber: 'all',
    purchaserName: 'all',
    itemName: ''
  };

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>(initialFilters.location || 'all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(initialFilters.department || 'all');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>(initialFilters.poNumber || 'all');
  const [selectedPurchaser, setSelectedPurchaser] = useState<string>(initialFilters.purchaserName || 'all');
  const [searchTerm, setSearchTerm] = useState<string>(initialFilters.itemName || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'pending' | 'completed' | 'damaged'>('all');

  // Modal State for QC & Partial Receiving
  const [qcModalItem, setQcModalItem] = useState<any | null>(null);
  const [batchReceivedQty, setBatchReceivedQty] = useState<string>('');
  const [batchPassedQty, setBatchPassedQty] = useState<string>('');
  const [batchDamagedQty, setBatchDamagedQty] = useState<string>('0');
  const [qcNotes, setQcNotes] = useState<string>('');

  // Logs Modal State
  const [logsModalItem, setLogsModalItem] = useState<any | null>(null);

  // Save filters to localStorage on change
  useEffect(() => {
    localStorage.setItem('warehouse_filters', JSON.stringify({
      location: selectedLocation,
      department: selectedDepartment,
      poNumber: selectedPoNumber,
      purchaserName: selectedPurchaser,
      itemName: searchTerm
    }));
  }, [selectedLocation, selectedDepartment, selectedPoNumber, selectedPurchaser, searchTerm]);

  // Action feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [receivingItemId, setReceivingItemId] = useState<string | null>(null);

  // Flatten all items
  const allItems = pos.flatMap(po =>
    po.items.map(item => {
      const ordered = item.requestedQty || item.orderedQty || 0;
      const purchased = item.purchasedQty || 0;
      const received = item.warehouseQty || 0;
      const passed = item.passedQty ?? received;
      const damaged = item.damagedQty || 0;

      // Calculate Backorder / Pending Qty (Purchased - Passed)
      const backorder = Math.max(0, purchased - passed);
      const remainingToReceive = Math.max(0, purchased - received);

      // Item receive status
      let receiveStatus: 'Pending Receive' | 'Partial Receive' | 'Completed Receive' = 'Pending Receive';
      if (passed >= purchased && purchased > 0) {
        receiveStatus = purchased < ordered ? 'Partial Receive' : 'Completed Receive';
      } else if (received > 0 || passed > 0) {
        receiveStatus = 'Partial Receive';
      }

      return {
        ...item,
        parentPo: po,
        ordered,
        purchased,
        received,
        passed,
        damaged,
        backorder,
        remainingToReceive,
        computedReceiveStatus: receiveStatus
      };
    })
  );

  // Derive unique locations, departments, PO numbers, and purchasers
  const locations = Array.from(new Set(pos.map(p => p.location).filter(Boolean)));
  const departments = Array.from(new Set(pos.map(p => p.department).filter(Boolean)));
  const poNumbers = Array.from(new Set(pos.map(p => p.poNumber).filter(Boolean)));
  const purchasers = Array.from(
    new Set(
      allItems
        .flatMap(i => [i.purchaserName, i.holdBy])
        .filter((p): p is string => Boolean(p && p.trim()))
    )
  );

  // Filter items
  const filteredItems = allItems.filter(item => {
    if (selectedLocation !== 'all' && item.parentPo.location !== selectedLocation) return false;
    if (selectedDepartment !== 'all' && item.parentPo.department !== selectedDepartment) return false;
    if (selectedPoNumber !== 'all' && item.parentPo.poNumber !== selectedPoNumber) return false;

    if (selectedPurchaser !== 'all') {
      const pLower = selectedPurchaser.toLowerCase();
      const pMatch = item.purchaserName?.toLowerCase() === pLower || item.holdBy?.toLowerCase() === pLower;
      if (!pMatch) return false;
    }

    if (statusFilter === 'waiting' && (item.purchased === 0 || item.computedReceiveStatus === 'Completed Receive')) return false;
    if (statusFilter === 'pending' && (item.purchased > 0 || item.computedReceiveStatus === 'Completed Receive')) return false;
    if (statusFilter === 'completed' && item.computedReceiveStatus !== 'Completed Receive') return false;
    if (statusFilter === 'damaged' && item.damaged === 0) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = item.itemName.toLowerCase().includes(q);
      const matchPO = item.parentPo.poNumber.toLowerCase().includes(q);
      const matchPurchaser = item.purchaserName?.toLowerCase().includes(q) || item.holdBy?.toLowerCase().includes(q);
      return matchName || matchPO || matchPurchaser;
    }

    return true;
  });

  // Categorize items
  const waitingForReceiveItems = filteredItems.filter(
    item => item.purchased > 0 && item.computedReceiveStatus !== 'Completed Receive'
  );

  const pendingPurchaseItems = filteredItems.filter(
    item => item.purchased === 0 && item.computedReceiveStatus !== 'Completed Receive'
  );

  const completedReceiveItems = filteredItems.filter(
    item => item.computedReceiveStatus === 'Completed Receive'
  );

  // KPI Counts & Totals
  const totalWaitingCount = allItems.filter(i => i.purchased > 0 && i.computedReceiveStatus !== 'Completed Receive').length;
  const totalPendingPurchaseCount = allItems.filter(i => i.purchased === 0 && i.computedReceiveStatus !== 'Completed Receive').length;
  const totalCompletedCount = allItems.filter(i => i.computedReceiveStatus === 'Completed Receive').length;
  const totalDamagedCount = allItems.filter(i => (i.damaged || 0) > 0).length;
  const totalDamagedUnits = allItems.reduce((acc, i) => acc + (i.damaged || 0), 0);

  // Open QC Modal for an item
  const handleOpenQcModal = (item: any) => {
    const defaultBatch = item.remainingToReceive > 0 ? item.remainingToReceive : (item.purchased || 1);
    setQcModalItem(item);
    setBatchReceivedQty(String(defaultBatch));
    setBatchPassedQty(String(defaultBatch));
    setBatchDamagedQty('0');
    setQcNotes('');
  };

  // Quick One-Click Receive
  const handleQuickReceiveClick = async (itemId: string) => {
    if (receivingItemId === itemId) return;
    setReceivingItemId(itemId);
    try {
      const res = await Promise.resolve(onReceiveComplete(itemId));
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 3500);
      if (onSync) onSync();
    } catch {
      setActionFeedback('Failed to complete receive.');
      setTimeout(() => setActionFeedback(null), 3500);
    } finally {
      setReceivingItemId(null);
    }
  };

  // Submit QC & Partial Receive Form
  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcModalItem) return;

    const rQty = parseFloat(batchReceivedQty) || 0;
    const pQty = parseFloat(batchPassedQty) || 0;
    const dQty = parseFloat(batchDamagedQty) || 0;

    if (rQty <= 0) {
      alert("Please enter a valid batch received quantity (> 0).");
      return;
    }

    if (Math.abs((pQty + dQty) - rQty) > 0.001) {
      alert(`Received Quantity (${rQty}) must equal Passed Qty (${pQty}) + Damaged Qty (${dQty}).`);
      return;
    }

    setReceivingItemId(qcModalItem.id);
    try {
      const res = await Promise.resolve(
        onReceiveComplete(qcModalItem.id, rQty, pQty, dQty, qcNotes)
      );
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 4000);
      setQcModalItem(null);
      if (onSync) onSync();
    } catch {
      setActionFeedback('Failed to log QC receive.');
      setTimeout(() => setActionFeedback(null), 3500);
    } finally {
      setReceivingItemId(null);
    }
  };

  const renderItemCard = (item: any, idx: number) => {
    const isCompleted = item.computedReceiveStatus === 'Completed Receive';
    const canReceive = item.purchased > 0 && !isCompleted;
    const hasDamaged = (item.damaged || 0) > 0;
    const hasBackorder = (item.backorder || 0) > 0 && item.purchased > 0;

    return (
      <div
        key={item.id ? `${item.id}-${idx}` : `item-${idx}`}
        className={`bg-white rounded-xl border p-3 space-y-2.5 shadow-2xs hover:border-slate-300 transition ${
          hasDamaged ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-mono text-xs font-bold border border-blue-100">
              PO: {item.parentPo.poNumber}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {item.parentPo.department || 'General'} • {item.parentPo.location || 'Warehouse'}
            </span>
            {item.purchaserName ? (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100">
                Purchaser: {item.purchaserName}
              </span>
            ) : item.holdBy ? (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-100">
                Hold by: {item.holdBy}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5">
            {hasDamaged && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-red-600" />
                QC DAMAGED: {item.damaged} {item.unit}
              </span>
            )}

            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : item.computedReceiveStatus === 'Partial Receive'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {item.computedReceiveStatus}
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[11px] font-black shrink-0">
              SL #{idx + 1}
            </span>
            <span>{item.itemName}</span>
          </h3>
          {item.brand && <p className="text-[10px] text-slate-400 mt-0.5">Brand: {item.brand}</p>}
        </div>

        {/* Quantities & QC Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Ordered</span>
            <p className="font-bold text-slate-900 mt-0.5">{item.ordered} {item.unit}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Purchased</span>
            <p className="font-bold text-blue-700 mt-0.5">{item.purchased} {item.unit}</p>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold">Delivered Total</span>
            <p className="font-bold text-slate-800 mt-0.5">{item.received} {item.unit}</p>
          </div>
          <div>
            <span className="text-emerald-700 text-[10px] uppercase font-bold flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" />
              QC Passed
            </span>
            <p className="font-bold text-emerald-700 mt-0.5">{item.passed} {item.unit}</p>
          </div>
          <div>
            <span className="text-amber-700 text-[10px] uppercase font-bold flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              Backorder / Pending
            </span>
            <p className={`font-bold mt-0.5 ${hasBackorder ? 'text-amber-700 font-extrabold' : 'text-slate-400'}`}>
              {item.backorder} {item.unit}
            </p>
          </div>
        </div>

        {/* QC Notes / Discrepancy Remarks if present */}
        {item.qcNotes && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">QC / Damage Remarks:</span> {item.qcNotes}
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              {item.warehouseVerifiedBy ? `Verified by ${item.warehouseVerifiedBy}` : 'Awaiting verification'}
            </span>
            {item.receiveLogs && item.receiveLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setLogsModalItem(item)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 cursor-pointer"
              >
                <History className="w-3 h-3" />
                History ({item.receiveLogs.length} batches)
              </button>
            )}
          </div>

          {canReceive ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleOpenQcModal(item)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Receive & QC Check
              </button>

              <button
                onClick={() => handleQuickReceiveClick(item.id)}
                disabled={receivingItemId === item.id}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                title="Quick Full Receive without QC Notes"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${receivingItemId === item.id ? 'animate-spin' : ''}`} />
                {receivingItemId === item.id ? 'Processing...' : 'Quick Pass'}
              </button>
            </div>
          ) : isCompleted ? (
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </span>
              <button
                onClick={() => handleOpenQcModal(item)}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Add supplemental batch receive or update QC"
              >
                + Additional Batch
              </button>
            </div>
          ) : (
            <span className="text-xs text-amber-600 font-semibold italic">
              Awaiting Purchase
            </span>
          )}
        </div>
      </div>
    );
  };

  // Print & Save PDF Receiving Report
  const handlePrintReceivingPdf = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert("Please allow popups to generate and save PDF report.");
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const purchaserTitle = selectedPurchaser === 'all'
      ? 'All Purchasers Receiving Report'
      : `Purchaser Receiving Report: ${selectedPurchaser}`;

    const itemsToPrint = filteredItems;

    const rowsHtml = itemsToPrint.map((item, idx) => {
      const st = item.computedReceiveStatus;
      const purchased = item.purchased || 0;
      const received = item.received || 0;
      const passed = item.passed || received;
      const damaged = item.damaged || 0;
      const backorder = item.backorder || 0;
      const unit = item.unit || 'pcs';

      const statusColor = st === 'Completed Receive' ? '#166534' : st === 'Partial Receive' ? '#1e40af' : '#92400e';
      const statusBg = st === 'Completed Receive' ? '#dcfce7' : st === 'Partial Receive' ? '#dbeafe' : '#fef3c7';

      return `
        <tr style="background-color: ${damaged > 0 ? '#fef2f2' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: bold; font-family: monospace; color: #1e293b;">${item.parentPo.poNumber}</td>
          <td style="padding: 8px; font-weight: 700; color: #0f172a;">${item.itemName}</td>
          <td style="padding: 8px; font-weight: 700; color: #4338ca;">${item.purchaserName || item.holdBy || 'Unassigned'}</td>
          <td style="padding: 8px; color: #475569;">${item.parentPo.department || '-'}</td>
          <td style="padding: 8px; text-align: center; font-weight: 700; color: #1d4ed8;">${purchased} ${unit}</td>
          <td style="padding: 8px; text-align: center; font-weight: 700; color: #15803d;">${passed} ${unit}</td>
          <td style="padding: 8px; text-align: center; font-weight: 700; color: ${damaged > 0 ? '#dc2626' : '#94a3b8'};">${damaged} ${unit}</td>
          <td style="padding: 8px; text-align: center; font-weight: 700; color: #b45309;">${backorder} ${unit}</td>
          <td style="padding: 8px; text-align: center;">
            <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; display: inline-block;">
              ${st}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>RL FOOD - Receiving & QC Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              margin: 0;
              padding: 24px;
              color: #0f172a;
              background-color: #ffffff;
            }
            .header-box {
              border-bottom: 3px solid #1d4ed8;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
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
              font-size: 11px;
            }
            th {
              background-color: #0f172a;
              color: #ffffff;
              padding: 8px;
              text-align: left;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <div style="font-size: 22px; font-weight: 800; color: #1e3a8a;">RL FOOD - RECEIVING & QC REPORT</div>
              <div style="font-size: 13px; font-weight: 800; color: #475569;">${purchaserTitle}</div>
            </div>
            <div style="text-align: right; font-size: 11px;">
              <div><strong>Officer:</strong> ${currentUser.name}</div>
              <div><strong>Generated:</strong> ${todayStr}</div>
            </div>
          </div>
          <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Waiting Receive</div><div class="kpi-val" style="color: #2563eb;">${waitingForReceiveItems.length}</div></div>
            <div class="kpi-card"><div class="kpi-label">Completed</div><div class="kpi-val" style="color: #16a34a;">${completedReceiveItems.length}</div></div>
            <div class="kpi-card"><div class="kpi-label">Damaged Items</div><div class="kpi-val" style="color: #dc2626;">${totalDamagedCount}</div></div>
            <div class="kpi-card"><div class="kpi-label">Total Damaged Units</div><div class="kpi-val" style="color: #dc2626;">${totalDamagedUnits}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>PO Number</th>
                <th>Item Name</th>
                <th>Purchaser</th>
                <th>Dept</th>
                <th style="text-align: center;">Purchased</th>
                <th style="text-align: center;">QC Passed</th>
                <th style="text-align: center;">Damaged</th>
                <th style="text-align: center;">Backorder</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-4 py-3 space-y-3 font-sans text-slate-900">
      
      {/* Top Banner - Compact ERP */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-base font-bold leading-tight flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-indigo-400" />
            Receiver Dashboard & QC Inspection Engine
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Receiver Officer: <span className="text-slate-200 font-bold">{currentUser.name}</span> • Quality Check & Discrepancy Alert Active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintReceivingPdf}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Print or Save PDF Purchaser-Wise Receiving Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save PDF</span>
            <span className="inline sm:hidden">PDF</span>
          </button>
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700"
              title="Sync with Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-900 text-emerald-100 border border-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Summary KPI Cards including Damaged Count */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setStatusFilter(statusFilter === 'waiting' ? 'all' : 'waiting')}
          className={`p-2.5 rounded-xl border text-left transition ${
            statusFilter === 'waiting'
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-blue-700">1. Waiting Receive</p>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-900 mt-1">{totalWaitingCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`p-2.5 rounded-xl border text-left transition ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-amber-700">2. Pending Purchase</p>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-900 mt-1">{totalPendingPurchaseCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          className={`p-2.5 rounded-xl border text-left transition ${
            statusFilter === 'completed'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-emerald-700">3. Complete Items</p>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-900 mt-1">{totalCompletedCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'damaged' ? 'all' : 'damaged')}
          className={`p-2.5 rounded-xl border text-left transition ${
            statusFilter === 'damaged'
              ? 'bg-red-50 border-red-400 ring-2 ring-red-500/20'
              : 'bg-white border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-red-700">4. QC Damaged</p>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-red-900">{totalDamagedCount}</span>
            <span className="text-[11px] font-bold text-red-600">({totalDamagedUnits} units)</span>
          </div>
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 pb-1 border-b border-slate-100">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Receiver Inspection Filters</span>
          {(statusFilter !== 'all' || selectedLocation !== 'all' || selectedDepartment !== 'all' || selectedPoNumber !== 'all' || selectedPurchaser !== 'all' || searchTerm !== '') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSelectedLocation('all');
                setSelectedDepartment('all');
                setSelectedPoNumber('all');
                setSelectedPurchaser('all');
                setSearchTerm('');
              }}
              className="ml-auto text-[10px] font-bold text-blue-600 hover:underline"
            >
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full mt-0.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="all">All Locations</option>
              {locations.map((loc, idx) => (
                <option key={`${loc}-${idx}`} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full mt-0.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="all">All Departments</option>
              {departments.map((dept, idx) => (
                <option key={`${dept}-${idx}`} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">PO Number</label>
            <select
              value={selectedPoNumber}
              onChange={(e) => setSelectedPoNumber(e.target.value)}
              className="w-full mt-0.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="all">All PO Numbers</option>
              {poNumbers.map((po, idx) => (
                <option key={`${po}-${idx}`} value={po}>{po}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Purchaser Name</label>
            <select
              value={selectedPurchaser}
              onChange={(e) => setSelectedPurchaser(e.target.value)}
              className="w-full mt-0.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="all">All Purchasers</option>
              {purchasers.map((pName, idx) => (
                <option key={`${pName}-${idx}`} value={pName}>{pName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Search Item / Purchaser</label>
            <div className="relative mt-0.5">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* Purchaser Quick Filters & PDF Report Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0 flex items-center gap-1">
              Filter Purchaser:
            </span>
            <button
              type="button"
              onClick={() => setSelectedPurchaser('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition shrink-0 ${
                selectedPurchaser === 'all'
                  ? 'bg-indigo-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200'
              }`}
            >
              All Purchasers
            </button>
            {purchasers.map(p => {
              const pCount = allItems.filter(i => (i.purchaserName || i.holdBy) === p).length;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPurchaser(p)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition shrink-0 flex items-center gap-1 ${
                    selectedPurchaser === p
                      ? 'bg-indigo-700 text-white shadow-2xs'
                      : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <span>{p}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    selectedPurchaser === p ? 'bg-indigo-800 text-white' : 'bg-indigo-200 text-indigo-900'
                  }`}>{pCount}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handlePrintReceivingPdf}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-2xs active:scale-95 cursor-pointer ml-auto sm:ml-0"
            title="Print or Save PDF report for current purchaser selection"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-5">
        
        {/* 1. WAITING FOR RECEIVE ITEMS */}
        {(statusFilter === 'all' || statusFilter === 'waiting') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-blue-900 text-white px-3 py-2 rounded-xl shadow-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-300" />
                <h2 className="text-xs font-bold uppercase tracking-wider">
                  1. WAITING FOR RECEIVE ITEMS ({waitingForReceiveItems.length})
                </h2>
              </div>
              <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded-md font-bold hidden sm:inline">
                Purchased & Awaiting Receiving / QC
              </span>
            </div>

            {waitingForReceiveItems.length === 0 ? (
              <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-slate-400 text-xs font-bold">
                No items currently waiting to be received.
              </div>
            ) : (
              waitingForReceiveItems.map((item, idx) => renderItemCard(item, idx))
            )}
          </div>
        )}

        {/* 2. PENDING PURCHASE ITEMS */}
        {(statusFilter === 'all' || statusFilter === 'pending') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-amber-800 text-white px-3 py-2 rounded-xl shadow-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-300" />
                <h2 className="text-xs font-bold uppercase tracking-wider">
                  2. PENDING FILE / PENDING PURCHASE ITEMS ({pendingPurchaseItems.length})
                </h2>
              </div>
              <span className="text-[10px] bg-amber-700 text-amber-200 px-2 py-0.5 rounded-md font-bold hidden sm:inline">
                Awaiting Purchaser Action
              </span>
            </div>

            {pendingPurchaseItems.length === 0 ? (
              <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-slate-400 text-xs font-bold">
                No items in pending purchase file.
              </div>
            ) : (
              pendingPurchaseItems.map((item, idx) => renderItemCard(item, idx))
            )}
          </div>
        )}

        {/* 3. COMPLETE ITEMS */}
        {(statusFilter === 'all' || statusFilter === 'completed' || statusFilter === 'damaged') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-emerald-800 text-white px-3 py-2 rounded-xl shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <h2 className="text-xs font-bold uppercase tracking-wider">
                  3. COMPLETED & QC INSPECTED ITEMS ({completedReceiveItems.length})
                </h2>
              </div>
              <span className="text-[10px] bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded-md font-bold hidden sm:inline">
                Received & Verified
              </span>
            </div>

            {completedReceiveItems.length === 0 ? (
              <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-slate-400 text-xs font-bold">
                No completed items yet.
              </div>
            ) : (
              completedReceiveItems.map((item, idx) => renderItemCard(item, idx))
            )}
          </div>
        )}

      </div>

      {/* QC & PARTIAL RECEIVE MODAL */}
      {qcModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Quality Check (QC) & Partial Receiving</h3>
                  <p className="text-[11px] text-slate-500">PO #{qcModalItem.parentPo.poNumber} • {qcModalItem.itemName}</p>
                </div>
              </div>
              <button
                onClick={() => setQcModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Context Summary */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Purchaser Assigned:</span>
                <span className="font-bold text-indigo-700">{qcModalItem.purchaserName || qcModalItem.holdBy || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Purchased Qty:</span>
                <span className="font-bold text-blue-700">{qcModalItem.purchased} {qcModalItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Previously Delivered:</span>
                <span className="font-bold text-emerald-700">{qcModalItem.received} {qcModalItem.unit}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-bold">Remaining to Receive (Backorder):</span>
                <span className="font-extrabold text-amber-700">{qcModalItem.remainingToReceive} {qcModalItem.unit}</span>
              </div>
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleSubmitQC} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  1. Current Delivery Batch Quantity ({qcModalItem.unit}):
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={batchReceivedQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBatchReceivedQty(val);
                    const r = parseFloat(val) || 0;
                    const d = parseFloat(batchDamagedQty) || 0;
                    setBatchPassedQty(String(Math.max(0, r - d)));
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Passed QC Qty:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={batchPassedQty}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      setBatchPassedQty(e.target.value);
                      const r = parseFloat(batchReceivedQty) || 0;
                      setBatchDamagedQty(String(Math.max(0, r - p)));
                    }}
                    className="w-full p-2 bg-emerald-50/50 border border-emerald-300 rounded-lg font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Damaged / Rejected Qty:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={batchDamagedQty}
                    onChange={(e) => {
                      const d = parseFloat(e.target.value) || 0;
                      setBatchDamagedQty(e.target.value);
                      const r = parseFloat(batchReceivedQty) || 0;
                      setBatchPassedQty(String(Math.max(0, r - d)));
                    }}
                    className="w-full p-2 bg-red-50/50 border border-red-300 rounded-lg font-bold text-red-900 focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  QC Inspection & Damage Notes (Optional/Recommended for Discrepancy):
                </label>
                <textarea
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Describe condition, damage cause, or package shortage details..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Telegram Auto Discrepancy Alert Notice */}
              {(parseFloat(batchDamagedQty) > 0 || parseFloat(batchReceivedQty) < qcModalItem.purchased) && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <Send className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="font-extrabold block">🚨 Instant Telegram Purchaser Discrepancy Alert Active</span>
                    Because damaged goods or a delivery shortage is detected, an automatic Telegram alert will be dispatched to <b>{qcModalItem.purchaserName || 'Purchaser'}</b> with complete QC details.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQcModalItem(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receivingItemId === qcModalItem.id}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {receivingItemId === qcModalItem.id ? 'Processing QC...' : 'Submit QC & Log Receive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH LOGS HISTORY MODAL */}
      {logsModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 space-y-3 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs">Receiving & QC Log History</h3>
              </div>
              <button onClick={() => setLogsModalItem(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <p className="text-xs font-bold text-slate-800">{logsModalItem.itemName} <span className="text-slate-500 font-mono">(PO #{logsModalItem.parentPo.poNumber})</span></p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(logsModalItem.receiveLogs || []).map((log: any, i: number) => (
                <div key={log.id || i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Batch #{i + 1} • {log.receivedBy}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-3 font-bold">
                    <span className="text-slate-800">Delivered: {log.receivedQty}</span>
                    <span className="text-emerald-700">Passed: {log.passedQty}</span>
                    {log.damagedQty > 0 && <span className="text-red-700">Damaged: {log.damagedQty}</span>}
                  </div>
                  {log.qcNotes && <p className="text-[11px] text-slate-600 italic">"{log.qcNotes}"</p>}
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setLogsModalItem(null)}
                className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
