import React, { useState } from 'react';
import { Users, UserPlus, Shield, User, CheckCircle2, X } from 'lucide-react';
import { useInventory } from '../context/InventoryContext.js';

export const StaffView: React.FC = () => {
  const { personnel, addPersonnel, currentUser } = useInventory();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;
    addPersonnel(name, username);
    setName('');
    setUsername('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1b1915] mt-1 tracking-tight">
            Accounts
          </h1>
        </div>
      </div>

      {/* Staff Members List */}
      <div className="bg-white border border-[#e7e2d4] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#e7e2d4] bg-[#faf8f4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[#8c826e]" />
            <h3 className="font-serif text-base font-bold text-[#1b1915]">
              Active Boutique Team ({personnel.length})
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
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#faf8f4] transition-colors"
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

                <div className="flex items-center gap-3">
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

      {/* Role Privileges Overview Card */}
      <div className="bg-white border border-[#e7e2d4] rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1b1915]">
          Boutique Role Privileges
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-2">
            <div className="font-bold text-sm text-[#1b1915] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#7c7156]" />
              <span>Director (Admin)</span>
            </div>
            <ul className="space-y-1.5 text-[#56534a] pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#57795c]" />
                <span>Full catalog management &amp; price overrides</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#57795c]" />
                <span>Add new staff &amp; configure system security PIN</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#57795c]" />
                <span>Generate PDF valuation &amp; audit backups</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl space-y-2">
            <div className="font-bold text-sm text-[#1b1915] flex items-center gap-2">
              <User className="w-4 h-4 text-[#7c7156]" />
              <span>Associate (Personnel)</span>
            </div>
            <ul className="space-y-1.5 text-[#56534a] pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#57795c]" />
                <span>Camera barcode scanning &amp; quick stock replenishment</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#57795c]" />
                <span>Record customer sales &amp; decrement inventory</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#57795c]" />
                <span>Protected against accidental item deletion</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Personnel Modal */}
      {isAddOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#e7e2d4] shadow-2xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7e2d4] bg-[#faf8f4]">
              <h3 className="font-serif text-base font-bold text-[#1b1915]">
                Add Boutique Staff
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#56534a] hover:bg-[#f2efe6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jean Dupont"
                  className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#56534a]">
                  Username (Login handle)
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jeand"
                  className="w-full px-3.5 py-2.5 bg-[#faf8f4] border border-[#e7e2d4] rounded-xl text-sm text-[#1b1915]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#e7e2d4]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs border border-[#e7e2d4] hover:bg-[#f2efe6] text-[#1b1915]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs bg-[#1b1915] text-white hover:bg-[#34302a] shadow-xs"
                >
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
