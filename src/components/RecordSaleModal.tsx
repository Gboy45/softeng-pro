import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, ChevronUp, ChevronDown, Package, Plus, Minus } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { CurrencySign } from './PriceDisplay.js';

export const RecordSaleModal: React.FC = () => {
  const { isRecordSaleOpen, setIsRecordSaleOpen, items, addSale, decrementStock, currency, showToast } = useInventory();

  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [clientName, setClientName] = useState('Walk-in Customer');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleAmount, setSaleAmount] = useState('0');
  const [note, setNote] = useState('');

  // Selected item reference
  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0];

  // Keep unit price constant for the selected perfume
  const unitPrice = selectedItem ? selectedItem.price : 0;

  // Initialize or update fields whenever selected perfume or quantity changes
  useEffect(() => {
    if (selectedItem) {
      const calculatedTotal = (selectedItem.price * quantity).toFixed(2);
      setSaleAmount(calculatedTotal);
    }
  }, [selectedItemId, quantity]);

  // When modal opens, sync with first item if empty
  useEffect(() => {
    if (isRecordSaleOpen && items.length > 0) {
      if (!selectedItemId || !items.some((i) => i.id === selectedItemId)) {
        setSelectedItemId(items[0].id);
      }
      setQuantity(1);
      setNote(''); // Leave notes textbox blank
    }
  }, [isRecordSaleOpen, items]);

  if (!isRecordSaleOpen) return null;

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const found = items.find((i) => i.id === itemId);
    if (found) {
      const calculatedTotal = (found.price * quantity).toFixed(2);
      setSaleAmount(calculatedTotal);
    }
  };

  const handleQuantityChange = (newQty: number) => {
    // Minimum 1, cannot be negative
    const validQty = Math.max(1, newQty);
    setQuantity(validQty);
    if (selectedItem) {
      const calculatedTotal = (selectedItem.price * validQty).toFixed(2);
      setSaleAmount(calculatedTotal);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(saleAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (selectedItem && quantity > selectedItem.stock) {
      showToast(`Warning: only ${selectedItem.stock} in stock, recorded ${quantity}`);
    }

    await addSale({
      name: clientName.trim() || 'Walk-in Customer',
      date: saleDate,
      amount,
      note: note.trim() || (selectedItem ? `${selectedItem.name}${quantity > 1 ? ` (x${quantity})` : ''}` : 'Boutique Sale'),
    });

    if (selectedItemId) {
      await decrementStock(selectedItemId, quantity);
    }

    showToast(`Recorded sale of ${quantity}x ${selectedItem?.name || 'perfume'}`);
    setIsRecordSaleOpen(false);
    setClientName('Walk-in Customer');
    setQuantity(1);
    setNote('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1b1915] text-white flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1b1915]">Record New Sale</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsRecordSaleOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Select Product (Clean name without stocks in the name) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Fragrance Sold
              </label>
              {selectedItem && (
                <span className="text-[11px] font-semibold text-[#57795c] bg-[#eef2ec] border border-[#d2dfcf] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Package className="w-3 h-3 text-[#57795c]" />
                  <span>{selectedItem.stock} in stock</span>
                </span>
              )}
            </div>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm font-medium text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.brand} ({item.size}ml)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Stepper with Arrow Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Quantity of Stock
              </label>
              <span className="text-[11px] text-[#8c826e]">
                Unit Price: <span className="font-semibold text-[#1b1915]">{currency}{unitPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  type="number"
                  min="1"
                  max={selectedItem ? Math.max(1, selectedItem.stock) : 999}
                  value={quantity}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    handleQuantityChange(isNaN(parsed) ? 1 : parsed);
                  }}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm font-mono font-bold text-[#1b1915] hide-steppers focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                />
                {/* Arrow Buttons to Add or Remove Quantity */}
                <div className="absolute right-1.5 top-1 bottom-1 flex flex-col justify-center">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="p-1 hover:bg-[#e7e2d4] text-[#56534a] hover:text-[#1b1915] rounded transition-colors"
                    title="Add 1 Quantity"
                  >
                    <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-1 hover:bg-[#e7e2d4] text-[#56534a] hover:text-[#1b1915] rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Remove 1 Quantity"
                  >
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Quick - / + Stepper Buttons for extra convenience */}
              <button
                type="button"
                onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-xl border border-[#e7e2d4] bg-[#faf8f4] hover:bg-[#efeadc] text-[#56534a] hover:text-[#1b1915] flex items-center justify-center transition-colors disabled:opacity-30"
                title="Decrease"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                className="w-10 h-10 rounded-xl border border-[#e7e2d4] bg-[#faf8f4] hover:bg-[#efeadc] text-[#1b1915] flex items-center justify-center transition-colors"
                title="Increase"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {selectedItem && quantity > selectedItem.stock && (
              <p className="text-[11px] text-[#a05539] font-medium">
                Note: Selected quantity ({quantity}) exceeds current in-stock ({selectedItem.stock}).
              </p>
            )}
          </div>

          {/* Client Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              Client / Customer Name <span className="text-[#a05539]">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Walk-in Customer, Maria Santos"
              className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Sale Date */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Date
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
              />
            </div>

            {/* Total Sale Amount (Constant unit price multiplied by quantity) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Total Amount (<CurrencySign symbol={currency} />)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#8c826e] pointer-events-none">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs font-mono font-bold text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                />
              </div>
            </div>
          </div>

          {/* Calculated Amount Note */}
          <div className="px-3 py-2 bg-[#faf8f4] rounded-xl border border-[#e7e2d4] flex items-center justify-between text-xs text-[#56534a]">
            <span>Price Calculation:</span>
            <span className="font-mono font-semibold text-[#1b1915]">
              {currency}{unitPrice.toFixed(2)} × {quantity} {quantity === 1 ? 'unit' : 'units'} = {currency}{(unitPrice * quantity).toFixed(2)}
            </span>
          </div>

          {/* NOTES field (strictly NOTES instead of FRAGRANCE / NOTES) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              NOTES
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes (leave blank if none)..."
              className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-[#e7e2d4]">
            <button
              type="button"
              onClick={() => setIsRecordSaleOpen(false)}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#1b1915] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#1b1915] hover:bg-[#34302a] text-white transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Sale ({currency}{saleAmount})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

