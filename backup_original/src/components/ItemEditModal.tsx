import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldAlert } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import {
  validateProductName,
  validatePrice,
  cleanBarcodeDigits,
  validateBarcode13Digits,
  canEditBarcode,
} from '../utils/inventoryLogic.js';

export const ItemEditModal: React.FC = () => {
  const { editingItem, setEditingItem, updateItem, currentUser } = useInventory();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('Eau de Parfum');
  const [gender, setGender] = useState('Unisex');
  const [size, setSize] = useState(100);
  const [stock, setStock] = useState(0);
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isAdmin = canEditBarcode(currentUser?.role);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setBrand(editingItem.brand);
      setType(editingItem.type);
      setGender(editingItem.gender);
      setSize(editingItem.size);
      setStock(editingItem.stock);
      setPrice(String(editingItem.price));
      setLocation(editingItem.location || '');
      setBarcode(cleanBarcodeDigits(editingItem.barcode));
      setError(null);
    }
  }, [editingItem]);

  if (!editingItem) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameCheck = validateProductName(name);
    if (!nameCheck.isValid) {
      setError(nameCheck.error || 'Invalid product name');
      return;
    }

    const priceCheck = validatePrice(price);
    if (!priceCheck.isValid) {
      setError(priceCheck.error || 'Invalid price');
      return;
    }

    // Only validate changed barcode if admin
    let finalBarcode = editingItem.barcode;
    if (isAdmin) {
      const barcodeCheck = validateBarcode13Digits(barcode);
      if (!barcodeCheck.isValid) {
        setError(barcodeCheck.error || 'Barcode must be numeric (max 13 digits)');
        return;
      }
      finalBarcode = barcodeCheck.sanitized;
    }

    await updateItem(editingItem.id, {
      name: nameCheck.sanitized,
      brand: brand.trim(),
      type,
      gender,
      size: Number(size) || 100,
      stock: Number(stock) || 0,
      price: priceCheck.parsedPrice,
      location: location.trim(),
      barcode: finalBarcode,
    });

    setEditingItem(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4] shrink-0">
          <h3 className="font-serif text-lg font-bold text-[#242119]">Edit Item Details</h3>
          <button
            onClick={() => setEditingItem(null)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1">
              Product Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm text-[#242119] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1">
                Brand
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm text-[#242119]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1">
                Price (<span className="text-[0.72em] font-normal">₱</span>)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-[#8c8878] font-normal pointer-events-none">₱</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1">
                Stock (pcs)
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1">
                Size (mL)
              </label>
              <input
                type="number"
                min="1"
                required
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10) || 100)}
                className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm text-[#242119]"
              >
                <option value="Unisex">Unisex</option>
                <option value="Women">Women</option>
                <option value="Men">Men</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1">
                Shelf Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm text-[#242119]"
              />
            </div>
          </div>

          {/* Barcode field with 13 digits limit & admin-only editing */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Barcode Number (Max 13 Digits)
              </label>
              {!isAdmin && (
                <span className="text-[10px] text-[#9c793c] flex items-center gap-1 font-semibold">
                  <Lock className="w-3 h-3" /> Admin Only
                </span>
              )}
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={13}
              disabled={!isAdmin}
              value={barcode}
              onChange={(e) => {
                if (isAdmin) {
                  setBarcode(cleanBarcodeDigits(e.target.value));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                isAdmin
                  ? 'bg-white border-[#e7e2d4] text-[#242119] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]'
                  : 'bg-[#f2efe6] border-[#e7e2d4] text-[#7c7156] cursor-not-allowed'
              }`}
            />
            {!isAdmin && (
              <p className="text-[11px] text-[#8c8878] mt-1">
                Barcode editing is restricted to administrator accounts.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-[#a05539] font-medium">{error}</p>}

          <div className="flex gap-2.5 pt-3 border-t border-[#e7e2d4] shrink-0">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="flex-1 py-2.5 text-xs font-semibold border border-[#e7e2d4] rounded-xl text-[#56534a] hover:bg-[#f2efe6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-semibold bg-[#242119] text-white rounded-xl hover:bg-[#34302a] transition-colors shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
