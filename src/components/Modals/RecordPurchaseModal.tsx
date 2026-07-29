import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, DollarSign, Check } from 'lucide-react';

export const RecordPurchaseModal: React.FC = () => {
  const { activeModal, setActiveModal, selectedPOItemContext, recordItemPurchase } = useERP();

  const [purchasedQty, setPurchasedQty] = useState(100);
  const [actualUnitPrice, setActualUnitPrice] = useState(3.50);
  const [receiptNumber, setReceiptNumber] = useState('RCP-99102');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedPOItemContext) {
      setPurchasedQty(selectedPOItemContext.item.orderedQty);
      setActualUnitPrice(selectedPOItemContext.item.estimatedUnitPrice);
    }
  }, [selectedPOItemContext]);

  if (activeModal !== 'record-purchase' || !selectedPOItemContext) return null;

  const { poId, item } = selectedPOItemContext;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordItemPurchase(poId, item.id, purchasedQty, actualUnitPrice, receiptNumber, notes);
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="text-emerald-400" size={20} />
            <div>
              <h3 className="text-base font-bold text-white">Record Actual Purchase</h3>
              <p className="text-[11px] text-slate-400">{poId} • {item.name}</p>
            </div>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-400 block">Item Requisition</span>
            <span className="font-semibold text-white">{item.name} ({item.sku})</span>
            <div className="mt-1 flex justify-between text-[11px]">
              <span>Ordered Qty: <strong>{item.orderedQty} {item.unit}</strong></span>
              <span>Estimated Price: <strong>${item.estimatedUnitPrice.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Purchased Quantity</label>
              <input
                type="number"
                value={purchasedQty}
                onChange={(e) => setPurchasedQty(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Actual Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={actualUnitPrice}
                onChange={(e) => setActualUnitPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-emerald-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Vendor Receipt / Invoice #</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Purchaser Field Notes</label>
            <textarea
              rows={2}
              placeholder="Add market pricing notes or vendor discount info..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
            >
              <Check size={16} />
              <span>Confirm Purchase</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
