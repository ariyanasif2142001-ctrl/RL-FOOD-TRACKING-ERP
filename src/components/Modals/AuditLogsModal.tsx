import React from 'react';
import { useERP } from '../../context/ERPContext';
import { X, FileSpreadsheet, Download } from 'lucide-react';

export const AuditLogsModal: React.FC = () => {
  const { activeModal, setActiveModal, auditLogs, showToast } = useERP();

  if (activeModal !== 'audit-logs') return null;

  const handleExportLogs = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Timestamp,Action,User,Role,Details', ...auditLogs.map((l) => `"${l.timestamp}","${l.action}","${l.user}","${l.role}","${l.details}"`)].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Audit_Logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Audit logs exported to CSV file!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-emerald-400" size={20} />
            <h3 className="text-base font-bold text-white">Full System Audit & Activity Logs</h3>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{auditLogs.length} Timestamped System Events Logged</span>
            <button
              onClick={handleExportLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 font-semibold"
            >
              <Download size={14} className="text-emerald-400" /> Export CSV
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/80 text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-slate-900/60 transition-colors space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{log.user}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {log.role}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
                </div>
                <p className="text-slate-300 leading-snug">{log.details}</p>
                <span className="inline-block text-[9px] font-bold uppercase text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                  {log.action}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
