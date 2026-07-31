import { getAppConfig } from '../config/appConfig';
import { User, PurchaseOrder, AuditLog } from '../types';
import { getCurrentUser } from './storage';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

export async function postApi<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResponse<T>> {
  const config = getAppConfig();
  const url = config.webAppUrl;

  if (!url || url.trim() === '') {
    return {
      success: false,
      message: 'Google Apps Script Web App URL is not configured. Please configure it in Settings.',
      timestamp: new Date().toISOString()
    };
  }

  const activeUser = payload.user || getCurrentUser();
  const token = payload.token || payload.user?.token || activeUser?.token;

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Standard CORS workaround for Apps Script Web App
      },
      body: JSON.stringify({
        action,
        token,
        user: activeUser,
        ...payload,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return {
      success: json.success ?? json.status === 'success',
      message: json.message || 'Operation executed',
      data: json.data !== undefined ? json.data : json,
      timestamp: json.timestamp || new Date().toISOString()
    };
  } catch (error: unknown) {
    console.info(`[Google Sheets API] Connection note for action ${action}:`, (error as Error)?.message || 'Failed to fetch');
    return {
      success: false,
      message: (error as Error)?.message || 'Network error connecting to Google Sheets Web App. Please verify Web App URL in settings.',
      timestamp: new Date().toISOString()
    };
  }
}

export async function getApi<T = unknown>(action: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
  const config = getAppConfig();
  let url = config.webAppUrl;

  if (!url || url.trim() === '') {
    return {
      success: false,
      message: 'Google Apps Script Web App URL is not configured.',
      timestamp: new Date().toISOString()
    };
  }

  const queryParams = new URLSearchParams({ action, ...params }).toString();
  const fullUrl = `${url}?${queryParams}`;

  try {
    const response = await fetch(fullUrl, { method: 'GET', signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const json = await response.json();
    return {
      success: json.success ?? json.status === 'success',
      message: json.message || 'Fetch successful',
      data: json.data !== undefined ? json.data : json,
      timestamp: json.timestamp || new Date().toISOString()
    };
  } catch (error: unknown) {
    console.info(`[Google Sheets API] GET connection note for action ${action}:`, (error as Error)?.message || 'Failed to fetch');
    return {
      success: false,
      message: (error as Error)?.message || 'Network error.',
      timestamp: new Date().toISOString()
    };
  }
}

// API Service functions
export async function apiLogin(username: string, password: string): Promise<ApiResponse<{ user: User }>> {
  return postApi<{ user: User }>('LOGIN', { username, password });
}

export async function apiFetchUsers(): Promise<ApiResponse<{ users: User[] }>> {
  return postApi<{ users: User[] }>('USERS', { subAction: 'GET_ALL' });
}

export async function apiUpdateUsers(users: User[], currentUser?: User): Promise<ApiResponse<any>> {
  return postApi('USERS', { subAction: 'UPDATE_USERS', users, user: currentUser });
}

export async function apiFetchPOs(user?: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PO_LIST', { user });
}

export async function apiImportPOs(pos: PurchaseOrder[], user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PO_IMPORT', { pos, user });
}

export async function apiHoldItem(itemId: string, user: User, holdStartTime?: string, holdExpireTime?: string): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_HOLD', { itemId, user, holdStartTime, holdExpireTime });
}

export async function apiReleaseHold(itemId: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_RELEASE', { itemId, user });
}

export async function apiSavePurchase(
  itemId: string,
  purchasedQty: number,
  notes: string,
  user: User
): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_SAVE', { itemId, purchasedQty, notes, user });
}

export async function apiReturnItem(itemId: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  const res = await postApi<{ pos: PurchaseOrder[] }>('PURCHASE_RETURN', { itemId, user });
  if (!res.success) {
    // Try PURCHASE_SAVE with purchasedQty = 0 as fallback for Google Apps Script Web Apps
    return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_SAVE', { itemId, purchasedQty: 0, notes: 'Returned to pending', user });
  }
  return res;
}

export async function apiFetchWarehouseList(): Promise<ApiResponse<any>> {
  return postApi('WAREHOUSE_LIST');
}

export async function apiReceiveItem(itemId: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('WAREHOUSE_RECEIVE', { itemId, user });
}

export async function apiFetchDispatchList(): Promise<ApiResponse<any>> {
  return postApi('DISPATCH_LIST');
}

export async function apiFetchDashboard(): Promise<ApiResponse<any>> {
  return postApi('DASHBOARD');
}

export async function apiFetchActivityLogs(): Promise<ApiResponse<{ logs: AuditLog[] }>> {
  return postApi<{ logs: AuditLog[] }>('ACTIVITY');
}

export async function apiHoldPO(poNumber: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PO_HOLD', { poNumber, user });
}

export async function apiReleasePO(poNumber: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PO_RELEASE', { poNumber, user });
}

export async function apiDeletePO(poNumber: string, user?: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PO_DELETE', { poNumber, user });
}

export async function apiClearAllPOs(user?: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  return postApi<{ pos: PurchaseOrder[] }>('PO_CLEAR_ALL', { user });
}

export async function apiFetchConfig(): Promise<ApiResponse<any>> {
  return getApi('CONFIG');
}
