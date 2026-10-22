import React, { useState } from 'react';
import { X, Sparkles, Package, Barcode, Check } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { validateProductName, validatePrice } from '../utils/inventoryLogic.js';
import { CurrencySign } from './PriceDisplay.js';

export const AddItemModal: React.FC = () => {
  const { isAddItemOpen, setIsAddItemOpen, addItem, currency } = useInventory();

  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('Eau de Parfum');
  const [gender, setGender] = useState('Unisex');
  const [size, setSize] = useState<number>(100);
  const [stock, setStock] = useState<number>(10);
  const [price, setPrice] = useState('75.00');
  const [location, setLocation] = useState('Shelf A - Row 1');
  const [batchCode, setBatchCode] = useState('');
  const [hasTester, setHasTester] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  if (!isAddItemOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameCheck = validateProductName(name);
    if (!nameCheck.isValid) {
      setNameError(nameCheck.error || 'Please enter a valid fragrance name');
      return;
    }

    const priceCheck = validatePrice(price);
    if (!priceCheck.isValid) {
      setPriceError(priceCheck.error || 'Please enter a valid price');
      return;
    }

    const finalBarcode = barcode.trim()
      ? barcode.replace(/\D/g, '').slice(0, 13)
      : `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;

    await addItem({
      name: nameCheck.sanitized,
      brand: brand.trim() || 'Maison de Parfum',
      type,
      gender,
      size: Number(size) || 100,
      stock: Math.max(1, Number(stock) || 1),
      price: priceCheck.parsedPrice,
      location: location.trim() || 'Shelf A - Row 1',
      barcode: finalBarcode,
      hasTester,
      batchCode: batchCode.trim().toUpperCase(),
    });

    setIsAddItemOpen(false);
    // Reset form
    setBarcode('');
    setName('');
    setBrand('');
    setPrice('75.00');
    setStock(10);
    setBatchCode('');
    setHasTester(false);
    setNameError(null);
    setPriceError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1b1915] text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1b1915]">Add Perfume Item</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAddItemOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Barcode */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1b1915] flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-[#7c7156]" />
              <span>Barcode (Max 13 Digits)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={13}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
              placeholder="Scan or enter barcode (e.g. 3508441104665)..."
              className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm font-mono text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            />
          </div>

          {/* Fragrance Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              Fragrance Name <span className="text-[#a05539]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              placeholder="e.g. Baccarat Rouge 540, Aventus"
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-serif font-bold text-[#1b1915] focus:outline-none focus:ring-2 ${
                nameError ? 'border-[#a05539] ring-[#a05539]/20' : 'border-[#e7e2d4] ring-[#9c8f6f]'
              }`}
            />
            {nameError && <p className="text-xs text-[#a05539] font-medium">{nameError}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Brand / House */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                House / Brand <span className="text-[#a05539]">*</span>
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Creed, Tom Ford, Chanel"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
              />
            </div>

            {/* Price with Peso sign */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Retail Price (<CurrencySign symbol={currency} />) <span className="text-[#a05539]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm text-[#8c826e] pointer-events-none">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPriceError(null);
                  }}
                  className={`w-full pl-8 pr-3.5 py-2.5 bg-white border rounded-xl text-sm font-mono text-[#1b1915] focus:outline-none focus:ring-2 ${
                    priceError ? 'border-[#a05539] ring-[#a05539]/20' : 'border-[#e7e2d4] ring-[#9c8f6f]'
                  }`}
                />
              </div>
              {priceError && <p className="text-xs text-[#a05539] font-medium">{priceError}</p>}
            </div>

            {/* Concentration Type */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Concentration
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915]"
              >
                <option value="Eau de Parfum">Eau de Parfum</option>
                <option value="Eau de Toilette">Eau de Toilette</option>
                <option value="Extrait de Parfum">Extrait de Parfum</option>
                <option value="Parfum">Parfum</option>
                <option value="Eau de Cologne">Eau de Cologne</option>
              </select>
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915]"
              >
                <option value="Unisex">Unisex</option>
                <option value="Women">Women</option>
                <option value="Men">Men</option>
              </select>
            </div>

            {/* Size (mL) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Bottle Size (mL)
              </label>
              <select
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915]"
              >
                <option value={30}>30 mL</option>
                <option value={50}>50 mL</option>
                <option value={75}>75 mL</option>
                <option value={90}>90 mL</option>
                <option value={100}>100 mL</option>
                <option value={150}>150 mL</option>
                <option value={200}>200 mL</option>
              </select>
            </div>

            {/* Initial Stock */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Initial Stock (pcs)
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-sm font-mono text-[#1b1915]"
              />
            </div>

            {/* Batch Code */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Batch Code
              </label>
              <input
                type="text"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="e.g. CH-8804"
                className="w-full px-3.5 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-sm font-mono uppercase text-[#1b1915]"
              />
            </div>

            {/* Counter Tester */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Counter Tester
              </label>
              <button
                type="button"
                onClick={() => setHasTester(!hasTester)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                  hasTester
                    ? 'bg-[#eef2ec] border-[#c9d8c5] text-[#57795c]'
                    : 'bg-[#faf8f4] border-[#e7e2d4] text-[#56534a]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{hasTester ? 'Tester Available' : 'No Tester'}</span>
                </span>
                {hasTester && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              Shelf Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Shelf B - Row 3"
              className="w-full px-3.5 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-[#e7e2d4]">
            <button
              type="button"
              onClick={() => setIsAddItemOpen(false)}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#1b1915] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#1b1915] hover:bg-[#34302a] text-white transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Save Fragrance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
