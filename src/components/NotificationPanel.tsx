import React from 'react';
import { useERP } from '../context/ERPContext';
import { X, Bell, CheckCircle2, AlertTriangle, Send, RefreshCw } from 'lucide-react';

export const NotificationPanel: React.FC = () => {
  const { isNotifPanelOpen, setIsNotifPanelOpen, notifications, markNotificationsRead } = useERP();

  if (!isNotifPanelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        
        {/* Panel Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="text-blue-600 dark:text-blue-400" size={20} />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Enterprise Notification Center</h3>
          </div>
          <button
            onClick={() => setIsNotifPanelOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {notifications.filter((n) => !n.read).length} Unread Updates
          </span>
          <button
            onClick={markNotificationsRead}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            Mark all as read
          </button>
        </div>

        {/* Notifications Event Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-4 space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border transition-colors space-y-1 ${
                n.read
                  ? 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-800/60'
                  : 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  {n.source === 'telegram' ? (
                    <Send size={14} className="text-sky-500" />
                  ) : n.source === 'sheets' ? (
                    <RefreshCw size={14} className="text-emerald-500" />
                  ) : n.type === 'warning' ? (
                    <AlertTriangle size={14} className="text-amber-500" />
                  ) : (
                    <CheckCircle2 size={14} className="text-blue-500" />
                  )}
                  <span>{n.title}</span>
                </div>
                <span className="text-[10px] text-slate-400">{n.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{n.message}</p>
            </div>
          ))}
        </div>

        {/* Panel Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center">
          <button
            onClick={() => setIsNotifPanelOpen(false)}
            className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            Close Notification Panel
          </button>
        </div>

      </div>
    </div>
  );
};
