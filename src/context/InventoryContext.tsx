import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { InventoryItem, Sale, Personnel, ActiveTab, UserAccount, UserRole } from '../types/inventory.js';

const STORAGE_ITEMS_KEY = 'retail_inventory_items_v2';
const STORAGE_SALES_KEY = 'retail_inventory_sales_v2';
const STORAGE_PIN_KEY = 'retail_inventory_pin_v2';
const STORAGE_AUTH_KEY = 'retail_inventory_auth_v2';

const SEED_ITEMS: InventoryItem[] = [
  {
    id: 'item-1',
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
    id: 'item-2',
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
    id: 'item-3',
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
    id: 'item-4',
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
  {
    id: 'item-5',
    name: 'Bleu de Chanel',
    brand: 'Chanel',
    type: 'Eau de Parfum',
    gender: 'For Men',
    size: 150,
    stock: 8,
    price: 120.0,
    location: 'Shelf A - Row 4',
    barcode: '3145891267229',
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
    id: 'item-8',
    name: 'Paco Rabanne One Million',
    brand: 'Paco Rabanne',
    type: 'Eau de Toilette',
    gender: 'For Men',
    size: 100,
    stock: 9,
    price: 82.0,
    location: 'Shelf C - Row 3',
    barcode: '3349668529513',
    updatedAt: new Date().toISOString(),
  },
];

const SEED_SALES: Sale[] = [
  { id: 'sale-1', name: 'Walk-in Customer', date: new Date().toISOString().slice(0, 10), amount: 89.99, note: 'Chanel Chance' },
  { id: 'sale-2', name: 'Walk-in Customer', date: new Date().toISOString().slice(0, 10), amount: 74.5, note: 'Dior Sauvage' },
  { id: 'sale-3', name: 'Maria Santos', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), amount: 120.0, note: 'Bleu de Chanel' },
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
  editingItem: InventoryItem | null;
  setEditingItem: (item: InventoryItem | null) => void;
  addStock: (id: string, quantityToAdd: number) => Promise<{ success: boolean; newStock: number; item: InventoryItem }>;
  addItem: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => Promise<InventoryItem>;
  updateItem: (id: string, patch: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale>;
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
    return null;
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

  const [personnel] = useState<Personnel[]>([
    { id: 'p-admin', name: 'Ferdie', username: 'ferdie', status: 'active', createdAt: new Date().toISOString() },
    { id: 'p-staff', name: 'Charlene', username: 'charlene', status: 'active', createdAt: new Date().toISOString() },
  ]);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [initialBarcodeForScan, setInitialBarcodeForScan] = useState<string | null>(null);

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
        name: 'Ferdie',
        username: 'ferdie',
        role: 'admin',
      };
      setCurrentUser(account);
      localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(account));
      showToast('Logged in as Administrator (Ferdie)');
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
      error: 'Invalid credentials. Use Admin (ferdie / 123) or Personnel (charlene / 123).',
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
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SALES_KEY, JSON.stringify(sales));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }, [sales]);

  // Add stock quantity to existing inventory item
  const addStock = useCallback(
    async (id: string, quantityToAdd: number) => {
      triggerCloudSync();
      const qty = Math.max(1, Math.min(99999, Math.floor(quantityToAdd)));
      let updatedItem: InventoryItem | null = null;
      let newStock = 0;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            newStock = Number(item.stock || 0) + qty;
            updatedItem = {
              ...item,
              stock: newStock,
              updatedAt: new Date().toISOString(),
            };
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

  // Add new product with name and price details
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

  const verifyPin = useCallback(async (candidate: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_PIN_KEY);
      const pin = stored || '1234';
      return String(candidate).trim() === pin;
    } catch {
      return candidate === '1234';
    }
  }, []);

  const updatePin = useCallback(async (newPin: string) => {
    const clean = String(newPin || '').trim();
    if (!/^\d{4,8}$/.test(clean)) return false;
    try {
      localStorage.setItem(STORAGE_PIN_KEY, clean);
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetDemoData = useCallback(async () => {
    setItems(SEED_ITEMS.map((item) => ({ ...item, id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })));
    setSales(SEED_SALES);
    showToast('Inventory reset to sample products');
    triggerCloudSync();
  }, [triggerCloudSync, showToast]);

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
        editingItem,
        setEditingItem,
        addStock,
        addItem,
        updateItem,
        deleteItem,
        addSale,
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
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return ctx;
};
