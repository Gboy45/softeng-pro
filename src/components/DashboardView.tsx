import React from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import {
  computeInventoryStats,
  computeMostSoldItemToday,
  computeSalesRevenueSummary,
  getStockStatus,
  getSystemDateString,
} from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const DashboardView: React.FC = () => {
  const { items, sales, currency } = useInventory();

  const systemDateIso = getSystemDateString();
  const formattedSystemDate = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const stats = computeInventoryStats(items);
  const revenueSummary = computeSalesRevenueSummary(sales, systemDateIso);
  const mostSoldToday = computeMostSoldItemToday(sales, items, systemDateIso);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-8 max-w-5xl">
      {/* Header Section with Fixed System Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-xl sm:text-3xl font-bold text-[#1b1915] tracking-tight">
            Fragrance Inventory Dashboard
          </h1>
        </div>
        <div
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 bg-white border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#56534a] shadow-2xs"
          title="Synchronized with your device's local system clock"
        >
          <Calendar className="w-3.5 h-3.5 text-[#7c7156] shrink-0" />
          <span>System Date:</span>
          <span className="font-bold text-[#1b1915] tabular-nums">
            {formattedSystemDate} ({systemDateIso})
          </span>
        </div>
      </div>

      {/* 4 Sleek Rectangular Metric Cards: Total Stock, Inventory Value, Total Revenue, Most Sold Item Today */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* 1. Total Stock Rectangle */}
        <div className="py-2.5 px-3 sm:py-3 sm:px-4 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[#8c826e]">
              <Package className="w-3.5 h-3.5 text-[#8c826e] shrink-0" />
              <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                TOTAL STOCK
              </span>
            </div>
            <div className="font-serif text-lg sm:text-2xl font-bold text-[#1b1915] mt-0.5 tabular-nums">
              {stats.totalItems}{' '}
              <span className="text-[11px] sm:text-xs font-sans font-normal text-[#8c8878]">
                bottles
              </span>
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-[#8c8878] truncate">
              Across {stats.skus} fragrances
            </div>
          </div>
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-[#faf8f4] border border-[#e7e2d4] items-center justify-center text-[#7c7156] shrink-0">
            <Package className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Inventory Value Rectangle */}
        <div className="py-2.5 px-3 sm:py-3 sm:px-4 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[#8c826e]">
              <div className="w-3.5 h-3.5 rounded-full bg-[#efeadc] border border-[#9c8f6f]/40 text-[#7c7156] font-bold text-[9px] flex items-center justify-center leading-none shrink-0">
                ₱
              </div>
              <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                INVENTORY VALUE
              </span>
            </div>
            <div className="font-serif text-lg sm:text-2xl font-bold text-[#1b1915] mt-0.5 tabular-nums truncate">
              <PriceDisplay amount={stats.totalValue} symbol={currency} />
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-[#8c8878] truncate">
              Total retail valuation
            </div>
          </div>
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-[#efeadc] border border-[#9c8f6f]/40 items-center justify-center text-[#7c7156] font-bold text-base shrink-0">
            ₱
          </div>
        </div>

        {/* 3. Total Revenue Rectangle */}
        <div className="py-2.5 px-3 sm:py-3 sm:px-4 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[#8c826e]">
              <Wallet className="w-3.5 h-3.5 text-[#57795c] shrink-0" />
              <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                TOTAL REVENUE
              </span>
            </div>
            <div className="font-serif text-lg sm:text-2xl font-bold text-[#57795c] mt-0.5 tabular-nums truncate">
              <PriceDisplay amount={revenueSummary.totalRevenue} symbol={currency} />
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-[#8c8878] truncate">
              {revenueSummary.totalTransactions} sales · Today:{' '}
              <span className="font-semibold text-[#1b1915]">
                <PriceDisplay amount={revenueSummary.todayRevenue} symbol={currency} />
              </span>
            </div>
          </div>
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-[#eef2ec] border border-[#d2dfcf] items-center justify-center text-[#57795c] font-bold text-base shrink-0">
            ₱
          </div>
        </div>

        {/* 4. Most Sold Item Today Rectangle */}
        <div className="py-2.5 px-3 sm:py-3 sm:px-4 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[#8c826e]">
              <TrendingUp className="w-3.5 h-3.5 text-[#7c7156] shrink-0" />
              <span className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                MOST SOLD TODAY
              </span>
            </div>
            <div
              className="font-serif text-base sm:text-lg font-bold text-[#1b1915] mt-0.5 truncate"
              title={mostSoldToday.name}
            >
              {mostSoldToday.name}
            </div>
            <div className="text-[10.5px] sm:text-[11px] text-[#57795c] font-semibold truncate">
              {mostSoldToday.count > 0 ? (
                <>
                  {mostSoldToday.count} bottle{mostSoldToday.count === 1 ? '' : 's'} sold
                  {mostSoldToday.revenue > 0 && (
                    <span className="text-[#8c8878]">
                      {' '}
                      · <PriceDisplay amount={mostSoldToday.revenue} symbol={currency} />
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[#8c8878]">No sales recorded today</span>
              )}
            </div>
          </div>
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-[#efeadc] border border-[#9c8f6f]/40 items-center justify-center text-[#7c7156] shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Low Stocks & High Stocks Side-by-Side Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Low Stocks Card (<= 5 bottles) */}
        <div className="bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl py-3.5 px-3.5 sm:px-4 shadow-2xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#9c793c] shrink-0" />
              <h3 className="font-serif text-sm sm:text-base font-bold text-[#1b1915]">
                Low Stock
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#fbf4e8] border border-[#ecdccf] text-[10px] font-bold uppercase tracking-wider text-[#9c793c] tabular-nums">
              {stats.lowStockItems.length} {stats.lowStockItems.length === 1 ? 'fragrance' : 'fragrances'} (≤ 5 pcs)
            </span>
          </div>

          {stats.lowStockItems.length === 0 ? (
            <div className="p-3 bg-[#eef2ec] border border-[#d2dfcf] rounded-xl text-xs text-[#57795c] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>All perfumes currently have more than 5 bottles in stock.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.lowStockItems.map((item) => {
                const status = getStockStatus(item.stock);
                const isOut = item.stock <= 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isOut
                        ? 'bg-[#f8ede5] border-[#ecdccf]'
                        : 'bg-[#fbf4e8] border-[#ecdccf]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[#1b1915] truncate">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            isOut ? 'text-[#a05539]' : 'text-[#9c793c]'
                          }`}
                        >
                          · {status.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#56534a] mt-0.5 truncate">
                        {item.brand} · {item.size} mL · {item.location}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#1b1915] bg-white/80 border border-[#ecdccf] px-2.5 py-1 rounded-lg tabular-nums">
                        {item.stock} pcs left
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* High Stocks Card (>= 10 bottles) */}
        <div className="bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl py-3.5 px-3.5 sm:px-4 shadow-2xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#57795c] shrink-0" />
              <h3 className="font-serif text-sm sm:text-base font-bold text-[#1b1915]">
                High Stock
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#eef2ec] border border-[#d2dfcf] text-[10px] font-bold uppercase tracking-wider text-[#57795c] tabular-nums">
              {stats.highStockItems.length} {stats.highStockItems.length === 1 ? 'fragrance' : 'fragrances'} (≥ 10 pcs)
            </span>
          </div>

          {stats.highStockItems.length === 0 ? (
            <div className="p-3 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs text-[#8c826e]">
              No fragrances currently have 10 or more bottles in stock.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.highStockItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 sm:p-3 rounded-xl border bg-[#eef2ec]/65 border-[#d2dfcf] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-[#1b1915] truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#57795c] shrink-0">
                        · High Stock
                      </span>
                    </div>
                    <div className="text-xs text-[#56534a] mt-0.5 truncate">
                      {item.brand} · {item.size} mL · {item.location}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-[#57795c] bg-white border border-[#d2dfcf] px-2.5 py-1 rounded-lg tabular-nums">
                      {item.stock} pcs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock by Brand Rectangle Card */}
      <div className="bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl py-3.5 px-3.5 sm:px-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm sm:text-base font-bold text-[#1b1915]">
            Stock by Brand
          </h3>
          <span className="text-xs text-[#8c826e]">
            {stats.brandBreakdown.length} brands · {stats.totalItems} total bottles
          </span>
        </div>

        <div className="space-y-2.5 pt-0.5">
          {stats.brandBreakdown.map((item) => (
            <div key={item.brand} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#1b1915]">
                  {item.brand}{' '}
                  <span className="text-[#8c8878] font-normal">
                    ({item.skuCount} {item.skuCount === 1 ? 'fragrance' : 'fragrances'})
                  </span>
                </span>
                <span className="text-[#8c826e] tabular-nums">
                  {item.count} bottles ({item.percentage}%)
                </span>
              </div>
              {/* Sleek Progress Bar */}
              <div className="w-full h-2 bg-[#f2efe6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#9c8f6f] rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};



