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
} from './inventoryLogic.ts';
import type { InventoryItem } from '../types/inventory.ts';

const mockItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Chanel Chance',
    brand: 'Chanel',
    type: 'Eau de Parfum',
    gender: 'For Women',
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
    gender: 'For Men',
    size: 100,
    stock: 4,
    price: 74.5,
    location: 'Shelf A - Row 3',
    barcode: '3348901250158',
  },
];

test('findItemByBarcode detects existing product correctly', () => {
  const item = findItemByBarcode(mockItems, '3145891265478');
  assert.ok(item);
  assert.equal(item?.name, 'Chanel Chance');
});

test('cleanBarcodeDigits only allows digits and caps at 13 characters', () => {
  assert.equal(cleanBarcodeDigits('314-589-126-5478'), '3145891265478');
  assert.equal(cleanBarcodeDigits('abc123def456789012345'), '1234567890123'); // Max 13 digits
  assert.equal(cleanBarcodeDigits('Hello World'), '');
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

test('calculateNewStock increments stock quantity correctly', () => {
  assert.equal(calculateNewStock(15, 5), 20);
  assert.equal(calculateNewStock(0, 10), 10);
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
