import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findItemByBarcode,
  calculateNewStock,
  validateProductName,
  validatePrice,
  cleanBarcodeDigits,
  validateBarcode13Digits,
  canEditBarcode,
  getStockStatus,
  computeInventoryStats,
  calculateSubtractedStock,
  computeMostSoldItemToday,
  computeSalesRevenueSummary,
  filterSalesByPeriod,
  resolveSalePurchasedItems,
  formatSaleItemsSummary,
  calculateChangeDue,
  computePaymentMethodBreakdown,
  computeCashierPerformance,
  generateBarcodeBars,
  isValidGs1Checksum,
  evaluateBarcodeConsensus,
  enhanceBarcodeLuminance,
  getSystemDateString,
  getSystemDateOffsetString,
} from './inventoryLogic.ts';
import zxingPkg from '@zxing/library';
const {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  GlobalHistogramBinarizer,
} = zxingPkg;
import type { InventoryItem, Sale } from '../types/inventory.ts';

const mockItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Chanel Chance',
    brand: 'Chanel',
    type: 'Eau de Parfum',
    gender: 'Women',
    size: 100,
    stock: 15,
    price: 89.99,
    location: 'Shelf A - Row 2',
    barcode: '3145891265478',
  },
  {
    id: '2',
    name: 'Dior Sauvage',
    brand: 'Dior',
    type: 'Eau de Toilette',
    gender: 'Men',
    size: 100,
    stock: 4,
    price: 74.5,
    location: 'Shelf A - Row 3',
    barcode: '3348901250158',
  },
  {
    id: '3',
    name: 'Ariana Grande Cloud',
    brand: 'Ariana Grande',
    type: 'Eau de Parfum',
    gender: 'Women',
    size: 100,
    stock: 10,
    price: 48.0,
    location: 'Shelf C - Row 2',
    barcode: '8122560223450',
  },
];

test('findItemByBarcode detects existing product and UPC-A/EAN-13 leading-zero equivalence', () => {
  const item = findItemByBarcode(mockItems, '3145891265478');
  assert.ok(item);
  assert.equal(item?.name, 'Chanel Chance');

  const itemsWithUpc: InventoryItem[] = [
    ...mockItems,
    {
      id: '4',
      name: 'Tom Ford Oud Wood',
      brand: 'Tom Ford',
      type: 'Eau de Parfum',
      gender: 'Unisex',
      size: 50,
      stock: 6,
      price: 145,
      location: 'Shelf C - Row 1',
      barcode: '0888066000055',
    },
  ];
  // Scanning 12-digit UPC-A matches 13-digit leading-zero EAN-13 and vice versa
  assert.equal(findItemByBarcode(itemsWithUpc, '888066000055')?.name, 'Tom Ford Oud Wood');
  assert.equal(findItemByBarcode(itemsWithUpc, '0888066000055')?.name, 'Tom Ford Oud Wood');
});

test('cleanBarcodeDigits only allows digits, caps at 13, and normalizes 14-digit GTIN with leading zero', () => {
  assert.equal(cleanBarcodeDigits('314-589-126-5478'), '3145891265478');
  assert.equal(cleanBarcodeDigits('03145891265478'), '3145891265478'); // 14-digit GTIN-14 -> 13-digit EAN-13
  assert.equal(cleanBarcodeDigits('abc123def456789012345'), '1234567890123');
  assert.equal(cleanBarcodeDigits('Hello World'), '');
});

test('isValidGs1Checksum verifies standard EAN-13 and UPC-A Modulo-10 check digits', () => {
  assert.equal(isValidGs1Checksum('4006381333931'), true); // Standard valid EAN-13
  assert.equal(isValidGs1Checksum('7501031311309'), true); // Standard valid EAN-13
  assert.equal(isValidGs1Checksum('036000291452'), true);  // Standard valid 12-digit UPC-A
  assert.equal(isValidGs1Checksum('4006381333932'), false); // Wrong check digit
  assert.equal(isValidGs1Checksum('0000000000000'), false); // All zeros rejected
});

test('validateBarcode13Digits enforces digit requirements', () => {
  assert.equal(validateBarcode13Digits('3145891265478').isValid, true);
  assert.equal(validateBarcode13Digits('abc').isValid, false);
});

test('canEditBarcode only returns true for admin account', () => {
  assert.equal(canEditBarcode('admin'), true);
  assert.equal(canEditBarcode('personnel'), false);
  assert.equal(canEditBarcode(null), false);
});

test('calculateNewStock and calculateSubtractedStock adjust stock quantity correctly', () => {
  assert.equal(calculateNewStock(15, 5), 20);
  assert.equal(calculateNewStock(0, 10), 10);
  assert.equal(calculateSubtractedStock(15, 4), 11);
  assert.equal(calculateSubtractedStock(3, 10), 0);
});

test('validateProductName validates retail name constraints', () => {
  const valid = validateProductName('Chanel Chance Eau Fraiche');
  assert.equal(valid.isValid, true);
  const withNumbers = validateProductName('Product 123');
  assert.equal(withNumbers.isValid, false);
});

test('validatePrice accepts valid numeric and string prices', () => {
  const numCheck = validatePrice(145.5);
  assert.equal(numCheck.isValid, true);
  assert.equal(numCheck.parsedPrice, 145.5);
});

test('getStockStatus returns accurate inventory tone and label', () => {
  assert.deepEqual(getStockStatus(0), { label: 'Out of Stock', tone: 'danger' });
  assert.deepEqual(getStockStatus(3), { label: 'Low Stock', tone: 'warn' });
});

test('computeInventoryStats returns brandBreakdown, lowStockItems, and highStockItems', () => {
  const stats = computeInventoryStats(mockItems);
  assert.equal(stats.totalItems, 29);
  assert.equal(stats.brandBreakdown.length, 3);
  assert.equal(stats.brandBreakdown[0].brand, 'Chanel');
  assert.equal(stats.brandBreakdown[0].count, 15);
  assert.equal(stats.lowStockItems.length, 1);
  assert.equal(stats.lowStockItems[0].name, 'Dior Sauvage');
  assert.equal(stats.highStockItems.length, 2);
  assert.equal(stats.highStockItems[0].name, 'Chanel Chance');
  assert.equal(stats.highStockItems[0].stock, 15);
  assert.equal(stats.highStockItems[1].name, 'Ariana Grande Cloud');
  assert.equal(stats.highStockItems[1].stock, 10);
});

test('getSystemDateString, getSystemDateOffsetString, and computeSalesRevenueSummary use local system date', () => {
  const localRef = new Date(2026, 9, 22, 6, 30, 0); // Oct 22, 2026 06:30 local time
  assert.equal(getSystemDateString(localRef), '2026-10-22');
  assert.equal(getSystemDateOffsetString(2, localRef), '2026-10-20');

  const sampleSales: Sale[] = [
    { id: 's1', name: 'Walk-in', date: '2026-10-22', amount: 89.99, note: '1x Chanel Chance' },
    { id: 's2', name: 'Walk-in', date: '2026-10-22', amount: 74.5, note: '1x Dior Sauvage' },
    { id: 's3', name: 'Maria', date: '2026-10-20', amount: 120.0, note: '1x Bleu de Chanel' },
  ];
  const rev = computeSalesRevenueSummary(sampleSales, '2026-10-22');
  assert.equal(rev.totalRevenue, 284.49);
  assert.equal(rev.totalTransactions, 3);
  assert.equal(rev.todayRevenue, 164.49);
  assert.equal(rev.todayTransactions, 2);
});

test('resolveSalePurchasedItems infers purchased items for legacy and structured sales', () => {
  const legacySale: Sale = {
    id: 'sale-163326',
    name: 'jet',
    date: '2026-10-19',
    amount: 96.0,
    note: 'Ariana Grande Cloud',
  };
  const resolved = resolveSalePurchasedItems(legacySale, mockItems);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].name, 'Ariana Grande Cloud');
  assert.equal(resolved[0].quantity, 2);
  assert.equal(resolved[0].unitPrice, 48.0);
  assert.equal(resolved[0].subtotal, 96.0);
  assert.equal(formatSaleItemsSummary(legacySale, mockItems), '2x Ariana Grande Cloud');

  assert.equal(calculateChangeDue(96.0, 100.0), 4.0);
  assert.equal(calculateChangeDue(96.0, 50.0), 0);
});

test('computeMostSoldItemToday and filterSalesByPeriod work accurately', () => {
  const refDate = new Date('2026-10-20T12:00:00Z');
  const mockSales: Sale[] = [
    { id: 's1', name: 'C1', date: '2026-10-20', amount: 179.98, note: '2x Chanel Chance' },
    { id: 's2', name: 'C2', date: '2026-10-20', amount: 74.5, note: '1x Dior Sauvage' },
    { id: 's3', name: 'C3', date: '2026-10-16', amount: 89.99, note: 'Chanel Chance' },
    { id: 's4', name: 'C4', date: '2026-09-25', amount: 74.5, note: 'Dior Sauvage' },
    { id: 's5', name: 'C5', date: '2026-08-10', amount: 74.5, note: 'Dior Sauvage' },
  ];

  const topToday = computeMostSoldItemToday(mockSales, mockItems, '2026-10-20');
  assert.equal(topToday.name, 'Chanel Chance');
  assert.equal(topToday.count, 2);

  assert.equal(filterSalesByPeriod(mockSales, 'today', refDate).length, 2);
  assert.equal(filterSalesByPeriod(mockSales, 'weekly', refDate).length, 3);
  assert.equal(filterSalesByPeriod(mockSales, 'monthly', refDate).length, 4);
  assert.equal(filterSalesByPeriod(mockSales, 'quarterly', refDate).length, 5);
});

test('computePaymentMethodBreakdown and computeCashierPerformance calculate accurate totals', () => {
  const mockSales: Sale[] = [
    {
      id: 's1',
      name: 'C1',
      date: '2026-10-20',
      amount: 100,
      paymentMethod: 'Cash',
      cashier: 'Admin',
      note: '1x Chanel Chance',
    },
    {
      id: 's2',
      name: 'C2',
      date: '2026-10-20',
      amount: 74.5,
      paymentMethod: 'GCash',
      cashier: 'Associate',
      note: '2x Dior Sauvage',
    },
  ];

  const breakdown = computePaymentMethodBreakdown(mockSales);
  assert.equal(breakdown.cashTotal, 100);
  assert.equal(breakdown.cashCount, 1);
  assert.equal(breakdown.digitalTotal, 74.5);
  assert.equal(breakdown.digitalCount, 1);
  assert.equal(breakdown.grandTotal, 174.5);

  const cashierStats = computeCashierPerformance(mockSales, mockItems);
  assert.equal(cashierStats.Admin.transactions, 1);
  assert.equal(cashierStats.Admin.bottlesSold, 1);
  assert.equal(cashierStats.Admin.revenue, 100);
  assert.equal(cashierStats.Associate.transactions, 1);
  assert.equal(cashierStats.Associate.bottlesSold, 2);
  assert.equal(cashierStats.Associate.revenue, 74.5);
});

test('generateBarcodeBars encodes scannable ISO Code-128 barcodes that decode with 100% accuracy in ZXing', () => {
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);

  const testBarcodes = [
    '3145891265478',
    '3348901250158',
    '8122560223450',
    '3145891267229',
    '3349668529513',
    '8011003835521',
    '3614272562481',
  ];

  for (const code of testBarcodes) {
    const bars = generateBarcodeBars(code);
    const scale = 4; // 4 pixels per module
    const totalUnits = bars.reduce((s, b) => s + b.width, 0);
    const width = totalUnits * scale;
    const height = 40;
    const luminance = new Uint8ClampedArray(width * height);

    let xCursor = 0;
    for (const seg of bars) {
      const segPx = seg.width * scale;
      const val = seg.isBar ? 0 : 255;
      for (let y = 0; y < height; y++) {
        luminance.fill(val, y * width + xCursor, y * width + xCursor + segPx);
      }
      xCursor += segPx;
    }

    const source = new RGBLuminanceSource(luminance, width, height);
    const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(source));
    const decoded = reader.decode(bitmap);
    assert.equal(decoded.getText(), code);
  }
});

test('enhanceBarcodeLuminance restores low-contrast blurred barcode scanlines for ZXing decoding', () => {
  const code = '3348901250158';
  const bars = generateBarcodeBars(code);
  const scale = 3;
  const totalUnits = bars.reduce((s, b) => s + b.width, 0);
  const width = totalUnits * scale;
  const height = 36;

  // Simulate a washed-out, dim webcam frame where bars are 102 and spaces are 122 (only 20 levels of contrast)
  const degraded = new Uint8ClampedArray(width * height);
  let xCursor = 0;
  for (const seg of bars) {
    const segPx = seg.width * scale;
    const val = seg.isBar ? 102 : 122;
    for (let y = 0; y < height; y++) {
      degraded.fill(val, y * width + xCursor, y * width + xCursor + segPx);
    }
    xCursor += segPx;
  }

  const enhanced = enhanceBarcodeLuminance(degraded, width, height, false);
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);

  const source = new RGBLuminanceSource(enhanced, width, height);
  const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(source));
  const decoded = reader.decode(bitmap);
  assert.equal(decoded.getText(), code);
});

test('evaluateBarcodeConsensus rejects 1-frame motion blur misreads and locks on multi-frame agreement', () => {
  const now = 10000;
  // 1. Short random noise (< 8 digits) is rejected completely
  const noiseRes = evaluateBarcodeConsensus(
    [
      { code: '1245', timestamp: now - 100 },
      { code: '1245', timestamp: now - 50 },
    ],
    mockItems,
    now
  );
  assert.equal(noiseRes.locked, false);

  // 2. Single frame read is not locked yet (verifying state: 1/2)
  const singleFrame = evaluateBarcodeConsensus(
    [{ code: '3145891265478', timestamp: now - 80 }],
    mockItems,
    now
  );
  assert.equal(singleFrame.locked, false);
  assert.equal(singleFrame.matchCount, 1);
  assert.equal(singleFrame.requiredCount, 2);

  // 3. Motion blur fluke on frame 1 followed by 2 accurate frames locks onto the true barcode
  const consensusLock = evaluateBarcodeConsensus(
    [
      { code: '3145899965478', timestamp: now - 220 }, // 1-frame motion blur fluke
      { code: '3145891265478', timestamp: now - 120 }, // Frame 2: real barcode
      { code: '3145891265478', timestamp: now - 40 },  // Frame 3: real barcode confirmed
    ],
    mockItems,
    now
  );
  assert.equal(consensusLock.locked, true);
  assert.equal(consensusLock.code, '3145891265478');
  assert.equal(consensusLock.confidence, 100);
});

