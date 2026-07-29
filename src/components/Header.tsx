import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../context/ERPContext';
import type { ViewType } from '../context/ERPContext';
import { ProfileMenu } from './ProfileMenu';
import {
  Utensils,
  RefreshCw,
  Bell,
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Database,
  Users as UsersIcon,
  Settings as SettingsIcon,
  HelpCircle,
  Menu,
  X,
  Wrench,
  Layers,
  FileSpreadsheet,
  Activity,
  Send,
  PlusCircle
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    currentView,
    setCurrentView,
    syncInfo,
    triggerManualSync,
    unreadNotificationCount,
    setIsNotifPanelOpen,
    setActiveModal
  } = useERP();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'purchase', label: 'Purchase', icon: <ShoppingCart size={16} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={16} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={16} /> },
    { id: 'master-data', label: 'Master Data', icon: <Database size={16} /> },
    { id: 'users', label: 'Users', icon: <UsersIcon size={16} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={16} /> },
  ];

  const formatRelativeTime = (seconds: number) => {
    if (seconds <= 3) return '3 seconds ago';
    if (seconds < 60) return `${seconds} seconds ago`;
    const mins = Math.floor(seconds / 60);
    if (mins === 1) return '1 minute ago';
    return `${mins} minutes ago`;
  };

  return (
    <header className="bg-[#0F172A] border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      {/* Option 1: Clean Minimal Primary Header Bar */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* LEFT: Company Emblem Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-950/40">
            <div className="w-full h-full bg-[#0F172A] rounded-[10px] flex items-center justify-center">
              <Utensils className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                RL FOOD ERP
              </span>
              <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase hidden sm:inline-block">
                Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: Main Clean Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Live Sync Badge, More Tools Dropdown, Notifications, Profile Avatar */}
        <div className="flex items-center gap-3">
          
          {/* + New PO Quick Button */}
          <button
            onClick={() => setActiveModal('new-po')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-600/30 transition-all"
          >
            <PlusCircle size={15} />
            <span className="hidden sm:inline">+ New PO</span>
          </button>

          {/* Google Sheets Sync Status Widget */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col">
                <span className="font-semibold text-emerald-400 text-[11px] leading-tight">Google Sheets Synced</span>
                <span className="text-[10px] text-slate-400">
                  {formatRelativeTime(syncInfo.secondsAgo)}
                </span>
              </div>
            </div>

            <button
              onClick={triggerManualSync}
              disabled={syncInfo.status === 'syncing'}
              title="Force Refresh Google Sheets Sync"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <RefreshCw size={13} className={syncInfo.status === 'syncing' ? 'animate-spin text-blue-400' : ''} />
            </button>
          </div>

          {/* More Tools ▼ Dropdown */}
          <div className="relative hidden sm:block" ref={toolsRef}>
            <button
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all"
            >
              <Wrench size={14} className="text-amber-400" />
              <span>More Tools</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200 p-1 space-y-1 text-xs">
                <button
                  onClick={() => {
                    setActiveModal('master-sku');
                    setIsToolsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white"
                >
                  <Layers size={16} className="text-indigo-400" />
                  <span>Master SKU Mapping</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModal('telegram');
                    setIsToolsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white"
                >
                  <Send size={16} className="text-sky-400" />
                  <span>Telegram Dispatch</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModal('audit-logs');
                    setIsToolsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white"
                >
                  <FileSpreadsheet size={16} className="text-emerald-400" />
                  <span>Audit Activity Trail</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModal('system-test');
                    setIsToolsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white"
                >
                  <Activity size={16} className="text-amber-400" />
                  <span>System Integration Test</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModal('setup-guides');
                    setIsToolsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium hover:bg-slate-800 hover:text-white border-t border-slate-800/80 pt-2"
                >
                  <HelpCircle size={16} className="text-purple-400" />
                  <span>Operational Setup Guide</span>
                </button>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => setIsNotifPanelOpen(true)}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700"
            title="Notification Center"
          >
            <Bell size={18} />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* User Profile & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 hover:bg-slate-800/80 rounded-xl transition-all border border-slate-800/60 hover:border-slate-700"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-lg object-cover ring-2 ring-blue-500/40"
              />
              <span className="hidden sm:inline text-xs font-semibold text-white leading-tight">{currentUser.name}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 z-50">
                <ProfileMenu onClose={() => setIsProfileOpen(false)} />
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="xl:hidden bg-slate-900 border-t border-slate-800 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  currentView === item.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg text-xs border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Google Sheets Synced</span>
            </div>
            <button
              onClick={triggerManualSync}
              className="text-blue-400 font-medium text-xs flex items-center gap-1"
            >
              <RefreshCw size={12} /> Sync Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
