import React from 'react';
import { useERP } from '../context/ERPContext';
import { PackageCheck, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { POItem } from '../types';

export const WarehouseReceiveView: React.FC = () => {
  const { purchaseOrders, setActiveModal, setSelectedPOItemContext } = useERP();

  const handleOpenReceive = (poId: string, item: POItem) => {
    setSelectedPOItemContext({ poId, item });
    setActiveModal('receive-item');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 uppercase">
            Warehouse Receiving
          </span>
        </div>
        <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight mt-1">
          Shipment Receiving & Verification
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect physical deliveries against purchase orders, verify quantities, and log warehouse inventory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Truck size={22} />
          </div>
          <div>
            <span className="text-[16px] font-semibold text-white">Expected Shipments</span>
            <p className="text-sm font-bold text-blue-400">{purchaseOrders.length} Orders</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-[16px] font-semibold text-white">Verified Receipts</span>
            <p className="text-sm font-bold text-emerald-400">
              {purchaseOrders.filter((po) => po.receiveStatus === 'Received').length} Fully Received
            </p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[16px] font-semibold text-white">Pending Inspection</span>
            <p className="text-sm font-bold text-amber-400">
              {purchaseOrders.filter((po) => po.receiveStatus !== 'Received').length} Deliveries Pending
            </p>
          </div>
        </div>
      </div>

      {/* Orders List for Receiver */}
      <div className="space-y-4">
        {purchaseOrders.map((po) => (
          <div key={po.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div>
                <span className="font-mono text-xs text-blue-400 font-bold">{po.id}</span>
                <h3 className="text-[16px] font-semibold text-white">{po.supplier}</h3>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                  po.receiveStatus === 'Received'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {po.receiveStatus}
              </span>
            </div>

            <div className="space-y-2">
              {po.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className="text-slate-400 ml-2 font-mono text-[11px]">({item.sku})</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Purchased Qty: <span className="text-white font-medium">{item.purchasedQty || item.orderedQty} {item.unit}</span> | Received: <span className="text-emerald-400 font-bold">{item.receivedQty || 0} {item.unit}</span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenReceive(po.id, item)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                  >
                    <PackageCheck size={14} />
                    <span>Verify Receipt</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
