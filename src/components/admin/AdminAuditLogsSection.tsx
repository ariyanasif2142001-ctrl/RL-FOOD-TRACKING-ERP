import React, { useState, useMemo } from 'react';
import { AuditLog, User } from '../../types';
import { notifyAuditLogsSummaryReport } from '../../services/telegramService';
import { ShieldCheck, Search, Filter, Download, Send, RefreshCw, AlertCircle, FileText, CheckCircle2, ShoppingBag, Truck } from 'lucide-react';

interface AdminAuditLogsSectionProps {
  auditLogs: AuditLog[];
  users: User[];
  onShowToast: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const AdminAuditLogsSection: React.FC<AdminAuditLogsSectionProps> = ({
  auditLogs,
  users,
  onShowToast
}) => {
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('ALL');
  const [isExportingAuditLogs, setIsExportingAuditLogs] = useState(false);
  const [isBroadcastingLogsToTelegram, setIsBroadcastingLogsToTelegram] = useState(false);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Category filter
      if (auditCategoryFilter !== 'ALL') {
        const action = (log.action || '').toUpperCase();
        if (auditCategoryFilter === 'PURCHASE' && !action.includes('PURCHAS') && !action.includes('HOLD') && !action.includes('BUY')) return false;
        if (auditCategoryFilter === 'WAREHOUSE' && !action.includes('RECEIV') && !action.includes('STAGE') && !action.includes('STOCK')) return false;
        if (auditCategoryFilter === 'DISPATCH' && !action.includes('DISPATCH') && !action.includes('DELIVER') && !action.includes('GATE')) return false;
        if (auditCategoryFilter === 'SYSTEM' && !action.includes('SYSTEM') && !action.includes('LOGIN') && !action.includes('CONFIG')) return false;
      }

      // Search query
      if (auditLogSearch.trim()) {
        const q = auditLogSearch.toLowerCase();
        const matchesAction = (log.action || '').toLowerCase().includes(q);
        const matchesUser = (log.userName || log.userEmail || '').toLowerCase().includes(q);
        const matchesDetails = (log.details || log.poNumber || '').toLowerCase().includes(q);
        return matchesAction || matchesUser || matchesDetails;
      }

      return true;
    });
  }, [auditLogs, auditLogSearch, auditCategoryFilter]);

  const exportAuditLogsToCSV = () => {
    if (filteredLogs.length === 0) return;
    setIsExportingAuditLogs(true);

    try {
      const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Action', 'PO Number', 'Details', 'IP Address'];
      const rows = filteredLogs.map(l => [
        `"${l.id}"`,
        `"${l.timestamp || l.createdAt || ''}"`,
        `"${(l.userName || l.userEmail || 'System').replace(/"/g, '""')}"`,
        `"${l.userRole || 'system'}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${l.poNumber || '-'}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
        `"${l.ipAddress || '127.0.0.1'}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csvContent));
      link.setAttribute('download', `Audit_Logs_Security_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowToast('Export Successful', `Exported ${filteredLogs.length} audit security log records to CSV.`, 'success');
    } catch (err: any) {
      onShowToast('Export Failed', err?.message || 'Could not export audit logs', 'error');
    } finally {
      setIsExportingAuditLogs(false);
    }
  };

  const handleBroadcastLogsToTelegram = async () => {
    if (filteredLogs.length === 0) return;
    setIsBroadcastingLogsToTelegram(true);

    try {
      const recentLogs = filteredLogs.slice(0, 10);
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      let text = `🛡️ <b>SYSTEM AUDIT LOG REPORT (${todayStr})</b>\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Total Log Entries: <b>${filteredLogs.length}</b>\n\n`;
      text += `<b>Latest 10 Security Actions:</b>\n`;

      recentLogs.forEach((l, i) => {
        text += `${i + 1}. <b>${l.action}</b>\n`;
        text += `   👤 <i>${l.userName || 'System'} (${l.userRole || 'admin'})</i>\n`;
        text += `   📝 ${l.details || 'No additional details'}\n`;
        if (l.poNumber) text += `   📋 PO #${l.poNumber}\n`;
        text += `\n`;
      });

      text += `📌 <i>Generated automatically from Radiant Lightning Master Control.</i>`;

      const result = await notifyAuditLogsSummaryReport(filteredLogs, 'Admin Dashboard');
      if (result.success) {
        onShowToast('Telegram Broadcast Sent', 'Audit log security report sent successfully to Telegram group.', 'success');
      } else {
        onShowToast('Telegram Broadcast Failed', result.error || 'Please verify bot token and group ID in Telegram settings.', 'error');
      }
    } catch (err: any) {
      onShowToast('Telegram Error', err?.message || 'Failed to broadcast audit logs', 'error');
    } finally {
      setIsBroadcastingLogsToTelegram(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-2xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-700" />
              <h2 className="text-base font-extrabold text-slate-900">System Activity Audit Logs & Security History</h2>
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-black rounded-full uppercase border border-purple-200">
                Immutable Trail
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Real-time audit recording of purchases, holds, warehouse receipts, dispatches, user access, and system edits.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportAuditLogsToCSV}
              disabled={isExportingAuditLogs || filteredLogs.length === 0}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-300" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleBroadcastLogsToTelegram}
              disabled={isBroadcastingLogsToTelegram || filteredLogs.length === 0}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Send className={`w-3.5 h-3.5 ${isBroadcastingLogsToTelegram ? 'animate-pulse' : ''}`} />
              <span>{isBroadcastingLogsToTelegram ? 'Sending...' : 'Broadcast Telegram'}</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={auditLogSearch}
              onChange={e => setAuditLogSearch(e.target.value)}
              placeholder="Filter logs by Action, User, PO Number or Details..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-purple-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="shrink-0 text-[11px] text-slate-500">Category:</span>
            {['ALL', 'PURCHASE', 'WAREHOUSE', 'DISPATCH', 'SYSTEM'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setAuditCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                  auditCategoryFilter === cat ? 'bg-purple-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Log List */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[550px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">User</th>
                <th className="p-2.5">Action</th>
                <th className="p-2.5">PO #</th>
                <th className="p-2.5">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map(log => {
                const act = (log.action || '').toLowerCase();
                const isHold = act.includes('hold');
                const isPurch = act.includes('purchas');
                const isWare = act.includes('receiv') || act.includes('stage');
                const isDisp = act.includes('dispatch') || act.includes('deliver');

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 font-mono text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                      {log.timestamp || log.createdAt || 'N/A'}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{log.userName || log.userEmail || 'System'}</span>
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] font-extrabold rounded uppercase">
                          {log.userRole || 'admin'}
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        isHold ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                        isPurch ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                        isWare ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                        isDisp ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {log.poNumber ? `#${log.poNumber}` : '-'}
                    </td>
                    <td className="p-2.5 text-slate-700 font-sans leading-tight">
                      {log.details || '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                    No activity logs matched query "{auditLogSearch}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
