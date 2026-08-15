import React, { useState } from 'react';
import { PurchaseOrder, POItem } from '../types';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface DiscrepancyAlertHubProps {
  pos: PurchaseOrder[];
  onSelectPO?: (po: PurchaseOrder) => void;
}

export const DiscrepancyAlertHub: React.FC<DiscrepancyAlertHubProps> = ({
  pos,
  onSelectPO
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Gather Over-purchased or Discrepant items
  const stockMismatches: Array<{
    po: PurchaseOrder;
    item: POItem;
    ordered: number;
    purchased: number;
    difference: number;
    type: 'overpurchased' | 'damaged';
  }> = [];

  pos.forEach(po => {
    po.items?.forEach(item => {
      const ord = item.requestedQty || item.orderedQty || 0;
      const pur = item.purchasedQty || 0;
      const dmg = item.damagedQty || 0;

      if (dmg > 0) {
        stockMismatches.push({
          po,
          item,
          ordered: ord,
          purchased: pur,
          difference: dmg,
          type: 'damaged'
        });
      } else if (pur > ord && ord > 0) {
        stockMismatches.push({
          po,
          item,
          ordered: ord,
          purchased: pur,
          difference: pur - ord,
          type: 'overpurchased'
        });
      }
    });
  });

  const totalAlertsCount = stockMismatches.length;

  if (totalAlertsCount === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 px-4 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-bold">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Smart Discrepancy Monitor: All PO Quantities & Purchases are in sync with zero discrepancies.</span>
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
              Real-time alerts for purchasing quantity exceptions
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
        <div className="pt-1">
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-3 border border-rose-200/60 dark:border-rose-900/60 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-rose-100 dark:border-rose-900/40 text-xs font-bold text-rose-900 dark:text-rose-200">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Purchase Exceptions & Alerts ({stockMismatches.length})
              </span>
              <span className="text-[10px] text-slate-400">Over-purchased / Exceptions</span>
            </div>

            {stockMismatches.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-2 text-center">No purchase quantity discrepancies found.</p>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {stockMismatches.map(({ po, item, ordered, purchased, difference, type }, idx) => (
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
                        type === 'damaged' 
                          ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900 dark:text-rose-100' 
                          : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900 dark:text-amber-100'
                      }`}>
                        {type === 'damaged' ? `Damaged -${difference}` : `Over-purchased +${difference}`} {item.unit}
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">
                        Requested: {ordered} | Purchased: {purchased}
                      </p>
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
