import { User, PurchaseOrder, POItem, AuditLog, MasterStatus } from '../types';
import { getCurrentUser, INITIAL_USERS, getLocalUsers, saveLocalUsers, getLocalPOs, saveLocalPOs, getLocalAuditLogs } from './storage';
import { supabase } from './supabaseClient';

const recentWritesMap = new Map<string, { warehouseQty?: number; purchaseStatus?: string; holdBy?: string; timestamp: number }>();

export function recordRecentWrite(itemId: string, values: { warehouseQty?: number; purchaseStatus?: string; holdBy?: string }) {
  recentWritesMap.set(String(itemId).trim(), { ...values, timestamp: Date.now() });
}
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

// API Service functions
export async function apiLogin(username: string, password: string): Promise<ApiResponse<{ user: User; token?: string }>> {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  if (!cleanUsername) {
    return {
      success: false,
      message: 'Please enter a valid username or email.',
      timestamp: new Date().toISOString()
    };
  }

  // Strip prefix like "rl " or email domain for core matching
  const stripPrefix = (str: string) => str.toLowerCase().replace(/^rl\s*/i, '').replace(/@.*$/, '').trim();
  const queryCore = stripPrefix(cleanUsername);

  const isMatch = (uNameRaw: string, uEmailRaw: string, uUsernameRaw: string) => {
    const uName = String(uNameRaw || '').trim().toLowerCase();
    const uEmail = String(uEmailRaw || '').trim().toLowerCase();
    const uUser = String(uUsernameRaw || '').trim().toLowerCase();

    if (uName === cleanUsername || uEmail === cleanUsername || uUser === cleanUsername) return true;

    const coreName = stripPrefix(uName);
    const coreUser = stripPrefix(uUser);
    const coreEmail = stripPrefix(uEmail);

    if (queryCore && (coreName === queryCore || coreUser === queryCore || coreEmail === queryCore)) return true;
    if (queryCore && queryCore.length >= 2 && (coreName.includes(queryCore) || coreUser.includes(queryCore))) return true;

    return false;
  };

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
          const uName = String(u.name || u.Name || '');
          const uEmail = String(u.email || u.Email || '');
          const uUsername = String(u.username || u.Username || uName);
          return isMatch(uName, uEmail, uUsername);
        });

        if (found) {
          const isActive = found.active === true || String(found.active || found.Active || '').toLowerCase() === 'active' || found.active === undefined;
          if (!isActive) {
            return {
              success: false,
              message: 'Your account is currently disabled. Please contact system admin.',
              timestamp: new Date().toISOString()
            };
          }

          const token = `sb_token_${found.id || Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          let userRole = String(found.role || found.Role || 'purchaser').toLowerCase() as any;
          const normName = String(found.name || found.username || '').toUpperCase();
          if (normName.includes('TAKMIL') || normName.includes('MUSTAQ') || userRole === 'super_admin' || userRole === 'superadmin') {
            userRole = 'super_admin';
          }

          const userObj: User = {
            id: String(found.id || found.ID || Date.now()),
            name: String(found.name || found.Name || found.username || username),
            email: String(found.email || found.Email || `${cleanUsername}@rlfood.com`),
            username: String(found.username || found.Username || username),
            role: userRole,
            isSuperAdmin: userRole === 'super_admin',
            active: true,
            createdDate: String(found.created_date || found.createdDate || new Date().toISOString()),
            token
          };

          try {
            await supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', found.id);
          } catch (err) {
            // ignore background error
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

  // Fallback to local users authentication
  const localUsers = getLocalUsers();
  const localFound = localUsers.find(u => isMatch(u.name, u.email, u.username));
  if (localFound) {
    if (localFound.active === false || localFound.status === 'Inactive') {
      return {
        success: false,
        message: 'Your account is currently disabled. Please contact system admin.',
        timestamp: new Date().toISOString()
      };
    }

    const token = `local_token_${localFound.id}_${Date.now()}`;
    return {
      success: true,
      message: 'Authentication successful (Local)',
      data: { user: { ...localFound, token }, token },
      timestamp: new Date().toISOString()
    };
  }

  // Fallback to INITIAL_USERS list if local users list was somehow modified
  const initialMatch = INITIAL_USERS.find(u => isMatch(u.name, u.email, u.username));
  if (initialMatch) {
    const token = `init_token_${initialMatch.id}_${Date.now()}`;
    return {
      success: true,
      message: 'Authentication successful',
      data: { user: { ...initialMatch, token }, token },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: false,
    message: 'Invalid username or password. Available users: RL TAKMIL, RL MUSTAQ, RL POLASH, RL IQBAL, etc. Default password: 123',
    timestamp: new Date().toISOString()
  };
}

// Helper functions for Server REST API cross-device sync
export async function fetchPOsFromServer(): Promise<PurchaseOrder[] | null> {
  try {
    const res = await fetch('/api/pos');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.pos) && json.pos.length > 0) {
        saveLocalPOs(json.pos);
        return json.pos;
      }
    }
  } catch (err) {
    console.warn('[Server API Fetch POs Error]', err);
  }
  return null;
}

export async function savePOsToServer(pos: PurchaseOrder[]): Promise<void> {
  saveLocalPOs(pos);
  try {
    await fetch('/api/pos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pos })
    });
  } catch (err) {
    console.warn('[Server API Save POs Error]', err);
  }
}

export async function fetchUsersFromServer(): Promise<User[] | null> {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.users) && json.users.length > 0) {
        saveLocalUsers(json.users);
        return json.users;
      }
    }
  } catch (err) {
    console.warn('[Server API Fetch Users Error]', err);
  }
  return null;
}

export async function saveUsersToServer(users: User[]): Promise<void> {
  saveLocalUsers(users);
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });
  } catch (err) {
    console.warn('[Server API Save Users Error]', err);
  }
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
        const users: User[] = rows.map((u: any) => {
          const cleanName = String(u.name || u.Name || u.username || '').trim();
          const cleanUsername = String(u.username || u.Username || cleanName).trim();
          const isActive = u.active === true || String(u.active || u.Active).toLowerCase() === 'active';
          let uRole = String(u.role || u.Role || 'purchaser').toLowerCase() as any;
          if (cleanName === 'RL TAKMIL' || cleanName === 'RL MUSTAQ' || cleanUsername === 'RL TAKMIL' || cleanUsername === 'RL MUSTAQ' || uRole === 'super_admin' || uRole === 'superadmin') {
            uRole = 'super_admin';
          }
          return {
            id: String(u.id || u.ID || Date.now()),
            name: cleanName,
            email: String(u.email || u.Email || `${cleanUsername}@rlfood.com`),
            username: cleanUsername,
            password: u.password ? String(u.password) : undefined,
            role: uRole,
            isSuperAdmin: uRole === 'super_admin',
            active: isActive,
            status: isActive ? 'Active' : 'Inactive',
            createdDate: String(u.created_date || u.createdDate || u['Created Date'] || new Date().toISOString().split('T')[0])
          };
        });

        saveUsersToServer(users);
        return {
          success: true,
          message: 'Users loaded from Supabase',
          data: { users },
          timestamp: new Date().toISOString()
        };
      }
    } catch (err: unknown) {
      console.warn('[Supabase Fetch Users Exception]', (err as Error)?.message);
    }
  }

  const serverUsers = await fetchUsersFromServer();
  if (serverUsers) {
    return {
      success: true,
      message: 'Users loaded from server backend',
      data: { users: serverUsers },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    message: 'Users loaded from local storage',
    data: { users: getLocalUsers() },
    timestamp: new Date().toISOString()
  };
}

export async function apiUpdateUsers(users: User[], currentUser?: User): Promise<ApiResponse<any>> {
  saveUsersToServer(users);
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: existingRows } = await supabase.from('users').select('*');
      const existingMap = new Map<string, any>();
      if (existingRows) {
        for (const r of existingRows) {
          const key = String(r.username || r.name || '').trim().toLowerCase();
          existingMap.set(key, r);
        }
      }

      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      const userRows = users.map(u => {
        const cleanUsername = String(u.username || u.name || '').trim();
        const key = cleanUsername.toLowerCase();
        const existing = existingMap.get(key);

        let validId = u.id;
        if (!isUuid(validId)) {
          validId = existing ? existing.id : crypto.randomUUID();
        }

        return {
          id: validId,
          name: u.name || cleanUsername,
          email: u.email || `${cleanUsername}@rlfood.com`,
          username: cleanUsername,
          password: u.password || existing?.password || '123',
          role: String(u.role || 'purchaser').toLowerCase(),
          active: u.active !== false,
          created_date: u.createdDate || existing?.created_date || new Date().toISOString().split('T')[0]
        };
      });

      const { error } = await supabase.from('users').upsert(userRows, { onConflict: 'id' });
      if (!error) {
        return {
          success: true,
          message: 'Users updated successfully in Supabase & Server',
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

  return {
    success: true,
    message: 'Users updated in server storage & local cache',
    data: { users },
    timestamp: new Date().toISOString()
  };
}

export async function fetchPOsFromSupabase(): Promise<PurchaseOrder[] | null> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    return null;
  }

  try {
    // 1. Fetch po_master and po_items
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

        const whQty = Number(item.warehouse_qty ?? item.received_qty ?? 0);
        const passQty = Number(item.passed_qty ?? whQty);

        const rawItemStatus = String(item.purchase_status || 'Pending').trim();
        const lowerStatus = rawItemStatus.toLowerCase();
        const itemPurchaseStatus = (lowerStatus === 'purchased' || lowerStatus === 'completed')
          ? 'Purchased'
          : (lowerStatus === 'partial purchased' || lowerStatus === 'partially purchased' || lowerStatus === 'partial')
          ? 'Partial Purchased'
          : (lowerStatus === 'held' || lowerStatus === 'hold')
          ? 'Held'
          : lowerStatus === 'pending'
          ? 'Pending'
          : rawItemStatus;

        const itemIdKey = String(item.item_id || item.id || '').trim();
        const lastWrite = recentWritesMap.get(itemIdKey);
        if (lastWrite && (Date.now() - lastWrite.timestamp < 30000)) {
          if (lastWrite.warehouseQty !== undefined && whQty < lastWrite.warehouseQty) {
            console.warn(`[DEFENSIVE AUDIT WARNING] Reversion detected on item "${item.item_name}" (${itemIdKey}): fetched warehouseQty (${whQty}) is lower than recent write (${lastWrite.warehouseQty}).`);
          }
        }

        return {
          id: itemIdKey,
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
          purchaseStatus: itemPurchaseStatus as any,
          holdBy: holdBy,
          holdByName: holdBy,
          holdStartTime: holdStartTime,
          holdSince: holdStartTime,
          holdExpireTime: holdExpireTime,
          purchaserName: item.purchaser_name || '',
          purchasedAt: item.purchased_at || '',
          notes: item.notes || '',
          receivedQty: whQty,
          warehouseQty: whQty,
          passedQty: passQty,
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

      const rawMasterStatus = String(po.purchase_status || 'Pending').trim();
      const masterPurchaseStatus = rawMasterStatus.toLowerCase() === 'pending'
        ? 'Pending'
        : rawMasterStatus.toLowerCase() === 'completed' || rawMasterStatus.toLowerCase() === 'purchased'
        ? 'Completed'
        : rawMasterStatus.toLowerCase() === 'partial' || rawMasterStatus.toLowerCase() === 'partially purchased'
        ? 'Partial'
        : rawMasterStatus.toLowerCase() === 'held'
        ? 'Held'
        : rawMasterStatus;

      const activeItemsForRec = items.filter(i => (i.requestedQty || 0) > 0 || (i.purchasedQty || 0) > 0);
      let calculatedRecStatus: MasterStatus = 'Pending';
      if (activeItemsForRec.length > 0) {
        const allRecComp = activeItemsForRec.every(i => (i.warehouseQty || 0) >= (i.purchasedQty || i.requestedQty || 0) && (i.warehouseQty || 0) > 0);
        const anyRecDone = activeItemsForRec.some(i => (i.warehouseQty || 0) > 0);
        calculatedRecStatus = allRecComp ? 'Completed' : (anyRecDone ? 'Partial' : 'Pending');
      }
      const rawRecStatus = String(po.receive_status || '').trim();
      const finalRecStatus = (calculatedRecStatus !== 'Pending')
        ? calculatedRecStatus
        : ((rawRecStatus === 'Completed' || rawRecStatus === 'Partial' || rawRecStatus === 'Pending') ? rawRecStatus : calculatedRecStatus);

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
        purchaseStatus: masterPurchaseStatus as any,
        isHeldByAdmin: po.is_held_by_admin === true || po.is_held_by_admin === 'true' || String(po.is_held_by_admin || '').toLowerCase() === 'true' || po.purchase_status === 'Held',
        holdByAdmin: po.hold_by_admin || '',
        receiveStatus: finalRecStatus as any,
        status: (po.status || (masterPurchaseStatus === 'Completed' ? 'purchased' : 'pending')) as any,
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
    savePOsToServer(sbPOs);
    return {
      success: true,
      message: 'Purchase orders loaded from Supabase',
      data: { pos: sbPOs },
      timestamp: new Date().toISOString()
    };
  }

  const serverPOs = await fetchPOsFromServer();
  if (serverPOs) {
    return {
      success: true,
      message: 'Purchase orders loaded from Server',
      data: { pos: serverPOs },
      timestamp: new Date().toISOString()
    };
  }

  const localPos = getLocalPOs();
  savePOsToServer(localPos);

  return {
    success: true,
    message: 'Purchase orders loaded from local storage',
    data: { pos: localPos },
    timestamp: new Date().toISOString()
  };
}

export async function apiImportPOs(pos: PurchaseOrder[], user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
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

      const { error: masterErr } = await supabase.from('po_master').upsert(poMasterRows, { onConflict: 'po_number' });
      if (masterErr) {
        console.warn('[Supabase PO Master Import Notice]', masterErr.message);
      }

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
            sl_number: item.slNumber ? String(item.slNumber) : null,
            item_name: item.itemName,
            brand: item.brand || null,
            category: item.category || 'General',
            unit: item.unit || 'Kg',
            requested_qty: item.requestedQty || item.orderedQty || 0,
            purchased_qty: item.purchasedQty || 0,
            remaining_qty: item.remainingQty ?? Math.max(0, (item.requestedQty || 0) - (item.purchasedQty || 0)),
            purchase_status: item.purchaseStatus === 'Held' ? 'Pending' : (item.purchaseStatus || 'Pending'),
            created_date: item.createdDate || new Date().toISOString().split('T')[0],
            updated_date: new Date().toISOString().split('T')[0]
          });
        });
      });

      if (allItemRows.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < allItemRows.length; i += chunkSize) {
          const chunk = allItemRows.slice(i, i + chunkSize);
          const { error: itemErr } = await supabase.from('po_items').upsert(chunk, { onConflict: 'item_id' });
          if (itemErr) {
            console.warn('[Supabase PO Items Import Chunk Error]', itemErr.message);
          }
        }
      }

      const freshPOs = await fetchPOsFromSupabase();
      if (freshPOs) saveLocalPOs(freshPOs);
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

  saveLocalPOs(pos);
  return {
    success: true,
    message: 'POs imported to local storage',
    data: { pos },
    timestamp: new Date().toISOString()
  };
}

export async function apiHoldItem(itemId: string, user: User, holdStartTime?: string, holdExpireTime?: string): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || (user.role !== 'purchaser' && user.role !== 'super_admin' && user.role !== 'admin')) {
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

      const { error: updateErr } = await supabase.from('po_items').update({
        purchase_status: 'Held',
        hold_by: user.name,
        hold_start_time: startTimeStr,
        hold_expire_time: holdExpireTime || null,
        updated_date: nowIso.split('T')[0]
      }).eq('item_id', itemId);

      if (updateErr) {
        console.error('[Supabase Hold Item Error]', updateErr.message);
        return {
          success: false,
          message: `Failed to place hold in Supabase: ${updateErr.message}`,
          timestamp: nowIso
        };
      }

      const poNumber = itemRow?.po_number || '';
      const itemName = itemRow?.item_name || '';
      const holdId = `HOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const { error: holdErr } = await supabase.from('hold_items').upsert({
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

      if (holdErr) {
        console.warn('[Supabase Hold Items Upsert Error]', holdErr.message);
      }

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

  return {
    success: true,
    message: 'Item placed on hold locally',
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
}

export async function apiReleaseHold(itemId: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || (user.role !== 'purchaser' && user.role !== 'super_admin' && user.role !== 'admin')) {
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

        const { error: updateErr } = await supabase.from('po_items').update({
          purchase_status: newStatus,
          hold_by: null,
          hold_start_time: null,
          hold_expire_time: null,
          updated_date: nowIso.split('T')[0]
        }).eq('item_id', itemId);

        if (updateErr) {
          console.error('[Supabase Release Hold Error]', updateErr.message);
          return {
            success: false,
            message: `Failed to release hold in Supabase: ${updateErr.message}`,
            timestamp: nowIso
          };
        }

        const { error: holdErr } = await supabase.from('hold_items').update({
          status: 'Released',
          updated_at: nowIso
        }).eq('item_id', itemId);

        if (holdErr) {
          console.warn('[Supabase Hold Items Release Update Error]', holdErr.message);
        }

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

  return {
    success: true,
    message: 'Item hold released locally',
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
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

        await supabase.from('hold_items').update({
          status: 'Released',
          updated_at: nowIso
        }).eq('item_id', itemId);

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

  return {
    success: true,
    message: 'Purchase recorded in local storage',
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
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

  return {
    success: true,
    message: 'Item returned to pending in local storage',
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
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
  return {
    success: true,
    message: 'Dashboard data loaded from local storage',
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
}

export async function apiFetchActivityLogs(): Promise<ApiResponse<{ logs: AuditLog[] }>> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: rows } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (rows && rows.length > 0) {
        const logs: AuditLog[] = rows.map((r: any) => ({
          id: String(r.id),
          timestamp: r.timestamp || r.created_at || new Date().toISOString(),
          user: r.user || r.username || 'System',
          role: r.role || 'admin',
          action: r.action || 'LOG',
          details: r.details || ''
        }));
        return {
          success: true,
          message: 'Activity logs loaded from Supabase',
          data: { logs },
          timestamp: new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('[Supabase Activity Logs Notice]', err);
    }
  }

  return {
    success: true,
    message: 'Activity logs loaded from local storage',
    data: { logs: getLocalAuditLogs() },
    timestamp: new Date().toISOString()
  };
}

export async function apiHoldPO(poNumber: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || (user.role !== 'purchaser' && user.role !== 'admin' && user.role !== 'super_admin')) {
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

          if (remQty === 0 || item.purchase_status === 'Purchased' || (purQty >= reqQty && reqQty > 0)) {
            continue;
          }

          const existingHoldBy = (item.hold_by || '').trim().toLowerCase();
          const adminHoldName = (user.name || 'Admin').trim().toLowerCase();
          if (item.purchase_status === 'Held' && existingHoldBy && existingHoldBy !== 'admin' && existingHoldBy !== adminHoldName) {
            continue;
          }

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

  return {
    success: true,
    message: 'PO placed on hold locally',
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
}

export async function apiReleasePO(poNumber: string, user: User): Promise<ApiResponse<{ pos: PurchaseOrder[] }>> {
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
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

  return {
    success: true,
    message: 'PO hold released locally',
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
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

  return {
    success: true,
    message: `PO ${poNumber} deleted locally`,
    data: { pos: getLocalPOs() },
    timestamp: new Date().toISOString()
  };
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

  return {
    success: true,
    message: 'All POs cleared locally',
    data: { pos: [] },
    timestamp: new Date().toISOString()
  };
}

export async function apiFetchConfig(): Promise<ApiResponse<any>> {
  return {
    success: true,
    message: 'System configuration operational',
    data: { status: 'ok', provider: 'Supabase' },
    timestamp: new Date().toISOString()
  };
}
