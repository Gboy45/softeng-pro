import React from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  ScanLine,
  PlusCircle,
  Receipt,
  FileSpreadsheet,
  MapPin,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { computeInventoryStats } from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const DashboardView: React.FC = () => {
  const {
    items,
    sales,
    setActiveTab,
    setIsAddItemOpen,
    setIsRecordSaleOpen,
    addStock,
    currency,
  } = useInventory();

  const stats = computeInventoryStats(items);

  // Find low stock items (<= 5 units)
  const lowStockItems = items.filter((item) => item.stock <= 5);

  // Calculate size breakdown percentages
  const totalBottles = stats.totalItems || 1;
  const sizeDistribution = [
    { size: 50, count: items.filter((i) => i.size === 50).reduce((s, i) => s + i.stock, 0) },
    { size: 90, count: items.filter((i) => i.size === 90).reduce((s, i) => s + i.stock, 0) },
    { size: 100, count: items.filter((i) => i.size === 100).reduce((s, i) => s + i.stock, 0) },
    { size: 150, count: items.filter((i) => i.size === 150).reduce((s, i) => s + i.stock, 0) },
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header Section */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c826e] block">
          OVERVIEW &amp; METRICS
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1b1915] mt-1 tracking-tight">
          Fragrance Inventory Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-[#56534a] mt-1">
          Real-time catalog monitoring, stock valuation, and boutique sales tracking.
        </p>
      </div>

      {/* 4 Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Stock */}
        <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              TOTAL STOCK
            </span>
            <Package className="w-4 h-4 text-[#8c826e]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1b1915] mt-2">
            {stats.totalItems}
          </div>
          <p className="text-[11px] text-[#8c8878] mt-1">Bottles across all shelves</p>
        </div>

        {/* Unique Fragrances */}
        <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              UNIQUE FRAGRANCES
            </span>
            <Layers className="w-4 h-4 text-[#8c826e]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1b1915] mt-2">
            {stats.skus}
          </div>
          <p className="text-[11px] text-[#8c8878] mt-1">Active catalog formulas</p>
        </div>

        {/* Inventory Value */}
        <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              INVENTORY VALUE
            </span>
            <div className="w-5 h-5 rounded-full bg-[#eef2ec] border border-[#d2dfcf] text-[#57795c] font-bold text-xs flex items-center justify-center leading-none">
              ₱
            </div>
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1b1915] mt-2">
            <PriceDisplay amount={stats.totalValue} symbol={currency} />
          </div>
          <p className="text-[11px] text-[#8c8878] mt-1">Calculated at current retail</p>
        </div>

        {/* Stock Alerts */}
        <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              STOCK ALERTS
            </span>
            <AlertTriangle className="w-4 h-4 text-[#9c793c]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1b1915] mt-2">
            {lowStockItems.length}
          </div>
          <p className="text-[11px] text-[#8c8878] mt-1">
            0 depleted · {lowStockItems.length} low threshold
          </p>
        </div>
      </div>

      {/* 4 Quick Action Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Scan Barcode */}
        <button
          onClick={() => setActiveTab('scan')}
          className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-2xl text-left transition-all shadow-2xs group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#faf8f4] group-hover:bg-[#efeadc] flex items-center justify-center text-[#7c7156] shrink-0 transition-colors">
            <ScanLine className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#1b1915]">Scan Barcode</div>
            <div className="text-[11px] text-[#8c8878] truncate">Camera reader &amp; lookup</div>
          </div>
        </button>

        {/* Add Perfume Item */}
        <button
          onClick={() => setIsAddItemOpen(true)}
          className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-2xl text-left transition-all shadow-2xs group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#faf8f4] group-hover:bg-[#efeadc] flex items-center justify-center text-[#7c7156] shrink-0 transition-colors">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#1b1915]">Add Perfume Item</div>
            <div className="text-[11px] text-[#8c8878] truncate">Ingest bottle into shelf</div>
          </div>
        </button>

        {/* Record Sale */}
        <button
          onClick={() => setIsRecordSaleOpen(true)}
          className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-2xl text-left transition-all shadow-2xs group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#faf8f4] group-hover:bg-[#efeadc] flex items-center justify-center text-[#7c7156] shrink-0 transition-colors">
            <Receipt className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#1b1915]">Record Sale</div>
            <div className="text-[11px] text-[#8c8878] truncate">Log client purchase</div>
          </div>
        </button>

        {/* Reports & Export */}
        <button
          onClick={() => setActiveTab('reports')}
          className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-2xl text-left transition-all shadow-2xs group flex items-center gap-3.5"
        >
          <div className="w-10 h-10 rounded-xl bg-[#faf8f4] group-hover:bg-[#efeadc] flex items-center justify-center text-[#7c7156] shrink-0 transition-colors">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-[#1b1915]">Reports &amp; Export</div>
            <div className="text-[11px] text-[#8c8878] truncate">Valuation &amp; CSV backups</div>
          </div>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Inventory Priority + Audit Trail (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Low Stock & Depleted Fragrances */}
          <div className="bg-white border border-[#e7e2d4] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c826e] block">
                  INVENTORY PRIORITY
                </span>
                <h3 className="font-serif text-lg font-bold text-[#1b1915]">
                  Low Stock &amp; Depleted Fragrances
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs font-semibold text-[#8c826e] hover:text-[#1b1915] flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-[#8c8878] py-4 text-center">
                  All fragrance stock levels are healthy.
                </p>
              ) : (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-[#e7e2d4] flex items-center justify-center text-[#8c826e] shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c826e] block truncate">
                          {item.brand}
                        </span>
                        <h4 className="font-serif text-sm font-bold text-[#1b1915] truncate">
                          {item.name}
                        </h4>
                        <div className="text-[11px] text-[#56534a] flex items-center gap-1.5 flex-wrap">
                          <span>{item.size}ml</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-[#8c826e]" />
                            {item.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#f6f0e1] text-[#9c793c] border border-[#ecdccf]">
                        {item.stock} left
                      </span>
                      <button
                        onClick={() => addStock(item.id, 5)}
                        className="px-3 py-1 rounded-md bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        +5 Stock
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Trail: Recent Purchase Ledger */}
          <div className="bg-white border border-[#e7e2d4] rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c826e] block">
                  AUDIT TRAIL
                </span>
                <h3 className="font-serif text-lg font-bold text-[#1b1915]">
                  Recent Purchase Ledger
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('sales')}
                className="text-xs font-semibold text-[#8c826e] hover:text-[#1b1915] flex items-center gap-1 transition-colors"
              >
                <span>All Transactions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#f0ece0]">
              {sales.slice(0, 3).map((sale) => (
                <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1b1915] block">{sale.name}</span>
                    <span className="text-[11px] text-[#8c8878]">{sale.date} · {sale.note}</span>
                  </div>
                  <div className="font-mono font-bold text-[#1b1915] text-sm">
                    <PriceDisplay amount={sale.amount} symbol={currency} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Distribution by Bottle Size (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-[#e7e2d4] rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c826e] block">
                DISTRIBUTION
              </span>
              <h3 className="font-serif text-lg font-bold text-[#1b1915]">
                Stock by Bottle Size
              </h3>
            </div>

            <div className="space-y-4 pt-1">
              {sizeDistribution.map((item) => {
                const percentage = Math.round((item.count / totalBottles) * 100);
                return (
                  <div key={item.size} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#1b1915]">{item.size} mL</span>
                      <span className="text-[#8c826e]">
                        {item.count} bottles ({percentage}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#f2efe6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#9c8f6f] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#e7e2d4]">
              <button
                onClick={() => setActiveTab('inventory')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#e7e2d4] hover:bg-[#faf8f4] text-xs font-semibold text-[#1b1915] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Detailed Inventory Breakdown</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#8c826e]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
