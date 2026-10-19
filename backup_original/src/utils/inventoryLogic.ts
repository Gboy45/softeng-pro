import type { InventoryItem, UserRole } from '../types/inventory.js';

export const BARCODE_EXACT_LENGTH = 13;
export const MAX_PURCHASE_AMOUNT = 500000;
export const NAME_PATTERN = /^[A-Za-z\u00C0-\u017F .'-]+$/;

export function isValidNameInput(value: string): boolean {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  return NAME_PATTERN.test(trimmed);
}

export function sanitizeNameInput(value: string): string {
  return String(value || '')
    .replace(/[^A-Za-z\u00C0-\u017F .'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Only allows numeric digits and caps length strictly at 13 digits.
 */
export function cleanBarcodeDigits(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, BARCODE_EXACT_LENGTH);
}

export function validateBarcode13Digits(barcode: string): { isValid: boolean; sanitized: string; error?: string } {
  const digits = cleanBarcodeDigits(barcode);
  if (!digits) {
    return { isValid: false, sanitized: '', error: 'Barcode number is required' };
  }
  if (digits.length > BARCODE_EXACT_LENGTH) {
    return {
      isValid: false,
      sanitized: digits.slice(0, BARCODE_EXACT_LENGTH),
      error: `Barcode cannot exceed ${BARCODE_EXACT_LENGTH} digits`,
    };
  }
  return { isValid: true, sanitized: digits };
}

export function canEditBarcode(role?: UserRole | null): boolean {
  return role === 'admin';
}

export function validateProductName(name: string): { isValid: boolean; sanitized: string; error?: string } {
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return { isValid: false, sanitized: '', error: 'Product name is required' };
  }
  if (!NAME_PATTERN.test(trimmed)) {
    return {
      isValid: false,
      sanitized: sanitizeNameInput(name),
      error: 'Product name must only contain letters, spaces, hyphens, and apostrophes',
    };
  }
  return { isValid: true, sanitized: trimmed };
}

export function validatePrice(price: string | number): { isValid: boolean; parsedPrice: number; error?: string } {
  const num = typeof price === 'number' ? price : parseFloat(String(price || '').replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num < 0) {
    return { isValid: false, parsedPrice: 0, error: 'Price must be a valid non-negative number' };
  }
  return { isValid: true, parsedPrice: Number(num.toFixed(2)) };
}

export function findItemByBarcode(items: InventoryItem[], barcode: string): InventoryItem | undefined {
  const normalized = cleanBarcodeDigits(barcode);
  if (!normalized) return undefined;
  return items.find((item) => cleanBarcodeDigits(item.barcode) === normalized);
}

export function calculateNewStock(currentStock: number, quantityToAdd: number): number {
  const qty = Math.max(1, Math.min(99999, Math.floor(quantityToAdd)));
  return Math.max(0, currentStock + qty);
}

export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₱${formatted}`;
}

export function getStockStatus(stock: number): { label: string; tone: 'success' | 'warn' | 'danger' } {
  const num = Number(stock || 0);
  if (num <= 0) return { label: 'Out of Stock', tone: 'danger' };
  if (num <= 5) return { label: 'Low Stock', tone: 'warn' };
  return { label: 'In Stock', tone: 'success' };
}

export function computeInventoryStats(items: InventoryItem[]) {
  const totalItems = items.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.price || 0), 0);
  const skus = items.length;

  const bySize: Record<number, number> = {};
  items.forEach((item) => {
    const size = Number(item.size || 0);
    bySize[size] = (bySize[size] || 0) + Number(item.stock || 0);
  });

  const sizeBreakdown = Object.keys(bySize)
    .map(Number)
    .sort((a, b) => a - b)
    .map((size) => ({ size, count: bySize[size] }));

  return { totalItems, totalValue, skus, sizeBreakdown };
}
