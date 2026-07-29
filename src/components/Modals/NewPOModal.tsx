import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, Plus, Trash2, ShoppingCart, Check } from 'lucide-react';
import type { POItem } from '../../types';

export const NewPOModal: React.FC = () => {
  const { activeModal, setActiveModal, createPurchaseOrder } = useERP();

  const [supplier, setSupplier] = useState('Metro Fresh Produce Ltd.');
  const [deliveryDate, setDeliveryDate] = useState('2026-08-05');
  const [items, setItems] = useState<Omit<POItem, 'id' | 'purchaseStatus' | 'receiveStatus'>[]>([
    {
      sku: 'ING-TOM-01',
      name: 'Organic Tomatoes',
      category: 'Fresh Produce',
      orderedQty: 100,
      unit: 'kg',
      estimatedUnitPrice: 3.50,
    },
  ]);

  if (activeModal !== 'new-po') return null;

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        sku: `ING-ITEM-${prev.length + 1}`,
        name: '',
        category: 'Fresh Produce',
        orderedQty: 50,
        unit: 'kg',
        estimatedUnitPrice: 5.00,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || items.length === 0) return;

    createPurchaseOrder({
      supplier,
      department: 'Central Kitchen',
      location: 'Main Facility #1',
      orderDate: new Date().toISOString().substring(0, 10),
      deliveryDate,
      items: items.map((i, idx) => ({
        ...i,
        id: `item-${Date.now()}-${idx}`,
        purchaseStatus: 'Pending',
        receiveStatus: 'Pending',
      })),
      totalQuantity: items.reduce((acc, i) => acc + i.orderedQty, 0),
      createdByName: 'Current User',
      createdById: 'usr-admin-1',
    });

    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-blue-400" size={20} />
            <h3 className="text-lg font-bold text-white">Create New Purchase Order</h3>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Supplier Name</label>
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Metro Fresh Produce Ltd.">Metro Fresh Produce Ltd.</option>
                <option value="Apex Dairy & Poultry Supplies">Apex Dairy & Poultry Supplies</option>
                <option value="Global Spice & Packaging Co.">Global Spice & Packaging Co.</option>
                <option value="Golden Grains Wholesalers">Golden Grains Wholesalers</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Target Delivery Date</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Requisition Line Items</span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> Add Item Row
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((row, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Item Name (e.g. Tomatoes)"
                      value={row.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, name: val } : item)));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                      required
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="SKU"
                      value={row.sku}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, sku: val } : item)));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={row.orderedQty}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, orderedQty: val } : item)));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Est. Price"
                      value={row.estimatedUnitPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, estimatedUnitPrice: val } : item)));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                    />
                  </div>

                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>Issue Purchase Order</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
