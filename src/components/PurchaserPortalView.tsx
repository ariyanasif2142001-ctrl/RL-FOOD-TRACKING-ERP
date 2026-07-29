import React from 'react';
import { useERP } from '../context/ERPContext';
import { Lock, DollarSign } from 'lucide-react';
import type { POItem } from '../types';

export const PurchaserPortalView: React.FC = () => {
  const { purchaseOrders, currentUser, holdItem, setActiveModal, setSelectedPOItemContext } = useERP();

  // Collect all items across POs
  const allItemsWithPO = purchaseOrders.flatMap((po) =>
    po.items.map((item) => ({ poId: po.id, supplier: po.supplier, item }))
  );

  const myHeldItems = allItemsWithPO.filter((x) => x.item.heldBy === currentUser.name);
  const pendingItems = allItemsWithPO.filter((x) => x.item.purchaseStatus === 'Pending' || x.item.purchaseStatus === 'On Hold');

  const handleRecord = (poId: string, item: POItem) => {
    setSelectedPOItemContext({ poId, item });
    setActiveModal('record-purchase');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/30 uppercase">
            Field Mobile Portal
          </span>
          <span className="text-xs text-slate-400">Active Profile: {currentUser.name}</span>
        </div>
        <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight mt-1">
          Purchaser Command Center
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Lock purchase items on hold, input actual field purchase prices, and attach receipt records.
        </p>
      </div>

      {/* Held items alert card */}
      {myHeldItems.length > 0 && (
        <div className="bg-purple-950/40 border border-purple-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                You have {myHeldItems.length} item(s) locked on hold
              </h4>
              <p className="text-xs text-purple-300">
                These items are reserved exclusively under your profile while you purchase or negotiate pricing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Items List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingItems.map(({ poId, supplier, item }) => {
          const isHeldByMe = item.heldBy === currentUser.name;

          return (
            <div
              key={`${poId}-${item.id}`}
              className={`bg-slate-900/90 border rounded-xl p-5 shadow-sm space-y-4 transition-all ${
                isHeldByMe ? 'border-purple-500/80 ring-1 ring-purple-500/30' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-blue-400 font-semibold">{poId}</span>
                  <h3 className="text-[16px] font-semibold text-white mt-0.5">{item.name}</h3>
                  <p className="text-xs text-slate-400">{supplier}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isHeldByMe
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {isHeldByMe ? 'Locked to You' : item.purchaseStatus}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Ordered Qty</span>
                  <span className="font-semibold text-white">{item.orderedQty} {item.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Est. Unit Price</span>
                  <span className="font-semibold text-emerald-400">${item.estimatedUnitPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => holdItem(poId, item.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isHeldByMe
                      ? 'bg-purple-600 text-white hover:bg-purple-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Lock size={14} />
                  <span>{isHeldByMe ? 'Release Hold' : 'Lock Item'}</span>
                </button>

                <button
                  onClick={() => handleRecord(poId, item)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
                >
                  <DollarSign size={14} />
                  <span>Record Purchase</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
