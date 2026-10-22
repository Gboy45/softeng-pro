import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type {
  InventoryItem,
  Sale,
  Personnel,
  ActiveTab,
  UserAccount,
  StockLogEntry,
} from '../types/inventory.js';
import {
  resolveSalePurchasedItems,
  getSystemDateString,
  getSystemDateOffsetString,
} from '../utils/inventoryLogic.js';

const STORAGE_ITEMS_KEY = 'aura_parfums_items_v3';
const STORAGE_SALES_KEY = 'aura_parfums_sales_v3';
const STORAGE_STOCK_LOGS_KEY = 'aura_parfums_stock_logs_v3';
const STORAGE_PIN_KEY = 'aura_parfums_pin_v3';
const STORAGE_AUTH_KEY = 'aura_parfums_auth_v3';
const STORAGE_CURRENCY_KEY = 'aura_parfums_currency_v3';

// Initial 8 Boutique Fragrances from screenshots (87 bottles total, $7,269.85 retail valuation)
const SEED_ITEMS: InventoryItem[] = [
  {
    id: 'item-1',
    name: 'Ariana Grande Cloud',
    brand: 'Ariana Grande',
    type: 'Eau de Parfum',
    gender: 'Women',
    size: 100,
    stock: 10,
    price: 48.0,
    location: 'Shelf C - Row 2',
    barcode: '8122560223450',
    hasTester: true,
    batchCode: 'AG-2601',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-2',
    name: 'Bleu de Chanel',
    brand: 'Chanel',
    type: 'Eau de Parfum',
    gender: 'Men',
    size: 150,
    stock: 4, // Low Stock (4 left)
    price: 120.0,
    location: 'Shelf A - Row 4',
    barcode: '3145891267229',
    hasTester: true,
    batchCode: 'CH-8804',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-3',
    name: 'Chanel Chance',
    brand: 'Chanel',
    type: 'Eau de Parfum',
    gender: 'Women',
    size: 100,
    stock: 15,
    price: 89.99,
    location: 'Shelf A - Row 2',
    barcode: '3145891265478',
    hasTester: true,
    batchCode: 'CH-7201',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-4',
    name: 'Dior Sauvage',
    brand: 'Dior',
    type: 'Eau de Toilette',
    gender: 'Men',
    size: 100,
    stock: 20,
    price: 74.5,
    location: 'Shelf A - Row 3',
    barcode: '3348901250158',
    hasTester: true,
    batchCode: 'DR-4A09',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-5',
    name: 'Paco Rabanne One Million',
    brand: 'Paco Rabanne',
    type: 'Eau de Toilette',
    gender: 'Men',
    size: 100,
    stock: 2, // Low Stock (2 left)
    price: 82.0,
    location: 'Shelf C - Row 3',
    barcode: '3349668529513',
    hasTester: false,
    batchCode: 'PR-1102',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-6',
    name: 'Tom Ford Oud Wood',
    brand: 'Tom Ford',
    type: 'Eau de Parfum',
    gender: 'Unisex',
    size: 50,
    stock: 6,
    price: 145.0,
    location: 'Shelf C - Row 1',
    barcode: '8880660000000',
    hasTester: true,
    batchCode: 'TF-A92',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-7',
    name: 'Versace Dylan Blue',
    brand: 'Versace',
    type: 'Eau de Toilette',
    gender: 'Men',
    size: 100,
    stock: 18,
    price: 92.0,
    location: 'Shelf B - Row 1',
    barcode: '8011003835521',
    hasTester: false,
    batchCode: 'VS-3310',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-8',
    name: 'YSL Libre',
    brand: 'YSL',
    type: 'Eau de Parfum',
    gender: 'Women',
    size: 90,
    stock: 12,
    price: 65.0,
    location: 'Shelf B - Row 2',
    barcode: '3614272562481',
    hasTester: true,
    batchCode: 'YSL-62B',
    updatedAt: new Date().toISOString(),
  },
];

const getIsoDateAgo = (daysAgo: number) => getSystemDateOffsetString(daysAgo);

// Initial Store Sales Ledger Records (dynamic dates for Today, Weekly, Monthly, Quarterly, All Time)
const SEED_SALES: Sale[] = [
  {
    id: 'sale-1',
    name: 'Walk-in Customer',
    date: getIsoDateAgo(0),
    amount: 89.99,
    note: '1x Chanel Chance',
    paymentMethod: 'Cash',
    amountTendered: 100.0,
    changeDue: 10.01,
    cashier: 'Admin',
    items: [
      {
        itemId: 'item-3',
        name: 'Chanel Chance',
        brand: 'Chanel',
        size: 100,
        quantity: 1,
        unitPrice: 89.99,
        subtotal: 89.99,
      },
    ],
  },
  {
    id: 'sale-2',
    name: 'Walk-in Customer',
    date: getIsoDateAgo(0),
    amount: 74.5,
    note: '1x Dior Sauvage',
    paymentMethod: 'GCash',
    cashier: 'Admin',
    items: [
      {
        itemId: 'item-4',
        name: 'Dior Sauvage',
        brand: 'Dior',
        size: 100,
        quantity: 1,
        unitPrice: 74.5,
        subtotal: 74.5,
      },
    ],
  },
  {
    id: 'sale-3',
    name: 'Maria Santos',
    date: getIsoDateAgo(2),
    amount: 120.0,
    note: '1x Bleu de Chanel',
    paymentMethod: 'Card',
    cashier: 'Associate',
    items: [
      {
        itemId: 'item-2',
        name: 'Bleu de Chanel',
        brand: 'Chanel',
        size: 150,
        quantity: 1,
        unitPrice: 120.0,
        subtotal: 120.0,
      },
    ],
  },
  {
    id: 'sale-4',
    name: 'Walk-in Customer',
    date: getIsoDateAgo(5),
    amount: 65.0,
    note: '1x YSL Libre',
    paymentMethod: 'Cash',
    amountTendered: 70.0,
    changeDue: 5.0,
    cashier: 'Associate',
    items: [
      {
        itemId: 'item-8',
        name: 'YSL Libre',
        brand: 'YSL',
        size: 90,
        quantity: 1,
        unitPrice: 65.0,
        subtotal: 65.0,
      },
    ],
  },
  {
    id: 'sale-5',
    name: 'Jon Reyes',
    date: getIsoDateAgo(14),
    amount: 92.0,
    note: '1x Versace Dylan Blue',
    paymentMethod: 'GCash',
    cashier: 'Admin',
    items: [
      {
        itemId: 'item-7',
        name: 'Versace Dylan Blue',
        brand: 'Versace',
        size: 100,
        quantity: 1,
        unitPrice: 92.0,
        subtotal: 92.0,
      },
    ],
  },
  {
    id: 'sale-6',
    name: 'Elena Gomez',
    date: getIsoDateAgo(40),
    amount: 145.0,
    note: '1x Tom Ford Oud Wood',
    paymentMethod: 'Card',
    cashier: 'Admin',
    items: [
      {
        itemId: 'item-6',
        name: 'Tom Ford Oud Wood',
        brand: 'Tom Ford',
        size: 50,
        quantity: 1,
        unitPrice: 145.0,
        subtotal: 145.0,
      },
    ],
  },
];

const SEED_STOCK_LOGS: StockLogEntry[] = [
  {
    id: 'log-1',
    itemId: 'item-4',
    itemName: 'Dior Sauvage',
    brand: 'Dior',
    size: 100,
    mode: 'add',
    quantity: 10,
    previousStock: 10,
    newStock: 20,
    reason: 'New Delivery / Restock',
    performedBy: 'Admin',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'log-2',
    itemId: 'item-2',
    itemName: 'Bleu de Chanel',
    brand: 'Chanel',
    size: 150,
    mode: 'subtract',
    quantity: 1,
    previousStock: 5,
    newStock: 4,
    reason: 'Opened as Store Tester',
    performedBy: 'Associate',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'log-3',
    itemId: 'item-3',
    itemName: 'Chanel Chance',
    brand: 'Chanel',
    size: 100,
    mode: 'add',
    quantity: 5,
    previousStock: 10,
    newStock: 15,
    reason: 'New Delivery / Restock',
    performedBy: 'Admin',
    timestamp: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
];

export interface InventoryContextType {
  currentUser: UserAccount | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  items: InventoryItem[];
  sales: Sale[];
  stockLogs: StockLogEntry[];
  personnel: Personnel[];
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSyncedAt: Date | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isScannerOpen: boolean;
  setIsScannerOpen: (open: boolean) => void;
  isAddItemOpen: boolean;
  setIsAddItemOpen: (open: boolean) => void;
  isRecordSaleOpen: boolean;
  setIsRecordSaleOpen: (open: boolean) => void;
  currency: string;
  setCurrency: (c: string) => void;
  editingItem: InventoryItem | null;
  setEditingItem: (item: InventoryItem | null) => void;
  addStock: (
    id: string,
    quantityToAdd: number,
    reason?: string
  ) => Promise<{ success: boolean; newStock: number; item: InventoryItem }>;
  decrementStock: (id: string, amount?: number, reason?: string) => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => Promise<InventoryItem>;
  updateItem: (id: string, patch: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>;
  deleteSale: (id: string) => Promise<void>;
  returnSaleAndRestoreStock: (id: string) => Promise<void>;
  exportDatabaseBackup: () => void;
  importDatabaseBackup: (jsonContent: string) => { success: boolean; error?: string };
  addPersonnel: (name: string, username: string) => void;
  verifyPin: (pin: string) => Promise<boolean>;
  updatePin: (newPin: string) => Promise<boolean>;
  resetDemoData: () => Promise<void>;
  toast: string | null;
  showToast: (message: string) => void;
  initialBarcodeForScan: string | null;
  setInitialBarcodeForScan: (code: string | null) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Authentication state: ferdie / 123 (Admin), charlene / 123 (Personnel)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserAccount;
        if (parsed.username === 'ferdie' || parsed.name === 'Boutique Director') {
          parsed.name = 'Admin';
        } else if (parsed.username === 'charlene' || parsed.name === 'Boutique Associate') {
          parsed.name = 'Associate';
        }
        return parsed;
      }
    } catch {
      // not logged in
    }
    // Default to Admin
    return {
      id: 'user-ferdie',
      name: 'Admin',
      username: 'ferdie',
      role: 'admin',
    };
  });

  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ITEMS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return SEED_ITEMS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SALES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Sale[];
        const todayStr = getSystemDateString();
        const seedDayOffsets: Record<string, number> = {
          'sale-1': 0,
          'sale-2': 0,
          'sale-3': 2,
          'sale-4': 5,
          'sale-5': 14,
          'sale-6': 40,
        };
        const normalized = parsed.map((s) => {
          if (s.id in seedDayOffsets) {
            return { ...s, date: getSystemDateOffsetString(seedDayOffsets[s.id]) };
          }
          // If any recorded sale has a future date due to UTC drift, clamp it to system today
          if ((s.date || '').slice(0, 10) > todayStr) {
            return { ...s, date: todayStr };
          }
          return s;
        });
        return normalized;
      }
    } catch {
      // Fallback
    }
    return SEED_SALES;
  });

  const [stockLogs, setStockLogs] = useState<StockLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_STOCK_LOGS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return SEED_STOCK_LOGS;
  });

  const [personnel, setPersonnel] = useState<Personnel[]>([
    { id: 'p-admin', name: 'Admin (Ferdie)', username: 'ferdie', status: 'active', createdAt: '2026-09-01' },
    { id: 'p-staff', name: 'Associate (Charlene)', username: 'charlene', status: 'active', createdAt: '2026-10-01' },
  ]);

  const [currency, setCurrencyState] = useState<string>('₱');

  const setCurrency = (_c: string) => {
    setCurrencyState('₱');
    try {
      localStorage.setItem(STORAGE_CURRENCY_KEY, '₱');
    } catch {}
  };

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [initialBarcodeForScan, setInitialBarcodeForScan] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SALES_KEY, JSON.stringify(sales));
    } catch {}
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STOCK_LOGS_KEY, JSON.stringify(stockLogs));
    } catch {}
  }, [stockLogs]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  const login = useCallback((username: string, password: string) => {
    const u = String(username || '').trim().toLowerCase();
    const p = String(password || '').trim();

    if (u === 'ferdie' && p === '123') {
      const account: UserAccount = {
        id: 'user-ferdie',
        name: 'Admin',
        username: 'ferdie',
        role: 'admin',
      };
      setCurrentUser(account);
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(account));
      showToast('Logged in as Admin');
      return { success: true };
    }

    if (u === 'charlene' && p === '123') {
      const account: UserAccount = {
        id: 'user-charlene',
        name: 'Associate',
        username: 'charlene',
        role: 'personnel',
      };
      setCurrentUser(account);
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(account));
      showToast('Logged in as Associate');
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid username or password. Please check your credentials and try again.',
    };
  }, [showToast]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_AUTH_KEY);
    showToast('Logged out');
  }, [showToast]);

  const triggerCloudSync = useCallback(() => {
    setSyncStatus('syncing');
    const timer = setTimeout(() => {
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // Add stock to an existing item
  const addStock = useCallback(
    async (id: string, quantityToAdd: number, reason: string = 'New Delivery / Restock') => {
      triggerCloudSync();
      const qty = Math.max(1, Math.floor(quantityToAdd));
      let newStock = 0;
      let previousStock = 0;
      let updatedItem: InventoryItem | null = null;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            previousStock = item.stock;
            newStock = Math.max(0, item.stock + qty);
            updatedItem = { ...item, stock: newStock, updatedAt: new Date().toISOString() };
            return updatedItem;
          }
          return item;
        })
      );

      if (updatedItem) {
        const target = updatedItem as InventoryItem;
        const entry: StockLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          itemId: target.id,
          itemName: target.name,
          brand: target.brand,
          size: target.size,
          mode: 'add',
          quantity: qty,
          previousStock,
          newStock,
          reason,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
        };
        setStockLogs((prev) => [entry, ...prev]);
        showToast(`Stock updated! +${qty} (${target.name}: ${newStock} pcs · ${reason})`);
        return { success: true, newStock, item: target };
      }
      return { success: false, newStock: 0, item: null as unknown as InventoryItem };
    },
    [triggerCloudSync, showToast, currentUser]
  );

  // Decrement stock (for [-] button on fragrance cards or checkout)
  const decrementStock = useCallback(
    async (id: string, amount: number = 1, reason?: string) => {
      triggerCloudSync();
      const qty = Math.max(1, Math.floor(amount));
      let previousStock = 0;
      let newStock = 0;
      let targetItem: InventoryItem | null = null;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            previousStock = item.stock;
            newStock = Math.max(0, item.stock - qty);
            const markTester =
              reason === 'Opened as Store Tester' ? true : item.hasTester;
            targetItem = {
              ...item,
              stock: newStock,
              hasTester: markTester,
              updatedAt: new Date().toISOString(),
            };
            return targetItem;
          }
          return item;
        })
      );

      if (targetItem && reason) {
        const target = targetItem as InventoryItem;
        const entry: StockLogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          itemId: target.id,
          itemName: target.name,
          brand: target.brand,
          size: target.size,
          mode: 'subtract',
          quantity: qty,
          previousStock,
          newStock,
          reason,
          performedBy: currentUser?.name || 'Admin',
          timestamp: new Date().toISOString(),
        };
        setStockLogs((prev) => [entry, ...prev]);
      }
    },
    [triggerCloudSync, currentUser]
  );

  // Add new product
  const addItem = useCallback(
    async (newItemData: Omit<InventoryItem, 'id' | 'updatedAt'>) => {
      triggerCloudSync();
      const newItem: InventoryItem = {
        ...newItemData,
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        price: Number(newItemData.price || 0),
        stock: Number(newItemData.stock || 1),
        size: Number(newItemData.size || 100),
        updatedAt: new Date().toISOString(),
      };

      setItems((prev) => [newItem, ...prev]);
      const entry: StockLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: newItem.id,
        itemName: newItem.name,
        brand: newItem.brand,
        size: newItem.size,
        mode: 'add',
        quantity: newItem.stock,
        previousStock: 0,
        newStock: newItem.stock,
        reason: 'New Catalog Fragrance',
        performedBy: currentUser?.name || 'Admin',
        timestamp: new Date().toISOString(),
      };
      setStockLogs((prev) => [entry, ...prev]);
      showToast(`Added "${newItem.name}" to inventory`);
      return newItem;
    },
    [triggerCloudSync, showToast, currentUser]
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<InventoryItem>) => {
      triggerCloudSync();
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...patch,
                price: patch.price !== undefined ? Number(patch.price) : item.price,
                stock: patch.stock !== undefined ? Number(patch.stock) : item.stock,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
      showToast('Changes saved');
    },
    [triggerCloudSync, showToast]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      triggerCloudSync();
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast('Item deleted from inventory');
    },
    [triggerCloudSync, showToast]
  );

  const addSale = useCallback(
    async (saleData: Omit<Sale, 'id'>) => {
      triggerCloudSync();
      const record: Sale = {
        ...saleData,
        id: `sale-${Date.now()}`,
        date: getSystemDateString(),
        amount: Math.min(Number(saleData.amount) || 0, 500000),
      };
      setSales((prev) => [record, ...prev]);
      showToast('Sale record logged');
      return record;
    },
    [triggerCloudSync, showToast]
  );

  const deleteSale = useCallback(
    async (id: string) => {
      triggerCloudSync();
      setSales((prev) => prev.filter((s) => s.id !== id));
      showToast('Sale record removed');
    },
    [triggerCloudSync, showToast]
  );

  const returnSaleAndRestoreStock = useCallback(
    async (id: string) => {
      triggerCloudSync();
      const targetSale = sales.find((s) => s.id === id);
      if (!targetSale) return;

      const purchasedItems = resolveSalePurchasedItems(targetSale, items);
      let restoredBottles = 0;
      const newLogs: StockLogEntry[] = [];

      setItems((prev) =>
        prev.map((invItem) => {
          const matchedPurchased = purchasedItems.filter(
            (p) =>
              p.itemId === invItem.id ||
              p.name.toLowerCase() === invItem.name.toLowerCase()
          );
          if (matchedPurchased.length > 0) {
            const qtyToRestore = matchedPurchased.reduce((sum, p) => sum + p.quantity, 0);
            restoredBottles += qtyToRestore;
            const nextStock = invItem.stock + qtyToRestore;
            newLogs.push({
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              itemId: invItem.id,
              itemName: invItem.name,
              brand: invItem.brand,
              size: invItem.size,
              mode: 'add',
              quantity: qtyToRestore,
              previousStock: invItem.stock,
              newStock: nextStock,
              reason: 'Customer Return',
              performedBy: currentUser?.name || 'Admin',
              timestamp: new Date().toISOString(),
            });
            return {
              ...invItem,
              stock: nextStock,
              updatedAt: new Date().toISOString(),
            };
          }
          return invItem;
        })
      );

      if (newLogs.length > 0) {
        setStockLogs((prev) => [...newLogs, ...prev]);
      }

      setSales((prev) => prev.filter((s) => s.id !== id));
      showToast(
        restoredBottles > 0
          ? `Sale returned & restored +${restoredBottles} bottle${restoredBottles === 1 ? '' : 's'} to stock`
          : 'Sale returned and removed'
      );
    },
    [sales, items, triggerCloudSync, showToast, currentUser]
  );

  const exportDatabaseBackup = useCallback(() => {
    try {
      const payload = {
        version: 'aura_parfums_backup_v1',
        exportedAt: new Date().toISOString(),
        items,
        sales,
        stockLogs,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = getSystemDateString();
      a.href = url;
      a.download = `aura-parfums-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Database backup (.json) downloaded');
    } catch {
      showToast('Failed to export database backup');
    }
  }, [items, sales, stockLogs, showToast]);

  const importDatabaseBackup = useCallback(
    (jsonContent: string) => {
      try {
        const parsed = JSON.parse(jsonContent);
        if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.sales)) {
          return {
            success: false,
            error: 'Invalid backup file format. Expected items and sales arrays.',
          };
        }
        triggerCloudSync();
        setItems(parsed.items);
        setSales(parsed.sales);
        if (Array.isArray(parsed.stockLogs)) {
          setStockLogs(parsed.stockLogs);
        }
        showToast(
          `Restored ${parsed.items.length} fragrances and ${parsed.sales.length} sales records`
        );
        return { success: true };
      } catch {
        return {
          success: false,
          error: 'Could not parse JSON backup file.',
        };
      }
    },
    [triggerCloudSync, showToast]
  );

  const addPersonnel = useCallback((name: string, username: string) => {
    const newPerson: Personnel = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      status: 'active',
      createdAt: getSystemDateString(),
    };
    setPersonnel((prev) => [...prev, newPerson]);
    showToast(`Added personnel account @${newPerson.username}`);
  }, [showToast]);

  const verifyPin = useCallback(async (candidate: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_PIN_KEY);
      const expected = stored || '1234';
      return candidate === expected;
    } catch {
      return candidate === '1234';
    }
  }, []);

  const updatePin = useCallback(
    async (newPin: string) => {
      try {
        localStorage.setItem(STORAGE_PIN_KEY, newPin);
        showToast('PIN updated successfully');
        return true;
      } catch {
        return false;
      }
    },
    [showToast]
  );

  const resetDemoData = useCallback(async () => {
    localStorage.removeItem(STORAGE_ITEMS_KEY);
    localStorage.removeItem(STORAGE_SALES_KEY);
    localStorage.removeItem(STORAGE_STOCK_LOGS_KEY);
    localStorage.removeItem(STORAGE_PIN_KEY);
    setItems(SEED_ITEMS);
    setSales(SEED_SALES);
    setStockLogs(SEED_STOCK_LOGS);
    showToast('Reset to baseline inventory');
  }, [showToast]);

  return (
    <InventoryContext.Provider
      value={{
        currentUser,
        login,
        logout,
        items,
        sales,
        stockLogs,
        personnel,
        syncStatus,
        lastSyncedAt,
        activeTab,
        setActiveTab,
        isScannerOpen,
        setIsScannerOpen,
        isAddItemOpen,
        setIsAddItemOpen,
        isRecordSaleOpen,
        setIsRecordSaleOpen,
        currency,
        setCurrency,
        editingItem,
        setEditingItem,
        addStock,
        decrementStock,
        addItem,
        updateItem,
        deleteItem,
        addSale,
        deleteSale,
        returnSaleAndRestoreStock,
        exportDatabaseBackup,
        importDatabaseBackup,
        addPersonnel,
        verifyPin,
        updatePin,
        resetDemoData,
        toast,
        showToast,
        initialBarcodeForScan,
        setInitialBarcodeForScan,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
