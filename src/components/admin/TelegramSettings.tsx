import React, { useState } from 'react';
import { getAppConfig, saveAppConfig, TelegramConfig } from '../../config/appConfig';
import { testTelegramBotConnection, detectTelegramChatId, notifyActivityLog, notifyDailySummaryReport } from '../../services/telegramService';
import { getCurrentUser } from '../../services/storage';
import { Send, Bot, CheckCircle2, AlertCircle, Sparkles, RefreshCw, Eye, EyeOff, ShieldCheck, Zap, Search, Activity } from 'lucide-react';

interface TelegramSettingsProps {
  onShowToast?: (message: string, success: boolean) => void;
}

export const TelegramSettings: React.FC<TelegramSettingsProps> = ({ onShowToast }) => {
  const currentConfig = getAppConfig();
  const initialTg = currentConfig.telegramConfig || {
    enabled: false,
    botToken: '',
    chatId: '',
    notifyEvents: {
      onNewPO: true,
      onItemHold: true,
      onPurchased: true,
      onWarehouseReceived: true,
      onDispatched: true,
      onPoImport: true,
      onActivityLog: true
    }
  };

  const [tgConfig, setTgConfig] = useState<TelegramConfig>({
    ...initialTg,
    notifyEvents: {
      onNewPO: true,
      onItemHold: true,
      onPurchased: true,
      onWarehouseReceived: true,
      onDispatched: true,
      onPoImport: true,
      onActivityLog: true,
      ...(initialTg.notifyEvents || {})
    }
  });
  const [showToken, setShowToken] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleToggleEnable = () => {
    const updated = { ...tgConfig, enabled: !tgConfig.enabled };
    setTgConfig(updated);
  };

  const handleAutoDetectChatId = async () => {
    if (!tgConfig.botToken.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter your Bot Token first before detecting Group Chat ID.'
      });
      return;
    }

    setIsDetecting(true);
    setTestResult(null);

    const res = await detectTelegramChatId(tgConfig.botToken);
    setIsDetecting(false);

    if (res.success && res.chatId) {
      setTgConfig(prev => ({ ...prev, chatId: res.chatId! }));
      setTestResult({
        success: true,
        message: `🎉 Detected Chat ID: "${res.chatTitle}" (${res.chatId})! Saved into form.`
      });
      if (onShowToast) {
        onShowToast(`Auto-detected Group ID: ${res.chatId}`, true);
      }
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Failed to detect Group Chat ID.'
      });
    }
  };

  const handleToggleEvent = (eventKey: keyof TelegramConfig['notifyEvents']) => {
    const updated = {
      ...tgConfig,
      notifyEvents: {
        ...tgConfig.notifyEvents,
        [eventKey]: !tgConfig.notifyEvents[eventKey]
      }
    };
    setTgConfig(updated);
  };

  const handleSave = () => {
    saveAppConfig({ telegramConfig: tgConfig });
    setTestResult(null);
    if (onShowToast) {
      onShowToast('Telegram Bot notification settings saved successfully!', true);
    }
  };

  const handleTestConnection = async () => {
    if (!tgConfig.botToken.trim() || !tgConfig.chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Bot Token and Chat ID before testing connection.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testTelegramBotConnection(tgConfig.botToken, tgConfig.chatId);
    setIsTesting(false);

    if (result.success) {
      setTestResult({
        success: true,
        message: '🎉 Connection Test Successful! Check your Telegram App for the test notification message.'
      });
      if (onShowToast) {
        onShowToast('Telegram test notification sent successfully!', true);
      }
    } else {
      setTestResult({
        success: false,
        message: result.error || 'Failed to send test message to Telegram API.'
      });
    }
  };

  const handleTestActivityLog = async () => {
    if (!tgConfig.botToken.trim() || !tgConfig.chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Bot Token and Chat ID before testing activity log.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const currentUser = getCurrentUser();
    const result = await notifyActivityLog(
      currentUser?.name || 'System Admin',
      currentUser?.role || 'admin',
      'Telegram Test Activity Alert',
      'Tested real-time Telegram Activity Log notification system.'
    );

    setIsTesting(false);

    if (result && result.success) {
      setTestResult({
        success: true,
        message: '⚡ Activity Log Test Alert sent successfully to Telegram! Check your channel or chat.'
      });
      if (onShowToast) {
        onShowToast('Activity Log test notification sent successfully!', true);
      }
    } else {
      setTestResult({
        success: false,
        message: result?.error || 'Failed to send Activity Log alert to Telegram API.'
      });
    }
  };

  const handleTestDailySummary = async () => {
    if (!tgConfig.botToken.trim() || !tgConfig.chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter both Bot Token and Chat ID before generating Daily Summary Report.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const currentUser = getCurrentUser();
    // Load sample or current local POs if available
    let storedPOs: any[] = [];
    try {
      const raw = localStorage.getItem('rl_food_pos');
      if (raw) storedPOs = JSON.parse(raw);
    } catch {
      // fallback
    }

    const result = await notifyDailySummaryReport(
      storedPOs,
      8,
      currentUser?.name || 'System Admin'
    );

    setIsTesting(false);

    if (result && result.success) {
      setTestResult({
        success: true,
        message: '📊 Daily Summary Digest Report sent successfully to Telegram! Check your channel/chat.'
      });
      if (onShowToast) {
        onShowToast('Daily Summary Report sent to Telegram successfully!', true);
      }
    } else {
      setTestResult({
        success: false,
        message: result?.error || 'Failed to send Daily Summary to Telegram API.'
      });
    }
  };

  const isConnected = Boolean(tgConfig.enabled && tgConfig.botToken.trim() && tgConfig.chatId.trim());

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
      
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl text-blue-300 shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-white">Telegram Bot Real-Time Alerts</h3>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black rounded-md uppercase tracking-wider">
                100% FREE
              </span>
            </div>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Send instant automated notifications for PO imports, item holds, purchases, and warehouse arrivals directly to Telegram.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
            isConnected
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isConnected ? 'Active & Ready' : 'Disabled / Unconfigured'}</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={tgConfig.enabled}
              onChange={handleToggleEnable}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div className="p-5 space-y-6">
        
        {/* Credentials Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Bot Token Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600" />
                Telegram Bot Token
              </span>
              <span className="text-[10px] text-slate-400 font-normal">From @BotFather</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tgConfig.botToken}
                onChange={(e) => setTgConfig({ ...tgConfig, botToken: e.target.value })}
                placeholder="e.g. 7123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Chat ID Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-600" />
                Chat ID / Group ID / Username
              </span>
              <span className="text-[10px] text-slate-400 font-normal">e.g. -100... or @channel</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tgConfig.chatId}
                onChange={(e) => setTgConfig({ ...tgConfig, chatId: e.target.value })}
                placeholder="e.g. -100234567890 or @my_rl_channel"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={handleAutoDetectChatId}
                disabled={isDetecting || !tgConfig.botToken}
                title="Automatically fetch Group Chat ID after adding bot to group"
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer disabled:opacity-50"
              >
                {isDetecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                <span className="hidden sm:inline">Auto-Detect ID</span>
              </button>
            </div>
          </div>
        </div>

        {/* Private Group Link Helper Banner */}
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>প্রাইভেট গ্রুপের (https://t.me/+...) জন্য Chat ID পাওয়ার ৩টি সহজ ধাপ:</span>
          </div>
          <ol className="list-decimal list-inside text-[11px] space-y-0.5 text-amber-900/90 pl-1">
            <li>আপনার টেলিগ্রাম গ্রুপে <b>@rl_food_notify_bot</b> কে সদস্য (Member) হিসেবে অ্যাড করুন।</li>
            <li>গ্রুপে যেকোনো একটা মেসেজ টাইপ করে সেন্ড করুন (যেমন: <code>test</code> বা <code>hello</code>)।</li>
            <li>উপরের <b>⚡ Auto-Detect ID</b> বাটনে ক্লিক করুন — আপনার প্রাইভেট গ্রুপের <code>-100...</code> আইডি টি অটোমেটিক বসে যাবে!</li>
          </ol>
        </div>

        {/* Action Buttons & Test Result */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !tgConfig.botToken || !tgConfig.chatId}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> : <Zap className="w-4 h-4 text-amber-500" />}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestActivityLog}
              disabled={isTesting || !tgConfig.botToken || !tgConfig.chatId}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 text-purple-900 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Send a sample Activity Log notification to Telegram to verify system activity alerts"
            >
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Test Activity Log Alert</span>
            </button>

            <button
              type="button"
              onClick={handleTestDailySummary}
              disabled={isTesting || !tgConfig.botToken || !tgConfig.chatId}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 text-emerald-900 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Send a live Daily Summary Report to Telegram group"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Send Daily Summary Digest</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            💡 Free forever using official Telegram HTTPS API
          </span>
        </div>

        {/* Live Test Alert Message */}
        {testResult && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p>{testResult.message}</p>
              {!testResult.success && testResult.message.includes('chat not found') && (
                <div className="mt-2 p-2.5 bg-rose-100/70 rounded-lg text-[11px] font-normal text-rose-950 space-y-1">
                  <p className="font-bold">⚠️ "chat not found" কীভাবে ঠিক করবেন (How to fix):</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li><b>ব্যক্তিগত মেসেজ (Personal Chat):</b> টেলিগ্রামে <b>@rl_food_notify_bot</b> সার্চ করে ওপেন করুন এবং <b>Start</b> বাটনে চাপ দিন!</li>
                    <li><b>চ্যানেল/গ্রুপ (Channel/Group):</b> আপনার চ্যানেলে বটটিকে <b>Administrator</b> হিসেবে অ্যাড করুন।</li>
                    <li><b>চ্যানেল ইউজারনেম:</b> ইউজারনেমের সামনে অবশ্যই <b>@</b> দিন (যেমন: <code>@rl_food_channel</code>)।</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Notification Toggles */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <span>Select ERP Events for Automated Alerts</span>
              </h4>
              <p className="text-[11px] text-slate-500">Toggle which activities trigger instant notifications to Telegram</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            
            {/* New PO */}
            <div
              onClick={() => handleToggleEvent('onNewPO')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onNewPO
                  ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">📋 New PO Imported</span>
                <span className="text-[10px] text-slate-500 block">Triggers on Excel import</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onNewPO)}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Item Hold */}
            <div
              onClick={() => handleToggleEvent('onItemHold')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onItemHold
                  ? 'bg-purple-50/60 border-purple-200 text-purple-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">🔒 Item Placed on Hold</span>
                <span className="text-[10px] text-slate-500 block">Triggers on 5-hour hold</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onItemHold)}
                onChange={() => {}}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {/* Item Purchased */}
            <div
              onClick={() => handleToggleEvent('onPurchased')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onPurchased
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">🛒 Item Purchased</span>
                <span className="text-[10px] text-slate-500 block">Includes price & qty</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onPurchased)}
                onChange={() => {}}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Warehouse Received */}
            <div
              onClick={() => handleToggleEvent('onWarehouseReceived')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onWarehouseReceived
                  ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">📦 Goods Received</span>
                <span className="text-[10px] text-slate-500 block">Warehouse verified</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onWarehouseReceived)}
                onChange={() => {}}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Dispatched */}
            <div
              onClick={() => handleToggleEvent('onDispatched')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onDispatched
                  ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">🚚 Goods Dispatched</span>
                <span className="text-[10px] text-slate-500 block">Dispatch completion</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onDispatched)}
                onChange={() => {}}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {/* Bulk PO Import */}
            <div
              onClick={() => handleToggleEvent('onPoImport')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onPoImport
                  ? 'bg-cyan-50/60 border-cyan-200 text-cyan-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">📊 Bulk PO Import</span>
                <span className="text-[10px] text-slate-500 block">Summary of bulk Excel imports</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onPoImport)}
                onChange={() => {}}
                className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
              />
            </div>

            {/* System Activity & Audit Log */}
            <div
              onClick={() => handleToggleEvent('onActivityLog')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onActivityLog
                  ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">⚡ System Activity Log</span>
                <span className="text-[10px] text-slate-500 block">User logins & key audit actions</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onActivityLog)}
                onChange={() => {}}
                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
              />
            </div>

            {/* Daily Summary Digest */}
            <div
              onClick={() => handleToggleEvent('onDailySummary')}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                tgConfig.notifyEvents?.onDailySummary
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">📈 Daily Summary Report</span>
                <span className="text-[10px] text-slate-500 block">End-of-day PO & fulfillment stats</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.notifyEvents?.onDailySummary)}
                onChange={() => {}}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* Interactive 2-Way Commands & Auto Schedule Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          
          {/* Interactive 2-Way Bot Card */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Telegram Interactive 2-Way Bot</h4>
                  <p className="text-[10px] text-slate-500">Replies automatically to commands like /po PO-102 or /pending in group</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(tgConfig.interactiveBot?.enabled !== false)}
                  onChange={() => {
                    const currentInteractive = tgConfig.interactiveBot || { enabled: true, lastOffset: 0 };
                    setTgConfig({
                      ...tgConfig,
                      interactiveBot: { ...currentInteractive, enabled: !currentInteractive.enabled }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Available Interactive Commands:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-800">
                  {tgConfig.interactiveBot?.enabled !== false ? '🟢 Active & Listening' : '🔴 Off'}
                </span>
              </div>
              <ul className="text-[11px] font-mono space-y-1 text-slate-700">
                <li className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span>📌 <b>/po PO-102</b></span>
                  <span className="text-[10px] font-sans text-slate-500">Get specific PO details</span>
                </li>
                <li className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span>⏳ <b>/pending</b></span>
                  <span className="text-[10px] font-sans text-slate-500">Get pending items list</span>
                </li>
                <li className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span>⏸️ <b>/hold</b></span>
                  <span className="text-[10px] font-sans text-slate-500">View items on hold</span>
                </li>
                <li className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span>📊 <b>/summary</b> or <b>/stats</b></span>
                  <span className="text-[10px] font-sans text-slate-500">Overall ERP status report</span>
                </li>
                <li className="flex items-center justify-between bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span>🔍 <b>/search &lt;name&gt;</b></span>
                  <span className="text-[10px] font-sans text-slate-500">Search items across POs</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Auto Scheduled Digest Card */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Auto Scheduled Telegram Digest</h4>
                  <p className="text-[10px] text-slate-500">Sends daily ERP summary automatically at set schedule times</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(tgConfig.autoSchedule?.enabled !== false)}
                  onChange={() => {
                    const currentSched = tgConfig.autoSchedule || { enabled: true, time1: '09:00', time2: '20:00', reportType: 'all' };
                    setTgConfig({
                      ...tgConfig,
                      autoSchedule: { ...currentSched, enabled: !currentSched.enabled }
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Morning Schedule (Time 1):</label>
                  <input
                    type="time"
                    value={tgConfig.autoSchedule?.time1 || '09:00'}
                    onChange={(e) => {
                      const currentSched = tgConfig.autoSchedule || { enabled: true, time1: '09:00', time2: '20:00', reportType: 'all' };
                      setTgConfig({
                        ...tgConfig,
                        autoSchedule: { ...currentSched, time1: e.target.value }
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Evening Schedule (Time 2):</label>
                  <input
                    type="time"
                    value={tgConfig.autoSchedule?.time2 || '20:00'}
                    onChange={(e) => {
                      const currentSched = tgConfig.autoSchedule || { enabled: true, time1: '09:00', time2: '20:00', reportType: 'all' };
                      setTgConfig({
                        ...tgConfig,
                        autoSchedule: { ...currentSched, time2: e.target.value }
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 block mb-1">Scheduled Digest Type:</label>
                <select
                  value={tgConfig.autoSchedule?.reportType || 'all'}
                  onChange={(e) => {
                    const currentSched = tgConfig.autoSchedule || { enabled: true, time1: '09:00', time2: '20:00', reportType: 'all' };
                    setTgConfig({
                      ...tgConfig,
                      autoSchedule: { ...currentSched, reportType: e.target.value as any }
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                >
                  <option value="all">Daily Summary + Pending Items + Hold Items</option>
                  <option value="summary">Daily Summary Stats Only</option>
                  <option value="pending">Pending Purchases Only</option>
                  <option value="hold">Hold Items Only</option>
                </select>
              </div>

              <div className="p-2 bg-emerald-100/60 rounded-lg text-[11px] font-medium text-emerald-950 flex items-center justify-between">
                <span>⏰ Auto-schedule runs in real time when system is active</span>
                <span className="font-bold text-[10px] bg-emerald-200 px-2 py-0.5 rounded">
                  {tgConfig.autoSchedule?.time1 || '09:00'} & {tgConfig.autoSchedule?.time2 || '20:00'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Advanced Notification Experience Settings */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2 text-slate-900">
            <Zap className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider">Advanced Notification Features</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. All-in-One Group Mode */}
            <div
              onClick={() => setTgConfig({ ...tgConfig, allInOneGroupMode: !tgConfig.allInOneGroupMode })}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-2 ${
                tgConfig.allInOneGroupMode
                  ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold block flex items-center gap-1">
                  📢 1. All-In-One Group Hub
                </span>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Routes all department alerts (PO, Hold, Purchase, Warehouse, Dispatch) cleanly into 1 master Telegram group with clear visual badges.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.allInOneGroupMode !== false)}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mt-0.5"
              />
            </div>

            {/* 2. Silent Notifications Toggle */}
            <div
              onClick={() => setTgConfig({ ...tgConfig, silentMode: !tgConfig.silentMode })}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-2 ${
                tgConfig.silentMode
                  ? 'bg-purple-50/60 border-purple-200 text-purple-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold block flex items-center gap-1">
                  🔕 2. Silent Notification Mode
                </span>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Delivers messages silently without sound popup so team members are not disturbed during off-hours.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(tgConfig.silentMode)}
                onChange={() => {}}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer mt-0.5"
              />
            </div>

            {/* 5. Direct Web App Link Button */}
            <div
              className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2 ${
                tgConfig.includeWebAppLink !== false
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div
                onClick={() => setTgConfig({ ...tgConfig, includeWebAppLink: !tgConfig.includeWebAppLink })}
                className="flex items-start justify-between cursor-pointer"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold block flex items-center gap-1">
                    🌐 5. Open Web App Direct Button
                  </span>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Attaches interactive "Open RL Food PO Tracker" button to Telegram messages.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(tgConfig.includeWebAppLink !== false)}
                  onChange={() => {}}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer mt-0.5"
                />
              </div>

              {tgConfig.includeWebAppLink !== false && (
                <div className="pt-1.5 border-t border-emerald-200/60">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Telegram Button Target URL:</label>
                  <input
                    type="url"
                    value={tgConfig.webAppDisplayUrl || 'https://rlfood-tracking-erp.netlify.app/'}
                    onChange={(e) => setTgConfig({ ...tgConfig, webAppDisplayUrl: e.target.value })}
                    placeholder="https://rlfood-tracking-erp.netlify.app/"
                    className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step-by-Step Setup Guide */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider">How to Setup Free Telegram Bot in 2 Minutes (বাংলা নির্দেশিকা)</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs text-slate-600">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-blue-700 block">1️⃣ Create Bot (@BotFather)</span>
              <p className="text-[11px] leading-relaxed">
                Open Telegram and search <b>@BotFather</b>. Send command <code>/newbot</code>, give it a name and username. Copy the <b>HTTP API Bot Token</b>.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-blue-700 block">2️⃣ Get Chat / Channel ID</span>
              <p className="text-[11px] leading-relaxed">
                Add your Bot to a Telegram Group or Channel as Admin. For channels use <code>@channel_name</code> or use <b>@userinfobot</b> to find your personal Chat ID.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-blue-700 block">3️⃣ Paste & Test Connection</span>
              <p className="text-[11px] leading-relaxed">
                Paste the Token & Chat ID above, click <b>Test Telegram Connection</b>, and hit <b>Save Settings</b>. Done!
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-emerald-700 block">4️⃣ Live Telegram Reports</span>
              <p className="text-[11px] leading-relaxed">
                Click <b>Telegram Digest</b> button on Admin Dashboard header or test buttons above to post instant report summaries directly to Telegram.
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-purple-700 block">5️⃣ 1-Tap & Voice Commands</span>
              <p className="text-[11px] leading-relaxed">
                Click 1-tap inline buttons (<code>[✅ Buy]</code>, <code>[⏸️ Hold]</code>) in messages or send voice notes in English/Bangla to update POs without opening web app!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
