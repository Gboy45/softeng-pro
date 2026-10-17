import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Calendar,
  FileText,
  User,
  Tag,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import {
  isValidNameInput,
  MAX_PURCHASE_AMOUNT,
} from '../utils/inventoryLogic.js';
import { PriceDisplay, PesoSign } from './PriceDisplay.js';

export const PurchaseHistoryView: React.FC = () => {
  const { sales, addSale, showToast } = useInventory();

  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saleAmount, setSaleAmount] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const totalRevenue = useMemo(() => {
    return sales.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [sales]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidNameInput(customerName)) {
      setNameError('Name must only contain letters, spaces, hyphens, and apostrophes');
      return;
    }
    setNameError(null);

    const amount = parseFloat(saleAmount);
    if (isNaN(amount) || amount <= 0 || amount > MAX_PURCHASE_AMOUNT) {
      setAmountError(`Amount must be between ₱0.01 and ₱500,000.00`);
      return;
    }
    setAmountError(null);

    await addSale({
      name: customerName.trim(),
      date: saleDate,
      amount,
      note: saleNote.trim(),
    });

    setCustomerName('');
    setSaleAmount('');
    setSaleNote('');
  };

  return (
    <div className="space-y-6 max-w-3xl pb-16 md:pb-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#7c7156]">
          Retail Sales
        </span>
        <h2 className="font-serif text-2xl font-bold text-[#242119]">
          Purchase History
        </h2>
      </div>

      {/* Total Revenue Highlight */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8878]">
          Total Store Revenue
        </span>
        <div className="font-sans text-3xl font-bold text-[#57795c]">
          <PriceDisplay amount={totalRevenue} pesoClassName="text-[0.65em] font-normal opacity-75" />
        </div>
        <p className="text-xs text-[#8c8878]">
          Accumulated across {sales.length} customer purchases
        </p>
      </div>

      {/* Add Sale Entry Form */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <h3 className="font-serif text-base font-bold text-[#242119]">
          Add Purchase Record
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              Customer Name <span className="text-[#a05539]">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setNameError(null);
              }}
              placeholder="e.g. Maria Santos"
              className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-lg text-xs sm:text-sm text-[#242119] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
            />
            {nameError && <p className="text-xs text-[#a05539] font-medium">{nameError}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              Purchase Date
            </label>
            <input
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-lg text-xs sm:text-sm text-[#242119] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              Amount (<PesoSign />) <span className="text-[#a05539]">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-[#8c8878] font-normal pointer-events-none">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={MAX_PURCHASE_AMOUNT}
                required
                value={saleAmount}
                onChange={(e) => {
                  setSaleAmount(e.target.value);
                  setAmountError(null);
                }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-lg text-xs sm:text-sm font-mono text-[#242119] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
              />
            </div>
            {amountError && <p className="text-xs text-[#a05539] font-medium">{amountError}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
              Item Note
            </label>
            <input
              type="text"
              value={saleNote}
              onChange={(e) => setSaleNote(e.target.value)}
              placeholder="e.g. Chanel Chance 100mL"
              className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-lg text-xs sm:text-sm text-[#242119] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
            />
          </div>

          <div className="sm:col-span-2 pt-1">
            <button
              type="submit"
              className="w-full py-2.5 bg-[#242119] hover:bg-[#34302a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#9c8f6f]" />
              <span>Record Purchase</span>
            </button>
          </div>
        </form>
      </div>

      {/* Purchase Log */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-[#242119]">
            Recent Transactions
          </h3>
          <div className="flex gap-1 bg-[#faf8f4] p-1 border border-[#e7e2d4] rounded-lg">
            {(['day', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                  period === p ? 'bg-[#242119] text-white' : 'text-[#56534a] hover:bg-[#f2efe6]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[#f0ece0]">
          {sales.length === 0 ? (
            <p className="text-xs text-[#8c8878] py-4 text-center">No purchases recorded yet.</p>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-[#242119] truncate">
                    {sale.name}
                  </div>
                  <div className="text-[11px] text-[#8c8878]">
                    {sale.date} {sale.note && `· ${sale.note}`}
                  </div>
                </div>
                <div className="font-serif font-bold text-sm sm:text-base text-[#57795c]">
                  <PriceDisplay amount={sale.amount} pesoClassName="text-[0.68em] font-normal" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
