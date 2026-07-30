import React, { useState, useRef, useEffect } from 'react';
import { User, SheetsConfig } from '../types';
import { RefreshCw, UserCheck, Shield, ShoppingBag, Warehouse, Truck, LogOut, Crown, Camera, Upload, X, Check, Smartphone, Download, Share, PlusSquare, ExternalLink, Search, Command, ChevronDown, User as UserIcon, Mail, Sparkles, Key, Users, Database, Send, CheckCircle2, BookOpen, FileSpreadsheet, Settings } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

interface HeaderProps {
  currentUser: User;
  onOpenLogin: () => void;
  onSync: () => void;
  isSyncing: boolean;
  sheetsConfig: SheetsConfig;
  onUpdateUserAvatar?: (userId: string, avatarUrl: string) => void;
  onOpenCommandPalette?: () => void;
  onSelectAdminTab?: (tab: 'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs') => void;
  onOpenMasterSkuModal?: () => void;
  usersCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLogin,
  onSync,
  isSyncing,
  sheetsConfig,
  onUpdateUserAvatar,
  onOpenCommandPalette,
  onSelectAdminTab,
  onOpenMasterSkuModal,
  usersCount = 0
}) => {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState(currentUser.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrlInput(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUserAvatar) {
      onUpdateUserAvatar(currentUser.id, avatarUrlInput);
    }
    setIsAvatarModalOpen(false);
  };

  const getRoleBadge = (user: User) => {
    const isSuper = user.isSuperAdmin || user.name === 'RL TAKMIL' || user.name === 'RL MUSTAQ' || user.id === 'u-takmil' || user.id === 'u-mustaq' || (user.role as any) === 'superadmin';
    if (isSuper) {
      return {
        label: 'Super Admin',
        bg: 'bg-gradient-to-r from-amber-600 to-purple-800 text-amber-100 border-amber-500/80 shadow-xs',
        icon: Crown
      };
    }
    switch (user.role) {
      case 'admin':
        return {
          label: 'Admin',
          bg: 'bg-purple-900 text-purple-100 border-purple-700',
          icon: Shield
        };
      case 'purchaser':
        return {
          label: 'Purchaser',
          bg: 'bg-blue-900 text-blue-100 border-blue-700',
          icon: ShoppingBag
        };
      case 'warehouse':
        return {
          label: 'Warehouse',
          bg: 'bg-amber-900 text-amber-100 border-amber-700',
          icon: Warehouse
        };
      case 'dispatch':
        return {
          label: 'Dispatch',
          bg: 'bg-emerald-900 text-emerald-100 border-emerald-700',
          icon: Truck
        };
      default:
        return {
          label: user.role,
          bg: 'bg-slate-800 text-slate-200 border-slate-700',
          icon: UserCheck
        };
    }
  };

  const badge = getRoleBadge(currentUser);
  const BadgeIcon = badge.icon;

  return (
    <header className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] text-white border-b border-emerald-900/80 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-12 flex items-center justify-between gap-1.5">
        
        {/* Company Logo & Brand Name */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
          <CompanyLogo size="sm" showText={true} lightText={true} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Live Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            id="btn-sheets-sync"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] sm:text-xs font-bold transition hover:bg-emerald-900 active:scale-95 disabled:opacity-50"
            title="Synchronize with Google Sheets Database"
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="hidden md:inline">
              {sheetsConfig.webAppUrl ? 'Google Sheets Synced' : 'Local Master Engine'}
            </span>
            <span className="inline md:hidden text-[10px]">Sync</span>
            <RefreshCw className={`w-3 h-3 shrink-0 ${isSyncing ? 'animate-spin text-emerald-300' : 'text-emerald-400'}`} />
          </button>

          {/* Current User Profile & Role Dropdown Menu */}
          <div className="relative border-l border-slate-800 pl-1 sm:pl-2" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              id="btn-role-switcher"
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border text-[10px] sm:text-xs font-bold transition active:scale-95 cursor-pointer ${badge.bg}`}
              title="Click for Profile Menu & Options"
            >
              {currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-5 h-5 rounded-full object-cover border border-white/30 shrink-0" 
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <UserIcon className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-[10px] sm:text-xs font-bold truncate max-w-[70px] sm:max-w-none">{currentUser.name}</span>
              <span className="hidden sm:inline text-[9px] uppercase tracking-wider opacity-75 font-semibold">({badge.label})</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 opacity-80 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100 divide-y divide-slate-800">
                {/* User Card Header */}
                <div className="p-3.5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 flex items-center gap-3">
                  <div className="relative group cursor-pointer" onClick={() => { setIsProfileMenuOpen(false); setAvatarUrlInput(currentUser.avatar || ''); setIsAvatarModalOpen(true); }}>
                    {currentUser.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name} 
                        className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-md" 
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-300">
                        <UserIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 rounded-full text-white shadow-xs">
                      <Camera className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-sm text-white truncate">{currentUser.name}</h4>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Online" />
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email || `${currentUser.username || 'user'}@rlfood.com`}</p>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border bg-slate-800 border-slate-700 text-slate-200">
                      <BadgeIcon className="w-3 h-3 text-emerald-400" />
                      <span>{badge.label}</span>
                    </div>
                  </div>
                </div>

                {/* Profile Actions List */}
                <div className="p-1.5 space-y-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setAvatarUrlInput(currentUser.avatar || '');
                      setIsAvatarModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-800/60 shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Change Profile Photo</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Upload or update your avatar image</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onOpenCommandPalette) onOpenCommandPalette();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-white transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shrink-0">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="block font-bold text-xs">Quick Command Search</span>
                        <span className="block text-[10px] text-slate-400 font-normal">Search PO, SKU & Challan</span>
                      </div>
                    </div>
                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9.5px] font-mono text-emerald-400 font-extrabold">Ctrl+K</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onSync();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/60 shrink-0">
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Sync Master Database</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Refresh Google Sheets Data</span>
                    </div>
                  </button>
                </div>

                {/* Admin Management Tools Section */}
                <div className="p-1.5 space-y-0.5 text-xs font-semibold bg-slate-900/90 border-t border-slate-800">
                  <div className="px-3 py-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-400">
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      Admin Tools & Settings
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onSelectAdminTab) onSelectAdminTab('users');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/80 shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">User Accounts & Roles</span>
                        {usersCount > 0 && <span className="px-1.5 py-0.2 bg-blue-900/60 text-blue-300 rounded text-[9.5px] font-extrabold">{usersCount}</span>}
                      </div>
                      <span className="block text-[10px] text-slate-400 font-normal">Manage permissions & staff roles</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onOpenMasterSkuModal) onOpenMasterSkuModal();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/80 shrink-0">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Master SKU Mapping</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Excel / Dropbox SKU rules</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onSelectAdminTab) onSelectAdminTab('sheets');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1 rounded-lg bg-teal-950 text-teal-400 border border-teal-800/80 shrink-0">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Google Sheets Config</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Sync URLs & Apps Script setup</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onSelectAdminTab) onSelectAdminTab('telegram');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1 rounded-lg bg-sky-950 text-sky-400 border border-sky-800/80 shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Telegram Bot & Alerts</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Chat ID, Bot Token & Auto Digests</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onSelectAdminTab) onSelectAdminTab('tests');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">System Diagnostics & Tests</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Run unit tests & health checks</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onSelectAdminTab) onSelectAdminTab('docs');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1 rounded-lg bg-purple-950 text-purple-400 border border-purple-800/80 shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Setup & Operation Guides</span>
                      <span className="block text-[10px] text-slate-400 font-normal">User manuals & instructions</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onSelectAdminTab) onSelectAdminTab('logs');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1 rounded-lg bg-amber-950 text-amber-400 border border-amber-800/80 shrink-0">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Audit Logs & Security</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Track all staff actions & changes</span>
                    </div>
                  </button>
                </div>

                {/* Account Switcher & Logout Footer */}
                <div className="p-1.5 space-y-0.5 bg-slate-950/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Switch Staff Account</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Login as Admin, Purchaser, Warehouse, or Dispatch</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-950/60 text-rose-300 hover:text-rose-100 transition flex items-center gap-2.5"
                  >
                    <div className="p-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800 shrink-0">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block font-bold text-xs">Log Out / Sign Out</span>
                      <span className="block text-[10px] text-rose-400/80 font-normal">End session and return to Sign In screen</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* PROFILE PHOTO UPDATE MODAL */}
      {isAvatarModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-slate-900"
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Profile Photo</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{currentUser.name} ({badge.label})</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAvatar} className="space-y-4">
              {/* Avatar Preview */}
              <div className="flex flex-col items-center justify-center gap-2 py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {avatarUrlInput ? (
                  <img 
                    src={avatarUrlInput} 
                    alt="Preview" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 shadow-sm" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xl font-bold">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-[10px] text-slate-400 font-medium">Photo Preview</span>
              </div>

              {/* Upload File Option */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Upload Image from Device / Phone
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Choose Photo File</span>
                </button>
              </div>

              {/* Image URL Input Option */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Or Paste Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={avatarUrlInput.startsWith('data:') ? '' : avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {avatarUrlInput && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrlInput('')}
                    className="py-2 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
                <div className="flex-1 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAvatarModalOpen(false)}
                    className="py-2 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Photo</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
