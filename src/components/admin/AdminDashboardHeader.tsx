import React from 'react';
import { LayoutDashboard, FileSpreadsheet, Crown, RefreshCw } from 'lucide-react';

interface AdminDashboardHeaderProps {
  activeTab: 'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs') => void;
  setIsMasterSkuModalOpen: (open: boolean) => void;
  setIsCustomAlertModalOpen: (open: boolean) => void;
  isSendingTelegramSummary: boolean;
  isSendingCustomAlert: boolean;
  onSync: () => void;
  isSyncing: boolean;
  handleSendTelegramReport: (type: 'master' | 'pending' | 'hold' | 'transit' | 'warehouse') => void;
  usersCount: number;
}

export const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({
  activeTab,
  setActiveTab,
  setIsMasterSkuModalOpen,
  setIsCustomAlertModalOpen,
  isSendingTelegramSummary,
  isSendingCustomAlert,
  onSync,
  isSyncing,
  handleSendTelegramReport,
  usersCount
}) => {
  return (
    <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] border border-emerald-900/60 text-white p-3.5 sm:p-4 rounded-xl space-y-3 shadow-md">
      {/* Line 1: Header Title & Main Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-emerald-800/60 pb-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-sm sm:text-base font-bold leading-tight">Admin Dashboard</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Master Operations & Master Google Sheets Database</p>
          </div>

          {/* Master SKU Mapping Button on Line 1 Left Side */}
          <button
            type="button"
            onClick={() => setIsMasterSkuModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Manage Master SKU Mappings & Dropbox Auto-Sync URL"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-200" />
            <span>Master SKU Mapping</span>
          </button>
        </div>

        {/* Navigation Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-300" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-300" />
            <span>PO Import</span>
          </button>

          {/* Active Admin Option Pill if opened from Admin Profile Menu */}
          {activeTab !== 'dashboard' && activeTab !== 'import' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-amber-400" />
                {activeTab === 'users' && `Users (${usersCount})`}
                {activeTab === 'sheets' && 'Google Sheets Config'}
                {activeTab === 'telegram' && 'Telegram Bot Alerts'}
                {activeTab === 'tests' && 'System Diagnostics'}
                {activeTab === 'docs' && 'Setup & Guides'}
                {activeTab === 'logs' && 'Audit Security Logs'}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                title="Back to Dashboard"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Line 2: Master Operations & Telegram Report Action Buttons (Left to Right, Direct Buttons) */}
      <div className="flex flex-wrap items-center justify-start gap-1.5 sm:gap-2 pt-1 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setIsCustomAlertModalOpen(true)}
          disabled={isSendingTelegramSummary || isSendingCustomAlert}
          className="px-2.5 sm:px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-600/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send custom broadcast message or urgent alert to Telegram group"
        >
          <span className="text-sm leading-none">📢</span>
          <span>Custom Alert</span>
        </button>

        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Master'}</span>
        </button>

        <div className="h-4 w-px bg-slate-700/80 hidden sm:block mx-0.5" />

        {/* Direct 5 Telegram Report Buttons */}
        <button
          type="button"
          onClick={() => handleSendTelegramReport('master')}
          disabled={isSendingTelegramSummary}
          className="px-2.5 sm:px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-100 border border-blue-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send Daily Master Summary to Telegram"
        >
          <span className="text-sm leading-none">📊</span>
          <span>1. Daily Summary</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendTelegramReport('pending')}
          disabled={isSendingTelegramSummary}
          className="px-2.5 sm:px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-100 border border-amber-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send Urgent Pending Purchases to Telegram"
        >
          <span className="text-sm leading-none">🛒</span>
          <span>2. Urgent Pending</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendTelegramReport('hold')}
          disabled={isSendingTelegramSummary}
          className="px-2.5 sm:px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-100 border border-rose-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send On-Hold Items Digest to Telegram"
        >
          <span className="text-sm leading-none">⏸️</span>
          <span>3. On-Hold Digest</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendTelegramReport('transit')}
          disabled={isSendingTelegramSummary}
          className="px-2.5 sm:px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-100 border border-sky-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send In-Transit Goods Report to Telegram"
        >
          <span className="text-sm leading-none">🚚</span>
          <span>4. In-Transit Goods</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendTelegramReport('warehouse')}
          disabled={isSendingTelegramSummary}
          className="px-2.5 sm:px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-100 border border-purple-700/60 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send Warehouse Staging Stock to Telegram"
        >
          <span className="text-sm leading-none">🏬</span>
          <span>5. Warehouse Staging</span>
        </button>
      </div>
    </div>
  );
};
