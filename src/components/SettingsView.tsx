import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { RefreshCw, Smartphone, Check, ExternalLink } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { syncInfo, triggerManualSync, handleInstallApp, showToast } = useERP();
  const [sheetsUrl, setSheetsUrl] = useState(syncInfo.sheetsUrl);
  const [autoSyncInterval, setAutoSyncInterval] = useState('30');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    showToast('⚙️ System preferences updated successfully!');
    setTimeout(() => setSaved(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all Purchase Orders back to default demo state?')) {
      localStorage.removeItem('rl_food_pos');
      localStorage.removeItem('rl_food_logs');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight">
          System Preferences & Integrations
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure Google Sheets sync parameters, Telegram bot credentials, and PWA settings.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Google Sheets Integration */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={20} className="text-emerald-400" />
              <h2 className="text-[22px] font-semibold text-white">Google Sheets Integration</h2>
            </div>
            <a
              href={sheetsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              Open Live Sheet <ExternalLink size={12} />
            </a>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Google Sheets WebApp Script URL</label>
              <input
                type="text"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Auto-Sync Frequency (Seconds)</label>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => setAutoSyncInterval(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="15">Every 15 Seconds</option>
                  <option value="30">Every 30 Seconds</option>
                  <option value="60">Every 60 Seconds</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={triggerManualSync}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Test Connection & Sync Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PWA & Mobile Install */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Smartphone size={20} className="text-blue-400" />
            <h2 className="text-[22px] font-semibold text-white">Progressive Web App (PWA)</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              <h4 className="font-semibold text-white">Install Mobile ERP Application</h4>
              <p className="text-slate-400 mt-0.5">
                Enable offline purchasing, barcode scanning, and instant local storage backup.
              </p>
            </div>

            <button
              type="button"
              onClick={handleInstallApp}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-colors whitespace-nowrap"
            >
              <Smartphone size={16} />
              <span>Trigger Install App</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetData}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold rounded-xl text-xs transition-colors"
          >
            Reset Demo Database
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all"
          >
            {saved ? <Check size={16} /> : null}
            <span>{saved ? 'Preferences Saved!' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
