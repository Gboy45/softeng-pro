export type UserRole = 'admin' | 'personnel';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  type: string;
  gender: string;
  size: number;
  stock: number;
  price: number;
  location: string;
  barcode: string; // Exactly 13 digits
  hasTester?: boolean;
  batchCode?: string;
  updatedAt?: string;
}

export type StockAdjustmentReason =
  | 'New Delivery / Restock'
  | 'Customer Return'
  | 'Inventory Audit Correction'
  | 'Opened as Store Tester'
  | 'Damaged / Broken Bottle'
  | 'Pull-out / Display';

export interface StockLogEntry {
  id: string;
  itemId: string;
  itemName: string;
  brand: string;
  size: number;
  mode: 'add' | 'subtract';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export type PaymentMethod = 'Cash' | 'GCash' | 'Maya' | 'Card' | 'Bank Transfer';

export interface SalePurchasedItem {
  itemId: string;
  name: string;
  brand: string;
  size: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  name: string;
  date: string;
  amount: number;
  note?: string;
  items?: SalePurchasedItem[];
  paymentMethod?: PaymentMethod;
  amountTendered?: number;
  changeDue?: number;
  cashier?: string;
}

export interface Personnel {
  id: string;
  name: string;
  username: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'inventory'
  | 'scan'
  | 'sales'
  | 'reports'
  | 'accounts'
  | 'staff'
  | 'settings';

export type ScanFlowStep =
  | 'idle'
  | 'camera_active'
  | 'prompt_existing_quantity' // Item in inventory -> how many to add
  | 'prompt_confirm_add_new'   // Item NOT in inventory -> "Would you like to add to inventory?"
  | 'prompt_enter_details'     // User clicked Yes -> Prompt for product name & price details
  | 'success_feedback';        // Confirmation toast
