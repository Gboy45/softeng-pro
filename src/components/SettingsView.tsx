import React, { useState } from 'react';
import {
  Settings,
  Database,
  Lock,
  RefreshCw,
  Users,
  Shield,
  Cloud,
  Check,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';

export const SettingsView: React.FC = () => {
  const {
    items,
    personnel,
    syncStatus,
    lastSyncedAt,
    resetDemoData,
    verifyPin,
    updatePin,
    showToast,
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
    <div className="space-y-6 max-w-3xl pb-16 md:pb-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#7c7156]">
          Configuration
        </span>
        <h2 className="font-serif text-2xl font-bold text-[#242119]">
          Store Settings &amp; Data
        </h2>
      </div>

      {/* Cloud Database & Storage Status */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <h3 className="font-serif text-base font-bold text-[#242119] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#7c7156]" />
          Storage &amp; Cloud Database
        </h3>

        <div className="space-y-3 text-xs divide-y divide-[#f0ece0]">
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#56534a]">Database Status</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#57795c]">
              <span className="w-2 h-2 rounded-full bg-[#57795c]" />
              Real-Time Cloud Synced
            </span>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-[#56534a]">Catalog Size</span>
            <span className="font-semibold text-[#242119]">
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

        <div className="pt-2">
          <button
            onClick={() => {
              if (window.confirm('Reset all inventory and sales to default sample products?')) {
                resetDemoData();
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-[#a05539] hover:bg-[#f8ede5] border border-[#ecdccf] rounded-lg transition-colors"
          >
            Reset Demo Data
          </button>
        </div>
      </div>

      {/* Security & Deletion PIN */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-serif text-base font-bold text-[#242119] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#7c7156]" />
              Deletion Protection PIN
            </h3>
            <p className="text-xs text-[#8c8878]">
              Required to authorize removing products or wiping data.
            </p>
          </div>
          <button
            onClick={() => setPinChangeOpen(!pinChangeOpen)}
            className="px-3.5 py-1.5 text-xs font-semibold border border-[#e7e2d4] text-[#242119] hover:bg-[#faf8f4] rounded-lg transition-colors"
          >
            {pinChangeOpen ? 'Cancel' : 'Change PIN'}
          </button>
        </div>

        {pinChangeOpen && (
          <form onSubmit={handleUpdatePin} className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-3">
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
                  className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119]"
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
                  className="w-full px-3 py-2 bg-white border border-[#e7e2d4] rounded-lg text-sm font-mono text-[#242119]"
                />
              </div>
            </div>

            {pinMessage && <p className="text-xs text-[#a05539] font-medium">{pinMessage}</p>}

            <button
              type="submit"
              className="px-4 py-2 bg-[#242119] text-white text-xs font-semibold rounded-lg hover:bg-[#34302a]"
            >
              Save New PIN
            </button>
          </form>
        )}
      </div>

      {/* Staff & Personnel Accounts */}
      <div className="p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-serif text-base font-bold text-[#242119] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7c7156]" />
              Personnel Accounts
            </h3>
            <p className="text-xs text-[#8c8878]">
              Authorized retail personnel for stock management.
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#f0ece0]">
          {personnel.map((p) => (
            <div key={p.id} className="py-2.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-[#242119]">{p.name}</div>
                <div className="text-[11px] text-[#8c8878]">@{p.username}</div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  p.status === 'active'
                    ? 'bg-[#eef2ec] text-[#57795c]'
                    : 'bg-[#faf8f4] text-[#8c8878]'
                }`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
