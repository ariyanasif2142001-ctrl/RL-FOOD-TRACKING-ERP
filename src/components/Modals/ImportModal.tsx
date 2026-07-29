import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, Upload, Check, Link } from 'lucide-react';

export const ImportModal: React.FC = () => {
  const { activeModal, setActiveModal, setSheetsUrl, triggerManualSync, showToast } = useERP();
  const [inputUrl, setInputUrl] = useState('');

  if (activeModal !== 'import') return null;

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;

    setSheetsUrl(inputUrl);
    triggerManualSync();
    showToast('🚀 Connecting & syncing real Google Sheets data...');
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="text-amber-400" size={20} />
            <h3 className="text-base font-bold text-white">Connect Real Google Sheets Data</h3>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleImportSubmit} className="p-5 space-y-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-amber-400">
              <Link size={16} /> Paste Google Sheet or WebApp URL
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Paste your live Google Sheet share link or Google AppsScript WebApp endpoint URL below to sync your real purchase orders into the ERP.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Google Sheet URL or AppsScript URL</label>
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/30"
            >
              <Check size={16} />
              <span>Connect & Sync Real Data</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
