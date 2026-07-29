import React from 'react';
import { useERP } from '../context/ERPContext';
import { UserCheck, Shield } from 'lucide-react';
import type { UserRole } from '../types';

export const UsersView: React.FC = () => {
  const { users, currentUser, setCurrentUserRole } = useERP();

  const roleBadgeStyle: Record<UserRole, string> = {
    admin: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    purchaser: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    receiver: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    manager: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-bold text-white tracking-tight leading-tight">
          User Accounts & Role Permissions
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage system users, field purchaser profiles, warehouse receiver roles, and access control.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map((u) => {
          const isActiveUser = currentUser.id === u.id;
          return (
            <div
              key={u.id}
              className={`bg-slate-900/90 border rounded-xl p-5 shadow-sm space-y-4 transition-all ${
                isActiveUser ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-700" />
                <div>
                  <h3 className="text-[16px] font-semibold text-white">{u.name}</h3>
                  <p className="text-xs text-slate-400">{u.email}</p>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${roleBadgeStyle[u.role]}`}>
                    {u.role}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Last Login:</span>
                  <span className="text-slate-200">{u.lastLogin}</span>
                </div>
              </div>

              <button
                onClick={() => setCurrentUserRole(u.role)}
                disabled={isActiveUser}
                className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isActiveUser
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 cursor-default'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {isActiveUser ? <UserCheck size={14} /> : <Shield size={14} />}
                <span>{isActiveUser ? 'Active Profile' : `Switch to ${u.name}`}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
