import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, PackageCheck, Check } from 'lucide-react';

export const ReceiveItemModal: React.FC = () => {
  const { activeModal, setActiveModal, selectedPOItemContext, receiveWarehouseItem } = useERP();

  const [receivedQty, setReceivedQty] = useState(100);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedPOItemContext) {
      setReceivedQty(selectedPOItemContext.item.purchasedQty || selectedPOItemContext.item.orderedQty);
    }
  }, [selectedPOItemContext]);

  if (activeModal !== 'receive-item' || !selectedPOItemContext) return null;

  const { poId, item } = selectedPOItemContext;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    receiveWarehouseItem(poId, item.id, receivedQty, notes);
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="text-amber-400" size={20} />
            <div>
              <h3 className="text-base font-bold text-white">Warehouse Physical Receive</h3>
              <p className="text-[11px] text-slate-400">{poId} • {item.name}</p>
            </div>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
            <span className="font-semibold text-white">{item.name} ({item.sku})</span>
            <div className="mt-1 flex justify-between text-[11px]">
              <span>Purchased Qty: <strong>{item.purchasedQty || item.orderedQty} {item.unit}</strong></span>
              <span>Already Received: <strong>{item.receivedQty || 0} {item.unit}</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Physical Inspected Count Received</label>
            <input
              type="number"
              value={receivedQty}
              onChange={(e) => setReceivedQty(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Inspection Notes / Damage Log</label>
            <textarea
              rows={2}
              placeholder="Note any damaged items, missing boxes, or temp logs..."
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/30"
            >
              <Check size={16} />
              <span>Confirm Warehouse Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
