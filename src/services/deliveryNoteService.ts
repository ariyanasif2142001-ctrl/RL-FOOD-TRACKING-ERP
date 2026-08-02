import { DeliveryNoteRecord } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'dispatch_delivery_notes_v2';

// Helper to safely parse local storage cache
const loadLocalCache = (): DeliveryNoteRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading local delivery notes cache:', err);
    return [];
  }
};

// In-memory cache synced with localStorage and Supabase
let deliveryNotesCache: DeliveryNoteRecord[] = loadLocalCache();

// Dispatch local window event so UI components immediately update
const notifyUpdate = (notes: DeliveryNoteRecord[]) => {
  deliveryNotesCache = notes;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Error saving delivery notes cache:', err);
  }
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('delivery_notes_updated', { detail: notes }));
  }, 0);
};

// Map Supabase DB row to DeliveryNoteRecord object
const mapRowToDeliveryNote = (row: any): DeliveryNoteRecord => ({
  id: String(row.id),
  challanNumber: row.challan_number || row.challanNumber || '',
  poId: row.po_id || row.poId || '',
  poNumber: row.po_number || row.poNumber || '',
  customerName: row.customer_name || row.customerName || '',
  deliveryDate: row.delivery_date || row.deliveryDate || '',
  dispatchOfficer: row.dispatch_officer || row.dispatchOfficer || '',
  recipientName: row.recipient_name || row.recipientName || undefined,
  notes: row.notes || undefined,
  createdDate: row.created_date || row.createdDate || new Date().toISOString(),
  status: row.status || 'Delivered',
  deliveryConfirmedAt: row.delivery_confirmed_at || row.deliveryConfirmedAt || undefined,
  deliveryConfirmedBy: row.delivery_confirmed_by || row.deliveryConfirmedBy || undefined,
  invoiceNumber: row.invoice_number || row.invoiceNumber || undefined,
  invoicedAt: row.invoiced_at || row.invoicedAt || undefined,
  items: Array.isArray(row.items) ? row.items : (typeof row.items === 'string' ? JSON.parse(row.items) : []),
  companyName: row.company_name || row.companyName || undefined,
  companySubtext: row.company_subtext || row.companySubtext || undefined
});

// Map DeliveryNoteRecord object to Supabase DB row
const mapDeliveryNoteToRow = (note: DeliveryNoteRecord) => ({
  id: note.id,
  challan_number: note.challanNumber,
  po_id: note.poId,
  po_number: note.poNumber,
  customer_name: note.customerName,
  delivery_date: note.deliveryDate,
  dispatch_officer: note.dispatchOfficer,
  recipient_name: note.recipientName || null,
  notes: note.notes || null,
  created_date: note.createdDate,
  status: note.status,
  delivery_confirmed_at: note.deliveryConfirmedAt || null,
  delivery_confirmed_by: note.deliveryConfirmedBy || null,
  invoice_number: note.invoiceNumber || null,
  invoiced_at: note.invoicedAt || null,
  items: note.items || [],
  company_name: note.companyName || null,
  company_subtext: note.companySubtext || null,
  updated_at: new Date().toISOString()
});

// Server REST API sync for delivery notes
const fetchDeliveryNotesFromServer = async (): Promise<DeliveryNoteRecord[]> => {
  try {
    const res = await fetch('/api/delivery-notes');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.notes) && json.notes.length > 0) {
        notifyUpdate(json.notes);
        return json.notes;
      }
    }
  } catch (err) {
    console.warn('[Server DeliveryNotes Fetch Error]', err);
  }
  return deliveryNotesCache;
};

const saveDeliveryNoteToServer = async (note: DeliveryNoteRecord) => {
  try {
    await fetch('/api/delivery-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
  } catch (err) {
    console.warn('[Server DeliveryNote Save Error]', err);
  }
};

/**
 * Fetch all delivery notes directly from Supabase DB or Server API, falling back to local cache.
 */
export const fetchDeliveryNotesFromSupabase = async (): Promise<DeliveryNoteRecord[]> => {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    try {
      const { data: rows, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .order('created_date', { ascending: false });

      if (!error && rows) {
        const fetchedNotes = rows.map(mapRowToDeliveryNote);
        notifyUpdate(fetchedNotes);
        return fetchedNotes;
      }
    } catch (err) {
      console.error('Failed to load delivery notes from Supabase:', err);
    }
  }

  return await fetchDeliveryNotesFromServer();
};

/**
 * Async save single delivery note to Supabase DB and Server API.
 */
const saveDeliveryNoteToSupabase = async (note: DeliveryNoteRecord) => {
  saveDeliveryNoteToServer(note);
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    return;
  }

  try {
    const row = mapDeliveryNoteToRow(note);
    const { error } = await supabase.from('delivery_notes').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase DeliveryNote Upsert Error]', error.message);
    }
  } catch (err) {
    console.error('Error saving delivery note to Supabase:', err);
  }
};

/**
 * Async delete single delivery note from Supabase DB.
 */
const deleteDeliveryNoteFromSupabase = async (id: string) => {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
    return;
  }

  try {
    const { error } = await supabase.from('delivery_notes').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase DeliveryNote Delete Error]', error.message);
    }
  } catch (err) {
    console.error('Error deleting delivery note from Supabase:', err);
  }
};

// Initialize Realtime subscription for delivery_notes table in Supabase
if (typeof window !== 'undefined') {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co') {
    // Initial fetch from Supabase on load
    fetchDeliveryNotesFromSupabase();

    // Enable Realtime sync across tabs/users
    try {
      supabase
        .channel('public:delivery_notes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_notes' }, async () => {
          await fetchDeliveryNotesFromSupabase();
        })
        .subscribe();
    } catch (rtErr) {
      console.warn('Realtime subscription error on delivery_notes:', rtErr);
    }
  }
}

export const getDeliveryNotes = (): DeliveryNoteRecord[] => {
  return deliveryNotesCache;
};

export const saveDeliveryNotes = (notes: DeliveryNoteRecord[]): void => {
  notifyUpdate(notes);
  notes.forEach(note => saveDeliveryNoteToSupabase(note));
};

export const addDeliveryNote = (note: DeliveryNoteRecord): void => {
  const current = getDeliveryNotes();
  const filtered = current.filter(n => n.id !== note.id);
  const updated = [note, ...filtered];
  notifyUpdate(updated);
  saveDeliveryNoteToSupabase(note);
};

export const updateDeliveryNote = (updatedNote: DeliveryNoteRecord): void => {
  const current = getDeliveryNotes();
  const next = current.map(n => n.id === updatedNote.id ? updatedNote : n);
  notifyUpdate(next);
  saveDeliveryNoteToSupabase(updatedNote);
};

export const deleteDeliveryNote = (id: string): void => {
  const current = getDeliveryNotes();
  const next = current.filter(n => n.id !== id);
  notifyUpdate(next);
  deleteDeliveryNoteFromSupabase(id);
};

export const markDeliveryNoteInvoiced = (id: string, invoiceNumber?: string): DeliveryNoteRecord | null => {
  const current = getDeliveryNotes();
  const target = current.find(n => n.id === id);
  if (!target) return null;

  const invNum = invoiceNumber || `INV-${target.poNumber.replace(/^PO-?/i, '')}-${Date.now().toString().slice(-4)}`;
  const updated: DeliveryNoteRecord = {
    ...target,
    status: 'Invoiced',
    invoiceNumber: invNum,
    invoicedAt: new Date().toISOString()
  };

  const next = current.map(n => n.id === id ? updated : n);
  notifyUpdate(next);
  saveDeliveryNoteToSupabase(updated);
  return updated;
};

export const confirmDeliveryStatus = (
  deliveryNoteId: string,
  itemConfirmations: {
    itemId: string;
    selectedForDelivery: boolean;
    acceptedQty?: number;
    returnedQty?: number;
    returnReason?: string;
  }[],
  confirmedBy?: string
): DeliveryNoteRecord | null => {
  const current = getDeliveryNotes();
  const target = current.find(n => n.id === deliveryNoteId);
  if (!target) return null;

  let totalAccepted = 0;
  let totalReturned = 0;

  const updatedItems = target.items.map(item => {
    const conf = itemConfirmations.find(c => c.itemId === item.id);
    if (!conf) return item;

    const isAccepted = conf.selectedForDelivery;
    const acceptedQty = conf.acceptedQty !== undefined 
      ? conf.acceptedQty 
      : (isAccepted ? item.deliveredQty : 0);
    const returnedQty = conf.returnedQty !== undefined 
      ? conf.returnedQty 
      : (isAccepted ? Math.max(0, item.deliveredQty - acceptedQty) : item.deliveredQty);

    if (acceptedQty > 0) totalAccepted += acceptedQty;
    if (returnedQty > 0) totalReturned += returnedQty;

    return {
      ...item,
      isConfirmed: true,
      isReturned: returnedQty > 0,
      acceptedQty,
      returnedQty,
      returnReason: conf.returnReason || (returnedQty > 0 ? 'Customer Delivery Return' : '')
    };
  });

  let newStatus: DeliveryNoteRecord['status'] = target.status;
  if (totalReturned === 0) {
    newStatus = 'Delivery Confirmed';
  } else if (totalAccepted === 0) {
    newStatus = 'Fully Returned';
  } else {
    newStatus = 'Partially Returned';
  }

  const updatedRecord: DeliveryNoteRecord = {
    ...target,
    status: newStatus,
    deliveryConfirmedAt: new Date().toISOString(),
    deliveryConfirmedBy: confirmedBy || 'Dispatch Officer',
    items: updatedItems
  };

  const next = current.map(n => n.id === deliveryNoteId ? updatedRecord : n);
  notifyUpdate(next);
  saveDeliveryNoteToSupabase(updatedRecord);
  return updatedRecord;
};

/**
 * Calculates total quantity of a specific PO item that has ALREADY been delivered & accepted
 * across ALL previously generated Delivery Notes for a given PO Number.
 * Returned quantities are subtracted so they can be re-dispatched.
 */
export const getDeliveredQtyForPOItem = (
  poNumber: string,
  poItemId?: string,
  poItemName?: string
): number => {
  const notes = getDeliveryNotes();
  const poNotes = notes.filter(n => n.poNumber.trim().toLowerCase() === poNumber.trim().toLowerCase());
  
  let totalAcceptedDelivered = 0;
  poNotes.forEach(dn => {
    (dn.items || []).forEach(item => {
      const matchById = poItemId && item.poItemId && String(item.poItemId).trim() === String(poItemId).trim();
      const matchByName = poItemName && item.poItemName && item.poItemName.trim().toLowerCase() === poItemName.trim().toLowerCase();
      
      if (matchById || matchByName) {
        let accepted = item.deliveredQty || 0;
        if (item.acceptedQty !== undefined) {
          accepted = item.acceptedQty;
        } else if (item.isReturned || (item.returnedQty && item.returnedQty > 0)) {
          accepted = Math.max(0, (item.deliveredQty || 0) - (item.returnedQty || 0));
        }
        totalAcceptedDelivered += accepted;
      }
    });
  });

  return totalAcceptedDelivered;
};
