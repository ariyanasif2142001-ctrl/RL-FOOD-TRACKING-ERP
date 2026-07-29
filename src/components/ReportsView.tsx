import React from 'react';
import { useERP } from '../context/ERPContext';
import { Send, BarChart3 } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { purchaseOrders, setActiveModal } = useERP();

  const totalSpend = purchaseOrders.reduce((acc, po) => acc + po.totalEstimatedCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight">
            ERP Reports & Telegram Dispatch
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate executive cost analysis, vendor performance reports, and instant Telegram summary notifications.
          </p>
        </div>

        <button
          onClick={() => setActiveModal('telegram')}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium text-xs sm:text-sm shadow-md shadow-sky-600/30 transition-all"
        >
          <Send size={18} />
          <span>Dispatch Telegram Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-white">Spend Breakdown by Supplier</h2>
            <BarChart3 size={20} className="text-blue-400" />
          </div>
          <div className="space-y-3">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">{po.supplier}</h4>
                  <span className="text-xs text-slate-400">{po.items.length} order items</span>
                </div>
                <span className="text-base font-bold text-emerald-400">${po.totalEstimatedCost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-white">Telegram Auto-Reporter</h2>
            <Send size={20} className="text-sky-400" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Configure automated daily purchase order summaries sent directly to executive Telegram channels or chat groups.
          </p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
            <p className="text-sky-400 font-bold">🤖 RL Food Daily Purchasing Brief</p>
            <p>• Total POs Active: {purchaseOrders.length}</p>
            <p>• Cumulative Commitment: ${totalSpend.toFixed(2)}</p>
            <p>• Held Items Pending Lock: {purchaseOrders.reduce((acc, po) => acc + po.items.filter(i => i.purchaseStatus === 'On Hold').length, 0)}</p>
          </div>
          <button
            onClick={() => setActiveModal('telegram')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Configure Bot Credentials
          </button>
        </div>
      </div>
    </div>
  );
};
