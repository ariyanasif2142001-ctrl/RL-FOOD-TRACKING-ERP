import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PurchaseOrder, POItem, getNormalizedItemStatus } from '../../types';
import { 
  Search, 
  X, 
  Package, 
  FileText, 
  Building2, 
  MapPin, 
  User as UserIcon, 
  Tag, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  Layers, 
  CornerDownRight, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface AdminGlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  pos: PurchaseOrder[];
  onSelectPO: (po: PurchaseOrder) => void;
}

interface ItemMatch {
  item: POItem;
  matchReasons: string[];
}

interface POMatchGroup {
  po: PurchaseOrder;
  poLevelMatchReasons: string[];
  matchedItems: ItemMatch[];
}

export const AdminGlobalSearchModal: React.FC<AdminGlobalSearchModalProps> = ({
  isOpen,
  onClose,
  pos,
  onSelectPO
}) => {
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [rawQuery]);

  // Focus input on open & clear state on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setRawQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search Logic across ALL POs and items
  const { matchedGroups, totalMatchedItems, totalMatchedPOs, isCapped } = useMemo(() => {
    if (!debouncedQuery) {
      return { matchedGroups: [], totalMatchedItems: 0, totalMatchedPOs: 0, isCapped: false };
    }

    const q = debouncedQuery.toLowerCase();
    const groups: POMatchGroup[] = [];
    let itemCount = 0;
    const MAX_ITEMS_CAP = 50;
    let capped = false;

    for (const po of pos) {
      if (itemCount >= MAX_ITEMS_CAP) {
        capped = true;
        break;
      }

      const poLevelReasons: string[] = [];

      // 1. Check PO Number
      if (po.poNumber?.toLowerCase().includes(q)) {
        poLevelReasons.push(`PO #${po.poNumber}`);
      }

      // 2. Check PO Department
      if (po.department?.toLowerCase().includes(q)) {
        poLevelReasons.push(`Department: ${po.department}`);
      }

      // 3. Check PO Location
      if (po.location?.toLowerCase().includes(q)) {
        poLevelReasons.push(`Location: ${po.location}`);
      }

      // 4. Check PO Customer / Supplier
      if (po.customerName?.toLowerCase().includes(q)) {
        poLevelReasons.push(`Customer: ${po.customerName}`);
      }
      if (po.supplierName?.toLowerCase().includes(q)) {
        poLevelReasons.push(`Supplier: ${po.supplierName}`);
      }

      // 5. Check Items in this PO
      const matchedItemsInThisPo: ItemMatch[] = [];

      (po.items || []).forEach(item => {
        if (itemCount >= MAX_ITEMS_CAP) {
          capped = true;
          return;
        }

        const itemReasons: string[] = [];

        // Match Item Name (and aliases)
        const nameMatches = 
          item.itemName?.toLowerCase().includes(q) ||
          item.customerItemName?.toLowerCase().includes(q) ||
          item.internalItemName?.toLowerCase().includes(q) ||
          item.convertedItemName?.toLowerCase().includes(q);

        if (nameMatches) {
          itemReasons.push('Item Name');
        }

        // Match Brand
        if (item.brand?.toLowerCase().includes(q)) {
          itemReasons.push(`Brand: ${item.brand}`);
        }

        // Match Item Department
        if (item.department && item.department.toLowerCase().includes(q) && item.department !== po.department) {
          itemReasons.push(`Dept: ${item.department}`);
        }

        // Match Item Location
        if (item.location && item.location.toLowerCase().includes(q) && item.location !== po.location) {
          itemReasons.push(`Loc: ${item.location}`);
        }

        // Match Purchaser Name (holdBy / purchaserName / holdByName)
        const purchaserMatches = 
          item.purchaserName?.toLowerCase().includes(q) ||
          item.holdByName?.toLowerCase().includes(q) ||
          item.holdBy?.toLowerCase().includes(q);

        if (purchaserMatches) {
          const pName = item.purchaserName || item.holdByName || item.holdBy;
          itemReasons.push(`Purchaser: ${pName}`);
        }

        // Match SKU (bonus)
        if (item.sku?.toLowerCase().includes(q) || item.convertedSku?.toLowerCase().includes(q)) {
          itemReasons.push(`SKU: ${item.convertedSku || item.sku}`);
        }

        if (itemReasons.length > 0) {
          matchedItemsInThisPo.push({
            item,
            matchReasons: itemReasons
          });
          itemCount++;
        }
      });

      // If PO matched either at PO-level or had item matches, add to results
      if (poLevelReasons.length > 0 || matchedItemsInThisPo.length > 0) {
        groups.push({
          po,
          poLevelMatchReasons: poLevelReasons,
          matchedItems: matchedItemsInThisPo
        });
      }
    }

    return {
      matchedGroups: groups,
      totalMatchedItems: itemCount,
      totalMatchedPOs: groups.length,
      isCapped: capped
    };
  }, [pos, debouncedQuery]);

  if (!isOpen) return null;

  const getItemStatusBadge = (item: POItem, po: PurchaseOrder) => {
    const norm = getNormalizedItemStatus({
      ...item,
      isHeldByAdmin: po.isHeldByAdmin || po.purchaseStatus === 'Held'
    });

    switch (norm) {
      case 'Purchased':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Purchased
          </span>
        );
      case 'Held':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <PauseCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Held
          </span>
        );
      case 'Partial Purchased':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            Partial ({item.purchasedQty || 0}/{item.requestedQty || item.orderedQty || 0})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            Pending
          </span>
        );
    }
  };

  const handleSelect = (po: PurchaseOrder) => {
    onSelectPO(po);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-6 pb-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh] transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Input */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Search by PO#, item name, brand, department, location, purchaser..."
              className="w-full text-sm sm:text-base font-semibold bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none pr-8"
            />
            {rawQuery && (
              <button
                type="button"
                onClick={() => {
                  setRawQuery('');
                  setDebouncedQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer shrink-0"
            title="Close (ESC)"
          >
            <kbd className="hidden sm:inline-block px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono shadow-2xs">ESC</kbd>
            <span>Close</span>
          </button>
        </div>

        {/* Status Bar / Results Count Banner */}
        {debouncedQuery && (
          <div className="px-4 py-2 bg-emerald-950/20 dark:bg-emerald-950/40 border-b border-emerald-900/30 flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                Found <strong>{totalMatchedItems > 0 ? totalMatchedItems : totalMatchedPOs}</strong> {totalMatchedItems > 0 ? (totalMatchedItems === 1 ? 'item match' : 'item matches') : 'matching POs'} across <strong>{totalMatchedPOs}</strong> {totalMatchedPOs === 1 ? 'Purchase Order' : 'Purchase Orders'} for &ldquo;{debouncedQuery}&rdquo;
              </span>
            </div>
            {isCapped && (
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                (Showing top 50 matches. Refine search for more)
              </span>
            )}
          </div>
        )}

        {/* Scrollable Results List or Empty State */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/80">
          {/* EMPTY QUERY: SUGGESTIONS */}
          {!debouncedQuery && (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Universal ERP Master Search</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Instantly locate any Purchase Order, line item, brand, department, location, or purchaser across the entire database.
                </p>
              </div>

              {/* Quick Search Suggestions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto text-left pt-2">
                <div 
                  onClick={() => setRawQuery('PO-')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>PO Numbers</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">e.g. PO-101, PO-202</p>
                </div>

                <div 
                  onClick={() => setRawQuery('Meat')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Departments</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">e.g. Meat, Produce, Dairy</p>
                </div>

                <div 
                  onClick={() => setRawQuery('Store')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>Locations</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">e.g. Branch, Store, Hub</p>
                </div>

                <div 
                  onClick={() => setRawQuery('Organic')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    <Package className="w-3.5 h-3.5 text-purple-500" />
                    <span>Item Names</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">e.g. Milk, Rice, Carrots</p>
                </div>

                <div 
                  onClick={() => setRawQuery('Brand')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    <Tag className="w-3.5 h-3.5 text-rose-500" />
                    <span>Item Brands</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">e.g. Nestle, Fresh Farms</p>
                </div>

                <div 
                  onClick={() => setRawQuery('Purchaser')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    <UserIcon className="w-3.5 h-3.5 text-sky-500" />
                    <span>Purchasers</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Hold & purchase buyers</p>
                </div>
              </div>
            </div>
          )}

          {/* NO RESULTS FOUND STATE */}
          {debouncedQuery && matchedGroups.length === 0 && (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <X className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No results found for &ldquo;{debouncedQuery}&rdquo;
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No purchase orders, line items, brands, departments, or buyers matched your query. Try checking for typos or searching a shorter keyword.
              </p>
            </div>
          )}

          {/* RESULTS LIST GROUPED BY PO */}
          {matchedGroups.map((group, groupIdx) => {
            const { po, poLevelMatchReasons, matchedItems } = group;

            return (
              <div 
                key={`${po.id || po.poNumber}-${groupIdx}`}
                className="pt-3.5 first:pt-0 space-y-2"
              >
                {/* PO Header Card */}
                <div 
                  onClick={() => handleSelect(po)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 rounded-xl transition cursor-pointer flex flex-wrap items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-2xs font-mono font-black text-xs shrink-0 group-hover:scale-105 transition-transform">
                      PO
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {po.poNumber}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[200px]">
                          {po.customerName || po.supplierName || 'General Order'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          po.purchaseStatus === 'Completed' 
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : po.purchaseStatus === 'Held'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                        }`}>
                          {po.purchaseStatus || 'Pending'}
                        </span>
                      </div>

                      {/* PO Meta line: Dept, Location, Total items */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-medium">
                        {po.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {po.department}
                          </span>
                        )}
                        {po.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {po.location}
                          </span>
                        )}
                        <span>Total Items: <strong>{po.items?.length || po.totalItems || 0}</strong></span>
                        {po.orderDate && <span>Date: {po.orderDate}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* PO Level Match Reasons Badges */}
                    {poLevelMatchReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {poLevelMatchReasons.map((reason, rIdx) => (
                          <span key={rIdx} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-md text-[10px] font-extrabold">
                            Match: {reason}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Matching Items Sub-list */}
                {matchedItems.length > 0 && (
                  <div className="pl-4 sm:pl-6 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                    {matchedItems.map(({ item, matchReasons }, itemIdx) => {
                      const reqQty = item.requestedQty || item.orderedQty || 0;
                      const purQty = item.purchasedQty || 0;
                      const remQty = reqQty - purQty;
                      const purchaser = item.purchaserName || item.holdByName || item.holdBy;

                      return (
                        <div
                          key={`${item.id}-${itemIdx}`}
                          onClick={() => handleSelect(po)}
                          className="p-2.5 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs group"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <CornerDownRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {item.convertedItemName || item.itemName}
                                </span>
                                {item.brand && (
                                  <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold flex items-center gap-1">
                                    <Tag className="w-2.5 h-2.5 text-slate-400" />
                                    {item.brand}
                                  </span>
                                )}
                                {getItemStatusBadge(item, po)}
                              </div>

                              {/* Item Details: Qty, Unit, Purchaser */}
                              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                <span>
                                  Quantity: <strong>{reqQty} {item.unit || 'units'}</strong>
                                </span>
                                {purQty > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Purchased: {purQty}
                                  </span>
                                )}
                                {remQty > 0 && purQty > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    Remaining: {remQty}
                                  </span>
                                )}
                                {purchaser && (
                                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                                    <UserIcon className="w-3 h-3 text-slate-400" />
                                    Buyer/Hold: <strong>{purchaser}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Match reasons tags */}
                          <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto shrink-0">
                            {matchReasons.map((mReason, mrIdx) => (
                              <span 
                                key={mrIdx}
                                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-bold"
                              >
                                {mReason}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Click any item or PO header to open its complete detail and action modal</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
            <span>Press</span>
            <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
