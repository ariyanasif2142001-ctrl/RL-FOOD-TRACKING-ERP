import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, PurchaseOrder, POItem, AuditLog, NotificationItem, MasterSKU, SyncStatusInfo, ThemeMode } from '../types';
import { INITIAL_USERS, INITIAL_POS, INITIAL_SKUS, INITIAL_LOGS, INITIAL_NOTIFICATIONS } from '../store/initialData';

export type ViewType = 'dashboard' | 'purchase' | 'inventory' | 'reports' | 'master-data' | 'users' | 'settings';

interface ERPContextType {
  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;

  // Auth & Roles
  currentUser: User;
  setCurrentUserRole: (role: UserRole) => void;
  users: User[];

  // Active View Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Data
  purchaseOrders: PurchaseOrder[];
  masterSKUs: MasterSKU[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;

  // Sync State
  syncInfo: SyncStatusInfo;
  triggerManualSync: () => void;

  // Actions & Workflow
  createPurchaseOrder: (newPO: Omit<PurchaseOrder, 'id' | 'status' | 'receiveStatus' | 'totalEstimatedCost' | 'totalActualCost'>) => void;
  holdItem: (poId: string, itemId: string) => void;
  releaseItem: (poId: string, itemId: string) => void;
  recordItemPurchase: (poId: string, itemId: string, purchasedQty: number, actualUnitPrice: number, receiptNumber: string, notes: string) => void;
  returnItemPurchase: (poId: string, itemId: string, reason: string) => void;
  receiveWarehouseItem: (poId: string, itemId: string, receivedQty: number, notes: string) => void;
  
  // Modals & Panels
  activeModal: 'new-po' | 'master-sku' | 'telegram' | 'system-test' | 'audit-logs' | 'sync-master' | 'setup-guides' | 'record-purchase' | 'receive-item' | 'import' | null;
  setActiveModal: (modal: 'new-po' | 'master-sku' | 'telegram' | 'system-test' | 'audit-logs' | 'sync-master' | 'setup-guides' | 'record-purchase' | 'receive-item' | 'import' | null) => void;
  selectedPOItemContext: { poId: string; item: POItem } | null;
  setSelectedPOItemContext: (ctx: { poId: string; item: POItem } | null) => void;

  // Slide-over Notification Panel
  isNotifPanelOpen: boolean;
  setIsNotifPanelOpen: (open: boolean) => void;
  markNotificationsRead: () => void;

  // PWA Prompt
  deferredPwaPrompt: any;
  handleInstallApp: () => void;

  // Toast / System Notice
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme State
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('rl_food_theme');
    return (saved as ThemeMode) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('rl_food_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('rl_food_pos');
    return saved ? JSON.parse(saved) : INITIAL_POS;
  });

  const [masterSKUs] = useState<MasterSKU[]>(() => {
    const saved = localStorage.getItem('rl_food_skus');
    return saved ? JSON.parse(saved) : INITIAL_SKUS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('rl_food_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ERPContextType['activeModal']>(null);
  const [selectedPOItemContext, setSelectedPOItemContext] = useState<{ poId: string; item: POItem } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync Timer State
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>({
    status: 'synced',
    lastSyncTime: new Date(),
    secondsAgo: 3,
    sheetsUrl: 'https://docs.google.com/spreadsheets/d/1RL_FOOD_ERP_LIVE_MASTER_SYNC',
    totalRecordsSynced: 42,
  });

  // PWA deferred prompt
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = () => {
    if (deferredPwaPrompt) {
      deferredPwaPrompt.prompt();
      deferredPwaPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          showToast('App installation initiated successfully!');
        }
        setDeferredPwaPrompt(null);
      });
    } else {
      showToast('📲 PWA application shortcut ready. Install via browser menu or PWA settings.');
    }
  };

  // Sync timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncInfo((prev) => {
        const diff = Math.floor((new Date().getTime() - prev.lastSyncTime.getTime()) / 1000);
        return { ...prev, secondsAgo: diff };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('rl_food_pos', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('rl_food_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const addAuditLog = (action: AuditLog['action'], details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action,
      details,
      user: currentUser.name,
      role: currentUser.role,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const setCurrentUserRole = (role: UserRole) => {
    const found = users.find((u) => u.role === role);
    if (found) {
      setCurrentUser(found);
      addAuditLog('LOGIN', `User switched active role profile to ${found.name} (${role.toUpperCase()})`);
      showToast(`Active profile switched to: ${found.name} (${role.toUpperCase()})`);
    }
  };

  const triggerManualSync = () => {
    setSyncInfo((prev) => ({ ...prev, status: 'syncing' }));
    setTimeout(() => {
      const now = new Date();
      setSyncInfo({
        status: 'synced',
        lastSyncTime: now,
        secondsAgo: 0,
        sheetsUrl: 'https://docs.google.com/spreadsheets/d/1RL_FOOD_ERP_LIVE_MASTER_SYNC',
        totalRecordsSynced: purchaseOrders.reduce((acc, po) => acc + po.items.length, 0),
      });
      addAuditLog('SYSTEM_SYNC', 'Manual Google Sheets sync executed. Master worksheets synchronized.');
      showToast('🟢 Google Sheets auto-synced successfully!');
    }, 900);
  };

  const holdItem = (poId: string, itemId: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== poId) return po;
        const updatedItems = po.items.map((item) => {
          if (item.id !== itemId) return item;
          if (item.purchaseStatus === 'Purchased') {
            showToast('Cannot hold an item that is already fully purchased.');
            return item;
          }
          const isHeld = item.heldBy === currentUser.name;
          if (isHeld) {
            addAuditLog('PURCHASE_RELEASE', `Released hold on ${item.name} in ${poId}`);
            showToast(`Released hold lock on ${item.name}`);
            return {
              ...item,
              heldBy: undefined,
              heldAt: undefined,
              purchaseStatus: 'Pending' as const,
            };
          } else {
            addAuditLog('PURCHASE_HOLD', `Item ${item.sku} (${item.name}) held by ${currentUser.name}`);
            showToast(`Hold lock engaged on ${item.name} by ${currentUser.name}`);
            return {
              ...item,
              heldBy: currentUser.name,
              heldAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              purchaseStatus: 'On Hold' as const,
            };
          }
        });

        const hasHold = updatedItems.some((i) => i.purchaseStatus === 'On Hold');
        const allPurchased = updatedItems.every((i) => i.purchaseStatus === 'Purchased');
        const anyPurchased = updatedItems.some((i) => i.purchaseStatus === 'Purchased');

        let newPoStatus = po.status;
        if (hasHold) newPoStatus = 'On Hold';
        else if (allPurchased) newPoStatus = 'Purchased';
        else if (anyPurchased) newPoStatus = 'Partial Purchased';
        else newPoStatus = 'Pending';

        return { ...po, items: updatedItems, status: newPoStatus };
      })
    );
  };

  const releaseItem = (poId: string, itemId: string) => {
    holdItem(poId, itemId);
  };

  const recordItemPurchase = (
    poId: string,
    itemId: string,
    purchasedQty: number,
    actualUnitPrice: number,
    receiptNumber: string,
    notes: string
  ) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== poId) return po;
        const updatedItems = po.items.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            purchasedQty,
            actualUnitPrice,
            receiptNumber,
            notes,
            purchaseStatus: 'Purchased' as const,
            purchasedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            purchaserName: currentUser.name,
            heldBy: undefined,
          };
        });

        const allPurchased = updatedItems.every((i) => i.purchaseStatus === 'Purchased');
        const anyPurchased = updatedItems.some((i) => i.purchaseStatus === 'Purchased');
        const newPoStatus = allPurchased ? 'Purchased' : anyPurchased ? 'Partial Purchased' : 'Pending';

        const totalActualCost = updatedItems.reduce(
          (acc, i) => acc + (i.purchasedQty || i.orderedQty) * (i.actualUnitPrice || i.estimatedUnitPrice),
          0
        );

        return {
          ...po,
          items: updatedItems,
          status: newPoStatus,
          totalActualCost,
        };
      })
    );

    addAuditLog('PURCHASE_SAVE', `Recorded purchase for PO ${poId}: ${purchasedQty} @ $${actualUnitPrice} (Receipt #${receiptNumber})`);
    showToast(`Purchase recorded successfully for PO ${poId}`);
  };

  const returnItemPurchase = (poId: string, itemId: string, reason: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== poId) return po;
        const updatedItems = po.items.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            purchaseStatus: 'Returned' as const,
            notes: `Returned: ${reason}`,
          };
        });
        return { ...po, items: updatedItems, status: 'Returned' };
      })
    );
    addAuditLog('PURCHASE_RETURN', `Returned item in ${poId}. Reason: ${reason}`);
    showToast(`Item returned in ${poId}`);
  };

  const receiveWarehouseItem = (poId: string, itemId: string, receivedQty: number, notes: string) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== poId) return po;
        const updatedItems = po.items.map((item) => {
          if (item.id !== itemId) return item;
          const isFull = receivedQty >= (item.purchasedQty || item.orderedQty);
          return {
            ...item,
            receivedQty,
            receiveStatus: isFull ? ('Received' as const) : ('Partial Received' as const),
            notes: notes ? `${item.notes || ''} | Recv Note: ${notes}` : item.notes,
          };
        });

        const allRecv = updatedItems.every((i) => i.receiveStatus === 'Received');
        const anyRecv = updatedItems.some((i) => i.receiveStatus === 'Received' || (i.receivedQty && i.receivedQty > 0));

        const newRecvStatus = allRecv ? 'Received' : anyRecv ? 'Partial Received' : 'Pending';

        return {
          ...po,
          items: updatedItems,
          receiveStatus: newRecvStatus,
        };
      })
    );

    addAuditLog('WAREHOUSE_RECEIVE', `Warehouse received ${receivedQty} units for item in PO ${poId}`);
    showToast(`Warehouse receive recorded for PO ${poId}`);
  };

  const createPurchaseOrder = (newPOData: Omit<PurchaseOrder, 'id' | 'status' | 'receiveStatus' | 'totalEstimatedCost' | 'totalActualCost'>) => {
    const newId = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
    const totalEst = newPOData.items.reduce((acc, i) => acc + i.orderedQty * i.estimatedUnitPrice, 0);
    const totalQty = newPOData.items.reduce((acc, i) => acc + i.orderedQty, 0);

    const createdPO: PurchaseOrder = {
      ...newPOData,
      department: newPOData.department || 'Central Kitchen',
      location: newPOData.location || 'Main Facility #1',
      id: newId,
      status: 'Pending',
      receiveStatus: 'Pending',
      totalQuantity: totalQty,
      totalEstimatedCost: totalEst,
      totalActualCost: 0,
      createdByName: currentUser.name,
      createdById: currentUser.id,
    };

    setPurchaseOrders((prev) => [createdPO, ...prev]);
    addAuditLog('PO_CREATE', `Created new Purchase Order ${newId} for supplier ${newPOData.supplier} ($${totalEst.toFixed(2)})`);
    showToast(`Purchase Order ${newId} created successfully!`);
  };

  const markNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <ERPContext.Provider
      value={{
        theme,
        toggleTheme,
        currentUser,
        setCurrentUserRole,
        users,
        currentView,
        setCurrentView,
        purchaseOrders,
        masterSKUs,
        auditLogs,
        notifications,
        unreadNotificationCount,
        syncInfo,
        triggerManualSync,
        createPurchaseOrder,
        holdItem,
        releaseItem,
        recordItemPurchase,
        returnItemPurchase,
        receiveWarehouseItem,
        activeModal,
        setActiveModal,
        selectedPOItemContext,
        setSelectedPOItemContext,
        isNotifPanelOpen,
        setIsNotifPanelOpen,
        markNotificationsRead,
        deferredPwaPrompt,
        handleInstallApp,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) throw new Error('useERP must be used within an ERPProvider');
  return context;
};
