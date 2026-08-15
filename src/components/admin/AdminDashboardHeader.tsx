import React from 'react';
import { LayoutDashboard, FileSpreadsheet, Crown, RefreshCw, Search } from 'lucide-react';

interface AdminDashboardHeaderProps {
  activeTab: 'dashboard' | 'import' | 'users' | 'telegram' | 'tests' | 'docs' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'import' | 'users' | 'telegram' | 'tests' | 'docs' | 'logs') => void;
  setIsCustomAlertModalOpen: (open: boolean) => void;
  onOpenGlobalSearch: () => void;
  isSendingTelegramSummary: boolean;
  isSendingCustomAlert: boolean;
  onSync: () => void;
  isSyncing: boolean;
  handleSendTelegramReport: (type: 'master' | 'pending' | 'hold') => void;
  usersCount: number;
}

export const AdminDashboardHeader: React.FC<AdminDashboardHeaderProps> = ({
  activeTab,
  setActiveTab,
  setIsCustomAlertModalOpen,
  onOpenGlobalSearch,
  isSendingTelegramSummary,
  isSendingCustomAlert,
  onSync,
  isSyncing,
  handleSendTelegramReport,
  usersCount
}) => {
  return (
    <div className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] border border-emerald-900/60 text-white p-3.5 sm:p-4 rounded-xl space-y-3 shadow-md">
      {/* Line 1: Header Title & Main Tab Navigation + Global Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-emerald-800/60 pb-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-sm sm:text-base font-bold leading-tight">Admin Dashboard</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400">Master Operations & Supabase ERP Database</p>
          </div>
        </div>

        {/* Search Bar & Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Prominent Global Search Trigger */}
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/80 hover:border-emerald-500 text-slate-200 hover:text-white text-xs font-semibold shadow-inner transition cursor-pointer group active:scale-95"
            title="Universal Search across all POs, items, brands, departments & purchasers (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">Global Search...</span>
            <span className="inline md:hidden">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9.5px] font-mono text-emerald-300 bg-emerald-900/90 border border-emerald-700 rounded">
              Ctrl+K
            </kbd>
          </button>

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

      {/* Line 2: Quick-Action Buttons (Restrained Palette, Smooth Hover/Press Effects, Continuous Pulse for Alert) */}
      <div className="flex flex-wrap items-center justify-start gap-2 pt-1 border-t border-slate-800/80">
        {/* Custom Alert (Danger/Red Tint) */}
        <button
          type="button"
          onClick={() => setIsCustomAlertModalOpen(true)}
          disabled={isSendingTelegramSummary || isSendingCustomAlert}
          className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/30 hover:border-rose-400/50 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          title="Send custom broadcast message or urgent alert to Telegram group"
        >
          <span className="text-sm leading-none animate-pulse">📢</span>
          <span>Custom Alert</span>
        </button>

        {/* Sync Master (Operational / Neutral) */}
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 border border-slate-700/60 hover:border-slate-600 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-300 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Master'}</span>
        </button>

        {/* Reporting Group (Blue Tint) */}
        <button
          type="button"
          onClick={() => handleSendTelegramReport('master')}
          disabled={isSendingTelegramSummary}
          className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          title="Send Daily Master Summary to Telegram"
        >
          <span className="text-sm leading-none">📊</span>
          <span>Daily Summary</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendTelegramReport('pending')}
          disabled={isSendingTelegramSummary}
          className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          title="Send Urgent Pending Purchases to Telegram"
        >
          <span className="text-sm leading-none">🛒</span>
          <span>Urgent Pending</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendTelegramReport('hold')}
          disabled={isSendingTelegramSummary}
          className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          title="Send On-Hold Items Digest to Telegram"
        >
          <span className="text-sm leading-none">⏸️</span>
          <span>On-Hold Digest</span>
        </button>
      </div>
    </div>
  );
};
