import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ShoppingBag, Truck, FileText, Package, ArrowRight, X, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PurchaseOrder, POItem } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pos: PurchaseOrder[];
  onSelectPO?: (po: PurchaseOrder) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  pos,
  onSelectPO
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'po' | 'sku' | 'challan' | 'supplier'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Flatten all items and challans for instant quick lookup
  const searchResults = () => {
    if (!query.trim()) return [];

    const q = query.toLowerCase().trim();
    const results: Array<{
      id: string;
      type: 'po' | 'sku' | 'challan' | 'supplier';
      title: string;
      subtitle: string;
      status?: string;
      badge: string;
      po: PurchaseOrder;
      extraInfo?: string;
    }> = [];

    pos.forEach(po => {
      // 1. PO Number & Vendor Search
      if (po.poNumber.toLowerCase().includes(q) || (po.supplierName && po.supplierName.toLowerCase().includes(q))) {
        results.push({
          id: `po-${po.id}`,
          type: po.supplierName?.toLowerCase().includes(q) ? 'supplier' : 'po',
          title: `PO: ${po.poNumber}`,
          subtitle: `Vendor: ${po.supplierName || 'General Supplier'} • Total ${po.items?.length || 0} Items`,
          status: po.purchaseStatus || 'Pending',
          badge: po.poNumber,
          po
        });
      }

      // 2. Delivery Challan Search
      if (po.deliveryNotes && po.deliveryNotes.length > 0) {
        po.deliveryNotes.forEach(dn => {
          if (dn.challanNumber?.toLowerCase().includes(q) || dn.invoiceNumber?.toLowerCase().includes(q)) {
            results.push({
              id: `dn-${dn.id}`,
              type: 'challan',
              title: `Challan: ${dn.challanNumber}`,
              subtitle: `PO: ${po.poNumber} • Status: ${dn.status || 'Pending Invoice'} • ${dn.items?.length || 0} Converted SKUs`,
              status: dn.status,
              badge: dn.challanNumber,
              po
            });
          }
        });
      }

      // 3. SKU & Item Name Search
      po.items?.forEach(item => {
        const matchSku = item.sku?.toLowerCase().includes(q) || item.convertedSku?.toLowerCase().includes(q);
        const matchName = item.itemName?.toLowerCase().includes(q) || item.convertedItemName?.toLowerCase().includes(q);

        if (matchSku || matchName) {
          results.push({
            id: `item-${po.id}-${item.id}`,
            type: 'sku',
            title: item.convertedItemName || item.itemName,
            subtitle: `SKU: ${item.convertedSku || item.sku} • PO: ${po.poNumber} • Qty: ${item.requestedQty || item.orderedQty || 0} ${item.unit}`,
            status: item.purchaseStatus,
            badge: item.convertedSku || item.sku,
            po,
            extraInfo: `Purchased: ${item.purchasedQty || 0} / Recv: ${item.receivedQty || 0}`
          });
        }
      });
    });

    // Filter by active category
    if (activeCategory === 'all') return results.slice(0, 15);
    return results.filter(r => r.type === activeCategory).slice(0, 15);
  };

  const list = searchResults();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type PO#, SKU Code, Delivery Challan, or Vendor Name..."
            className="w-full text-sm sm:text-base bg-transparent font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold"
          >
            <span className="hidden sm:inline px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-mono mr-1">ESC</span>
            ✕
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-bold overflow-x-auto no-scrollbar">
          <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] pr-1 font-extrabold shrink-0">Filter:</span>
          {[
            { id: 'all', label: 'All Results' },
            { id: 'po', label: 'PO Numbers' },
            { id: 'challan', label: 'Delivery Challans' },
            { id: 'sku', label: 'SKU Items' },
            { id: 'supplier', label: 'Vendors' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as Parameters<typeof setActiveCategory>[0])}
              className={`px-2.5 py-1 rounded-xl transition whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1 min-h-[220px]">
          {!query.trim() ? (
            <div className="py-10 text-center space-y-2">
              <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50">
                <Command className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Instant ERP Command Search
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Search instantly by PO Number (e.g. <code className="text-emerald-600 font-mono">PO-1002</code>), SKU Code, Delivery Challan (e.g. <code className="text-emerald-600 font-mono">DC-1002</code>), or Supplier.
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                No matching results found for "{query}"
              </p>
              <p className="text-[11px] text-slate-400">
                Try searching with a different PO, SKU, or Challan keyword.
              </p>
            </div>
          ) : (
            list.map((item, idx) => (
              <div
                key={item.id ? `${item.id}-${idx}` : `cmd-${idx}`}
                onClick={() => {
                  if (onSelectPO) onSelectPO(item.po);
                  onClose();
                }}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl transition cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
                    {item.type === 'po' && <ShoppingBag className="w-4 h-4" />}
                    {item.type === 'challan' && <Truck className="w-4 h-4" />}
                    {item.type === 'sku' && <Package className="w-4 h-4" />}
                    {item.type === 'supplier' && <FileText className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                        {item.title}
                      </span>
                      {item.status && (
                        <span className="px-2 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-extrabold rounded-full border border-emerald-300 dark:border-emerald-700 shrink-0 uppercase">
                          {item.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                    {item.extraInfo && (
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {item.extraInfo}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>View PO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2.5 px-4 bg-slate-100/80 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">K</kbd> to toggle anytime
            </span>
          </div>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {pos.length} Active Purchase Orders
          </span>
        </div>
      </div>
    </div>
  );
};
