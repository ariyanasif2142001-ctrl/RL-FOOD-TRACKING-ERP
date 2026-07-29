import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Send, BarChart3, Printer, FileSpreadsheet, DollarSign, PackageCheck, AlertTriangle, Building2 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { purchaseOrders, setActiveModal, showToast } = useERP();
  const [reportType, setReportType] = useState<'supplier' | 'department' | 'category'>('supplier');

  const totalSpend = purchaseOrders.reduce((acc, po) => acc + po.totalEstimatedCost, 0);
  const totalItems = purchaseOrders.reduce((acc, po) => acc + po.items.length, 0);
  const purchasedItems = purchaseOrders.reduce(
    (acc, po) => acc + po.items.filter((i) => i.purchaseStatus === 'Purchased').length,
    0
  );
  const heldItems = purchaseOrders.reduce(
    (acc, po) => acc + po.items.filter((i) => i.purchaseStatus === 'On Hold').length,
    0
  );

  // Group by supplier
  const supplierBreakdown = purchaseOrders.reduce((acc, po) => {
    if (!acc[po.supplier]) {
      acc[po.supplier] = { count: 0, spend: 0, items: 0 };
    }
    acc[po.supplier].count += 1;
    acc[po.supplier].spend += po.totalEstimatedCost;
    acc[po.supplier].items += po.items.length;
    return acc;
  }, {} as Record<string, { count: number; spend: number; items: number }>);

  // Group by department
  const deptBreakdown = purchaseOrders.reduce((acc, po) => {
    const dept = po.department || 'Central Kitchen';
    if (!acc[dept]) {
      acc[dept] = { count: 0, spend: 0 };
    }
    acc[dept].count += 1;
    acc[dept].spend += po.totalEstimatedCost;
    return acc;
  }, {} as Record<string, { count: number; spend: number }>);

  const exportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'PO_ID,Supplier,Department,Order_Date,Delivery_Date,Status,Total_Cost\n' +
      purchaseOrders
        .map(
          (po) =>
            `"${po.id}","${po.supplier}","${po.department}","${po.orderDate}","${po.deliveryDate}","${po.status}",${po.totalEstimatedCost}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RL_Food_ERP_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📊 Report CSV exported successfully!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            Executive ERP Reports & Financial Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time supplier commitment analysis, department allocation, and automated Telegram dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition-all"
          >
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all"
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => setActiveModal('telegram')}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-sky-600/30 transition-all"
          >
            <Send size={16} />
            <span>Telegram Dispatch</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm border-l-4 border-l-blue-600">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Purchase Commitment</span>
            <DollarSign size={18} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-500 font-semibold mt-1 block">Live Google Sheets Synced</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Purchased Items Rate</span>
            <PackageCheck size={18} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {purchasedItems} / {totalItems}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Fulfillment Rate: {totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0}%
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm border-l-4 border-l-purple-500">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Active Hold Locks</span>
            <AlertTriangle size={18} className="text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{heldItems} Items</p>
          <span className="text-[11px] text-purple-400 font-semibold mt-1 block">Purchaser Concurrency Lock</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm border-l-4 border-l-indigo-600">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Active Suppliers</span>
            <Building2 size={18} className="text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
            {Object.keys(supplierBreakdown).length} Vendors
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Verified Contracts</span>
        </div>
      </div>

      {/* Main Grid: Breakdown & Telegram Auto Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Breakdown Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-[22px] font-semibold text-slate-900 dark:text-white">
                Spend Breakdown Report
              </h2>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setReportType('supplier')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  reportType === 'supplier' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Supplier
              </button>
              <button
                onClick={() => setReportType('department')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  reportType === 'department' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Department
              </button>
            </div>
          </div>

          {reportType === 'supplier' ? (
            <div className="space-y-3">
              {Object.entries(supplierBreakdown).map(([sup, data]) => {
                const pct = totalSpend > 0 ? Math.round((data.spend / totalSpend) * 100) : 0;
                return (
                  <div key={sup} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{sup}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ${data.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pct}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{data.count} Purchase Orders</span>
                      <span>{data.items} Line Items</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="bg-blue-600 h-full rounded-full"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(deptBreakdown).map(([dept, data]) => {
                const pct = totalSpend > 0 ? Math.round((data.spend / totalSpend) * 100) : 0;
                return (
                  <div key={dept} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{dept}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        ${data.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="bg-indigo-600 h-full rounded-full"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Telegram Auto Dispatch Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send size={20} className="text-sky-500" />
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                  Telegram Auto-Reporter
                </h2>
              </div>
              <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded font-semibold">
                Bot Active
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Automated daily purchasing brief dispatched directly to executive Telegram channels or field purchasing groups.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
              <p className="text-sky-400 font-bold">🤖 RL Food Purchasing Brief</p>
              <p>• Total POs Active: {purchaseOrders.length}</p>
              <p>• Cumulative Commitment: ${totalSpend.toFixed(2)}</p>
              <p>• Purchased Fulfillment: {purchasedItems}/{totalItems} ({totalItems > 0 ? Math.round((purchasedItems/totalItems)*100) : 0}%)</p>
              <p>• Active Hold Locks: {heldItems}</p>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                Dispatch Target: @RL_Food_Purchasing_Bot
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('telegram')}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/30 transition-all"
          >
            Dispatch Now / Configure Credentials
          </button>
        </div>

      </div>
    </div>
  );
};
