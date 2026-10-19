import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  User,
  X,
  FileText,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import type { Sale } from '../types/inventory.js';
import { PriceDisplay } from './PriceDisplay.js';

export const PurchaseHistoryView: React.FC = () => {
  const { sales, items, deleteSale, setIsRecordSaleOpen, currency } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  // All Time, Today, Weekly, Monthly, and Quarterly
  const [period, setPeriod] = useState<'all' | 'today' | 'weekly' | 'monthly' | 'quarterly'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Filter sales by search and period, sorted accurately by date/timestamp (newest first)
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weeklyAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const monthlyAgo = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const quarterlyAgo = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    return sales
      .filter((sale) => {
        // Period filter: all time, today, weekly, monthly and quarterly
        const saleDateOnly = (sale.date || '').slice(0, 10);
        if (period === 'today' && saleDateOnly !== todayStr) return false;
        if (period === 'weekly' && saleDateOnly < weeklyAgo) return false;
        if (period === 'monthly' && saleDateOnly < monthlyAgo) return false;
        if (period === 'quarterly' && saleDateOnly < quarterlyAgo) return false;

        // Search filter
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          sale.name.toLowerCase().includes(q) ||
          (sale.note && sale.note.toLowerCase().includes(q)) ||
          sale.date.includes(q)
        );
      })
      .sort((a, b) => {
        // Accurate date and timestamp sorting: newest first
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
      });
  }, [sales, searchTerm, period]);

  // Compute metrics for current period
  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    [filteredSales]
  );
  const salesCount = filteredSales.length;

  // Compute Most Sold Item Today (replaces Average Order Value)
  const mostSoldItemToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => (s.date || '').slice(0, 10) === todayStr);
    if (todaySales.length === 0) {
      return { name: 'None yet', count: 0 };
    }

    const itemTally: Record<string, number> = {};

    todaySales.forEach((sale) => {
      const note = sale.note || '';
      let matched = false;

      // Check against catalog items
      items.forEach((it) => {
        if (note.toLowerCase().includes(it.name.toLowerCase())) {
          const escaped = it.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const rx = new RegExp(`(\\d+)\\s*x?\\s*${escaped}`, 'i');
          const m = note.match(rx);
          const qty = m ? parseInt(m[1], 10) : 1;
          itemTally[it.name] = (itemTally[it.name] || 0) + (isNaN(qty) ? 1 : qty);
          matched = true;
        }
      });

      if (!matched && note.trim()) {
        itemTally[note.trim()] = (itemTally[note.trim()] || 0) + 1;
      }
    });

    let topName = 'None yet';
    let topCount = 0;
    for (const [fragrance, count] of Object.entries(itemTally)) {
      if (count > topCount) {
        topCount = count;
        topName = fragrance;
      }
    }

    return { name: topName, count: topCount };
  }, [sales, items]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1b1915] tracking-tight">
            Purchase History
          </h1>
        </div>

        {/* Top Right: + Record New Sale Button */}
        <button
          onClick={() => setIsRecordSaleOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Sale</span>
        </button>
      </div>

      {/* 3 Thinner Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {/* Total Revenue with Peso badge */}
        <div className="py-2 px-3 sm:py-2.5 sm:px-3.5 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              TOTAL REVENUE
            </span>
            <div className="w-3.5 h-3.5 rounded-full bg-[#eef2ec] border border-[#d2dfcf] text-[#57795c] font-bold text-[8.5px] flex items-center justify-center leading-none">
              ₱
            </div>
          </div>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#1b1915] mt-0.5">
            <PriceDisplay amount={totalRevenue} symbol={currency} />
          </div>
        </div>

        {/* Sales Recorded */}
        <div className="py-2 px-3 sm:py-2.5 sm:px-3.5 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              SALES RECORDED
            </span>
            <div className="w-3.5 h-3.5 rounded-full bg-[#efeadc] border border-[#9c8f6f]/40 text-[#7c7156] font-bold text-[8.5px] flex items-center justify-center leading-none">
              ₱
            </div>
          </div>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#1b1915] mt-0.5">
            {salesCount}
          </div>
        </div>

        {/* Most Sold Item Today (Replaced Average Order Value) */}
        <div className="py-2 px-3 sm:py-2.5 sm:px-3.5 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              MOST SOLD ITEM TODAY
            </span>
            <div className="w-3.5 h-3.5 rounded-full bg-[#efeadc] border border-[#9c8f6f]/40 text-[#7c7156] font-bold text-[8.5px] flex items-center justify-center leading-none">
              ★
            </div>
          </div>
          <div className="font-serif text-sm sm:text-base font-bold text-[#1b1915] mt-0.5 truncate" title={mostSoldItemToday.name}>
            {mostSoldItemToday.name}
          </div>
          <div className="text-[10px] text-[#8c8878] font-medium">
            {mostSoldItemToday.count > 0
              ? `${mostSoldItemToday.count} bottle${mostSoldItemToday.count === 1 ? '' : 's'} sold today`
              : 'No sales today yet'}
          </div>
        </div>
      </div>

      {/* Search and Period Filter Bar: all time, today, weekly, monthly and quarterly */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#8c826e]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name or notes..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] placeholder-[#8c8878] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs"
          />
        </div>

        {/* Period Filter Tabs: All Time, Today, Weekly, Monthly, Quarterly (fitted in bar with no scroll) */}
        <div className="w-full sm:w-auto grid grid-cols-5 p-1 bg-white border border-[#e7e2d4] rounded-xl shadow-2xs">
          {[
            { key: 'all' as const, label: 'All Time' },
            { key: 'today' as const, label: 'Today' },
            { key: 'weekly' as const, label: 'Weekly' },
            { key: 'monthly' as const, label: 'Monthly' },
            { key: 'quarterly' as const, label: 'Quarterly' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`py-1.5 px-0.5 sm:px-3 text-[10.5px] sm:text-xs font-semibold rounded-lg transition-colors text-center truncate ${
                period === tab.key
                  ? 'bg-[#efeadc] text-[#1b1915] shadow-2xs font-bold'
                  : 'text-[#7c7156] hover:text-[#1b1915] hover:bg-[#faf8f4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Container - Responsive: Thinner Cards on Mobile, Table on Tablet/Desktop */}
      <div className="bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs">
        {/* Mobile Card View (< sm) - Thinner */}
        <div className="block sm:hidden divide-y divide-[#f0ece0]">
          {filteredSales.length === 0 ? (
            <div className="py-8 text-center text-[#8c8878] text-xs">
              No sales records found for this period.
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="py-2.5 px-3.5 space-y-1.5 active:bg-[#faf8f4] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#56534a]">
                    <Calendar className="w-3.5 h-3.5 text-[#8c826e]" />
                    <span>{sale.date}</span>
                  </span>
                  <span className="font-serif font-bold text-sm sm:text-base text-[#1b1915]">
                    <PriceDisplay amount={sale.amount} symbol={currency} />
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#1b1915]">
                    <User className="w-3.5 h-3.5 text-[#8c826e]" />
                    <span>{sale.name}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSale(sale);
                      }}
                      className="p-1 text-[#8c8878] hover:text-[#1b1915] rounded-md"
                      title="View Description"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSale(sale.id);
                      }}
                      className="p-1 text-[#8c8878] hover:text-[#a05539] rounded-md"
                      title="Delete Sale"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {sale.note && (
                  <p className="text-[11px] text-[#56534a] line-clamp-2 bg-[#faf8f4] py-1 px-2 rounded-md border border-[#f0ece0]">
                    {sale.note}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= sm) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e7e2d4] bg-[#faf8f4] text-[#8c826e] uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-5">DATE</th>
                <th className="py-3 px-5">CLIENT NAME</th>
                <th className="py-3 px-5">NOTES</th>
                <th className="py-3 px-5">AMOUNT</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece0]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8c8878]">
                    No sales records found for this period.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-[#faf8f4] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5 text-[#56534a] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#8c826e]" />
                        <span>{sale.date}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-[#1b1915] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#8c826e]" />
                        <span>{sale.name}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-[#56534a] font-medium max-w-xs truncate">
                      {sale.note || '—'}
                    </td>
                    <td className="py-3.5 px-5 font-serif font-bold text-sm text-[#1b1915] whitespace-nowrap">
                      <PriceDisplay amount={sale.amount} symbol={currency} />
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSale(sale);
                          }}
                          className="p-1.5 text-[#8c8878] hover:text-[#1b1915] hover:bg-[#efeadc] rounded-lg transition-colors"
                          title="View Purchase Description"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSale(sale.id);
                          }}
                          className="p-1.5 text-[#8c8878] hover:text-[#a05539] hover:bg-[#f8ede5] rounded-lg transition-colors"
                          title="Delete Sale Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pop-up Menu / Modal for Purchase History Descriptions */}
      {selectedSale && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b1915] text-[#efeadc] flex items-center justify-center font-bold text-base shadow-xs">
                  ₱
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1b1915]">
                    Purchase Record
                  </h3>
                  <p className="text-[11px] text-[#8c826e] uppercase tracking-wider font-semibold">
                    Transaction ID: #{selectedSale.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Amount Hero */}
              <div className="p-4 rounded-xl bg-[#faf8f4] border border-[#e7e2d4] text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c826e] block">
                  TOTAL AMOUNT
                </span>
                <div className="font-serif text-3xl font-bold text-[#1b1915] mt-1">
                  <PriceDisplay amount={selectedSale.amount} symbol={currency} />
                </div>
              </div>

              {/* Client and Date Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#faf8f4] rounded-xl border border-[#e7e2d4]">
                  <span className="text-[10px] font-bold uppercase text-[#8c826e] block mb-0.5">
                    CUSTOMER
                  </span>
                  <span className="font-semibold text-[#1b1915]">{selectedSale.name}</span>
                </div>
                <div className="p-3 bg-[#faf8f4] rounded-xl border border-[#e7e2d4]">
                  <span className="text-[10px] font-bold uppercase text-[#8c826e] block mb-0.5">
                    DATE
                  </span>
                  <span className="font-semibold text-[#1b1915]">{selectedSale.date}</span>
                </div>
              </div>

              {/* Description & Notes Card */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#7c7156]" />
                  <span>Purchase Description &amp; Notes</span>
                </label>
                <div className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs text-[#242119] leading-relaxed min-h-[75px]">
                  {selectedSale.note ? (
                    <p className="font-medium text-[#1b1915] whitespace-pre-wrap">{selectedSale.note}</p>
                  ) : (
                    <p className="italic text-[#8c8878]">No specific notes provided for this transaction.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedSale.id;
                    setSelectedSale(null);
                    deleteSale(id);
                  }}
                  className="px-3.5 py-2.5 text-xs font-semibold text-[#a05539] hover:bg-[#f8ede5] border border-[#ecdccf] rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="flex-1 py-2.5 px-4 bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

