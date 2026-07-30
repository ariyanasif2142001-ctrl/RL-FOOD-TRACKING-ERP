import React, { useState } from 'react';
import { PurchaseOrder, DeliveryNoteRecord } from '../types';
import { 
  FileCheck, Warehouse, Truck, CheckCircle2, FileText, 
  ChevronRight, ArrowRight, Filter, AlertCircle, ShoppingBag
} from 'lucide-react';

interface DispatchKanbanPipelineProps {
  pos: PurchaseOrder[];
  onSelectPO?: (po: PurchaseOrder) => void;
  onFilterStage?: (stage: string) => void;
}

export const DispatchKanbanPipeline: React.FC<DispatchKanbanPipelineProps> = ({
  pos,
  onSelectPO,
  onFilterStage
}) => {
  const [activeStageFilter, setActiveStageFilter] = useState<string | null>(null);

  // Flatten all Delivery Notes
  const allDeliveryNotes: Array<{ dn: DeliveryNoteRecord; po: PurchaseOrder }> = [];
  pos.forEach(po => {
    (po.deliveryNotes || []).forEach(dn => {
      allDeliveryNotes.push({ dn, po });
    });
  });

  // Calculate stage counts & orders
  // Stage 1: PO Created (POs created / pending purchase)
  const poCreatedList = pos.filter(p => !p.purchaseStatus || p.purchaseStatus === 'Pending');

  // Stage 2: Goods Received (POs where warehouse received items)
  const goodsReceivedList = pos.filter(p => p.items?.some(i => (i.receivedQty || 0) > 0));

  // Stage 3: Out for Delivery (Delivery Notes generated)
  const outForDeliveryList = allDeliveryNotes.filter(item => item.dn.status === 'Pending Invoice');

  // Stage 4: Delivery Confirmed
  const deliveryConfirmedList = allDeliveryNotes.filter(item => item.dn.status === 'Delivery Confirmed');

  // Stage 5: Invoiced (Invoiced Delivery Notes)
  const invoicedList = allDeliveryNotes.filter(item => item.dn.status === 'Invoiced');

  const stages = [
    {
      id: 'po_created',
      title: 'PO Created',
      description: 'Pending Purchase Order',
      count: poCreatedList.length,
      icon: FileCheck,
      color: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20'
    },
    {
      id: 'goods_received',
      title: 'Goods Received',
      description: 'In Warehouse Stock',
      count: goodsReceivedList.length,
      icon: Warehouse,
      color: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20'
    },
    {
      id: 'out_for_delivery',
      title: 'Out for Delivery',
      description: 'Challan Dispatched',
      count: outForDeliveryList.length,
      icon: Truck,
      color: 'from-purple-600 to-indigo-700',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-800',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20'
    },
    {
      id: 'delivery_confirmed',
      title: 'Delivery Confirmed',
      description: 'Accepted by Client',
      count: deliveryConfirmedList.length,
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-700',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20'
    },
    {
      id: 'invoiced',
      title: 'Invoiced',
      description: 'Official Invoice Billed',
      count: invoicedList.length,
      icon: FileText,
      color: 'from-teal-600 to-emerald-800',
      badgeBg: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-800',
      activeBorder: 'border-teal-500 ring-2 ring-teal-500/20'
    }
  ];

  const handleStageClick = (stageId: string) => {
    if (activeStageFilter === stageId) {
      setActiveStageFilter(null);
      if (onFilterStage) onFilterStage('all');
    } else {
      setActiveStageFilter(stageId);
      if (onFilterStage) onFilterStage(stageId);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] text-white rounded-3xl p-4 sm:p-5 border border-emerald-900/60 shadow-md space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-800/60">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-[#2E7D32] to-[#43A047] text-white rounded-2xl shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <span>Visual Dispatch & Delivery Kanban Pipeline</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live end-to-end tracking from PO Creation to Official Invoicing
            </p>
          </div>
        </div>

        {activeStageFilter && (
          <button
            onClick={() => handleStageClick(activeStageFilter)}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        )}
      </div>

      {/* Pipeline Stages Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
        {stages.map((st, idx) => {
          const Icon = st.icon;
          const isActive = activeStageFilter === st.id;

          return (
            <div
              key={st.id}
              onClick={() => handleStageClick(st.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isActive 
                  ? `${st.activeBorder} bg-slate-50 dark:bg-slate-800 shadow-md` 
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              {/* Top Color Line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${st.color}`} />

              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl bg-gradient-to-tr ${st.color} text-white shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${st.badgeBg}`}>
                  {st.count}
                </span>
              </div>

              <div className="mt-2.5">
                <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                  {st.title}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {st.description}
                </p>
              </div>

              {idx < stages.length - 1 && (
                <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage Detail Drilldown Drawer if Filtered */}
      {activeStageFilter && (
        <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>Filtered Stage Orders:</span>
            <span className="text-emerald-700 dark:text-emerald-400">
              Showing {
                activeStageFilter === 'po_created' ? poCreatedList.length :
                activeStageFilter === 'goods_received' ? goodsReceivedList.length :
                activeStageFilter === 'out_for_delivery' ? outForDeliveryList.length :
                activeStageFilter === 'delivery_confirmed' ? deliveryConfirmedList.length :
                invoicedList.length
              } Items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {(activeStageFilter === 'po_created' ? poCreatedList :
              activeStageFilter === 'goods_received' ? goodsReceivedList : []
            ).map((po, idx) => (
              <div 
                key={po.id ? `${po.id}-${idx}` : `po-${idx}`}
                onClick={() => onSelectPO && onSelectPO(po)}
                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-400 cursor-pointer transition text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-indigo-900 dark:text-indigo-300 font-mono">{po.poNumber}</span>
                  <span className="text-[10px] text-slate-500">{po.items?.length || 0} Items</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">Vendor: {po.supplierName || 'General'}</p>
              </div>
            ))}

            {(activeStageFilter === 'out_for_delivery' ? outForDeliveryList :
              activeStageFilter === 'delivery_confirmed' ? deliveryConfirmedList :
              activeStageFilter === 'invoiced' ? invoicedList : []
            ).map(({ dn, po }, idx) => (
              <div 
                key={dn.id ? `${dn.id}-${idx}` : `dn-${idx}`}
                onClick={() => onSelectPO && onSelectPO(po)}
                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-400 cursor-pointer transition text-xs space-y-1"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-purple-900 dark:text-purple-300 font-mono">{dn.challanNumber}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold">{dn.status}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">PO: {po.poNumber}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
