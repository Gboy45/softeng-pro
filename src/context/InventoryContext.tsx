import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { InventoryItem, Sale, Personnel, ActiveTab, UserAccount, UserRole } from '../types/inventory.js';

const STORAGE_ITEMS_KEY = 'aura_parfums_items_v3';
const STORAGE_SALES_KEY = 'aura_parfums_sales_v3';
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
    gender: 'For Women',
    size: 100,
    stock: 10,
    price: 48.0,
    location: 'Shelf C - Row 2',
    barcode: '8122560223450',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-2',
    name: 'Bleu de Chanel',
    brand: 'Chanel',
    type: 'Eau de Parfum',
    gender: 'For Men',
    size: 150,
    stock: 4, // Low Stock (4 left)
    price: 120.0,
    location: 'Shelf A - Row 4',
    barcode: '3145891267229',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-3',
    name: 'Chanel Chance',
    brand: 'Chanel',
    type: 'Eau de Parfum',
    gender: 'For Women',
    size: 100,
    stock: 15,
    price: 89.99,
    location: 'Shelf A - Row 2',
    barcode: '3145891265478',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-4',
    name: 'Dior Sauvage',
    brand: 'Dior',
    type: 'Eau de Toilette',
    gender: 'For Men',
    size: 100,
    stock: 20,
    price: 74.5,
    location: 'Shelf A - Row 3',
    barcode: '3348901250158',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-5',
    name: 'Paco Rabanne One Million',
    brand: 'Paco Rabanne',
    type: 'Eau de Toilette',
    gender: 'For Men',
    size: 100,
    stock: 2, // Low Stock (2 left)
    price: 82.0,
    location: 'Shelf C - Row 3',
    barcode: '3349668529513',
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
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-7',
    name: 'Versace Dylan Blue',
    brand: 'Versace',
    type: 'Eau de Toilette',
    gender: 'For Men',
    size: 100,
    stock: 18,
    price: 92.0,
    location: 'Shelf B - Row 1',
    barcode: '8011003835521',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-8',
    name: 'YSL Libre',
    brand: 'YSL',
    type: 'Eau de Parfum',
    gender: 'For Women',
    size: 90,
    stock: 12,
    price: 65.0,
    location: 'Shelf B - Row 2',
    barcode: '3614272562481',
    updatedAt: new Date().toISOString(),
  },
];

const getIsoDateAgo = (daysAgo: number) => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toISOString().slice(0, 10);
};

// Initial Boutique Sales Ledger Records (dynamic dates for Today, Weekly, Monthly, Quarterly, All Time)
const SEED_SALES: Sale[] = [
  { id: 'sale-1', name: 'Walk-in Customer', date: getIsoDateAgo(0), amount: 89.99, note: 'Chanel Chance' },
  { id: 'sale-2', name: 'Walk-in Customer', date: getIsoDateAgo(0), amount: 74.5, note: 'Dior Sauvage' },
  { id: 'sale-3', name: 'Maria Santos', date: getIsoDateAgo(2), amount: 120.0, note: 'Bleu de Chanel' },
  { id: 'sale-4', name: 'Walk-in Customer', date: getIsoDateAgo(5), amount: 65.0, note: 'YSL Libre' },
  { id: 'sale-5', name: 'Jon Reyes', date: getIsoDateAgo(14), amount: 92.0, note: 'Versace Dylan Blue' },
  { id: 'sale-6', name: 'Elena Gomez', date: getIsoDateAgo(40), amount: 145.0, note: 'Tom Ford Oud Wood' },
];

export interface InventoryContextType {
  currentUser: UserAccount | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  items: InventoryItem[];
  sales: Sale[];
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
  addStock: (id: string, quantityToAdd: number) => Promise<{ success: boolean; newStock: number; item: InventoryItem }>;
  decrementStock: (id: string, amount?: number) => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => Promise<InventoryItem>;
  updateItem: (id: string, patch: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>;
  deleteSale: (id: string) => Promise<void>;
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
      if (stored) return JSON.parse(stored);
    } catch {
      // not logged in
    }
    // Default to Boutique Director (Admin) matching screenshots
    return {
      id: 'user-ferdie',
      name: 'Boutique Director',
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
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return SEED_SALES;
  });

  const [personnel, setPersonnel] = useState<Personnel[]>([
    { id: 'p-admin', name: 'Boutique Director (Ferdie)', username: 'ferdie', status: 'active', createdAt: '2026-09-01' },
    { id: 'p-staff', name: 'Charlene', username: 'charlene', status: 'active', createdAt: '2026-10-01' },
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
        name: 'Boutique Director',
        username: 'ferdie',
        role: 'admin',
      };
      setCurrentUser(account);
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(account));
      showToast('Logged in as Boutique Director');
      return { success: true };
    }

    if (u === 'charlene' && p === '123') {
      const account: UserAccount = {
        id: 'user-charlene',
        name: 'Charlene',
        username: 'charlene',
        role: 'personnel',
      };
      setCurrentUser(account);
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(account));
      showToast('Logged in as Personnel (Charlene)');
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
    async (id: string, quantityToAdd: number) => {
      triggerCloudSync();
      const qty = Math.max(1, Math.floor(quantityToAdd));
      let newStock = 0;
      let updatedItem: InventoryItem | null = null;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            newStock = Math.max(0, item.stock + qty);
            updatedItem = { ...item, stock: newStock, updatedAt: new Date().toISOString() };
            return updatedItem;
          }
          return item;
        })
      );

      if (updatedItem) {
        showToast(`Stock updated! +${qty} (${(updatedItem as InventoryItem).name}: ${newStock} pcs)`);
        return { success: true, newStock, item: updatedItem as InventoryItem };
      }
      return { success: false, newStock: 0, item: null as unknown as InventoryItem };
    },
    [triggerCloudSync, showToast]
  );

  // Decrement stock (for [-] button on fragrance cards)
  const decrementStock = useCallback(
    async (id: string, amount: number = 1) => {
      triggerCloudSync();
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const newStock = Math.max(0, item.stock - amount);
            return { ...item, stock: newStock, updatedAt: new Date().toISOString() };
          }
          return item;
        })
      );
    },
    [triggerCloudSync]
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
      showToast(`Added "${newItem.name}" to inventory`);
      return newItem;
    },
    [triggerCloudSync, showToast]
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

  const addPersonnel = useCallback((name: string, username: string) => {
    const newPerson: Personnel = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
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
    localStorage.removeItem(STORAGE_PIN_KEY);
    setItems(SEED_ITEMS);
    setSales(SEED_SALES);
    showToast('Reset to boutique inventory baseline');
  }, [showToast]);

  return (
    <InventoryContext.Provider
      value={{
        currentUser,
        login,
        logout,
        items,
        sales,
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
