import React from 'react';
import { useERP } from '../context/ERPContext';
import {
  ShoppingCart,
  Clock,
  Lock,
  DollarSign,
  ArrowRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { purchaseOrders, auditLogs, setCurrentView, setActiveModal } = useERP();

  // Metrics calculations
  const totalPOs = purchaseOrders.length;
  const pendingPOs = purchaseOrders.filter((po) => po.status === 'Pending' || po.status === 'Partial Purchased').length;
  
  const heldItemsCount = purchaseOrders.reduce(
    (acc, po) => acc + po.items.filter((i) => i.purchaseStatus === 'On Hold').length,
    0
  );

  const totalEstimatedSpend = purchaseOrders.reduce((acc, po) => acc + po.totalEstimatedCost, 0);
  const totalActualSpend = purchaseOrders.reduce((acc, po) => acc + po.totalActualCost, 0);

  return (
    <div className="space-y-6">
      {/* 6. Typography Requirement: Dashboard Title 32px */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight">
            Operational Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time Food Purchase, Hold Locks & Inventory Control overview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal('new-po')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all"
          >
            <span>Create Purchase Order</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Enterprise Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Total POs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            {/* Card Title: 16px */}
            <span className="text-[16px] font-medium text-slate-400">Total Purchase Orders</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <ShoppingCart size={20} />
            </div>
          </div>
          {/* Numbers: 28-32px */}
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[32px] font-bold text-white tracking-tight">{totalPOs}</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Active Session
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Active supplier requisitions</p>
        </div>

        {/* Metric 2: Pending Purchases */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-medium text-slate-400">Pending Purchases</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[32px] font-bold text-amber-400 tracking-tight">{pendingPOs}</span>
            <span className="text-xs text-slate-400">Action Required</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Orders awaiting field execution</p>
        </div>

        {/* Metric 3: Held Items Lock */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-medium text-slate-400">Held Items (Locked)</span>
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Lock size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[32px] font-bold text-purple-400 tracking-tight">{heldItemsCount}</span>
            <span className="text-xs font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Active Locks
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Purchaser concurrency protection</p>
        </div>

        {/* Metric 4: Total Spend */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-medium text-slate-400">Total Purchase Value</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[28px] font-bold text-emerald-400 tracking-tight">
              ${totalActualSpend > 0 ? totalActualSpend.toLocaleString('en-US', { minimumFractionDigits: 2 }) : totalEstimatedSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Verified supplier expenditures</p>
        </div>

      </div>

      {/* Main Grid: Purchase Orders Quick Overview & Real-time Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active Orders Table */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            {/* Section Title: 22px */}
            <h2 className="text-[22px] font-semibold text-white tracking-tight">
              Recent Purchase Orders
            </h2>
            <button
              onClick={() => setCurrentView('purchase')}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View All Orders ({purchaseOrders.length}) <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3">PO Number</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Order Date</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Purchase Status</th>
                  <th className="py-3 px-3">Receive Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {purchaseOrders.slice(0, 4).map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-blue-400">{po.id}</td>
                    <td className="py-3 px-3 font-medium text-white">{po.supplier}</td>
                    <td className="py-3 px-3 text-slate-400">{po.orderDate}</td>
                    <td className="py-3 px-3">{po.items.length} items</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold border ${
                          po.status === 'Purchased'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : po.status === 'On Hold'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : po.status === 'Partial Purchased'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-semibold border ${
                          po.receiveStatus === 'Received'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : po.receiveStatus === 'Partial Received'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {po.receiveStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Live Operational Audit Feed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-[22px] font-semibold text-white tracking-tight">
              Live Activity Audit
            </h2>
            <button
              onClick={() => setActiveModal('audit-logs')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Full Log
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-blue-300">{log.user}</span>
                  <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                </div>
                <p className="text-slate-300 mt-1 leading-snug">{log.details}</p>
                <span className="inline-block mt-2 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
