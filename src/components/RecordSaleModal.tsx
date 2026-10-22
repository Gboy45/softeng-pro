import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Banknote,
  ChevronDown,
  Check,
  Search,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import type { PaymentMethod, SalePurchasedItem } from '../types/inventory.js';
import { calculateChangeDue, getSystemDateString } from '../utils/inventoryLogic.js';
import { CurrencySign, PriceDisplay } from './PriceDisplay.js';

interface SaleItemLine {
  id: string;
  itemId: string;
  quantity: number;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'GCash', 'Maya', 'Card', 'Bank Transfer'];

export const RecordSaleModal: React.FC = () => {
  const {
    isRecordSaleOpen,
    setIsRecordSaleOpen,
    items,
    addSale,
    decrementStock,
    currency,
    showToast,
    currentUser,
  } = useInventory();

  // Multi-item cart state: array of perfume items to buy in one sale
  const [saleLines, setSaleLines] = useState<SaleItemLine[]>([
    { id: 'line-1', itemId: items[0]?.id || '', quantity: 1 },
  ]);

  // Custom Perfume Dropdown state
  const [openDropdownLineId, setOpenDropdownLineId] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  const [clientName, setClientName] = useState('Walk-in Customer');
  const [saleDate, setSaleDate] = useState(() => getSystemDateString());
  const [saleAmount, setSaleAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountTendered, setAmountTendered] = useState('');
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
      setOpenDropdownLineId(null);
      setDropdownSearch('');
      setNote('');
      setClientName('Walk-in Customer');
      setSaleDate(getSystemDateString());
      setPaymentMethod('Cash');
      setAmountTendered('');
    }
  }, [isRecordSaleOpen]);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    if (!openDropdownLineId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setOpenDropdownLineId(null);
        setDropdownSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownLineId]);

  if (!isRecordSaleOpen) return null;

  const totalNumeric = parseFloat(saleAmount) || 0;
  const tenderedNumeric = parseFloat(amountTendered) || 0;
  const changeDue =
    paymentMethod === 'Cash' && tenderedNumeric > totalNumeric
      ? calculateChangeDue(totalNumeric, tenderedNumeric)
      : 0;

  // Add another perfume item line to the sale
  const handleAddLine = () => {
    const unusedItem = items.find((i) => !saleLines.some((line) => line.itemId === i.id)) || items[0];
    setSaleLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        itemId: unusedItem?.id || items[0]?.id || '',
        quantity: 1,
      },
    ]);
  };

  // Remove a line item from the sale
  const handleRemoveLine = (lineId: string) => {
    if (saleLines.length <= 1) {
      showToast('Sale must contain at least 1 fragrance item');
      return;
    }
    if (openDropdownLineId === lineId) {
      setOpenDropdownLineId(null);
      setDropdownSearch('');
    }
    setSaleLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Update item selection on a line
  const handleLineItemChange = (lineId: string, newItemId: string) => {
    setSaleLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, itemId: newItemId } : l))
    );
    setOpenDropdownLineId(null);
    setDropdownSearch('');
  };

  // Update quantity on a line
  const handleLineQtyChange = (lineId: string, newQty: number) => {
    const valid = Math.max(1, newQty);
    setSaleLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, quantity: valid } : l))
    );
  };

  const totalItemCount = saleLines.reduce((sum, l) => sum + l.quantity, 0);

  const filteredDropdownItems = items.filter((it) => {
    if (!dropdownSearch.trim()) return true;
    const q = dropdownSearch.toLowerCase();
    return (
      it.name.toLowerCase().includes(q) ||
      it.brand.toLowerCase().includes(q) ||
      String(it.size).includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(saleAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid sale amount');
      return;
    }

    // Build structured purchased items and decrement stock
    const summaryItems: string[] = [];
    const purchasedItems: SalePurchasedItem[] = [];

    for (const line of saleLines) {
      const it = items.find((i) => i.id === line.itemId);
      if (it) {
        if (line.quantity > it.stock) {
          showToast(`Warning: only ${it.stock} in stock for ${it.name}`);
        }
        await decrementStock(line.itemId, line.quantity);
        const qty = Math.max(1, line.quantity);
        const unitPrice = Number(it.price || 0);
        const subtotal = Number((qty * unitPrice).toFixed(2));

        summaryItems.push(`${qty}x ${it.name}`);
        purchasedItems.push({
          itemId: it.id,
          name: it.name,
          brand: it.brand,
          size: it.size,
          quantity: qty,
          unitPrice,
          subtotal,
        });
      }
    }

    const autoNote = summaryItems.join(', ');
    const finalTendered =
      paymentMethod === 'Cash' && tenderedNumeric >= amount ? tenderedNumeric : amount;

    const actualSystemDate = getSystemDateString();
    setSaleDate(actualSystemDate);

    await addSale({
      name: clientName.trim() || 'Walk-in Customer',
      date: actualSystemDate,
      amount,
      note: note.trim() ? note.trim() : autoNote || 'Store Sale',
      items: purchasedItems,
      paymentMethod,
      amountTendered: paymentMethod === 'Cash' ? finalTendered : amount,
      changeDue: paymentMethod === 'Cash' ? calculateChangeDue(amount, finalTendered) : 0,
      cashier: currentUser?.role === 'admin' ? 'Admin' : 'Associate',
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
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#e7e2d4] bg-[#faf8f4] shrink-0">
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Multi-Perfume Items List */}
          <div className="space-y-2.5" ref={dropdownContainerRef}>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Perfumes Purchased ({saleLines.length})
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
            <div className="space-y-2.5">
              {saleLines.map((line, idx) => {
                const item = items.find((i) => i.id === line.itemId) || items[0];
                const unitPrice = item ? item.price : 0;
                const subtotal = unitPrice * line.quantity;
                const isDropdownOpen = openDropdownLineId === line.id;

                return (
                  <div
                    key={line.id}
                    className="p-3 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-2 relative shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#8c826e] uppercase tracking-wider">
                        Perfume #{idx + 1}
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

                    {/* Custom System-Styled Perfume Selector Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (isDropdownOpen) {
                            setOpenDropdownLineId(null);
                            setDropdownSearch('');
                          } else {
                            setOpenDropdownLineId(line.id);
                            setDropdownSearch('');
                          }
                        }}
                        aria-expanded={isDropdownOpen}
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
                          isDropdownOpen
                            ? 'border-[#9c8f6f] ring-2 ring-[#9c8f6f]/25 shadow-xs'
                            : 'border-[#e7e2d4] hover:border-[#c9c1ae]'
                        }`}
                      >
                        {item ? (
                          <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate">
                              <span className="font-bold text-xs sm:text-sm text-[#1b1915]">
                                {item.name}
                              </span>
                              <span className="text-xs text-[#7c7156] ml-1.5">
                                · {item.brand} ({item.size}mL)
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[#1b1915] bg-[#faf8f4] border border-[#e7e2d4] px-2 py-0.5 rounded-md shrink-0 tabular-nums">
                              <PriceDisplay amount={item.price} symbol={currency} />
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#8c8878]">Select a perfume...</span>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-[#7c7156] shrink-0 transition-transform duration-150 ${
                            isDropdownOpen ? 'rotate-180 text-[#1b1915]' : ''
                          }`}
                        />
                      </button>

                      {/* Custom Styled Dropdown List */}
                      {isDropdownOpen && (
                        <div className="mt-1.5 w-full bg-white border border-[#d8d2c2] rounded-xl shadow-xl overflow-hidden z-30 animate-fadeIn">
                          {/* Quick Filter Input inside Dropdown */}
                          <div className="p-2 bg-[#faf8f4] border-b border-[#e7e2d4] flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-[#8c826e] ml-1.5 shrink-0" />
                            <input
                              type="text"
                              value={dropdownSearch}
                              onChange={(e) => setDropdownSearch(e.target.value)}
                              placeholder="Filter perfume or brand..."
                              className="w-full bg-transparent text-xs text-[#1b1915] placeholder:text-[#8c8878] focus:outline-none py-0.5"
                            />
                            {dropdownSearch && (
                              <button
                                type="button"
                                onClick={() => setDropdownSearch('')}
                                className="text-[#8c8878] hover:text-[#1b1915] p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Options List */}
                          <div className="max-h-52 overflow-y-auto divide-y divide-[#f0ece0]">
                            {filteredDropdownItems.length === 0 ? (
                              <div className="py-4 px-3 text-center text-xs text-[#8c8878]">
                                No perfumes match "{dropdownSearch}"
                              </div>
                            ) : (
                              filteredDropdownItems.map((it) => {
                                const isSelected = it.id === line.itemId;
                                return (
                                  <button
                                    key={it.id}
                                    type="button"
                                    onClick={() => handleLineItemChange(line.id, it.id)}
                                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                                      isSelected
                                        ? 'bg-[#efeadc]/80 text-[#1b1915]'
                                        : 'bg-white hover:bg-[#faf8f4] text-[#1b1915]'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs sm:text-sm text-[#1b1915] truncate">
                                          {it.name}
                                        </span>
                                        {isSelected && (
                                          <Check className="w-3.5 h-3.5 text-[#57795c] shrink-0" />
                                        )}
                                      </div>
                                      <div className="text-[11px] text-[#7c7156] flex items-center gap-1.5 mt-0.5">
                                        <span>{it.brand}</span>
                                        <span>·</span>
                                        <span>{it.size} mL</span>
                                        <span>·</span>
                                        <span
                                          className={
                                            it.stock < 5
                                              ? 'text-[#a05539] font-semibold'
                                              : 'text-[#57795c] font-medium'
                                          }
                                        >
                                          {it.stock} in stock
                                        </span>
                                      </div>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <span
                                        className={`font-serif font-bold text-xs sm:text-sm tabular-nums px-2 py-1 rounded-lg border ${
                                          isSelected
                                            ? 'bg-[#1b1915] text-[#efeadc] border-[#1b1915]'
                                            : 'bg-[#faf8f4] text-[#1b1915] border-[#e7e2d4]'
                                        }`}
                                      >
                                        <PriceDisplay amount={it.price} symbol={currency} />
                                      </span>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quantity Controls & Subtotal */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#f0ece0]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#56534a] font-medium">Qty:</span>

                        <button
                          type="button"
                          onClick={() => handleLineQtyChange(line.id, Math.max(1, line.quantity - 1))}
                          disabled={line.quantity <= 1}
                          className="w-7 h-7 rounded-lg border border-[#e7e2d4] bg-white hover:bg-[#efeadc] text-[#56534a] flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
                          title="Decrease Quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="text"
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
                            handleLineQtyChange(line.id, isNaN(val) ? 1 : Math.min(val, item ? item.stock : 999));
                          }}
                          className="w-12 text-center py-1 bg-white border border-[#e7e2d4] rounded-lg text-xs font-mono font-bold text-[#1b1915] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
                        />

                        <button
                          type="button"
                          onClick={() => handleLineQtyChange(line.id, line.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-[#e7e2d4] bg-white hover:bg-[#efeadc] text-[#1b1915] flex items-center justify-center active:scale-95 transition-transform"
                          title="Increase Quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <span className="text-[11px] text-[#8c826e]">
                          ₱{unitPrice.toFixed(2)} ea
                        </span>
                        <span className="text-xs font-bold text-[#1b1915] bg-[#efeadc] px-2.5 py-1 rounded-lg tabular-nums">
                          <PriceDisplay amount={subtotal} symbol={currency} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Name & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Name <span className="text-[#a05539]">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Walk-in Customer, Maria Santos"
                className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Date
              </label>
              <input
                type="date"
                readOnly
                disabled
                value={saleDate}
                title="Automatically set to the actual system date"
                className="w-full px-3 py-2 bg-[#f2efe6] border border-[#e7e2d4] rounded-xl text-xs sm:text-sm font-semibold text-[#1b1915] cursor-not-allowed select-none"
              />
            </div>
          </div>

          {/* Payment Method & Change Calculator */}
          <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#56534a] flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-[#7c7156]" />
                <span>Payment Method</span>
              </label>
              <span className="text-xs font-bold text-[#1b1915] tabular-nums">
                Total: <PriceDisplay amount={totalNumeric} symbol={currency} />
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`flex-1 min-w-[76px] py-1.5 px-2.5 rounded-lg text-[10.5px] sm:text-xs font-bold transition-colors whitespace-nowrap ${
                    paymentMethod === method
                      ? 'bg-[#1b1915] text-white shadow-2xs'
                      : 'bg-white border border-[#e7e2d4] text-[#56534a] hover:bg-[#efeadc]'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {paymentMethod === 'Cash' && (
              <div className="pt-2 border-t border-[#e7e2d4] space-y-2">
                <div className="grid grid-cols-2 gap-2.5 items-center">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e] mb-1">
                      Cash Received (<CurrencySign symbol={currency} />)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-[#8c826e]">
                        {currency}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountTendered}
                        onChange={(e) => setAmountTendered(e.target.value)}
                        placeholder={saleAmount}
                        className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-[#e7e2d4] rounded-lg text-xs font-mono font-bold text-[#1b1915] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-white border border-[#e7e2d4] rounded-lg text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e]">
                      Change Due
                    </span>
                    <span className="font-serif text-sm sm:text-base font-bold text-[#57795c] tabular-nums">
                      <PriceDisplay amount={changeDue} symbol={currency} />
                    </span>
                  </div>
                </div>

                {/* Quick Cash Tendered Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmountTendered(saleAmount)}
                    className="px-2 py-1 text-[10px] font-semibold bg-white border border-[#e7e2d4] hover:bg-[#efeadc] rounded-md text-[#56534a]"
                  >
                    Exact (₱{saleAmount})
                  </button>
                  {[100, 200, 500, 1000].map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => setAmountTendered(bill.toFixed(2))}
                      className="px-2 py-1 text-[10px] font-semibold bg-white border border-[#e7e2d4] hover:bg-[#efeadc] rounded-md text-[#1b1915]"
                    >
                      ₱{bill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* NOTES field */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              NOTES
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional notes (leave blank if none)..."
              className="w-full px-3.5 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 border-t border-[#e7e2d4]">
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


