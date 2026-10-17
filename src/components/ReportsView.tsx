import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckSquare,
  Square,
  MapPin,
  Check,
  Save,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { formatCurrency } from '../utils/inventoryLogic.js';

export const ReportsView: React.FC = () => {
  const { items, updateItem, showToast } = useInventory();

  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    name: true,
    brand: true,
    size: true,
    stock: true,
    price: true,
    barcode: true,
    location: true,
  });

  const [fileFormat, setFileFormat] = useState<'pdf' | 'xlsx' | 'receipt'>('pdf');
  const [locationsState, setLocationsState] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    items.forEach((item) => {
      map[item.id] = item.location || '';
    });
    return map;
  });

  const toggleField = (key: string) => {
    if (key === 'name') return; // Name is always required
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveLocations = async () => {
    let changed = 0;
    for (const item of items) {
      const current = item.location || '';
      const updated = (locationsState[item.id] || '').trim();
      if (current !== updated) {
        await updateItem(item.id, { location: updated });
        changed++;
      }
    }
    showToast(changed ? `Updated ${changed} shelf locations` : 'No location changes detected');
  };

  const handleGenerateReport = () => {
    // Generate downloadable text / CSV / formatted report
    const header = Object.keys(selectedFields)
      .filter((k) => selectedFields[k])
      .map((k) => k.toUpperCase())
      .join('\t');

    const rows = items.map((i) => {
      const cells: string[] = [];
      if (selectedFields.name) cells.push(i.name);
      if (selectedFields.brand) cells.push(i.brand);
      if (selectedFields.size) cells.push(`${i.size} mL`);
      if (selectedFields.stock) cells.push(`${i.stock}`);
      if (selectedFields.price) cells.push(formatCurrency(i.price));
      if (selectedFields.barcode) cells.push(i.barcode);
      if (selectedFields.location) cells.push(i.location || '—');
      return cells.join('\t');
    });

    const content = `RETAIL INVENTORY REPORT - ${new Date().toLocaleDateString()}\nTotal SKUs: ${items.length}\n\n${header}\n${rows.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Report generated in ${fileFormat.toUpperCase()} format`);
  };

  return (
    <div className="space-y-6 max-w-3xl pb-16 md:pb-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#7c7156]">
          Export & Documentation
        </span>
        <h2 className="font-serif text-2xl font-bold text-[#242119]">
          Inventory Reports
        </h2>
      </div>

      {/* Report Generator Card */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <h3 className="font-serif text-base font-bold text-[#242119]">
          Include in Report
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { key: 'name', label: 'Item Name' },
            { key: 'barcode', label: 'Barcode Number' },
            { key: 'brand', label: 'Brand / Category' },
            { key: 'size', label: 'Size (mL)' },
            { key: 'stock', label: 'Stock Quantity' },
            { key: 'price', label: 'Retail Price (₱)' },
            { key: 'location', label: 'Shelf Location' },
          ].map((field) => (
            <button
              key={field.key}
              type="button"
              onClick={() => toggleField(field.key)}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-[#e7e2d4] text-xs font-semibold text-left transition-colors hover:bg-[#faf8f4]"
            >
              {selectedFields[field.key] ? (
                <CheckSquare className="w-4 h-4 text-[#7c7156]" />
              ) : (
                <Square className="w-4 h-4 text-[#c9c4b4]" />
              )}
              <span className={selectedFields[field.key] ? 'text-[#242119]' : 'text-[#8c8878]'}>
                {field.label}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] mb-1.5">
            File Format
          </label>
          <select
            value={fileFormat}
            onChange={(e) => setFileFormat(e.target.value as any)}
            className="w-full sm:w-64 px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-xs font-semibold text-[#242119]"
          >
            <option value="pdf">PDF Document (.pdf)</option>
            <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
            <option value="receipt">Stock Receipt (.txt / .pdf)</option>
          </select>
        </div>

        <button
          onClick={handleGenerateReport}
          className="w-full py-3 bg-[#242119] hover:bg-[#34302a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <Download className="w-4 h-4 text-[#9c8f6f]" />
          <span>Generate &amp; Download Report</span>
        </button>
      </div>

      {/* Edit Shelf Location Batch Table */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-[#242119]">
              Edit Shelf Locations
            </h3>
            <p className="text-xs text-[#8c8878]">
              Update aisle and row positions directly from the stock sheet.
            </p>
          </div>
          <button
            onClick={handleSaveLocations}
            className="px-3.5 py-1.5 bg-[#9c8f6f] hover:bg-[#7c7156] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>

        <div className="divide-y divide-[#f0ece0] max-h-96 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-[#242119] truncate">{item.name}</div>
                <div className="text-[11px] text-[#8c8878]">{item.brand} · {item.size} mL · {item.barcode}</div>
              </div>
              <input
                type="text"
                value={locationsState[item.id] ?? ''}
                onChange={(e) =>
                  setLocationsState((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                placeholder="e.g. Shelf A - Row 2"
                className="w-full sm:w-48 px-2.5 py-1.5 text-xs bg-[#faf8f4] border border-[#e7e2d4] rounded-lg text-[#242119] focus:outline-none focus:ring-1 focus:ring-[#9c8f6f]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
