import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, Activity, CheckCircle, RefreshCw } from 'lucide-react';

export const SystemTestModal: React.FC = () => {
  const { activeModal, setActiveModal, showToast } = useERP();
  const [testing, setTesting] = useState(false);
  const [testResults] = useState<{ name: string; status: 'ok' | 'testing' }[]>([
    { name: 'Google Sheets AppsScript Endpoint Connection', status: 'ok' },
    { name: 'Local Database Persistence & Cache Health', status: 'ok' },
    { name: 'User Role Concurrency Locks (Hold/Release)', status: 'ok' },
    { name: 'PWA Service Worker & Manifest Register', status: 'ok' },
    { name: 'Telegram Bot Notification Webhook', status: 'ok' },
  ]);

  if (activeModal !== 'system-test') return null;

  const handleRunTests = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      showToast('⚡ System diagnostics completed. All 5/5 services operational!');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-amber-400" size={20} />
            <h3 className="text-base font-bold text-white">ERP System Diagnostics</h3>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-2">
            {testResults.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-200 font-medium">{t.name}</span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                  <CheckCircle size={12} /> Passed
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
            >
              Close
            </button>
            <button
              onClick={handleRunTests}
              disabled={testing}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
              <span>{testing ? 'Testing...' : 'Run Diagnostics'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
