import React, { useState } from 'react';
import { PurchaseOrder, POItem, DeliveryNoteRecord } from '../types';
import { AlertTriangle, RotateCcw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, BellRing, ArrowRight, ShieldAlert } from 'lucide-react';

interface DiscrepancyAlertHubProps {
  pos: PurchaseOrder[];
  onSelectPO?: (po: PurchaseOrder) => void;
}

export const DiscrepancyAlertHub: React.FC<DiscrepancyAlertHubProps> = ({
  pos,
  onSelectPO
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // 1. Gather Stock Mismatch Discrepancies
  const stockMismatches: Array<{
    po: PurchaseOrder;
    item: POItem;
    ordered: number;
    received: number;
    difference: number;
    type: 'shortage' | 'excess';
  }> = [];

  // 2. Gather Delivery Returns
  const deliveryReturns: Array<{
    po: PurchaseOrder;
    dn: DeliveryNoteRecord;
    returnedItemsCount: number;
    returnReason?: string;
  }> = [];

  pos.forEach(po => {
    // Check items for stock discrepancies
    po.items?.forEach(item => {
      const ord = item.requestedQty || item.orderedQty || 0;
      const recv = item.receivedQty || 0;

      // If warehouse has logged receipts and there's a discrepancy
      if (recv > 0 && recv !== ord) {
        stockMismatches.push({
          po,
          item,
          ordered: ord,
          received: recv,
          difference: Math.abs(ord - recv),
          type: recv < ord ? 'shortage' : 'excess'
        });
      }
    });

    // Check delivery notes for returns
    po.deliveryNotes?.forEach(dn => {
      if (dn.status === 'Partially Returned' || dn.status === 'Fully Returned') {
        const returnedCount = dn.items.filter(i => i.isReturned || (i.returnedQty && i.returnedQty > 0)).length;
        deliveryReturns.push({
          po,
          dn,
          returnedItemsCount: returnedCount || dn.items.length,
          returnReason: dn.items.find(i => i.returnReason)?.returnReason
        });
      }
    });
  });

  const totalAlertsCount = stockMismatches.length + deliveryReturns.length;

  if (totalAlertsCount === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 px-4 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-bold">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Smart Discrepancy Monitor: All PO Stock Quantities & Delivery Returns are 100% Verified with zero discrepancies.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 dark:from-rose-950/60 dark:via-amber-950/40 dark:to-slate-900 border border-rose-200/80 dark:border-rose-800/80 rounded-3xl p-4 shadow-sm space-y-3">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-600 text-white rounded-2xl shadow-xs animate-bounce">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-rose-950 dark:text-rose-100 text-sm sm:text-base">
                Smart Discrepancy & Alert Hub
              </h3>
              <span className="px-2.5 py-0.5 bg-rose-600 text-white font-extrabold text-[11px] rounded-full shadow-2xs">
                {totalAlertsCount} Alerts
              </span>
            </div>
            <p className="text-[11px] text-rose-800/80 dark:text-rose-300 font-medium">
              Real-time alerts for stock mismatches (Ordered vs Received) & customer delivery returns
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition font-bold text-xs flex items-center gap-1"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* 1. Stock Mismatch Column */}
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-3 border border-rose-200/60 dark:border-rose-900/60 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-rose-100 dark:border-rose-900/40 text-xs font-bold text-rose-900 dark:text-rose-200">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Stock Mismatch Warnings ({stockMismatches.length})
              </span>
              <span className="text-[10px] text-slate-400">Ordered ≠ Received</span>
            </div>

            {stockMismatches.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-2 text-center">No inventory quantity mismatches found.</p>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {stockMismatches.map(({ po, item, ordered, received, difference, type }, idx) => (
                  <div 
                    key={`${po.id}-${item.id}-${idx}`}
                    onClick={() => onSelectPO && onSelectPO(po)}
                    className="p-2 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/60 rounded-xl transition cursor-pointer text-xs flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {item.convertedItemName || item.itemName}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        PO: <strong className="text-indigo-800 dark:text-indigo-300">{po.poNumber}</strong> • SKU: {item.sku}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-md font-black text-[10px] border ${
                        type === 'shortage' 
                          ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900 dark:text-rose-100' 
                          : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900 dark:text-amber-100'
                      }`}>
                        {type === 'shortage' ? `Shortage -${difference}` : `Excess +${difference}`} {item.unit}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">
                        Ord: {ordered} | Recv: {received}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Delivery Return Notifications Column */}
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-3 border border-rose-200/60 dark:border-rose-900/60 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-rose-100 dark:border-rose-900/40 text-xs font-bold text-rose-900 dark:text-rose-200">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
                Delivery Return Alerts ({deliveryReturns.length})
              </span>
              <span className="text-[10px] text-slate-400">Customer Rejections</span>
            </div>

            {deliveryReturns.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-2 text-center">No delivery item returns logged.</p>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {deliveryReturns.map(({ po, dn, returnedItemsCount, returnReason }, idx) => (
                  <div 
                    key={`${dn.id}-${idx}`}
                    onClick={() => onSelectPO && onSelectPO(po)}
                    className="p-2 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/60 rounded-xl transition cursor-pointer text-xs flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-rose-950 dark:text-rose-100 flex items-center gap-1">
                        <span>Challan: {dn.challanNumber}</span>
                        <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 dark:bg-rose-900 px-1.5 py-0.2 rounded-md">
                          {dn.status}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        PO: <strong>{po.poNumber}</strong> {returnReason ? `• Note: "${returnReason}"` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-extrabold text-[10px] rounded-full shadow-2xs">
                        {returnedItemsCount} Returned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
