import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { masterSKUs, purchaseOrders } = useERP();
  const [searchTerm, setSearchTerm] = useState('');

  // Extract catalog items with stock counts
  const stockItems = masterSKUs.map((sku) => {
    const totalPurchased = purchaseOrders.reduce((acc, po) => {
      const match = po.items.find((i) => i.sku === sku.internalSKU);
      return acc + (match?.purchasedQty || 0);
    }, 0);

    const totalReceived = purchaseOrders.reduce((acc, po) => {
      const match = po.items.find((i) => i.sku === sku.internalSKU);
      return acc + (match?.receivedQty || 0);
    }, 0);

    return {
      ...sku,
      stockOnHand: totalReceived + 150, // base stock + received
      onOrder: totalPurchased - totalReceived > 0 ? totalPurchased - totalReceived : 50,
      reorderPoint: 100,
    };
  });

  const filteredItems = stockItems.filter(
    (i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.internalSKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          Inventory & Warehouse Stock Control
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time stock on hand, reorder thresholds, and warehouse location management.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search stock by SKU, name, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-3.5 px-4">Internal SKU</th>
                <th className="py-3.5 px-4">Item Description</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Stock on Hand</th>
                <th className="py-3.5 px-4">On Order</th>
                <th className="py-3.5 px-4">Reorder Point</th>
                <th className="py-3.5 px-4">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredItems.map((item) => {
                const isLowStock = item.stockOnHand <= item.reorderPoint;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{item.internalSKU}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{item.category}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                      {item.stockOnHand} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {item.onOrder} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{item.reorderPoint} {item.unit}</td>
                    <td className="py-3.5 px-4">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 font-semibold text-[11px]">
                          <AlertTriangle size={12} /> Low Stock Warning
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold text-[11px]">
                          <CheckCircle2 size={12} /> Adequate Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
