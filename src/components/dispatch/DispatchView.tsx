import React, { useState, useEffect } from 'react';
import { PurchaseOrder, User, DeliveryNoteRecord, POItem } from '../../types';
import { RunningPoList } from '../RunningPoList';
import { 
  Truck, Search, Filter, ChevronDown, ChevronUp, FileSpreadsheet, Download, 
  Printer, FileText, CheckCircle2, Clock, Trash2, Eye, Receipt, Sparkles, 
  History, ArrowRight, Check, Package, AlertCircle, CheckSquare, RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DeliveryChallanModal } from './DeliveryChallanModal';
import { 
  getDeliveryNotes, 
  markDeliveryNoteInvoiced, 
  deleteDeliveryNote, 
  getDeliveredQtyForPOItem,
  confirmDeliveryStatus
} from '../../services/deliveryNoteService';
import { getPoItemSkuMapping } from '../../services/skuService';
import { printOfficialDeliveryChallanNoPrice, printOfficialRLDeliveryNote } from '../../services/officialPdfService';

interface DispatchViewProps {
  pos: PurchaseOrder[];
  currentUser: User;
}

export const DispatchView: React.FC<DispatchViewProps> = ({ pos, currentUser }) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'pos' | 'tracking' | 'invoices'>('pos');

  // Filters for POs tab
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'completed' | 'ready' | 'delivered'>('all');

  // Delivery Notes Tracking State
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteRecord[]>([]);
  const [trackingSearch, setTrackingSearch] = useState<string>('');
  const [trackingStatusFilter, setTrackingStatusFilter] = useState<'all' | 'Pending Invoice' | 'Invoiced' | 'Delivery Confirmed' | 'Partially Returned' | 'Fully Returned'>('all');
  const [expandedDnIds, setExpandedDnIds] = useState<Record<string, boolean>>({});

  // Delivery Confirmation Modal State
  const [confirmModalDn, setConfirmModalDn] = useState<DeliveryNoteRecord | null>(null);
  const [selectedItemsForDelivery, setSelectedItemsForDelivery] = useState<Record<string, boolean>>({});
  const [itemReturnReasons, setItemReturnReasons] = useState<Record<string, string>>({});

  // Accordion & Modal States
  const [expandedPoIds, setExpandedPoIds] = useState<Record<string, boolean>>({});
  const [selectedPoForChallan, setSelectedPoForChallan] = useState<PurchaseOrder | null>(null);

  // Invoice Builder State (for Tab 3)
  const [customUnitPrices, setCustomUnitPrices] = useState<Record<string, number>>({}); // key: dnItemId -> price
  const [invoiceNumbers, setInvoiceNumbers] = useState<Record<string, string>>({}); // key: dnId -> invoice string

  // Open Delivery Confirmation modal
  const openConfirmModal = (dn: DeliveryNoteRecord) => {
    setConfirmModalDn(dn);
    const initialSelections: Record<string, boolean> = {};
    const initialReasons: Record<string, string> = {};
    (dn.items || []).forEach(item => {
      // By default, if item is not returned, select it as delivered
      initialSelections[item.id] = item.isReturned !== true && (item.returnedQty || 0) < (item.deliveredQty || 1);
      initialReasons[item.id] = item.returnReason || '';
    });
    setSelectedItemsForDelivery(initialSelections);
    setItemReturnReasons(initialReasons);
  };

  // Save Delivery Confirmation & Process Returns
  const handleSaveDeliveryConfirmation = () => {
    if (!confirmModalDn) return;

    const payload = confirmModalDn.items.map(item => {
      const isSelected = selectedItemsForDelivery[item.id] !== false; // true = accepted, false = returned
      return {
        itemId: item.id,
        selectedForDelivery: isSelected,
        acceptedQty: isSelected ? item.deliveredQty : 0,
        returnedQty: isSelected ? 0 : item.deliveredQty,
        returnReason: itemReturnReasons[item.id] || (isSelected ? '' : 'Customer Return')
      };
    });

    confirmDeliveryStatus(confirmModalDn.id, payload, currentUser.name);
    loadNotes();

    const returnedCount = payload.filter(p => !p.selectedForDelivery).length;
    if (returnedCount > 0) {
      alert(`DELIVERY CONFIRMATION SAVED!\n\n${returnedCount} item(s) marked as RETURNED.\nReturned quantities have been restored back to PO available balance so they can be dispatched again.`);
    } else {
      alert(`DELIVERY CONFIRMATION SAVED!\n\nAll items confirmed as successfully delivered to the customer.`);
    }

    setConfirmModalDn(null);
  };

  // Load Delivery Notes from storage and listen to updates
  const loadNotes = () => {
    const loaded = getDeliveryNotes();
    setDeliveryNotes(loaded);
  };

  useEffect(() => {
    loadNotes();
    const handleUpdate = () => loadNotes();
    window.addEventListener('delivery_notes_updated', handleUpdate);
    window.addEventListener('po_sku_mapping_updated', handleUpdate);
    return () => {
      window.removeEventListener('delivery_notes_updated', handleUpdate);
      window.removeEventListener('po_sku_mapping_updated', handleUpdate);
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedPoIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandDn = (id: string) => {
    setExpandedDnIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Unique lists for filters
  const locations = Array.from(new Set(pos.map(p => p.location).filter(Boolean)));
  const departments = Array.from(new Set(pos.map(p => p.department).filter(Boolean)));
  const poNumbers = Array.from(new Set(pos.map(p => p.poNumber).filter(Boolean)));

  // Compute PO metrics with Delivery Note tracking details
  const poMetrics = pos.map(po => {
    const totalItems = po.items.length;
    const purchasedItems = po.items.filter(i => (i.purchasedQty || 0) > 0).length;
    const fullyPurchasedItems = po.items.filter(i => (i.purchasedQty || 0) >= (i.requestedQty || i.orderedQty || 0)).length;
    const receivedItems = po.items.filter(i => (i.warehouseQty || i.passedQty || 0) > 0).length;
    const fullyReceivedItems = po.items.filter(i => (i.warehouseQty || i.passedQty || 0) >= (i.requestedQty || i.orderedQty || 0)).length;
    const remainingItems = totalItems - fullyPurchasedItems;

    // Check delivered quantities from Delivery Notes
    const totalDeliveredAcrossItems = po.items.reduce((sum, item) => {
      return sum + getDeliveredQtyForPOItem(po.poNumber, item.id, item.itemName);
    }, 0);

    const isFullyReceived = totalItems > 0 && fullyReceivedItems === totalItems;
    const isPartial = (purchasedItems > 0 || receivedItems > 0) && !isFullyReceived;
    const isPending = purchasedItems === 0 && receivedItems === 0;

    const progressPct = totalItems > 0 ? Math.round((fullyReceivedItems / totalItems) * 100) : 0;

    return {
      po,
      totalItems,
      purchasedItems,
      fullyPurchasedItems,
      receivedItems,
      fullyReceivedItems,
      remainingItems,
      totalDeliveredAcrossItems,
      isFullyReceived,
      isPartial,
      isPending,
      progressPct
    };
  });

  // Summary Metrics
  const pendingPoCount = poMetrics.filter(m => m.isPending).length;
  const partialPoCount = poMetrics.filter(m => m.isPartial).length;
  const completedPoCount = poMetrics.filter(m => m.isFullyReceived).length;
  const readyForDispatchCount = poMetrics.filter(m => m.isFullyReceived).length;
  const alreadyDeliveredPoCount = poMetrics.filter(m => m.totalDeliveredAcrossItems > 0).length;

  const pendingInvoicesCount = deliveryNotes.filter(n => n.status === 'Pending Invoice').length;
  const invoicedNotesCount = deliveryNotes.filter(n => n.status === 'Invoiced').length;

  // Filter POs
  const filteredMetrics = poMetrics.filter(m => {
    if (selectedLocation !== 'all' && m.po.location !== selectedLocation) return false;
    if (selectedDepartment !== 'all' && m.po.department !== selectedDepartment) return false;
    if (selectedPoNumber !== 'all' && m.po.poNumber !== selectedPoNumber) return false;

    if (statusFilter === 'pending' && !m.isPending) return false;
    if (statusFilter === 'partial' && !m.isPartial) return false;
    if (statusFilter === 'completed' && !m.isFullyReceived) return false;
    if (statusFilter === 'ready' && !m.isFullyReceived) return false;
    if (statusFilter === 'delivered' && m.totalDeliveredAcrossItems === 0) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchPO = m.po.poNumber.toLowerCase().includes(q);
      const matchCustomer = (m.po.customerName || '').toLowerCase().includes(q);
      const matchItem = m.po.items.some(i => i.itemName.toLowerCase().includes(q));
      return matchPO || matchCustomer || matchItem;
    }

    return true;
  });

  // Filter Delivery Notes for Tracking
  const filteredDeliveryNotes = deliveryNotes.filter(dn => {
    if (trackingStatusFilter !== 'all' && dn.status !== trackingStatusFilter) return false;
    if (trackingSearch.trim()) {
      const q = trackingSearch.toLowerCase();
      const matchChallan = dn.challanNumber.toLowerCase().includes(q);
      const matchPo = dn.poNumber.toLowerCase().includes(q);
      const matchCustomer = (dn.customerName || '').toLowerCase().includes(q);
      const matchItem = dn.items.some(i => i.itemName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
      return matchChallan || matchPo || matchCustomer || matchItem;
    }
    return true;
  });

  // Export full dispatch report (PO-wise) to Excel
  const handleExportFullExcel = () => {
    if (filteredMetrics.length === 0) {
      alert('No POs available to export.');
      return;
    }

    const summaryRows = filteredMetrics.map(m => ({
      'PO Number': m.po.poNumber,
      'Location': m.po.location || 'Central Warehouse',
      'Department': m.po.department || 'General',
      'Order Date': m.po.orderDate || '',
      'Delivery Date': m.po.deliveryDate || '',
      'Dispatch Status': m.isFullyReceived ? 'Ready For Dispatch' : m.isPartial ? 'Partial' : 'Pending',
      'Progress (%)': `${m.progressPct}%`,
      'Total Items': m.totalItems,
      'Purchased Items': m.purchasedItems,
      'Received Items': m.receivedItems,
      'Delivered Units (Delivery Notes)': m.totalDeliveredAcrossItems,
      'Pending Items': m.remainingItems,
    }));

    const itemRows: any[] = [];
    filteredMetrics.forEach(m => {
      m.po.items.forEach((item, idx) => {
        const requested = item.requestedQty || item.orderedQty || 0;
        const purchased = item.purchasedQty || 0;
        const received = item.warehouseQty || item.passedQty || 0;
        const alreadyDelivered = getDeliveredQtyForPOItem(m.po.poNumber, item.id, item.itemName);
        const remainingToDeliver = Math.max(0, received - alreadyDelivered);

        itemRows.push({
          'PO Number': m.po.poNumber,
          'SL No': item.slNumber || idx + 1,
          'Item Name': item.itemName,
          'Brand': item.brand || 'N/A',
          'Department': item.department || m.po.department || 'General',
          'Unit': item.unit || 'Pcs',
          'Requested Qty': requested,
          'Purchased Qty': purchased,
          'Warehouse Received Qty': received,
          'Previously Delivered Qty': alreadyDelivered,
          'Available to Deliver Qty': remainingToDeliver,
          'Purchase Status': item.purchaseStatus || 'Pending',
          'Delivery Note Status': alreadyDelivered >= received && received > 0 ? 'Fully Delivered' : alreadyDelivered > 0 ? 'Partial Delivered' : 'Pending Delivery Note'
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    const itemsSheet = XLSX.utils.json_to_sheet(itemRows);

    XLSX.utils.book_append_sheet(wb, summarySheet, 'PO Summary');
    XLSX.utils.book_append_sheet(wb, itemsSheet, 'PO Items Detail');

    const fileName = `PO_Wise_Dispatch_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export single PO to Excel
  const handleExportSinglePoExcel = (po: PurchaseOrder) => {
    const itemRows = po.items.map((item, idx) => {
      const requested = item.requestedQty || item.orderedQty || 0;
      const purchased = item.purchasedQty || 0;
      const received = item.warehouseQty || item.passedQty || 0;
      const alreadyDelivered = getDeliveredQtyForPOItem(po.poNumber, item.id, item.itemName);

      return {
        'PO Number': po.poNumber,
        'SL No': item.slNumber || idx + 1,
        'Item Name': item.itemName,
        'Brand': item.brand || 'N/A',
        'Unit': item.unit || 'Pcs',
        'Requested Qty': requested,
        'Purchased Qty': purchased,
        'Warehouse Received Qty': received,
        'Previously Delivered Qty': alreadyDelivered,
        'Remaining Available Qty': Math.max(0, received - alreadyDelivered),
        'Purchase Status': item.purchaseStatus || 'Pending'
      };
    });

    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(itemRows);
    XLSX.utils.book_append_sheet(wb, sheet, `PO_${po.poNumber}`);

    XLSX.writeFile(wb, `Dispatch_Report_${po.poNumber}.xlsx`);
  };

  // Generate & Print Official Invoice (With Price)
  const handleGenerateInvoice = (dn: DeliveryNoteRecord) => {
    const defaultInvNum = invoiceNumbers[dn.id] || dn.invoiceNumber || `INV-${dn.poNumber.replace(/^PO-?/i, '')}-${Date.now().toString().slice(-4)}`;
    
    // Mark delivery note as Invoiced in storage
    markDeliveryNoteInvoiced(dn.id, defaultInvNum);

    // Map delivery note items to POItem list with custom unit prices
    const poItemsForInvoice: POItem[] = dn.items.map((item, idx) => {
      const uPrice = customUnitPrices[item.id] !== undefined ? customUnitPrices[item.id] : (item.unitPrice ?? 0);
      return {
        id: item.id,
        poId: dn.poId,
        poNumber: dn.poNumber,
        slNumber: idx + 1,
        itemName: item.itemName,
        customerItemName: item.poItemName || item.itemName,
        internalItemName: item.itemName,
        internalItemCode: item.sku,
        sku: item.sku,
        unit: item.unit,
        requestedQty: item.requestedQty,
        orderedQty: item.requestedQty,
        purchasedQty: item.deliveredQty,
        warehouseQty: item.deliveredQty,
        passedQty: item.deliveredQty,
        unitPrice: uPrice,
        marketPrice: uPrice,
        category: 'General',
        brand: item.brand,
        purchaseStatus: 'Purchased',
        remainingQty: 0
      };
    });

    // Match parent PO if available
    const parentPO = pos.find(p => p.poNumber === dn.poNumber) || {
      id: dn.poId,
      poNumber: dn.poNumber,
      customerName: dn.customerName,
      orderDate: dn.createdDate,
      deliveryDate: dn.deliveryDate,
      totalItems: dn.items.length,
      totalQuantity: dn.items.reduce((s, i) => s + i.deliveredQty, 0),
      purchaseStatus: 'Completed',
      receiveStatus: 'Completed',
      status: 'dispatched',
      items: poItemsForInvoice,
      createdBy: dn.dispatchOfficer,
      createdAt: dn.createdDate,
      updatedAt: dn.createdDate
    };

    // Print Official Invoice PDF with prices
    printOfficialRLDeliveryNote(parentPO as PurchaseOrder, {
      dnNumber: defaultInvNum,
      deliveryDate: dn.deliveryDate,
      recipientName: dn.recipientName || dn.customerName,
      dispatchOfficer: dn.dispatchOfficer,
      companyName: dn.companyName || 'C P P A',
      companySubtext: dn.companySubtext || 'الشؤون الخاصة لسمو ولي العهد',
      includePrices: true,
      vatRate: 0.15,
      items: poItemsForInvoice
    });

    loadNotes();
  };

  // Re-print Delivery Note (No Price)
  const handlePrintDeliveryNoteNoPrice = (dn: DeliveryNoteRecord) => {
    const poItemsForPrint: POItem[] = dn.items.map((item, idx) => ({
      id: item.id,
      poId: dn.poId,
      poNumber: dn.poNumber,
      slNumber: idx + 1,
      itemName: item.itemName,
      customerItemName: item.poItemName || item.itemName,
      internalItemName: item.itemName,
      internalItemCode: item.sku,
      sku: item.sku,
      unit: item.unit,
      requestedQty: item.requestedQty,
      orderedQty: item.requestedQty,
      purchasedQty: item.deliveredQty,
      warehouseQty: item.deliveredQty,
      passedQty: item.deliveredQty,
      category: 'General',
      brand: item.brand,
      purchaseStatus: 'Purchased',
      remainingQty: 0
    }));

    const parentPO = pos.find(p => p.poNumber === dn.poNumber) || {
      id: dn.poId,
      poNumber: dn.poNumber,
      customerName: dn.customerName,
      orderDate: dn.createdDate,
      deliveryDate: dn.deliveryDate,
      totalItems: dn.items.length,
      totalQuantity: dn.items.reduce((s, i) => s + i.deliveredQty, 0),
      purchaseStatus: 'Completed',
      receiveStatus: 'Completed',
      status: 'dispatched',
      items: poItemsForPrint,
      createdBy: dn.dispatchOfficer,
      createdAt: dn.createdDate,
      updatedAt: dn.createdDate
    };

    printOfficialDeliveryChallanNoPrice(parentPO as PurchaseOrder, {
      challanNumber: dn.challanNumber,
      deliveryDate: dn.deliveryDate,
      recipientName: dn.recipientName || dn.customerName,
      dispatchOfficer: dn.dispatchOfficer,
      notes: dn.notes,
      companyName: dn.companyName,
      companySubtext: dn.companySubtext,
      items: poItemsForPrint
    });
  };

  // Delete Delivery Note
  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this Delivery Note record? Previously delivered quantities will be restored as available.')) {
      deleteDeliveryNote(id);
      loadNotes();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-4 py-3 space-y-3 font-sans text-slate-900">
      
      {/* Banner */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-teal-400" />
            <h1 className="text-base font-black leading-tight">Dispatcher & Delivery Tracking Hub</h1>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dispatch Officer: <span className="text-slate-200 font-bold">{currentUser.name}</span> • SKU Conversion, Delivery Note Tracking & Official Invoice Builder
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFullExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
            title="Download PO-wise Dispatch Report Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export PO Report</span>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION HEADER */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'pos'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Active POs & SKU Conversion</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'pos' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {filteredMetrics.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 min-w-[150px] px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
            activeTab === 'tracking'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Delivery Notes Tracking</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'tracking' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {deliveryNotes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 min-w-[150px] px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition relative ${
            activeTab === 'invoices'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Pending Invoices</span>
          {pendingInvoicesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-900 font-extrabold animate-pulse">
              {pendingInvoicesCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ACTIVE POS & SKU CONVERSION */}
      {activeTab === 'pos' && (
        <div className="space-y-3">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              onClick={() => setStatusFilter(statusFilter === 'ready' ? 'all' : 'ready')}
              className={`p-2.5 rounded-xl border text-left transition ${
                statusFilter === 'ready'
                  ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-400'
                  : 'bg-white border-slate-200 hover:border-purple-300'
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">Ready To Deliver</p>
              <p className="text-lg font-black text-purple-800 mt-0.5">{readyForDispatchCount}</p>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
              className={`p-2.5 rounded-xl border text-left transition ${
                statusFilter === 'pending'
                  ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
                  : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">Pending</p>
              <p className="text-lg font-black text-amber-800 mt-0.5">{pendingPoCount}</p>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
              className={`p-2.5 rounded-xl border text-left transition ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">Already Delivered</p>
              <p className="text-lg font-black text-emerald-800 mt-0.5">{alreadyDeliveredPoCount}</p>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'partial' ? 'all' : 'partial')}
              className={`p-2.5 rounded-xl border text-left transition ${
                statusFilter === 'partial'
                  ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">Partial PO</p>
              <p className="text-lg font-black text-blue-800 mt-0.5">{partialPoCount}</p>
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={`p-2.5 rounded-xl border text-left transition ${
                statusFilter === 'all'
                  ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">All POs</p>
              <p className="text-lg font-black text-slate-800 mt-0.5">{poMetrics.length}</p>
            </button>
          </div>

          {/* RUNNING PO LIST (ACTIVE ORDERS) */}
          <RunningPoList pos={pos} />

          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-700 pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-teal-600" />
                <span>Dispatch Filters</span>
              </div>
              {statusFilter !== 'all' && (
                <button 
                  onClick={() => setStatusFilter('all')}
                  className="text-[10px] text-indigo-600 hover:underline font-bold"
                >
                  Reset Status Filter ({statusFilter})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
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
                <label className="text-[10px] font-bold uppercase text-slate-400">Delivery Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full mt-0.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-indigo-900 font-bold"
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="ready">Ready To Deliver</option>
                  <option value="pending">Pending</option>
                  <option value="delivered">Already Delivered</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Search PO / Item</label>
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
          </div>

          {/* PO Progress List */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Purchase Orders Overview ({filteredMetrics.length})
            </h2>

            {filteredMetrics.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center border border-slate-200 text-slate-500 text-xs font-bold">
                No Purchase Orders found for selected filters.
              </div>
            ) : (
              filteredMetrics.map((m, poIdx) => {
                const isExpanded = !!expandedPoIds[m.po.id];

                return (
                  <div
                    key={m.po.id ? `${m.po.id}-${poIdx}` : `po-${poIdx}`}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                  >
                    {/* Header */}
                    <div
                      onClick={() => toggleExpand(m.po.id)}
                      className="p-3 cursor-pointer hover:bg-slate-50 transition space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm font-mono">{m.po.poNumber}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.isFullyReceived
                                ? 'bg-purple-100 text-purple-800'
                                : m.isPartial
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {m.isFullyReceived ? 'Ready For Dispatch' : m.isPartial ? 'Partial' : 'Pending'}
                            </span>
                            {m.totalDeliveredAcrossItems > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-1">
                                <History className="w-3 h-3 text-emerald-700" />
                                {m.totalDeliveredAcrossItems} Units Delivered in DN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {m.po.department || 'General'} • {m.po.location || 'Central Warehouse'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs">
                            <p className="font-black text-slate-900">{m.progressPct}%</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Progress</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPoForChallan(m.po);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                            title="Convert Items & Create Official Delivery Note"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                            <span>Convert SKUs & Delivery Note</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportSinglePoExcel(m.po);
                            }}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded flex items-center gap-1 text-[11px] font-bold transition"
                            title="Download this PO's Excel Report"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Excel</span>
                          </button>
                          <button className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Compact Progress Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            m.progressPct === 100 ? 'bg-purple-600' : m.progressPct > 0 ? 'bg-blue-600' : 'bg-amber-400'
                          }`}
                          style={{ width: `${m.progressPct}%` }}
                        />
                      </div>

                      {/* Grid Stats */}
                      <div className="grid grid-cols-4 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Items</span>
                          <p className="font-bold text-slate-900">{m.totalItems}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Purchased</span>
                          <p className="font-bold text-blue-700">{m.purchasedItems}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Delivered Units</span>
                          <p className="font-bold text-emerald-700">{m.totalDeliveredAcrossItems}</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Receive Status</span>
                          <p className="font-bold text-purple-700">{m.po.receiveStatus || 'Pending'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Item List */}
                    {isExpanded && (
                      <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
                        <h4 className="font-bold text-slate-700 uppercase text-[10px]">PO Items & Delivery Status</h4>
                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white overflow-hidden">
                          {m.po.items.map((item, itemIdx) => {
                            const ord = item.requestedQty || item.orderedQty || 0;
                            const pur = item.purchasedQty || 0;
                            const rec = item.warehouseQty || item.passedQty || 0;
                            const prevDelivered = getDeliveredQtyForPOItem(m.po.poNumber, item.id, item.itemName);
                            const available = Math.max(0, rec - prevDelivered);

                            const savedSku = getPoItemSkuMapping(m.po.poNumber, item.id, item.itemName);
                            const activeSku = savedSku?.sku || item.sku || item.internalItemCode;
                            const activeName = savedSku?.itemName || item.internalItemName || item.itemName;

                            return (
                              <div key={item.id ? `${item.id}-${itemIdx}` : `item-${itemIdx}`} className="p-2.5 flex items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-slate-900">{activeName}</p>
                                    {activeSku && (
                                      <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold rounded">
                                        SKU: {activeSku}
                                      </span>
                                    )}
                                    {savedSku && (
                                      <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-bold rounded flex items-center gap-0.5">
                                        <Check className="w-3 h-3 text-emerald-600" /> Arranged / Prepped
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Ordered: <strong>{ord} {item.unit}</strong> | Received: <strong>{rec} {item.unit}</strong> | Prev Delivered: <strong className="text-amber-700">{prevDelivered} {item.unit}</strong>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {prevDelivered > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                                      {prevDelivered >= rec ? 'Fully Delivered in DN' : `Partial DN (${prevDelivered}/${rec})`}
                                    </span>
                                  )}

                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    available > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {available > 0 ? `${available} Available for DN` : '0 Available'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DELIVERY NOTES TRACKING & HISTORY */}
      {activeTab === 'tracking' && (
        <div className="space-y-3">
          {/* Top Info Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Delivery Notes History & Tracking ({deliveryNotes.length})</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-amber-700 font-bold">Pending Invoice: {pendingInvoicesCount}</span>
                <span className="text-emerald-700 font-bold">Invoiced: {invoicedNotesCount}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  placeholder="Search Challan No, PO Number, SKU or Item..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Status Filter:</label>
                <select
                  value={trackingStatusFilter}
                  onChange={(e) => setTrackingStatusFilter(e.target.value as any)}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="all">All Delivery Notes</option>
                  <option value="Pending Invoice">Pending Invoice Only</option>
                  <option value="Invoiced">Invoiced Only</option>
                  <option value="Delivery Confirmed">Delivery Confirmed</option>
                  <option value="Partially Returned">Partially Returned</option>
                  <option value="Fully Returned">Fully Returned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Delivery Notes List */}
          {filteredDeliveryNotes.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500 text-xs font-bold space-y-2">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No Delivery Notes recorded yet.</p>
              <p className="text-[11px] font-normal text-slate-400">
                Go to <strong>Active POs & SKU Conversion</strong> tab, select a PO, convert items to SKU names and click "Print Delivery Note" to create tracked Delivery Notes.
              </p>
            </div>
          ) : (
            filteredDeliveryNotes.map((dn, idx) => {
              const isExpanded = !!expandedDnIds[dn.id];
              const totalUnits = (dn.items || []).reduce((sum, item) => sum + item.deliveredQty, 0);

              return (
                <div key={dn.id ? `${dn.id}-${idx}` : `dn-${idx}`} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div
                    onClick={() => toggleExpandDn(dn.id)}
                    className="p-3 cursor-pointer hover:bg-slate-50 transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-indigo-900 text-sm font-mono">{dn.challanNumber}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] rounded">
                            PO: {dn.poNumber}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            dn.status === 'Invoiced'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : dn.status === 'Delivery Confirmed'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : dn.status === 'Partially Returned'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : dn.status === 'Fully Returned'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {dn.status === 'Invoiced' 
                              ? `Invoiced (${dn.invoiceNumber || 'INV'})` 
                              : dn.status === 'Delivery Confirmed'
                              ? '✅ Delivery Confirmed'
                              : dn.status === 'Partially Returned'
                              ? '⚠️ Partially Returned'
                              : dn.status === 'Fully Returned'
                              ? '↩️ Fully Returned'
                              : 'Pending Official Invoice'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Consignee: <strong className="text-slate-800">{dn.recipientName || dn.customerName}</strong> • Date: <strong>{dn.deliveryDate}</strong> • Officer: <strong>{dn.dispatchOfficer}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-right text-xs pr-1">
                          <p className="font-black text-emerald-700 text-sm">{totalUnits} Units</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{dn.items.length} Converted Items</p>
                        </div>

                        {/* Delivery Confirmation & Return Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfirmModal(dn);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition shadow-2xs ${
                            dn.status === 'Delivery Confirmed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : dn.status === 'Partially Returned' || dn.status === 'Fully Returned'
                              ? 'bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          title="Confirm item delivery status or process returns"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>
                            {dn.status === 'Delivery Confirmed'
                              ? 'Confirmed'
                              : dn.status === 'Partially Returned'
                              ? 'Partially Returned'
                              : dn.status === 'Fully Returned'
                              ? 'Fully Returned'
                              : 'Confirm Delivery / Return'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintDeliveryNoteNoPrice(dn);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center gap-1 text-xs font-bold transition shadow-2xs"
                          title="Re-print Official Delivery Note (No Price)"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-300" />
                          <span>Delivery Note</span>
                        </button>

                        {dn.status === 'Pending Invoice' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab('invoices');
                            }}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1 text-xs font-bold transition shadow-2xs"
                            title="Generate Official PO Invoice"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Generate Invoice</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(dn.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Delivery Note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Table */}
                  {isExpanded && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-700 text-[10px] uppercase">
                        <span>Converted Items in this Delivery Note</span>
                        <span>Created At: {new Date(dn.createdDate).toLocaleString()}</span>
                      </div>
                      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="p-2 w-8 text-center">#</th>
                              <th className="p-2">Converted SKU Name</th>
                              <th className="p-2 w-28 font-mono">SKU Code</th>
                              <th className="p-2 w-20 text-center">Unit</th>
                              <th className="p-2 w-24 text-center">Dispatched Qty</th>
                              <th className="p-2 w-36 text-center">Delivery Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dn.items.map((item, idx) => (
                              <tr key={item.id || idx} className={item.isReturned ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50'}>
                                <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                                <td className="p-2 font-bold text-slate-800">
                                  {item.itemName}
                                  {item.poItemName && item.poItemName !== item.itemName && (
                                    <span className="block text-[10px] text-slate-400 font-normal">Original PO Item: {item.poItemName}</span>
                                  )}
                                  {item.returnReason && (
                                    <span className="block text-[10px] text-rose-700 font-bold">Return Note: {item.returnReason}</span>
                                  )}
                                </td>
                                <td className="p-2 font-mono font-bold text-indigo-700">{item.sku}</td>
                                <td className="p-2 text-center uppercase font-semibold">{item.unit}</td>
                                <td className="p-2 text-center font-black text-slate-900">{item.deliveredQty}</td>
                                <td className="p-2 text-center">
                                  {item.isReturned || (item.returnedQty && item.returnedQty > 0) ? (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-full border border-rose-300 inline-flex items-center gap-1">
                                      <RotateCcw className="w-3 h-3 text-rose-600" />
                                      Returned ({item.returnedQty || item.deliveredQty} {item.unit})
                                    </span>
                                  ) : item.isConfirmed ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-300 inline-flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Accepted ({item.acceptedQty ?? item.deliveredQty} {item.unit})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-semibold text-[10px] rounded-full border border-amber-200">
                                      Out for Delivery
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: PENDING INVOICES & OFFICIAL INVOICE GENERATOR */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Receipt className="w-4 h-4 text-amber-700" />
              <span>Pending Invoices & Official PO Invoice Generator</span>
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Delivery Notes whose physical delivery has been completed are held here pending Official Invoice generation.
              Review converted items, verify unit prices (with default 15% VAT), and click <strong>"Generate & Print Official Invoice"</strong>.
            </p>
          </div>

          {/* List of Pending Invoices */}
          {deliveryNotes.filter(n => n.status === 'Pending Invoice').length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500 text-xs font-bold space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p>No pending invoices at the moment.</p>
              <p className="text-[11px] font-normal text-slate-400">
                All created Delivery Notes have already been converted into official invoices!
              </p>
            </div>
          ) : (
            deliveryNotes
              .filter(n => n.status === 'Pending Invoice')
              .map((dn, idx) => {
                const invNum = invoiceNumbers[dn.id] || `INV-${dn.poNumber.replace(/^PO-?/i, '')}-${Date.now().toString().slice(-4)}`;
                
                // Calculate Totals
                let subTotal = 0;
                dn.items.forEach(item => {
                  const price = customUnitPrices[item.id] !== undefined ? customUnitPrices[item.id] : (item.unitPrice ?? 0);
                  subTotal += item.deliveredQty * price;
                });
                const vatAmount = subTotal * 0.15;
                const grandTotal = subTotal + vatAmount;

                return (
                  <div key={dn.id ? `${dn.id}-${idx}` : `inv-dn-${idx}`} className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-900 text-sm">{dn.challanNumber}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] rounded">
                            PO: {dn.poNumber}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full uppercase">
                            Pending Official Invoice
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Consignee: <strong className="text-slate-800">{dn.recipientName || dn.customerName}</strong> • Delivery Date: <strong>{dn.deliveryDate}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Invoice #:</label>
                        <input
                          type="text"
                          value={invNum}
                          onChange={(e) => setInvoiceNumbers(prev => ({ ...prev, [dn.id]: e.target.value }))}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-900"
                        />
                      </div>
                    </div>

                    {/* Items & Prices Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900 text-white font-bold text-[11px]">
                          <tr>
                            <th className="p-2 text-center w-8">#</th>
                            <th className="p-2 w-28 font-mono">SKU Code</th>
                            <th className="p-2">Converted Item Description</th>
                            <th className="p-2 text-center w-20">Unit</th>
                            <th className="p-2 text-center w-20">Delivered</th>
                            <th className="p-2 text-right w-28">Unit Price</th>
                            <th className="p-2 text-right w-28">Total Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dn.items.map((item, idx) => {
                            const uPrice = customUnitPrices[item.id] !== undefined ? customUnitPrices[item.id] : (item.unitPrice ?? 0);
                            const lineTotal = item.deliveredQty * uPrice;

                            return (
                              <tr key={item.id || idx} className="hover:bg-slate-50">
                                <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                                <td className="p-2 font-mono font-bold text-indigo-700">{item.sku}</td>
                                <td className="p-2 font-bold text-slate-800">{item.itemName}</td>
                                <td className="p-2 text-center font-semibold uppercase">{item.unit}</td>
                                <td className="p-2 text-center font-black text-emerald-800">{item.deliveredQty}</td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={uPrice}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setCustomUnitPrices(prev => ({ ...prev, [item.id]: val }));
                                    }}
                                    className="w-24 text-right px-2 py-0.5 border border-slate-300 rounded text-xs font-bold bg-white"
                                  />
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900">
                                  {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                          <tr>
                            <td colSpan={6} className="p-2 text-right text-slate-600">SUB TOTAL:</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {subTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="p-2 text-right text-slate-600">VAT (15%):</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-indigo-50/70 text-indigo-950 font-black">
                            <td colSpan={6} className="p-2 text-right text-indigo-900 text-xs">GRAND TOTAL:</td>
                            <td className="p-2 text-right font-mono text-sm text-indigo-900">
                              {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGenerateInvoice(dn)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 text-emerald-100" />
                        <span>Generate & Print Official PO Invoice</span>
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* DELIVERY CHALLAN (NO PRICE) MODAL */}
      {selectedPoForChallan && (
        <DeliveryChallanModal
          po={selectedPoForChallan}
          onClose={() => setSelectedPoForChallan(null)}
          onDeliveryNoteCreated={() => {
            loadNotes();
          }}
        />
      )}

      {/* DELIVERY CONFIRMATION & RETURN MODAL */}
      {confirmModalDn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-4 sm:p-5 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">Delivery Confirmation & Item Returns</h3>
                  <p className="text-[11px] text-slate-500">
                    Challan: <strong className="font-mono text-indigo-900">{confirmModalDn.challanNumber}</strong> • PO: <strong>{confirmModalDn.poNumber}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmModalDn(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-black flex items-center gap-1 text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                DELIVERY CONFIRMATION INSTRUCTIONS:
              </p>
              <p className="text-[11.5px] leading-relaxed">
                • <strong>CHECK (Select)</strong> items that were successfully delivered & accepted by the customer.<br />
                • <strong>UNCHECK (Deselect)</strong> items that were <strong>RETURNED</strong>. Unchecked items will automatically be restored back to the PO balance so they can be re-dispatched.
              </p>
            </div>

            {/* Quick Select All / Deselect All */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-bold text-slate-700">Item List ({confirmModalDn.items.length})</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allTrue: Record<string, boolean> = {};
                    confirmModalDn.items.forEach(i => allTrue[i.id] = true);
                    setSelectedItemsForDelivery(allTrue);
                  }}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg transition"
                >
                  Select All (All Delivered)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allFalse: Record<string, boolean> = {};
                    confirmModalDn.items.forEach(i => allFalse[i.id] = false);
                    setSelectedItemsForDelivery(allFalse);
                  }}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-bold rounded-lg transition"
                >
                  Deselect All (All Returned)
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-12 text-center">Select</th>
                    <th className="p-2.5">Item Name & SKU</th>
                    <th className="p-2.5 text-center w-24">Qty</th>
                    <th className="p-2.5 text-center w-36">Delivery Status</th>
                    <th className="p-2.5">Return Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {confirmModalDn.items.map((item, idx) => {
                    const isSelected = selectedItemsForDelivery[item.id] !== false;

                    return (
                      <tr key={item.id ? `${item.id}-${idx}` : `cfm-${idx}`} className={isSelected ? 'bg-white' : 'bg-rose-50/50'}>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedItemsForDelivery(prev => ({
                                ...prev,
                                [item.id]: e.target.checked
                              }));
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{item.itemName}</p>
                          <p className="text-[10px] font-mono font-bold text-indigo-700">SKU: {item.sku}</p>
                        </td>
                        <td className="p-2.5 text-center font-black text-slate-900">
                          {item.deliveredQty} {item.unit}
                        </td>
                        <td className="p-2.5 text-center">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10.5px] rounded-full border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10.5px] rounded-full border border-rose-300">
                              <RotateCcw className="w-3 h-3 text-rose-600" /> Returned
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {!isSelected ? (
                            <input
                              type="text"
                              value={itemReturnReasons[item.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItemReturnReasons(prev => ({ ...prev, [item.id]: val }));
                              }}
                              placeholder="Reason for return..."
                              className="w-full text-xs p-1 bg-white border border-rose-300 rounded focus:ring-1 focus:ring-rose-500 font-medium"
                            />
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal">Accepted by customer</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModalDn(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeliveryConfirmation}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow transition"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Confirm Delivery & Process Returns</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
