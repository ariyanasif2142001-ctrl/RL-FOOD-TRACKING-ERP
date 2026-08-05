import React from 'react';
import { User, UserRole } from '../types';
import { 
  ShoppingBag, Warehouse, Truck, Shield, RefreshCw, Search, Bell, User as UserIcon, Crown
} from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission, sendBrowserNotification } from '../services/notificationService';

interface MobileBottomNavProps {
  currentUser: User;
  isSyncing: boolean;
  onSync: () => void;
  onOpenCommandPalette: () => void;
  onOpenLogin: () => void;
  onSelectRole?: (role: UserRole) => void;
  activeRole: UserRole;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  isSyncing,
  onSync,
  onOpenCommandPalette,
  onOpenLogin,
  onSelectRole,
  activeRole
}) => {
  const isSuper = currentUser.isSuperAdmin || currentUser.name === 'RL TAKMIL' || currentUser.name === 'RL MUSTAQ' || currentUser.id === 'u-takmil' || currentUser.id === 'u-mustaq' || currentUser.role === 'super_admin' || currentUser.role === 'admin';

  const roleNavItems: { role: UserRole; label: string; icon: React.ElementType; color: string }[] = [
    { role: 'purchaser', label: 'Purchaser', icon: ShoppingBag, color: 'text-blue-400' },
    { role: 'warehouse', label: 'Warehouse', icon: Warehouse, color: 'text-amber-400' },
    { role: 'dispatch', label: 'Dispatch', icon: Truck, color: 'text-emerald-400' },
    { role: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-400' }
  ];

  const handleNotifClick = async () => {
    const current = getNotificationPermission();
    if (current === 'default') {
      const res = await requestNotificationPermission();
      if (res === 'granted') {
        sendBrowserNotification('Notifications Enabled 🔔', {
          body: 'You will now receive real-time alerts for Purchase Orders, holds, purchases, and dispatches.'
        });
      }
    } else if (current === 'granted') {
      sendBrowserNotification('Notifications Active 🔔', {
        body: 'Browser notifications are working and active for RL Food ERP.'
      });
    }
  };

  const notifPerm = getNotificationPermission();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#072417]/95 backdrop-blur-md border-t border-emerald-900/80 px-2 py-1.5 shadow-[0_-8px_25px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        
        {/* Role Quick Switcher Buttons */}
        {roleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRole === item.role;
          const canAccess = isSuper || currentUser.role === item.role;

          return (
            <button
              key={item.role}
              type="button"
              onClick={() => {
                if (onSelectRole) onSelectRole(item.role);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-emerald-900/90 text-white shadow-md border border-emerald-700/80 font-extrabold'
                  : canAccess
                  ? 'text-emerald-300/80 hover:bg-emerald-950/60 hover:text-white'
                  : 'text-slate-500 opacity-60'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300 animate-pulse' : item.color}`} />
                {isActive && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />}
              </div>
              <span className="text-[10px] tracking-tight font-bold mt-0.5 truncate max-w-[60px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Sync Button */}
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-emerald-300/90 hover:bg-emerald-950/60 active:scale-95 transition cursor-pointer disabled:opacity-50"
          title="Synchronize Database"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate">Sync</span>
        </button>

        {/* Quick Command Search (Ctrl+K) */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-emerald-300/90 hover:bg-emerald-950/60 active:scale-95 transition cursor-pointer"
          title="Search PO / SKU"
        >
          <Search className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate">Search</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          onClick={handleNotifClick}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-emerald-300/90 hover:bg-emerald-950/60 active:scale-95 transition cursor-pointer"
          title="Toggle Notifications"
        >
          <Bell className={`w-4 h-4 ${notifPerm === 'granted' ? 'text-emerald-400' : 'text-amber-400 animate-bounce'}`} />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate">Alerts</span>
        </button>

        {/* Profile / Account Switch */}
        <button
          type="button"
          onClick={onOpenLogin}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-emerald-300/90 hover:bg-emerald-950/60 active:scale-95 transition cursor-pointer"
          title="Switch Account / Profile"
        >
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-4 h-4 rounded-full object-cover border border-emerald-400" 
            />
          ) : (
            <UserIcon className="w-4 h-4 text-emerald-300" />
          )}
          <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-[50px]">{currentUser.name.split(' ')[0]}</span>
        </button>

      </div>
    </div>
  );
};
