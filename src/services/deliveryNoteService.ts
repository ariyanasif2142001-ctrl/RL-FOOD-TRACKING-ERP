import { DeliveryNoteRecord, DeliveryNoteItem } from '../types';

const STORAGE_KEY = 'dispatch_delivery_notes_v2';

export const getDeliveryNotes = (): DeliveryNoteRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading delivery notes:', err);
    return [];
  }
};

export const saveDeliveryNotes = (notes: DeliveryNoteRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    // Dispatch custom event so listeners update in real time across tabs/components
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('delivery_notes_updated', { detail: notes }));
    }, 0);
  } catch (err) {
    console.error('Error saving delivery notes:', err);
  }
};

export const addDeliveryNote = (note: DeliveryNoteRecord): void => {
  const current = getDeliveryNotes();
  // Ensure no duplicate ID
  const filtered = current.filter(n => n.id !== note.id);
  saveDeliveryNotes([note, ...filtered]);
};

export const updateDeliveryNote = (updatedNote: DeliveryNoteRecord): void => {
  const current = getDeliveryNotes();
  const next = current.map(n => n.id === updatedNote.id ? updatedNote : n);
  saveDeliveryNotes(next);
};

export const deleteDeliveryNote = (id: string): void => {
  const current = getDeliveryNotes();
  saveDeliveryNotes(current.filter(n => n.id !== id));
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
  saveDeliveryNotes(next);
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
  saveDeliveryNotes(next);
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
