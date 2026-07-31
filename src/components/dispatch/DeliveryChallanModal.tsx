import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PurchaseOrder, MasterSKUEntry, POItem, DeliveryNoteRecord } from '../../types';
import { printOfficialDeliveryChallanNoPrice } from '../../services/officialPdfService';
import { getMasterSKUMappings, matchPOItemToMasterSKU, getPoItemSkuMapping, savePoItemSkuMapping } from '../../services/skuService';
import { getDeliveredQtyForPOItem, addDeliveryNote } from '../../services/deliveryNoteService';
import { Printer, X, ShieldAlert, Search, Plus, Trash2, CheckSquare, Square, FileSpreadsheet, Sparkles, Check, History, AlertCircle } from 'lucide-react';

interface DeliveryChallanModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  onDeliveryNoteCreated?: () => void;
}

interface ChallanItem {
  id: string;
  poItemId?: string;
  poItemName?: string; // Original PO Purchased Item (e.g., FRESH MILK)
  sku: string; // SKU NAME (e.g., LP005167)
  itemName: string; // New Desc / Item Name
  brand?: string;
  unit: string;
  requestedQty: number;
  deliveredQty: number;
  alreadyDeliveredQty: number;
  unitPrice?: number;
  included: boolean; // Checked by default for delivery note
  notes?: string;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({ po, onClose, onDeliveryNoteCreated }) => {
  const [recipientName, setRecipientName] = useState<string>(po.customerName || 'Authorized Consignee');
  const [challanNumber, setChallanNumber] = useState<string>(`DC-${po.poNumber.replace(/^PO-?/i, '')}`);
  const [deliveryDate, setDeliveryDate] = useState<string>(
    po.deliveryDate || new Date().toISOString().split('T')[0]
  );
  const [dispatchOfficer, setDispatchOfficer] = useState<string>('System Dispatch Officer');
  const [companyName, setCompanyName] = useState<string>('RL FOOD / C P P A');
  const [companySubtext, setCompanySubtext] = useState<string>('الشؤون الخاصة لسمو ولي العهد');
  const [notes, setNotes] = useState<string>('Received all physical items in good condition.');

  // Master SKU database & state
  const [masterSkus, setMasterSkus] = useState<MasterSKUEntry[]>([]);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  
  // Master SKU Search Modal State
  const [activeItemForSkuPick, setActiveItemForSkuPick] = useState<string | null>(null); // ChallanItem ID
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState<string>('');

  // Load Master SKUs and initialize Challan Items
  useEffect(() => {
    const loadedMaster = getMasterSKUMappings();
    setMasterSkus(loadedMaster);

    const poItems = po.items || [];
    const initialized: ChallanItem[] = poItems.map((item, idx) => {
      // Check first for explicitly saved SKU assignment by Dispatcher
      const savedSku = getPoItemSkuMapping(po.poNumber, item.id, item.itemName);

      // Auto-match if no explicitly saved SKU
      const matched = matchPOItemToMasterSKU(item, loadedMaster);

      const finalSku = savedSku?.sku || item.sku || item.internalItemCode || matched.internalItemCode || matched.sku || '';
      const finalItemName = savedSku?.itemName || item.internalItemName || matched.internalItemName || item.itemName;
      const finalUnit = (savedSku?.unit || item.internalUnit || matched.internalUnit || item.unit || 'PCS').toUpperCase();
      const finalBrand = savedSku?.brand || item.brand || matched.brand || '';
      const finalPrice = savedSku?.sellingPrice ?? (matched.unitPrice !== undefined ? matched.unitPrice : (item.unitPrice || item.marketPrice || 0));

      const req = item.requestedQty || item.orderedQty || 0;
      const totalPassed = item.passedQty ?? item.warehouseQty ?? item.purchasedQty ?? req;
      
      // Calculate previously delivered quantity across past Delivery Notes for this PO line
      const prevDelivered = getDeliveredQtyForPOItem(po.poNumber, item.id, item.itemName);
      const availableToDeliver = Math.max(0, totalPassed - prevDelivered);

      const hasValidSku = Boolean(finalSku && finalSku.trim());

      return {
        id: `citem-${item.id || idx}-${Date.now()}`,
        poItemId: item.id,
        poItemName: item.itemName,
        sku: finalSku,
        itemName: finalItemName,
        brand: finalBrand,
        unit: finalUnit,
        requestedQty: req,
        deliveredQty: availableToDeliver,
        alreadyDeliveredQty: prevDelivered,
        unitPrice: finalPrice,
        included: availableToDeliver > 0 && hasValidSku, // Exclude if no SKU or already delivered
        notes: prevDelivered > 0 ? `Prev Delivered: ${prevDelivered}` : (item.qcNotes || item.notes || 'Good Condition')
      };
    });

    setChallanItems(initialized);
  }, [po]);

  // Toggle item inclusion
  const toggleInclude = (id: string) => {
    setChallanItems(prev => prev.map(item => {
      if (item.id === id) {
        if (!item.included && (!item.sku || !item.sku.trim())) {
          alert('AMADER SKU CARA KONO ITEM DELIVARY NOTE HOBE NA.\n\n(No item can be included in a Delivery Note without our Master SKU. Please assign a Master SKU first.)');
          return { ...item, included: false };
        }
        return { ...item, included: !item.included };
      }
      return item;
    }));
  };

  // Select all or deselect all
  const toggleSelectAll = (select: boolean) => {
    if (select) {
      const missingSkuCount = challanItems.filter(i => !i.sku || !i.sku.trim()).length;
      if (missingSkuCount > 0) {
        alert(`Note: ${missingSkuCount} item(s) do not have a Master SKU code assigned. Only items with an assigned SKU can be selected for Delivery.`);
      }
    }
    setChallanItems(prev => prev.map(item => ({
      ...item,
      included: select && Boolean(item.sku && item.sku.trim())
    })));
  };

  // Update delivered quantity
  const updateDeliveredQty = (id: string, qty: number) => {
    setChallanItems(prev => prev.map(item => item.id === id ? { ...item, deliveredQty: Math.max(0, qty) } : item));
  };

  // Update item details manually
  const updateItemDetail = (id: string, field: keyof ChallanItem, value: ChallanItem[keyof ChallanItem]) => {
    let updatedItemForMapping: ChallanItem | null = null;

    setChallanItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'sku') {
          if (value && String(value).trim()) {
            updated.included = true;
          } else {
            updated.included = false;
          }
        }
        if ((field === 'sku' || field === 'itemName' || field === 'unit' || field === 'unitPrice') && (item.poItemId || item.poItemName)) {
          updatedItemForMapping = updated;
        }
        return updated;
      }
      return item;
    }));

    if (updatedItemForMapping) {
      const item: ChallanItem = updatedItemForMapping;
      savePoItemSkuMapping(po.poNumber, item.poItemId, item.poItemName, {
        sku: item.sku,
        itemName: item.itemName,
        unit: item.unit,
        brand: item.brand,
        sellingPrice: item.unitPrice
      });
    }
  };

  // Assign a Master SKU from the MASTAR DATA sheet to a line item
  const handleAssignMasterSku = (targetChallanItemId: string, skuEntry: MasterSKUEntry) => {
    const parsedPrice = skuEntry.sellingPrice !== undefined && skuEntry.sellingPrice !== null && skuEntry.sellingPrice !== ''
      ? parseFloat(String(skuEntry.sellingPrice))
      : (skuEntry.costPrice !== undefined && skuEntry.costPrice !== null && skuEntry.costPrice !== '' ? parseFloat(String(skuEntry.costPrice)) : 0);

    let mappedItemToSave: { poItemId?: string; poItemName?: string; sku: string; itemName: string; unit: string; brand?: string; sellingPrice?: number } | null = null;

    setChallanItems(prev => prev.map(item => {
      if (item.id === targetChallanItemId) {
        const updated = {
          ...item,
          sku: skuEntry.internalSKU || item.sku,
          itemName: skuEntry.customerItemName || skuEntry.internalItemName || item.itemName,
          unit: (skuEntry.internalUnit || item.unit).toUpperCase(),
          brand: skuEntry.brand || item.brand || '',
          unitPrice: !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : item.unitPrice,
          included: true // Selected SKU enables delivery note inclusion!
        };
        mappedItemToSave = {
          poItemId: item.poItemId,
          poItemName: item.poItemName,
          sku: updated.sku,
          itemName: updated.itemName,
          unit: updated.unit,
          brand: updated.brand,
          sellingPrice: updated.unitPrice
        };
        return updated;
      }
      return item;
    }));

    if (mappedItemToSave) {
      const info = mappedItemToSave;
      savePoItemSkuMapping(po.poNumber, info.poItemId, info.poItemName, {
        sku: info.sku,
        itemName: info.itemName,
        unit: info.unit,
        brand: info.brand,
        sellingPrice: info.sellingPrice
      });
    }

    setIsPickerOpen(false);
    setActiveItemForSkuPick(null);
  };

  // Add a brand variant / extra item directly from MASTAR DATA sheet
  const handleAddMasterSkuAsNewItem = (skuEntry: MasterSKUEntry, parentPoItemName?: string) => {
    const parsedPrice = skuEntry.sellingPrice !== undefined && skuEntry.sellingPrice !== null && skuEntry.sellingPrice !== ''
      ? parseFloat(String(skuEntry.sellingPrice))
      : (skuEntry.costPrice !== undefined && skuEntry.costPrice !== null && skuEntry.costPrice !== '' ? parseFloat(String(skuEntry.costPrice)) : 0);

    const newItem: ChallanItem = {
      id: `citem-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      poItemName: parentPoItemName || skuEntry.customerItemName || 'Extra Item',
      sku: skuEntry.internalSKU,
      itemName: skuEntry.customerItemName || skuEntry.internalItemName,
      unit: (skuEntry.internalUnit || 'PCS').toUpperCase(),
      brand: skuEntry.brand || '',
      requestedQty: 0,
      deliveredQty: 1,
      alreadyDeliveredQty: 0,
      unitPrice: !isNaN(parsedPrice) ? parsedPrice : 0,
      included: true,
      notes: 'Added from Master SKU Database'
    };
    setChallanItems(prev => [...prev, newItem]);
    setIsPickerOpen(false);
    setActiveItemForSkuPick(null);
  };

  // Delete line item
  const handleDeleteItem = (id: string) => {
    setChallanItems(prev => prev.filter(item => item.id !== id));
  };

  // Filter Master SKUs for picker modal (with smart multi-keyword fallback)
  const filteredMasterSkus = masterSkus.filter(m => {
    if (!skuSearchQuery.trim()) return true;
    const q = skuSearchQuery.trim().toLowerCase();
    
    // 1. Direct Substring match
    const directMatch = (
      (m.internalSKU || '').toLowerCase().includes(q) ||
      (m.customerItemName || '').toLowerCase().includes(q) ||
      (m.internalItemName || '').toLowerCase().includes(q) ||
      (m.slNo ? String(m.slNo).includes(q) : false) ||
      (m.category || '').toLowerCase().includes(q)
    );
    if (directMatch) return true;

    // 2. Tokenized search for individual words (handles word order or slight query differences)
    const tokens = q
      .replace(/[^\w\s]/gi, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2); // skip tiny words like of, in, ml

    if (tokens.length === 0) return false;

    const searchableText = `${m.internalSKU} ${m.customerItemName} ${m.internalItemName} ${m.category}`.toLowerCase();
    const matchCount = tokens.filter(tok => searchableText.includes(tok)).length;

    // Require matching at least 2 tokens if 3+ words in search query, or 1 token if fewer
    return tokens.length >= 3 ? matchCount >= 2 : matchCount >= 1;
  });

  // Print Challan - ONLY INCLUDED ITEMS ARE SENT TO PDF & SAVED TO TRACKING HISTORY
  const handlePrint = () => {
    const activeItems = challanItems.filter(i => i.included && i.deliveredQty > 0);

    if (activeItems.length === 0) {
      alert('Please select at least one item with Delivered Quantity > 0 to include in the Delivery Note.');
      return;
    }

    const missingSkuItems = activeItems.filter(i => !i.sku || !i.sku.trim());
    if (missingSkuItems.length > 0) {
      alert(`AMADER SKU CARA KONO ITEM DELIVARY NOTE HOBE NA.\n\nCannot proceed: The following item(s) do not have a Master SKU assigned:\n${missingSkuItems.map(i => `- ${i.itemName}`).join('\n')}\n\nPlease select/match a Master SKU for all items before creating the Delivery Note.`);
      return;
    }

    // Save Delivery Note Record to System Tracking & Pending Invoice Storage
    const newRecord: DeliveryNoteRecord = {
      id: `dn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      challanNumber,
      poId: po.id,
      poNumber: po.poNumber,
      customerName: po.customerName || recipientName,
      deliveryDate: new Date(deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      dispatchOfficer,
      recipientName,
      notes,
      createdDate: new Date().toISOString(),
      status: 'Pending Invoice',
      companyName,
      companySubtext,
      items: activeItems.map(ci => ({
        id: ci.id,
        poItemId: ci.poItemId,
        poItemName: ci.poItemName,
        sku: ci.sku,
        itemName: ci.itemName,
        brand: ci.brand,
        unit: ci.unit,
        requestedQty: ci.requestedQty,
        deliveredQty: ci.deliveredQty,
        unitPrice: ci.unitPrice || 0,
        notes: ci.notes
      }))
    };

    addDeliveryNote(newRecord);
    if (typeof onDeliveryNoteCreated === 'function') {
      onDeliveryNoteCreated();
    }

    // Map ChallanItems to POItem structure expected by officialPdfService
    const poItemsForPrint: POItem[] = activeItems.map((ci, idx) => ({
      id: ci.id,
      poId: po.id,
      poNumber: po.poNumber,
      slNumber: idx + 1,
      itemName: ci.itemName,
      customerItemName: ci.poItemName || ci.itemName,
      internalItemName: ci.itemName,
      internalItemCode: ci.sku,
      sku: ci.sku,
      unit: ci.unit,
      requestedQty: ci.requestedQty,
      orderedQty: ci.requestedQty,
      purchasedQty: ci.deliveredQty,
      warehouseQty: ci.deliveredQty,
      passedQty: ci.deliveredQty,
      category: 'General',
      brand: ci.brand,
      purchaseStatus: 'Purchased',
      remainingQty: Math.max(0, ci.requestedQty - ci.deliveredQty),
      notes: ci.notes || 'Good Condition'
    }));

    printOfficialDeliveryChallanNoPrice(po, {
      challanNumber,
      deliveryDate: new Date(deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      recipientName,
      dispatchOfficer,
      notes,
      companyName,
      companySubtext,
      items: poItemsForPrint
    });
  };

  const includedItems = challanItems.filter(i => i.included && i.deliveredQty > 0);
  const excludedItems = challanItems.filter(i => !i.included || i.deliveredQty === 0);
  const totalDeliveredQtySum = includedItems.reduce((acc, i) => acc + i.deliveredQty, 0);
  const totalOrderedQtySum = challanItems.reduce((acc, i) => acc + i.requestedQty, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]"
        >
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] text-white px-6 py-4 flex items-center justify-between border-b border-emerald-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-lg shadow-inner">
              RL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Official Delivery Note & Master SKU Selector</h3>
                <span className="bg-indigo-500/30 text-indigo-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  {masterSkus.length} SKUs Loaded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PO: <span className="font-mono text-emerald-400 font-bold">{po.poNumber}</span> | Select Master SKUs side-by-side with purchased items for Delivery Note
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          
          {/* Notice Banner */}
          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-start gap-3 text-indigo-950 text-xs">
            <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider block text-indigo-900">
                Dispatcher Master SKU Mapping & Delivery Note Builder:
              </span>
              <p className="text-[11px] leading-relaxed">
                Purchased PO items (like <strong>FRESH MILK</strong>) can have multiple specific stock SKUs/Brands from the <strong>`MASTAR DATA` sheet</strong>.
                Select the exact <strong>SKU NAME</strong> side-by-side for each purchased item. <strong>Only items checked [✓] with quantity &gt; 0 will be added to the official printed Delivery Note.</strong>
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs shadow-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Challan Number
              </label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Recipient / Consignee
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Dispatch Officer
              </label>
              <input
                type="text"
                value={dispatchOfficer}
                onChange={(e) => setDispatchOfficer(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Company Header Title
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Company Arabic Header
              </label>
              <input
                type="text"
                value={companySubtext}
                onChange={(e) => setCompanySubtext(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Items Mapping & Delivery Note Builder Table */}
          <div className="space-y-3">
            
            {/* Table Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Purchased Items & Master SKU Selection
                </h4>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    Included: {includedItems.length} items ({totalDeliveredQtySum} Units)
                  </span>
                  {excludedItems.length > 0 && (
                    <span className="bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                      Excluded: {excludedItems.length} items
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveItemForSkuPick(null);
                    setSkuSearchQuery('');
                    setIsPickerOpen(true);
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Extra Master SKU</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-bold border-b border-slate-800 text-[11px]">
                    <th className="p-2.5 text-center w-12">Add?</th>
                    <th className="p-2.5 w-44">Purchased PO Item</th>
                    <th className="p-2.5">Selected Master SKU (MASTAR DATA)</th>
                    <th className="p-2.5 w-24">SKU Code</th>
                    <th className="p-2.5 text-center w-16">Unit</th>
                    <th className="p-2.5 text-center w-16">Ordered</th>
                    <th className="p-2.5 text-center w-24">Delivered Qty</th>
                    <th className="p-2.5 text-right w-28">Selling Price (SAR)</th>
                    <th className="p-2.5 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {challanItems.map((item, idx) => {
                    return (
                      <tr 
                        key={item.id ? `${item.id}-${idx}` : `ch-item-${idx}`} 
                        className={`transition ${item.included ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/60 opacity-60'}`}
                      >
                        {/* Include Checkbox */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleInclude(item.id)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                            title={item.included ? 'Item included in Delivery Note (Click to exclude)' : 'Item excluded (Click to include)'}
                          >
                            {item.included ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600 fill-indigo-50" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* PO Item Name */}
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 leading-snug">{item.poItemName || item.itemName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-medium">PO Line {idx + 1}</span>
                            {item.alreadyDeliveredQty > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px] flex items-center gap-1">
                                <History className="w-2.5 h-2.5 text-amber-700" />
                                Prev Delivered: {item.alreadyDeliveredQty} {item.unit}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Master SKU Picker Side-by-Side */}
                        <td className="p-2.5">
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={e => updateItemDetail(item.id, 'itemName', e.target.value)}
                              className="w-full text-xs font-bold px-2.5 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                              placeholder="Stock Description / Brand Name..."
                            />
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveItemForSkuPick(item.id);
                                  setSkuSearchQuery(item.poItemName || item.itemName || '');
                                  setIsPickerOpen(true);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 flex items-center gap-1 transition cursor-pointer shrink-0"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                <span>Match / Change SKU from MASTAR DATA</span>
                              </button>
                              {item.brand && (
                                <span className="text-[10px] text-slate-500 italic">Brand: {item.brand}</span>
                              )}
                            </div>

                            {/* Conversion indicator: PO Item vs Selected Master SKU */}
                            {item.sku ? (
                              <div className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md px-2 py-1 font-medium space-y-0.5">
                                <div className="flex items-center gap-1 font-bold text-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Selected SKU: <strong className="font-mono text-indigo-900 bg-indigo-50 px-1 rounded">{item.sku}</strong></span>
                                  {item.unitPrice ? (
                                    <span className="text-emerald-700 font-bold ml-1">• Selling Price: {item.unitPrice} SAR</span>
                                  ) : null}
                                </div>
                                <p className="text-[9.5px] text-slate-600">
                                  Original PO Item: <span className="font-bold text-slate-900">{item.poItemName || item.itemName}</span>
                                </p>
                              </div>
                            ) : (
                              <div className="text-[10px] bg-rose-50 border border-rose-200 text-rose-900 rounded-md px-2 py-1 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>SKU REQUIRED FOR DELIVERY NOTE (Select Master SKU)</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* SKU Code */}
                        <td className="p-2.5 font-mono font-bold">
                          <input
                            type="text"
                            value={item.sku}
                            onChange={e => updateItemDetail(item.id, 'sku', e.target.value)}
                            placeholder="Required SKU..."
                            className={`w-full font-mono text-xs font-bold px-2 py-1 border rounded-lg transition ${
                              item.sku 
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                                : 'bg-rose-50 border-rose-300 text-rose-800 placeholder:text-rose-400 font-black'
                            }`}
                          />
                        </td>

                        {/* Unit */}
                        <td className="p-2.5 text-center">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={e => updateItemDetail(item.id, 'unit', e.target.value.toUpperCase())}
                            className="w-full text-center font-bold text-xs uppercase px-1 py-1 border border-slate-300 rounded-lg bg-white"
                          />
                        </td>

                        {/* Ordered Qty */}
                        <td className="p-2.5 text-center font-bold text-blue-800">
                          {item.requestedQty}
                        </td>

                        {/* Delivered Qty */}
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.deliveredQty}
                            onChange={e => updateDeliveredQty(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 text-center font-black text-sm text-emerald-800 px-2 py-1 border-2 border-emerald-300 rounded-lg bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Unit Selling Price (SAR) */}
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice || 0}
                            onChange={e => updateItemDetail(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-24 text-right font-mono font-bold text-xs px-2 py-1 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                            placeholder="Price (SAR)..."
                          />
                        </td>

                        {/* Delete Action */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Delivery Note Remarks */}
            <div className="text-xs bg-white p-3 rounded-xl border border-slate-200 space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Delivery Note Remarks / Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                placeholder="e.g. Delivered directly to Central Kitchen Loading Dock"
              />
            </div>

          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-600">
            <strong>{includedItems.length}</strong> items selected for Delivery Note ({totalDeliveredQtySum} total units).
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handlePrint}
              disabled={includedItems.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Delivery Challan ({includedItems.length} Items)</span>
            </button>
          </div>
        </div>

      </motion.div>

      {/* MASTER SKU PICKER MODAL (MASTAR DATA SHEET SEARCH) */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">Select Master SKU from `MASTAR DATA` Sheet</h4>
                  <p className="text-[11px] text-slate-400">Total {masterSkus.length} items loaded from Excel database</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPickerOpen(false);
                  setActiveItemForSkuPick(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PROMINENT PO ITEM BANNER AT TOP SO USER NEVER FORGETS ORIGINAL PO ITEM */}
            {activeItemForSkuPick && (() => {
              const activeItemObj = challanItems.find(i => i.id === activeItemForSkuPick);
              if (!activeItemObj) return null;
              return (
                <div className="bg-gradient-to-r from-amber-600 to-indigo-700 text-white px-5 py-2.5 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-white text-slate-900 font-extrabold text-[10px] rounded uppercase shadow-xs">
                      Original PO Item
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-amber-100 font-sans">
                      {activeItemObj.poItemName || activeItemObj.itemName}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-200 font-medium hidden sm:inline">
                    Select matching SKU entry below to convert
                  </span>
                </div>
              );
            })()}

            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  autoFocus
                  value={skuSearchQuery}
                  onChange={e => setSkuSearchQuery(e.target.value)}
                  placeholder="Search SKU NAME (e.g. LP005167), Description (Milk, Rice, Vinegar...), SL NO..."
                  className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>

              {skuSearchQuery && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Searching for: <strong>"{skuSearchQuery}"</strong></span>
                  <button
                    type="button"
                    onClick={() => setSkuSearchQuery('')}
                    className="text-indigo-600 hover:underline font-bold"
                  >
                    Clear search filter
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 max-h-[500px]">
              {filteredMasterSkus.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-medium text-xs space-y-3">
                  <p className="text-slate-600 font-bold">No exact Master SKU match found for "{skuSearchQuery}".</p>
                  <p className="text-[11px] text-slate-400">Try typing a shorter keyword (e.g. "Vinegar", "Cream", "Mussini" or SKU Code).</p>
                  <button
                    type="button"
                    onClick={() => setSkuSearchQuery('')}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow hover:bg-indigo-700 transition"
                  >
                    View All {masterSkus.length} Master SKUs
                  </button>
                </div>
              ) : (
                filteredMasterSkus.slice(0, 100).map((entry, idx) => (
                  <div
                    key={entry.id ? `${entry.id}-${idx}` : `entry-${idx}`}
                    className="p-3 bg-white hover:bg-indigo-50/60 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {entry.internalSKU}
                        </span>
                        {entry.slNo && (
                          <span className="text-[10px] text-slate-400 font-mono">SL: {entry.slNo}</span>
                        )}
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                          {entry.internalUnit || 'PCS'}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900 mt-1">
                        {entry.customerItemName || entry.internalItemName}
                      </p>
                      {entry.category && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Category: {entry.category}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeItemForSkuPick ? (
                        <button
                          type="button"
                          onClick={() => handleAssignMasterSku(activeItemForSkuPick, entry)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Assign SKU</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddMasterSkuAsNewItem(entry)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Delivery Note</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span>Showing up to 100 results ({filteredMasterSkus.length} total matches)</span>
              <button
                onClick={() => {
                  setIsPickerOpen(false);
                  setActiveItemForSkuPick(null);
                }}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </motion.div>
  </AnimatePresence>
  );
};

