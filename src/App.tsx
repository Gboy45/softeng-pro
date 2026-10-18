import React from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext.js';
import { Navigation } from './components/Navigation.js';
import { DashboardView } from './components/DashboardView.js';
import { InventoryView } from './components/InventoryView.js';
import { ScanView } from './components/ScanView.js';
import { ReportsView } from './components/ReportsView.js';
import { PurchaseHistoryView } from './components/PurchaseHistoryView.js';
import { StaffView } from './components/StaffView.js';
import { SettingsView } from './components/SettingsView.js';
import { ItemEditModal } from './components/ItemEditModal.js';
import { AddItemModal } from './components/AddItemModal.js';
import { RecordSaleModal } from './components/RecordSaleModal.js';
import { LoginScreen } from './components/LoginScreen.js';
import { Camera } from 'lucide-react';

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
    <div className="min-h-screen bg-[#faf8f4] text-[#1b1915] flex flex-col md:flex-row font-sans">
      {/* Navigation Shell */}
      <Navigation />

      {/* Main View Area with Smooth Menu Transitions */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div key={activeTab} className="animate-menu-transition">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'scan' && <ScanView />}
          {activeTab === 'sales' && <PurchaseHistoryView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'staff' && <StaffView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Floating Action Button (FAB) on Mobile for One-Tap Scan View */}
      {activeTab !== 'scan' && (
        <button
          onClick={() => setActiveTab('scan')}
          aria-label="Go to Barcode Scanner"
          className="md:hidden fixed right-4 bottom-20 z-30 w-12 h-12 rounded-full bg-[#1b1915] text-white flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <Camera className="w-5 h-5 text-[#efeadc]" />
        </button>
      )}

      {/* Modals */}
      <ItemEditModal />
      <AddItemModal />
      <RecordSaleModal />

      {/* Global Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 bottom-20 md:bottom-6 -translate-x-1/2 z-60 px-4 py-2.5 bg-[#1b1915] text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 max-w-sm text-center border border-[#7c7156]/30 animate-bounce-short"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#9c8f6f]" />
          <span>{toast}</span>
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
