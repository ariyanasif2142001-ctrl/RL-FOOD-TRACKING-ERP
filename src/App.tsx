import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, PurchaseOrder, AuditLog, POItem, MasterStatus, getNormalizedItemStatus, ReceiveBatchLog } from './types';
import { 
  getCurrentUser, saveCurrentUser, 
  getLocalUsers, saveLocalUsers, sanitizeAndMergeAdmins,
  getLocalPOs, saveLocalPOs, 
  getLocalAuditLogs, saveLocalAuditLogs
} from './services/storage';
import { getAppConfig, saveAppConfig } from './config/appConfig';
import { 
  apiFetchPOs, apiFetchUsers, apiFetchActivityLogs,
  apiLogin, apiUpdateUsers, apiImportPOs,
  apiHoldItem, apiReleaseHold, apiSavePurchase, apiReturnItem,
  apiReceiveItem, apiDeletePO, apiClearAllPOs, apiHoldPO, apiReleasePO
} from './services/apiClient';
import { Header } from './components/Header';
import { CompanyLogo } from './components/CompanyLogo';
import { LoginModal } from './components/LoginModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { notifyItemHold, notifyItemPurchased, notifyWarehouseReceived, notifyPODispatched, notifyActivityLog, processTelegramUpdates, notifyDailySummaryReport, notifyPendingPurchasesReport, notifyHoldItemsReport, notifyDiscrepancyAlert } from './services/telegramService';
import { reMatchPOsWithMasterSKU } from './services/skuService';
import { getNotificationPermission, requestNotificationPermission, sendBrowserNotification } from './services/notificationService';
import { RefreshCw, AlertCircle, Database, CheckCircle, Loader2, Sparkles, X, Bell } from 'lucide-react';

const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PurchaserView = lazy(() => import('./components/purchaser/PurchaserView').then(m => ({ default: m.PurchaserView })));
const WarehouseView = lazy(() => import('./components/warehouse/WarehouseView').then(m => ({ default: m.WarehouseView })));
const DispatchView = lazy(() => import('./components/dispatch/DispatchView').then(m => ({ default: m.DispatchView })));

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [appConfig, setAppConfigState] = useState(getAppConfig());
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Keyboard shortcut for Ctrl+K / Cmd+K Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for global configuration updates (e.g. when Super Admin updates Google Sheets Web App URL)
  useEffect(() => {
    const handleConfigUpdate = () => {
      const updated = getAppConfig();
      setAppConfigState(updated);
    };

    window.addEventListener('rl_app_config_updated', handleConfigUpdate);
    window.addEventListener('storage', handleConfigUpdate);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('rl_app_config_sync');
        channel.onmessage = () => {
          setAppConfigState(getAppConfig());
        };
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener('rl_app_config_updated', handleConfigUpdate);
      window.removeEventListener('storage', handleConfigUpdate);
      if (channel) {
        channel.close();
      }
    };
  }, []);
  
  const [pos, setPOs] = useState<PurchaseOrder[]>(getLocalPOs());
  const [users, setUsers] = useState<User[]>(getLocalUsers());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(getLocalAuditLogs());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(!currentUser);
  const [adminActiveTab, setAdminActiveTab] = useState<'dashboard' | 'import' | 'users' | 'sheets' | 'telegram' | 'tests' | 'docs' | 'logs'>('dashboard');

  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(getNotificationPermission());
  const [isNotifBannerDismissed, setIsNotifBannerDismissed] = useState<boolean>(() => {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rl_notif_banner_dismissed') === 'true';
  });

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      sendBrowserNotification('Notifications Active 🔔', {
        body: 'You will now receive real-time updates for PO creation, holds, purchases, and dispatches.'
      });
    }
  };

  const handleDismissNotifBanner = () => {
    setIsNotifBannerDismissed(true);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('rl_notif_banner_dismissed', 'true');
    }
  };

  const showToast = (message: string, success: boolean = true) => {
    setToast({ message, success });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Helper to merge fetched POs with local state so holds, partial purchases, and full purchases are never prematurely reset by backend syncs
  const mergePreservedHolds = (fetchedPOs: PurchaseOrder[], currentPOs: PurchaseOrder[]): PurchaseOrder[] => {
    const localItemMap = new Map<string, POItem>();
    (currentPOs || []).forEach(po => {
      (po.items || []).forEach(item => {
        localItemMap.set(String(item.id).trim(), item);
      });
    });

    return (fetchedPOs || []).map(po => {
      const updatedItems = (po.items || []).map(item => {
        const itemIdStr = String(item.id).trim();
        const localItem = localItemMap.get(itemIdStr);

        const reqQty = item.requestedQty || item.orderedQty || localItem?.requestedQty || localItem?.orderedQty || 0;
        const fetchedPurQty = item.purchasedQty || 0;
        const localPurQty = localItem?.purchasedQty || 0;

        // Take the highest purchased quantity between local and fetched
        const effectivePurQty = Math.max(fetchedPurQty, localPurQty);

        const isFullyPurchased = (effectivePurQty >= reqQty && reqQty > 0) || item.purchaseStatus === 'Purchased' || localItem?.purchaseStatus === 'Purchased';
        const isPartiallyPurchased = !isFullyPurchased && (effectivePurQty > 0 || item.purchaseStatus === 'Partial Purchased' || localItem?.purchaseStatus === 'Partial Purchased');

        if (isFullyPurchased) {
          const finalPurQty = effectivePurQty >= reqQty ? effectivePurQty : (reqQty || effectivePurQty);
          return {
            ...item,
            purchasedQty: finalPurQty,
            remainingQty: 0,
            purchaseStatus: 'Purchased' as const,
            purchaserName: localItem?.purchaserName || item.purchaserName || '',
            purchasedAt: localItem?.purchasedAt || item.purchasedAt || '',
            notes: localItem?.notes || item.notes || '',
            holdBy: '',
            holdById: '',
            holdByName: '',
            holdStartTime: '',
            holdSince: '',
            holdExpireTime: ''
          };
        }

        if (isPartiallyPurchased) {
          const finalPurQty = effectivePurQty;
          const remQty = Math.max(0, reqQty - finalPurQty);
          return {
            ...item,
            purchasedQty: finalPurQty,
            remainingQty: remQty,
            purchaseStatus: 'Partial Purchased' as const,
            purchaserName: localItem?.purchaserName || item.purchaserName || '',
            purchasedAt: localItem?.purchasedAt || item.purchasedAt || '',
            notes: localItem?.notes || item.notes || '',
            holdBy: '',
            holdById: '',
            holdByName: '',
            holdStartTime: '',
            holdSince: '',
            holdExpireTime: ''
          };
        }

        const localNorm = localItem ? getNormalizedItemStatus(localItem) : undefined;
        const fetchedNorm = getNormalizedItemStatus(item);

        const localIsHeld = localNorm === 'Held' && Boolean(localItem?.holdBy && localItem.holdBy.trim() !== '' && localItem.holdBy !== 'Admin');
        const fetchedIsHeld = fetchedNorm === 'Held' && Boolean(item.holdBy && item.holdBy.trim() !== '' && item.holdBy !== 'Admin');

        if (localIsHeld || fetchedIsHeld) {
          const activeItem = localIsHeld ? localItem! : item;
          const hBy = activeItem.holdBy!.trim();
          const hById = activeItem.holdById || '';
          const hName = activeItem.holdByName || activeItem.holdBy || hBy;
          const hTime = activeItem.holdStartTime || activeItem.holdSince || new Date().toISOString();
          return {
            ...item,
            purchaseStatus: 'Held' as const,
            holdBy: hBy,
            holdById: hById,
            holdByName: hName,
            holdStartTime: hTime,
            holdSince: hTime,
            holdExpireTime: ''
          };
        }

        return {
          ...item,
          purchasedQty: 0,
          remainingQty: reqQty,
          purchaseStatus: 'Pending' as const,
          holdBy: '',
          holdById: '',
          holdByName: '',
          holdStartTime: '',
          holdSince: '',
          holdExpireTime: ''
        };
      });

      const allItemsPurchased = updatedItems.length > 0 && updatedItems.every(i => i.purchaseStatus === 'Purchased');
      const anyItemsPurchased = updatedItems.some(i => i.purchaseStatus === 'Partial Purchased' || i.purchaseStatus === 'Purchased');
      const calculatedPoStatus = po.isHeldByAdmin ? 'Held' : (allItemsPurchased ? 'Completed' : (anyItemsPurchased ? 'Partial' : 'Pending'));

      return {
        ...po,
        isHeldByAdmin: po.isHeldByAdmin,
        holdByAdmin: po.holdByAdmin,
        purchaseStatus: calculatedPoStatus,
        items: updatedItems
      };
    });
  };

  // Load all master data directly from Google Sheets API with Local Storage fallback
  const loadMasterData = useCallback(async (isManualSync: boolean = false) => {
    if (isManualSync) setIsSyncing(true);
    else setIsLoading(true);

    setApiError(null);

    const localUsers = getLocalUsers();
    const localPOs = getLocalPOs();
    const localLogs = getLocalAuditLogs();

    const hasSheetsUrl = Boolean(appConfig.webAppUrl && appConfig.webAppUrl.trim() !== '');
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const hasSupabase = Boolean(supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co');

    if (!hasSheetsUrl && !hasSupabase) {
      setPOs(localPOs);
      setUsers(localUsers);
      setAuditLogs(localLogs);
      setIsLoading(false);
      setIsSyncing(false);
      setApiError('Google Apps Script Web App URL or Supabase credentials are not configured. Operating on local memory.');
      return;
    }

    try {
      const [poRes, userRes, logRes] = await Promise.all([
        apiFetchPOs(),
        apiFetchUsers(),
        apiFetchActivityLogs()
      ]);

      let hasSuccess = false;

      if (poRes.success && poRes.data?.pos) {
        const mergedPOs = mergePreservedHolds(poRes.data.pos, localPOs);
        setPOs(mergedPOs);
        saveLocalPOs(mergedPOs);
        hasSuccess = true;
      } else {
        setPOs(localPOs);
      }

      if (userRes.success && userRes.data?.users) {
        const sanitizedUsers = sanitizeAndMergeAdmins(userRes.data.users);
        setUsers(sanitizedUsers);
        saveLocalUsers(sanitizedUsers);
      } else {
        setUsers(localUsers);
      }

      if (logRes.success && logRes.data?.logs) {
        setAuditLogs(logRes.data.logs);
        saveLocalAuditLogs(logRes.data.logs);
      } else {
        setAuditLogs(localLogs);
      }

      if (hasSuccess) {
        showToast(isManualSync ? 'Synchronized live with Google Sheets Database' : 'Database loaded from Google Sheets', true);
      } else {
        setApiError('Notice: Unable to fetch live Google Sheets data. Displaying cached local data. Check Web App deployment URL.');
      }
    } catch (err: unknown) {
      setPOs(localPOs);
      setUsers(localUsers);
      setAuditLogs(localLogs);
      setApiError('Network connection notice: Operating in Local Mode.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [appConfig.webAppUrl]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Listen for Master SKU & Delivery Note updates
  useEffect(() => {
    const handleSkuUpdated = () => {
      setPOs(prevPOs => {
        const updated = reMatchPOsWithMasterSKU(prevPOs);
        saveLocalPOs(updated);
        return updated;
      });
    };

    const handleDeliveryNotesUpdated = () => {
      loadMasterData();
    };

    window.addEventListener('master_sku_updated', handleSkuUpdated);
    window.addEventListener('delivery_notes_updated', handleDeliveryNotesUpdated);

    return () => {
      window.removeEventListener('master_sku_updated', handleSkuUpdated);
      window.removeEventListener('delivery_notes_updated', handleDeliveryNotesUpdated);
    };
  }, []);

  // Ref to always hold current pos state for background polling
  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const handleTelegramStateUpdate = useCallback((updatedPOs: PurchaseOrder[], logMsg: string) => {
    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    if (logMsg) {
      showToast(logMsg, true);
      setAuditLogs(prev => {
        const newLog: AuditLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'TELEGRAM_ACTION',
          user: 'Telegram Bot',
          role: 'admin',
          details: logMsg
        };
        const newLogs = [newLog, ...prev];
        saveLocalAuditLogs(newLogs);
        return newLogs;
      });
    }
  }, [showToast]);

  // Background Telegram Interactive 2-Way Command Listener & Scheduled Digest Engine
  useEffect(() => {
    const tg = appConfig.telegramConfig;
    if (!tg || !tg.enabled || !tg.botToken) return;
    const cleanToken = tg.botToken.trim();
    if (!cleanToken || cleanToken.includes('YOUR_') || cleanToken.length < 10 || !cleanToken.includes(':')) return;

    // 1. Interactive 2-Way Command Polling (every 20s instead of 4s, paused when tab hidden)
    const pollInterval = setInterval(async () => {
      if (document.hidden) return;
      if (tg.interactiveBot?.enabled !== false) {
        try {
          await processTelegramUpdates(posRef.current, handleTelegramStateUpdate);
        } catch {
          // ignore background errors
        }
      }
    }, 20000);

    // 2. Auto-Scheduled Daily Telegram Digest Timer (every 2 minutes instead of 30s, paused when tab hidden)
    const scheduleInterval = setInterval(async () => {
      if (document.hidden) return;
      if (!tg.autoSchedule || !tg.autoSchedule.enabled) return;

      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = now.toISOString().split('T')[0];

      const t1 = tg.autoSchedule.time1 || '09:00';
      const t2 = tg.autoSchedule.time2 || '20:00';

      let matchedSlot = '';
      if (currentHHMM === t1) matchedSlot = 'time1';
      else if (currentHHMM === t2) matchedSlot = 'time2';

      if (matchedSlot) {
        const sentKey = `rl_scheduled_digest_sent_${todayStr}_${matchedSlot}`;
        if (!localStorage.getItem(sentKey)) {
          localStorage.setItem(sentKey, 'true');
          const rType = tg.autoSchedule.reportType || 'all';
          if (rType === 'all' || rType === 'summary') {
            await notifyDailySummaryReport(pos, undefined, 'Auto Schedule System');
          }
          if (rType === 'all' || rType === 'pending') {
            await notifyPendingPurchasesReport(pos, 'Auto Schedule System');
          }
          if (rType === 'all' || rType === 'hold') {
            await notifyHoldItemsReport(pos, 'Auto Schedule System');
          }
        }
      }
    }, 120000);

    // Immediately poll updates when user switches back to the active tab
    const handleVisibilityChange = () => {
      if (!document.hidden && tg.interactiveBot?.enabled !== false) {
        processTelegramUpdates(posRef.current, handleTelegramStateUpdate).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      clearInterval(scheduleInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appConfig.telegramConfig, handleTelegramStateUpdate, pos]);

  // Helper to append audit log
  const addAuditLog = (action: string, details: string, actorUser?: User) => {
    const actor = actorUser || currentUser;
    const userName = actor ? actor.name : 'System/Guest';
    const userRole = actor ? actor.role : 'admin';
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: userName,
      role: userRole,
      action,
      details
    };
    setAuditLogs(prev => {
      const updated = [newLog, ...prev];
      saveLocalAuditLogs(updated);
      return updated;
    });

    // Send activity log notification to Telegram
    notifyActivityLog(userName, userRole, action, details);
  };

  // Login handler
  const handleLogin = (user: User, remember: boolean = true) => {
    setCurrentUser(user);
    saveCurrentUser(user, remember);
    setIsLoginOpen(false);
    showToast(`🚀 Auto-redirected to ${user.role.toUpperCase()} View as ${user.name}`, true);
    loadMasterData();
  };

  const handleLogout = () => {
    if (currentUser) {
      addAuditLog('User Logout', `User ${currentUser.name} logged out`);
    }
    setCurrentUser(null);
    saveCurrentUser(null, false);
    setIsLoginOpen(true);
  };

  // Purchaser Actions
  const handleHoldItem = async (itemId: string) => {
    if (!currentUser) return { success: false, message: 'User not logged in.' };
    if (currentUser.role !== 'purchaser') {
      return { success: false, message: 'Permission denied: Only purchasers are authorized to hold items.' };
    }

    const existingItem = pos.flatMap(p => p.items || []).find(i => String(i.id).trim() === String(itemId).trim());
    if (existingItem) {
      const normSt = getNormalizedItemStatus(existingItem);
      const ownerName = existingItem.holdByName || existingItem.holdBy;
      const ownerId = existingItem.holdById;
      if (normSt === 'Held' && ownerName && ownerName.trim().toLowerCase() !== currentUser.name.trim().toLowerCase() && ownerId !== currentUser.id) {
        return { success: false, message: `This item is currently held by ${ownerName}.` };
      }
    }

    const holdStart = new Date().toISOString();

    const updatePOsWithHold = (poList: PurchaseOrder[]) => poList.map(po => {
      const newItems = (po.items || []).map(item => {
        if (String(item.id).trim() === String(itemId).trim()) {
          return {
            ...item,
            purchaseStatus: 'Held' as const,
            holdBy: currentUser.name,
            holdById: currentUser.id,
            holdByName: currentUser.name,
            holdStartTime: holdStart,
            holdSince: holdStart,
            holdExpireTime: ''
          };
        }
        return item;
      });

      const allItemsPurchased = newItems.length > 0 && newItems.every(i => getNormalizedItemStatus(i) === 'Purchased');
      const anyItemsPurchased = newItems.some(i => getNormalizedItemStatus(i) === 'Partial Purchased' || getNormalizedItemStatus(i) === 'Purchased');
      const calculatedPoStatus: MasterStatus = (po.isHeldByAdmin ? 'Held' : (allItemsPurchased ? 'Completed' : (anyItemsPurchased ? 'Partial' : 'Pending'))) as MasterStatus;

      return {
        ...po,
        purchaseStatus: calculatedPoStatus,
        items: newItems
      };
    });

    // 1. Immediately update local state & local storage
    const updatedPOs = updatePOsWithHold(pos);
    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    addAuditLog('Hold Item', `Item ${itemId} placed on hold by ${currentUser.name}`);
    window.dispatchEvent(new CustomEvent('po_data_updated', { detail: updatedPOs }));

    // Trigger Telegram notification
    const targetItem = updatedPOs.flatMap(p => p.items || []).find(i => String(i.id).trim() === String(itemId).trim());
    if (targetItem) {
      notifyItemHold(targetItem.poNumber, targetItem.itemName, currentUser.name, 'Purchaser Hold');
    }

    // 2. Perform API sync if backend is active
    setIsSyncing(true);
    try {
      const res = await apiHoldItem(itemId, currentUser, holdStart, '');
      setIsSyncing(false);

      if (res.success && res.data?.pos && Array.isArray(res.data.pos) && res.data.pos.length > 0) {
        const mergedPOs = mergePreservedHolds(res.data.pos, updatedPOs);
        setPOs(mergedPOs);
        saveLocalPOs(mergedPOs);
        window.dispatchEvent(new CustomEvent('po_data_updated', { detail: mergedPOs }));
      }
    } catch {
      setIsSyncing(false);
    }

    showToast('Item placed on hold', true);
    return { success: true, message: 'Item placed on hold' };
  };

  const handleReleaseHold = async (itemId: string) => {
    if (!currentUser) return { success: false, message: 'User not logged in.' };

    const targetItem = pos.flatMap(p => p.items || []).find(i => String(i.id).trim() === String(itemId).trim());
    if (!targetItem) return { success: false, message: 'Item not found.' };

    // Only purchaser can release holds
    if (currentUser.role !== 'purchaser') {
      return { success: false, message: 'Permission denied: Only purchasers are authorized to release item holds.' };
    }

    // Check ownership
    const ownerName = targetItem.holdByName || targetItem.holdBy;
    const ownerId = targetItem.holdById;
    const isOwner = (ownerId && ownerId === currentUser.id) || (ownerName && ownerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    if (ownerName && !isOwner) {
      return { success: false, message: `Only ${ownerName} who placed the hold can unhold this item.` };
    }

    const updatePOsReleaseHold = (poList: PurchaseOrder[]) => poList.map(po => {
      const newItems = (po.items || []).map(item => {
        if (String(item.id).trim() === String(itemId).trim()) {
          const reqQty = item.requestedQty || item.orderedQty || 0;
          const purQty = item.purchasedQty || 0;
          const statusToSet = purQty >= reqQty && reqQty > 0 ? ('Purchased' as const) : (purQty > 0 ? ('Partial Purchased' as const) : ('Pending' as const));
          return {
            ...item,
            purchaseStatus: statusToSet,
            holdBy: '',
            holdById: '',
            holdByName: '',
            holdStartTime: '',
            holdSince: '',
            holdExpireTime: ''
          };
        }
        return item;
      });

      const allItemsPurchased = newItems.length > 0 && newItems.every(i => getNormalizedItemStatus(i) === 'Purchased');
      const anyItemsPurchased = newItems.some(i => getNormalizedItemStatus(i) === 'Partial Purchased' || getNormalizedItemStatus(i) === 'Purchased');
      const calculatedPoStatus: MasterStatus = (po.isHeldByAdmin ? 'Held' : (allItemsPurchased ? 'Completed' : (anyItemsPurchased ? 'Partial' : 'Pending'))) as MasterStatus;

      return {
        ...po,
        purchaseStatus: calculatedPoStatus,
        items: newItems
      };
    });

    // 1. Immediately update local state & local storage
    const updatedPOs = updatePOsReleaseHold(pos);
    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    addAuditLog('Release Hold', `Item ${itemId} hold released by ${currentUser.name}`);
    window.dispatchEvent(new CustomEvent('po_data_updated', { detail: updatedPOs }));

    // 2. Perform API sync if backend is active
    setIsSyncing(true);
    try {
      const res = await apiReleaseHold(itemId, currentUser);
      setIsSyncing(false);
      if (res.success && res.data?.pos && Array.isArray(res.data.pos) && res.data.pos.length > 0) {
        const syncedPOs = updatePOsReleaseHold(res.data.pos);
        setPOs(syncedPOs);
        saveLocalPOs(syncedPOs);
        window.dispatchEvent(new CustomEvent('po_data_updated', { detail: syncedPOs }));
      }
    } catch {
      setIsSyncing(false);
    }

    showToast('Item hold released', true);
    return { success: true, message: 'Item hold released' };
  };

  const handleRecordPurchase = async (
    itemId: string,
    purchasedQty: number,
    notes: string
  ) => {
    if (!currentUser) return { success: false, message: 'User not logged in.' };

    const targetItem = pos.flatMap(p => p.items || []).find(i => String(i.id).trim() === String(itemId).trim());
    if (targetItem) {
      const normSt = getNormalizedItemStatus(targetItem);
      if (normSt === 'Held') {
        const ownerName = targetItem.holdByName || targetItem.holdBy;
        const ownerId = targetItem.holdById;
        const isOwner = (ownerId && ownerId === currentUser.id) || (ownerName && ownerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
        if (ownerName && !isOwner) {
          return { success: false, message: `Cannot purchase. This item is currently held by ${ownerName}.` };
        }
      }
    }

    const updateItemPurchaseInPOs = (poList: PurchaseOrder[]) => poList.map(po => {
      let matched = false;
      const updatedItems = (po.items || []).map(item => {
        if (String(item.id).trim() === String(itemId).trim()) {
          matched = true;
          const reqQty = item.requestedQty || item.orderedQty || 0;
          const totalPurchased = purchasedQty;
          const remaining = Math.max(0, reqQty - totalPurchased);
          const status = remaining === 0 ? 'Purchased' as const : 'Partial Purchased' as const;
          return {
            ...item,
            purchasedQty: totalPurchased,
            remainingQty: remaining,
            purchaseStatus: status,
            purchaserName: currentUser.name,
            purchaserId: currentUser.id,
            purchasedAt: new Date().toISOString(),
            notes: notes ? `${item.notes ? item.notes + ' | ' : ''}${notes}` : item.notes,
            holdBy: '',
            holdById: '',
            holdByName: '',
            holdStartTime: '',
            holdSince: '',
            holdExpireTime: ''
          };
        }
        return item;
      });

      if (!matched) return po;

      const totalItems = updatedItems.length;
      const purchasedCount = updatedItems.filter(i => getNormalizedItemStatus(i) === 'Purchased').length;
      const partialCount = updatedItems.filter(i => getNormalizedItemStatus(i) === 'Partial Purchased').length;
      const heldCount = updatedItems.filter(i => getNormalizedItemStatus(i) === 'Held').length;

      let masterPurchaseStatus: MasterStatus = 'Pending';
      if (po.isHeldByAdmin) {
        masterPurchaseStatus = 'Held';
      } else if (purchasedCount === totalItems && totalItems > 0) {
        masterPurchaseStatus = 'Completed';
      } else if (purchasedCount > 0 || partialCount > 0) {
        masterPurchaseStatus = 'Partial';
      }

      return {
        ...po,
        items: updatedItems,
        purchaseStatus: masterPurchaseStatus,
        updatedAt: new Date().toISOString()
      };
    });

    // 1. Immediately update local state & local storage
    const updatedPOs = updateItemPurchaseInPOs(pos);
    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    addAuditLog('Record Purchase', `Purchased ${purchasedQty} units for item ${itemId}`);

    // Trigger Telegram notification
    const purchasedItem = updatedPOs.flatMap(p => p.items || []).find(i => String(i.id).trim() === String(itemId).trim());
    if (purchasedItem) {
      notifyItemPurchased(
        purchasedItem.poNumber,
        purchasedItem.itemName,
        purchasedQty,
        purchasedItem.unit || 'Pcs',
        purchasedItem.marketPrice || 0,
        currentUser.name,
        notes
      );
    }

    // 2. Perform API sync if backend is active
    setIsSyncing(true);
    try {
      const res = await apiSavePurchase(itemId, purchasedQty, notes, currentUser);
      setIsSyncing(false);
      if (res.success && res.data?.pos && Array.isArray(res.data.pos) && res.data.pos.length > 0) {
        const syncedPOs = updateItemPurchaseInPOs(res.data.pos);
        setPOs(syncedPOs);
        saveLocalPOs(syncedPOs);
      }
    } catch {
      setIsSyncing(false);
    }

    showToast('Purchase recorded successfully', true);
    return { success: true, message: 'Purchase recorded successfully' };
  };

  const handleReturnItem = async (itemId: string) => {
    if (!currentUser) return { success: false, message: 'User not logged in.' };

    const resetTargetItemInPOs = (poList: PurchaseOrder[]): PurchaseOrder[] => {
      return poList.map(po => {
        let matched = false;
        const updatedItems = (po.items || []).map(item => {
          if (String(item.id).trim() === String(itemId).trim()) {
            matched = true;
            const reqQty = item.requestedQty || item.orderedQty || 0;
            return {
              ...item,
              purchasedQty: 0,
              remainingQty: reqQty,
              purchaseStatus: 'Pending' as const,
              purchaserName: '',
              purchaserId: '',
              purchasedAt: '',
              updatedDate: new Date().toISOString(),
              notes: '',
              receiveStatus: 'Pending' as const,
              holdBy: '',
              holdStartTime: '',
              holdExpireTime: ''
            };
          }
          return item;
        });

        if (!matched) return po;

        const totalItems = updatedItems.length;
        const purchasedCount = updatedItems.filter(i => getNormalizedItemStatus(i) === 'Purchased').length;
        const partialCount = updatedItems.filter(i => getNormalizedItemStatus(i) === 'Partial Purchased').length;
        const heldCount = updatedItems.filter(i => getNormalizedItemStatus(i) === 'Held').length;

        let masterPurchaseStatus: MasterStatus = 'Pending';
        if (po.isHeldByAdmin) {
          masterPurchaseStatus = 'Held';
        } else if (purchasedCount === totalItems && totalItems > 0) {
          masterPurchaseStatus = 'Completed';
        } else if (purchasedCount > 0 || partialCount > 0) {
          masterPurchaseStatus = 'Partial';
        }

        return {
          ...po,
          items: updatedItems,
          purchaseStatus: masterPurchaseStatus,
          updatedAt: new Date().toISOString()
        };
      });
    };

    // 1. Immediately update local state & local storage
    const updatedPOs = resetTargetItemInPOs(pos);
    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    addAuditLog('Return Purchase', `Item ${itemId} returned to pending list`);

    // 2. Perform API sync if backend is active
    setIsSyncing(true);
    try {
      const res = await apiReturnItem(itemId, currentUser);
      setIsSyncing(false);

      if (res.success && res.data?.pos && Array.isArray(res.data.pos) && res.data.pos.length > 0) {
        // Enforce reset on backend response as well
        const syncedPOs = resetTargetItemInPOs(res.data.pos);
        setPOs(syncedPOs);
        saveLocalPOs(syncedPOs);
      }
    } catch {
      setIsSyncing(false);
    }

    showToast('Item returned to pending list', true);
    return { success: true, message: 'Item returned to pending list' };
  };

  // Warehouse Actions with QC, Partial Receiving & Discrepancy Alert
  const handleReceiveComplete = async (
    itemId: string,
    receivedBatchQty?: number,
    passedBatchQty?: number,
    damagedBatchQty?: number,
    qcNotes?: string
  ) => {
    if (!currentUser) return { success: false, message: 'User not logged in.' };

    const targetItem = pos.flatMap(p => p.items || []).find(i => String(i.id).trim() === String(itemId).trim());
    if (!targetItem) return { success: false, message: 'Item not found' };

    const purchased = targetItem.purchasedQty || 0;
    const existingReceived = targetItem.warehouseQty || 0;
    const isQuickPass = receivedBatchQty === undefined;

    // Idempotency check for Quick Pass: if already received, no-op
    if (isQuickPass && existingReceived >= purchased && purchased > 0) {
      return { success: true, message: `Item "${targetItem.itemName}" is already fully received (${existingReceived}/${purchased}).` };
    }

    const remainingToReceive = Math.max(0, purchased - existingReceived);

    const actualReceivedBatch = isQuickPass ? remainingToReceive : (typeof receivedBatchQty === 'number' ? receivedBatchQty : remainingToReceive);
    const actualPassedBatch = isQuickPass ? remainingToReceive : (typeof passedBatchQty === 'number' ? passedBatchQty : actualReceivedBatch);
    const actualDamagedBatch = isQuickPass ? 0 : (typeof damagedBatchQty === 'number' ? damagedBatchQty : 0);

    const newTotalPassed = isQuickPass ? purchased : ((targetItem.passedQty || existingReceived) + actualPassedBatch);
    const newTotalDamaged = (targetItem.damagedQty || 0) + actualDamagedBatch;
    const newTotalReceived = newTotalPassed;

    // Damaged units during QC subtract from purchasedQty and return to remaining unpurchased balance
    let newPurchasedQty = purchased;
    let newRemainingQty = targetItem.remainingQty !== undefined ? targetItem.remainingQty : Math.max(0, (targetItem.requestedQty || targetItem.orderedQty || 0) - purchased);
    let newPurchaseStatus = targetItem.purchaseStatus;

    if (actualDamagedBatch > 0) {
      newPurchasedQty = Math.max(0, purchased - actualDamagedBatch);
      const originalReq = targetItem.requestedQty || targetItem.orderedQty || 0;
      newRemainingQty = Math.max(0, originalReq - newPurchasedQty);
      newPurchaseStatus = (newPurchasedQty >= originalReq && originalReq > 0)
        ? 'Purchased'
        : (newPurchasedQty > 0 ? 'Partial Purchased' : 'Pending');
    }

    const backorderQty = Math.max(0, newPurchasedQty - newTotalPassed);

    let qcStatus: 'Passed' | 'Partial Damaged' | 'Rejected' | 'Pending QC' = 'Passed';
    if (newTotalDamaged > 0) {
      qcStatus = newTotalPassed > 0 ? 'Partial Damaged' : 'Rejected';
    }

    const shortageQty = Math.max(0, newPurchasedQty - newTotalReceived);

    // Trigger Telegram Discrepancy Alert if Damaged Goods > 0 or Shortage exists
    if (actualDamagedBatch > 0 || shortageQty > 0) {
      notifyDiscrepancyAlert({
        poNumber: targetItem.poNumber || 'N/A',
        itemName: targetItem.itemName || 'Item',
        purchaserName: targetItem.purchaserName || targetItem.holdBy || 'Purchaser Team',
        orderedQty: targetItem.requestedQty || targetItem.orderedQty || 0,
        purchasedQty: newPurchasedQty,
        receivedQty: actualReceivedBatch,
        passedQty: actualPassedBatch,
        damagedQty: actualDamagedBatch,
        shortageQty,
        unit: targetItem.unit || 'Pcs',
        qcNotes: qcNotes || (actualDamagedBatch > 0 ? `Damaged ${actualDamagedBatch} ${targetItem.unit}` : `Shortage of ${shortageQty} ${targetItem.unit}`),
        receiverName: currentUser.name
      });
    } else {
      notifyWarehouseReceived(
        targetItem.poNumber,
        targetItem.itemName,
        actualReceivedBatch,
        targetItem.unit || 'Pcs',
        currentUser.name
      );
    }

    const batchLog: ReceiveBatchLog = {
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      receivedQty: actualReceivedBatch,
      passedQty: actualPassedBatch,
      damagedQty: actualDamagedBatch,
      qcNotes: qcNotes || '',
      receivedBy: currentUser.name
    };

    const updatePOsLocal = (poList: PurchaseOrder[]) => poList.map(po => {
      const updatedItems = (po.items || []).map(item => {
        if (String(item.id).trim() === String(itemId).trim()) {
          const updatedLogs = [...(item.receiveLogs || []), batchLog];
          return {
            ...item,
            purchasedQty: newPurchasedQty,
            remainingQty: newRemainingQty,
            purchaseStatus: newPurchaseStatus as any,
            warehouseQty: newTotalPassed,
            passedQty: newTotalPassed,
            damagedQty: newTotalDamaged,
            backorderQty,
            qcStatus,
            qcNotes: qcNotes ? (item.qcNotes ? item.qcNotes + ' | ' + qcNotes : qcNotes) : item.qcNotes,
            warehouseVerifiedBy: currentUser.name,
            warehouseVerifiedAt: new Date().toISOString(),
            receiveLogs: updatedLogs
          };
        }
        return item;
      });

      if (po.items?.some(i => String(i.id).trim() === String(itemId).trim())) {
        const activeItems = updatedItems.filter(i => (i.purchasedQty || 0) > 0);
        let poRecStatus: MasterStatus = 'Pending';
        if (activeItems.length > 0) {
          const allComplete = activeItems.every(i => (i.warehouseQty || 0) >= (i.purchasedQty || 0));
          const anyRec = activeItems.some(i => (i.warehouseQty || 0) > 0);
          poRecStatus = allComplete ? 'Completed' : (anyRec ? 'Partial' : 'Pending');
        }
        return {
          ...po,
          receiveStatus: poRecStatus,
          items: updatedItems
        };
      }

      return po;
    });

    setIsSyncing(true);
    try {
      await apiReceiveItem(itemId, currentUser, {
        receivedQty: actualReceivedBatch,
        passedQty: actualPassedBatch,
        damagedQty: actualDamagedBatch,
        qcNotes
      });
    } catch {
      // ignore server errors and proceed with local update
    } finally {
      setIsSyncing(false);
    }

    const updatedPOs = updatePOsLocal(pos);
    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    addAuditLog('Warehouse QC Receive', `Item ${targetItem.itemName} (${targetItem.poNumber}) received: Passed ${actualPassedBatch}, Damaged ${actualDamagedBatch}`);

    const feedbackMsg = actualDamagedBatch > 0 || shortageQty > 0
      ? `QC Receive logged! Discrepancy Telegram alert sent to ${targetItem.purchaserName || 'Purchaser'}.`
      : `Goods received successfully (${actualPassedBatch} ${targetItem.unit} Passed QC).`;
    
    showToast(feedbackMsg, true);
    return { success: true, message: feedbackMsg };
  };

  // Admin Actions
  const handleImportPOs = async (newPOs: PurchaseOrder[]) => {
    if (!currentUser) return;

    setIsSyncing(true);
    const res = await apiImportPOs(newPOs, currentUser);
    setIsSyncing(false);

    if (res.success && res.data?.pos) {
      showToast(res.message, true);
      setPOs(res.data.pos);
      saveLocalPOs(res.data.pos);
      return;
    }

    // Local Fallback: Merge imported POs
    const poMap = new Map<string, PurchaseOrder>();
    pos.forEach(p => {
      poMap.set(p.poNumber.toUpperCase().trim(), p);
    });

    (newPOs || []).forEach(p => {
      poMap.set(p.poNumber.toUpperCase().trim(), p);
    });

    const merged = Array.from(poMap.values());
    setPOs(merged);
    saveLocalPOs(merged);
    addAuditLog('PO Import', `Imported ${newPOs.length} PO(s) locally`);
    showToast(`Successfully imported ${newPOs.length} Purchase Order(s) (Local Mode)`, true);
  };

  const handleUpdateUsers = async (updatedUsers: User[]) => {
    if (!currentUser) return;
    setIsSyncing(true);
    const res = await apiUpdateUsers(updatedUsers, currentUser);
    setIsSyncing(false);

    setUsers(updatedUsers);
    saveLocalUsers(updatedUsers);

    if (res.success) {
      showToast('Users updated successfully', true);
    } else {
      showToast('Users updated in Local Database', true);
    }
  };

  // Dispatch Action
  const handleDispatchPO = (poId: string, notes: string) => {
    const targetPo = pos.find(p => p.id === poId || p.poNumber === poId);
    if (targetPo) {
      notifyPODispatched(
        targetPo.poNumber,
        targetPo.customerName || 'N/A',
        currentUser?.name || 'Dispatch Officer',
        notes
      );
    }
    showToast(`Dispatch completed and notification sent for PO ${targetPo?.poNumber || poId}`, true);
  };

  const handleDeletePO = async (poNumber: string) => {
    setIsSyncing(true);
    const res = await apiDeletePO(poNumber, currentUser || undefined);
    setIsSyncing(false);

    if (res.success && res.data?.pos) {
      setPOs(res.data.pos);
      saveLocalPOs(res.data.pos);
      addAuditLog('Delete PO', `Deleted PO ${poNumber}`);
      showToast(`Purchase Order ${poNumber} deleted`, true);
      return;
    }

    // Local Fallback
    const updated = pos.filter(p => p.poNumber.toUpperCase().trim() !== poNumber.toUpperCase().trim());
    setPOs(updated);
    saveLocalPOs(updated);
    addAuditLog('Delete PO', `Deleted PO ${poNumber}`);
    showToast(`Purchase Order ${poNumber} deleted`, true);
  };

  const handleHoldPO = async (poNumber: string) => {
    if (!currentUser) return;
    setIsSyncing(true);
    const res = await apiHoldPO(poNumber, currentUser);
    setIsSyncing(false);

    if (res.success && res.data?.pos) {
      setPOs(res.data.pos);
      saveLocalPOs(res.data.pos);
      addAuditLog('Hold PO', `Placed hold on PO ${poNumber}`);
      showToast(`Purchase Order ${poNumber} placed on hold`, true);
      return;
    }

    const updatedPOs = pos.map(po => {
      if (po.poNumber.trim().toUpperCase() === poNumber.trim().toUpperCase()) {
        const updatedItems = (po.items || []).map(item => {
          const reqQty = Number(item.requestedQty || item.orderedQty || 0);
          const purQty = Number(item.purchasedQty || 0);
          const remQty = Math.max(0, reqQty - purQty);

          // Rules 3 & 5: If item is fully purchased (remQty === 0 or status === 'Purchased'), leave completely untouched!
          if (remQty === 0 || (purQty >= reqQty && reqQty > 0) || item.purchaseStatus === 'Purchased') {
            return item;
          }

          // If item is ALREADY held by an individual purchaser, preserve purchaser's hold_by info
          const existingHoldBy = (item.holdBy || item.holdByName || '').trim().toLowerCase();
          const adminHoldName = (po.holdByAdmin || currentUser.name || 'Admin').trim().toLowerCase();
          if (item.purchaseStatus === 'Held' && existingHoldBy && existingHoldBy !== 'admin' && existingHoldBy !== adminHoldName && existingHoldBy !== currentUser.name.trim().toLowerCase()) {
            return item;
          }

          // Rule 4: Mark remaining/balance quantity as Held, keep purchased_qty untouched
          return {
            ...item,
            purchaseStatus: 'Held' as const,
            holdBy: currentUser.name,
            holdById: currentUser.id,
            holdByName: currentUser.name,
            holdStartTime: new Date().toISOString(),
            holdSince: new Date().toISOString()
          };
        });

        return {
          ...po,
          isHeldByAdmin: true,
          holdByAdmin: currentUser.name,
          adminHoldAt: new Date().toISOString(),
          purchaseStatus: 'Held' as const,
          items: updatedItems
        };
      }
      return po;
    });

    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    addAuditLog('Hold PO', `Placed hold on PO ${poNumber}`);
    showToast(`Purchase Order ${poNumber} placed on hold`, true);
  };

  const handleReleasePO = async (poNumber: string) => {
    if (!currentUser) return;
    setIsSyncing(true);
    const res = await apiReleasePO(poNumber, currentUser);
    setIsSyncing(false);

    if (res.success && res.data?.pos) {
      setPOs(res.data.pos);
      saveLocalPOs(res.data.pos);
      addAuditLog('Release PO', `Released hold on PO ${poNumber}`);
      showToast(`Purchase Order ${poNumber} hold released`, true);
      return;
    }

    const updatedPOs = pos.map(po => {
      if (po.poNumber.trim().toUpperCase() === poNumber.trim().toUpperCase()) {
        const adminHoldName = (po.holdByAdmin || currentUser.name || 'Admin').trim().toLowerCase();

        const updatedItems = (po.items || []).map(item => {
          if (item.purchaseStatus === 'Held') {
            const itemHoldBy = (item.holdBy || item.holdByName || '').trim().toLowerCase();
            const isHeldByAdminHold = !itemHoldBy || itemHoldBy === 'admin' || itemHoldBy === adminHoldName || itemHoldBy === currentUser.name.trim().toLowerCase();

            // ONLY release items held BY the admin's PO-level hold action — leave purchaser's individual item hold untouched!
            if (!isHeldByAdminHold) {
              return item;
            }

            const reqQty = Number(item.requestedQty || item.orderedQty || 0);
            const purQty = Number(item.purchasedQty || 0);
            const status = (purQty >= reqQty && reqQty > 0)
              ? 'Purchased'
              : (purQty > 0 ? ('Partial Purchased' as const) : ('Pending' as const));
            return {
              ...item,
              purchaseStatus: status as any,
              holdBy: '',
              holdById: '',
              holdByName: '',
              holdStartTime: '',
              holdSince: ''
            };
          }
          return item;
        });

        const allPurchased = updatedItems.every(i => i.purchaseStatus === 'Purchased');
        const anyPurchased = updatedItems.some(i => i.purchaseStatus === 'Partial Purchased' || i.purchaseStatus === 'Purchased' || (i.purchasedQty || 0) > 0);
        const masterStatus = allPurchased ? 'Completed' : (anyPurchased ? 'Partial' : 'Pending');

        return {
          ...po,
          isHeldByAdmin: false,
          holdByAdmin: '',
          adminHoldAt: '',
          purchaseStatus: masterStatus as any,
          items: updatedItems
        };
      }
      return po;
    });

    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);
    addAuditLog('Release PO', `Released hold on PO ${poNumber}`);
    showToast(`Purchase Order ${poNumber} hold released`, true);
  };

  const handleClearAllPOs = async () => {
    setIsSyncing(true);
    const res = await apiClearAllPOs(currentUser || undefined);
    setIsSyncing(false);

    if (res.success) {
      setPOs([]);
      saveLocalPOs([]);
      addAuditLog('Clear POs', 'Cleared all Purchase Orders');
      showToast('All Purchase Orders cleared', true);
      return;
    }

    setPOs([]);
    saveLocalPOs([]);
    addAuditLog('Clear POs', 'Cleared all Purchase Orders');
    showToast('All Purchase Orders cleared', true);
  };

  const handleToggleHoldPO = async (poNumber: string, holdStatus: boolean) => {
    if (!currentUser) return { success: false, message: 'User not logged in.' };

    const adminName = currentUser.name;
    const nowIso = new Date().toISOString();

    const updatePOsWithPOHold = (poList: PurchaseOrder[]) => poList.map(po => {
      if (po.poNumber.toUpperCase() === poNumber.toUpperCase() || po.id === poNumber) {
        const updatedItems = (po.items || []).map(item => {
          const reqQty = item.requestedQty || item.orderedQty || 0;
          const purQty = item.purchasedQty || 0;
          const isPurchased = (purQty >= reqQty && reqQty > 0) || item.purchaseStatus === 'Purchased';

          if (holdStatus) {
            if (!isPurchased) {
              return {
                ...item,
                purchaseStatus: 'Held' as const,
                holdBy: `Admin (${adminName})`,
                holdStartTime: nowIso,
                holdExpireTime: ''
              };
            }
          } else {
            if (item.purchaseStatus === 'Held' && (item.holdBy?.startsWith('Admin') || item.holdBy === adminName || po.isHeldByAdmin)) {
              const newStatus = (purQty > 0 && purQty < reqQty) ? 'Partial Purchased' as const : 'Pending' as const;
              return {
                ...item,
                purchaseStatus: newStatus,
                holdBy: '',
                holdStartTime: '',
                holdExpireTime: ''
              };
            }
          }
          return item;
        });

        let poStatus: MasterStatus = holdStatus ? 'Held' : 'Pending';
        if (!holdStatus) {
          const totalItems = updatedItems.length;
          const purchasedCount = updatedItems.filter(i => i.purchaseStatus === 'Purchased').length;
          const partialCount = updatedItems.filter(i => i.purchaseStatus === 'Partial Purchased' || (i.purchasedQty > 0 && i.purchasedQty < (i.requestedQty || i.orderedQty || 0))).length;
          if (purchasedCount === totalItems && totalItems > 0) poStatus = 'Completed';
          else if (purchasedCount > 0 || partialCount > 0) poStatus = 'Partial';
        }

        return {
          ...po,
          isHeldByAdmin: holdStatus,
          holdByAdmin: holdStatus ? adminName : '',
          adminHoldAt: holdStatus ? nowIso : '',
          purchaseStatus: poStatus,
          items: updatedItems,
          updatedAt: nowIso
        };
      }
      return po;
    });

    const updatedPOs = updatePOsWithPOHold(pos);
    setPOs(updatedPOs);
    saveLocalPOs(updatedPOs);

    // Sync to Google Sheets backend
    setIsSyncing(true);
    try {
      await apiImportPOs(updatedPOs, currentUser);
    } catch (e) {
      console.info('Hold PO sync note:', e);
    } finally {
      setIsSyncing(false);
    }

    const actionText = holdStatus ? 'Admin PO Hold' : 'Release Admin PO Hold';
    const msg = holdStatus 
      ? `PO ${poNumber} placed on Admin Hold (Items hidden from Pending List)`
      : `PO ${poNumber} released from Admin Hold (Items returned to Pending List)`;

    addAuditLog(actionText, msg, currentUser);
    showToast(msg, true);
    return { success: true, message: msg };
  };

  const handleUpdateUserAvatar = (userId: string, avatarUrl: string) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, avatar: avatarUrl } : u);
    setUsers(updatedUsers);
    saveLocalUsers(updatedUsers);
    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = { ...currentUser, avatar: avatarUrl };
      setCurrentUser(updatedCurrent);
      saveCurrentUser(updatedCurrent);
    }
    showToast('Profile photo updated successfully', true);
  };

  // Derive normalized PO list for WarehouseView so items show completed receive when warehouseQty >= purchasedQty
  const warehousePos = useMemo(() => {
    return pos.map(po => ({
      ...po,
      items: (po.items || []).map(item => ({
        ...item,
        requestedQty: (item.purchasedQty && item.purchasedQty > 0) ? item.purchasedQty : (item.requestedQty || item.orderedQty || 0)
      }))
    }));
  }, [pos]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col">
      
      {/* Navigation Header */}
      {currentUser ? (
        <Header
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginOpen(true)}
          onSync={() => loadMasterData(true)}
          isSyncing={isSyncing}
          onUpdateUserAvatar={handleUpdateUserAvatar}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onSelectAdminTab={(tab) => setAdminActiveTab(tab)}
          usersCount={users.length}
        />
      ) : (
        <header className="bg-gradient-to-r from-[#072417] via-[#0E3A24] to-[#072417] text-white border-b border-emerald-900/80 py-2 px-4 flex items-center justify-between">
          <CompanyLogo size="sm" showText={true} lightText={true} />
          <button
            onClick={() => setIsLoginOpen(true)}
            className="px-3.5 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Sign In Portal
          </button>
        </header>
      )}

      {/* Global Command Palette Search Modal (Ctrl + K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        pos={pos}
      />

      {/* Live Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50 max-w-md bg-[#072417] text-white px-4 py-3 rounded-2xl shadow-xl text-xs flex items-center gap-3 border border-emerald-800"
          >
            <div className={`w-3 h-3 rounded-full shrink-0 ${toast.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <p className="flex-1 font-medium leading-relaxed">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup / Warning Bar if WebApp URL is missing or error */}
      {apiError && !isNoticeDismissed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{apiError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadMasterData(true)}
              disabled={isSyncing}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Retry Connection</span>
            </button>
            {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
              <span className="text-[11px] text-amber-700 font-semibold underline">
                Go to Admin Dashboard -&gt; Sheets Config
              </span>
            )}
            <button
              onClick={() => setIsNoticeDismissed(true)}
              className="p-1 hover:bg-amber-200/60 rounded-md text-amber-800 transition ml-2"
              title="Dismiss Notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Subtle Non-Intrusive Notification Permission Banner */}
      {notifPermission === 'default' && !isNotifBannerDismissed && (
        <div className="bg-[#08281B] border-b border-emerald-800/80 text-emerald-100 px-3 sm:px-6 py-2 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span className="truncate font-medium text-[11px] sm:text-xs text-emerald-100">
              Enable browser notifications to receive real-time alerts for PO creations, holds, purchases, and dispatches.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEnableNotifications}
              type="button"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Bell className="w-3 h-3" />
              <span>Enable Alerts</span>
            </button>
            <button
              onClick={handleDismissNotifBanner}
              type="button"
              className="p-1 text-emerald-400 hover:text-white rounded-md transition cursor-pointer"
              title="Dismiss Notification Banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-12 w-full overflow-y-auto min-h-screen">
        {isLoading ? (
          <div className="max-w-md mx-auto my-24 p-8 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Connecting to Google Sheets Database...</h3>
            <p className="text-xs text-slate-500">Fetching live Purchase Orders, Items, and User Permissions</p>
          </div>
        ) : !currentUser ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">RL Food Operations Portal</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Google Sheets Master Database is live and operational. Please sign in to access your designated role interface.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsLoginOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
            >
              Open Authentication Dialog
            </motion.button>
          </motion.div>
        ) : (
          <div className="pt-4 px-2 sm:px-6 max-w-7xl mx-auto">
            {/* Role Specific Dashboard */}
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            }>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentUser.role}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                    <AdminDashboard
                      pos={pos}
                      users={users}
                      auditLogs={auditLogs}
                      onImportPOs={handleImportPOs}
                      onUpdateUsers={handleUpdateUsers}
                      onSync={() => loadMasterData(true)}
                      onDeletePO={handleDeletePO}
                      onClearAllPOs={handleClearAllPOs}
                      onHoldPO={handleHoldPO}
                      onReleasePO={handleReleasePO}
                      onShowToast={showToast}
                      isSyncing={isSyncing}
                      currentUser={currentUser}
                      externalActiveTab={adminActiveTab}
                      onSelectAdminTab={setAdminActiveTab}
                    />
                  )}

                  {currentUser.role === 'purchaser' && (
                    <PurchaserView
                      pos={pos}
                      currentUser={currentUser}
                      onHoldItem={handleHoldItem}
                      onReleaseHold={handleReleaseHold}
                      onRecordPurchase={handleRecordPurchase}
                      onReturnItem={handleReturnItem}
                    />
                  )}

                  {currentUser.role === 'warehouse' && (
                    <WarehouseView
                      pos={warehousePos}
                      currentUser={currentUser}
                      onReceiveComplete={handleReceiveComplete}
                    />
                  )}

                  {currentUser.role === 'dispatch' && (
                    <DispatchView
                      pos={pos}
                      currentUser={currentUser}
                      onDispatchPO={handleDispatchPO}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </div>
        )}
      </main>

      {/* Login Authentication Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        users={users}
        currentUser={currentUser}
        onLogin={handleLogin}
        onAuditLog={addAuditLog}
      />
    </div>
  );
}
