import React, { useState, useRef, useMemo } from 'react';
import {
  Users,
  Shield,
  User,
  LogOut,
  UserCheck,
  Lock,
  Check,
  Database,
  RefreshCw,
  Settings,
  Download,
  Upload,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { computeCashierPerformance } from '../utils/inventoryLogic.js';
import { PriceDisplay } from './PriceDisplay.js';

export const AccountsView: React.FC = () => {
  const {
    personnel,
    currentUser,
    logout,
    items,
    sales,
    stockLogs,
    currency,
    lastSyncedAt,
    resetDemoData,
    exportDatabaseBackup,
    importDatabaseBackup,
    verifyPin,
    updatePin,
    showToast,
  } = useInventory();

  const isAdminAccount = currentUser?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cashierPerformance = useMemo(
    () => computeCashierPerformance(sales, items),
    [sales, items]
  );

  // PIN management state (Admin only)
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const res = importDatabaseBackup(content);
      if (!res.success && res.error) {
        showToast(res.error);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAccount) {
      showToast('Only the Admin can change the security PIN');
      return;
    }
    const verified = await verifyPin(currentPin);
    if (!verified) {
      setPinMessage('Current PIN is incorrect (default is 1234)');
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      setPinMessage('New PIN must be 4 to 8 digits');
      return;
    }
    const success = await updatePin(newPin);
    if (success) {
      showToast('Admin security PIN updated');
      setPinChangeOpen(false);
      setCurrentPin('');
      setNewPin('');
      setPinMessage(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-20 md:pb-8">
      {/* Top Header synced with Settings menu */}
      <div className="flex items-center gap-2.5">
        <Settings className="w-6 h-6 sm:w-7 sm:h-7 text-[#7c7156]" />
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1b1915] tracking-tight">
          Settings
        </h1>
      </div>

      {/* ACTIVE SESSION CARD */}
      <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e] leading-tight">
            ACTIVE SESSION
          </span>
          <div className="text-base sm:text-lg font-bold text-[#1b1915] mt-0.5 truncate">
            {isAdminAccount ? 'Admin' : 'Associate'}
          </div>
          <div className="text-[11px] font-semibold uppercase text-[#8c826e] tracking-tight mt-0.5">
            {isAdminAccount ? 'ADMIN' : 'ASSOCIATE'}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#faf8f4] border border-[#e7e2d4] flex items-center justify-center text-[#7c7156]">
            <UserCheck className="w-5 h-5" />
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-[#a05539] hover:bg-[#f8ede5] border border-[#ecdccf] transition-colors"
            title="Log Out of Session"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>

      {/* Staff Roster & Sales Attribution Card */}
      <div className="bg-white border border-[#e7e2d4] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#e7e2d4] bg-[#faf8f4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#8c826e]" />
            <h3 className="font-serif text-base font-bold text-[#1b1915]">
              Accounts &amp; Cashier Sales Performance
            </h3>
          </div>
          <span className="text-xs text-[#8c8878]">
            Logged in as: <strong className="text-[#1b1915]">{isAdminAccount ? 'Admin' : 'Associate'}</strong>
          </span>
        </div>

        <div className="divide-y divide-[#f0ece0]">
          {personnel.map((p) => {
            const isAdmin = p.username === 'ferdie';
            const perf = isAdmin
              ? cashierPerformance.Admin
              : cashierPerformance.Associate;
            return (
              <div
                key={p.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#faf8f4] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isAdmin
                        ? 'bg-[#1b1915] text-[#e7e2d4]'
                        : 'bg-[#efeadc] text-[#7c7156]'
                    }`}
                  >
                    {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm sm:text-base text-[#1b1915]">
                      {p.name}
                    </h4>
                    <p className="text-xs text-[#56534a]">
                      @{p.username} · Role:{' '}
                      <strong className="text-[#1b1915]">
                        {isAdmin ? 'Admin' : 'Associate'}
                      </strong>{' '}
                      · Added {p.createdAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f0ece0]">
                  <div className="text-left sm:text-right">
                    <div className="font-serif font-bold text-sm text-[#1b1915] tabular-nums">
                      <PriceDisplay amount={perf.revenue} symbol={currency} />
                    </div>
                    <div className="text-[11px] text-[#7c7156] tabular-nums">
                      {perf.transactions} {perf.transactions === 1 ? 'sale' : 'sales'} ·{' '}
                      {perf.bottlesSold} {perf.bottlesSold === 1 ? 'bottle' : 'bottles'} sold
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#57795c]">
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Security PIN Protection — Associate accounts CANNOT change the PIN */}
      <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#7c7156]" />
            Admin Security PIN
          </h3>
          {isAdminAccount ? (
            <button
              type="button"
              onClick={() => setPinChangeOpen(!pinChangeOpen)}
              className="px-3.5 py-1.5 text-xs font-semibold border border-[#e7e2d4] text-[#1b1915] hover:bg-[#faf8f4] rounded-xl transition-colors"
            >
              {pinChangeOpen ? 'Cancel' : 'Change PIN'}
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#f6f0e1] text-[#9c793c] border border-[#ecdccf] flex items-center gap-1">
              <Lock className="w-3 h-3" /> Admin Only
            </span>
          )}
        </div>
        <p className="text-xs text-[#8c8878]">
          Restricts item deletion and administrative privileges to authorized administrators.
        </p>

        {isAdminAccount && pinChangeOpen && (
          <form onSubmit={handleUpdatePin} className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-3 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#56534a] mb-1">
                  Current PIN (default 1234)
                </label>
                <input
                  type="password"
                  required
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#1b1915]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#56534a] mb-1">
                  New 4-8 Digit PIN
                </label>
                <input
                  type="password"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#1b1915]"
                />
              </div>
            </div>

            {pinMessage && <p className="text-xs text-[#a05539] font-medium">{pinMessage}</p>}

            <button
              type="submit"
              className="px-4 py-2 bg-[#1b1915] text-white text-xs font-semibold rounded-lg hover:bg-[#34302a] transition-colors"
            >
              Save New PIN
            </button>
          </form>
        )}

        {(!pinChangeOpen || !isAdminAccount) && (
          <div className="p-3 bg-[#faf8f4] rounded-xl border border-[#e7e2d4] flex items-center justify-between text-xs">
            <span className="text-[#56534a]">PIN Status:</span>
            {isAdminAccount ? (
              <span className="font-semibold text-[#57795c] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Active &amp; Protected
              </span>
            ) : (
              <span className="font-semibold text-[#8c8878] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#9c793c]" /> Locked (Admin Only)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Storage, Database Backup & Restore, & Reset Data */}
      <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#7c7156]" />
            Database Backup &amp; Storage
          </h3>
          <span className="text-[11px] text-[#8c8878]">
            Last Synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Just now'}
          </span>
        </div>

        <div className="p-3.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[#1b1915] font-bold block">
              Shop Database Backup (.json)
            </span>
            <span className="text-[#56534a] block">
              {items.length} fragrances ({items.reduce((s, i) => s + i.stock, 0)} bottles) ·{' '}
              {sales.length} sales records · {stockLogs.length} stock logs
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportDatabaseBackup}
              className="px-3 py-2 text-xs font-semibold bg-[#1b1915] hover:bg-[#34302a] text-white rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#efeadc]" />
              <span>Export Backup</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-xs font-semibold bg-white hover:bg-[#efeadc] text-[#1b1915] border border-[#e7e2d4] rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#7c7156]" />
              <span>Restore Backup</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#f0ece0] text-xs">
          <span className="text-[#8c8878]">
            Reset inventory and sales to the default baseline catalog:
          </span>

          {!confirmResetOpen ? (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold border border-[#ecdccf] text-[#a05539] hover:bg-[#f8ede5] rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Baseline Inventory
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-3 py-1.5 text-xs border border-[#e7e2d4] rounded-xl text-[#56534a] hover:bg-[#faf8f4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setConfirmResetOpen(false);
                }}
                className="px-3 py-1.5 text-xs bg-[#a05539] text-white rounded-xl hover:bg-[#85432b]"
              >
                Confirm Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
