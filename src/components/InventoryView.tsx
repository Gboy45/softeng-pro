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
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'stock-desc' | 'price-desc'>('name-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter options
  const brands = useMemo(() => ['all', ...Array.from(new Set(items.map((i) => i.brand))).sort()], [items]);
  const types = useMemo(() => ['all', ...Array.from(new Set(items.map((i) => i.type))).sort()], [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          !query ||
          item.name.toLowerCase().includes(query) ||
          item.brand.toLowerCase().includes(query) ||
          item.barcode.includes(query) ||
          (item.location && item.location.toLowerCase().includes(query));

        const matchesBrand = selectedBrand === 'all' || item.brand === selectedBrand;
        const matchesType = selectedType === 'all' || item.type === selectedType;

        return matchesQuery && matchesBrand && matchesType;
      })
      .sort((a, b) => {
        switch (sortBy) {
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
  }, [items, searchTerm, selectedBrand, selectedType, sortBy]);

  return (
    <div className="space-y-5 pb-20 md:pb-8">
      {/* Top Header Row matching Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c826e] block">
            BOUTIQUE STOCK
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1b1915] mt-1 tracking-tight">
            Perfume Inventory
          </h1>
          <p className="text-xs sm:text-sm text-[#56534a] mt-0.5">
            {filteredItems.length} of {items.length} total fragrance items displayed
          </p>
        </div>

        {/* Top Right: + Add Perfume Item Button */}
        <button
          onClick={() => setIsAddItemOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Perfume Item</span>
        </button>
      </div>

      {/* Search & Controls Bar matching Image 2 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8c826e]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by fragrance, house, barcode, or shelf..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] placeholder-[#8c8878] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs"
          />
        </div>

        {/* Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors shadow-2xs ${
            showFilters || selectedBrand !== 'all' || selectedType !== 'all'
              ? 'bg-[#efeadc] border-[#9c8f6f] text-[#1b1915]'
              : 'bg-white border-[#e7e2d4] text-[#56534a] hover:bg-[#faf8f4]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#8c826e]" />
          <span>Filters</span>
        </button>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs cursor-pointer"
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="stock-desc">Sort: Stock (High-Low)</option>
            <option value="price-desc">Sort: Price (High-Low)</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-[#8c826e] pointer-events-none" />
        </div>

        {/* Grid / List View Toggle */}
        <div className="hidden sm:flex items-center p-1 bg-white border border-[#e7e2d4] rounded-xl shadow-2xs">
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

      {/* Expanded Filter Drawer */}
      {showFilters && (
        <div className="p-4 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fadeIn">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e] mb-1">
              Filter by Brand / House
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915]"
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
              Filter by Concentration
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915]"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Concentrations' : t}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Fragrance Cards Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredItems.map((item) => {
            const status = getStockStatus(item.stock);
            const isLow = item.stock <= 5;

            return (
              <div
                key={item.id}
                onClick={() => setEditingItem(item)}
                className="bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between cursor-pointer group active:scale-[0.99]"
              >
                {/* Top: Brand in Caps + Status Badge + Admin Delete Button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c826e] group-hover:text-[#7c7156] transition-colors">
                      {item.brand}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isLow
                            ? 'bg-[#fbf4e8] text-[#9c793c] border border-[#ecdccf]'
                            : 'bg-[#eef2ec] text-[#57795c] border border-[#d2dfcf]'
                        }`}
                      >
                        {status.label}
                      </span>

                      {/* Admin-Only Delete Button */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          className="p-1 rounded-lg text-[#8c8878] hover:text-[#a05539] hover:bg-[#f8ede5] transition-colors"
                          title="Delete Fragrance (Admin Only)"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Classification */}
                  <h3 className="font-serif text-lg font-bold text-[#1b1915] leading-snug group-hover:text-[#7c7156] transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#56534a]">
                    {item.type} · {item.gender} · {item.size}ml
                  </p>

                  {/* Location Tag */}
                  <div className="flex items-center gap-1 text-[11px] text-[#8c8878] pt-1">
                    <MapPin className="w-3 h-3 text-[#8c826e]" />
                    <span>{item.location || 'Boutique Shelf'}</span>
                  </div>
                </div>

                {/* Bottom Row: PRICE on left, Stepper [-] stock [+] on right */}
                <div className="pt-3 border-t border-[#f0ece0] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c826e] block">
                      PRICE
                    </span>
                    <div className="font-serif text-base font-bold text-[#1b1915] mt-0.5">
                      <PriceDisplay amount={item.price} symbol={currency} />
                    </div>
                  </div>

                  {/* Stepper Control: [-] stock [+] */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-full p-1 shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        decrementStock(item.id, 1);
                      }}
                      className="w-6 h-6 rounded-full bg-white hover:bg-[#efeadc] text-[#56534a] flex items-center justify-center transition-colors border border-[#e7e2d4] active:scale-95"
                      title="Decrease Stock"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold text-[#1b1915] px-2 min-w-[20px] text-center">
                      {item.stock}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addStock(item.id, 1);
                      }}
                      className="w-6 h-6 rounded-full bg-white hover:bg-[#efeadc] text-[#1b1915] flex items-center justify-center transition-colors border border-[#e7e2d4] active:scale-95"
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
        /* List View */
        <div className="bg-white border border-[#e7e2d4] rounded-2xl divide-y divide-[#f0ece0] overflow-hidden shadow-xs">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setEditingItem(item)}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#faf8f4] transition-colors cursor-pointer group"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8878] group-hover:text-[#7c7156] transition-colors">
                  {item.brand}
                </span>
                <h4 className="font-serif font-bold text-sm text-[#1b1915] group-hover:text-[#7c7156] transition-colors">
                  {item.name}
                </h4>
                <div className="text-xs text-[#56534a]">
                  {item.type} · {item.gender} · {item.size}ml · {item.location}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-serif font-bold text-sm text-[#1b1915]">
                    <PriceDisplay amount={item.price} symbol={currency} />
                  </div>
                  <div className="text-[11px] text-[#8c8878]">Barcode: {item.barcode}</div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-full p-1"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      decrementStock(item.id, 1);
                    }}
                    className="w-6 h-6 rounded-full bg-white text-[#56534a] flex items-center justify-center border border-[#e7e2d4]"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs font-bold text-[#1b1915] px-2 min-w-[20px] text-center">
                    {item.stock}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addStock(item.id, 1);
                    }}
                    className="w-6 h-6 rounded-full bg-white text-[#1b1915] flex items-center justify-center border border-[#e7e2d4]"
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
