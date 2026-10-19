import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckSquare,
  Square,
  MapPin,
  Check,
  Save,
  FileSpreadsheet,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext.js';
import { formatCurrency } from '../utils/inventoryLogic.js';

export const ReportsView: React.FC = () => {
  const { items, updateItem, showToast, currency } = useInventory();

  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    name: true,
    brand: true,
    size: true,
    stock: true,
    price: true,
    barcode: true,
    location: true,
  });

  const [fileFormat, setFileFormat] = useState<'pdf' | 'xlsx'>('pdf');
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

  // Helper to render crisp, native Philippine Peso symbol on a high-res canvas
  const createPesoIconDataUrl = (textColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      ctx.font = 'bold 46px "Segoe UI", "Noto Sans", sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₱', 32, 34);
    }
    return canvas.toDataURL('image/png');
  };

  const handleGenerateReport = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const totalUnits = items.reduce((s, i) => s + i.stock, 0);
    const totalValuation = items.reduce((s, i) => s + i.price * i.stock, 0);

    if (fileFormat === 'pdf') {
      // 1. GENERATE AUTHENTIC PDF DOCUMENT WITH CRISP PESO SIGN (NO ± ENCODING BUGS)
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const whitePesoIcon = createPesoIconDataUrl('#efeadc');
        const darkPesoIcon = createPesoIconDataUrl('#242119');

        // Elegant Dark Header Bar
        doc.setFillColor(36, 33, 25); // #242119 luxury black
        doc.rect(0, 0, 210, 26, 'F');

        // Gold accent stripe
        doc.setFillColor(156, 143, 111); // #9c8f6f luxury gold
        doc.rect(0, 26, 210, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);
        doc.text('BOUTIQUE INVENTORY AUDIT REPORT', 14, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(239, 234, 220); // #efeadc
        const formattedDate = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
        const valFormatted = totalValuation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Print header metadata with high-res Peso sign image instead of raw character that causes ±
        const metaPrefix = `Date: ${formattedDate}  |  SKUs: ${items.length}  |  Units: ${totalUnits}  |  Valuation: `;
        doc.text(metaPrefix, 14, 20);
        const prefixWidth = doc.getTextWidth(metaPrefix);
        doc.addImage(whitePesoIcon, 'PNG', 14 + prefixWidth, 16.8, 3.6, 3.6);
        doc.text(valFormatted, 14 + prefixWidth + 3.8, 20);

        // Columns definition
        const headers: string[] = [];
        let priceIndex = -1;
        if (selectedFields.name) headers.push('Fragrance Name');
        if (selectedFields.brand) headers.push('House / Brand');
        if (selectedFields.size) headers.push('Size');
        if (selectedFields.stock) headers.push('Stock');
        if (selectedFields.price) {
          priceIndex = headers.length;
          headers.push('Retail Price (₱)');
        }
        if (selectedFields.barcode) headers.push('Barcode');
        if (selectedFields.location) headers.push('Shelf Location');

        const rows = items.map((i) => {
          const row: string[] = [];
          if (selectedFields.name) row.push(i.name);
          if (selectedFields.brand) row.push(i.brand);
          if (selectedFields.size) row.push(`${i.size} mL`);
          if (selectedFields.stock) row.push(`${i.stock}`);
          if (selectedFields.price) {
            // Reserve space for the rendered Peso icon
            row.push(`     ${i.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          }
          if (selectedFields.barcode) row.push(i.barcode);
          if (selectedFields.location) row.push(i.location || 'Boutique Shelf');
          return row;
        });

        autoTable(doc, {
          startY: 33,
          head: [headers],
          body: rows,
          theme: 'grid',
          headStyles: {
            fillColor: [36, 33, 25],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 3,
          },
          bodyStyles: {
            textColor: [36, 33, 25],
            fontSize: 8,
            cellPadding: 2.5,
          },
          alternateRowStyles: {
            fillColor: [250, 248, 244], // #faf8f4
          },
          styles: {
            lineColor: [231, 226, 212], // #e7e2d4
            lineWidth: 0.15,
          },
          didDrawCell: (data) => {
            // Render genuine Peso sign in the price column cells (no ± bug)
            if (priceIndex !== -1 && data.column.index === priceIndex && data.section === 'body') {
              const iconSize = 3.2;
              const iconY = data.cell.y + (data.cell.height - iconSize) / 2;
              doc.addImage(darkPesoIcon, 'PNG', data.cell.x + 2, iconY, iconSize, iconSize);
            }
          },
          didDrawPage: (data) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(7.5);
            doc.setTextColor(140, 136, 120);
            doc.text(
              `Philippine Boutique Retail Inventory · Page ${data.pageNumber} of ${pageCount}`,
              14,
              doc.internal.pageSize.height - 8
            );
          },
        });

        doc.save(`boutique-inventory-report-${dateStr}.pdf`);
        showToast('Successfully downloaded inventory report as authentic PDF document');
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        showToast('Error generating PDF report');
      }
    } else {
      // 2. GENERATE AUTHENTIC MICROSOFT EXCEL SPREADSHEET (.xlsx)
      try {
        const rowsData = items.map((i) => {
          const row: Record<string, any> = {};
          if (selectedFields.name) row['Fragrance Name'] = i.name;
          if (selectedFields.brand) row['Brand / House'] = i.brand;
          if (selectedFields.size) row['Size (mL)'] = i.size;
          if (selectedFields.stock) row['Stock (Units)'] = i.stock;
          if (selectedFields.price) row['Price (PHP ₱)'] = i.price;
          if (selectedFields.barcode) row['Barcode'] = i.barcode;
          if (selectedFields.location) row['Shelf Location'] = i.location || 'Boutique Shelf';
          return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(rowsData);

        // Auto column widths
        worksheet['!cols'] = [
          { wch: 30 }, // Name
          { wch: 22 }, // Brand
          { wch: 12 }, // Size
          { wch: 14 }, // Stock
          { wch: 16 }, // Price
          { wch: 18 }, // Barcode
          { wch: 22 }, // Location
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Stock');

        XLSX.writeFile(workbook, `boutique-inventory-report-${dateStr}.xlsx`);
        showToast('Successfully downloaded inventory report as Microsoft Excel (.xlsx) spreadsheet');
      } catch (err) {
        console.error('Failed to generate XLSX:', err);
        showToast('Error generating Excel spreadsheet');
      }
    }
  };


  return (
    <div className="space-y-6 max-w-3xl pb-16 md:pb-6">
      <div>
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

        <div className="pt-2 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
            Choose Export Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFileFormat('pdf')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                fileFormat === 'pdf'
                  ? 'border-[#9c8f6f] bg-[#efeadc] text-[#1b1915] shadow-xs'
                  : 'border-[#e7e2d4] bg-white hover:bg-[#faf8f4] text-[#56534a]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${fileFormat === 'pdf' ? 'bg-[#1b1915] text-[#efeadc]' : 'bg-[#faf8f4] text-[#7c7156]'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-[#1b1915]">PDF Document</div>
            </button>

            <button
              type="button"
              onClick={() => setFileFormat('xlsx')}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                fileFormat === 'xlsx'
                  ? 'border-[#9c8f6f] bg-[#efeadc] text-[#1b1915] shadow-xs'
                  : 'border-[#e7e2d4] bg-white hover:bg-[#faf8f4] text-[#56534a]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${fileFormat === 'xlsx' ? 'bg-[#1b1915] text-[#efeadc]' : 'bg-[#faf8f4] text-[#7c7156]'}`}>
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-[#1b1915]">Excel Workbook</div>
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          className="w-full py-3 bg-[#242119] hover:bg-[#34302a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs active:scale-[0.99]"
        >
          <Download className="w-4 h-4 text-[#9c8f6f]" />
          <span>
            Generate &amp; Download {fileFormat === 'pdf' ? 'PDF (.pdf)' : 'Excel (.xlsx)'} Report
          </span>
        </button>
      </div>

      {/* Edit Shelf Location Batch Table */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-[#242119]">
              Edit Shelf Locations
            </h3>
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
