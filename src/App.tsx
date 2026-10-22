import React from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext.js';
import { Navigation } from './components/Navigation.js';
import { DashboardView } from './components/DashboardView.js';
import { InventoryView } from './components/InventoryView.js';
import { ScanView } from './components/ScanView.js';
import { ReportsView } from './components/ReportsView.js';
import { PurchaseHistoryView } from './components/PurchaseHistoryView.js';
import { AccountsView } from './components/AccountsView.js';
import { ItemEditModal } from './components/ItemEditModal.js';
import { AddItemModal } from './components/AddItemModal.js';
import { RecordSaleModal } from './components/RecordSaleModal.js';
import { LoginScreen } from './components/LoginScreen.js';

const AppContent: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    toast,
  } = useInventory();

  // If user is not logged in, display the login screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1b1915] flex flex-col md:flex-row font-sans overflow-x-hidden">
      {/* Navigation Shell */}
      <Navigation />

      {/* Main View Area with Smooth Menu Transitions */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3.5 pt-3.5 pb-24 sm:p-6 lg:p-8 overflow-y-auto no-scrollbar">
        <div key={activeTab} className="animate-menu-transition">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'scan' && <ScanView />}
          {activeTab === 'sales' && <PurchaseHistoryView />}
          {activeTab === 'reports' && <ReportsView />}
          {(activeTab === 'accounts' || activeTab === 'staff' || activeTab === 'settings') && (
            <AccountsView />
          )}
        </div>
      </main>

      {/* Modals */}
      <ItemEditModal />
      <AddItemModal />
      <RecordSaleModal />

      {/* Global Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 bottom-18 md:bottom-6 -translate-x-1/2 z-60 w-[calc(100%-2rem)] sm:w-auto max-w-sm px-4 py-2.5 bg-[#1b1915] text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center justify-center gap-2 text-center border border-[#7c7156]/30 animate-bounce-short"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#9c8f6f] shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
