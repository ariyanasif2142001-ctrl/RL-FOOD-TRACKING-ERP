export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  allInOneGroupMode?: boolean;
  silentMode?: boolean;
  includeWebAppLink?: boolean;
  webAppDisplayUrl?: string;
  interactiveBot?: {
    enabled: boolean;
    lastOffset?: number;
  };
  autoSchedule?: {
    enabled: boolean;
    time1: string; // e.g. "09:00"
    time2: string; // e.g. "20:00"
    reportType: 'summary' | 'pending' | 'hold' | 'all';
  };
  notifyEvents: {
    onNewPO: boolean;
    onItemHold: boolean;
    onPurchased: boolean;
    onWarehouseReceived: boolean;
    onDispatched: boolean;
    onPoImport?: boolean;
    onActivityLog?: boolean;
    onDailySummary?: boolean;
  };
}

export interface AppConfig {
  appName: string;
  appVersion: string;
  spreadsheetId: string;
  webAppUrl: string;
  sheetNames: {
    users: string;
    poMaster: string;
    poItems: string;
    receiveSummary: string;
    activityLog: string;
  };
  holdTimeMs: number;
  telegramConfig?: TelegramConfig;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: 'RL Food Purchase Tracking System',
  appVersion: '1.0.0',
  spreadsheetId: '',
  webAppUrl: '',
  sheetNames: {
    users: 'USERS',
    poMaster: 'PO_MASTER',
    poItems: 'PO_ITEMS',
    receiveSummary: 'RECEIVE_SUMMARY',
    activityLog: 'ACTIVITY_LOG'
  },
  holdTimeMs: 5 * 60 * 60 * 1000, // 5 hours
  telegramConfig: {
    enabled: true,
    botToken: '',
    chatId: '',
    allInOneGroupMode: true,
    silentMode: false,
    includeWebAppLink: true,
    webAppDisplayUrl: 'https://rlfood-tracking-erp.netlify.app/',
    interactiveBot: {
      enabled: true,
      lastOffset: 0
    },
    autoSchedule: {
      enabled: true,
      time1: '09:00',
      time2: '20:00',
      reportType: 'all'
    },
    notifyEvents: {
      onNewPO: true,
      onItemHold: true,
      onPurchased: true,
      onWarehouseReceived: true,
      onDispatched: true,
      onPoImport: true,
      onActivityLog: true,
      onDailySummary: true
    }
  }
};

const CONFIG_STORAGE_KEY = 'rl_food_app_config';
const GLOBAL_URL_KEY = 'rl_global_webapp_url';
const SHARED_APP_CONFIG_KEY = 'rl_shared_app_config';

export function getAppConfig(): AppConfig {
  let storedConfig: Partial<AppConfig> = {};
  
  // 1. Try primary config storage
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      storedConfig = JSON.parse(stored);
    } catch {
      // fallback
    }
  }

  // 2. Try shared app config
  if (!storedConfig.webAppUrl) {
    const shared = localStorage.getItem(SHARED_APP_CONFIG_KEY);
    if (shared) {
      try {
        const parsedShared = JSON.parse(shared);
        if (parsedShared.webAppUrl) {
          storedConfig.webAppUrl = parsedShared.webAppUrl;
        }
      } catch {
        // fallback
      }
    }
  }

  // 3. Fallback to global webAppUrl string
  if (!storedConfig.webAppUrl) {
    const globalUrl = localStorage.getItem(GLOBAL_URL_KEY) || sessionStorage.getItem(GLOBAL_URL_KEY);
    if (globalUrl) {
      storedConfig.webAppUrl = globalUrl;
    }
  }

  // Sanitize stored webAppUrl (must be Google Apps Script endpoint, not netlify site)
  if (storedConfig.webAppUrl && storedConfig.webAppUrl.includes('netlify.app')) {
    storedConfig.webAppUrl = '';
  }

  const mergedTelegram = {
    ...DEFAULT_APP_CONFIG.telegramConfig,
    ...(storedConfig.telegramConfig || {}),
    notifyEvents: {
      onNewPO: true,
      onItemHold: true,
      onPurchased: true,
      onWarehouseReceived: true,
      onDispatched: true,
      onPoImport: true,
      onActivityLog: true,
      onDailySummary: true,
      ...(DEFAULT_APP_CONFIG.telegramConfig?.notifyEvents || {}),
      ...(storedConfig.telegramConfig?.notifyEvents || {})
    }
  };
  if (mergedTelegram.enabled === undefined || mergedTelegram.enabled === null) {
    mergedTelegram.enabled = true;
  }
  if (!mergedTelegram.botToken) {
    mergedTelegram.botToken = DEFAULT_APP_CONFIG.telegramConfig?.botToken || '';
  }
  if (!mergedTelegram.chatId) {
    mergedTelegram.chatId = DEFAULT_APP_CONFIG.telegramConfig?.chatId || '';
  }

  return {
    ...DEFAULT_APP_CONFIG,
    ...storedConfig,
    telegramConfig: mergedTelegram as TelegramConfig
  };
}

export function saveAppConfig(config: Partial<AppConfig>): AppConfig {
  const current = getAppConfig();
  const updated = { ...current, ...config };

  // Save to primary storage
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));

  // Save webAppUrl globally if provided
  if (updated.webAppUrl) {
    localStorage.setItem(GLOBAL_URL_KEY, updated.webAppUrl);
    localStorage.setItem(SHARED_APP_CONFIG_KEY, JSON.stringify(updated));
    try {
      sessionStorage.setItem(GLOBAL_URL_KEY, updated.webAppUrl);
    } catch {}
  }

  // Broadcast to other tabs & windows
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('rl_app_config_sync');
      channel.postMessage(updated);
      channel.close();
    } catch (e) {
      // ignore
    }
  }

  // Dispatch custom window event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rl_app_config_updated', { detail: updated }));
  }

  return updated;
}

