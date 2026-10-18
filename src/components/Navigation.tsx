import React from 'react';
import {
  LayoutGrid,
  Package,
  ScanLine,
  ReceiptText,
  FileText,
  Users,
  Settings,
  Plus,
  UserCheck,
  LogOut,
  Camera,
  Sparkles,
} from 'lucide-react';
import { BottleLogo } from './BottleLogo.js';
import { useInventory } from '../context/InventoryContext.js';
import type { ActiveTab } from '../types/inventory.js';

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    logout,
    setIsAddItemOpen,
  } = useInventory();

  // Exactly matching the 7 menu items in the screenshots
  const navItems = [
    { key: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutGrid },
    { key: 'inventory' as ActiveTab, label: 'Perfume Inventory', icon: Package },
    { key: 'scan' as ActiveTab, label: 'Barcode Scanner', icon: ScanLine },
    { key: 'sales' as ActiveTab, label: 'Purchase History', icon: ReceiptText },
    { key: 'reports' as ActiveTab, label: 'Reports & Export', icon: FileText },
    { key: 'staff' as ActiveTab, label: 'Staff & Accounts', icon: Users },
    { key: 'settings' as ActiveTab, label: 'System & PIN', icon: Settings },
  ];

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#faf8f4] border-r border-[#e7e2d4] p-6 sticky top-0 h-screen select-none justify-between">
        {/* Top: Brand Header & Navigation Links */}
        <div className="space-y-6">
          {/* Restored Original Logo */}
          <div className="pb-5 border-b border-[#e7e2d4]">
            <BottleLogo size={32} showSubtitle={true} className="px-0.5" />
          </div>

          {/* 7 Nav Items */}
          <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left font-sans ${
                    isActive
                      ? 'bg-[#efeadc] text-[#1b1915] font-semibold shadow-2xs'
                      : 'text-[#56534a] hover:bg-[#f2efe6] hover:text-[#1b1915] font-medium'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#1b1915]' : 'text-[#8c826e]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: + Add Perfume Item Button & Active Session */}
        <div className="space-y-3.5 pt-4 border-t border-[#e7e2d4]">
          {/* Black Pill Button: + Add Perfume Item */}
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b1915] hover:bg-[#2d2922] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e7e2d4]" />
            <span>Add Perfume Item</span>
          </button>

          {/* Active Session Card */}
          <div className="p-3 bg-white border border-[#e7e2d4] rounded-xl flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8c826e] leading-tight">
                ACTIVE SESSION
              </span>
              <div className="text-xs font-bold text-[#1b1915] truncate mt-0.5">
                {currentUser?.name || 'Boutique Director'}
              </div>
              <div className="text-[10px] font-semibold uppercase text-[#8c826e] tracking-tight">
                {currentUser?.role === 'admin' ? 'DIRECTOR (ADMIN)' : 'BOUTIQUE PERSONNEL'}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-[#faf8f4] flex items-center justify-center text-[#8c826e]">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <button
                onClick={logout}
                title="Log Out"
                aria-label="Log Out"
                className="p-1 text-[#8c826e] hover:text-[#a05539] hover:bg-[#f8ede5] rounded-md transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sync Status Line */}
          <div className="flex items-center gap-1.5 px-1 text-[11px] text-[#56534a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#57795c] animate-pulse" />
            <span>Persistent client storage synced</span>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#faf8f4] border-b border-[#e7e2d4]">
        <BottleLogo size={28} showSubtitle={false} />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1b1915] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
              activeTab === 'scan' ? 'bg-[#9c8f6f] text-white' : 'bg-[#faf8f4] border border-[#e7e2d4] text-[#1b1915]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Scrollable horizontally for all 7 items) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e7e2d4] px-2 py-1.5 flex justify-between items-center shadow-lg overflow-x-auto gap-1"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex-1 min-w-[54px] flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors ${
                isActive ? 'text-[#1b1915]' : 'text-[#8c826e]'
              }`}
            >
              <div
                className={`p-1 rounded-md ${
                  isActive ? 'bg-[#efeadc] text-[#1b1915]' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[9px] mt-0.5 truncate text-center leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
