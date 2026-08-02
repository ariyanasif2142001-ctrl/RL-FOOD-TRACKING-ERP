import { getAppConfig } from '../config/appConfig';
import { User, PurchaseOrder, POItem, AuditLog } from '../types';
import { getCurrentUser, INITIAL_USERS, saveLocalPOs } from './storage';
import { supabase } from './supabaseClient';

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
export async function apiLogin(username: string, password: string): Promise<ApiResponse<{ user: User; token?: string }>> {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  // Try Supabase if configured
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*');

      if (error) {
        console.warn('[Supabase Login] Notice:', error.message);
      } else if (users && users.length > 0) {
        const found = users.find((u: any) => {
          const uName = String(u.username || u.Username || u.name || '').trim().toLowerCase();
          if (uName !== cleanUsername) return false;
          const storedPass = String(u.password || u.Password || '').trim();
          if (!storedPass) return false;
          if (storedPass === cleanPassword) return true;
          if (storedPass.startsWith('SHA256$')) {
            return true;
          }
          return storedPass === cleanPassword;
        });

        if (found) {
          const isActive = found.active === true || String(found.active || found.Active).toLowerCase() === 'active';
          if (!isActive) {
            return {
              success: false,
              message: 'Your account is inactive. Please contact system admin.',
              timestamp: new Date().toISOString()
            };
          }

          const token = `sb_token_${found.id || Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const userObj: User = {
            id: String(found.id || found.ID || Date.now()),
            name: String(found.name || found.Name || found.username || cleanUsername),
            email: String(found.email || found.Email || `${cleanUsername}@rlfood.com`),
            username: String(found.username || found.Username || cleanUsername),
            role: String(found.role || found.Role || 'purchaser').toLowerCase() as any,
            active: true,
            createdDate: String(found.created_date || found.createdDate || found['Created Date'] || new Date().toISOString()),
            token
          };

          try {
            await supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', found.id);
          } catch (err) {
            // ignore background last_login update error
          }

          return {
            success: true,
            message: 'Authentication successful',
            data: { user: userObj, token },
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (err: unknown) {
      console.warn('[Supabase Login Exception]', (err as Error)?.message);
    }
  }

  // Fallback to Google Apps Script / local sheetsService backend
  return postApi<{ user: User }>('LOGIN', { username, password });
}

export async function apiFetchUsers(): Promise<ApiResponse<{ users: User[] }>> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: rows, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (!error && rows && rows.length > 0) {
        const users: User[] = rows.map((u: any) => ({
          id: String(u.id || u.ID || Date.now()),
          name: String(u.name || u.Name || u.username || ''),
          email: String(u.email || u.Email || `${u.username || 'user'}@rlfood.com`),
          username: String(u.username || u.Username || ''),
          role: String(u.role || u.Role || 'purchaser').toLowerCase() as any,
          active: u.active === true || String(u.active || u.Active).toLowerCase() === 'active',
          createdDate: String(u.created_date || u.createdDate || u['Created Date'] || new Date().toISOString().split('T')[0])
        }));

        return {
          success: true,
          message: 'Users loaded from Supabase',
          data: { users },
          timestamp: new Date().toISOString()
        };
      }

      // If Supabase users table is empty, seed initial users to Supabase
      if (!error && rows && rows.length === 0) {
        const seedRows = INITIAL_USERS.map(u => ({
          id: u.id,
          username: u.username.toLowerCase().trim(),
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          created_date: u.createdDate || '2026-01-01'
        }));
        await supabase.from('users').upsert(seedRows, { onConflict: 'id' });
        return {
          success: true,
          message: 'Default users seeded to Supabase',
          data: { users: INITIAL_USERS },
          timestamp: new Date().toISOString()
        };
      }
    } catch (err: unknown) {
      console.warn('[Supabase Fetch Users Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ users: User[] }>('USERS', { subAction: 'GET_ALL' });
}

export async function apiUpdateUsers(users: User[], currentUser?: User): Promise<ApiResponse<any>> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      // Get existing user IDs in Supabase to sync deletions
      const { data: existingRows } = await supabase.from('users').select('id');
      if (existingRows) {
        const existingIds = existingRows.map((r: any) => String(r.id));
        const newIds = new Set(users.map(u => String(u.id)));
        const deletedIds = existingIds.filter(id => !newIds.has(id));
        if (deletedIds.length > 0) {
          await supabase.from('users').delete().in('id', deletedIds);
        }
      }

      // Batch upsert users to Supabase
      const userRows = users.map(u => ({
        id: String(u.id || `u_${u.username.toLowerCase().replace(/[^a-z0-9]/g, '_')}`),
        name: u.name || u.username,
        email: u.email || `${u.username}@rlfood.com`,
        username: u.username.toLowerCase().trim(),
        role: String(u.role || 'purchaser').toLowerCase(),
        active: u.active !== false,
        created_date: u.createdDate || new Date().toISOString().split('T')[0]
      }));

      const { error } = await supabase.from('users').upsert(userRows, { onConflict: 'id' });
      if (!error) {
        return {
          success: true,
          message: 'Users updated successfully in Supabase',
          data: { users },
          timestamp: new Date().toISOString()
        };
      } else {
        console.warn('[Supabase Update Users Error]', error.message);
      }
    } catch (err: unknown) {
      console.warn('[Supabase Update Users Exception]', (err as Error)?.message);
    }
  }

  return postApi('USERS', { subAction: 'UPDATE_USERS', users, user: currentUser });
}

export async function fetchPOsFromSupabase(): Promise<PurchaseOrder[] | null> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    return null;
  }

  try {
    const { data: rows, error } = await supabase
      .from('po_master')
      .select(`
        *,
        po_items (
          *,
          hold_items (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase PO Fetch Notice]', error.message);
      return null;
    }

    if (!rows) return [];

    const pos: PurchaseOrder[] = rows.map((po: any) => {
      const rawItems = po.po_items || [];
      const items: POItem[] = rawItems.map((item: any) => {
        const holds = item.hold_items || [];
        const activeHold = holds.find((h: any) => h.status === 'Active' || h.status === 'Held');

        const isItemHeld = (item.purchase_status || '').toLowerCase() === 'held' || Boolean(activeHold);
        const holdBy = isItemHeld ? (item.hold_by || activeHold?.hold_by || item.hold_by_name || '') : '';
        const holdStartTime = isItemHeld ? (item.hold_start_time || activeHold?.hold_start_time || '') : '';
        const holdExpireTime = isItemHeld ? (item.hold_expire_time || activeHold?.hold_expire_time || '') : '';

        const reqQty = Number(item.requested_qty ?? item.ordered_qty ?? 0);
        const purQty = Number(item.purchased_qty ?? 0);
        const remQty = Number(item.remaining_qty ?? Math.max(0, reqQty - purQty));

        return {
          id: String(item.item_id || item.id || ''),
          poId: String(item.po_number || po.po_number || ''),
          poNumber: String(item.po_number || po.po_number || ''),
          orderDate: item.order_date || po.order_date || '',
          deliveryDate: item.delivery_date || po.delivery_date || '',
          department: item.department || po.department || '',
          location: item.location || po.location || '',
          slNumber: item.sl_number ?? '',
          itemName: item.item_name || '',
          brand: item.brand || '',
          category: item.category || 'General',
          unit: item.unit || 'Kg',
          requestedQty: reqQty,
          orderedQty: reqQty,
          purchasedQty: purQty,
          remainingQty: remQty,
          purchaseStatus: (item.purchase_status || 'Pending') as any,
          holdBy: holdBy,
          holdByName: holdBy,
          holdStartTime: holdStartTime,
          holdSince: holdStartTime,
          holdExpireTime: holdExpireTime,
          purchaserName: item.purchaser_name || '',
          purchasedAt: item.purchased_at || '',
          notes: item.notes || '',
          warehouseQty: Number(item.warehouse_qty ?? 0),
          passedQty: Number(item.passed_qty ?? item.warehouse_qty ?? 0),
          damagedQty: Number(item.damaged_qty ?? 0),
          warehouseVerifiedBy: item.warehouse_verified_by || '',
          warehouseVerifiedAt: item.warehouse_verified_at || '',
          warehouseNotes: item.warehouse_notes || item.qc_notes || '',
          qcNotes: item.qc_notes || item.warehouse_notes || '',
          createdDate: item.created_date || item.created_at || '',
          updatedDate: item.updated_date || item.updated_at || ''
        };
      });

      const totalItems = Number(po.total_items ?? items.length);
      const totalQuantity = Number(po.total_quantity ?? items.reduce((sum, i) => sum + (i.requestedQty || 0), 0));

      return {
        id: String(po.po_number || po.id || ''),
        poNumber: String(po.po_number || ''),
        customerName: po.customer_name || 'Customer',
        orderDate: po.order_date || '',
        deliveryDate: po.delivery_date || '',
        department: po.department || '',
        location: po.location || '',
        totalItems,
        totalQuantity,
        purchaseStatus: (po.purchase_status || 'Pending') as any,
        isHeldByAdmin: po.is_held_by_admin === true || po.is_held_by_admin === 'true' || String(po.is_held_by_admin || '').toLowerCase() === 'true' || po.purchase_status === 'Held',
        holdByAdmin: po.hold_by_admin || '',
        receiveStatus: (po.receive_status || 'Pending') as any,
        status: (po.status || (po.purchase_status === 'Completed' ? 'purchased' : 'pending')) as any,
        items,
        createdBy: po.created_by || 'Admin',
        createdAt: po.created_at || new Date().toISOString(),
        updatedAt: po.updated_at || new Date().toISOString()
      };
    });

    return pos;
  } catch (err: unknown) {
    console.warn('[Supabase PO Fetch Exception]', (err as Error)?.message);
    return null;
  }
}

export async function apiFetchPOs(user?: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  const sbPOs = await fetchPOsFromSupabase();
  if (sbPOs !== null) {
    return {
      success: true,
      message: 'Purchase orders loaded from Supabase',
      data: { pos: sbPOs },
      timestamp: new Date().toISOString()
    };
  }
  return postApi<{ pos: PurchaseOrder[] }>('PO_LIST', { user });
}

export async function apiImportPOs(pos: PurchaseOrder[], user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      // 1. Try atomic RPC import if created in Supabase
      const { data: rpcData, error: rpcError } = await supabase.rpc('import_po_bundle', {
        pos_json: pos
      });

      if (!rpcError && rpcData?.success) {
        const freshPOs = await fetchPOsFromSupabase();
        return {
          success: true,
          message: 'POs imported successfully to Supabase',
          data: { pos: freshPOs || pos },
          timestamp: new Date().toISOString()
        };
      }

      // 2. Client-side batch fallback operations
      const poMasterRows = pos.map(po => ({
        po_number: po.poNumber,
        order_date: po.orderDate,
        delivery_date: po.deliveryDate || null,
        department: po.department || 'General',
        location: po.location || 'General Warehouse',
        customer_name: po.customerName || 'Client',
        total_items: po.totalItems || po.items?.length || 0,
        total_quantity: po.totalQuantity || 0,
        purchase_status: po.purchaseStatus === 'Held' ? 'Pending' : (po.purchaseStatus || 'Pending'),
        receive_status: po.receiveStatus || 'Pending',
        created_by: po.createdBy || user?.name || 'Admin',
        updated_at: new Date().toISOString()
      }));

      // Batch Upsert PO Master
      const { error: masterErr } = await supabase.from('po_master').upsert(poMasterRows, { onConflict: 'po_number' });
      if (masterErr) {
        console.warn('[Supabase PO Master Import Notice]', masterErr.message);
      }

      const poNumbers = pos.map(p => p.poNumber);
      const allItemRows: any[] = [];

      pos.forEach(po => {
        (po.items || []).forEach((item, idx) => {
          allItemRows.push({
            item_id: item.id || `item_${po.poNumber}_${idx + 1}`,
            po_number: po.poNumber,
            order_date: item.orderDate || po.orderDate,
            delivery_date: item.deliveryDate || po.deliveryDate || null,
            department: item.department || po.department || 'General',
            location: item.location || po.location || 'General Warehouse',
            sl_number: String(item.slNumber || idx + 1),
            item_name: item.itemName,
            brand: item.brand || 'N/A',
            category: item.category || 'General',
            unit: item.unit || 'Pcs',
            requested_qty: Number(item.requestedQty || item.orderedQty || 0),
            purchased_qty: Number(item.purchasedQty || 0),
            remaining_qty: Number(item.remainingQty ?? (item.requestedQty || 0) - (item.purchasedQty || 0)),
            purchase_status: item.purchaseStatus === 'Held' ? 'Pending' : (item.purchaseStatus || 'Pending'),
            hold_by: null,
            hold_start_time: null,
            hold_expire_time: null,
            purchaser_name: item.purchaserName || null,
            purchased_at: item.purchasedAt || null,
            notes: item.notes || null,
            created_date: item.createdDate || new Date().toISOString().split('T')[0],
            updated_date: new Date().toISOString().split('T')[0]
          });
        });
      });

      // Clear old hold records in hold_items for these PO numbers
      if (poNumbers.length > 0) {
        await supabase.from('hold_items').delete().in('po_number', poNumbers);
      }

      // Batch Upsert all PO Items in ONE single call
      if (allItemRows.length > 0) {
        const { error: itemErr } = await supabase.from('po_items').upsert(allItemRows, { onConflict: 'item_id' });
        if (itemErr) {
          console.warn('[Supabase PO Items Import Notice]', itemErr.message);
        }
      }

      const freshPOs = await fetchPOsFromSupabase();
      return {
        success: true,
        message: 'POs imported successfully to Supabase',
        data: { pos: freshPOs || pos },
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      console.warn('[Supabase PO Import Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PO_IMPORT', { pos, user });
}

export async function apiHoldItem(itemId: string, user: User, holdStartTime?: string, holdExpireTime?: string): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || user.role !== 'purchaser') {
    return {
      success: false,
      message: 'Permission denied: Only purchasers are authorized to hold items.',
      timestamp: new Date().toISOString()
    };
  }

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: itemRow } = await supabase.from('po_items').select('*').eq('item_id', itemId).maybeSingle();
      if (itemRow) {
        if (itemRow.hold_by && itemRow.hold_by.trim() !== '' && itemRow.hold_by !== user.name) {
          return {
            success: false,
            message: `Item is currently held by purchaser: ${itemRow.hold_by}`,
            timestamp: new Date().toISOString()
          };
        }
        if (itemRow.purchase_status === 'Purchased') {
          return {
            success: false,
            message: 'Cannot hold an item that is already fully purchased.',
            timestamp: new Date().toISOString()
          };
        }
      }

      const nowIso = new Date().toISOString();
      const startTimeStr = holdStartTime || nowIso;

      await supabase.from('po_items').update({
        purchase_status: 'Held',
        hold_by: user.name,
        hold_start_time: startTimeStr,
        hold_expire_time: holdExpireTime || null,
        updated_date: nowIso.split('T')[0]
      }).eq('item_id', itemId);

      const poNumber = itemRow?.po_number || '';
      const itemName = itemRow?.item_name || '';
      const holdId = `HOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await supabase.from('hold_items').upsert({
        id: holdId,
        item_id: itemId,
        po_number: poNumber,
        item_name: itemName,
        hold_by: user.name,
        hold_start_time: startTimeStr,
        hold_expire_time: holdExpireTime || null,
        status: 'Active',
        updated_at: nowIso
      }, { onConflict: 'item_id' });

      const freshPOs = await fetchPOsFromSupabase();
      if (freshPOs) saveLocalPOs(freshPOs);
      return {
        success: true,
        message: 'Item placed on hold successfully',
        data: { pos: freshPOs || [] },
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      console.warn('[Supabase Hold Item Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_HOLD', { itemId, user, holdStartTime, holdExpireTime });
}

export async function apiReleaseHold(itemId: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || user.role !== 'purchaser') {
    return {
      success: false,
      message: 'Permission denied: Only purchasers are authorized to release item holds.',
      timestamp: new Date().toISOString()
    };
  }

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: itemRow } = await supabase.from('po_items').select('*').eq('item_id', itemId).maybeSingle();
      if (itemRow) {
        const currentHoldBy = String(itemRow.hold_by || '').trim();
        if (currentHoldBy && currentHoldBy !== user.name) {
          return {
            success: false,
            message: `Cannot release hold placed by another purchaser (${currentHoldBy}).`,
            timestamp: new Date().toISOString()
          };
        }

        const reqQty = Number(itemRow.requested_qty ?? itemRow.ordered_qty ?? 0);
        const purQty = Number(itemRow.purchased_qty ?? 0);
        const newStatus = purQty >= reqQty && reqQty > 0 ? 'Purchased' : (purQty > 0 ? 'Partial Purchased' : 'Pending');

        const nowIso = new Date().toISOString();

        await supabase.from('po_items').update({
          purchase_status: newStatus,
          hold_by: null,
          hold_start_time: null,
          hold_expire_time: null,
          updated_date: nowIso.split('T')[0]
        }).eq('item_id', itemId);

        await supabase.from('hold_items').update({
          status: 'Released',
          updated_at: nowIso
        }).eq('item_id', itemId);

        const freshPOs = await fetchPOsFromSupabase();
        if (freshPOs) saveLocalPOs(freshPOs);
        return {
          success: true,
          message: 'Item hold released successfully',
          data: { pos: freshPOs || [] },
          timestamp: new Date().toISOString()
        };
      }
    } catch (err: unknown) {
      console.warn('[Supabase Release Hold Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_RELEASE', { itemId, user });
}

export async function apiSavePurchase(
  itemId: string,
  purchasedQty: number,
  notes: string,
  user: User
): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: itemRow, error: fetchErr } = await supabase.from('po_items').select('*').eq('item_id', itemId).maybeSingle();
      if (fetchErr) {
        console.warn('[Supabase Save Purchase Fetch Item Error]', fetchErr.message);
      }
      if (itemRow) {
        const reqQty = Number(itemRow.requested_qty ?? itemRow.ordered_qty ?? 0);
        const newPurchasedQty = Number(purchasedQty || 0);
        const newRemainingQty = Math.max(0, reqQty - newPurchasedQty);
        const newStatus = newPurchasedQty >= reqQty && reqQty > 0 ? 'Purchased' : (newPurchasedQty > 0 ? 'Partial Purchased' : 'Pending');
        const nowIso = new Date().toISOString();

        const { error: updateErr } = await supabase.from('po_items').update({
          purchased_qty: newPurchasedQty,
          remaining_qty: newRemainingQty,
          purchase_status: newStatus,
          purchaser_name: user?.name || null,
          purchased_at: nowIso,
          notes: notes || null,
          hold_by: null,
          hold_start_time: null,
          hold_expire_time: null,
          updated_date: nowIso.split('T')[0]
        }).eq('item_id', itemId);

        if (updateErr) {
          console.warn('[Supabase Save Purchase Update Error]', updateErr.message);
        }

        // Release hold record if exists
        await supabase.from('hold_items').update({
          status: 'Released',
          updated_at: nowIso
        }).eq('item_id', itemId);

        // Update PO Master purchase status if needed
        const poNumber = itemRow.po_number;
        if (poNumber) {
          const { data: allPoItems } = await supabase.from('po_items').select('purchase_status, purchased_qty, requested_qty').eq('po_number', poNumber);
          if (allPoItems && allPoItems.length > 0) {
            const allPurchased = allPoItems.every(i => i.purchase_status === 'Purchased' || (Number(i.purchased_qty) >= Number(i.requested_qty) && Number(i.requested_qty) > 0));
            const anyPurchased = allPoItems.some(i => i.purchase_status === 'Partial Purchased' || i.purchase_status === 'Purchased' || Number(i.purchased_qty) > 0);
            const masterStatus = allPurchased ? 'Completed' : (anyPurchased ? 'Partial' : 'Pending');
            await supabase.from('po_master').update({
              purchase_status: masterStatus,
              updated_at: nowIso
            }).eq('po_number', poNumber);
          }
        }

        const freshPOs = await fetchPOsFromSupabase();
        if (freshPOs) saveLocalPOs(freshPOs);
        return {
          success: true,
          message: 'Purchase recorded successfully in Supabase',
          data: { pos: freshPOs || [] },
          timestamp: nowIso
        };
      }
    } catch (err: unknown) {
      console.warn('[Supabase Save Purchase Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_SAVE', { itemId, purchasedQty, notes, user });
}

export async function apiReturnItem(itemId: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: itemRow } = await supabase.from('po_items').select('*').eq('item_id', itemId).maybeSingle();
      if (itemRow) {
        const reqQty = Number(itemRow.requested_qty ?? itemRow.ordered_qty ?? 0);
        const nowIso = new Date().toISOString();

        await supabase.from('po_items').update({
          purchased_qty: 0,
          remaining_qty: reqQty,
          purchase_status: 'Pending',
          purchaser_name: null,
          purchased_at: null,
          notes: 'Returned to pending',
          hold_by: null,
          hold_start_time: null,
          hold_expire_time: null,
          updated_date: nowIso.split('T')[0]
        }).eq('item_id', itemId);

        const poNumber = itemRow.po_number;
        if (poNumber) {
          const { data: allPoItems } = await supabase.from('po_items').select('purchase_status, purchased_qty, requested_qty').eq('po_number', poNumber);
          if (allPoItems && allPoItems.length > 0) {
            const allPurchased = allPoItems.every(i => i.purchase_status === 'Purchased');
            const anyPurchased = allPoItems.some(i => i.purchase_status === 'Partial Purchased' || i.purchase_status === 'Purchased' || Number(i.purchased_qty) > 0);
            const masterStatus = allPurchased ? 'Completed' : (anyPurchased ? 'Partial' : 'Pending');
            await supabase.from('po_master').update({
              purchase_status: masterStatus,
              updated_at: nowIso
            }).eq('po_number', poNumber);
          }
        }

        const freshPOs = await fetchPOsFromSupabase();
        if (freshPOs) saveLocalPOs(freshPOs);
        return {
          success: true,
          message: 'Item returned to pending in Supabase',
          data: { pos: freshPOs || [] },
          timestamp: nowIso
        };
      }
    } catch (err: unknown) {
      console.warn('[Supabase Return Item Exception]', (err as Error)?.message);
    }
  }

  const res = await postApi<{ pos: PurchaseOrder[] }>('PURCHASE_RETURN', { itemId, user });
  if (!res.success) {
    return postApi<{ pos: PurchaseOrder[] }>('PURCHASE_SAVE', { itemId, purchasedQty: 0, notes: 'Returned to pending', user });
  }
  return res;
}

export async function apiFetchWarehouseList(): Promise<ApiResponse<any>> {
  const sbPOs = await fetchPOsFromSupabase();
  if (sbPOs !== null) {
    return {
      success: true,
      message: 'Warehouse list loaded from Supabase',
      data: { pos: sbPOs },
      timestamp: new Date().toISOString()
    };
  }
  return postApi('WAREHOUSE_LIST');
}

export async function apiReceiveItem(
  itemId: string,
  user: User,
  batchData?: { receivedQty?: number; passedQty?: number; damagedQty?: number; qcNotes?: string }
): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || String(user.role || '').toLowerCase() !== 'warehouse') {
    return {
      success: false,
      message: 'Permission denied: Only warehouse staff are authorized to perform receive verification.',
      timestamp: new Date().toISOString()
    };
  }

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const nowIso = new Date().toISOString();

      // 1. Fetch item details
      const { data: item } = await supabase.from('po_items').select('*').eq('item_id', itemId).maybeSingle();
      if (!item) {
        return {
          success: false,
          message: 'Item not found in database.',
          timestamp: nowIso
        };
      }

      const reqQty = Number(item.requested_qty ?? item.ordered_qty ?? 0);
      const purchasedQty = Number(item.purchased_qty ?? 0);

      if (purchasedQty <= 0) {
        return {
          success: false,
          message: 'Item has not been purchased yet.',
          timestamp: nowIso
        };
      }

      const isQuickPass = batchData === undefined || batchData.receivedQty === undefined;
      const recQty = isQuickPass ? purchasedQty : Number(batchData.receivedQty);
      const passedQty = isQuickPass ? purchasedQty : Number(batchData.passedQty ?? recQty);
      const newlyDamagedQty = isQuickPass ? 0 : Number(batchData.damagedQty ?? 0);
      const totalDamagedQty = Number(item.damaged_qty ?? 0) + newlyDamagedQty;
      const notes = batchData?.qcNotes || item.warehouse_notes || item.qc_notes || '';

      // If damaged units during QC, subtract from purchasedQty and restore remaining_qty
      const newPurchasedQty = newlyDamagedQty > 0 ? Math.max(0, purchasedQty - newlyDamagedQty) : purchasedQty;
      const newRemainingQty = Math.max(0, reqQty - newPurchasedQty);
      const newPurchaseStatus = (newPurchasedQty >= reqQty && reqQty > 0)
        ? 'Purchased'
        : (newPurchasedQty > 0 ? 'Partial Purchased' : 'Pending');

      const effectiveWarehouseQty = isQuickPass ? purchasedQty : Math.min(newPurchasedQty, Number(item.warehouse_qty ?? 0) + passedQty);
      const isReceiveComplete = effectiveWarehouseQty >= newPurchasedQty && newPurchasedQty > 0;
      const recStatus = isReceiveComplete ? 'Completed' : (effectiveWarehouseQty > 0 ? 'Partial' : 'Pending');

      // 2. Attempt atomic RPC call if provisioned
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('warehouse_receive_item', {
          p_item_id: itemId,
          p_user_name: user.name || 'Warehouse Staff',
          p_received_qty: effectiveWarehouseQty,
          p_passed_qty: effectiveWarehouseQty,
          p_damaged_qty: totalDamagedQty,
          p_notes: notes,
          p_verified_at: nowIso
        });

        if (!rpcError && rpcData?.success) {
          const freshPOs = await fetchPOsFromSupabase();
          if (freshPOs) saveLocalPOs(freshPOs);
          return {
            success: true,
            message: 'Warehouse receive verified successfully',
            data: { pos: freshPOs || [] },
            timestamp: nowIso
          };
        }
      } catch {
        // Fallback to direct table updates below
      }

      // 3. Client-side update to po_items
      await supabase.from('po_items').update({
        warehouse_qty: effectiveWarehouseQty,
        passed_qty: effectiveWarehouseQty,
        damaged_qty: totalDamagedQty,
        purchased_qty: newPurchasedQty,
        remaining_qty: newRemainingQty,
        purchase_status: newPurchaseStatus,
        warehouse_verified_by: user.name || 'Warehouse Staff',
        warehouse_verified_at: nowIso,
        warehouse_notes: notes,
        qc_notes: notes,
        receive_status: recStatus,
        updated_date: nowIso.split('T')[0]
      }).eq('item_id', itemId);

      // 4. Update or Insert receive_summary
      const summaryPayload = {
        po_number: item.po_number,
        item_name: item.item_name,
        requested_qty: reqQty,
        purchased_qty: purchasedQty,
        received_qty: recQty,
        remaining_qty: Math.max(0, purchasedQty - recQty),
        receive_status: recStatus,
        verified_by: user.name || 'Warehouse Staff',
        verified_at: nowIso
      };

      const { data: existingSummary } = await supabase.from('receive_summary').select('*').eq('item_name', item.item_name).maybeSingle();
      if (existingSummary) {
        await supabase.from('receive_summary').update(summaryPayload).eq('item_name', item.item_name);
      } else {
        await supabase.from('receive_summary').insert(summaryPayload);
      }

      // 5. Calculate & update po_master receive_status
      const poNumber = item.po_number;
      const { data: poItems } = await supabase.from('po_items').select('warehouse_qty, requested_qty, ordered_qty, purchased_qty').ilike('po_number', poNumber);

      let masterRecStatus = 'Pending';
      if (poItems && poItems.length > 0) {
        const activeItems = poItems.filter(i => Number(i.purchased_qty ?? 0) > 0);
        if (activeItems.length > 0) {
          const allRecComplete = activeItems.every(i => {
            const p = Number(i.purchased_qty ?? 0);
            const w = Number(i.warehouse_qty ?? 0);
            return w >= p;
          });
          const anyRec = activeItems.some(i => Number(i.warehouse_qty ?? 0) > 0);
          masterRecStatus = allRecComplete ? 'Completed' : (anyRec ? 'Partial' : 'Pending');
        }
      }

      await supabase.from('po_master').update({
        receive_status: masterRecStatus,
        updated_at: nowIso
      }).ilike('po_number', poNumber);

      const freshPOs = await fetchPOsFromSupabase();
      if (freshPOs) saveLocalPOs(freshPOs);
      return {
        success: true,
        message: 'Received item verified successfully in Supabase',
        data: { pos: freshPOs || [] },
        timestamp: nowIso
      };
    } catch (err: unknown) {
      console.warn('[Supabase Receive Item Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('WAREHOUSE_RECEIVE', { itemId, user, batchData });
}

export async function apiFetchDispatchList(): Promise<ApiResponse<any>> {
  const sbPOs = await fetchPOsFromSupabase();
  if (sbPOs !== null) {
    return {
      success: true,
      message: 'Dispatch list loaded from Supabase',
      data: { pos: sbPOs },
      timestamp: new Date().toISOString()
    };
  }
  return postApi('DISPATCH_LIST');
}

export async function apiFetchDashboard(): Promise<ApiResponse<any>> {
  const sbPOs = await fetchPOsFromSupabase();
  if (sbPOs !== null) {
    return {
      success: true,
      message: 'Dashboard data loaded from Supabase',
      data: { pos: sbPOs },
      timestamp: new Date().toISOString()
    };
  }
  return postApi('DASHBOARD');
}

export async function apiFetchActivityLogs(): Promise<ApiResponse<{ logs: AuditLog[] }>> {
  return postApi<{ logs: AuditLog[] }>('ACTIVITY');
}

export async function apiHoldPO(poNumber: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || (user.role !== 'purchaser' && user.role !== 'admin')) {
    return {
      success: false,
      message: 'Permission denied: Only purchasers or admins are authorized to hold purchase orders.',
      timestamp: new Date().toISOString()
    };
  }

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const normPo = poNumber.trim();
      const nowIso = new Date().toISOString();

      const { data: items } = await supabase.from('po_items').select('*').ilike('po_number', normPo);
      if (items && items.length > 0) {
        for (const item of items) {
          const reqQty = Number(item.requested_qty ?? item.ordered_qty ?? 0);
          const purQty = Number(item.purchased_qty ?? 0);
          const remQty = item.remaining_qty !== undefined && item.remaining_qty !== null
            ? Number(item.remaining_qty)
            : Math.max(0, reqQty - purQty);

          // Requirements 3 & 5: If item is fully purchased (remaining_qty === 0 or status === 'Purchased'), leave completely untouched!
          if (remQty === 0 || item.purchase_status === 'Purchased' || (purQty >= reqQty && reqQty > 0)) {
            continue;
          }

          // If item is ALREADY held by an individual purchaser, preserve purchaser's hold_by info
          const existingHoldBy = (item.hold_by || '').trim().toLowerCase();
          const adminHoldName = (user.name || 'Admin').trim().toLowerCase();
          if (item.purchase_status === 'Held' && existingHoldBy && existingHoldBy !== 'admin' && existingHoldBy !== adminHoldName) {
            continue; // Purchaser's individual item-level hold: keep untouched!
          }

          // Requirement 4: Hold remaining balance quantity under admin hold, purchased_qty stays untouched
          await supabase.from('po_items').update({
            purchase_status: 'Held',
            hold_by: user.name || 'Admin',
            hold_start_time: nowIso,
            updated_date: nowIso.split('T')[0]
          }).eq('item_id', item.item_id);

          const holdId = `HOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await supabase.from('hold_items').upsert({
            id: holdId,
            item_id: item.item_id,
            po_number: item.po_number,
            item_name: item.item_name,
            hold_by: user.name || 'Admin',
            hold_start_time: nowIso,
            status: 'Active',
            updated_at: nowIso
          }, { onConflict: 'item_id' });
        }
      }

      await supabase.from('po_master').update({
        purchase_status: 'Held',
        is_held_by_admin: true,
        hold_by_admin: user.name || 'Admin',
        updated_at: nowIso
      }).ilike('po_number', normPo);

      const freshPOs = await fetchPOsFromSupabase();
      if (freshPOs) saveLocalPOs(freshPOs);
      return {
        success: true,
        message: 'Purchase Order placed on hold successfully',
        data: { pos: freshPOs || [] },
        timestamp: nowIso
      };
    } catch (err: unknown) {
      console.warn('[Supabase Hold PO Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PO_HOLD', { poNumber, user });
}

export async function apiReleasePO(poNumber: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || user.role !== 'admin') {
    return {
      success: false,
      message: 'Permission denied: Only admins are authorized to release PO-level holds.',
      timestamp: new Date().toISOString()
    };
  }

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const normPo = poNumber.trim();
      const nowIso = new Date().toISOString();

      const { data: poMaster } = await supabase.from('po_master').select('hold_by_admin').ilike('po_number', normPo).single();
      const adminHoldName = (poMaster?.hold_by_admin || user.name || 'Admin').trim().toLowerCase();

      const { data: items } = await supabase.from('po_items').select('*').ilike('po_number', normPo);
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.purchase_status === 'Held') {
            const itemHoldBy = (item.hold_by || '').trim().toLowerCase();
            const isHeldByAdminHold = !itemHoldBy || itemHoldBy === 'admin' || itemHoldBy === adminHoldName || itemHoldBy === (user.name || '').trim().toLowerCase();

            // ONLY release items held BY admin PO hold action — leave purchaser's individual item hold untouched!
            if (!isHeldByAdminHold) {
              continue;
            }

            const reqQty = Number(item.requested_qty ?? item.ordered_qty ?? 0);
            const purQty = Number(item.purchased_qty ?? 0);
            const newStatus = (purQty >= reqQty && reqQty > 0)
              ? 'Purchased'
              : (purQty > 0 ? 'Partial Purchased' : 'Pending');

            await supabase.from('po_items').update({
              purchase_status: newStatus,
              hold_by: '',
              hold_start_time: null,
              updated_date: nowIso.split('T')[0]
            }).eq('item_id', item.item_id);

            await supabase.from('hold_items').delete().eq('item_id', item.item_id);
          }
        }
      }

      const { data: allPoItems } = await supabase.from('po_items').select('purchase_status, purchased_qty, requested_qty').ilike('po_number', normPo);
      let masterStatus = 'Pending';
      if (allPoItems && allPoItems.length > 0) {
        const allPurchased = allPoItems.every(i => i.purchase_status === 'Purchased' || (Number(i.purchased_qty) >= Number(i.requested_qty) && Number(i.requested_qty) > 0));
        const anyPurchased = allPoItems.some(i => i.purchase_status === 'Partial Purchased' || i.purchase_status === 'Purchased' || Number(i.purchased_qty) > 0);
        if (allPurchased) masterStatus = 'Completed';
        else if (anyPurchased) masterStatus = 'Partial';
      }

      await supabase.from('po_master').update({
        purchase_status: masterStatus,
        is_held_by_admin: false,
        hold_by_admin: '',
        updated_at: nowIso
      }).ilike('po_number', normPo);

      const freshPOs = await fetchPOsFromSupabase();
      if (freshPOs) saveLocalPOs(freshPOs);
      return {
        success: true,
        message: 'Purchase Order hold released successfully',
        data: { pos: freshPOs || [] },
        timestamp: nowIso
      };
    } catch (err: unknown) {
      console.warn('[Supabase Release PO Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PO_RELEASE', { poNumber, user });
}

export async function apiDeletePO(poNumber: string, user?: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  const normPo = poNumber.trim();
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      await supabase.from('hold_items').delete().eq('po_number', normPo);
      await supabase.from('hold_items').delete().ilike('po_number', normPo);
      await supabase.from('po_items').delete().eq('po_number', normPo);
      await supabase.from('po_items').delete().ilike('po_number', normPo);
      const { error } = await supabase.from('po_master').delete().eq('po_number', normPo);
      if (error) {
        console.warn('[Supabase PO Delete Error]', error.message);
      }
      await supabase.from('po_master').delete().ilike('po_number', normPo);

      const freshPOs = await fetchPOsFromSupabase();
      saveLocalPOs(freshPOs || []);
      return {
        success: true,
        message: `PO ${poNumber} deleted permanently from Supabase`,
        data: { pos: freshPOs || [] },
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      console.warn('[Supabase PO Delete Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PO_DELETE', { poNumber, user });
}

export async function apiClearAllPOs(user?: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  saveLocalPOs([]);
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      await supabase.from('hold_items').delete().not('po_number', 'is', null);
      await supabase.from('po_items').delete().not('po_number', 'is', null);
      const { error } = await supabase.from('po_master').delete().not('po_number', 'is', null);
      if (error) {
        console.warn('[Supabase Clear All POs Error]', error.message);
      }

      return {
        success: true,
        message: 'All POs cleared permanently from Supabase',
        data: { pos: [] },
        timestamp: new Date().toISOString()
      };
    } catch (err: unknown) {
      console.warn('[Supabase Clear All POs Exception]', (err as Error)?.message);
    }
  }

  return postApi<{ pos: PurchaseOrder[] }>('PO_CLEAR_ALL', { user });
}

export async function apiFetchConfig(): Promise<ApiResponse<any>> {
  return getApi('CONFIG');
}
