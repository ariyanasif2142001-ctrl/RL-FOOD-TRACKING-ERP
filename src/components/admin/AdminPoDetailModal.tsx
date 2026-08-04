import React from 'react';
import { PurchaseOrder } from '../../types';
import { FileText, Send, Printer, FileSpreadsheet, X } from 'lucide-react';

interface AdminPoDetailModalProps {
  selectedPoForDetail: PurchaseOrder | null;
  setSelectedPoForDetail: (po: PurchaseOrder | null) => void;
  handleSendSinglePoTelegram: (po: PurchaseOrder) => void;
  sendingPoNumber: string | null;
  handlePrintPoReport: (po: PurchaseOrder) => void;
  handleExportSinglePoExcel: (po: PurchaseOrder) => void;
  setPdfModalPo?: (po: PurchaseOrder | null) => void;
}

export const AdminPoDetailModal: React.FC<AdminPoDetailModalProps> = ({
  selectedPoForDetail,
  setSelectedPoForDetail,
  handleSendSinglePoTelegram,
  sendingPoNumber,
  handlePrintPoReport,
  handleExportSinglePoExcel,
  setPdfModalPo
}) => {
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'complete' | 'partial' | 'hold' | 'received' | 'pending'>('all');

  React.useEffect(() => {
    setActiveFilter('all');
  }, [selectedPoForDetail?.poNumber, selectedPoForDetail?.id]);

  if (!selectedPoForDetail) return null;

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

  const receivedCount = items.filter(i => (i.warehouseQty || 0) > 0).length;

  const pendingReceiveCount = items.filter(i => {
    const req = i.requestedQty || i.orderedQty || 0;
    const pur = i.purchasedQty || 0;
    const target = pur > 0 ? pur : req;
    return (i.warehouseQty || 0) < target;
  }).length;

  const progressPct = totalItems > 0 ? Math.round((receivedCount / totalItems) * 100) : 0;

  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true;
    const req = item.requestedQty || item.orderedQty || 0;
    const pur = item.purchasedQty || 0;
    const rec = item.warehouseQty || 0;
    const isHold = item.purchaseStatus === 'Held' || item.purchaseStatus === 'Hold' || (item as any).isHeld;

    if (activeFilter === 'complete') {
      return (pur >= req && req > 0) || item.purchaseStatus === 'Purchased';
    }
    if (activeFilter === 'partial') {
      return pur > 0 && pur < req;
    }
    if (activeFilter === 'hold') {
      return isHold;
    }
    if (activeFilter === 'received') {
      return rec > 0;
    }
    if (activeFilter === 'pending') {
      const target = pur > 0 ? pur : req;
      return rec < target;
    }
    return true;
  });

  const getFilteredPoForExport = (): PurchaseOrder => {
    if (activeFilter === 'all') {
      return selectedPoForDetail;
    }

    const filterLabelMap: Record<string, string> = {
      complete: 'Complete Purchase',
      partial: 'Partial Items',
      hold: 'Hold Items',
      received: 'Warehouse Received',
      pending: 'Pending Receive'
    };

    const filterLabel = filterLabelMap[activeFilter] || 'Filtered Items';
    const reportTitle = `${filterLabel} Report — PO #${selectedPoForDetail.poNumber}`;

    return {
      ...selectedPoForDetail,
      items: filteredItems,
      reportTitle
    } as PurchaseOrder & { reportTitle?: string };
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5" onClick={() => setSelectedPoForDetail(null)}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white font-mono">
                  PO #{selectedPoForDetail.poNumber}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  selectedPoForDetail.purchaseStatus === 'Completed' || selectedPoForDetail.status === 'purchased'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : selectedPoForDetail.purchaseStatus === 'Partial'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {selectedPoForDetail.purchaseStatus || 'Pending'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {selectedPoForDetail.department || 'General'} • {selectedPoForDetail.location || 'Central Warehouse'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSendSinglePoTelegram(selectedPoForDetail)}
              disabled={sendingPoNumber === selectedPoForDetail.poNumber}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              title="Send this PO summary directly to Telegram group"
            >
              <Send className={`w-3.5 h-3.5 ${sendingPoNumber === selectedPoForDetail.poNumber ? 'animate-pulse' : ''}`} />
              <span>{sendingPoNumber === selectedPoForDetail.poNumber ? 'Sending...' : 'Send Telegram'}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrintPoReport(getFilteredPoForExport())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              title="Print / Save PDF Report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportSinglePoExcel(getFilteredPoForExport())}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              title="Export to Excel (CSV)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPoForDetail(null)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
              <p className="font-bold text-slate-800">{selectedPoForDetail.department || 'General'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Location</span>
              <p className="font-bold text-slate-800">{selectedPoForDetail.location || 'Central Warehouse'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Order Date</span>
              <p className="font-semibold text-slate-700">{selectedPoForDetail.orderDate || selectedPoForDetail.createdAt || 'N/A'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Date</span>
              <p className="font-semibold text-slate-700">{selectedPoForDetail.deliveryDate || 'N/A'}</p>
            </div>
          </div>

          {/* Progress Summary Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Overall Order Completion Progress</span>
              <span className="text-blue-700">{progressPct}% Complete</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPct === 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-blue-600' : 'bg-amber-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 text-center">
              {/* Total Items */}
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                  activeFilter === 'all'
                    ? 'bg-blue-600 text-white ring-4 ring-blue-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                    : 'bg-blue-600 text-white hover:bg-blue-700 opacity-90 hover:opacity-100 font-medium'
                }`}
              >
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-100">Total Items</span>
                <p className="text-xl font-black text-white mt-1">{totalItems}</p>
                <span className="text-[9px] font-semibold text-blue-200 mt-0.5">
                  {activeFilter === 'all' ? '● Show All' : 'Click to Reset'}
                </span>
              </button>

              {/* Complete Purchase */}
              <button
                type="button"
                onClick={() => setActiveFilter(prev => prev === 'complete' ? 'all' : 'complete')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                  activeFilter === 'complete'
                    ? 'bg-emerald-600 text-white ring-4 ring-emerald-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 opacity-90 hover:opacity-100 font-medium'
                }`}
              >
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-100">Complete Purchase</span>
                <p className="text-xl font-black text-white mt-1">{completeCount}</p>
                <span className="text-[9px] font-semibold text-emerald-200 mt-0.5">
                  {activeFilter === 'complete' ? '● Filtered' : 'Filter Items'}
                </span>
              </button>

              {/* Partial Items */}
              <button
                type="button"
                onClick={() => setActiveFilter(prev => prev === 'partial' ? 'all' : 'partial')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                  activeFilter === 'partial'
                    ? 'bg-orange-500 text-white ring-4 ring-orange-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                    : 'bg-orange-500 text-white hover:bg-orange-600 opacity-90 hover:opacity-100 font-medium'
                }`}
              >
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-orange-100">Partial Items</span>
                <p className="text-xl font-black text-white mt-1">{partialCount}</p>
                <span className="text-[9px] font-semibold text-orange-200 mt-0.5">
                  {activeFilter === 'partial' ? '● Filtered' : 'Filter Items'}
                </span>
              </button>

              {/* Hold Items */}
              <button
                type="button"
                onClick={() => setActiveFilter(prev => prev === 'hold' ? 'all' : 'hold')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                  activeFilter === 'hold'
                    ? 'bg-purple-600 text-white ring-4 ring-purple-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                    : 'bg-purple-600 text-white hover:bg-purple-700 opacity-90 hover:opacity-100 font-medium'
                }`}
              >
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-100">Hold Items</span>
                <p className="text-xl font-black text-white mt-1">{holdCount}</p>
                <span className="text-[9px] font-semibold text-purple-200 mt-0.5">
                  {activeFilter === 'hold' ? '● Filtered' : 'Filter Items'}
                </span>
              </button>

              {/* Warehouse Received */}
              <button
                type="button"
                onClick={() => setActiveFilter(prev => prev === 'received' ? 'all' : 'received')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                  activeFilter === 'received'
                    ? 'bg-teal-600 text-white ring-4 ring-teal-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                    : 'bg-teal-600 text-white hover:bg-teal-700 opacity-90 hover:opacity-100 font-medium'
                }`}
              >
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-teal-100">Warehouse Received</span>
                <p className="text-xl font-black text-white mt-1">{receivedCount}</p>
                <span className="text-[9px] font-semibold text-teal-200 mt-0.5">
                  {activeFilter === 'received' ? '● Filtered' : 'Filter Items'}
                </span>
              </button>

              {/* Pending Receive */}
              <button
                type="button"
                onClick={() => setActiveFilter(prev => prev === 'pending' ? 'all' : 'pending')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center flex flex-col justify-between select-none ${
                  activeFilter === 'pending'
                    ? 'bg-amber-600 text-white ring-4 ring-amber-300 ring-offset-2 scale-[1.02] shadow-md font-bold'
                    : 'bg-amber-600 text-white hover:bg-amber-700 opacity-90 hover:opacity-100 font-medium'
                }`}
              >
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-100">Pending Receive</span>
                <p className="text-xl font-black text-white mt-1">{pendingReceiveCount}</p>
                <span className="text-[9px] font-semibold text-amber-200 mt-0.5">
                  {activeFilter === 'pending' ? '● Filtered' : 'Filter Items'}
                </span>
              </button>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Line Items Detailed Breakdown ({filteredItems.length}/{items.length})</span>
                {activeFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] font-bold transition cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
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
                  {filteredItems.map((item, idx) => {
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
                          {item.purchaseStatus === 'Held' ? (
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
                      <td colSpan={10} className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50">
                        No line items match the selected filter ({activeFilter}).
                      </td>
                    </tr>
                  )}
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
  );
};
