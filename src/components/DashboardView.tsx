import React from 'react';
import {
  Package,
  Layers,
  Camera,
  ArrowRight,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { computeInventoryStats } from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const DashboardView: React.FC = () => {
  const { items, setIsScannerOpen, setActiveTab } = useInventory();
  const stats = computeInventoryStats(items);

  return (
    <div className="space-y-6">
      {/* Header (clean, with removed cloud sync subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#7c7156]">
            Dashboard
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#242119] mt-0.5">
            Store Inventory Snapshot
          </h2>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8878] block">
            Total Inventory Units
          </span>
          <div className="font-serif text-3xl font-bold text-[#242119] mt-1">
            {stats.totalItems}
            <span className="text-sm font-sans font-normal text-[#8c8878] ml-1.5">bottles</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8878] block">
            Active SKUs Tracked
          </span>
          <div className="font-serif text-3xl font-bold text-[#242119] mt-1">
            {stats.skus}
            <span className="text-sm font-sans font-normal text-[#8c8878] ml-1.5">products</span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8878] block">
            Estimated Inventory Value
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[#57795c] mt-1 font-sans">
            <PriceDisplay amount={stats.totalValue} pesoClassName="text-[0.65em] font-normal opacity-75" />
          </div>
        </div>
      </div>

      {/* Stock Breakdown by Size */}
      <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8878] block">
          Stock Distribution by Volume (mL)
        </span>
        <div className="flex flex-wrap gap-2">
          {stats.sizeBreakdown.map((item) => (
            <span
              key={item.size}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-lg text-xs font-medium text-[#242119]"
            >
              <span className="font-bold">{item.size} mL</span>
              <span className="text-[#8c8878]">·</span>
              <span className="text-[#7c7156] font-semibold">{item.count} pcs</span>
            </span>
          ))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <button
          onClick={() => setActiveTab('inventory')}
          className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-xl text-left transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#faf8f4] flex items-center justify-center text-[#7c7156] group-hover:bg-[#efeadc]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#242119]">View Inventory</div>
              <div className="text-xs text-[#8c8878]">Browse all catalog items</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8c8878] group-hover:text-[#242119] group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-xl text-left transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#faf8f4] flex items-center justify-center text-[#7c7156] group-hover:bg-[#efeadc]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#242119]">Purchase History</div>
              <div className="text-xs text-[#8c8878]">Track retail revenue</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8c8878] group-hover:text-[#242119] group-hover:translate-x-0.5 transition-all" />
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-xl text-left transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#faf8f4] flex items-center justify-center text-[#7c7156] group-hover:bg-[#efeadc]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#242119]">Reports &amp; Export</div>
              <div className="text-xs text-[#8c8878]">PDF / Excel inventory sheets</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8c8878] group-hover:text-[#242119] group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
    </div>
  );
};
