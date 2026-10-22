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

  // Boutique menu items synced across phone, tablet, and desktop views
  const navItems = [
    { key: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutGrid },
    { key: 'inventory' as ActiveTab, label: 'Inventory', icon: Package },
    { key: 'scan' as ActiveTab, label: 'Scan', icon: ScanLine },
    { key: 'sales' as ActiveTab, label: 'Sales', icon: ReceiptText },
    { key: 'reports' as ActiveTab, label: 'Reports', icon: FileText },
    { key: 'accounts' as ActiveTab, label: 'Settings', icon: Settings },
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

          {/* 6 Nav Items */}
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

        {/* Bottom Section: Active Session Status & Logout */}
        <div className="pt-4 border-t border-[#e7e2d4]">
          <div className="flex items-center justify-between px-1 text-xs text-[#56534a]">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#57795c] animate-pulse" />
              <span>Storage synced</span>
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="flex items-center gap-1 text-xs font-semibold text-[#8c8878] hover:text-[#a05539] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar - Sleek sticky header */}
      <header className="md:hidden sticky top-0 z-30 py-2 px-3.5 flex items-center justify-between bg-[#faf8f4]/95 backdrop-blur-md border-b border-[#e7e2d4]">
        <BottleLogo size={22} showSubtitle={false} layout="horizontal" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7c7156] bg-[#efeadc] px-2 py-0.5 rounded-md border border-[#e7e2d4]">
          {currentUser?.role === 'admin' ? 'Admin' : 'Associate'}
        </span>
      </header>

      {/* Mobile Bottom Navigation Bar - Ergonomic thumb-zone tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e7e2d4] pb-safe grid grid-cols-6 items-stretch shadow-md"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.key ||
            (item.key === 'accounts' && (activeTab === 'staff' || activeTab === 'settings'));

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 min-h-[52px] transition-all touch-manipulation active:scale-95 border-r border-[#f0ece0] last:border-r-0 ${
                isActive ? 'bg-[#faf8f4] text-[#1b1915]' : 'bg-transparent text-[#7c7156] hover:bg-[#faf8f4]'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-[#efeadc] text-[#1b1915]' : ''
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span
                className={`text-[10px] mt-0.5 truncate max-w-full px-0.5 text-center leading-tight tracking-tight ${
                  isActive ? 'font-bold text-[#1b1915]' : 'font-medium text-[#7c7156]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
