import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  Minus,
  MapPin,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import type { InventoryItem } from '../types/inventory.js';
import { getStockStatus } from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

// Outline perfume bottle icon matching user photo (Image 1)
const BottleOutlineIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="9.5" y="2.5" width="5" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M10.5 5.5v1.8M13.5 5.5v1.8" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M10.5 7.3c-1.8 1-3.2 2.8-3.5 5L6.5 19c0 1.8 1.4 3 3 3h5c1.6 0 3-1.2 3-3l-.5-6.7c-.3-2.2-1.7-4-3.5-5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path d="M6.8 14.5h10.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const InventoryView: React.FC = () => {
  const {
    items,
    setIsAddItemOpen,
    setEditingItem,
    addStock,
    decrementStock,
    currency,
    deleteItem,
    currentUser,
  } = useInventory();

  const isAdmin = currentUser?.role === 'admin';
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [sortBy, setSortBy] = useState<
    'name-asc' | 'name-desc' | 'brand-asc' | 'brand-desc' | 'size-desc' | 'size-asc' | 'stock-desc' | 'price-desc'
  >('name-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter options
  const brands = useMemo(() => ['all', ...Array.from(new Set(items.map((i) => i.brand))).sort()], [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const query = searchTerm.toLowerCase().trim();

        // Check if query matches bottle size in mL (e.g. 50, 100, 50ml, 100 mL)
        const cleanQuery = query.replace(/\s+/g, '').toLowerCase();
        const mlRegexMatch = cleanQuery.match(/^(\d+)(?:ml)?$/i);
        const searchSize = mlRegexMatch ? parseInt(mlRegexMatch[1], 10) : null;
        const matchesSize =
          (searchSize !== null && item.size === searchSize) ||
          query === `${item.size}` ||
          cleanQuery === `${item.size}ml` ||
          `${item.size} ml`.includes(query);

        const matchesQuery =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.brand.toLowerCase().includes(query) ||
          item.barcode.includes(query) ||
          (item.gender && item.gender.toLowerCase().includes(query)) ||
          matchesSize ||
          (item.location && item.location.toLowerCase().includes(query));

        const matchesBrand = selectedBrand === 'all' || item.brand === selectedBrand;
        const matchesGender = selectedGender === 'all' || item.gender?.toLowerCase() === selectedGender.toLowerCase();

        return matchesQuery && matchesBrand && matchesGender;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'brand-asc':
            return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
          case 'brand-desc':
            return b.brand.localeCompare(a.brand) || a.name.localeCompare(b.name);
          case 'size-asc':
            return a.size - b.size || a.name.localeCompare(b.name);
          case 'size-desc':
            return b.size - a.size || a.name.localeCompare(b.name);
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'stock-desc':
            return b.stock - a.stock;
          case 'price-desc':
            return b.price - a.price;
          default:
            return 0;
        }
      });
  }, [items, searchTerm, selectedBrand, selectedGender, sortBy]);

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Header Row */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1b1915] tracking-tight">
          Perfume Inventory
        </h1>
      </div>

      {/* Search & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search Bar - Supports Fragrance, Brand, Bottle Size in mL, Barcode */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8c826e]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search fragrance, brand, bottle size (e.g. 100mL), barcode..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] placeholder-[#8c8878] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs"
          />
        </div>

        {/* Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-2xs ${
            showFilters || selectedBrand !== 'all' || selectedGender !== 'all'
              ? 'bg-[#efeadc] border-[#9c8f6f] text-[#1b1915]'
              : 'bg-white border-[#e7e2d4] text-[#56534a] hover:bg-[#faf8f4]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#8c826e]" />
          <span>Filters</span>
        </button>

        {/* Sort Dropdown - Brand (A-Z) and Bottle Size (Small to Large) as requested */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs cursor-pointer"
          >
            <option value="brand-asc">Sort: Brand (A-Z)</option>
            <option value="brand-desc">Sort: Brand (Z-A)</option>
            <option value="size-asc">Sort: Bottle Size (Small to Large)</option>
            <option value="size-desc">Sort: Bottle Size (Large to Small)</option>
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="stock-desc">Sort: Stock (High-Low)</option>
            <option value="price-desc">Sort: Price (High-Low)</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#8c826e] pointer-events-none" />
        </div>

        {/* Grid / List View Toggle */}
        <div className="hidden sm:flex items-center p-0.5 bg-white border border-[#e7e2d4] rounded-xl shadow-2xs">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-[#efeadc] text-[#1b1915]' : 'text-[#8c8878] hover:text-[#1b1915]'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#efeadc] text-[#1b1915]' : 'text-[#8c8878] hover:text-[#1b1915]'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Filter Drawer - With Gender instead of Concentration */}
      {showFilters && (
        <div className="p-3.5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e] mb-1">
              Filter by Brand / House
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915]"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === 'all' ? 'All Brands' : b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e] mb-1">
              Filter by Gender
            </label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915]"
            >
              <option value="all">All Genders</option>
              <option value="Unisex">Unisex</option>
              <option value="Women">Women</option>
              <option value="Men">Men</option>
            </select>
          </div>
        </div>
      )}

      {/* Fragrance Cards - Thinner, Sleek Rectangles */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
          {filteredItems.map((item) => {
            const status = getStockStatus(item.stock);
            const isLow = item.stock <= 5;

            return (
              <div
                key={item.id}
                onClick={() => setEditingItem(item)}
                className="bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-2xl p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer group active:scale-[0.99]"
              >
                {/* Left: Square bottle icon badge + Item Name & Pills */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Square rounded bottle icon container */}
                  <div className="w-9 h-9 rounded-xl bg-[#f2efe6] border border-[#e7e2d4]/70 flex items-center justify-center shrink-0 text-[#8c7a5b] group-hover:bg-[#efeadc] transition-colors">
                    <BottleOutlineIcon className="w-4 h-4 text-[#8c7a5b]" />
                  </div>

                  {/* Fragrance details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif sm:font-sans font-bold text-sm sm:text-base text-[#1b1915] truncate leading-snug group-hover:text-[#7c7156] transition-colors">
                        {item.name}
                      </h3>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          className="p-1 text-[#8c8878] hover:text-[#a05539] hover:bg-[#f8ede5] rounded-lg transition-colors ml-auto sm:ml-0 shrink-0"
                          title="Delete Fragrance (Admin Only)"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Pills: House, Size, Gender */}
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f2efe6] text-[#56534a] border border-[#e7e2d4]/60">
                        {item.brand}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f2efe6] text-[#56534a] border border-[#e7e2d4]/60">
                        {item.size} mL
                      </span>
                      {item.gender && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#faf8f4] text-[#7c7156] border border-[#e7e2d4]/60">
                          {item.gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Price + Stock Status + Stock Stepper Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[#f0ece0] shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="font-serif font-bold text-sm sm:text-base text-[#1b1915] block leading-tight">
                      <PriceDisplay amount={item.price} symbol={currency} />
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider mt-0.5 ${
                        isLow
                          ? 'bg-[#fbf4e8] text-[#9c793c] border border-[#ecdccf]'
                          : 'bg-[#eef2ec] text-[#57795c] border border-[#d2dfcf]'
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Stepper Control: [-] stock [+] */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-0.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-full p-0.5 shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        decrementStock(item.id, 1);
                      }}
                      className="w-6 h-6 rounded-full bg-white hover:bg-[#efeadc] text-[#56534a] flex items-center justify-center transition-colors border border-[#e7e2d4] active:scale-90"
                      title="Decrease Stock"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold text-[#1b1915] px-1.5 min-w-[20px] text-center">
                      {item.stock}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addStock(item.id, 1);
                      }}
                      className="w-6 h-6 rounded-full bg-white hover:bg-[#efeadc] text-[#1b1915] flex items-center justify-center transition-colors border border-[#e7e2d4] active:scale-90"
                      title="Increase Stock"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View - Thinner */
        <div className="bg-white border border-[#e7e2d4] rounded-2xl divide-y divide-[#f0ece0] overflow-hidden shadow-xs">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setEditingItem(item)}
              className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#faf8f4] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#f2efe6] border border-[#e7e2d4]/70 flex items-center justify-center shrink-0 text-[#8c7a5b]">
                  <BottleOutlineIcon className="w-3.5 h-3.5 text-[#8c7a5b]" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-serif sm:font-sans font-bold text-sm text-[#1b1915] group-hover:text-[#7c7156] transition-colors truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold bg-[#f2efe6] text-[#56534a]">
                      {item.brand}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold bg-[#f2efe6] text-[#56534a]">
                      {item.size} mL
                    </span>
                    {item.gender && (
                      <span className="text-[10px] text-[#8c8878] font-medium">{item.gender}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                <div className="text-left sm:text-right">
                  <div className="font-serif font-bold text-sm text-[#1b1915]">
                    <PriceDisplay amount={item.price} symbol={currency} />
                  </div>
                  <div className="text-[10px] text-[#8c8878]">Barcode: {item.barcode}</div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-full p-0.5"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      decrementStock(item.id, 1);
                    }}
                    className="w-6 h-6 rounded-full bg-white text-[#56534a] flex items-center justify-center border border-[#e7e2d4] active:scale-90"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs font-bold text-[#1b1915] px-1.5 min-w-[18px] text-center">
                    {item.stock}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addStock(item.id, 1);
                    }}
                    className="w-6 h-6 rounded-full bg-white text-[#1b1915] flex items-center justify-center border border-[#e7e2d4] active:scale-90"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Admin-Only Delete Button in List View */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item);
                    }}
                    className="p-1.5 rounded-lg text-[#8c8878] hover:text-[#a05539] hover:bg-[#f8ede5] transition-colors"
                    title="Delete Fragrance (Admin Only)"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Delete Confirmation Modal */}
      {itemToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl p-6 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-[#f8ede5] text-[#a05539] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#1b1915]">
                Delete Fragrance?
              </h3>
              <p className="text-xs text-[#56534a]">
                Are you sure you want to remove <strong>{itemToDelete.name}</strong> from store inventory? This action is permanent.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 px-3 text-xs font-semibold border border-[#e7e2d4] rounded-xl hover:bg-[#f2efe6] text-[#1b1915] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = itemToDelete.id;
                  setItemToDelete(null);
                  await deleteItem(id);
                }}
                className="flex-1 py-2 px-3 text-xs font-semibold bg-[#a05539] hover:bg-[#85432b] text-white rounded-xl transition-colors shadow-xs"
              >
                Delete Fragrance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
