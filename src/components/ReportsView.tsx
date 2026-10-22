import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Eye,
  Calendar,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useInventory } from '../context/InventoryContext.js';
import {
  filterSalesByPeriod,
  getSalesPeriodLabel,
  formatSaleItemsSummary,
  getSystemDateString,
  type SalesReportPeriod,
} from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const ReportsView: React.FC = () => {
  const { items, sales, showToast, currency } = useInventory();

  // Both Available & Total Stocks and Purchase History are always included
  const includeStocks = true;
  const includePurchaseHistory = true;

  // Date filter for PDF and Spreadsheet reports: today, weekly, monthly, quarterly, all
  const [salesPeriod, setSalesPeriod] = useState<SalesReportPeriod>('quarterly');

  const [fileFormat, setFileFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [activeSlide, setActiveSlide] = useState<number>(0);

  // Hand / touch / mouse swipe & drag state for the side-by-side Overview carousel
  const dragStartXRef = React.useRef<number | null>(null);
  const dragStartYRef = React.useRef<number | null>(null);
  const dragStartTimeRef = React.useRef<number>(0);
  const isHorizontalSwipeRef = React.useRef<boolean | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastWheelSwipeRef = React.useRef<number>(0);

  // Both slides are always available in the swipeable overview
  const slides: Array<'stocks' | 'sales'> = ['stocks', 'sales'];

  const safeSlideIndex = Math.min(activeSlide, Math.max(0, slides.length - 1));
  const currentSlideType = slides[safeSlideIndex] || 'stocks';

  const beginSwipe = (clientX: number, clientY: number) => {
    dragStartXRef.current = clientX;
    dragStartYRef.current = clientY;
    dragStartTimeRef.current = Date.now();
    isHorizontalSwipeRef.current = null;
  };

  const moveSwipe = (clientX: number, clientY: number) => {
    if (dragStartXRef.current === null || dragStartYRef.current === null) return;
    const dx = clientX - dragStartXRef.current;
    const dy = clientY - dragStartYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      isHorizontalSwipeRef.current = Math.abs(dx) >= Math.abs(dy);
    }

    if (!isHorizontalSwipeRef.current) return;

    if (!isDragging) {
      setIsDragging(true);
    }

    // Full 1:1 follow when swiping toward the other slide; gentle rubber-band at edges
    const canGoNext = dx < 0 && safeSlideIndex < slides.length - 1;
    const canGoPrev = dx > 0 && safeSlideIndex > 0;
    if (canGoNext || canGoPrev) {
      setDragOffsetX(dx);
    } else {
      setDragOffsetX(dx * 0.25);
    }
  };

  const endSwipe = (clientX?: number, clientY?: number) => {
    if (dragStartXRef.current !== null && dragStartYRef.current !== null && isHorizontalSwipeRef.current) {
      const endX = clientX ?? dragStartXRef.current + dragOffsetX;
      const dx = endX - dragStartXRef.current;
      const dt = Math.max(1, Date.now() - dragStartTimeRef.current);
      const velocity = Math.abs(dx) / dt;

      if (slides.length > 1 && (Math.abs(dx) > 38 || (Math.abs(dx) > 16 && velocity > 0.22))) {
        if (dx < 0 && safeSlideIndex < slides.length - 1) {
          setActiveSlide(safeSlideIndex + 1);
        } else if (dx > 0 && safeSlideIndex > 0) {
          setActiveSlide(safeSlideIndex - 1);
        }
      }
    }

    dragStartXRef.current = null;
    dragStartYRef.current = null;
    isHorizontalSwipeRef.current = null;
    setIsDragging(false);
    setDragOffsetX(0);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    beginSwipe(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    moveSwipe(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    const touch = e.changedTouches[0];
    endSwipe(touch?.clientX, touch?.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    beginSwipe(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    moveSwipe(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    endSwipe(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    if (dragStartXRef.current === null) return;
    endSwipe();
  };

  const handleWheelSwipe = (e: React.WheelEvent<HTMLDivElement>) => {
    if (slides.length <= 1) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 22) {
      const now = Date.now();
      if (now - lastWheelSwipeRef.current < 420) return;
      if (e.deltaX > 0 && safeSlideIndex < slides.length - 1) {
        lastWheelSwipeRef.current = now;
        setActiveSlide(safeSlideIndex + 1);
      } else if (e.deltaX < 0 && safeSlideIndex > 0) {
        lastWheelSwipeRef.current = now;
        setActiveSlide(safeSlideIndex - 1);
      }
    }
  };

  // Computed metrics and sorted data
  const dateStr = getSystemDateString();
  const formattedDate = new Date().toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalUnits = useMemo(() => items.reduce((s, i) => s + i.stock, 0), [items]);
  const totalValuation = useMemo(() => items.reduce((s, i) => s + i.price * i.stock, 0), [items]);

  const sortedSales = useMemo(() => {
    return filterSalesByPeriod(sales, salesPeriod);
  }, [sales, salesPeriod]);

  const salesPeriodLabel = useMemo(() => getSalesPeriodLabel(salesPeriod), [salesPeriod]);

  const totalSalesRevenue = useMemo(
    () => sortedSales.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    [sortedSales]
  );

  // Helper to render crisp, native Philippine Peso symbol on a high-res canvas in Calibri Bold
  const createPesoIconDataUrl = (textColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      ctx.font = 'bold 46px "Calibri", "Segoe UI", "Noto Sans", sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₱', 32, 34);
    }
    return canvas.toDataURL('image/png');
  };

  const handleGenerateReport = () => {
    const valFormatted = totalValuation.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const salesFormatted = totalSalesRevenue.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (fileFormat === 'pdf') {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const whitePesoIcon = createPesoIconDataUrl('#efeadc');
        const darkPesoIcon = createPesoIconDataUrl('#242119');

        const headerHeight = includeStocks && includePurchaseHistory ? 30 : 25;

        // Elegant Dark Header Bar
        doc.setFillColor(36, 33, 25); // #242119 luxury black
        doc.rect(0, 0, 210, headerHeight, 'F');

        // Gold accent stripe
        doc.setFillColor(156, 143, 111); // #9c8f6f luxury gold
        doc.rect(0, headerHeight, 210, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        const reportTitle =
          includeStocks && includePurchaseHistory
            ? 'STOCKS & PURCHASE HISTORY REPORT'
            : includeStocks
            ? 'AVAILABLE & TOTAL STOCKS REPORT'
            : 'PURCHASE HISTORY & TOTAL SALES REPORT';
        doc.text(reportTitle, 14, 11);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(239, 234, 220); // #efeadc

        let metaY = 18.5;
        if (includeStocks) {
          const metaPrefix = `Date: ${formattedDate}  |  SKUs: ${items.length}  |  Total Stocks: ${totalUnits} pcs  |  Stock Value: `;
          doc.text(metaPrefix, 14, metaY);
          const prefixWidth = doc.getTextWidth(metaPrefix);
          doc.addImage(whitePesoIcon, 'PNG', 14 + prefixWidth, metaY - 3.2, 3.5, 3.5);
          doc.text(valFormatted, 14 + prefixWidth + 3.8, metaY);
          metaY += 6.5;
        }

        if (includePurchaseHistory) {
          const salesPrefix = includeStocks
            ? `Sales Period: ${salesPeriodLabel}  |  Transactions: ${sortedSales.length}  |  Total Sales: `
            : `Date: ${formattedDate}  |  Period: ${salesPeriodLabel}  |  Transactions: ${sortedSales.length}  |  Total Sales: `;
          doc.text(salesPrefix, 14, metaY);
          const salesPrefixWidth = doc.getTextWidth(salesPrefix);
          doc.addImage(whitePesoIcon, 'PNG', 14 + salesPrefixWidth, metaY - 3.2, 3.5, 3.5);
          doc.text(salesFormatted, 14 + salesPrefixWidth + 3.8, metaY);
        }

        let currentStartY = headerHeight + 8;

        // SECTION 1: AVAILABLE & TOTAL STOCKS
        if (includeStocks) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(36, 33, 25);
          doc.text(
            includePurchaseHistory
              ? '1. AVAILABLE & TOTAL STOCKS'
              : 'AVAILABLE & TOTAL STOCKS',
            14,
            currentStartY
          );

          const headers = [
            'Fragrance Name',
            'Brand',
            'Size',
            'Available Stock',
            'Retail Price (PHP)',
            'Barcode',
          ];
          const priceIndex = 4;

          const rows = items.map((i) => [
            i.name,
            i.brand,
            `${i.size} mL`,
            `${i.stock} pcs`,
            `     ${i.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            i.barcode,
          ]);

          const stockFoot = [
            [
              'TOTAL STOCKS',
              `${items.length} SKUs`,
              '',
              `${totalUnits} pcs`,
              `     ${valFormatted}`,
              '',
            ],
          ];

          autoTable(doc, {
            startY: currentStartY + 3,
            head: [headers],
            body: rows,
            foot: stockFoot,
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
              fontStyle: 'bold',
              fontSize: 8,
              cellPadding: 2.5,
            },
            footStyles: {
              fillColor: [239, 234, 220],
              textColor: [36, 33, 25],
              fontStyle: 'bold',
              fontSize: 8.5,
              cellPadding: 3,
            },
            alternateRowStyles: {
              fillColor: [250, 248, 244],
            },
            styles: {
              lineColor: [231, 226, 212],
              lineWidth: 0.15,
              fontStyle: 'bold',
            },
            didDrawCell: (data) => {
              if (data.column.index === priceIndex && (data.section === 'body' || data.section === 'foot')) {
                const iconSize = 3.2;
                const iconY = data.cell.y + (data.cell.height - iconSize) / 2;
                doc.addImage(darkPesoIcon, 'PNG', data.cell.x + 2, iconY, iconSize, iconSize);
              }
            },
          });

          currentStartY = ((doc as any).lastAutoTable?.finalY || currentStartY + 20) + 10;
        }

        // SECTION 2: PURCHASE HISTORY & TOTAL SALES
        if (includePurchaseHistory) {
          if (currentStartY > doc.internal.pageSize.height - 45) {
            doc.addPage();
            currentStartY = 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(36, 33, 25);
          doc.text(
            includeStocks
              ? `2. PURCHASE HISTORY & TOTAL SALES (${salesPeriodLabel.toUpperCase()})`
              : `PURCHASE HISTORY & TOTAL SALES (${salesPeriodLabel.toUpperCase()})`,
            14,
            currentStartY
          );

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(92, 83, 62);
          const totalSalesLabel = `Period: ${salesPeriodLabel}   |   Transactions: ${sortedSales.length}   |   Total Sales Revenue: `;
          doc.text(totalSalesLabel, 14, currentStartY + 5.5);
          const labelWidth = doc.getTextWidth(totalSalesLabel);
          doc.addImage(darkPesoIcon, 'PNG', 14 + labelWidth, currentStartY + 2.4, 3.4, 3.4);
          doc.text(salesFormatted, 14 + labelWidth + 3.8, currentStartY + 5.5);

          const salesHeaders = ['Date', 'Client Name', 'Perfumes Purchased', 'Amount (PHP)'];
          const salesRows = sortedSales.map((s) => [
            s.date,
            s.name,
            formatSaleItemsSummary(s, items),
            `     ${Number(s.amount || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ]);

          const salesFoot = [
            ['TOTAL SALES', `${sortedSales.length} Transactions`, '', `     ${salesFormatted}`],
          ];

          autoTable(doc, {
            startY: currentStartY + 8.5,
            head: [salesHeaders],
            body: salesRows,
            foot: salesFoot,
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
              fontStyle: 'bold',
              fontSize: 8,
              cellPadding: 2.5,
            },
            footStyles: {
              fillColor: [239, 234, 220],
              textColor: [36, 33, 25],
              fontStyle: 'bold',
              fontSize: 8.5,
              cellPadding: 3,
            },
            alternateRowStyles: {
              fillColor: [250, 248, 244],
            },
            styles: {
              lineColor: [231, 226, 212],
              lineWidth: 0.15,
              fontStyle: 'bold',
            },
            didDrawCell: (data) => {
              if (data.column.index === 3 && (data.section === 'body' || data.section === 'foot')) {
                const iconSize = 3.2;
                const iconY = data.cell.y + (data.cell.height - iconSize) / 2;
                doc.addImage(darkPesoIcon, 'PNG', data.cell.x + 2, iconY, iconSize, iconSize);
              }
            },
          });
        }

        // Page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
          doc.setPage(p);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(140, 136, 120);
          doc.text(
            `Inventory & Sales Report · Page ${p} of ${pageCount}`,
            14,
            doc.internal.pageSize.height - 8
          );
        }

        doc.save(`inventory-report-${dateStr}.pdf`);
        showToast('Successfully downloaded PDF report');
      } catch (err) {
        console.error('Failed to generate PDF:', err);
        showToast('Error generating PDF report');
      }
    } else {
      // GENERATE SPREADSHEET (.xlsx)
      try {
        const workbook = XLSX.utils.book_new();
        const combinedAoA: any[][] = [];

        combinedAoA.push([
          includeStocks && includePurchaseHistory
            ? 'AVAILABLE STOCKS & PURCHASE HISTORY REPORT'
            : includeStocks
            ? 'AVAILABLE & TOTAL STOCKS REPORT'
            : 'PURCHASE HISTORY & TOTAL SALES REPORT',
        ]);
        combinedAoA.push(['Report Date', dateStr]);

        if (includeStocks) {
          combinedAoA.push(['Total Inventory SKUs', items.length]);
          combinedAoA.push(['Total Available Stock Units', totalUnits]);
          combinedAoA.push(['Total Inventory Valuation (PHP ₱)', Number(totalValuation.toFixed(2))]);
        }
        if (includePurchaseHistory) {
          combinedAoA.push(['Sales Date Period', salesPeriodLabel]);
          combinedAoA.push(['Total Sales Transactions', sortedSales.length]);
          combinedAoA.push(['Total Sales Revenue (PHP ₱)', Number(totalSalesRevenue.toFixed(2))]);
        }
        combinedAoA.push([]);

        if (includeStocks) {
          combinedAoA.push(['AVAILABLE & TOTAL STOCKS']);
          combinedAoA.push([
            'Fragrance Name',
            'Brand / House',
            'Size (mL)',
            'Available Stock (Units)',
            'Retail Price (PHP ₱)',
            'Barcode',
          ]);

          items.forEach((i) => {
            combinedAoA.push([
              i.name,
              i.brand,
              i.size,
              i.stock,
              Number(i.price.toFixed(2)),
              i.barcode,
            ]);
          });

          combinedAoA.push([
            'TOTAL STOCKS',
            `${items.length} SKUs`,
            '',
            totalUnits,
            Number(totalValuation.toFixed(2)),
            '',
          ]);
          combinedAoA.push([]);
        }

        if (includePurchaseHistory) {
          combinedAoA.push([`PURCHASE HISTORY & TOTAL SALES (${salesPeriodLabel.toUpperCase()})`]);
          combinedAoA.push(['Date', 'Client Name', 'Perfumes Purchased', 'Amount (PHP ₱)']);

          sortedSales.forEach((s) => {
            combinedAoA.push([
              s.date,
              s.name,
              formatSaleItemsSummary(s, items),
              Number(Number(s.amount || 0).toFixed(2)),
            ]);
          });

          combinedAoA.push([
            'TOTAL SALES',
            `${sortedSales.length} Transactions`,
            '',
            Number(totalSalesRevenue.toFixed(2)),
          ]);
        }

        const mainWorksheet = XLSX.utils.aoa_to_sheet(combinedAoA);
        mainWorksheet['!cols'] = [
          { wch: 32 },
          { wch: 24 },
          { wch: 36 },
          { wch: 22 },
          { wch: 20 },
          { wch: 18 },
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          mainWorksheet,
          includeStocks && includePurchaseHistory
            ? 'Stocks & Sales Report'
            : includeStocks
            ? 'Available Stocks'
            : 'Purchase History'
        );

        // If both are checked, also attach a dedicated Purchase History worksheet tab
        if (includeStocks && includePurchaseHistory) {
          const salesSheetAoA: any[][] = [
            [`PURCHASE HISTORY & TOTAL SALES REPORT (${salesPeriodLabel.toUpperCase()})`],
            ['Generated Date', dateStr],
            ['Sales Date Period', salesPeriodLabel],
            ['Total Transactions', sortedSales.length],
            ['Total Sales (PHP ₱)', Number(totalSalesRevenue.toFixed(2))],
            [],
            ['Date', 'Client Name', 'Perfumes Purchased', 'Amount (PHP ₱)'],
            ...sortedSales.map((s) => [
              s.date,
              s.name,
              formatSaleItemsSummary(s, items),
              Number(Number(s.amount || 0).toFixed(2)),
            ]),
            [],
            [
              'TOTAL SALES',
              `${sortedSales.length} Transactions`,
              '',
              Number(totalSalesRevenue.toFixed(2)),
            ],
          ];
          const salesWorksheet = XLSX.utils.aoa_to_sheet(salesSheetAoA);
          salesWorksheet['!cols'] = [
            { wch: 18 },
            { wch: 26 },
            { wch: 42 },
            { wch: 18 },
          ];
          XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Purchase History');
        }

        XLSX.writeFile(workbook, `inventory-report-${dateStr}.xlsx`);
        showToast('Successfully downloaded Spreadsheet (.xlsx)');
      } catch (err) {
        console.error('Failed to generate XLSX:', err);
        showToast('Error generating Spreadsheet');
      }
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 max-w-4xl pb-20 md:pb-8">
      <div>
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#242119]">Inventory Reports</h2>
      </div>

      {/* Report Configuration & Generator Card */}
      <div className="p-3.5 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3.5 sm:space-y-4">
        {/* Date Option (Today, Weekly, Monthly, Quarterly, All Time) for PDF & Spreadsheet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#56534a] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#7c7156]" />
              <span>Date</span>
            </label>
            <span className="text-[11px] font-bold text-[#7c7156]">
              {sortedSales.length} transactions · <PriceDisplay amount={totalSalesRevenue} symbol={currency} />
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1 p-1 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl">
            {[
              { key: 'today' as const, label: 'Today' },
              { key: 'weekly' as const, label: 'Weekly' },
              { key: 'monthly' as const, label: 'Monthly' },
              { key: 'quarterly' as const, label: 'Quarterly' },
              { key: 'all' as const, label: 'All Time' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSalesPeriod(option.key)}
                className={`py-2 px-0.5 sm:px-2.5 rounded-lg text-[10.5px] sm:text-xs font-bold tracking-tight sm:tracking-normal transition-all text-center whitespace-nowrap touch-manipulation ${
                  salesPeriod === option.key
                    ? 'bg-[#242119] text-white shadow-2xs'
                    : 'text-[#56534a] hover:text-[#1b1915] hover:bg-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Choose Export Format */}
        <div className="pt-1 space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
            Choose Export Format
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setFileFormat('pdf')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                fileFormat === 'pdf'
                  ? 'border-[#9c8f6f] bg-[#efeadc] text-[#1b1915] shadow-xs'
                  : 'border-[#e7e2d4] bg-white hover:bg-[#faf8f4] text-[#56534a]'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  fileFormat === 'pdf'
                    ? 'bg-[#1b1915] text-[#efeadc]'
                    : 'bg-[#faf8f4] text-[#7c7156]'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs sm:text-sm text-[#1b1915] truncate">PDF Document</div>
            </button>

            <button
              type="button"
              onClick={() => setFileFormat('xlsx')}
              className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                fileFormat === 'xlsx'
                  ? 'border-[#9c8f6f] bg-[#efeadc] text-[#1b1915] shadow-xs'
                  : 'border-[#e7e2d4] bg-white hover:bg-[#faf8f4] text-[#56534a]'
              }`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  fileFormat === 'xlsx'
                    ? 'bg-[#1b1915] text-[#efeadc]'
                    : 'bg-[#faf8f4] text-[#7c7156]'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs sm:text-sm text-[#1b1915] truncate">Spreadsheet</div>
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          className="w-full py-3 bg-[#242119] hover:bg-[#34302a] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs active:scale-[0.99]"
        >
          <Download className="w-4 h-4 text-[#9c8f6f]" />
          <span>
            Generate &amp; Download {fileFormat === 'pdf' ? 'PDF (.pdf)' : 'Spreadsheet (.xlsx)'} Report
          </span>
        </button>
      </div>

      {/* Side-by-Side Horizontal Swipeable Document & Spreadsheet Overview (No Scrollbars) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheelSwipe}
        style={{ touchAction: 'pan-y' }}
        className="p-3.5 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3 select-none overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#f0ece0] pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-[#7c7156] shrink-0" />
            <h3 className="text-xs sm:text-base font-bold text-[#242119] truncate">
              {fileFormat === 'pdf' ? 'PDF Document Overview' : 'Spreadsheet Overview'}
            </h3>
          </div>

          {/* Hand-Swipe Slide Switcher Pills when both sections are active */}
          {slides.length > 1 ? (
            <div className="flex items-center gap-1 bg-[#faf8f4] border border-[#e7e2d4] p-0.5 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveSlide(0)}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs transition-colors ${
                  safeSlideIndex === 0
                    ? 'bg-[#242119] text-white shadow-2xs'
                    : 'text-[#7c7156] hover:text-[#1b1915]'
                }`}
              >
                1. Stocks
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide(1)}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs transition-colors ${
                  safeSlideIndex === 1
                    ? 'bg-[#242119] text-white shadow-2xs'
                    : 'text-[#7c7156] hover:text-[#1b1915]'
                }`}
              >
                2. Sales
              </button>
            </div>
          ) : (
            <span className="text-[10px] sm:text-[11px] text-[#7c7156] bg-[#faf8f4] border border-[#e7e2d4] px-2.5 py-1 rounded-lg shrink-0">
              {includeStocks ? 'Available & Total Stocks' : 'Purchase History'}
            </span>
          )}
        </div>

        {/* Horizontal Screen Carousel Viewport */}
        <div className="relative w-full overflow-hidden rounded-xl">
          <div
            className="flex w-full will-change-transform"
            style={{
              transform: `translate3d(calc(-${safeSlideIndex * 100}% + ${dragOffsetX}px), 0, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {slides.map((slideType, slideIdx) => (
              <div key={slideType} className="w-full min-w-full shrink-0">
                {fileFormat === 'pdf' ? (
                  /* SIDE-BY-SIDE SWIPEABLE PDF DOCUMENT OVERVIEW SLIDE */
                  <div className="border border-[#d8d2c2] rounded-xl overflow-hidden bg-white shadow-inner">
                    {/* Simulated PDF Dark Luxury Header */}
                    <div className="bg-[#242119] text-white p-3 border-b-2 border-[#9c8f6f] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] sm:text-xs font-bold tracking-wide uppercase truncate">
                          {includeStocks && includePurchaseHistory
                            ? 'STOCKS & PURCHASE HISTORY REPORT'
                            : includeStocks
                            ? 'AVAILABLE & TOTAL STOCKS REPORT'
                            : 'PURCHASE HISTORY & TOTAL SALES REPORT'}
                        </div>
                        {slides.length > 1 && (
                          <span className="text-[10px] text-[#efeadc] bg-white/10 px-2 py-0.5 rounded shrink-0">
                            Swipe {slideIdx + 1}/{slides.length}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[#efeadc] flex flex-wrap gap-x-2.5 gap-y-0.5">
                        <span>Date: {formattedDate}</span>
                        {includeStocks && (
                          <>
                            <span>|</span>
                            <span>Total Stocks: {totalUnits} pcs</span>
                            <span>|</span>
                            <span>
                              Value: <PriceDisplay amount={totalValuation} symbol={currency} />
                            </span>
                          </>
                        )}
                        {includePurchaseHistory && (
                          <>
                            <span>|</span>
                            <span>Period: {salesPeriodLabel}</span>
                            <span>|</span>
                            <span>
                              Total Sales: <PriceDisplay amount={totalSalesRevenue} symbol={currency} />
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Slide Body (No Scrollbar) */}
                    <div className="p-2.5 sm:p-3 max-h-[245px] sm:max-h-[295px] overflow-y-auto overflow-x-auto no-scrollbar">
                      {slideType === 'stocks' ? (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-[#242119] uppercase tracking-wider">
                            {includePurchaseHistory
                              ? '1. AVAILABLE & TOTAL STOCKS (SWIPE LEFT FOR SALES)'
                              : 'AVAILABLE & TOTAL STOCKS'}
                          </div>
                          <div className="border border-[#e7e2d4] rounded-lg overflow-hidden">
                            <table className="w-full text-left text-[11px] sm:text-xs">
                              <thead>
                                <tr className="bg-[#242119] text-white">
                                  <th className="py-1.5 px-2 sm:px-2.5">Fragrance</th>
                                  <th className="py-1.5 px-2 sm:px-2.5">Brand</th>
                                  <th className="py-1.5 px-2 sm:px-2.5">Size</th>
                                  <th className="py-1.5 px-2 sm:px-2.5">Stock</th>
                                  <th className="py-1.5 px-2 sm:px-2.5">Price</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e7e2d4]">
                                {items.map((item, idx) => (
                                  <tr
                                    key={item.id}
                                    className={idx % 2 === 1 ? 'bg-[#faf8f4]' : 'bg-white'}
                                  >
                                    <td className="py-1.5 px-2 sm:px-2.5 text-[#242119]">
                                      {item.name}
                                    </td>
                                    <td className="py-1.5 px-2 sm:px-2.5 text-[#56534a]">
                                      {item.brand}
                                    </td>
                                    <td className="py-1.5 px-2 sm:px-2.5 text-[#56534a] whitespace-nowrap">
                                      {item.size} mL
                                    </td>
                                    <td className="py-1.5 px-2 sm:px-2.5 text-[#242119] whitespace-nowrap">
                                      {item.stock} pcs
                                    </td>
                                    <td className="py-1.5 px-2 sm:px-2.5 text-[#242119] whitespace-nowrap">
                                      <PriceDisplay amount={item.price} symbol={currency} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-[#efeadc] text-[#242119] border-t-2 border-[#9c8f6f]">
                                  <td className="py-1.5 px-2 sm:px-2.5 font-bold">TOTAL STOCKS</td>
                                  <td className="py-1.5 px-2 sm:px-2.5">{items.length} SKUs</td>
                                  <td className="py-1.5 px-2 sm:px-2.5"></td>
                                  <td className="py-1.5 px-2 sm:px-2.5 font-bold whitespace-nowrap">
                                    {totalUnits} pcs
                                  </td>
                                  <td className="py-1.5 px-2 sm:px-2.5 font-bold whitespace-nowrap">
                                    <PriceDisplay amount={totalValuation} symbol={currency} />
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold text-[#242119] uppercase tracking-wider">
                            {includeStocks
                              ? `2. PURCHASE HISTORY & TOTAL SALES — ${salesPeriodLabel.toUpperCase()} (SWIPE RIGHT FOR STOCKS)`
                              : `PURCHASE HISTORY & TOTAL SALES — ${salesPeriodLabel.toUpperCase()}`}
                          </div>
                          <div className="border border-[#e7e2d4] rounded-lg overflow-hidden">
                            <table className="w-full text-left text-[11px] sm:text-xs">
                              <thead>
                                <tr className="bg-[#242119] text-white">
                                  <th className="py-1.5 px-2 sm:px-2.5">Date</th>
                                  <th className="py-1.5 px-2 sm:px-2.5">Client Name</th>
                                  <th className="py-1.5 px-2 sm:px-2.5">Perfumes Purchased</th>
                                  <th className="py-1.5 px-2 sm:px-2.5">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e7e2d4]">
                                {sortedSales.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="py-4 text-center text-[#8c8878]">
                                      No sales recorded for {salesPeriodLabel}.
                                    </td>
                                  </tr>
                                ) : (
                                  sortedSales.map((s, idx) => (
                                    <tr
                                      key={s.id}
                                      className={idx % 2 === 1 ? 'bg-[#faf8f4]' : 'bg-white'}
                                    >
                                      <td className="py-1.5 px-2 sm:px-2.5 text-[#56534a] whitespace-nowrap">
                                        {s.date}
                                      </td>
                                      <td className="py-1.5 px-2 sm:px-2.5 text-[#242119]">
                                        {s.name}
                                      </td>
                                      <td className="py-1.5 px-2 sm:px-2.5 text-[#56534a]">
                                        {formatSaleItemsSummary(s, items)}
                                      </td>
                                      <td className="py-1.5 px-2 sm:px-2.5 text-[#242119] whitespace-nowrap">
                                        <PriceDisplay amount={s.amount} symbol={currency} />
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="bg-[#efeadc] text-[#242119] border-t-2 border-[#9c8f6f]">
                                  <td className="py-1.5 px-2 sm:px-2.5 font-bold">TOTAL SALES</td>
                                  <td className="py-1.5 px-2 sm:px-2.5">{sortedSales.length} Sales</td>
                                  <td className="py-1.5 px-2 sm:px-2.5"></td>
                                  <td className="py-1.5 px-2 sm:px-2.5 font-bold whitespace-nowrap">
                                    <PriceDisplay amount={totalSalesRevenue} symbol={currency} />
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* SIDE-BY-SIDE SWIPEABLE SPREADSHEET (.XLSX) OVERVIEW SLIDE */
                  <div className="border border-[#c9d8c5] rounded-xl overflow-hidden bg-white shadow-inner">
                    {/* Simulated Spreadsheet Top Ribbon Bar */}
                    <div className="bg-[#217346] text-white px-3 py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className="w-4 h-4 shrink-0" />
                        <span className="truncate">inventory-report-{dateStr}.xlsx</span>
                      </div>
                      <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded shrink-0">
                        {slides.length > 1
                          ? `Swipe ${slideIdx + 1}/${slides.length}`
                          : 'Sheet 1/1'}
                      </span>
                    </div>

                    {/* Spreadsheet Grid Container (No Scrollbar) */}
                    <div className="max-h-[245px] sm:max-h-[295px] overflow-y-auto overflow-x-auto no-scrollbar">
                      {slideType === 'stocks' ? (
                        <table className="w-full text-left text-[11px] sm:text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#f3f2f1] text-[#56534a] border-b border-[#d2d0ce] text-center">
                              <th className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] w-7">#</th>
                              <th className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">A</th>
                              <th className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">B</th>
                              <th className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">C</th>
                              <th className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">D</th>
                              <th className="py-1 px-2 sm:px-2.5">E</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e1dfdd]">
                            <tr className="bg-[#eef2ec]">
                              <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                1
                              </td>
                              <td colSpan={5} className="py-1 px-2 sm:px-2.5 font-bold text-[#217346]">
                                {includePurchaseHistory
                                  ? `1. AVAILABLE & TOTAL STOCKS (${totalUnits} pcs) — SWIPE LEFT FOR SALES`
                                  : `AVAILABLE & TOTAL STOCKS (${totalUnits} pcs)`}
                              </td>
                            </tr>
                            <tr className="bg-[#242119] text-white">
                              <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                2
                              </td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#34302a]">Fragrance</td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#34302a]">Brand</td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#34302a]">Size</td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#34302a]">Stock</td>
                              <td className="py-1 px-2 sm:px-2.5">Price</td>
                            </tr>
                            {items.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-[#faf8f4]">
                                <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                  {idx + 3}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 border-r border-[#e1dfdd]">
                                  {item.name}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 border-r border-[#e1dfdd]">
                                  {item.brand}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 border-r border-[#e1dfdd] whitespace-nowrap">
                                  {item.size} mL
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 border-r border-[#e1dfdd] whitespace-nowrap">
                                  {item.stock}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 whitespace-nowrap">
                                  <PriceDisplay amount={item.price} symbol={currency} />
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-[#efeadc] font-bold">
                              <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                {items.length + 3}
                              </td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">TOTAL STOCKS</td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">
                                {items.length} SKUs
                              </td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]"></td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce] whitespace-nowrap">
                                {totalUnits} pcs
                              </td>
                              <td className="py-1 px-2 sm:px-2.5 whitespace-nowrap">
                                <PriceDisplay amount={totalValuation} symbol={currency} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left text-[11px] sm:text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#f3f2f1] text-[#56534a] border-b border-[#d2d0ce] text-center">
                              <th className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] w-7">#</th>
                              <th className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">A</th>
                              <th className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">B</th>
                              <th className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">C</th>
                              <th className="py-1 px-2 sm:px-2.5">D</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e1dfdd]">
                            <tr className="bg-[#eef2ec]">
                              <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                1
                              </td>
                              <td colSpan={4} className="py-1 px-2 sm:px-2.5 font-bold text-[#217346]">
                                {includeStocks
                                  ? `2. PURCHASE HISTORY & TOTAL SALES — ${salesPeriodLabel.toUpperCase()} (SWIPE RIGHT FOR STOCKS)`
                                  : `PURCHASE HISTORY & TOTAL SALES — ${salesPeriodLabel.toUpperCase()}`}
                              </td>
                            </tr>
                            <tr className="bg-[#242119] text-white">
                              <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                2
                              </td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#34302a]">Date</td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#34302a]">Client Name</td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#34302a]">Perfumes Purchased</td>
                              <td className="py-1 px-2 sm:px-2.5">Amount</td>
                            </tr>
                            {sortedSales.map((s, idx) => (
                              <tr key={s.id} className="hover:bg-[#faf8f4]">
                                <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                  {idx + 3}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 border-r border-[#e1dfdd] whitespace-nowrap">
                                  {s.date}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 border-r border-[#e1dfdd]">
                                  {s.name}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 border-r border-[#e1dfdd]">
                                  {formatSaleItemsSummary(s, items)}
                                </td>
                                <td className="py-1 px-2 sm:px-2.5 whitespace-nowrap">
                                  <PriceDisplay amount={s.amount} symbol={currency} />
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-[#efeadc] font-bold">
                              <td className="py-1 px-1.5 sm:px-2 border-r border-[#d2d0ce] text-center text-[#8c8878] bg-[#f3f2f1]">
                                {sortedSales.length + 3}
                              </td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">TOTAL SALES</td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]">
                                {sortedSales.length} Sales
                              </td>
                              <td className="py-1 px-2 sm:px-2.5 border-r border-[#d2d0ce]"></td>
                              <td className="py-1 px-2 sm:px-2.5 whitespace-nowrap">
                                <PriceDisplay amount={totalSalesRevenue} symbol={currency} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Simulated Spreadsheet Bottom Sheet Tabs */}
                    <div className="bg-[#f3f2f1] border-t border-[#d2d0ce] px-2.5 py-1 flex items-center gap-1.5 text-[11px]">
                      {includeStocks && (
                        <button
                          type="button"
                          onClick={() => setActiveSlide(0)}
                          className={`px-2.5 py-1 rounded-t border-b-2 transition-colors ${
                            currentSlideType === 'stocks'
                              ? 'bg-white text-[#217346] border-[#217346] shadow-2xs'
                              : 'text-[#56534a] border-transparent hover:bg-white/60'
                          }`}
                        >
                          Available Stocks
                        </button>
                      )}
                      {includePurchaseHistory && (
                        <button
                          type="button"
                          onClick={() => setActiveSlide(includeStocks ? 1 : 0)}
                          className={`px-2.5 py-1 rounded-t border-b-2 transition-colors ${
                            currentSlideType === 'sales'
                              ? 'bg-white text-[#217346] border-[#217346] shadow-2xs'
                              : 'text-[#56534a] border-transparent hover:bg-white/60'
                          }`}
                        >
                          Purchase History
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Swipe Indicator Footer */}
        <div className="flex items-center justify-between text-[11px] text-[#8c8878] pt-0.5">
          <span>Swipe screen left or right to view next page</span>
          {slides.length > 1 && (
            <div className="flex items-center gap-1.5">
              {slides.map((sl, i) => (
                <button
                  key={sl}
                  type="button"
                  onClick={() => setActiveSlide(i)}
                  aria-label={`View slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    safeSlideIndex === i ? 'w-5 bg-[#242119]' : 'w-1.5 bg-[#d8d2c2]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
