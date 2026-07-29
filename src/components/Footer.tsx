import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800 text-slate-400 py-6 px-4 lg:px-6 text-xs mt-12">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-500" />
          <span className="font-semibold text-slate-200">RL FOOD Enterprise ERP v2.4</span>
          <span>•</span>
          <span>Google Sheets Cloud Synced</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>Protected Concurrency Hold Locks</span>
          <span>•</span>
          <span>Offline PWA Ready</span>
          <span>•</span>
          <span>Telegram Dispatch Engine</span>
        </div>

        <div className="text-slate-500">
          © {new Date().getFullYear()} RL Food Operations. All rights reserved.
        </div>

      </div>
    </footer>
  );
};
