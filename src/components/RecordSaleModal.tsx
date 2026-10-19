import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { CurrencySign } from './PriceDisplay.js';

interface SaleItemLine {
  id: string;
  itemId: string;
  quantity: number;
}

export const RecordSaleModal: React.FC = () => {
  const {
    isRecordSaleOpen,
    setIsRecordSaleOpen,
    items,
    addSale,
    decrementStock,
    currency,
    showToast,
  } = useInventory();

  // Multi-item cart state: array of perfume items to buy in one sale
  const [saleLines, setSaleLines] = useState<SaleItemLine[]>([
    { id: 'line-1', itemId: items[0]?.id || '', quantity: 1 },
  ]);

  const [clientName, setClientName] = useState('Walk-in Customer');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleAmount, setSaleAmount] = useState('0');
  const [note, setNote] = useState('');

  // Calculate total automatically from all line items
  useEffect(() => {
    let total = 0;
    for (const line of saleLines) {
      const found = items.find((i) => i.id === line.itemId);
      if (found) {
        total += found.price * Math.max(1, line.quantity);
      }
    }
    setSaleAmount(total.toFixed(2));
  }, [saleLines, items]);

  // When modal opens, initialize with first item
  useEffect(() => {
    if (isRecordSaleOpen && items.length > 0) {
      setSaleLines([{ id: `line-${Date.now()}`, itemId: items[0].id, quantity: 1 }]);
      setQuantityForFirst(1);
      setNote(''); // Keep notes blank
      setClientName('Walk-in Customer');
      setSaleDate(new Date().toISOString().slice(0, 10));
    }
  }, [isRecordSaleOpen]);

  const setQuantityForFirst = (qty: number) => {
    // helper for clean initial state
  };

  if (!isRecordSaleOpen) return null;

  // Add another perfume item line to the sale
  const handleAddLine = () => {
    // Pick an item not already in cart, or default to first item
    const unusedItem = items.find((i) => !saleLines.some((line) => line.itemId === i.id)) || items[0];
    setSaleLines((prev) => [
      ...prev,
      { id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, itemId: unusedItem?.id || items[0]?.id || '', quantity: 1 },
    ]);
  };

  // Remove a line item from the sale
  const handleRemoveLine = (lineId: string) => {
    if (saleLines.length <= 1) {
      showToast('Sale must contain at least 1 fragrance item');
      return;
    }
    setSaleLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Update item selection on a line
  const handleLineItemChange = (lineId: string, newItemId: string) => {
    setSaleLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, itemId: newItemId } : l))
    );
  };

  // Update quantity on a line
  const handleLineQtyChange = (lineId: string, newQty: number) => {
    const valid = Math.max(1, newQty);
    setSaleLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, quantity: valid } : l))
    );
  };

  const totalItemCount = saleLines.reduce((sum, l) => sum + l.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(saleAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid sale amount');
      return;
    }

    // Decrement stock for all chosen perfumes
    const summaryItems: string[] = [];
    for (const line of saleLines) {
      const it = items.find((i) => i.id === line.itemId);
      if (it) {
        if (line.quantity > it.stock) {
          showToast(`Warning: only ${it.stock} in stock for ${it.name}`);
        }
        await decrementStock(line.itemId, line.quantity);
        summaryItems.push(`${line.quantity}x ${it.name}`);
      }
    }

    const autoNote = summaryItems.join(', ');

    await addSale({
      name: clientName.trim() || 'Walk-in Customer',
      date: saleDate,
      amount,
      note: note.trim() || autoNote || 'Store Sale',
    });

    showToast(`Recorded sale of ${totalItemCount} fragrance bottles (₱${amount.toFixed(2)})`);
    setIsRecordSaleOpen(false);
    setNote('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#e7e2d4] bg-[#faf8f4] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1b1915] text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4 text-[#efeadc]" />
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

        {/* Scrollable Form Body for Mobile Friendliness */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Multi-Perfume Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Fragrances Purchased ({saleLines.length})
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#efeadc] hover:bg-[#e7e0cc] text-[#1b1915] border border-[#9c8f6f]/40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Perfume</span>
              </button>
            </div>

            {/* List of Perfume Items */}
            <div className="space-y-3">
              {saleLines.map((line, idx) => {
                const item = items.find((i) => i.id === line.itemId) || items[0];
                const unitPrice = item ? item.price : 0;
                const subtotal = unitPrice * line.quantity;

                return (
                  <div
                    key={line.id}
                    className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-2.5 relative shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#8c826e] uppercase tracking-wider">
                        Item #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {item && (
                          <span className="text-[11px] font-semibold text-[#57795c] bg-[#eef2ec] border border-[#d2dfcf] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Package className="w-3 h-3 text-[#57795c]" />
                            <span>{item.stock} in stock</span>
                          </span>
                        )}
                        {saleLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-1 text-[#8c8878] hover:text-[#a05539] hover:bg-[#f8ede5] rounded-lg transition-colors"
                            title="Remove perfume from sale"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Perfume Selector */}
                    <select
                      value={line.itemId}
                      onChange={(e) => handleLineItemChange(line.id, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-xs sm:text-sm font-medium text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} · {it.brand} ({it.size}ml)
                        </option>
                      ))}
                    </select>

                    {/* Quantity Controls - Clean, No arrows, with - and + buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1.5 border-t border-[#f0ece0]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#56534a] font-medium">Quantity:</span>

                        {/* Minus Button */}
                        <button
                          type="button"
                          onClick={() => handleLineQtyChange(line.id, Math.max(1, line.quantity - 1))}
                          disabled={line.quantity <= 1}
                          className="w-8 h-8 rounded-lg border border-[#e7e2d4] bg-white hover:bg-[#efeadc] text-[#56534a] flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
                          title="Decrease Quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {/* Quantity input without any arrows */}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
                            handleLineQtyChange(line.id, isNaN(val) ? 1 : Math.min(val, item ? item.stock : 999));
                          }}
                          className="w-14 text-center py-1.5 bg-white border border-[#e7e2d4] rounded-lg text-xs font-mono font-bold text-[#1b1915] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
                        />

                        {/* Plus Button */}
                        <button
                          type="button"
                          onClick={() => handleLineQtyChange(line.id, line.quantity + 1)}
                          className="w-8 h-8 rounded-lg border border-[#e7e2d4] bg-white hover:bg-[#efeadc] text-[#1b1915] flex items-center justify-center active:scale-95 transition-transform"
                          title="Increase Quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Display Unit Price tag cleanly without any calculation formula */}
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-semibold text-[#8c826e] bg-[#f2efe6] px-2.5 py-1 rounded-lg">
                          ₱{unitPrice.toFixed(2)} / bottle
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Name */}
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

          {/* Date and Total Sale Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                className="w-full px-3 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
              />
            </div>

            {/* Total Sale Amount (Read-only / not editable, no arrows) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Total Amount (<CurrencySign symbol={currency} />)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#8c826e] pointer-events-none">
                  {currency}
                </span>
                <input
                  type="text"
                  readOnly
                  value={saleAmount}
                  className="w-full pl-8 pr-3 py-2.5 bg-[#f5f2ea] border border-[#e7e2d4] rounded-xl text-xs sm:text-sm font-mono font-bold text-[#1b1915] cursor-default select-none focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* NOTES field (blank by default so user doesn't have to delete anything) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              NOTES
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes (leave blank if none)..."
              className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-[#e7e2d4]">
            <button
              type="button"
              onClick={() => setIsRecordSaleOpen(false)}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#1b1915] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-xs bg-[#1b1915] hover:bg-[#34302a] text-white transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Record Sale ({currency}{saleAmount})
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


