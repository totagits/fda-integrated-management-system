import React from 'react';
import { AppProvider, useApp, ROLE_ALLOWED_MODULES } from './context/AppContext';
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
import { LandingPage } from './components/public/LandingPage';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeModule, setActiveModule, currentPersona } = useApp();

  const allowedModules = ROLE_ALLOWED_MODULES[currentPersona.role] || ['DASHBOARD'];
  const isAuthorized = allowedModules.includes(activeModule);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100/60">
          <div className="max-w-7xl mx-auto">
            {!isAuthorized ? (
              <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Restricted Module Access (RBAC)</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your active role <strong>{currentPersona.title}</strong> ({currentPersona.name}) is not authorized to access this department's workflows.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveModule('DASHBOARD')}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-forest-800 hover:bg-forest-700 text-white rounded-lg text-xs font-bold transition shadow"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Authorized Dashboard</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeModule === 'DASHBOARD' && <ExecutiveSummary />}
                {activeModule === 'HRMIS' && <HRMISModule />}
                {activeModule === 'FINANCE' && <FinanceModule />}
                {activeModule === 'PROCUREMENT' && <ProcurementModule />}
                {activeModule === 'ASSETS' && <AssetModule />}
                {activeModule === 'OPERATIONS' && <OperationsModule />}
                {activeModule === 'RTM' && <RTMModule />}
                {activeModule === 'AUDIT' && <AuditModule />}
                {activeModule === 'SECURITY' && <SecurityModule />}
              </>
            )}
          </div>
        </main>
      </div>

      <PrintModal />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isPublicPortal } = useApp();

  if (isPublicPortal) {
    return (
      <>
        <LandingPage />
        <PrintModal />
      </>
    );
  }

  return <MainLayout />;
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
