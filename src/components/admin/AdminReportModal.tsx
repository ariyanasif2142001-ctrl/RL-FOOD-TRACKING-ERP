import React from 'react';
import { PurchaseOrder } from '../../types';
import { FileText, Download, X } from 'lucide-react';

interface AdminReportModalProps {
  selectedReport: 'total' | 'pending' | 'partial' | 'completed' | 'items_pending' | 'items_held' | 'items_partial' | 'items_purchased' | null;
  setSelectedReport: (report: any) => void;
  reportSearchQuery: string;
  setReportSearchQuery: (query: string) => void;
  reportPurchaserFilter: string;
  setReportPurchaserFilter: (purchaser: string) => void;
  getReportData: () => { title: string; type: 'po' | 'item'; posList: PurchaseOrder[]; items: any[] };
  handleExportReportCSV: () => void;
  setSelectedPoForDetail: (po: PurchaseOrder | null) => void;
  uniqueHoldPurchasers: string[];
}

export const AdminReportModal: React.FC<AdminReportModalProps> = ({
  selectedReport,
  setSelectedReport,
  reportSearchQuery,
  setReportSearchQuery,
  reportPurchaserFilter,
  setReportPurchaserFilter,
  getReportData,
  handleExportReportCSV,
  setSelectedPoForDetail,
  uniqueHoldPurchasers
}) => {
  if (!selectedReport) return null;

  const reportData = getReportData();

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5" onClick={() => setSelectedReport(null)}>
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{reportData.title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">Detailed breakdown and exportable metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportReportCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls / Search & Filters */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={reportSearchQuery}
              onChange={(e) => setReportSearchQuery(e.target.value)}
              placeholder="Search PO Number, Item, Department, Brand..."
              className="w-full pl-3 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {selectedReport === 'items_held' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-600">Filter Purchaser:</span>
              <select
                value={reportPurchaserFilter}
                onChange={(e) => setReportPurchaserFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Purchasers ({uniqueHoldPurchasers.length})</option>
                {uniqueHoldPurchasers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Table Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] flex-1">
          {reportData.type === 'po' ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">PO Number</th>
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5 text-center">Items Qty</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.posList.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-mono font-bold text-blue-700">#{po.poNumber}</td>
                      <td className="p-2.5 text-slate-700">{po.location || 'Central Warehouse'}</td>
                      <td className="p-2.5 text-slate-700">{po.department || 'General'}</td>
                      <td className="p-2.5 text-center font-bold text-slate-800">{po.items?.length || 0}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          po.purchaseStatus === 'Completed' || po.status === 'purchased'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.purchaseStatus === 'Partial' || po.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {po.purchaseStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(null);
                            setSelectedPoForDetail(po);
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">PO #</th>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Brand</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5 text-center">Requested</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Notes / Hold By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reportData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-mono font-bold text-blue-700">#{item.poNumber}</td>
                      <td className="p-2.5 font-bold text-slate-900">{item.itemName}</td>
                      <td className="p-2.5 text-slate-600">{item.brand || '-'}</td>
                      <td className="p-2.5 text-slate-600">{item.department || '-'}</td>
                      <td className="p-2.5 text-center font-bold text-slate-800">{item.requestedQty || item.orderedQty || 0} {item.unit || 'pcs'}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.purchaseStatus === 'Purchased'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.purchaseStatus === 'Held'
                            ? 'bg-purple-100 text-purple-800'
                            : item.purchaseStatus === 'Partial Purchased'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.purchaseStatus === 'Held' ? 'Hold' : (item.purchaseStatus || 'Pending')}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-semibold">
                        {item.purchaseStatus === 'Held' ? (
                          <span className="text-purple-700 font-bold">🔒 {item.holdBy || 'Purchaser'}</span>
                        ) : (
                          item.notes || '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">
            Total Records: {reportData.type === 'po' ? reportData.posList.length : reportData.items.length}
          </span>
          <button
            type="button"
            onClick={() => setSelectedReport(null)}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition active:scale-95 shadow-xs"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
};
