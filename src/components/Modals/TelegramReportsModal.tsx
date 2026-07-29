import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { X, Send } from 'lucide-react';

export const TelegramReportsModal: React.FC = () => {
  const { activeModal, setActiveModal, showToast } = useERP();
  const [botToken, setBotToken] = useState('7819203912:AAH92x-RL_FOOD_BOT_KEY');
  const [chatId, setChatId] = useState('-10098210398');
  const [sending, setSending] = useState(false);

  if (activeModal !== 'telegram') return null;

  const handleSendReport = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      showToast('✈️ Automated Telegram Report dispatched successfully!');
      setActiveModal(null);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="text-sky-400" size={20} />
            <h3 className="text-base font-bold text-white">Telegram Automated Dispatch</h3>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Telegram Bot Token</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Channel / Group Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1">
            <p className="font-semibold text-sky-400">Sample Telegram Dispatch Message:</p>
            <p className="text-[11px] font-mono text-slate-400">
              📊 RL FOOD ERP Summary Briefing
              <br />• Total POs Active: 4 Orders
              <br />• Pending Locks: 1 Item Held
              <br />• Spend Commitment: $12,160.00
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSendReport}
              disabled={sending}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>{sending ? 'Sending...' : 'Dispatch Telegram Brief'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
