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
  updatedAt?: string;
}

export interface Sale {
  id: string;
  name: string;
  date: string;
  amount: number;
  note?: string;
}

export interface Personnel {
  id: string;
  name: string;
  username: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type ActiveTab = 'dashboard' | 'inventory' | 'scan' | 'reports' | 'sales' | 'settings';

export type ScanFlowStep =
  | 'idle'
  | 'camera_active'
  | 'prompt_existing_quantity' // Item in inventory -> how many to add
  | 'prompt_confirm_add_new'   // Item NOT in inventory -> "Would you like to add to inventory?"
  | 'prompt_enter_details'     // User clicked Yes -> Prompt for product name & price details
  | 'success_feedback';        // Confirmation toast
