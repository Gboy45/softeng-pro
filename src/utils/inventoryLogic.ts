import type { InventoryItem, Sale, SalePurchasedItem, UserRole } from '../types/inventory.js';

export type SalesReportPeriod = 'today' | 'weekly' | 'monthly' | 'quarterly' | 'all';

export const BARCODE_EXACT_LENGTH = 13;
export const MAX_PURCHASE_AMOUNT = 500000;
export const LOW_STOCK_THRESHOLD = 5;
export const HIGH_STOCK_THRESHOLD = 10;
export const NAME_PATTERN = /^[A-Za-z\u00C0-\u017F .'-]+$/;

/**
 * Returns YYYY-MM-DD based on the actual local system date (not UTC),
 * preventing timezone rollbacks in UTC+8 / local store environments.
 */
export function getSystemDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM-DD for N days ago relative to the local system calendar date.
 */
export function getSystemDateOffsetString(daysAgo: number, referenceDate: Date = new Date()): string {
  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - Math.floor(daysAgo)
  );
  return getSystemDateString(d);
}

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
 * If a 14-digit GTIN-14 with a leading '0' is scanned, strips the leading '0' to preserve the true 13-digit EAN-13.
 */
export function cleanBarcodeDigits(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 14 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.slice(0, BARCODE_EXACT_LENGTH);
}

/**
 * Validates standard GS1 Modulo-10 check digit for EAN-8 (8), UPC-A (12), EAN-13 (13), or GTIN-14 (14).
 */
export function isValidGs1Checksum(barcode: string): boolean {
  const digits = String(barcode || '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(digits.length)) {
    return false;
  }
  if (/^0+$/.test(digits)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < digits.length - 1; i++) {
    const d = digits.charCodeAt(digits.length - 2 - i) - 48;
    const weight = i % 2 === 0 ? 3 : 1;
    sum += d * weight;
  }
  const expectedCheck = (10 - (sum % 10)) % 10;
  const actualCheck = digits.charCodeAt(digits.length - 1) - 48;
  return expectedCheck === actualCheck;
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

  // 1. Exact digit match
  const exact = items.find((item) => cleanBarcodeDigits(item.barcode) === normalized);
  if (exact) return exact;

  // 2. Canonical UPC-A (12-digit) <-> EAN-13 (13-digit leading '0') equivalence
  const withoutLeadingZero =
    normalized.length === 13 && normalized.startsWith('0') ? normalized.slice(1) : normalized;
  const withLeadingZero =
    normalized.length === 12 ? `0${normalized}` : normalized;

  return items.find((item) => {
    const itemCode = cleanBarcodeDigits(item.barcode);
    return itemCode === withoutLeadingZero || itemCode === withLeadingZero;
  });
}

export function calculateNewStock(currentStock: number, quantityToAdd: number): number {
  const qty = Math.max(1, Math.min(99999, Math.floor(quantityToAdd)));
  return Math.max(0, currentStock + qty);
}

export function calculateSubtractedStock(currentStock: number, quantityToSubtract: number): number {
  const qty = Math.max(1, Math.min(99999, Math.floor(quantityToSubtract)));
  return Math.max(0, currentStock - qty);
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
  if (num <= LOW_STOCK_THRESHOLD) return { label: 'Low Stock', tone: 'warn' };
  return { label: 'In Stock', tone: 'success' };
}

export function getLowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items
    .filter((item) => Number(item.stock || 0) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0) || a.name.localeCompare(b.name));
}

export function getHighStockItems(items: InventoryItem[]): InventoryItem[] {
  return items
    .filter((item) => Number(item.stock || 0) >= HIGH_STOCK_THRESHOLD)
    .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0) || a.name.localeCompare(b.name));
}

export function computeInventoryStats(items: InventoryItem[]) {
  const totalItems = items.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.price || 0), 0);
  const skus = items.length;

  const bySize: Record<number, number> = {};
  const byBrand: Record<string, { count: number; skuCount: number }> = {};

  items.forEach((item) => {
    const size = Number(item.size || 0);
    const stock = Number(item.stock || 0);
    const brand = (item.brand || 'Unbranded').trim();
    bySize[size] = (bySize[size] || 0) + stock;
    if (!byBrand[brand]) {
      byBrand[brand] = { count: 0, skuCount: 0 };
    }
    byBrand[brand].count += stock;
    byBrand[brand].skuCount += 1;
  });

  const sizeBreakdown = Object.keys(bySize)
    .map(Number)
    .sort((a, b) => a - b)
    .map((size) => ({ size, count: bySize[size] }));

  const brandBreakdown = Object.entries(byBrand)
    .map(([brand, data]) => ({
      brand,
      count: data.count,
      skuCount: data.skuCount,
      percentage: totalItems > 0 ? Math.round((data.count / totalItems) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));

  const lowStockItems = getLowStockItems(items);
  const highStockItems = getHighStockItems(items);

  return { totalItems, totalValue, skus, sizeBreakdown, brandBreakdown, lowStockItems, highStockItems };
}

export function calculateChangeDue(totalAmount: number, amountTendered: number): number {
  const total = Math.max(0, Number(totalAmount || 0));
  const tendered = Math.max(0, Number(amountTendered || 0));
  if (tendered <= total) return 0;
  return Number((tendered - total).toFixed(2));
}

export function resolveSalePurchasedItems(
  sale: Sale,
  inventoryItems: InventoryItem[]
): SalePurchasedItem[] {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.map((it) => ({
      itemId: it.itemId || '',
      name: it.name,
      brand: it.brand || 'Store Fragrance',
      size: Number(it.size || 100),
      quantity: Math.max(1, Number(it.quantity || 1)),
      unitPrice: Number(Number(it.unitPrice || 0).toFixed(2)),
      subtotal: Number(Number(it.subtotal || Number(it.unitPrice || 0) * Math.max(1, Number(it.quantity || 1))).toFixed(2)),
    }));
  }

  const note = (sale.note || '').trim();
  const totalAmount = Number(sale.amount || 0);
  const matched: Array<{
    item: InventoryItem;
    explicitQty: number | null;
    index: number;
  }> = [];

  inventoryItems.forEach((it) => {
    const pos = note.toLowerCase().indexOf(it.name.toLowerCase());
    if (pos !== -1) {
      const escaped = it.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rxBefore = new RegExp(`(\\d+)\\s*x\\s*${escaped}`, 'i');
      const rxAfter = new RegExp(`${escaped}\\s*(?:x|\\()\\s*(\\d+)`, 'i');
      const mBefore = note.match(rxBefore);
      const mAfter = note.match(rxAfter);
      const explicitQty = mBefore
        ? Math.max(1, parseInt(mBefore[1], 10))
        : mAfter
        ? Math.max(1, parseInt(mAfter[1], 10))
        : null;
      matched.push({ item: it, explicitQty, index: pos });
    }
  });

  matched.sort((a, b) => a.index - b.index);

  if (matched.length === 1) {
    const { item, explicitQty } = matched[0];
    const unitPrice = Number(item.price || 0);
    let qty = explicitQty ?? 1;
    if (explicitQty === null && unitPrice > 0 && totalAmount > 0) {
      const ratio = totalAmount / unitPrice;
      const rounded = Math.max(1, Math.round(ratio));
      if (Math.abs(ratio - rounded) < 0.05) {
        qty = rounded;
      }
    }
    const subtotal =
      explicitQty === null && totalAmount > 0
        ? Number(totalAmount.toFixed(2))
        : Number((qty * unitPrice).toFixed(2));
    return [
      {
        itemId: item.id,
        name: item.name,
        brand: item.brand,
        size: item.size,
        quantity: qty,
        unitPrice: unitPrice > 0 ? unitPrice : Number((subtotal / qty).toFixed(2)),
        subtotal,
      },
    ];
  }

  if (matched.length > 1) {
    return matched.map(({ item, explicitQty }) => {
      const qty = explicitQty ?? 1;
      const unitPrice = Number(item.price || 0);
      return {
        itemId: item.id,
        name: item.name,
        brand: item.brand,
        size: item.size,
        quantity: qty,
        unitPrice,
        subtotal: Number((qty * unitPrice).toFixed(2)),
      };
    });
  }

  if (note) {
    const parts = note
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.map((part, idx) => {
        const m = part.match(/^(\d+)\s*x\s*(.+)$/i);
        const qty = m ? Math.max(1, parseInt(m[1], 10)) : 1;
        const name = m ? m[2].trim() : part;
        const share = parts.length === 1 ? totalAmount : Number((totalAmount / parts.length).toFixed(2));
        const unitPrice = qty > 0 ? Number((share / qty).toFixed(2)) : share;
        return {
          itemId: `legacy-${idx}`,
          name,
          brand: 'Store Fragrance',
          size: 100,
          quantity: qty,
          unitPrice,
          subtotal: share,
        };
      });
    }
  }

  return [
    {
      itemId: 'legacy-0',
      name: 'Perfume Purchase',
      brand: 'Store Fragrance',
      size: 100,
      quantity: 1,
      unitPrice: Number(totalAmount.toFixed(2)),
      subtotal: Number(totalAmount.toFixed(2)),
    },
  ];
}

export function formatSaleItemsSummary(sale: Sale, inventoryItems: InventoryItem[]): string {
  const purchased = resolveSalePurchasedItems(sale, inventoryItems);
  return purchased.map((p) => `${p.quantity}x ${p.name}`).join(', ');
}

export function computeSalesRevenueSummary(
  sales: Sale[],
  todayIso?: string
): {
  totalRevenue: number;
  totalTransactions: number;
  todayRevenue: number;
  todayTransactions: number;
} {
  const todayStr = todayIso || getSystemDateString();
  let totalRevenue = 0;
  let todayRevenue = 0;
  let todayTransactions = 0;

  sales.forEach((sale) => {
    const amt = Number(sale.amount || 0);
    totalRevenue = Number((totalRevenue + amt).toFixed(2));
    if ((sale.date || '').slice(0, 10) === todayStr) {
      todayRevenue = Number((todayRevenue + amt).toFixed(2));
      todayTransactions += 1;
    }
  });

  return {
    totalRevenue,
    totalTransactions: sales.length,
    todayRevenue,
    todayTransactions,
  };
}

export function computeMostSoldItemToday(
  sales: Sale[],
  items: InventoryItem[],
  todayIso?: string
): { name: string; brand: string; count: number; revenue: number } {
  const todayStr = todayIso || getSystemDateString();
  const todaySales = sales.filter((s) => (s.date || '').slice(0, 10) === todayStr);
  if (todaySales.length === 0) {
    return { name: 'None yet', brand: '', count: 0, revenue: 0 };
  }

  const itemTally: Record<string, { brand: string; count: number; revenue: number }> = {};

  todaySales.forEach((sale) => {
    const purchased = resolveSalePurchasedItems(sale, items);
    purchased.forEach((p) => {
      if (!itemTally[p.name]) {
        itemTally[p.name] = { brand: p.brand || 'Store Sale', count: 0, revenue: 0 };
      }
      itemTally[p.name].count += p.quantity;
      itemTally[p.name].revenue += p.subtotal;
    });
  });

  let topName = 'None yet';
  let topBrand = '';
  let topCount = 0;
  let topRevenue = 0;

  for (const [fragrance, info] of Object.entries(itemTally)) {
    if (info.count > topCount || (info.count === topCount && info.revenue > topRevenue)) {
      topName = fragrance;
      topBrand = info.brand;
      topCount = info.count;
      topRevenue = info.revenue;
    }
  }

  return { name: topName, brand: topBrand, count: topCount, revenue: Number(topRevenue.toFixed(2)) };
}

export function filterSalesByPeriod(
  sales: Sale[],
  period: SalesReportPeriod,
  referenceDate: Date = new Date()
): Sale[] {
  const todayStr = getSystemDateString(referenceDate);
  const weeklyAgo = getSystemDateOffsetString(7, referenceDate);
  const monthlyAgo = getSystemDateOffsetString(30, referenceDate);
  const quarterlyAgo = getSystemDateOffsetString(90, referenceDate);

  return [...sales]
    .filter((sale) => {
      const saleDateOnly = (sale.date || '').slice(0, 10);
      if (period === 'today') return saleDateOnly === todayStr;
      if (period === 'weekly') return saleDateOnly >= weeklyAgo && saleDateOnly <= todayStr;
      if (period === 'monthly') return saleDateOnly >= monthlyAgo && saleDateOnly <= todayStr;
      if (period === 'quarterly') return saleDateOnly >= quarterlyAgo && saleDateOnly <= todayStr;
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });
}

export function getSalesPeriodLabel(period: SalesReportPeriod): string {
  switch (period) {
    case 'today':
      return 'Today';
    case 'weekly':
      return 'Weekly (Last 7 Days)';
    case 'monthly':
      return 'Monthly (Last 30 Days)';
    case 'quarterly':
      return 'Quarterly (Last 90 Days)';
    case 'all':
    default:
      return 'All Time';
  }
}

export interface PaymentChannelStat {
  method: 'Cash' | 'GCash' | 'Maya' | 'Card' | 'Bank Transfer';
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentBreakdownSummary {
  channels: PaymentChannelStat[];
  cashTotal: number;
  cashCount: number;
  digitalTotal: number;
  digitalCount: number;
  grandTotal: number;
  totalTransactions: number;
}

export const ALL_PAYMENT_METHODS: Array<'Cash' | 'GCash' | 'Maya' | 'Card' | 'Bank Transfer'> = [
  'Cash',
  'GCash',
  'Maya',
  'Card',
  'Bank Transfer',
];

export function computePaymentMethodBreakdown(sales: Sale[]): PaymentBreakdownSummary {
  const tally: Record<string, { count: number; amount: number }> = {
    Cash: { count: 0, amount: 0 },
    GCash: { count: 0, amount: 0 },
    Maya: { count: 0, amount: 0 },
    Card: { count: 0, amount: 0 },
    'Bank Transfer': { count: 0, amount: 0 },
  };

  let grandTotal = 0;

  sales.forEach((sale) => {
    const method = sale.paymentMethod && tally[sale.paymentMethod] ? sale.paymentMethod : 'Cash';
    const amt = Number(sale.amount || 0);
    tally[method].count += 1;
    tally[method].amount = Number((tally[method].amount + amt).toFixed(2));
    grandTotal = Number((grandTotal + amt).toFixed(2));
  });

  const channels: PaymentChannelStat[] = ALL_PAYMENT_METHODS.map((method) => {
    const { count, amount } = tally[method];
    return {
      method,
      count,
      amount,
      percentage: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
    };
  });

  const cashTotal = tally['Cash'].amount;
  const cashCount = tally['Cash'].count;
  const digitalTotal = Number((grandTotal - cashTotal).toFixed(2));
  const digitalCount = sales.length - cashCount;

  return {
    channels,
    cashTotal,
    cashCount,
    digitalTotal,
    digitalCount,
    grandTotal,
    totalTransactions: sales.length,
  };
}

export interface CashierPerformanceStat {
  cashierKey: 'Admin' | 'Associate';
  transactions: number;
  bottlesSold: number;
  revenue: number;
}

export function computeCashierPerformance(
  sales: Sale[],
  inventoryItems: InventoryItem[]
): Record<'Admin' | 'Associate', CashierPerformanceStat> {
  const stats: Record<'Admin' | 'Associate', CashierPerformanceStat> = {
    Admin: { cashierKey: 'Admin', transactions: 0, bottlesSold: 0, revenue: 0 },
    Associate: { cashierKey: 'Associate', transactions: 0, bottlesSold: 0, revenue: 0 },
  };

  sales.forEach((sale) => {
    const raw = (sale.cashier || 'Admin').toLowerCase();
    const key: 'Admin' | 'Associate' =
      raw.includes('assoc') || raw.includes('charlene') ? 'Associate' : 'Admin';
    const purchased = resolveSalePurchasedItems(sale, inventoryItems);
    const bottles = purchased.reduce((sum, p) => sum + p.quantity, 0);

    stats[key].transactions += 1;
    stats[key].bottlesSold += bottles;
    stats[key].revenue = Number((stats[key].revenue + Number(sale.amount || 0)).toFixed(2));
  });

  return stats;
}

const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

/**
 * Generates an ISO/IEC 15417 Code-128 standard scannable barcode pattern (with quiet zones and Modulo-103 check symbol).
 * Uses Code Set C for digit pairs and Code Set B for any remaining trailing digit so 13-digit perfume barcodes
 * are compact, high-contrast, and 100% readable by hardware/camera scanners.
 */
export function generateBarcodeBars(barcode: string): Array<{ isBar: boolean; width: number }> {
  const digits = cleanBarcodeDigits(barcode) || '0000000000000';
  const symbols: number[] = [];

  if (digits.length >= 4) {
    // Start Code C (105)
    symbols.push(105);
    let i = 0;
    while (i + 1 < digits.length) {
      const pairVal = parseInt(digits.slice(i, i + 2), 10);
      symbols.push(pairVal);
      i += 2;
    }
    if (i < digits.length) {
      // Switch to Code Set B (100) for the final odd digit
      symbols.push(100);
      symbols.push(digits.charCodeAt(i) - 32);
    }
  } else {
    // Start Code B (104)
    symbols.push(104);
    for (let i = 0; i < digits.length; i++) {
      symbols.push(digits.charCodeAt(i) - 32);
    }
  }

  // Compute Modulo-103 Checksum
  let checksum = symbols[0];
  for (let pos = 1; pos < symbols.length; pos++) {
    checksum += symbols[pos] * pos;
  }
  symbols.push(checksum % 103);

  // Stop Code (106)
  symbols.push(106);

  // Quiet zone (10 modules left)
  const pattern: Array<{ isBar: boolean; width: number }> = [{ isBar: false, width: 10 }];

  for (const sym of symbols) {
    const widthsStr = CODE128_PATTERNS[sym] || CODE128_PATTERNS[0];
    for (let idx = 0; idx < widthsStr.length; idx++) {
      const w = widthsStr.charCodeAt(idx) - 48;
      pattern.push({ isBar: idx % 2 === 0, width: w });
    }
  }

  // Quiet zone (10 modules right)
  pattern.push({ isBar: false, width: 10 });

  return pattern;
}

export interface BarcodeFrameSample {
  code: string;
  format?: string;
  timestamp: number;
}

export interface BarcodeConsensusResult {
  locked: boolean;
  code: string;
  matchCount: number;
  requiredCount: number;
  confidence: number;
  isKnownItem: boolean;
  isGs1Valid: boolean;
}

/**
 * Evaluates a rolling window of live camera barcode observations to eliminate single-frame motion-blur misreads.
 * - Rejects partial/noise reads shorter than 8 digits.
 * - Locks when a barcode is confirmed across consecutive frames AND dominates recent observations.
 */
export function evaluateBarcodeConsensus(
  samples: BarcodeFrameSample[],
  inventoryItems: InventoryItem[],
  now: number = Date.now(),
  windowMs: number = 950
): BarcodeConsensusResult {
  const validRecent = samples
    .filter((s) => now - s.timestamp <= windowMs)
    .map((s) => ({
      ...s,
      clean: cleanBarcodeDigits(s.code),
    }))
    .filter((s) => s.clean.length >= 8 && s.clean.length <= BARCODE_EXACT_LENGTH);

  if (validRecent.length === 0) {
    return {
      locked: false,
      code: '',
      matchCount: 0,
      requiredCount: 2,
      confidence: 0,
      isKnownItem: false,
      isGs1Valid: false,
    };
  }

  // Tally occurrences per canonical code
  const counts = new Map<string, number>();
  for (const s of validRecent) {
    counts.set(s.clean, (counts.get(s.clean) || 0) + 1);
  }

  // Pick the most frequent candidate (tie-break by most recent frame)
  let bestCode = '';
  let bestCount = 0;
  for (let i = validRecent.length - 1; i >= 0; i--) {
    const c = validRecent[i].clean;
    const count = counts.get(c) || 0;
    if (count > bestCount) {
      bestCount = count;
      bestCode = c;
    }
  }

  const matchedItem = findItemByBarcode(inventoryItems, bestCode);
  const isKnownItem = Boolean(matchedItem);
  const canonicalCode = matchedItem ? cleanBarcodeDigits(matchedItem.barcode) : bestCode;
  const isGs1Valid =
    (bestCode.length === 12 || bestCode.length === 13) && isValidGs1Checksum(bestCode);

  // Known inventory items or valid 12/13-digit GS1 barcodes require 2 matching frames;
  // custom/unverified codes require 3 matching frames to eliminate false-positive misreads.
  const requiredCount = isKnownItem || isGs1Valid ? 2 : 3;
  const share = bestCount / validRecent.length;
  const hasMajority = share >= 0.65;
  const locked = bestCount >= requiredCount && hasMajority;
  const confidence = Math.min(
    100,
    Math.round((bestCount / requiredCount) * (hasMajority ? 100 : 60))
  );

  return {
    locked,
    code: canonicalCode,
    matchCount: bestCount,
    requiredCount,
    confidence,
    isKnownItem,
    isGs1Valid,
  };
}

/**
 * Enhances a grayscale or RGBA image buffer for 1D barcode decoding:
 * 1. Computes 5th and 95th luminance percentiles to stretch low-light / glare-heavy webcams across full [0, 255].
 * 2. Applies a 1D horizontal unsharp mask [-0.5, 2.0, -0.5] to sharpen vertical bar edges without vertical noise.
 */
export function enhanceBarcodeLuminance(
  input: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  isRgba: boolean = false
): Uint8ClampedArray {
  const pixelCount = width * height;
  const gray = new Uint8Array(pixelCount);
  const hist = new Uint32Array(256);

  if (isRgba) {
    for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
      const lum = (input[p] * 54 + input[p + 1] * 183 + input[p + 2] * 19) >> 8;
      gray[i] = lum;
      hist[lum]++;
    }
  } else {
    for (let i = 0; i < pixelCount; i++) {
      const lum = input[i];
      gray[i] = lum;
      hist[lum]++;
    }
  }

  // Find 5th and 95th percentile luminance
  const lowTarget = Math.floor(pixelCount * 0.05);
  const highTarget = Math.floor(pixelCount * 0.95);
  let cumulative = 0;
  let minLum = 0;
  let maxLum = 255;

  for (let v = 0; v < 256; v++) {
    cumulative += hist[v];
    if (cumulative >= lowTarget) {
      minLum = v;
      break;
    }
  }

  cumulative = 0;
  for (let v = 0; v < 256; v++) {
    cumulative += hist[v];
    if (cumulative >= highTarget) {
      maxLum = v;
      break;
    }
  }

  const range = Math.max(12, maxLum - minLum);
  const stretched = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const norm = ((gray[i] - minLum) * 255) / range;
    stretched[i] = norm <= 0 ? 0 : norm >= 255 ? 255 : norm | 0;
  }

  // Apply 1D horizontal unsharp kernel [-0.5, 2.0, -0.5] along scanlines
  const out = new Uint8ClampedArray(pixelCount);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    out[rowOffset] = stretched[rowOffset];
    for (let x = 1; x < width - 1; x++) {
      const idx = rowOffset + x;
      const sharp = (stretched[idx] << 1) - ((stretched[idx - 1] + stretched[idx + 1]) >> 1);
      out[idx] = sharp <= 0 ? 0 : sharp >= 255 ? 255 : sharp;
    }
    if (width > 1) {
      out[rowOffset + width - 1] = stretched[rowOffset + width - 1];
    }
  }

  return out;
}



