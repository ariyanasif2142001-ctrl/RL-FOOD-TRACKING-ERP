import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Search,
  Lock,
  Unlock,
  PackageCheck,
  Eye,
  Edit,
  Printer,
  Send,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import type { POItem } from '../types';

export const RunningPOTable: React.FC = () => {
  const {
    purchaseOrders,
    holdItem,
    setActiveModal,
    setSelectedPOItemContext,
    currentUser,
    showToast
  } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'supplier' | 'orderDate' | 'totalEstimatedCost'>('orderDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  // Filter & Search Logic
  const filteredOrders = purchaseOrders
    .filter((po) => {
      const matchesSearch =
        po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortAsc ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenRecordModal = (poId: string, item: POItem) => {
    setSelectedPOItemContext({ poId, item });
    setActiveModal('record-purchase');
  };

  const handleOpenReceiveModal = (poId: string, item: POItem) => {
    setSelectedPOItemContext({ poId, item });
    setActiveModal('receive-item');
  };

  return (
    <div className="space-y-4">
      
      {/* Table Control Bar: Search & Status Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO #, Supplier, Dept, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['ALL', 'Pending', 'On Hold', 'Purchased', 'Returned'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Rounded Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[15px]">
            {/* Sticky Header */}
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider sticky top-0 z-20">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>PO Number</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('supplier')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Supplier & Dept</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('orderDate')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Dates</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4">Fulfilled Progress</th>
                <th className="py-3.5 px-4">Purchase Status</th>
                <th
                  onClick={() => handleSort('totalEstimatedCost')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Value ($)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-200 text-sm font-normal">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching purchase orders found.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((po) => {
                  const totalCount = po.items.length;
                  const purchasedCount = po.items.filter((i) => i.purchaseStatus === 'Purchased').length;
                  const progressPct = totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0;

                  return (
                    <React.Fragment key={po.id}>
                      {/* Parent PO Row */}
                      <tr className="even:bg-slate-50/50 dark:even:bg-slate-950/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {po.id}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                            {po.supplier}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {po.department} • {po.location}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <div>Order: <strong className="text-slate-900 dark:text-slate-200">{po.orderDate}</strong></div>
                          <div>Target: <strong className="text-slate-900 dark:text-slate-200">{po.deliveryDate}</strong></div>
                        </td>

                        {/* Progress Bar */}
                        <td className="py-4 px-4">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Items</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{purchasedCount}/{totalCount} ({progressPct}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${progressPct}%` }}
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Status Pills */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                              po.status === 'Purchased'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : po.status === 'On Hold'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                : po.status === 'Partial Purchased'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ${po.totalEstimatedCost.toFixed(2)}
                        </td>

                        {/* Action Icons Bar */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => showToast(`Viewing details for ${po.id}`)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => showToast(`Edit mode opened for ${po.id}`)}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit PO"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                window.print();
                                showToast(`Printing slip for ${po.id}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Print Slip"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => setActiveModal('telegram')}
                              className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Telegram Dispatch"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Items Line List */}
                      {po.items.map((item) => {
                        const isHeldByMe = item.heldBy === currentUser.name;
                        const isHeldByOther = Boolean(item.heldBy && !isHeldByMe);

                        return (
                          <tr
                            key={item.id}
                            className="bg-slate-50/30 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/40 text-xs"
                          >
                            <td className="py-2.5 px-4 pl-8 font-mono text-slate-400">↳ {item.sku}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">{item.name}</td>
                            <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{item.category}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              Ordered: {item.orderedQty} {item.unit}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                              Purchased: {item.purchasedQty ? `${item.purchasedQty} ${item.unit}` : '-'}
                            </td>
                            <td className="py-2.5 px-4">
                              {item.heldBy ? (
                                <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded font-semibold text-[11px]">
                                  <Lock size={10} /> Held by {item.heldBy}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Unlocked</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => holdItem(po.id, item.id)}
                                  disabled={Boolean(item.purchaseStatus === 'Purchased' || isHeldByOther)}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                    isHeldByMe
                                      ? 'bg-purple-600 text-white'
                                      : isHeldByOther
                                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {isHeldByMe ? <Unlock size={12} /> : <Lock size={12} />}
                                  <span>{isHeldByMe ? 'Release' : 'Hold'}</span>
                                </button>

                                <button
                                  onClick={() => handleOpenRecordModal(po.id, item)}
                                  disabled={Boolean(isHeldByOther || item.purchaseStatus === 'Purchased')}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                                    item.purchaseStatus === 'Purchased'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-blue-600 text-white hover:bg-blue-500'
                                  }`}
                                >
                                  <DollarSign size={12} />
                                  <span>{item.purchaseStatus === 'Purchased' ? 'Bought' : 'Purchase'}</span>
                                </button>

                                <button
                                  onClick={() => handleOpenReceiveModal(po.id, item)}
                                  className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1"
                                >
                                  <PackageCheck size={12} className="text-amber-500" />
                                  <span>Receive</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</strong> of{' '}
            <strong>{filteredOrders.length}</strong> purchase orders
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="font-semibold text-slate-900 dark:text-white px-2">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
