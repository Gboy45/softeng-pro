import React, { useState } from 'react';
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
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';

export const AccountsView: React.FC = () => {
  const {
    personnel,
    currentUser,
    logout,
    items,
    lastSyncedAt,
    resetDemoData,
    verifyPin,
    updatePin,
    showToast,
  } = useInventory();

  const isAdminAccount = currentUser?.role === 'admin';

  // PIN management state (Admin only)
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinChangeOpen, setPinChangeOpen] = useState(false);
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAccount) {
      showToast('Only the Boutique Director can change the security PIN');
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
      showToast('Director protection PIN updated');
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
            {currentUser?.name || 'Boutique Director'}
          </div>
          <div className="text-[11px] font-semibold uppercase text-[#8c826e] tracking-tight mt-0.5">
            {isAdminAccount ? 'DIRECTOR (ADMIN)' : 'BOUTIQUE PERSONNEL'}
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

      {/* Staff Roster Card */}
      <div className="bg-white border border-[#e7e2d4] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#e7e2d4] bg-[#faf8f4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#8c826e]" />
            <h3 className="font-serif text-base font-bold text-[#1b1915]">
              Accounts
            </h3>
          </div>
          <span className="text-xs text-[#8c8878]">
            Logged in as: <strong className="text-[#1b1915]">{currentUser?.name}</strong>
          </span>
        </div>

        <div className="divide-y divide-[#f0ece0]">
          {personnel.map((p) => {
            const isAdmin = p.username === 'ferdie';
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
                        {isAdmin ? 'Boutique Director (Admin)' : 'Boutique Associate (Personnel)'}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-xs text-[#8c8878]">
                    Added: {p.createdAt}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#eef2ec] text-[#57795c] border border-[#d2dfcf]">
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Director Security PIN Protection — Personnel accounts CANNOT change the PIN */}
      <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#7c7156]" />
            Director Security PIN
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
              <Lock className="w-3 h-3" /> Director Only
            </span>
          )}
        </div>
        <p className="text-xs text-[#8c8878]">
          Restricts item deletion and administrative privileges to authorized directors.
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

      {/* Storage & Reset Data */}
      <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3">
        <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#7c7156]" />
          Persistent Storage &amp; Cache
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          <div className="space-y-1">
            <span className="text-[#56534a] block">
              Catalog: <strong className="text-[#1b1915]">{items.length} SKUs</strong> ({items.reduce((s, i) => s + i.stock, 0)} bottles)
            </span>
            <span className="text-[#8c8878] block">
              Last Synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Just now'}
            </span>
          </div>

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

      {/* Option B: HTML System Export & Original Files Backup Status */}
      <div className="p-4 sm:p-5 bg-white border border-[#e7e2d4] rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-base font-bold text-[#1b1915] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#57795c]" />
              HTML Architecture (Option B) &amp; Backup
            </h3>
            <p className="text-xs text-[#8c8878] mt-0.5">
              Partially Full HTML mode is active in <code className="text-[#1b1915]">index.html</code>. Full original files are safely backed up in <code className="text-[#1b1915]">/backup_original/</code>.
            </p>
          </div>
          <a
            href="/perfume-inventory-system.html"
            download="perfume-inventory-system.html"
            onClick={() => showToast('Downloading runnable HTML system file...')}
            className="px-3.5 py-2 text-xs font-bold bg-[#242119] hover:bg-[#34302a] text-white rounded-xl inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
          >
            Download Runnable HTML (.html)
          </a>
        </div>
      </div>
    </div>
  );
};

