import React, { useState } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { Dashboard } from './components/Dashboard';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { MasterDataView } from './components/MasterDataView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { NotificationPanel } from './components/NotificationPanel';
import { Footer } from './components/Footer';
import { LoginPortal } from './components/LoginPortal';

import { NewPOModal } from './components/Modals/NewPOModal';
import { MasterSKUModal } from './components/Modals/MasterSKUModal';
import { TelegramReportsModal } from './components/Modals/TelegramReportsModal';
import { SystemTestModal } from './components/Modals/SystemTestModal';
import { AuditLogsModal } from './components/Modals/AuditLogsModal';
import { SetupGuidesModal } from './components/Modals/SetupGuidesModal';
import { RecordPurchaseModal } from './components/Modals/RecordPurchaseModal';
import { ReceiveItemModal } from './components/Modals/ReceiveItemModal';
import { ImportModal } from './components/Modals/ImportModal';
import { CheckCircle2 } from 'lucide-react';

const ERPMainContent: React.FC = () => {
  const { currentView, toastMessage } = useERP();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('rl_food_logged_in') === 'true';
  });

  const handleLoginSuccess = () => {
    localStorage.setItem('rl_food_logged_in', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('rl_food_logged_in');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPortal onLoginSuccess={handleLoginSuccess} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'purchase':
        return <PurchaseOrdersView />;
      case 'inventory':
        return <InventoryView />;
      case 'reports':
        return <ReportsView />;
      case 'master-data':
        return <MasterDataView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white transition-colors duration-200">
      
      {/* Option 1 Clean Minimal Top Header */}
      <Header onLogout={handleLogout} />

      {/* Quick Action Toolbar */}
      <QuickActions />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6 py-6">
        {renderView()}
      </main>

      {/* Slide-over Notification Panel */}
      <NotificationPanel />

      {/* Enterprise Footer */}
      <Footer />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Enterprise Modals */}
      <NewPOModal />
      <MasterSKUModal />
      <TelegramReportsModal />
      <SystemTestModal />
      <AuditLogsModal />
      <SetupGuidesModal />
      <RecordPurchaseModal />
      <ReceiveItemModal />
      <ImportModal />

    </div>
  );
};

export function App() {
  return (
    <ERPProvider>
      <ERPMainContent />
    </ERPProvider>
  );
}

export default App;
