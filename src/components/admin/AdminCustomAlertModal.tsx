import React from 'react';
import { X, RefreshCw, Send } from 'lucide-react';

interface AdminCustomAlertModalProps {
  isCustomAlertModalOpen: boolean;
  setIsCustomAlertModalOpen: (open: boolean) => void;
  customAlertText: string;
  setCustomAlertText: (text: string) => void;
  customAlertPriority: 'NORMAL' | 'URGENT' | 'CRITICAL';
  setCustomAlertPriority: (priority: 'NORMAL' | 'URGENT' | 'CRITICAL') => void;
  isSendingCustomAlert: boolean;
  handleSendCustomAlert: () => void;
}

export const AdminCustomAlertModal: React.FC<AdminCustomAlertModalProps> = ({
  isCustomAlertModalOpen,
  setIsCustomAlertModalOpen,
  customAlertText,
  setCustomAlertText,
  customAlertPriority,
  setCustomAlertPriority,
  isSendingCustomAlert,
  handleSendCustomAlert
}) => {
  if (!isCustomAlertModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📢</span>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white leading-tight">
                Custom Telegram Alert Broadcast
              </h3>
              <p className="text-xs text-slate-400">
                Broadcast custom or urgent messages to your Telegram group in one click
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomAlertModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Template Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">Quick Templates:</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              '🚨 Urgent Meeting: All purchasers please join the online sync at 2 PM.',
              '📦 Warehouse Update: All in-transit goods must be received by 5 PM today.',
              '⚠️ Pending Notice: Please resolve on-hold items in your active POs urgently.',
              '✅ Delivery Confirmation: Today\'s purchases across all categories have been completed.'
            ].map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCustomAlertText(tmpl)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 rounded-md transition text-left cursor-pointer"
              >
                + {tmpl.slice(0, 32)}...
              </button>
            ))}
          </div>
        </div>

        {/* Priority Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">Priority Level:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCustomAlertPriority('NORMAL')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                customAlertPriority === 'NORMAL'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              📢 Normal
            </button>
            <button
              type="button"
              onClick={() => setCustomAlertPriority('URGENT')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                customAlertPriority === 'URGENT'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              ⚠️ Urgent
            </button>
            <button
              type="button"
              onClick={() => setCustomAlertPriority('CRITICAL')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                customAlertPriority === 'CRITICAL'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              🚨 Critical
            </button>
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">Message Content:</label>
          <textarea
            rows={4}
            value={customAlertText}
            onChange={(e) => setCustomAlertText(e.target.value)}
            placeholder="Type your custom Telegram message or alert here..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setIsCustomAlertModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendCustomAlert}
            disabled={isSendingCustomAlert || !customAlertText.trim()}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition active:scale-95 shadow-md cursor-pointer"
          >
            {isSendingCustomAlert ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-white" />
                <span>Send Alert</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
