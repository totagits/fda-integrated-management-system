import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ExecutiveSummary } from './components/dashboard/ExecutiveSummary';
import { HRMISModule } from './components/hrmis/HRMISModule';
import { FinanceModule } from './components/finance/FinanceModule';
import { ProcurementModule } from './components/procurement/ProcurementModule';
import { AssetModule } from './components/assets/AssetModule';
import { OperationsModule } from './components/operations/OperationsModule';
import { RTMModule } from './components/governance/RTMModule';
import { AuditModule } from './components/governance/AuditModule';
import { SecurityModule } from './components/governance/SecurityModule';
import { PrintModal } from './components/ui/PrintModal';

const MainLayout: React.FC = () => {
  const { activeModule } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/60">
          <div className="max-w-7xl mx-auto">
            {activeModule === 'DASHBOARD' && <ExecutiveSummary />}
            {activeModule === 'HRMIS' && <HRMISModule />}
            {activeModule === 'FINANCE' && <FinanceModule />}
            {activeModule === 'PROCUREMENT' && <ProcurementModule />}
            {activeModule === 'ASSETS' && <AssetModule />}
            {activeModule === 'OPERATIONS' && <OperationsModule />}
            {activeModule === 'RTM' && <RTMModule />}
            {activeModule === 'AUDIT' && <AuditModule />}
            {activeModule === 'SECURITY' && <SecurityModule />}
          </div>
        </main>
      </div>

      <PrintModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
