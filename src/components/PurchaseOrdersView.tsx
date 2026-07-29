import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Search,
  Lock,
  Unlock,
  CheckCircle,
  PackageCheck,
  PlusCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import type { POItem } from '../types';

export const PurchaseOrdersView: React.FC = () => {
  const {
    purchaseOrders,
    holdItem,
    setActiveModal,
    setSelectedPOItemContext,
    currentUser
  } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenRecordModal = (poId: string, item: POItem) => {
    setSelectedPOItemContext({ poId, item });
    setActiveModal('record-purchase');
  };

  const handleOpenReceiveModal = (poId: string, item: POItem) => {
    setSelectedPOItemContext({ poId, item });
    setActiveModal('receive-item');
  };

  return (
    <div className="space-y-6">
      {/* View Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight">
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage requisitions, lock item holds, record actual purchases, and verify receipts.
          </p>
        </div>

        <button
          onClick={() => setActiveModal('new-po')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all"
        >
          <PlusCircle size={18} />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO #, Supplier, SKU, or Item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'Pending', 'On Hold', 'Purchased', 'Returned'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-slate-500 mb-3" />
            <h3 className="text-lg font-semibold text-white">No Purchase Orders Found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or status filter.</p>
          </div>
        ) : (
          filteredOrders.map((po) => (
            <div
              key={po.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-sm hover:border-slate-700 transition-all overflow-hidden"
            >
              {/* PO Header Bar */}
              <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-blue-400 font-mono">{po.id}</span>
                  <div>
                    <h3 className="text-[16px] font-semibold text-white leading-tight">{po.supplier}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Order Date: <span className="text-slate-200">{po.orderDate}</span> | Target Delivery: <span className="text-slate-200">{po.deliveryDate}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status Badges */}
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Purchase Status</span>
                    <span
                      className={`inline-block mt-0.5 px-2.5 py-0.5 rounded text-xs font-bold border ${
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
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold">Total Estimated</span>
                    <span className="text-sm font-bold text-white">${po.totalEstimatedCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Items Table inside PO */}
              <div className="p-4 sm:p-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">SKU & Item Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Ordered Qty</th>
                      <th className="py-2.5 px-3">Purchased Qty</th>
                      <th className="py-2.5 px-3">Unit Price</th>
                      <th className="py-2.5 px-3">Lock / Hold</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {po.items.map((item) => {
                      const isHeldByMe = item.heldBy === currentUser.name;
                      const isHeldByOther = Boolean(item.heldBy && !isHeldByMe);

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          
                          {/* Item Info */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white">{item.name}</div>
                            <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                          </td>

                          <td className="py-3 px-3 text-slate-400">{item.category}</td>

                          <td className="py-3 px-3 font-medium">
                            {item.orderedQty} {item.unit}
                          </td>

                          <td className="py-3 px-3 font-semibold text-emerald-400">
                            {item.purchasedQty ? `${item.purchasedQty} ${item.unit}` : '-'}
                          </td>

                          <td className="py-3 px-3">
                            ${(item.actualUnitPrice || item.estimatedUnitPrice).toFixed(2)} / {item.unit}
                          </td>

                          {/* Lock / Hold Status */}
                          <td className="py-3 px-3">
                            {item.heldBy ? (
                              <div className="flex items-center gap-1.5 text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/30 text-[11px] font-semibold">
                                <Lock size={12} />
                                <span>Held by {item.heldBy}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Unlocked</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              
                              {/* Hold/Release Toggle */}
                              <button
                                onClick={() => holdItem(po.id, item.id)}
                                disabled={Boolean(item.purchaseStatus === 'Purchased' || isHeldByOther)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                  isHeldByMe
                                    ? 'bg-purple-600 text-white hover:bg-purple-500'
                                    : isHeldByOther
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                                title={isHeldByMe ? 'Release Hold' : 'Lock Hold for Purchaser'}
                              >
                                {isHeldByMe ? <Unlock size={14} /> : <Lock size={14} />}
                                <span>{isHeldByMe ? 'Release' : 'Hold'}</span>
                              </button>

                              {/* Record Purchase */}
                              <button
                                onClick={() => handleOpenRecordModal(po.id, item)}
                                disabled={Boolean(isHeldByOther || item.purchaseStatus === 'Purchased')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                  item.purchaseStatus === 'Purchased'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-blue-600 text-white hover:bg-blue-500'
                                }`}
                              >
                                {item.purchaseStatus === 'Purchased' ? (
                                  <>
                                    <CheckCircle size={14} />
                                    <span>Purchased</span>
                                  </>
                                ) : (
                                  <>
                                    <DollarSign size={14} />
                                    <span>Record Purchase</span>
                                  </>
                                )}
                              </button>

                              {/* Warehouse Receive */}
                              <button
                                onClick={() => handleOpenReceiveModal(po.id, item)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1"
                              >
                                <PackageCheck size={14} className="text-amber-400" />
                                <span>Receive</span>
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};
