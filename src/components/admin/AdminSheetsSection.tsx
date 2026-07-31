import React, { useState, useEffect } from 'react';
import { TelegramSettings } from './TelegramSettings';
import { getGoogleAppsScriptTemplate } from '../../services/sheetsService';
import { copyToClipboard } from '../../utils/clipboard';
import { Database, Save, Copy, Check } from 'lucide-react';

interface AdminSheetsSectionProps {
  sheetsConfig: { sheetId?: string; webAppUrl?: string; autoSync?: boolean; lastSyncedAt?: string };
  onSaveSheetsConfig: (config: { sheetId: string; webAppUrl: string; autoSync: boolean; lastSyncedAt: string }) => void;
  onSync: () => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminSheetsSection: React.FC<AdminSheetsSectionProps> = ({
  sheetsConfig,
  onSaveSheetsConfig,
  onSync,
  onShowToast
}) => {
  const [webAppUrl, setWebAppUrl] = useState(sheetsConfig.webAppUrl || '');
  const [sheetId, setSheetId] = useState(sheetsConfig.sheetId || '');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (sheetsConfig.webAppUrl !== undefined) {
      setWebAppUrl(sheetsConfig.webAppUrl || '');
    }
    if (sheetsConfig.sheetId !== undefined) {
      setSheetId(sheetsConfig.sheetId || '');
    }
  }, [sheetsConfig.webAppUrl, sheetsConfig.sheetId]);

  const handleCopyScript = async () => {
    await copyToClipboard(getGoogleAppsScriptTemplate());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleSaveConfig = () => {
    onSaveSheetsConfig({
      sheetId,
      webAppUrl,
      autoSync: true,
      lastSyncedAt: new Date().toISOString()
    });
    onSync();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>Master Google Sheets Integration & WebApp URL</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure live two-way sync with Google Sheets database backend.</p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700">Google Apps Script WebApp URL *</label>
            <input
              type="text"
              value={webAppUrl}
              onChange={e => setWebAppUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full p-2.5 border border-slate-300 rounded-lg mt-1 font-mono focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700">Google Spreadsheet ID</label>
            <input
              type="text"
              value={sheetId}
              onChange={e => setSheetId(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRra5nFMdAcB..."
              className="w-full p-2.5 border border-slate-300 rounded-lg mt-1 font-mono focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCopyScript}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copiedCode ? 'Code.gs Copied to Clipboard!' : 'Copy Code.gs Script for Apps Script Editor'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Sync Sheets Config</span>
            </button>
          </div>
        </div>
      </div>

      <TelegramSettings onShowToast={onShowToast} />
    </div>
  );
};
