import React from 'react';
import { useERP } from '../context/ERPContext';
import {
  Bell,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronRight
} from 'lucide-react';

export const LiveNotificationsWidget: React.FC = () => {
  const { notifications, setIsNotifPanelOpen } = useERP();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Live Notifications</h3>
        </div>
        <button
          onClick={() => setIsNotifPanelOpen(true)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center font-medium"
        >
          View All <ChevronRight size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {notifications.slice(0, 3).map((n) => (
          <div key={n.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-white">{n.title}</span>
              <span className="text-[10px] text-slate-400">{n.timestamp}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-snug">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const UsersOnlineWidget: React.FC = () => {
  const { users } = useERP();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-emerald-500" />
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Active ERP Team</h3>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          3 Online
        </span>
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                {u.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                )}
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block leading-tight">{u.name}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{u.department}</span>
              </div>
            </div>
            <span className="text-[10px] capitalize px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
              {u.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RecentActivityWidget: React.FC = () => {
  const { auditLogs, setActiveModal } = useERP();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-amber-500" />
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Recent Activities</h3>
        </div>
        <button
          onClick={() => setActiveModal('audit-logs')}
          className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
        >
          Audit Log
        </button>
      </div>

      <div className="space-y-3">
        {auditLogs.slice(0, 4).map((log) => (
          <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-600 dark:text-blue-400">{log.user}</span>
              <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.substring(11, 16)}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-snug">{log.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const UpcomingTasksWidget: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-purple-500" />
          <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Upcoming Tasks</h3>
        </div>
        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
          Operational
        </span>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white block">Inspect Apex Cold Shipment</span>
            <span className="text-[10px] text-slate-400">Target Delivery: Today 18:00</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
          <Clock size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white block">Google Sheets Master Re-sync</span>
            <span className="text-[10px] text-slate-400">Auto-scheduled at midnight</span>
          </div>
        </div>
      </div>
    </div>
  );
};
