import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  Camera,
  MapPin,
  Barcode,
  Package,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import type { InventoryItem } from '../types/inventory.js';
import { getStockStatus } from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const InventoryView: React.FC = () => {
  const {
    items,
    setActiveTab,
    setEditingItem,
    deleteItem,
    verifyPin,
    showToast,
    addStock,
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'stock-desc' | 'stock-asc' | 'price-desc' | 'price-asc'>('name-asc');
  const [showFilters, setShowFilters] = useState(false);

  // Quick stock addition dialog
  const [quickAddModalItem, setQuickAddModalItem] = useState<InventoryItem | null>(null);
  const [quickAddQty, setQuickAddQty] = useState<number>(1);

  // Pin verification dialog for deletion
  const [pinDialogItem, setPinDialogItem] = useState<InventoryItem | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Distinct filter options
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
          String(item.size).includes(query) ||
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
          case 'stock-asc':
            return a.stock - b.stock;
          case 'price-desc':
            return b.price - a.price;
          case 'price-asc':
            return a.price - b.price;
          default:
            return 0;
        }
      });
  }, [items, searchTerm, selectedBrand, selectedType, sortBy]);

  const handleDeleteConfirm = async () => {
    if (!pinDialogItem) return;
    const ok = await verifyPin(pinInput);
    if (!ok) {
      setPinError('Incorrect PIN. Default is 1234.');
      return;
    }
    await deleteItem(pinDialogItem.id);
    setPinDialogItem(null);
    setPinInput('');
    setPinError(null);
  };

  const handleQuickAddSubmit = async () => {
    if (!quickAddModalItem) return;
    await addStock(quickAddModalItem.id, quickAddQty);
    setQuickAddModalItem(null);
    setQuickAddQty(1);
  };

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* View Header (Notice: 'Showing X of Y products' is removed as requested) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#7c7156]">
            Catalog
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#242119]">
            Current Inventory
          </h2>
        </div>

        <button
          onClick={() => setActiveTab('scan')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242119] text-white text-xs font-semibold hover:bg-[#34302a] transition-all shadow-xs self-start sm:self-auto"
        >
          <Camera className="w-4 h-4 text-[#9c8f6f]" />
          <span>Scan Barcode</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8c8878] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by perfume, brand, size, or barcode..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#242119] placeholder-[#8c8878] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors ${
            showFilters || selectedBrand !== 'all' || selectedType !== 'all'
              ? 'bg-[#efeadc] border-[#9c8f6f] text-[#242119]'
              : 'bg-white border-[#e7e2d4] text-[#56534a] hover:bg-[#faf8f4]'
          }`}
          aria-label="Filter Options"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
      </div>

      {/* Expanded Filters Drawer */}
      {showFilters && (
        <div className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7c7156] mb-1">
              Brand
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-xs text-[#242119]"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === 'all' ? 'All Brands' : b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7c7156] mb-1">
              Fragrance Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-xs text-[#242119]"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Types' : t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7c7156] mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-xs text-[#242119]"
            >
              <option value="name-asc">Name (A – Z)</option>
              <option value="name-desc">Name (Z – A)</option>
              <option value="stock-desc">Stock (High – Low)</option>
              <option value="stock-asc">Stock (Low – High)</option>
              <option value="price-desc">Price (High – Low)</option>
              <option value="price-asc">Price (Low – High)</option>
            </select>
          </div>
        </div>
      )}

      {/* Inventory Item Cards */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white border border-[#e7e2d4] rounded-2xl space-y-3">
            <Package className="w-10 h-10 text-[#c9c4b4] mx-auto" />
            <h3 className="font-serif text-lg font-bold text-[#242119]">No perfumes found</h3>
            <p className="text-xs text-[#8c8878] max-w-sm mx-auto">
              No inventory items match your current filter. Try clearing your search, or scan a new barcode to add to inventory.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBrand('all');
                setSelectedType('all');
              }}
              className="px-4 py-2 text-xs font-semibold bg-[#f2efe6] hover:bg-[#efeadc] text-[#242119] rounded-lg border border-[#e7e2d4]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const status = getStockStatus(item.stock);

            return (
              <div
                key={item.id}
                className="p-4 bg-white border border-[#e7e2d4] hover:border-[#9c8f6f] rounded-xl transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-[#242119] truncate">
                      {item.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        status.tone === 'success'
                          ? 'bg-[#eef2ec] text-[#57795c]'
                          : status.tone === 'warn'
                          ? 'bg-[#f6f0e1] text-[#9c793c]'
                          : 'bg-[#f8ede5] text-[#a05539]'
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#56534a] flex-wrap">
                    <span className="font-semibold text-[#7c7156]">{item.brand}</span>
                    <span className="text-[#c9c4b4]">·</span>
                    <span className="px-2 py-0.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-md text-[11px] font-medium">
                      {item.size} mL
                    </span>
                    <span className="text-[#c9c4b4]">·</span>
                    <span>{item.type}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#8c8878] pt-0.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-[#f2efe6] px-2 py-0.5 rounded border border-[#e7e2d4] text-[#242119]">
                      <Barcode className="w-3 h-3 text-[#7c7156]" />
                      {item.barcode}
                    </span>
                    {item.location && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#56534a]">
                        <MapPin className="w-3 h-3 text-[#8c8878]" />
                        {item.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock & Quick Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#f0ece0]">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-bold font-sans text-[#242119]">
                      <PriceDisplay amount={item.price} pesoClassName="text-[0.68em] font-normal opacity-80" />
                    </div>
                    <div className="text-xs text-[#56534a]">
                      Stock: <strong className="text-[#242119] font-mono text-sm">{item.stock} pcs</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Pop-up trigger to add to this item's stock */}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAddModalItem(item);
                        setQuickAddQty(1);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#efeadc] hover:bg-[#e7e2d4] text-[#7c7156] font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                      title="Add stock to this item"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Stock</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      aria-label={`Edit ${item.name}`}
                      className="p-1.5 rounded-lg border border-[#e7e2d4] text-[#56534a] hover:bg-[#faf8f4] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPinDialogItem(item);
                        setPinInput('');
                        setPinError(null);
                      }}
                      aria-label={`Delete ${item.name}`}
                      className="p-1.5 rounded-lg border border-[#e7e2d4] text-[#a05539] hover:bg-[#f8ede5] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Add Stock Modal */}
      {quickAddModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-[#e7e2d4] p-5 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#242119]">
              Add to existing inventory?
            </h3>
            <div className="p-3 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs space-y-1">
              <div className="font-bold text-[#242119] text-sm">{quickAddModalItem.name}</div>
              <div className="text-[#56534a]">{quickAddModalItem.brand} · {quickAddModalItem.size} mL</div>
              <div className="text-[#57795c] font-semibold">Currently on shelf: {quickAddModalItem.stock} pcs</div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                Quantity to add:
              </label>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuickAddQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg border border-[#e7e2d4] flex items-center justify-center text-[#242119]"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quickAddQty}
                  onChange={(e) => setQuickAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 text-center py-1.5 text-lg font-bold font-mono border border-[#e7e2d4] rounded-lg text-[#242119]"
                />
                <button
                  type="button"
                  onClick={() => setQuickAddQty((q) => q + 1)}
                  className="w-9 h-9 rounded-lg border border-[#e7e2d4] flex items-center justify-center text-[#242119]"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickAddModalItem(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-[#e7e2d4] text-[#56534a]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddSubmit}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-[#242119] text-white hover:bg-[#34302a]"
              >
                Confirm Add Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal For Deletion */}
      {pinDialogItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-xs bg-white rounded-2xl border border-[#e7e2d4] p-5 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#242119]">
              Verify Deletion PIN
            </h3>
            <p className="text-xs text-[#56534a]">
              Enter your retail PIN to confirm removing <strong>{pinDialogItem.name}</strong>.
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest bg-[#faf8f4] border border-[#e7e2d4] rounded-lg text-[#242119]"
            />
            {pinError && <p className="text-xs text-[#a05539] font-medium">{pinError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPinDialogItem(null)}
                className="flex-1 py-2 text-xs font-semibold border border-[#e7e2d4] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-xs font-semibold bg-[#a05539] text-white rounded-lg hover:bg-[#85452d]"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
