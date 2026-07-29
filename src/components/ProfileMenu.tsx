import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Smartphone,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Globe,
  LogOut,
  UserCheck
} from 'lucide-react';
import type { UserRole } from '../types';

export const ProfileMenu: React.FC<{ onClose: () => void; onLogout?: () => void }> = ({ onClose, onLogout }) => {
  const {
    currentUser,
    setCurrentUserRole,
    theme,
    toggleTheme,
    handleInstallApp,
    setCurrentView,
    showToast
  } = useERP();

  const [language, setLanguage] = useState('English (US)');

  const roleLabels: Record<UserRole, { title: string; color: string }> = {
    admin: { title: 'Administrator', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    purchaser: { title: 'Purchaser', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    receiver: { title: 'Receiver', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    manager: { title: 'Ops Manager', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  };

  const handleLogoutClick = () => {
    onClose();
    if (onLogout) {
      onLogout();
    } else {
      showToast('Session logged out successfully.');
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-700 dark:text-slate-200 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
      
      {/* Header Profile Details */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-11 h-11 rounded-xl object-cover ring-2 ring-blue-500/50"
          />
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
              {currentUser.name}
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{currentUser.email}</p>
            <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${roleLabels[currentUser.role].color}`}>
              {roleLabels[currentUser.role].title}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Role Switcher */}
      <div className="p-2 space-y-1">
        <p className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1 tracking-wider">
          Switch Active Role Profile
        </p>
        {(['admin', 'purchaser', 'receiver', 'manager'] as UserRole[]).map((r) => (
          <button
            key={r}
            onClick={() => {
              setCurrentUserRole(r);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              currentUser.role === r
                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <span className="capitalize">{r} Profile</span>
            {currentUser.role === r && <UserCheck size={14} className="text-blue-500" />}
          </button>
        ))}
      </div>

      {/* Action Options: PWA, Settings, Theme, Language */}
      <div className="p-2 space-y-1">
        {/* Install App */}
        <button
          onClick={() => {
            handleInstallApp();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Smartphone size={16} className="text-emerald-500" />
          <div className="flex flex-col text-left">
            <span className="font-semibold text-slate-900 dark:text-white">Install App (PWA)</span>
            <span className="text-[10px] text-slate-400">Offline & Field Access</span>
          </div>
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            setCurrentView('settings');
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <SettingsIcon size={16} className="text-slate-400" />
          <span>System Preferences</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />}
            <span className="font-semibold text-slate-900 dark:text-white">Appearance Mode</span>
          </div>
          <span className="text-[11px] font-bold capitalize text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
            {theme}
          </span>
        </button>

        {/* Language Selector */}
        <div className="flex items-center justify-between px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            <Globe size={16} className="text-sky-500" />
            <span className="font-semibold text-slate-900 dark:text-white">Language</span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="English (US)">English (US)</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="Arabic">Arabic</option>
          </select>
        </div>
      </div>

      {/* Footer / Sign Out */}
      <div className="p-2 bg-slate-50 dark:bg-slate-950">
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut size={14} />
          <span>Logout Session</span>
        </button>
      </div>

    </div>
  );
};
