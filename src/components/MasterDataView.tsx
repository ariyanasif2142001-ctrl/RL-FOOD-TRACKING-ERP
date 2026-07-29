import React from 'react';
import { useERP } from '../context/ERPContext';
import { Plus } from 'lucide-react';

export const MasterDataView: React.FC = () => {
  const { masterSKUs, setActiveModal } = useERP();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight">
            Master SKU Mapping & Item Catalog
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Map supplier-specific product codes to internal ERP SKUs for seamless Google Sheets synchronization.
          </p>
        </div>

        <button
          onClick={() => setActiveModal('master-sku')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all"
        >
          <Plus size={18} />
          <span>Add SKU Mapping</span>
        </button>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-3.5 px-4">Internal SKU</th>
                <th className="py-3.5 px-4">Supplier SKU</th>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Preferred Supplier</th>
                <th className="py-3.5 px-4">Base Unit</th>
                <th className="py-3.5 px-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {masterSKUs.map((sku) => (
                <tr key={sku.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-indigo-400">{sku.internalSKU}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{sku.supplierSKU}</td>
                  <td className="py-3.5 px-4 font-semibold text-white">{sku.name}</td>
                  <td className="py-3.5 px-4 text-slate-300">{sku.category}</td>
                  <td className="py-3.5 px-4 text-slate-400">{sku.supplier}</td>
                  <td className="py-3.5 px-4 font-medium text-emerald-400">{sku.unit}</td>
                  <td className="py-3.5 px-4 text-slate-500">{sku.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
