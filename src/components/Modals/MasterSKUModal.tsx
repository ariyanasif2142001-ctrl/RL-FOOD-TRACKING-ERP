import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, Layers } from 'lucide-react';

export const MasterSKUModal: React.FC = () => {
  const { activeModal, setActiveModal, showToast } = useERP();
  const [internalSKU, setInternalSKU] = useState('');
  const [supplierSKU, setSupplierSKU] = useState('');
  const [name, setName] = useState('');

  if (activeModal !== 'master-sku') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Master SKU ${internalSKU} mapped successfully!`);
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-indigo-400" size={20} />
            <h3 className="text-base font-bold text-white">Master SKU Mapping</h3>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Internal ERP SKU Code</label>
            <input
              type="text"
              placeholder="e.g. ING-TOM-01"
              value={internalSKU}
              onChange={(e) => setInternalSKU(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Supplier Product Code / SKU</label>
            <input
              type="text"
              placeholder="e.g. MTP-TOM-SUPPLIER-A"
              value={supplierSKU}
              onChange={(e) => setSupplierSKU(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Item Title</label>
            <input
              type="text"
              placeholder="e.g. Organic Beef Tomatoes 10kg Box"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              required
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl"
            >
              Save SKU Mapping
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
