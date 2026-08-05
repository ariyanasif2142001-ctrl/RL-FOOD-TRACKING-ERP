import React, { useState } from 'react';
import { PurchaseOrder, User } from '../../types';
import { RunningPoList } from '../RunningPoList';
import { 
  Truck, Search, Filter, ChevronDown, ChevronUp, FileSpreadsheet, Download, 
  Package, History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDeliveredQtyForPOItem } from '../../services/deliveryNoteService';

interface DispatchViewProps {
  pos: PurchaseOrder[];
  currentUser: User;
}

export const DispatchView: React.FC<DispatchViewProps> = ({ pos, currentUser }) => {
  // Filters for POs
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'completed' | 'ready' | 'delivered'>('all');

  // Accordion State
  const [expandedPoIds, setExpandedPoIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedPoIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Unique lists for filters
  const locations = Array.from(new Set(pos.map(p => p.location).filter(Boolean)));
  const departments = Array.from(new Set(pos.map(p => p.department).filter(Boolean)));
  const poNumbers = Array.from(new Set(pos.map(p => p.poNumber).filter(Boolean)));

  // Compute PO metrics for dispatch reports
  const poMetrics = pos.map(po => {
    const totalItems = po.items.length;
    const purchasedItems = po.items.filter(i => (i.purchasedQty || 0) > 0).length;
    const fullyPurchasedItems = po.items.filter(i => (i.purchasedQty || 0) >= (i.requestedQty || i.orderedQty || 0)).length;
    const receivedItems = po.items.filter(i => (i.warehouseQty || i.passedQty || 0) > 0).length;
    const fullyReceivedItems = po.items.filter(i => (i.warehouseQty || i.passedQty || 0) >= (i.requestedQty || i.orderedQty || 0)).length;
    const remainingItems = totalItems - fullyPurchasedItems;

    // Delivered quantities across items
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
  const readyForDispatchCount = poMetrics.filter(m => m.isFullyReceived).length;
  const alreadyDeliveredPoCount = poMetrics.filter(m => m.totalDeliveredAcrossItems > 0).length;

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
      'Delivered Units': m.totalDeliveredAcrossItems,
      'Pending Items': m.remainingItems,
    }));

    const itemRows: Record<string, string | number>[] = [];
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
          'Purchase Status': item.purchaseStatus || 'Pending'
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

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-4 py-3 space-y-3 font-sans text-slate-900">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] border border-emerald-900/60 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-teal-400" />
            <h1 className="text-base font-black leading-tight">Dispatcher & Dispatch Report Portal</h1>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dispatch Officer: <span className="text-slate-200 font-bold">{currentUser.name}</span> • Purchase Order Tracking & Dispatch Status Reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportFullExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            title="Download PO-wise Dispatch Report Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Full PO Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-3">
        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'ready' ? 'all' : 'ready')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'ready'
                ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-400'
                : 'bg-white border-slate-200 hover:border-purple-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-400">Ready To Deliver</p>
            <p className="text-lg font-black text-purple-800 mt-0.5">{readyForDispatchCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
                : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-400">Pending</p>
            <p className="text-lg font-black text-amber-800 mt-0.5">{pendingPoCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'delivered'
                ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-400">Already Delivered</p>
            <p className="text-lg font-black text-emerald-800 mt-0.5">{alreadyDeliveredPoCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'partial' ? 'all' : 'partial')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'partial'
                ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
                : 'bg-white border-slate-200 hover:border-blue-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-400">Partial PO</p>
            <p className="text-lg font-black text-blue-800 mt-0.5">{partialPoCount}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-400">All POs</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{poMetrics.length}</p>
          </button>
        </div>

        {/* RUNNING PO LIST (ACTIVE ORDERS & REPORTS) */}
        <RunningPoList pos={pos} allowDelete={false} allowStatusChange={false} />

        {/* Filter Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs shadow-2xs">
          <div className="flex items-center justify-between font-bold text-slate-700 pb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>Dispatch Report Filters</span>
            </div>
            {statusFilter !== 'all' && (
              <button 
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer"
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
                onChange={(e) => setStatusFilter(e.target.value as Parameters<typeof setStatusFilter>[0])}
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

        {/* PO Progress & Items Report List */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            Purchase Orders Breakdown ({filteredMetrics.length})
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
                              {m.totalDeliveredAcrossItems} Units Dispatched
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
                            handleExportSinglePoExcel(m.po);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1 text-[11px] font-bold transition cursor-pointer"
                          title="Download this PO's Excel Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Excel</span>
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
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Warehouse Received</span>
                        <p className="font-bold text-purple-700">{m.receivedItems}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Dispatched Units</span>
                        <p className="font-bold text-emerald-700">{m.totalDeliveredAcrossItems}</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Item List */}
                  {isExpanded && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
                      <h4 className="font-bold text-slate-700 uppercase text-[10px]">PO Items Breakdown & Purchase Quantities</h4>
                      <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-white overflow-hidden">
                        {m.po.items.map((item, itemIdx) => {
                          const ord = item.requestedQty || item.orderedQty || 0;
                          const pur = item.purchasedQty || 0;
                          const rec = item.warehouseQty || item.passedQty || 0;
                          const prevDelivered = getDeliveredQtyForPOItem(m.po.poNumber, item.id, item.itemName);

                          return (
                            <div key={item.id ? `${item.id}-${itemIdx}` : `item-${itemIdx}`} className="p-2.5 flex items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-slate-900">{item.itemName}</p>
                                  {item.brand && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 font-sans text-[10px] font-bold rounded">
                                      Brand: {item.brand}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Requested: <strong>{ord} {item.unit}</strong> | Purchased: <strong className="text-blue-700">{pur} {item.unit}</strong> | Received: <strong className="text-purple-700">{rec} {item.unit}</strong>
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pur >= ord && ord > 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : pur > 0
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.purchaseStatus || 'Pending'}
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

    </div>
  );
};
