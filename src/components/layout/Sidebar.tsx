import React from 'react';
import { useApp, AppModule, ROLE_ALLOWED_MODULES } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Coins,
  ShoppingCart,
  Box,
  TreePine,
  ShieldCheck,
  History,
  Server,
  ChevronRight,
  Sparkles,
  MapPin,
  LogOut,
  Shield
} from 'lucide-react';

interface NavItem {
  id: AppModule;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: number;
  highlight?: boolean;
}

export const Sidebar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    currentPersona,
    leaveRequests,
    paymentVouchers,
    purchaseOrders,
    depotTransfers,
    rangerIncidents,
    logoutToPublicPortal
  } = useApp();

  // Compute pending actionable items for dynamic badges
  const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING_HR' || l.status === 'PENDING_SUPERVISOR').length;
  const pendingVouchers = paymentVouchers.filter(v => v.status === 'AUDIT_REVIEW' || v.status === 'FINANCE_APPROVED').length;
  const pendingPOs = purchaseOrders.filter(po => po.threeWayMatch.status === 'PENDING').length;
  const activeTransfers = depotTransfers.filter(t => t.status === 'IN_TRANSIT').length;
  const openIncidents = rangerIncidents.filter(i => i.status === 'INVESTIGATING' || i.status === 'ESCALATED_TO_MD').length;

  const allNavItems: NavItem[] = [
    {
      id: 'DASHBOARD',
      label: 'Executive Overview',
      subtitle: 'KPIs, Vote Book & County Map',
      icon: LayoutDashboard
    },
    {
      id: 'HRMIS',
      label: 'HRMIS & Payroll',
      subtitle: 'Civil Service, Biometrics, USD/LRD',
      icon: Users,
      badge: pendingLeaves > 0 ? pendingLeaves : undefined
    },
    {
      id: 'FINANCE',
      label: 'Finance & Vote Book',
      subtitle: 'Budget Ceilings, Vouchers & IFMIS',
      icon: Coins,
      badge: pendingVouchers > 0 ? pendingVouchers : undefined
    },
    {
      id: 'PROCUREMENT',
      label: 'Procurement & PPCC',
      subtitle: 'Tenders, 3-Way Match & Vendors',
      icon: ShoppingCart,
      badge: pendingPOs > 0 ? pendingPOs : undefined
    },
    {
      id: 'ASSETS',
      label: 'Asset & Inventory',
      subtitle: 'Fixed Asset Register, QR & Depots',
      icon: Box,
      badge: activeTransfers > 0 ? activeTransfers : undefined
    },
    {
      id: 'OPERATIONS',
      label: 'Forestry Operations',
      subtitle: 'Field-to-HQ Sync & Concessions',
      icon: TreePine,
      badge: openIncidents > 0 ? openIncidents : undefined
    },
    {
      id: 'RTM',
      label: 'Requirements Traceability',
      subtitle: 'REOI & TOR Compliance Matrix',
      icon: ShieldCheck,
      highlight: true
    },
    {
      id: 'AUDIT',
      label: 'Immutable Audit Trail',
      subtitle: 'Cryptographic Event Verification',
      icon: History
    },
    {
      id: 'SECURITY',
      label: 'System Architecture',
      subtitle: 'Core ERP, Gateways & Tech Specs',
      icon: Server,
      highlight: true
    }
  ];

  // Filter menus based on active persona's RBAC permissions
  const allowed = ROLE_ALLOWED_MODULES[currentPersona.role] || ['DASHBOARD'];
  const visibleNavItems = allNavItems.filter(item => allowed.includes(item.id));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-5rem)]">
      
      {/* Active User / Role Badge */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-gold-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Role Context:</span>
        </div>
        <p className="text-xs font-bold text-white mt-1 truncate">{currentPersona.title}</p>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span className="text-emerald-400 font-mono">RBAC Filtered</span>
          <span>{visibleNavItems.length} Menus Authorized</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-forest-700 text-white shadow-md shadow-forest-950/40'
                  : item.highlight
                  ? 'bg-amber-950/30 text-amber-200 hover:bg-amber-900/40 border border-amber-800/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-amber-400'
                      : 'text-slate-400 group-hover:text-emerald-400'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tracking-tight">{item.label}</span>
                    {item.highlight && (
                      <Sparkles className="w-3 h-3 text-amber-300" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] leading-tight ${
                      isActive ? 'text-forest-100' : 'text-slate-400'
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                      isActive
                        ? 'bg-white text-forest-800'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform ${
                    isActive ? 'text-white translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Logout / Return to Public Portal */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
        <button
          onClick={logoutToPublicPortal}
          className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-red-950/60 text-slate-300 hover:text-red-300 text-xs font-semibold transition flex items-center justify-center space-x-2 border border-slate-700/80 hover:border-red-800/60"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out / Public Portal</span>
        </button>

        <div className="text-[10px] text-slate-500 text-center">
          <span>Whein Town HQ • 15 County Depots</span>
        </div>
      </div>
    </aside>
  );
};
