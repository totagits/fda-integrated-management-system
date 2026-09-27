import React from 'react';
import { useApp, AppModule } from '../../context/AppContext';
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
  MapPin
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
    leaveRequests,
    paymentVouchers,
    purchaseOrders,
    depotTransfers,
    rangerIncidents,
    rtmRequirements
  } = useApp();

  // Compute pending actionable items for dynamic badges
  const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING_HR' || l.status === 'PENDING_SUPERVISOR').length;
  const pendingVouchers = paymentVouchers.filter(v => v.status === 'AUDIT_REVIEW' || v.status === 'FINANCE_APPROVED').length;
  const pendingPOs = purchaseOrders.filter(po => po.threeWayMatch.status === 'PENDING').length;
  const activeTransfers = depotTransfers.filter(t => t.status === 'IN_TRANSIT').length;
  const openIncidents = rangerIncidents.filter(i => i.status === 'INVESTIGATING' || i.status === 'ESCALATED_TO_MD').length;

  const navItems: NavItem[] = [
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
      label: 'Security & Handover',
      subtitle: 'CISSP Controls, Backups & SLA',
      icon: Server
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-5rem)]">
      {/* Intranet Station Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300">Central Hub Station:</span>
        </div>
        <p className="text-xs font-bold text-white mt-0.5">Whein Town, Bernard Farm HQ</p>
        <p className="text-[11px] text-slate-400">Montserrado County, Liberia</p>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
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

      {/* Footer Legal & Statutory Reference */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[10px] text-slate-400">
        <p className="font-semibold text-slate-300">Statutory Authority:</p>
        <p className="leading-snug mt-0.5">
          FDA Act of 1976 & National Forestry Reform Law of 2006.
        </p>
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
          <span>Release 1.0 (REOI/TOR)</span>
          <span className="text-emerald-400 font-mono">100% GoL Aligned</span>
        </div>
      </div>
    </aside>
  );
};
