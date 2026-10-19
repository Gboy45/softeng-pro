import React from 'react';
import { Package } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { computeInventoryStats } from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const DashboardView: React.FC = () => {
  const { items, currency } = useInventory();

  const stats = computeInventoryStats(items);

  // Calculate size breakdown percentages
  const totalBottles = stats.totalItems || 1;
  const sizeDistribution = [
    { size: 50, count: items.filter((i) => i.size === 50).reduce((s, i) => s + i.stock, 0) },
    { size: 90, count: items.filter((i) => i.size === 90).reduce((s, i) => s + i.stock, 0) },
    { size: 100, count: items.filter((i) => i.size === 100).reduce((s, i) => s + i.stock, 0) },
    { size: 150, count: items.filter((i) => i.size === 150).reduce((s, i) => s + i.stock, 0) },
  ];

  return (
    <div className="space-y-3.5 pb-20 md:pb-8 max-w-4xl">
      {/* Header Section */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1b1915] tracking-tight">
          Fragrance Inventory Dashboard
        </h1>
      </div>

      {/* 2 Sleek, Thinner Rectangular Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Total Stock Rectangle */}
        <div className="py-2.5 px-3.5 sm:py-3 sm:px-4 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#8c826e]">
              <Package className="w-3.5 h-3.5 text-[#8c826e]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                TOTAL STOCK
              </span>
            </div>
            <div className="font-serif text-xl sm:text-2xl font-bold text-[#1b1915] mt-0.5">
              {stats.totalItems}{' '}
              <span className="text-xs font-sans font-normal text-[#8c8878]">
                bottles
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#faf8f4] border border-[#e7e2d4] flex items-center justify-center text-[#7c7156] shrink-0">
            <Package className="w-4 h-4" />
          </div>
        </div>

        {/* Inventory Value Rectangle */}
        <div className="py-2.5 px-3.5 sm:py-3 sm:px-4 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#8c826e]">
              <div className="w-3.5 h-3.5 rounded-full bg-[#eef2ec] border border-[#d2dfcf] text-[#57795c] font-bold text-[9px] flex items-center justify-center leading-none">
                ₱
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                INVENTORY VALUE
              </span>
            </div>
            <div className="font-serif text-xl sm:text-2xl font-bold text-[#1b1915] mt-0.5">
              <PriceDisplay amount={stats.totalValue} symbol={currency} />
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#eef2ec] border border-[#d2dfcf] flex items-center justify-center text-[#57795c] font-bold text-base shrink-0">
            ₱
          </div>
        </div>
      </div>

      {/* Stock Distribution by Bottle Size Rectangle Card - Sleek & Thinner */}
      <div className="bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl py-3 px-3.5 sm:px-4 shadow-2xs space-y-2.5">
        <h3 className="font-serif text-sm sm:text-base font-bold text-[#1b1915]">
          Stock by Bottle Size
        </h3>

        <div className="space-y-2.5 pt-0.5">
          {sizeDistribution.map((item) => {
            const percentage = Math.round((item.count / totalBottles) * 100);
            return (
              <div key={item.size} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#1b1915]">{item.size} mL</span>
                  <span className="text-[#8c826e]">
                    {item.count} bottles ({percentage}%)
                  </span>
                </div>
                {/* Sleek Progress Bar */}
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
      </div>
    </div>
  );
};
