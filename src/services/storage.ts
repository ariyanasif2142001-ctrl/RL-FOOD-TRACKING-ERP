import { User, PurchaseOrder, AuditLog } from '../types';

/**
 * Storage Helper - Memory, LocalStorage & Session bridge.
 * Serves as local cache & offline fallback for the Supabase backend.
 */

export const INITIAL_USERS: User[] = [
  {
    id: 'u-takmil',
    name: 'RL TAKMIL',
    email: 'takmil@rlfood.com',
    username: 'RL TAKMIL',
    role: 'super_admin',
    isSuperAdmin: true,
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-mustaq',
    name: 'RL MUSTAQ',
    email: 'mustaq@rlfood.com',
    username: 'RL MUSTAQ',
    role: 'super_admin',
    isSuperAdmin: true,
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-polash',
    name: 'RL POLASH',
    email: 'polash@rlfood.com',
    username: 'RL POLASH',
    role: 'admin',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-murshid',
    name: 'RL MURSHID',
    email: 'murshid@rlfood.com',
    username: 'RL MURSHID',
    role: 'admin',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-samir',
    name: 'RL SAMIR',
    email: 'samir@rlfood.com',
    username: 'RL SAMIR',
    role: 'admin',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-nisam',
    name: 'RL NISAM',
    email: 'nisam@rlfood.com',
    username: 'RL NISAM',
    role: 'admin',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-iqbal',
    name: 'RL IQBAL',
    email: 'iqbal@rlfood.com',
    username: 'RL IQBAL',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-minhaz',
    name: 'RL MINHAZ',
    email: 'minhaz@rlfood.com',
    username: 'RL MINHAZ',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-asraf',
    name: 'RL ASRAF',
    email: 'asraf@rlfood.com',
    username: 'RL ASRAF',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-asif',
    name: 'RL ASIF',
    email: 'asif@rlfood.com',
    username: 'RL ASIF',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-sadaka',
    name: 'RL SADAKA',
    email: 'sadaka@rlfood.com',
    username: 'RL SADAKA',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-saher',
    name: 'RL SAHER',
    email: 'saher@rlfood.com',
    username: 'RL SAHER',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-niyas',
    name: 'RL NIYAS',
    email: 'niyas@rlfood.com',
    username: 'RL NIYAS',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-nadir',
    name: 'RL NADIR',
    email: 'nadir@rlfood.com',
    username: 'RL NADIR',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-manoj',
    name: 'RL MANOJ',
    email: 'manoj@rlfood.com',
    username: 'RL MANOJ',
    role: 'purchaser',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-alamin',
    name: 'RL AL AMIN',
    email: 'alamin@rlfood.com',
    username: 'RL AL AMIN',
    role: 'warehouse',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-asiq',
    name: 'RL ASIQ',
    email: 'asiq@rlfood.com',
    username: 'RL ASIQ',
    role: 'warehouse',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-emdadul',
    name: 'RL EMDADUL',
    email: 'emdadul@rlfood.com',
    username: 'RL EMDADUL',
    role: 'warehouse',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-opu',
    name: 'RL OPU',
    email: 'opu@rlfood.com',
    username: 'RL OPU',
    role: 'warehouse',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-nahid',
    name: 'RL NAHID',
    email: 'nahid@rlfood.com',
    username: 'RL NAHID',
    role: 'dispatch',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-ismail',
    name: 'RL ISMAIL',
    email: 'ismail@rlfood.com',
    username: 'RL ISMAIL',
    role: 'dispatch',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-atiq',
    name: 'RL ATIQ',
    email: 'atiq@rlfood.com',
    username: 'RL ATIQ',
    role: 'dispatch',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-obaidul',
    name: 'RL OBAIDUL',
    email: 'obaidul@rlfood.com',
    username: 'RL OBAIDUL',
    role: 'dispatch',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-tamim',
    name: 'RL TAMIM',
    email: 'tamim@rlfood.com',
    username: 'RL TAMIM',
    role: 'dispatch',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  },
  {
    id: 'u-rakib',
    name: 'RL RAKIB',
    email: 'rakib@rlfood.com',
    username: 'RL RAKIB',
    role: 'dispatch',
    active: true,
    status: 'Active',
    createdDate: '2026-01-01'
  }
];

export const INITIAL_POS: PurchaseOrder[] = [
  {
    id: 'po-101',
    poNumber: 'PO-2026-001',
    customerName: 'RL Supermarket (Central)',
    orderDate: '2026-07-20',
    deliveryDate: '2026-07-23',
    department: 'Fresh',
    location: 'Dhaka Hub A',
    totalItems: 2,
    totalQuantity: 250,
    purchaseStatus: 'Partial',
    receiveStatus: 'Pending',
    status: 'in_progress',
    createdBy: 'Admin Supervisor',
    createdAt: '2026-07-20T08:00:00.000Z',
    updatedAt: '2026-07-21T10:30:00.000Z',
    items: [
      {
        id: 'item-101-1',
        poId: 'po-101',
        poNumber: 'PO-2026-001',
        orderDate: '2026-07-20',
        deliveryDate: '2026-07-23',
        department: 'Fresh',
        location: 'Dhaka Hub A',
        slNumber: 1,
        itemName: 'Fresh Green Apples',
        brand: 'FreshAgri',
        category: 'Fresh',
        unit: 'kg',
        requestedQty: 100,
        orderedQty: 100,
        purchasedQty: 0,
        remainingQty: 100,
        purchaseStatus: 'Pending',
        createdDate: '2026-07-20',
        updatedDate: '2026-07-20'
      },
      {
        id: 'item-101-2',
        poId: 'po-101',
        poNumber: 'PO-2026-001',
        orderDate: '2026-07-20',
        deliveryDate: '2026-07-23',
        department: 'Fresh',
        location: 'Dhaka Hub A',
        slNumber: 2,
        itemName: 'Organic Farm Carrots',
        brand: 'OrganicHarvest',
        category: 'Fresh',
        unit: 'kg',
        requestedQty: 150,
        orderedQty: 150,
        purchasedQty: 150,
        remainingQty: 0,
        purchaseStatus: 'Purchased',
        purchaserName: 'Karim Purchaser',
        purchasedAt: '2026-07-21T10:30:00.000Z',
        createdDate: '2026-07-20',
        updatedDate: '2026-07-21'
      }
    ]
  },
  {
    id: 'po-102',
    poNumber: 'PO-2026-002',
    customerName: 'Agora Mart (Chittagong)',
    orderDate: '2026-07-21',
    deliveryDate: '2026-07-24',
    department: 'Frozen',
    location: 'Chittagong Depot',
    totalItems: 1,
    totalQuantity: 50,
    purchaseStatus: 'Partial',
    receiveStatus: 'Pending',
    status: 'in_progress',
    createdBy: 'Admin Supervisor',
    createdAt: '2026-07-21T09:15:00.000Z',
    updatedAt: '2026-07-22T08:00:00.000Z',
    items: [
      {
        id: 'item-102-1',
        poId: 'po-102',
        poNumber: 'PO-2026-002',
        orderDate: '2026-07-21',
        deliveryDate: '2026-07-24',
        department: 'Frozen',
        location: 'Chittagong Depot',
        slNumber: 1,
        itemName: 'Frozen Tiger Shrimp',
        brand: 'OceanFresh',
        category: 'Frozen',
        unit: 'box',
        requestedQty: 50,
        orderedQty: 50,
        purchasedQty: 30,
        remainingQty: 20,
        purchaseStatus: 'Partial Purchased',
        purchaserName: 'Karim Purchaser',
        purchasedAt: '2026-07-22T08:00:00.000Z',
        createdDate: '2026-07-21',
        updatedDate: '2026-07-22'
      }
    ]
  }
];

export const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-07-22T08:00:00.000Z',
    user: 'System',
    role: 'admin',
    action: 'System Ready',
    details: 'RL Food Operations Database operational'
  }
];

const KEY_CURRENT_USER = 'rl_food_current_user_session';
const KEY_LOCAL_USERS = 'rl_food_local_users';
const KEY_LOCAL_POS = 'rl_food_local_pos';
const KEY_LOCAL_LOGS = 'rl_food_local_logs';

export function sanitizeAndMergeAdmins(rawUsers: User[]): User[] {
  const allowedAdmins = ['RL TAKMIL', 'RL MUSTAQ', 'RL POLASH', 'RL MURSHID', 'RL SAMIR', 'RL NISAM'];
  const allowedPurchasers = [
    'RL IQBAL', 'RL MINHAZ', 'RL ASRAF', 'RL ASIF',
    'RL SADAKA', 'RL SAHER', 'RL NIYAS', 'RL NADIR', 'RL MANOJ'
  ];
  const allowedReceivers = ['RL AL AMIN', 'RL ASIQ', 'RL EMDADUL', 'RL OPU'];
  const allowedDispatchers = ['RL NAHID', 'RL ISMAIL', 'RL ATIQ', 'RL OBAIDUL', 'RL TAMIM', 'RL RAKIB'];

  const adminDefaults = INITIAL_USERS.filter(u => u.role === 'admin');
  const purchaserDefaults = INITIAL_USERS.filter(u => u.role === 'purchaser');
  const receiverDefaults = INITIAL_USERS.filter(u => u.role === 'warehouse');
  const dispatchDefaults = INITIAL_USERS.filter(u => u.role === 'dispatch');

  // Filter out any admin, purchaser, receiver, or dispatcher that is NOT in official list
  const otherUsers = rawUsers.filter(u => u.role !== 'admin' && u.role !== 'purchaser' && u.role !== 'warehouse' && u.role !== 'dispatch');

  const officialAdmins = adminDefaults.map(defaultAdmin => {
    const existing = rawUsers.find(u => u.name === defaultAdmin.name);
    if (existing) {
      return {
        ...existing,
        username: defaultAdmin.username,
        role: 'admin' as const,
        isSuperAdmin: defaultAdmin.isSuperAdmin,
        active: true,
        status: 'Active' as const
      };
    }
    return defaultAdmin;
  });

  const officialPurchasers = purchaserDefaults.map(defaultPurchaser => {
    const existing = rawUsers.find(u => u.name === defaultPurchaser.name);
    if (existing) {
      return {
        ...existing,
        username: defaultPurchaser.username,
        role: 'purchaser' as const,
        active: true,
        status: 'Active' as const
      };
    }
    return defaultPurchaser;
  });

  const officialReceivers = receiverDefaults.map(defaultReceiver => {
    const existing = rawUsers.find(u => u.name === defaultReceiver.name);
    if (existing) {
      return {
        ...existing,
        username: defaultReceiver.username,
        role: 'warehouse' as const,
        active: true,
        status: 'Active' as const
      };
    }
    return defaultReceiver;
  });

  const officialDispatchers = dispatchDefaults.map(defaultDispatch => {
    const existing = rawUsers.find(u => u.name === defaultDispatch.name);
    if (existing) {
      return {
        ...existing,
        username: defaultDispatch.username,
        role: 'dispatch' as const,
        active: true,
        status: 'Active' as const
      };
    }
    return defaultDispatch;
  });

  return [...officialAdmins, ...officialPurchasers, ...officialReceivers, ...officialDispatchers, ...otherUsers];
}

export function getCurrentUser(): User | null {
  const data = sessionStorage.getItem(KEY_CURRENT_USER) || localStorage.getItem(KEY_CURRENT_USER);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.name) {
        if (parsed.name === 'RL TAKMIL' || parsed.name === 'RL MUSTAQ' || parsed.id === 'u-takmil' || parsed.id === 'u-mustaq' || (parsed as { role?: string }).role === 'superadmin' || parsed.role === 'super_admin') {
          parsed.isSuperAdmin = true;
          parsed.role = 'super_admin';
        }
        const allowedAdmins = ['RL TAKMIL', 'RL MUSTAQ', 'RL POLASH', 'RL MURSHID', 'RL SAMIR', 'RL NISAM'];
        if (parsed.role === 'admin' && !allowedAdmins.includes(parsed.name)) {
          saveCurrentUser(INITIAL_USERS[0]);
          return INITIAL_USERS[0];
        }
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return INITIAL_USERS[0];
}

export function saveCurrentUser(user: User | null, remember: boolean = true) {
  if (user) {
    if (user.name === 'RL TAKMIL' || user.name === 'RL MUSTAQ' || user.id === 'u-takmil' || user.id === 'u-mustaq' || (user.role as string) === 'superadmin') {
      user.isSuperAdmin = true;
    }
    sessionStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
    if (remember) {
      localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEY_CURRENT_USER);
    }
  } else {
    sessionStorage.removeItem(KEY_CURRENT_USER);
    localStorage.removeItem(KEY_CURRENT_USER);
  }
}

export function getLocalUsers(): User[] {
  const raw = localStorage.getItem(KEY_LOCAL_USERS);
  if (raw) {
    try {
      const parsed: User[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = sanitizeAndMergeAdmins(parsed);
        saveLocalUsers(sanitized);
        return sanitized;
      }
    } catch {
      // fallback
    }
  }
  saveLocalUsers(INITIAL_USERS);
  return INITIAL_USERS;
}

export function saveLocalUsers(users: User[]) {
  localStorage.setItem(KEY_LOCAL_USERS, JSON.stringify(users));
}

export function getLocalPOs(): PurchaseOrder[] {
  const raw = localStorage.getItem(KEY_LOCAL_POS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return INITIAL_POS;
}

export function saveLocalPOs(pos: PurchaseOrder[]) {
  localStorage.setItem(KEY_LOCAL_POS, JSON.stringify(pos || []));
}

export function getLocalAuditLogs(): AuditLog[] {
  const raw = localStorage.getItem(KEY_LOCAL_LOGS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return INITIAL_LOGS;
}

export function saveLocalAuditLogs(logs: AuditLog[]) {
  localStorage.setItem(KEY_LOCAL_LOGS, JSON.stringify(logs));
}


