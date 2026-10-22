import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  User,
  X,
  FileText,
  Eye,
  Receipt,
  Download,
  Printer,
  Package,
  RotateCcw,
  Lock,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useInventory } from '../context/InventoryContext.js';
import type { Sale, PaymentMethod } from '../types/inventory.js';
import {
  resolveSalePurchasedItems,
  formatSaleItemsSummary,
  computePaymentMethodBreakdown,
  computeCashierPerformance,
  getSalesPeriodLabel,
  filterSalesByPeriod,
  getSystemDateString,
  ALL_PAYMENT_METHODS,
} from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const PurchaseHistoryView: React.FC = () => {
  const {
    sales,
    items,
    deleteSale,
    returnSaleAndRestoreStock,
    setIsRecordSaleOpen,
    currency,
    verifyPin,
    showToast,
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  // All Time, Today, Weekly, Monthly, and Quarterly
  const [period, setPeriod] = useState<'all' | 'today' | 'weekly' | 'monthly' | 'quarterly'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [cashierFilter, setCashierFilter] = useState<'all' | 'Admin' | 'Associate'>('all');

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [modalViewMode, setModalViewMode] = useState<'details' | 'receipt'>('details');

  // End-of-Day Z-Reading / Cash Drawer Summary Modal State
  const [isZReadingOpen, setIsZReadingOpen] = useState(false);
  const [startingCashFloat, setStartingCashFloat] = useState<string>('2000');

  // Warning Confirmation Modal state when deleting a sale record (matches Inventory stock delete modal)
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openSaleRecord = (sale: Sale, mode: 'details' | 'receipt' = 'details') => {
    setSelectedSale(sale);
    setModalViewMode(mode);
  };

  const openDeleteSaleModal = (sale: Sale) => {
    setSaleToDelete(sale);
    setAdminPassword('');
    setDeleteError(null);
  };

  const closeDeleteSaleModal = () => {
    setSaleToDelete(null);
    setAdminPassword('');
    setDeleteError(null);
  };

  const handleConfirmDeleteSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToDelete) return;
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
    const id = saleToDelete.id;
    closeDeleteSaleModal();
    if (selectedSale?.id === id) {
      setSelectedSale(null);
    }
    await deleteSale(id);
  };

  // Period-filtered sales (before payment/cashier sub-filters, used for period Z-Reading & channel counts)
  const periodSales = useMemo(() => {
    return filterSalesByPeriod(sales, period);
  }, [sales, period]);

  // Filter sales by search, payment method, and cashier
  const filteredSales = useMemo(() => {
    return periodSales.filter((sale) => {
      const method = sale.paymentMethod || 'Cash';
      if (paymentFilter !== 'all' && method !== paymentFilter) return false;

      if (cashierFilter !== 'all') {
        const raw = (sale.cashier || 'Admin').toLowerCase();
        const normalizedCashier =
          raw.includes('assoc') || raw.includes('charlene') ? 'Associate' : 'Admin';
        if (normalizedCashier !== cashierFilter) return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const purchasedSummary = formatSaleItemsSummary(sale, items).toLowerCase();
      return (
        sale.name.toLowerCase().includes(q) ||
        (sale.note && sale.note.toLowerCase().includes(q)) ||
        purchasedSummary.includes(q) ||
        method.toLowerCase().includes(q) ||
        (sale.cashier && sale.cashier.toLowerCase().includes(q)) ||
        sale.date.includes(q)
      );
    });
  }, [periodSales, items, searchTerm, paymentFilter, cashierFilter]);

  // Compute metrics for current filtered view
  const totalRevenue = useMemo(
    () => filteredSales.reduce((sum, s) => sum + Number(s.amount || 0), 0),
    [filteredSales]
  );
  const salesCount = filteredSales.length;

  // Compute payment breakdown & cashier performance for the active period
  const paymentBreakdown = useMemo(
    () => computePaymentMethodBreakdown(periodSales),
    [periodSales]
  );
  const cashierStats = useMemo(
    () => computeCashierPerformance(periodSales, items),
    [periodSales, items]
  );
  const periodBottlesSold = useMemo(
    () =>
      periodSales.reduce((sum, s) => {
        const purchased = resolveSalePurchasedItems(s, items);
        return sum + purchased.reduce((b, p) => b + p.quantity, 0);
      }, 0),
    [periodSales, items]
  );

  const parsedFloat = Math.max(0, parseFloat(startingCashFloat) || 0);
  const expectedCashInDrawer = Number((parsedFloat + paymentBreakdown.cashTotal).toFixed(2));

  // Selected sale purchased items
  const selectedPurchasedItems = useMemo(() => {
    if (!selectedSale) return [];
    return resolveSalePurchasedItems(selectedSale, items);
  }, [selectedSale, items]);

  const selectedTotalBottles = useMemo(
    () => selectedPurchasedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedPurchasedItems]
  );

  // Print End-of-Day Z-Reading Register Report
  const handlePrintZReading = () => {
    const periodLabel = getSalesPeriodLabel(period);
    const dateStr = new Date().toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const channelRows = paymentBreakdown.channels
      .map(
        (ch) => `
        <tr>
          <td style="padding: 4px 0; font-size: 11px;">${ch.method} (${ch.count})</td>
          <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 700; font-size: 11px;">₱${ch.amount.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Z-Reading Report - Aura Parfums</title>
  <style>
    @page { size: 80mm auto; margin: 6mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1b1915;
      background: #ffffff;
      margin: 0 auto;
      padding: 12px;
      max-width: 300px;
    }
  </style>
</head>
<body>
  <div style="text-align: center; border-bottom: 1px dashed #9c8f6f; padding-bottom: 10px; margin-bottom: 10px;">
    <div style="font-family: Georgia, serif; font-size: 16px; font-weight: 700;">AURA PARFUMS</div>
    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7c7156; margin-top: 2px;">Z-Reading · Shift Register Summary</div>
    <div style="font-size: 11px; color: #56534a; margin-top: 4px;">Period: ${periodLabel} · ${dateStr}</div>
  </div>
  <div style="font-size: 11px; border-bottom: 1px dashed #9c8f6f; padding-bottom: 8px; margin-bottom: 10px; line-height: 1.6;">
    <div style="display: flex; justify-content: space-between;"><span>Transactions Logged:</span><strong>${paymentBreakdown.totalTransactions}</strong></div>
    <div style="display: flex; justify-content: space-between;"><span>Perfumes Sold:</span><strong>${periodBottlesSold} pcs</strong></div>
    <div style="display: flex; justify-content: space-between;"><span>Gross Sales Revenue:</span><strong>₱${paymentBreakdown.grandTotal.toFixed(2)}</strong></div>
  </div>
  <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #7c7156; margin-bottom: 4px;">Payment Method Breakdown</div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; border-bottom: 1px dashed #9c8f6f; padding-bottom: 6px;">
    <tbody>${channelRows}</tbody>
  </table>
  <div style="font-size: 11px; border-bottom: 1px dashed #9c8f6f; padding-bottom: 8px; margin-bottom: 10px; line-height: 1.6;">
    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #7c7156; margin-bottom: 2px;">Cash Drawer Reconciliation</div>
    <div style="display: flex; justify-content: space-between;"><span>Opening Cash Float:</span><span style="font-family: monospace;">₱${parsedFloat.toFixed(2)}</span></div>
    <div style="display: flex; justify-content: space-between;"><span>+ Cash Sales (${paymentBreakdown.cashCount}):</span><span style="font-family: monospace;">₱${paymentBreakdown.cashTotal.toFixed(2)}</span></div>
    <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; margin-top: 3px; padding-top: 3px; border-top: 1px solid #e7e2d4;">
      <span>Expected Cash in Drawer:</span>
      <span style="font-family: monospace;">₱${expectedCashInDrawer.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; color: #56534a; margin-top: 3px;">
      <span>Digital / Non-Cash Total (${paymentBreakdown.digitalCount}):</span>
      <span style="font-family: monospace;">₱${paymentBreakdown.digitalTotal.toFixed(2)}</span>
    </div>
  </div>
  <div style="font-size: 11px; line-height: 1.6;">
    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #7c7156; margin-bottom: 2px;">Cashier Attribution</div>
    <div style="display: flex; justify-content: space-between;"><span>Admin (${cashierStats.Admin.transactions} sales):</span><span style="font-family: monospace;">₱${cashierStats.Admin.revenue.toFixed(2)}</span></div>
    <div style="display: flex; justify-content: space-between;"><span>Associate (${cashierStats.Associate.transactions} sales):</span><span style="font-family: monospace;">₱${cashierStats.Associate.revenue.toFixed(2)}</span></div>
  </div>
</body>
</html>`;

    showToast('Preparing Z-Reading Shift Report for printing...');
    const existingFrame = document.getElementById('pos-zreading-print-frame') as HTMLIFrameElement | null;
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'pos-zreading-print-frame';
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

  // Download End-of-Day Z-Reading PDF
  const handleDownloadZReadingPdf = () => {
    try {
      const periodLabel = getSalesPeriodLabel(period);
      const dateStr = getSystemDateString();
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 175],
      });

      doc.setFillColor(27, 25, 21);
      doc.rect(0, 0, 80, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AURA PARFUMS', 40, 8.5, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(239, 234, 220);
      doc.text('Z-READING · SHIFT REGISTER SUMMARY', 40, 14, { align: 'center' });
      doc.text(`${periodLabel} (${dateStr})`, 40, 18.8, { align: 'center' });

      let y = 28;
      doc.setTextColor(27, 25, 21);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Transactions Logged:', 6, y);
      doc.text(`${paymentBreakdown.totalTransactions}`, 74, y, { align: 'right' });
      y += 4.5;

      doc.text('Total Perfumes Sold:', 6, y);
      doc.text(`${periodBottlesSold} pcs`, 74, y, { align: 'right' });
      y += 4.5;

      doc.text('Gross Sales Revenue:', 6, y);
      doc.text(`PHP ${paymentBreakdown.grandTotal.toFixed(2)}`, 74, y, { align: 'right' });
      y += 5;

      doc.setDrawColor(210, 204, 190);
      doc.line(6, y, 74, y);
      y += 5;

      doc.setFontSize(7.5);
      doc.setTextColor(124, 113, 86);
      doc.text('PAYMENT METHOD BREAKDOWN', 6, y);
      y += 4.5;

      doc.setTextColor(27, 25, 21);
      doc.setFontSize(8);
      paymentBreakdown.channels.forEach((ch) => {
        doc.setFont('helvetica', 'normal');
        doc.text(`${ch.method} (${ch.count})`, 6, y);
        doc.setFont('helvetica', 'bold');
        doc.text(`PHP ${ch.amount.toFixed(2)}`, 74, y, { align: 'right' });
        y += 4.5;
      });

      doc.line(6, y, 74, y);
      y += 5;

      doc.setFontSize(7.5);
      doc.setTextColor(124, 113, 86);
      doc.text('CASH DRAWER RECONCILIATION', 6, y);
      y += 4.5;

      doc.setTextColor(27, 25, 21);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Opening Cash Float:', 6, y);
      doc.text(`PHP ${parsedFloat.toFixed(2)}`, 74, y, { align: 'right' });
      y += 4.5;

      doc.text(`+ Cash Sales (${paymentBreakdown.cashCount}):`, 6, y);
      doc.text(`PHP ${paymentBreakdown.cashTotal.toFixed(2)}`, 74, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('EXPECTED CASH IN DRAWER:', 6, y);
      doc.text(`PHP ${expectedCashInDrawer.toFixed(2)}`, 74, y, { align: 'right' });
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Digital / Non-Cash (${paymentBreakdown.digitalCount}):`, 6, y);
      doc.text(`PHP ${paymentBreakdown.digitalTotal.toFixed(2)}`, 74, y, { align: 'right' });
      y += 5;

      doc.line(6, y, 74, y);
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(124, 113, 86);
      doc.text('STAFF / CASHIER ATTRIBUTION', 6, y);
      y += 4.5;

      doc.setTextColor(27, 25, 21);
      doc.setFont('helvetica', 'normal');
      doc.text(`Admin (${cashierStats.Admin.transactions} sales):`, 6, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`PHP ${cashierStats.Admin.revenue.toFixed(2)}`, 74, y, { align: 'right' });
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.text(`Associate (${cashierStats.Associate.transactions} sales):`, 6, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`PHP ${cashierStats.Associate.revenue.toFixed(2)}`, 74, y, { align: 'right' });

      doc.save(`z-reading-${period}-${dateStr}.pdf`);
      showToast('Downloaded Z-Reading Shift Report (.pdf)');
    } catch {
      showToast('Failed to generate Z-Reading PDF');
    }
  };

  // Download Official Receipt as PDF
  const handleDownloadReceiptPdf = (sale: Sale) => {
    try {
      const purchased = resolveSalePurchasedItems(sale, items);
      const txId = sale.id.slice(-6).toUpperCase();
      const totalBottles = purchased.reduce((s, p) => s + p.quantity, 0);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, Math.max(145, 110 + purchased.length * 12)],
      });

      // Header
      doc.setFillColor(27, 25, 21);
      doc.rect(0, 0, 80, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AURA PARFUMS', 40, 9, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setTextColor(239, 234, 220);
      doc.text('OFFICIAL PURCHASE RECEIPT', 40, 14.5, { align: 'center' });
      doc.text(`Transaction #${txId}`, 40, 19, { align: 'center' });

      let y = 28;
      doc.setTextColor(27, 25, 21);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Customer:`, 6, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${sale.name}`, 24, y);
      y += 4.5;

      doc.setFont('helvetica', 'bold');
      doc.text(`Date:`, 6, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${sale.date}`, 24, y);
      y += 4.5;

      doc.setFont('helvetica', 'bold');
      doc.text(`Payment:`, 6, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${sale.paymentMethod || 'Cash'}`, 24, y);
      if (sale.cashier) {
        doc.text(`(${sale.cashier})`, 46, y);
      }
      y += 5;

      // Divider
      doc.setDrawColor(210, 204, 190);
      doc.line(6, y, 74, y);
      y += 4.5;

      // Table Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('PERFUME PURCHASED', 6, y);
      doc.text('QTY', 49, y, { align: 'center' });
      doc.text('AMOUNT', 74, y, { align: 'right' });
      y += 3;
      doc.line(6, y, 74, y);
      y += 4.5;

      // Purchased Items
      purchased.forEach((p) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(p.name.slice(0, 24), 6, y);
        doc.text(`${p.quantity}x`, 49, y, { align: 'center' });
        doc.text(`PHP ${p.subtotal.toFixed(2)}`, 74, y, { align: 'right' });
        y += 3.8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(110, 104, 90);
        doc.text(`${p.brand} · ${p.size}mL @ PHP ${p.unitPrice.toFixed(2)}`, 6, y);
        doc.setTextColor(27, 25, 21);
        y += 5;
      });

      doc.line(6, y, 74, y);
      y += 5;

      // Totals
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Total Perfumes (${totalBottles} pcs)`, 6, y);
      doc.text(`PHP ${Number(sale.amount).toFixed(2)}`, 74, y, { align: 'right' });
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text('TOTAL AMOUNT', 6, y);
      doc.text(`PHP ${Number(sale.amount).toFixed(2)}`, 74, y, { align: 'right' });
      y += 5;

      if (sale.amountTendered && sale.amountTendered > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('Amount Tendered', 6, y);
        doc.text(`PHP ${Number(sale.amountTendered).toFixed(2)}`, 74, y, { align: 'right' });
        y += 4;
        doc.text('Change', 6, y);
        doc.text(`PHP ${Number(sale.changeDue || 0).toFixed(2)}`, 74, y, { align: 'right' });
        y += 5;
      }

      doc.line(6, y, 74, y);
      y += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(124, 113, 86);
      doc.text('Thank you for your purchase!', 40, y, { align: 'center' });

      doc.save(`receipt-${txId}-${sale.date}.pdf`);
      showToast(`Downloaded Receipt #${txId} (.pdf)`);
    } catch {
      showToast('Failed to generate receipt PDF');
    }
  };

  // Dedicated POS / Thermal Receipt Print Engine
  const handlePrintReceipt = (sale: Sale) => {
    const purchased = resolveSalePurchasedItems(sale, items);
    const txId = sale.id.slice(-6).toUpperCase();
    const totalBottles = purchased.reduce((s, p) => s + p.quantity, 0);

    const rowsHtml = purchased
      .map(
        (p) => `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #d8d2c2;">
            <div style="font-weight: 700; font-size: 12px; color: #1b1915;">${p.name}</div>
            <div style="font-size: 10px; color: #7c7156;">${p.brand} · ${p.size}mL @ ₱${p.unitPrice.toFixed(2)}</div>
          </td>
          <td style="padding: 6px 4px; text-align: center; font-family: monospace; font-weight: 700; font-size: 12px; border-bottom: 1px dashed #d8d2c2;">
            ${p.quantity}x
          </td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 700; font-size: 12px; border-bottom: 1px dashed #d8d2c2;">
            ₱${p.subtotal.toFixed(2)}
          </td>
        </tr>`
      )
      .join('');

    const tenderedHtml =
      sale.amountTendered && sale.amountTendered > 0
        ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #56534a; margin-top: 4px;">
          <span>Amount Tendered:</span>
          <span style="font-family: monospace;">₱${Number(sale.amountTendered).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #57795c; margin-top: 2px;">
          <span>Change:</span>
          <span style="font-family: monospace;">₱${Number(sale.changeDue || 0).toFixed(2)}</span>
        </div>`
        : '';

    const receiptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt #${txId} - Aura Parfums</title>
  <style>
    @page { size: 80mm auto; margin: 6mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1b1915;
      background: #ffffff;
      margin: 0;
      padding: 12px;
      max-width: 300px;
      margin-left: auto;
      margin-right: auto;
    }
  </style>
</head>
<body>
  <div style="text-align: center; border-bottom: 1px dashed #9c8f6f; padding-bottom: 10px; margin-bottom: 10px;">
    <div style="font-family: Georgia, serif; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">AURA PARFUMS</div>
    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #7c7156; margin-top: 2px;">Official Purchase Receipt</div>
    <div style="font-size: 11px; font-family: monospace; color: #56534a; margin-top: 4px;">Receipt #${txId}</div>
  </div>
  <div style="font-size: 11px; border-bottom: 1px dashed #9c8f6f; padding-bottom: 8px; margin-bottom: 10px; line-height: 1.6;">
    <div style="display: flex; justify-content: space-between;"><span>Customer:</span><strong>${sale.name}</strong></div>
    <div style="display: flex; justify-content: space-between;"><span>Date:</span><span style="font-family: monospace;">${sale.date}</span></div>
    <div style="display: flex; justify-content: space-between;"><span>Payment Method:</span><strong>${sale.paymentMethod || 'Cash'}</strong></div>
    ${sale.cashier ? `<div style="display: flex; justify-content: space-between;"><span>Served By:</span><strong>${sale.cashier}</strong></div>` : ''}
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
    <thead>
      <tr style="border-bottom: 1px solid #1b1915; font-size: 10px; text-transform: uppercase; color: #7c7156;">
        <th style="text-align: left; padding-bottom: 4px;">Perfume Purchased</th>
        <th style="text-align: center; padding-bottom: 4px;">Qty</th>
        <th style="text-align: right; padding-bottom: 4px;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div style="border-bottom: 1px dashed #9c8f6f; padding-bottom: 10px; margin-bottom: 10px;">
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #56534a; margin-bottom: 6px;">
      <span>Total Perfumes Purchased:</span>
      <span style="font-family: monospace; font-weight: 700;">${totalBottles} ${totalBottles === 1 ? 'bottle' : 'bottles'}</span>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; font-weight: 700; padding-top: 6px; border-top: 1px solid #e7e2d4;">
      <span>TOTAL AMOUNT</span>
      <span style="font-family: Georgia, serif; font-size: 17px;">₱${Number(sale.amount).toFixed(2)}</span>
    </div>
    ${tenderedHtml}
  </div>
  <div style="text-align: center; font-size: 11px; color: #7c7156; padding-top: 4px;">
    Thank you for shopping at Aura Parfums!
  </div>
</body>
</html>`;

    showToast(`Preparing Receipt #${txId} for printing...`);

    const existingFrame = document.getElementById('pos-receipt-print-frame') as HTMLIFrameElement | null;
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'pos-receipt-print-frame';
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
      frameDoc.write(receiptHtml);
      frameDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 150);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-8">
      {/* Top Header Row - Single compact row on mobile & desktop */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-serif text-xl sm:text-3xl font-bold text-[#1b1915] tracking-tight truncate">
          Purchase History
        </h1>

        {/* Top Right Actions: Z-Reading + Record New Sale */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsZReadingOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white hover:bg-[#efeadc] border border-[#e7e2d4] text-[#1b1915] text-xs font-semibold shadow-2xs transition-colors touch-manipulation"
            title="View End-of-Day Cash Drawer & Payment Breakdown (Z-Reading)"
          >
            <Wallet className="w-3.5 h-3.5 text-[#7c7156]" />
            <span>Z-Reading</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRecordSaleOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold shadow-xs transition-colors shrink-0 touch-manipulation active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* 3 Compact Metric Cards Row: Total Revenue, Sales Recorded, Cash vs Digital Drawer */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {/* Total Revenue with Peso badge */}
        <div className="py-2.5 px-3 sm:py-2.5 sm:px-3.5 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              TOTAL REVENUE
            </span>
            <div className="w-3.5 h-3.5 rounded-full bg-[#eef2ec] border border-[#d2dfcf] text-[#57795c] font-bold text-[8.5px] flex items-center justify-center leading-none">
              ₱
            </div>
          </div>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#1b1915] mt-0.5 tabular-nums">
            <PriceDisplay amount={totalRevenue} symbol={currency} />
          </div>
        </div>

        {/* Sales Recorded */}
        <div className="py-2.5 px-3 sm:py-2.5 sm:px-3.5 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs relative">
          <div className="flex items-center justify-between text-[#8c826e]">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              SALES RECORDED
            </span>
            <div className="w-3.5 h-3.5 rounded-full bg-[#efeadc] border border-[#9c8f6f]/40 text-[#7c7156] font-bold text-[8.5px] flex items-center justify-center leading-none">
              ₱
            </div>
          </div>
          <div className="font-serif text-lg sm:text-xl font-bold text-[#1b1915] mt-0.5 tabular-nums">
            {salesCount}
          </div>
        </div>

        {/* Cash Drawer vs Digital Summary Card */}
        <div className="col-span-2 sm:col-span-1 py-2.5 px-3 sm:py-2.5 sm:px-3.5 bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8c826e]">
              CASH VS DIGITAL ({getSalesPeriodLabel(period).split(' ')[0].toUpperCase()})
            </div>
            <div className="text-xs font-semibold text-[#1b1915] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums">
              <span>
                Cash: <strong><PriceDisplay amount={paymentBreakdown.cashTotal} symbol={currency} /></strong>
              </span>
              <span className="text-[#8c8878]">·</span>
              <span className="text-[#57795c]">
                Digital: <strong><PriceDisplay amount={paymentBreakdown.digitalTotal} symbol={currency} /></strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Period Filter Bar: all time, today, weekly, monthly and quarterly */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-[#8c826e]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer, perfume, payment method, cashier..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#e7e2d4] rounded-xl text-xs sm:text-sm text-[#1b1915] placeholder-[#8c8878] focus:outline-none focus:ring-2 focus:ring-[#9c8f6f] shadow-2xs"
          />
        </div>

        {/* Period Filter Tabs: All Time, Today, Weekly, Monthly, Quarterly */}
        <div className="w-full sm:w-auto grid grid-cols-5 p-1 bg-white border border-[#e7e2d4] rounded-xl shadow-2xs">
          {[
            { key: 'all' as const, label: 'All Time' },
            { key: 'today' as const, label: 'Today' },
            { key: 'weekly' as const, label: 'Weekly' },
            { key: 'monthly' as const, label: 'Monthly' },
            { key: 'quarterly' as const, label: 'Quarterly' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`py-1.5 px-0.5 sm:px-3 text-[10.5px] sm:text-xs font-semibold rounded-lg transition-colors text-center truncate ${
                period === tab.key
                  ? 'bg-[#efeadc] text-[#1b1915] shadow-2xs font-bold'
                  : 'text-[#7c7156] hover:text-[#1b1915] hover:bg-[#faf8f4]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method & Cashier Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPaymentFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap ${
              paymentFilter === 'all'
                ? 'bg-[#1b1915] text-white border-[#1b1915]'
                : 'bg-white text-[#56534a] border-[#e7e2d4] hover:bg-[#faf8f4]'
            }`}
          >
            All Payments ({periodSales.length})
          </button>
          {ALL_PAYMENT_METHODS.map((method) => {
            const ch = paymentBreakdown.channels.find((c) => c.method === method);
            const count = ch ? ch.count : 0;
            return (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentFilter(method)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                  paymentFilter === method
                    ? 'bg-[#1b1915] text-white border-[#1b1915]'
                    : 'bg-white text-[#56534a] border-[#e7e2d4] hover:bg-[#faf8f4]'
                }`}
              >
                {method} ({count})
              </button>
            );
          })}
        </div>

        {/* Staff / Cashier Attribution Filter */}
        <div className="flex items-center gap-1 bg-white border border-[#e7e2d4] p-0.5 rounded-xl self-start sm:self-auto shrink-0">
          {(['all', 'Admin', 'Associate'] as const).map((roleKey) => (
            <button
              key={roleKey}
              type="button"
              onClick={() => setCashierFilter(roleKey)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                cashierFilter === roleKey
                  ? 'bg-[#efeadc] text-[#1b1915] font-bold'
                  : 'text-[#7c7156] hover:text-[#1b1915]'
              }`}
            >
              {roleKey === 'all' ? 'All Staff' : roleKey}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Container - Responsive: Thinner Cards on Mobile, Table on Tablet/Desktop */}
      <div className="bg-white border border-[#e7e2d4] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs">
        {/* Mobile Card View (< sm) */}
        <div className="block sm:hidden divide-y divide-[#f0ece0]">
          {filteredSales.length === 0 ? (
            <div className="py-8 text-center text-[#8c8878] text-xs">
              No sales records found for this filter.
            </div>
          ) : (
            filteredSales.map((sale) => {
              const purchasedSummary = formatSaleItemsSummary(sale, items);
              return (
                <div
                  key={sale.id}
                  onClick={() => openSaleRecord(sale, 'details')}
                  className="py-2.5 px-3.5 space-y-1.5 active:bg-[#faf8f4] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#56534a]">
                      <Calendar className="w-3.5 h-3.5 text-[#8c826e]" />
                      <span>{sale.date}</span>
                    </span>
                    <span className="font-serif font-bold text-sm sm:text-base text-[#1b1915] tabular-nums">
                      <PriceDisplay amount={sale.amount} symbol={currency} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#1b1915]">
                      <User className="w-3.5 h-3.5 text-[#8c826e]" />
                      <span>{sale.name}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSaleRecord(sale, 'receipt');
                        }}
                        className="p-1 text-[#7c7156] hover:text-[#1b1915] rounded-md"
                        title="View Official Receipt"
                        aria-label={`View receipt for ${sale.name}`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSaleRecord(sale, 'details');
                        }}
                        className="p-1 text-[#8c8878] hover:text-[#1b1915] rounded-md"
                        title="View Purchase Record"
                        aria-label={`View purchase record for ${sale.name}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteSaleModal(sale);
                        }}
                        className="p-1 text-[#8c8878] hover:text-[#a05539] rounded-md"
                        title="Delete Sale"
                        aria-label={`Delete sale for ${sale.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#1b1915] font-medium line-clamp-2 bg-[#faf8f4] py-1 px-2 rounded-md border border-[#f0ece0] flex items-center justify-between gap-2">
                    <span className="truncate">{purchasedSummary}</span>
                    <span className="text-[10px] text-[#7c7156] shrink-0">
                      · {sale.paymentMethod || 'Cash'}
                      {sale.cashier ? ` · ${sale.cashier}` : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (>= sm) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e7e2d4] bg-[#faf8f4] text-[#8c826e] uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-5">DATE</th>
                <th className="py-3 px-5">CLIENT NAME</th>
                <th className="py-3 px-5">PERFUMES PURCHASED</th>
                <th className="py-3 px-5">PAYMENT · STAFF</th>
                <th className="py-3 px-5">AMOUNT</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece0]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8c8878]">
                    No sales records found for this filter.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const purchasedSummary = formatSaleItemsSummary(sale, items);
                  return (
                    <tr
                      key={sale.id}
                      onClick={() => openSaleRecord(sale, 'details')}
                      className="hover:bg-[#faf8f4] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5 text-[#56534a] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8c826e]" />
                          <span>{sale.date}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-bold text-[#1b1915] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#8c826e]" />
                          <span>{sale.name}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-[#1b1915] font-medium max-w-xs truncate">
                        {purchasedSummary}
                      </td>
                      <td className="py-3.5 px-5 text-[#56534a] whitespace-nowrap">
                        <span className="font-semibold text-[#1b1915]">
                          {sale.paymentMethod || 'Cash'}
                        </span>
                        <span className="text-[#8c8878]"> · {sale.cashier || 'Admin'}</span>
                      </td>
                      <td className="py-3.5 px-5 font-serif font-bold text-sm text-[#1b1915] whitespace-nowrap tabular-nums">
                        <PriceDisplay amount={sale.amount} symbol={currency} />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSaleRecord(sale, 'receipt');
                            }}
                            className="p-1.5 text-[#7c7156] hover:text-[#1b1915] hover:bg-[#efeadc] rounded-lg transition-colors"
                            title="View Receipt"
                            aria-label={`View receipt for ${sale.name}`}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSaleRecord(sale, 'details');
                            }}
                            className="p-1.5 text-[#8c8878] hover:text-[#1b1915] hover:bg-[#efeadc] rounded-lg transition-colors"
                            title="View Purchase Record"
                            aria-label={`View purchase record for ${sale.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteSaleModal(sale);
                            }}
                            className="p-1.5 text-[#8c8878] hover:text-[#a05539] hover:bg-[#f8ede5] rounded-lg transition-colors"
                            title="Delete Sale Record"
                            aria-label={`Delete sale record for ${sale.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* End-of-Day Z-Reading / Shift Cash Drawer Summary Modal */}
      {isZReadingOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e2d4] bg-[#faf8f4] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b1915] text-[#efeadc] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#1b1915]">
                    Z-Reading · Shift Register
                  </h3>
                  <p className="text-[11px] text-[#8c826e]">
                    {getSalesPeriodLabel(period)} · {paymentBreakdown.totalTransactions} transactions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZReadingOpen(false)}
                aria-label="Close Z-Reading Modal"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Gross Sales Hero */}
              <div className="p-4 rounded-xl bg-[#faf8f4] border border-[#e7e2d4] text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c826e] block">
                  GROSS SALES ({getSalesPeriodLabel(period).toUpperCase()})
                </span>
                <div className="font-serif text-3xl font-bold text-[#1b1915] mt-1 tabular-nums">
                  <PriceDisplay amount={paymentBreakdown.grandTotal} symbol={currency} />
                </div>
                <div className="text-[11px] text-[#7c7156] mt-1">
                  {paymentBreakdown.totalTransactions} sales · {periodBottlesSold} perfume bottles sold
                </div>
              </div>

              {/* Cash Drawer Reconciliation Calculator */}
              <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#56534a]">
                  Cash Drawer Reconciliation
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <label className="text-[#56534a] font-semibold">
                    Starting Cash Float (₱):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={startingCashFloat}
                    onChange={(e) => setStartingCashFloat(e.target.value)}
                    className="w-28 px-2.5 py-1.5 bg-white border border-[#e7e2d4] rounded-lg text-right font-mono font-bold text-xs text-[#1b1915]"
                  />
                </div>

                <div className="flex justify-between text-xs text-[#56534a]">
                  <span>+ Cash Sales ({paymentBreakdown.cashCount}):</span>
                  <span className="font-mono font-semibold text-[#1b1915] tabular-nums">
                    <PriceDisplay amount={paymentBreakdown.cashTotal} symbol={currency} />
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-[#e7e2d4] text-xs">
                  <span className="font-bold text-[#1b1915]">Expected Cash in Drawer:</span>
                  <span className="font-serif text-base font-bold text-[#57795c] tabular-nums">
                    <PriceDisplay amount={expectedCashInDrawer} symbol={currency} />
                  </span>
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#56534a]">
                  Payment Method Breakdown
                </div>
                <div className="bg-[#faf8f4] border border-[#e7e2d4] rounded-xl divide-y divide-[#e7e2d4] overflow-hidden text-xs">
                  {paymentBreakdown.channels.map((ch) => (
                    <div
                      key={ch.method}
                      className="py-2.5 px-3.5 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-[#1b1915]">{ch.method}</span>
                        <span className="text-[11px] text-[#8c8878] ml-1.5">
                          ({ch.count} {ch.count === 1 ? 'sale' : 'sales'})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#1b1915] tabular-nums">
                        <PriceDisplay amount={ch.amount} symbol={currency} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff / Cashier Attribution */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#56534a]">
                  Staff / Cashier Attribution
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {(['Admin', 'Associate'] as const).map((roleKey) => {
                    const st = cashierStats[roleKey];
                    return (
                      <div
                        key={roleKey}
                        className="p-3 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-0.5"
                      >
                        <div className="font-bold text-[#1b1915]">{roleKey}</div>
                        <div className="text-[11px] text-[#7c7156]">
                          {st.transactions} sales · {st.bottlesSold} pcs
                        </div>
                        <div className="font-serif font-bold text-sm text-[#1b1915] pt-0.5 tabular-nums">
                          <PriceDisplay amount={st.revenue} symbol={currency} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={handleDownloadZReadingPdf}
                  className="flex-1 py-2.5 px-3 bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#efeadc]" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintZReading}
                  className="py-2.5 px-3.5 bg-[#efeadc] hover:bg-[#e5decb] text-[#1b1915] border border-[#9c8f6f]/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Z-Reading</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsZReadingOpen(false)}
                  className="py-2.5 px-3.5 border border-[#e7e2d4] hover:bg-[#faf8f4] text-[#56534a] text-xs font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Record & Official Receipt Modal */}
      {selectedSale && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden my-auto animate-scaleUp max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#e7e2d4] bg-[#faf8f4] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b1915] text-[#efeadc] flex items-center justify-center font-bold text-base shadow-xs">
                  ₱
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1b1915]">
                    Purchase Record
                  </h3>
                  <p className="text-[11px] text-[#8c826e] uppercase tracking-wider font-semibold">
                    Transaction ID: #{selectedSale.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                aria-label="Close Purchase Record"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Mode Switcher: Purchase Record vs Official Receipt */}
            <div className="px-5 sm:px-6 pt-3.5 shrink-0">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalViewMode('details')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    modalViewMode === 'details'
                      ? 'bg-[#1b1915] text-white shadow-2xs'
                      : 'text-[#56534a] hover:text-[#1b1915]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Record Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalViewMode('receipt')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    modalViewMode === 'receipt'
                      ? 'bg-[#1b1915] text-white shadow-2xs'
                      : 'text-[#56534a] hover:text-[#1b1915]'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Receipt</span>
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {modalViewMode === 'details' ? (
                <>
                  {/* Amount Hero */}
                  <div className="p-4 rounded-xl bg-[#faf8f4] border border-[#e7e2d4] text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c826e] block">
                      TOTAL AMOUNT
                    </span>
                    <div className="font-serif text-3xl font-bold text-[#1b1915] mt-1 tabular-nums">
                      <PriceDisplay amount={selectedSale.amount} symbol={currency} />
                    </div>
                    <div className="text-[11px] text-[#7c7156] mt-1">
                      Payment: <strong className="text-[#1b1915]">{selectedSale.paymentMethod || 'Cash'}</strong>
                      {selectedSale.cashier && (
                        <>
                          {' '}
                          · Recorded by <strong className="text-[#1b1915]">{selectedSale.cashier}</strong>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Client and Date Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#faf8f4] rounded-xl border border-[#e7e2d4]">
                      <span className="text-[10px] font-bold uppercase text-[#8c826e] block mb-0.5">
                        CUSTOMER
                      </span>
                      <span className="font-semibold text-[#1b1915]">{selectedSale.name}</span>
                    </div>
                    <div className="p-3 bg-[#faf8f4] rounded-xl border border-[#e7e2d4]">
                      <span className="text-[10px] font-bold uppercase text-[#8c826e] block mb-0.5">
                        DATE
                      </span>
                      <span className="font-semibold text-[#1b1915]">{selectedSale.date}</span>
                    </div>
                  </div>

                  {/* Perfumes Purchased List */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#56534a] flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#7c7156]" />
                        <span>Perfumes Purchased</span>
                      </label>
                      <span className="text-[11px] font-bold text-[#7c7156]">
                        {selectedTotalBottles} {selectedTotalBottles === 1 ? 'bottle' : 'bottles'}
                      </span>
                    </div>

                    <div className="bg-[#faf8f4] border border-[#e7e2d4] rounded-xl divide-y divide-[#e7e2d4] overflow-hidden">
                      {selectedPurchasedItems.map((purchased, idx) => (
                        <div
                          key={`${purchased.itemId}-${idx}`}
                          className="p-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[#1b1915] truncate">
                              {purchased.name}
                            </div>
                            <div className="text-[11px] text-[#7c7156] truncate">
                              {purchased.brand} · {purchased.size} mL ·{' '}
                              <PriceDisplay amount={purchased.unitPrice} symbol={currency} /> each
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-xs text-[#1b1915] tabular-nums">
                              {purchased.quantity}x ·{' '}
                              <PriceDisplay amount={purchased.subtotal} symbol={currency} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description & Notes Card */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#7c7156]" />
                      <span>Purchase Description &amp; Notes</span>
                    </label>
                    <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-xs text-[#242119] leading-relaxed">
                      {selectedSale.note ? (
                        <p className="font-medium text-[#1b1915] whitespace-pre-wrap">
                          {selectedSale.note}
                        </p>
                      ) : (
                        <p className="italic text-[#8c8878]">
                          No specific notes provided for this transaction.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e7e2d4]">
                    <button
                      type="button"
                      onClick={() => openDeleteSaleModal(selectedSale)}
                      className="px-3 py-2.5 text-xs font-semibold text-[#a05539] hover:bg-[#f8ede5] border border-[#ecdccf] rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const id = selectedSale.id;
                        setSelectedSale(null);
                        returnSaleAndRestoreStock(id);
                      }}
                      className="px-3 py-2.5 text-xs font-semibold text-[#56534a] hover:bg-[#f2efe6] border border-[#e7e2d4] rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      title="Return sale and restore bottles to inventory stock"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalViewMode('receipt')}
                      className="px-3.5 py-2.5 text-xs font-semibold bg-[#efeadc] hover:bg-[#e5decb] text-[#1b1915] border border-[#9c8f6f]/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSale(null)}
                      className="flex-1 min-w-[72px] py-2.5 px-4 bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                /* OFFICIAL STORE RECEIPT VIEW */
                <div className="space-y-4">
                  <div className="p-4 sm:p-5 bg-[#faf8f4] border border-[#d8d2c2] rounded-xl shadow-inner font-sans space-y-3.5">
                    {/* Receipt Header */}
                    <div className="text-center border-b border-dashed border-[#c9c1ae] pb-3">
                      <div className="font-serif text-base font-bold tracking-wide text-[#1b1915]">
                        AURA PARFUMS
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#7c7156] mt-0.5">
                        Official Purchase Receipt
                      </div>
                      <div className="text-[11px] font-mono text-[#56534a] mt-1">
                        Receipt #{selectedSale.id.slice(-6).toUpperCase()}
                      </div>
                    </div>

                    {/* Receipt Customer & Meta Info */}
                    <div className="space-y-1 text-xs border-b border-dashed border-[#c9c1ae] pb-3">
                      <div className="flex justify-between">
                        <span className="text-[#7c7156]">Customer:</span>
                        <span className="font-bold text-[#1b1915]">{selectedSale.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7c7156]">Date:</span>
                        <span className="font-mono font-semibold text-[#1b1915]">
                          {selectedSale.date}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7c7156]">Payment Method:</span>
                        <span className="font-semibold text-[#1b1915]">
                          {selectedSale.paymentMethod || 'Cash'}
                        </span>
                      </div>
                      {selectedSale.cashier && (
                        <div className="flex justify-between">
                          <span className="text-[#7c7156]">Served By:</span>
                          <span className="font-semibold text-[#1b1915]">
                            {selectedSale.cashier}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Receipt Perfumes Purchased Table */}
                    <div className="space-y-2 border-b border-dashed border-[#c9c1ae] pb-3">
                      <div className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider text-[#7c7156]">
                        <span className="col-span-7">Perfume Purchased</span>
                        <span className="col-span-2 text-center">Qty</span>
                        <span className="col-span-3 text-right">Subtotal</span>
                      </div>

                      <div className="space-y-2">
                        {selectedPurchasedItems.map((item, idx) => (
                          <div
                            key={`${item.itemId}-${idx}`}
                            className="grid grid-cols-12 items-start text-xs gap-1"
                          >
                            <div className="col-span-7 min-w-0">
                              <div className="font-bold text-[#1b1915] leading-snug">
                                {item.name}
                              </div>
                              <div className="text-[10.5px] text-[#7c7156]">
                                {item.brand} · {item.size}mL @{' '}
                                <PriceDisplay amount={item.unitPrice} symbol={currency} />
                              </div>
                            </div>
                            <div className="col-span-2 text-center font-mono font-bold text-[#1b1915] tabular-nums">
                              {item.quantity}x
                            </div>
                            <div className="col-span-3 text-right font-mono font-bold text-[#1b1915] tabular-nums">
                              <PriceDisplay amount={item.subtotal} symbol={currency} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Receipt Totals */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#56534a]">
                        <span>Total Perfumes Purchased:</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {selectedTotalBottles} {selectedTotalBottles === 1 ? 'bottle' : 'bottles'}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1 border-t border-[#e7e2d4]">
                        <span className="font-bold uppercase tracking-wider text-[#1b1915]">
                          TOTAL AMOUNT
                        </span>
                        <span className="font-serif text-xl font-bold text-[#1b1915] tabular-nums">
                          <PriceDisplay amount={selectedSale.amount} symbol={currency} />
                        </span>
                      </div>
                      {selectedSale.amountTendered && selectedSale.amountTendered > 0 && (
                        <>
                          <div className="flex justify-between text-[11px] text-[#56534a]">
                            <span>Amount Tendered:</span>
                            <span className="font-mono tabular-nums">
                              <PriceDisplay
                                amount={selectedSale.amountTendered}
                                symbol={currency}
                              />
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#57795c] font-semibold">
                            <span>Change:</span>
                            <span className="font-mono tabular-nums">
                              <PriceDisplay
                                amount={selectedSale.changeDue || 0}
                                symbol={currency}
                              />
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Receipt Footer */}
                    <div className="pt-2.5 border-t border-dashed border-[#c9c1ae] text-center text-[11px] text-[#7c7156]">
                      Thank you for shopping at Aura Parfums!
                    </div>
                  </div>

                  {/* Receipt Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDownloadReceiptPdf(selectedSale)}
                      className="flex-1 py-2.5 px-3 bg-[#1b1915] hover:bg-[#34302a] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#efeadc]" />
                      <span>Download PDF Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintReceipt(selectedSale)}
                      className="py-2.5 px-3 bg-[#efeadc] hover:bg-[#e5decb] text-[#1b1915] border border-[#9c8f6f]/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSale(null)}
                      className="py-2.5 px-3.5 border border-[#e7e2d4] hover:bg-[#faf8f4] text-[#56534a] text-xs font-semibold rounded-xl transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Sale Record Warning Modal (Matches Delete Stock Warning Modal) */}
      {saleToDelete && (
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
                  Confirm Delete Sale Record
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDeleteSaleModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleConfirmDeleteSale} className="p-5 space-y-4">
              {/* Selected Sale Record Preview Card */}
              <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f2efe6] border border-[#e7e2d4] flex items-center justify-center shrink-0 text-[#8c7a5b] font-bold text-sm">
                  ₱
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm sm:text-base font-bold text-[#1b1915] truncate flex items-center justify-between gap-2">
                    <span className="truncate">{saleToDelete.name}</span>
                    <span className="font-serif text-sm text-[#1b1915] shrink-0 tabular-nums">
                      <PriceDisplay amount={saleToDelete.amount} symbol={currency} />
                    </span>
                  </div>
                  <div className="text-xs text-[#56534a] truncate">
                    {formatSaleItemsSummary(saleToDelete, items)} · {saleToDelete.date}
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#56534a]">
                Please enter your <strong>Admin Password</strong> to permanently remove this sale record from purchase history.
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
                  onClick={closeDeleteSaleModal}
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
