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
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'purchase', label: 'Purchase', icon: <ShoppingCart size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
    { id: 'master-data', label: 'Master Data', icon: <Database size={18} /> },
    { id: 'users', label: 'Users', icon: <UsersIcon size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
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
      {/* Primary Header Bar */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* LEFT: Company Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-950/40">
            <div className="w-full h-full bg-[#0F172A] rounded-[10px] flex items-center justify-center">
              <Utensils className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                RL FOOD
              </span>
              <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                Enterprise ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Purchase & Inventory System</p>
          </div>
        </div>

        {/* CENTER: Main Enterprise Navigation */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
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

        {/* RIGHT: Sync Status, Notifications, Help, User Avatar & Dropdown */}
        <div className="flex items-center gap-3">
          
          {/* Google Sheets Sync Status Widget */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="flex flex-col">
                <span className="font-semibold text-emerald-400 leading-tight">Google Sheets Synced</span>
                <span className="text-[10px] text-slate-400">
                  Last Sync: {formatRelativeTime(syncInfo.secondsAgo)}
                </span>
              </div>
            </div>

            <button
              onClick={triggerManualSync}
              disabled={syncInfo.status === 'syncing'}
              title="Force Refresh Google Sheets Sync"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <RefreshCw size={14} className={syncInfo.status === 'syncing' ? 'animate-spin text-blue-400' : ''} />
            </button>
          </div>

          {/* Help Button */}
          <button
            onClick={() => setActiveModal('setup-guides')}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700 hidden sm:flex items-center gap-1"
            title="Setup & Operational Guide"
          >
            <HelpCircle size={18} className="text-purple-400" />
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setIsNotifPanelOpen(true)}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700"
            title="Notification Center"
          >
            <Bell size={20} />
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
              className="flex items-center gap-2.5 p-1.5 pl-2 hover:bg-slate-800/80 rounded-xl transition-all border border-slate-800/60 hover:border-slate-700"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-blue-500/40"
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 capitalize">{currentUser.role}</span>
              </div>
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
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
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
