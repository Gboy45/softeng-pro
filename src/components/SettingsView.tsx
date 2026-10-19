import React, { useState } from 'react';
import {
  Settings,
  Database,
  Lock,
  RefreshCw,
  Shield,
  Coins,
  Check,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';
import { PesoSign } from './PriceDisplay.js';

export const SettingsView: React.FC = () => {
  const {
    items,
    syncStatus,
    lastSyncedAt,
    resetDemoData,
    verifyPin,
    updatePin,
    showToast,
    currency,
    setCurrency,
  } = useInventory();

  // Pin management
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      showToast('Protection PIN updated');
      setPinChangeOpen(false);
      setCurrentPin('');
      setNewPin('');
      setPinMessage(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-20 md:pb-8">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c826e] block">
          SYSTEM CONFIGURATION
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1b1915] mt-1 tracking-tight">
          System &amp; PIN
        </h1>
      </div>

      {/* Currency Standard: Philippines Standard (Only Peso) */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#7c7156]" />
            Store Currency Standard
          </h3>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#57795c] bg-[#eef2ec] border border-[#d2dfcf] px-2.5 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Philippines (₱ Only)
          </span>
        </div>
        <div className="p-4 rounded-xl border border-[#9c8f6f] bg-[#efeadc] text-[#1b1915] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b1915] text-white flex items-center justify-center font-bold font-sans text-xl shadow-xs">
              ₱
            </div>
            <div>
              <div className="text-base font-bold font-serif text-[#1b1915]">
                Philippine Peso (₱ / PHP)
              </div>
              <div className="text-xs text-[#7c7156] mt-0.5">
                Exclusive store standard · Sleek non-bulky formatting
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security PIN Protection */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#7c7156]" />
              Admin Security PIN
            </h3>
            <p className="text-xs text-[#8c8878] mt-0.5">
              Required for deleting catalog items and restricted administrator changes.
            </p>
          </div>
          <button
            onClick={() => setPinChangeOpen(!pinChangeOpen)}
            className="px-3.5 py-1.5 text-xs font-semibold border border-[#e7e2d4] text-[#1b1915] hover:bg-[#faf8f4] rounded-xl transition-colors"
          >
            {pinChangeOpen ? 'Cancel' : 'Change PIN'}
          </button>
        </div>

        {pinChangeOpen && (
          <form onSubmit={handleUpdatePin} className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-3 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#56534a] mb-1">
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#56534a] mb-1">
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
              className="px-4 py-2 bg-[#1b1915] text-white text-xs font-semibold rounded-lg hover:bg-[#34302a]"
            >
              Save New PIN
            </button>
          </form>
        )}
      </div>

      {/* Cloud Database & Storage Status */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#7c7156]" />
          Persistent Storage &amp; Cache
        </h3>

        <div className="space-y-3 text-xs divide-y divide-[#f0ece0]">
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#56534a]">Sync Connection</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#57795c]">
              <span className="w-2 h-2 rounded-full bg-[#57795c]" />
              Persistent client storage synced
            </span>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-[#56534a]">Catalog Size</span>
            <span className="font-semibold text-[#1b1915]">
              {items.length} SKUs ({items.reduce((s, i) => s + i.stock, 0)} units total)
            </span>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-[#56534a]">Last Synced</span>
            <span className="text-[#8c8878]">
              {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#f0ece0]">
          <button
            onClick={() => {
              if (window.confirm('Reset all inventory and sales to the baseline 8 fragrances?')) {
                resetDemoData();
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold border border-[#ecdccf] text-[#a05539] hover:bg-[#f8ede5] rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Baseline Inventory
          </button>
        </div>
      </div>
    </div>
  );
};
