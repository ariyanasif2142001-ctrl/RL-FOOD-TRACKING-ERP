import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Utensils,
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import type { UserRole } from '../types';

export const LoginPortal: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const { setCurrentUserRole, currentUser } = useERP();
  const [email, setEmail] = useState(currentUser.email);
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentUserRole(role);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUserRole(selectedRole);
    onLoginSuccess();
  };

  const foodCategories = [
    { name: 'Fresh Vegetables', icon: '🥦', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    { name: 'Bakery Items', icon: '🥐', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    { name: 'Fish & Seafood', icon: '🐟', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30' },
    { name: 'Meat & Poultry', icon: '🥩', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-950 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-slate-200 dark:border-slate-800">
        
        {/* LEFT COLUMN: Clean Login Form & Role Selectors */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Company Branding Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-950/30">
                <div className="w-full h-full bg-[#0F172A] rounded-[14px] flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight leading-tight">
                  RL FOOD Operations ERP
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Food Procurement, Logistics & Inventory Control System
                </p>
              </div>
            </div>

            {/* Colorful Food Categories Badges */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Tracked Food Categories
              </span>
              <div className="flex flex-wrap gap-2">
                {foodCategories.map((cat, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${cat.color}`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Form Title */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Enterprise Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select your active operational profile to access requisitions and inventory logs.
              </p>
            </div>

            {/* Quick Multi-Role Profile Selector Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Quick Select Active Access Role
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'admin', label: '👑 Administrator', desc: 'Full System Control' },
                  { role: 'purchaser', label: '🛒 Purchaser', desc: 'Market Buyers & Locks' },
                  { role: 'receiver', label: '📦 Warehouse Receiver', desc: 'Stock Intake & Verification' },
                  { role: 'manager', label: '📊 Operations Manager', desc: 'Analytics & Telegram' },
                ].map((r) => {
                  const isSelected = selectedRole === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => handleRoleSelect(r.role as UserRole)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/50'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{r.label}</span>
                        {isSelected && <UserCheck size={14} className="text-blue-500" />}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{r.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credentials Input */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
                  <span>Remember session</span>
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 text-sm transition-all"
              >
                <span>Enter ERP Portal ({selectedRole.toUpperCase()})</span>
                <ArrowRight size={18} />
              </button>
            </form>

          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} RL Food Operations</span>
            <div className="flex items-center gap-1 text-emerald-500 font-semibold">
              <ShieldCheck size={14} /> 256-bit SSL Protected
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Food Logistics Hero Banner */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-800">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Google Sheets Backend Operational</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white leading-tight">
                Fresh Produce, Meat, Fish & Bakery Procurement Engine
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Streamlined field market buyer locks, real-time supplier commitment tracking, and automated Telegram reporting.
              </p>
            </div>

            {/* Visual Category Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <span className="text-xl">🥦</span>
                <h4 className="font-bold text-xs text-white">Fresh Vegetables</h4>
                <p className="text-[10px] text-slate-400">Daily Cold Chain Intake</p>
              </div>

              <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <span className="text-xl">🥐</span>
                <h4 className="font-bold text-xs text-white">Bakery & Grains</h4>
                <p className="text-[10px] text-slate-400">Flour, Yeast & Pastry</p>
              </div>

              <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <span className="text-xl">🐟</span>
                <h4 className="font-bold text-xs text-white">Fish & Seafood</h4>
                <p className="text-[10px] text-slate-400">Fresh Salmon & Cod</p>
              </div>

              <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-1">
                <span className="text-xl">🥩</span>
                <h4 className="font-bold text-xs text-white">Meat & Poultry</h4>
                <p className="text-[10px] text-slate-400">Premium Beef & Chicken</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <RefreshCw size={14} className="text-emerald-400 animate-spin" />
              <span>Live Cloud Synced</span>
            </div>
            <span className="text-[10px] text-slate-400">v2.4 Enterprise Release</span>
          </div>

        </div>

      </div>
    </div>
  );
};
