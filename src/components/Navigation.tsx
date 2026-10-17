import React from 'react';
import {
  Home,
  Package,
  QrCode,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  Camera,
  Shield,
  User,
} from 'lucide-react';
import { BottleLogo } from './BottleLogo.js';
import { useInventory } from '../context/InventoryContext.js';
import type { ActiveTab } from '../types/inventory.js';

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsScannerOpen,
    currentUser,
    logout,
  } = useInventory();

  const navItems = [
    { key: 'dashboard' as ActiveTab, label: 'Home', icon: Home },
    { key: 'inventory' as ActiveTab, label: 'Inventory', icon: Package },
    { key: 'scan' as ActiveTab, label: 'Scan', icon: QrCode, isScanAction: true },
    { key: 'reports' as ActiveTab, label: 'Reports', icon: FileText },
    { key: 'sales' as ActiveTab, label: 'Purchase History', icon: DollarSign },
    { key: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#faf8f4] border-r border-[#e7e2d4] p-6 sticky top-0 h-screen select-none">
        {/* Original Logo */}
        <BottleLogo size={32} showSubtitle={true} className="mb-2" />

        <div className="h-px bg-[#e7e2d4] my-4" />

        {/* Primary Nav Links */}
        <nav className="flex flex-col gap-1.5 flex-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-[#efeadc] text-[#242119] font-semibold'
                    : 'text-[#56534a] hover:bg-[#f2efe6] hover:text-[#242119]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#7c7156]' : 'text-[#8c8878]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Session & Log Out */}
        <div className="pt-4 border-t border-[#e7e2d4] space-y-3">
          <div className="p-3 bg-white border border-[#e7e2d4] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  currentUser?.role === 'admin'
                    ? 'bg-[#efeadc] text-[#7c7156]'
                    : 'bg-[#f2efe6] text-[#56534a]'
                }`}
              >
                {currentUser?.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 truncate">
                <div className="text-xs font-bold text-[#242119] truncate">
                  {currentUser?.name || 'Staff Member'}
                </div>
                <div className="text-[10px] font-semibold uppercase text-[#7c7156]">
                  {currentUser?.role === 'admin' ? 'Administrator' : 'Personnel'}
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log Out"
              aria-label="Log Out"
              className="p-1.5 text-[#a05539] hover:bg-[#f8ede5] rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#faf8f4] border-b border-[#e7e2d4]">
        <BottleLogo size={24} showSubtitle={false} />

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              currentUser?.role === 'admin'
                ? 'bg-[#efeadc] text-[#7c7156]'
                : 'bg-[#f2efe6] text-[#56534a]'
            }`}
          >
            {currentUser?.name}
          </span>
          <button
            onClick={logout}
            aria-label="Log Out"
            className="p-1.5 text-[#a05539] hover:bg-[#f8ede5] rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
              activeTab === 'scan' ? 'bg-[#9c8f6f] text-white' : 'bg-[#242119] text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e7e2d4] px-1 py-1.5 flex justify-around items-center shadow-lg"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => {
                setActiveTab(item.key);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors ${
                isActive ? 'text-[#242119]' : 'text-[#8c8878]'
              }`}
            >
              <div
                className={`p-1 rounded-md ${
                  item.isScanAction
                    ? 'bg-[#242119] text-white p-1.5 -mt-3 shadow-md border-2 border-white'
                    : isActive
                    ? 'bg-[#efeadc] text-[#7c7156]'
                    : ''
                }`}
              >
                <Icon className={item.isScanAction ? 'w-5 h-5' : 'w-4 h-4'} />
              </div>
              <span className={`text-[10px] mt-0.5 truncate ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
