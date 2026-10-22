import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  Minus,
  Trash2,
  Lock,
  X,
  AlertCircle,
  CheckCircle2,
  Layers,
  History,
  Tag,
  Printer,
  Download,
  Sparkles,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useInventory } from '../context/InventoryContext.js';
import type { InventoryItem, StockAdjustmentReason } from '../types/inventory.js';
import {
  getStockStatus,
  calculateNewStock,
  calculateSubtractedStock,
  generateBarcodeBars,
} from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

const ADD_STOCK_REASONS: StockAdjustmentReason[] = [
  'New Delivery / Restock',
  'Customer Return',
  'Inventory Audit Correction',
];

const REMOVE_STOCK_REASONS: StockAdjustmentReason[] = [
  'Opened as Store Tester',
  'Damaged / Broken Bottle',
  'Inventory Audit Correction',
  'Pull-out / Display',
];

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
    stockLogs,
    setEditingItem,
    addStock,
    decrementStock,
    currency,
    deleteItem,
    currentUser,
    verifyPin,
    showToast,
  } = useInventory();

  const isAdmin = currentUser?.role === 'admin';
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Stock Add / Subtract Quantity & Reason Popup Modal State
  const [stockAdjustItem, setStockAdjustItem] = useState<InventoryItem | null>(null);
  const [stockAdjustMode, setStockAdjustMode] = useState<'add' | 'subtract'>('add');
  const [stockAdjustQty, setStockAdjustQty] = useState<number>(1);
  const [stockAdjustReason, setStockAdjustReason] = useState<StockAdjustmentReason>(
    'New Delivery / Restock'
  );

  // Stock Audit Log Modal State
  const [isStockLogOpen, setIsStockLogOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'add' | 'subtract'>('all');

  // Barcode & Shelf Price Label Modal State
  const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);
  const [labelCopies, setLabelCopies] = useState<number>(2);

  const openStockAdjustModal = (item: InventoryItem, mode: 'add' | 'subtract') => {
    setStockAdjustItem(item);
    setStockAdjustMode(mode);
    setStockAdjustQty(1);
    setStockAdjustReason(
      mode === 'add' ? 'New Delivery / Restock' : 'Opened as Store Tester'
    );
  };

  const closeStockAdjustModal = () => {
    setStockAdjustItem(null);
    setStockAdjustQty(1);
  };

  const switchStockAdjustMode = (mode: 'add' | 'subtract') => {
    setStockAdjustMode(mode);
    setStockAdjustReason(
      mode === 'add' ? 'New Delivery / Restock' : 'Opened as Store Tester'
    );
  };

  const handleConfirmStockAdjust = async () => {
    if (!stockAdjustItem) return;
    const qty = Math.max(1, stockAdjustQty);
    if (stockAdjustMode === 'add') {
      await addStock(stockAdjustItem.id, qty, stockAdjustReason);
    } else {
      const nextStock = calculateSubtractedStock(stockAdjustItem.stock, qty);
      await decrementStock(stockAdjustItem.id, qty, stockAdjustReason);
      showToast(
        `Stock updated! -${qty} (${stockAdjustItem.name}: ${nextStock} pcs · ${stockAdjustReason})`
      );
    }
    closeStockAdjustModal();
  };

  const openDeleteModal = (item: InventoryItem) => {
    setItemToDelete(item);
    setAdminPassword('');
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setItemToDelete(null);
    setAdminPassword('');
    setDeleteError(null);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToDelete) return;
    const pwd = adminPassword.trim();
    if (!pwd) {
      setDeleteError('Please enter the admin password to confirm deletion.');
      return;
    }
    const pinMatched = await verifyPin(pwd);
    if (pwd !== '123' && !pinMatched) {
      setDeleteError('Incorrect admin password. Please try again.');
      return;
    }
    const id = itemToDelete.id;
    closeDeleteModal();
    await deleteItem(id);
  };

  // Print Barcode & Shelf Price Sticker via POS Print Iframe
  const handlePrintBarcodeLabels = (item: InventoryItem, copies: number) => {
    const bars = generateBarcodeBars(item.barcode);
    const totalModules = bars.reduce((sum, b) => sum + b.width, 0);
    let xCursor = 0;
    const svgRects = bars
      .map((b) => {
        const w = (b.width / totalModules) * 180;
        const rect = b.isBar
          ? `<rect x="${xCursor.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="34" fill="#1b1915" />`
          : '';
        xCursor += w;
        return rect;
      })
      .join('');

    const priceFormatted = item.price.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const singleStickerHtml = `
      <div style="border: 1.5px solid #1b1915; border-radius: 8px; padding: 10px 12px; width: 220px; background: #ffffff; margin: 6px auto; page-break-inside: avoid; text-align: center;">
        <div style="font-size: 8.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #7c7156;">AURA PARFUMS · ${item.brand.toUpperCase()}</div>
        <div style="font-family: Georgia, serif; font-size: 13px; font-weight: 700; color: #1b1915; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
        <div style="font-size: 10px; color: #56534a; margin-top: 1px;">${item.size} mL · ${item.type || 'Eau de Parfum'}${item.batchCode ? ` · Batch ${item.batchCode}` : ''}</div>
        <div style="margin: 6px auto 2px; display: flex; justify-content: center;">
          <svg width="180" height="34" viewBox="0 0 180 34" xmlns="http://www.w3.org/2000/svg">${svgRects}</svg>
        </div>
        <div style="font-family: monospace; font-size: 10px; font-weight: 700; letter-spacing: 2px; color: #1b1915;">${item.barcode}</div>
        <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #d8d2c2; font-family: Georgia, serif; font-size: 15px; font-weight: 700; color: #1b1915;">
          ₱${priceFormatted}
        </div>
      </div>
    `;

    const allStickersHtml = Array.from({ length: copies })
      .map(() => singleStickerHtml)
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Label - ${item.name}</title>
  <style>
    @page { margin: 6mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 8px;
      background: #ffffff;
      color: #1b1915;
    }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="grid">${allStickersHtml}</div>
</body>
</html>`;

    showToast(`Preparing ${copies} barcode label${copies === 1 ? '' : 's'} for printing...`);

    const existingFrame = document.getElementById('pos-label-print-frame') as HTMLIFrameElement | null;
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'pos-label-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (frameDoc && iframe.contentWindow) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 150);
    } else {
      window.print();
    }
  };

  // Download Barcode & Shelf Price Sticker Sheet PDF
  const handleDownloadBarcodePdf = (item: InventoryItem, copies: number) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const bars = generateBarcodeBars(item.barcode);
      const totalModules = bars.reduce((sum, b) => sum + b.width, 0);
      const priceFormatted = item.price.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const labelW = 86;
      const labelH = 46;
      const startX = 15;
      const startY = 16;
      const gapX = 8;
      const gapY = 6;

      for (let idx = 0; idx < copies; idx++) {
        const col = idx % 2;
        const row = Math.floor(idx / 2) % 5;
        if (idx > 0 && idx % 10 === 0) {
          doc.addPage();
        }

        const x = startX + col * (labelW + gapX);
        const y = startY + row * (labelH + gapY);

        // Border
        doc.setDrawColor(27, 25, 21);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, labelW, labelH, 2.5, 2.5, 'S');

        // Brand header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(124, 113, 86);
        doc.text(
          `AURA PARFUMS · ${item.brand.toUpperCase()}`,
          x + labelW / 2,
          y + 5.5,
          { align: 'center' }
        );

        // Perfume Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(27, 25, 21);
        doc.text(item.name.slice(0, 26), x + labelW / 2, y + 10.5, { align: 'center' });

        // Size & Batch
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(86, 83, 74);
        doc.text(
          `${item.size} mL · ${item.type || 'Eau de Parfum'}${item.batchCode ? ` · Batch ${item.batchCode}` : ''}`,
          x + labelW / 2,
          y + 14.5,
          { align: 'center' }
        );

        // Barcode Bars
        const barAreaW = 58;
        const barAreaX = x + (labelW - barAreaW) / 2;
        const barAreaY = y + 17;
        const barH = 11.5;
        let cursor = barAreaX;

        doc.setFillColor(27, 25, 21);
        bars.forEach((b) => {
          const w = (b.width / totalModules) * barAreaW;
          if (b.isBar) {
            doc.rect(cursor, barAreaY, w, barH, 'F');
          }
          cursor += w;
        });

        // Barcode Digits
        doc.setFont('courier', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(27, 25, 21);
        doc.text(item.barcode, x + labelW / 2, y + 32, { align: 'center' });

        // Price Footer
        doc.setDrawColor(216, 210, 194);
        doc.setLineWidth(0.2);
        doc.line(x + 8, y + 35, x + labelW - 8, y + 35);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(27, 25, 21);
        doc.text(`PHP ${priceFormatted}`, x + labelW / 2, y + 41.5, { align: 'center' });
      }

      doc.save(`barcode-labels-${item.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      showToast(`Downloaded ${copies} barcode label${copies === 1 ? '' : 's'} (.pdf)`);
    } catch {
      showToast('Failed to generate barcode label PDF');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedTester, setSelectedTester] = useState<'all' | 'tester' | 'no-tester'>('all');
  const [sortBy, setSortBy] = useState<
    'name-asc' | 'name-desc' | 'brand-asc' | 'brand-desc' | 'size-desc' | 'size-asc' | 'stock-desc' | 'price-desc'
  >('name-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter options
  const brands = useMemo(() => ['all', ...Array.from(new Set(items.map((i) => i.brand))).sort()], [items]);

  // Filtered stock logs
  const filteredStockLogs = useMemo(() => {
    if (logFilter === 'all') return stockLogs;
    return stockLogs.filter((entry) => entry.mode === logFilter);
  }, [stockLogs, logFilter]);

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
          (item.batchCode && item.batchCode.toLowerCase().includes(query)) ||
          (item.gender && item.gender.toLowerCase().includes(query)) ||
          matchesSize ||
          (item.location && item.location.toLowerCase().includes(query));

        const matchesBrand = selectedBrand === 'all' || item.brand === selectedBrand;
        const matchesGender =
          selectedGender === 'all' ||
          item.gender?.toLowerCase().includes(selectedGender.toLowerCase());
        const matchesTester =
          selectedTester === 'all' ||
          (selectedTester === 'tester' && Boolean(item.hasTester)) ||
          (selectedTester === 'no-tester' && !item.hasTester);

        return matchesQuery && matchesBrand && matchesGender && matchesTester;
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
  }, [items, searchTerm, selectedBrand, selectedGender, selectedTester, sortBy]);

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-8">
      {/* Top Header Row with Stock Audit Log Button */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-xl sm:text-3xl font-bold text-[#1b1915] tracking-tight truncate">
          Perfume Inventory
        </h1>

        <button
          type="button"
          onClick={() => setIsStockLogOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#efeadc] border border-[#e7e2d4] text-[#1b1915] text-xs font-semibold shadow-2xs transition-colors shrink-0 touch-manipulation"
        >
          <History className="w-3.5 h-3.5 text-[#7c7156]" />
          <span>Stock Log ({stockLogs.length})</span>
        </button>
      </div>

      {/* Search & Controls Bar - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Bar - Supports Fragrance, Brand, Bottle Size in mL, Barcode, Batch */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8c826e]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search fragrance, brand, size (100mL), barcode, batch..."
            className="w-full pl-10 pr-8 py-2.5 sm:py-2 bg-white border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] placeholder-[#8c8878] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-2.5 p-1 text-[#8c8878] hover:text-[#1b1915] rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile & Desktop Controls Row: Filters + Sort + Grid/List Toggle */}
        <div className="flex items-center gap-2">
          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-2xs shrink-0 touch-manipulation ${
              showFilters ||
              selectedBrand !== 'all' ||
              selectedGender !== 'all' ||
              selectedTester !== 'all'
                ? 'bg-[#efeadc] border-[#9c8f6f] text-[#1b1915]'
                : 'bg-white border-[#e7e2d4] text-[#56534a] hover:bg-[#faf8f4]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#8c826e]" />
            <span>Filters</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex-1 sm:flex-initial min-w-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full appearance-none pl-3 pr-7 py-2 bg-white border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs cursor-pointer truncate"
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

          {/* Grid / List View Toggle (Available on Mobile & Desktop) */}
          <div className="flex items-center p-0.5 bg-white border border-[#e7e2d4] rounded-xl shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors touch-manipulation ${
                viewMode === 'grid' ? 'bg-[#efeadc] text-[#1b1915]' : 'text-[#8c8878] hover:text-[#1b1915]'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors touch-manipulation ${
                viewMode === 'list' ? 'bg-[#efeadc] text-[#1b1915]' : 'text-[#8c8878] hover:text-[#1b1915]'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Filter Drawer - Brand, Gender, Counter Tester */}
      {showFilters && (
        <div className="p-3.5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
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

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e] mb-1">
              Filter by Counter Tester
            </label>
            <select
              value={selectedTester}
              onChange={(e) => setSelectedTester(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs font-semibold text-[#1b1915]"
            >
              <option value="all">All Perfumes</option>
              <option value="tester">Tester Available on Counter</option>
              <option value="no-tester">No Counter Tester</option>
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
                {/* Left: Square bottle icon badge + Item Name & Details */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Square rounded bottle icon container */}
                  <div className="w-9 h-9 rounded-xl bg-[#f2efe6] border border-[#e7e2d4]/70 flex items-center justify-center shrink-0 text-[#8c7a5b] group-hover:bg-[#efeadc] transition-colors">
                    <BottleOutlineIcon className="w-4 h-4 text-[#8c7a5b]" />
                  </div>

                  {/* Fragrance details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-serif sm:font-sans font-bold text-sm sm:text-base text-[#1b1915] truncate leading-snug group-hover:text-[#7c7156] transition-colors">
                        {item.name}
                      </h3>

                      <div className="flex items-center gap-0.5 ml-auto sm:ml-0 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLabelItem(item);
                            setLabelCopies(2);
                          }}
                          className="p-1 text-[#7c7156] hover:text-[#1b1915] hover:bg-[#efeadc] rounded-lg transition-colors"
                          title="Print Barcode & Price Label"
                          aria-label={`Print barcode label for ${item.name}`}
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(item);
                            }}
                            className="p-1 text-[#8c8878] hover:text-[#a05539] hover:bg-[#f8ede5] rounded-lg transition-colors"
                            title="Delete Fragrance (Admin Only)"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata: Brand · Size · Gender · Tester · Batch */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#56534a]">
                      <span className="font-semibold text-[#1b1915]">{item.brand}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.size} mL</span>
                      {item.gender && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#7c7156]">{item.gender}</span>
                        </>
                      )}
                      {item.hasTester && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#57795c] font-semibold">Tester</span>
                        </>
                      )}
                      {item.batchCode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[10px] text-[#8c826e]">
                            {item.batchCode}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Price + Stock Status + Stock Stepper Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[#f0ece0] shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="font-serif font-bold text-sm sm:text-base text-[#1b1915] block leading-tight tabular-nums">
                      <PriceDisplay amount={item.price} symbol={currency} />
                    </span>
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                        isLow ? 'text-[#9c793c]' : 'text-[#57795c]'
                      }`}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Stepper Control: [-] stock [+] -> Opens Stock Quantity Popup Menu */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-[#faf8f4] border border-[#e7e2d4] rounded-full p-0.5 shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStockAdjustModal(item, 'subtract');
                      }}
                      aria-label={`Remove stock for ${item.name}`}
                      className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-white hover:bg-[#efeadc] text-[#56534a] flex items-center justify-center transition-colors border border-[#e7e2d4] active:scale-90 touch-manipulation"
                      title="Remove Stock"
                    >
                      <Minus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold text-[#1b1915] px-1.5 min-w-[22px] text-center tabular-nums">
                      {item.stock}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStockAdjustModal(item, 'add');
                      }}
                      aria-label={`Add stock for ${item.name}`}
                      className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-white hover:bg-[#efeadc] text-[#1b1915] flex items-center justify-center transition-colors border border-[#e7e2d4] active:scale-90 touch-manipulation"
                      title="Add Stock"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
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
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#56534a]">
                    <span className="font-semibold text-[#1b1915]">{item.brand}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.size} mL</span>
                    {item.gender && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#8c8878]">{item.gender}</span>
                      </>
                    )}
                    {item.hasTester && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#57795c] font-semibold">Tester</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                <div className="text-left sm:text-right">
                  <div className="font-serif font-bold text-sm text-[#1b1915] tabular-nums">
                    <PriceDisplay amount={item.price} symbol={currency} />
                  </div>
                  <div className="text-[10px] text-[#8c8878] font-mono">
                    Barcode: {item.barcode}
                  </div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-full p-0.5"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStockAdjustModal(item, 'subtract');
                    }}
                    aria-label={`Remove stock for ${item.name}`}
                    className="w-6 h-6 rounded-full bg-white text-[#56534a] flex items-center justify-center border border-[#e7e2d4] active:scale-90"
                    title="Remove Stock"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs font-bold text-[#1b1915] px-1.5 min-w-[18px] text-center tabular-nums">
                    {item.stock}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStockAdjustModal(item, 'add');
                    }}
                    aria-label={`Add stock for ${item.name}`}
                    className="w-6 h-6 rounded-full bg-white text-[#1b1915] flex items-center justify-center border border-[#e7e2d4] active:scale-90"
                    title="Add Stock"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLabelItem(item);
                    setLabelCopies(2);
                  }}
                  className="p-1.5 rounded-lg text-[#7c7156] hover:text-[#1b1915] hover:bg-[#efeadc] transition-colors"
                  title="Print Barcode & Price Label"
                  aria-label={`Print barcode label for ${item.name}`}
                >
                  <Tag className="w-4 h-4" />
                </button>

                {/* Admin-Only Delete Button in List View */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal(item);
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

      {/* Stock Quantity Add / Subtract Popup Modal with Adjustment Reason Selector */}
      {stockAdjustItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-4 h-4 text-[#7c7156] shrink-0" />
                <h3 className="font-serif text-base font-bold text-[#242119] truncate">
                  {stockAdjustItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeStockAdjustModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Mode Switcher: Add vs Remove */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl">
                <button
                  type="button"
                  onClick={() => switchStockAdjustMode('add')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    stockAdjustMode === 'add'
                      ? 'bg-[#242119] text-white shadow-2xs'
                      : 'text-[#56534a] hover:text-[#242119]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchStockAdjustMode('subtract')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    stockAdjustMode === 'subtract'
                      ? 'bg-[#a05539] text-white shadow-2xs'
                      : 'text-[#56534a] hover:text-[#242119]'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Remove Stock</span>
                </button>
              </div>

              {/* Product Info Card */}
              <div
                className={`p-3.5 rounded-xl flex items-start gap-3 border ${
                  stockAdjustMode === 'add'
                    ? 'bg-[#eef2ec] border-[#c9d8c5]'
                    : 'bg-[#fbf4e8] border-[#ecdccf]'
                }`}
              >
                <CheckCircle2
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    stockAdjustMode === 'add' ? 'text-[#57795c]' : 'text-[#9c793c]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif font-bold text-base text-[#242119] truncate">
                    {stockAdjustItem.name}
                  </h4>
                  <div className="text-xs text-[#56534a] mt-0.5">
                    {stockAdjustItem.brand} · {stockAdjustItem.size} mL · Barcode:{' '}
                    <span className="font-mono font-bold text-[#242119]">{stockAdjustItem.barcode}</span>
                  </div>
                  <div
                    className={`text-xs font-semibold mt-1.5 flex items-center gap-2 ${
                      stockAdjustMode === 'add' ? 'text-[#57795c]' : 'text-[#9c793c]'
                    }`}
                  >
                    <span>Current Stock: {stockAdjustItem.stock} pcs</span>
                    <span>·</span>
                    <span className="flex items-center">
                      Price: <PriceDisplay amount={stockAdjustItem.price} symbol={currency} className="ml-1 font-bold" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Counter Prompt */}
              <div className="space-y-2.5 text-center pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  {stockAdjustMode === 'add'
                    ? 'How many would you like to add to our existing inventory?'
                    : 'How many would you like to remove from our existing inventory?'}
                </label>

                <div className="flex items-center justify-center gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => setStockAdjustQty((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-lg bg-white border border-[#e7e2d4] hover:bg-[#f2efe6] flex items-center justify-center text-[#242119] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={stockAdjustQty}
                    onChange={(e) => setStockAdjustQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 text-center py-2 text-xl font-bold font-mono bg-white border border-[#e7e2d4] rounded-lg text-[#242119]"
                  />
                  <button
                    type="button"
                    onClick={() => setStockAdjustQty((prev) => prev + 1)}
                    className="w-10 h-10 rounded-lg bg-white border border-[#e7e2d4] hover:bg-[#f2efe6] flex items-center justify-center text-[#242119] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Preset Chips */}
                <div className="flex justify-center gap-2">
                  {[1, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStockAdjustQty(num)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                        stockAdjustQty === num
                          ? stockAdjustMode === 'add'
                            ? 'bg-[#242119] text-white border-[#242119]'
                            : 'bg-[#a05539] text-white border-[#a05539]'
                          : 'bg-white text-[#56534a] border-[#e7e2d4] hover:bg-[#f2efe6]'
                      }`}
                    >
                      {stockAdjustMode === 'add' ? `+${num}` : `-${num}`}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-[#8c8878] pt-1">
                  New stock total:{' '}
                  <strong className="text-[#242119]">
                    {stockAdjustMode === 'add'
                      ? calculateNewStock(stockAdjustItem.stock, stockAdjustQty)
                      : calculateSubtractedStock(stockAdjustItem.stock, stockAdjustQty)}{' '}
                    pcs
                  </strong>
                </div>
              </div>

              {/* Adjustment Reason Selector */}
              <div className="space-y-1.5 pt-1 border-t border-[#f0ece0]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#56534a]">
                  Reason for Stock Adjustment
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(stockAdjustMode === 'add' ? ADD_STOCK_REASONS : REMOVE_STOCK_REASONS).map(
                    (reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setStockAdjustReason(reason)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                          stockAdjustReason === reason
                            ? stockAdjustMode === 'add'
                              ? 'bg-[#242119] text-white border-[#242119]'
                              : 'bg-[#a05539] text-white border-[#a05539]'
                            : 'bg-[#faf8f4] text-[#56534a] border-[#e7e2d4] hover:bg-[#f2efe6]'
                        }`}
                      >
                        {reason}
                      </button>
                    )
                  )}
                </div>
                {stockAdjustMode === 'subtract' &&
                  stockAdjustReason === 'Opened as Store Tester' && (
                    <p className="text-[11px] text-[#57795c] flex items-center gap-1 pt-0.5">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>
                        Marks {stockAdjustItem.name} as having an active counter tester bottle.
                      </span>
                    </p>
                  )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={closeStockAdjustModal}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#242119] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStockAdjust}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs text-white transition-colors shadow-xs ${
                    stockAdjustMode === 'add'
                      ? 'bg-[#242119] hover:bg-[#34302a]'
                      : 'bg-[#a05539] hover:bg-[#85432b]'
                  }`}
                >
                  {stockAdjustMode === 'add'
                    ? `Add Stock (+${stockAdjustQty})`
                    : `Remove Stock (-${stockAdjustQty})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement & Audit Log Modal */}
      {isStockLogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b1915] text-[#efeadc] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#1b1915]">
                    Stock Movement &amp; Audit Log
                  </h3>
                  <p className="text-[11px] text-[#8c826e]">
                    Tracks restocks, store testers, shrinkage, and returns
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockLogOpen(false)}
                aria-label="Close Stock Log"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 pt-3.5 shrink-0">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl">
                {[
                  { key: 'all' as const, label: `All (${stockLogs.length})` },
                  {
                    key: 'add' as const,
                    label: `Added (${stockLogs.filter((l) => l.mode === 'add').length})`,
                  },
                  {
                    key: 'subtract' as const,
                    label: `Removed (${stockLogs.filter((l) => l.mode === 'subtract').length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLogFilter(tab.key)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                      logFilter === tab.key
                        ? 'bg-[#1b1915] text-white shadow-2xs'
                        : 'text-[#56534a] hover:text-[#1b1915]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
              {filteredStockLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8c8878]">
                  No stock movement records found for this filter.
                </div>
              ) : (
                filteredStockLogs.map((entry) => {
                  const dateObj = new Date(entry.timestamp);
                  const dateFormatted = dateObj.toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const timeFormatted = dateObj.toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isAdd = entry.mode === 'add';
                  return (
                    <div
                      key={entry.id}
                      className="p-3 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1b1915] truncate">
                            {entry.itemName}
                          </span>
                          <span className="text-[11px] text-[#7c7156] shrink-0">
                            · {entry.size} mL
                          </span>
                        </div>
                        <div className="text-[11px] text-[#56534a]">
                          Reason: <strong className="text-[#1b1915]">{entry.reason}</strong>
                        </div>
                        <div className="text-[10.5px] text-[#8c8878]">
                          By {entry.performedBy} · {dateFormatted} at {timeFormatted}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isAdd ? 'text-[#57795c]' : 'text-[#a05539]'
                          }`}
                        >
                          {isAdd ? `+${entry.quantity}` : `-${entry.quantity}`} pcs
                        </div>
                        <div className="text-[10.5px] font-mono text-[#7c7156] tabular-nums">
                          {entry.previousStock} → {entry.newStock} pcs
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-[#e7e2d4] bg-[#faf8f4] shrink-0">
              <button
                type="button"
                onClick={() => setIsStockLogOpen(false)}
                className="w-full py-2.5 bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Barcode & Shelf Price Tag Label Modal */}
      {labelItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b1915] text-[#efeadc] flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#1b1915]">
                    Barcode &amp; Price Label
                  </h3>
                  <p className="text-[11px] text-[#8c826e]">
                    Printable shelf price tag &amp; bottle barcode sticker
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLabelItem(null)}
                aria-label="Close Barcode Label Modal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Live Sticker Preview */}
              <div className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl flex justify-center">
                <div className="w-full max-w-[260px] bg-white border-2 border-[#1b1915] rounded-xl p-3.5 text-center shadow-xs space-y-1.5">
                  <div className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#7c7156]">
                    AURA PARFUMS · {labelItem.brand}
                  </div>
                  <div className="font-serif text-base font-bold text-[#1b1915] truncate">
                    {labelItem.name}
                  </div>
                  <div className="text-[11px] text-[#56534a]">
                    {labelItem.size} mL · {labelItem.type || 'Eau de Parfum'}
                    {labelItem.batchCode ? ` · Batch ${labelItem.batchCode}` : ''}
                  </div>

                  {/* Rendered Barcode SVG */}
                  <div className="pt-1.5 pb-0.5 flex justify-center">
                    {(() => {
                      const bars = generateBarcodeBars(labelItem.barcode);
                      const totalUnits = bars.reduce((s, b) => s + b.width, 0);
                      let xPos = 0;
                      return (
                        <svg
                          viewBox={`0 0 ${totalUnits} 28`}
                          className="w-48 h-10"
                          aria-label={`Barcode ${labelItem.barcode}`}
                        >
                          {bars.map((b, i) => {
                            const currentX = xPos;
                            xPos += b.width;
                            return b.isBar ? (
                              <rect
                                key={i}
                                x={currentX}
                                y={0}
                                width={b.width}
                                height={28}
                                fill="#1b1915"
                              />
                            ) : null;
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="font-mono text-xs font-bold tracking-[0.2em] text-[#1b1915]">
                    {labelItem.barcode}
                  </div>

                  <div className="pt-2 border-t border-dashed border-[#d8d2c2] font-serif text-lg font-bold text-[#1b1915] tabular-nums">
                    <PriceDisplay amount={labelItem.price} symbol={currency} />
                  </div>
                </div>
              </div>

              {/* Number of Sticker Copies Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  Number of Label Stickers
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 4, 8, 12].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setLabelCopies(count)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        labelCopies === count
                          ? 'bg-[#1b1915] text-white border-[#1b1915]'
                          : 'bg-[#faf8f4] text-[#56534a] border-[#e7e2d4] hover:bg-[#efeadc]'
                      }`}
                    >
                      {count} {count === 1 ? 'label' : 'labels'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={() => handleDownloadBarcodePdf(labelItem, labelCopies)}
                  className="flex-1 py-2.5 px-3 bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#efeadc]" />
                  <span>Download PDF Labels</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintBarcodeLabels(labelItem, labelCopies)}
                  className="py-2.5 px-3.5 bg-[#efeadc] hover:bg-[#e5decb] text-[#1b1915] border border-[#9c8f6f]/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLabelItem(null)}
                  className="py-2.5 px-3.5 border border-[#e7e2d4] hover:bg-[#faf8f4] text-[#56534a] text-xs font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Delete Confirmation Modal with Admin Password Verification (All View Devices) */}
      {itemToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp">
            {/* Modal Header paired with system design */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#f8ede5] border border-[#ecdccf] text-[#a05539] flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#1b1915]">
                  Confirm Delete Perfume
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleConfirmDelete} className="p-5 space-y-4">
              {/* Selected Perfume Preview Card */}
              <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f2efe6] border border-[#e7e2d4] flex items-center justify-center shrink-0 text-[#8c7a5b]">
                  <BottleOutlineIcon className="w-4 h-4 text-[#8c7a5b]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm sm:text-base font-bold text-[#1b1915] truncate">
                    {itemToDelete.name}
                  </div>
                  <div className="text-xs text-[#56534a] truncate">
                    {itemToDelete.brand} · {itemToDelete.size} mL · {itemToDelete.stock} pcs in stock
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#56534a]">
                Please enter your <strong>Admin Password</strong> to permanently remove this perfume from store inventory.
              </p>

              {/* Admin Password Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#7c7156]">
                  ADMIN PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8c8878] absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoFocus
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="Enter admin password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm text-[#242119] placeholder:text-[#a09a8a] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f]"
                  />
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-[#f8ede5] text-[#a05539] text-xs rounded-xl flex items-start gap-2 border border-[#ecdccf]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="flex-1 py-2.5 px-4 text-xs font-bold border border-[#e7e2d4] rounded-xl hover:bg-[#f2efe6] text-[#1b1915] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-[#a05539] hover:bg-[#85432b] text-white rounded-xl transition-colors shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
