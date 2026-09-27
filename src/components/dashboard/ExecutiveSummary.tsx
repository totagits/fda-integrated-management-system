import React from 'react';
import { useApp } from '../../context/AppContext';
import { FDA_LOGO_URL } from '../../assets/logo';
import {
  Users,
  DollarSign,
  Box,
  TreePine,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Calendar
} from 'lucide-react';

export const ExecutiveSummary: React.FC = () => {
  const {
    currentPersona,
    employees,
    budgetVotes,
    paymentVouchers,
    purchaseOrders,
    fixedAssets,
    timberConcessions,
    rangerIncidents,
    countyStatuses,
    authorizeVoucherMD,
    approveVoucherFinance,
    openPrintModal,
    syncCountyOffice,
    setActiveModule
  } = useApp();

  // Financial aggregates
  const totalAllotmentUSD = budgetVotes.reduce((acc, v) => acc + v.annualAllotmentUSD, 0);
  const totalCommittedUSD = budgetVotes.reduce((acc, v) => acc + v.committedUSD, 0);
  const totalExpendedUSD = budgetVotes.reduce((acc, v) => acc + v.actualSpentUSD, 0);
  const budgetExecutionRate = ((totalCommittedUSD / totalAllotmentUSD) * 100).toFixed(1);

  // Asset aggregates
  const totalAssetValue = fixedAssets.reduce((acc, a) => acc + a.currentBookValueUSD, 0);

  // Approvals awaiting Managing Director or Finance
  const pendingMDVouchers = paymentVouchers.filter(v => v.status === 'FINANCE_APPROVED');
  const pendingFinanceVouchers = paymentVouchers.filter(v => v.status === 'AUDIT_REVIEW');
  const highSeverityIncidents = rangerIncidents.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL');

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome Callout */}
      <div className="bg-gradient-to-r from-forest-900 via-forest-800 to-forest-900 rounded-xl p-6 text-white shadow-lg border border-forest-700/60 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <img src={FDA_LOGO_URL} alt="FDA Seal" className="w-80 h-80 object-contain" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-gold-500/20 text-gold-300 border border-gold-400/30 text-xs px-2.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                Executive Management Information System
              </span>
              <span className="text-xs text-forest-200">
                FY2026 Operational Period
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              Welcome, {currentPersona.name}
            </h1>
            <p className="text-sm text-forest-100 max-w-2xl mt-1">
              Forestry Development Authority Headquarters — Whein Town, Bernard Farm, Montserrado County.
              Decentralized command across 15 Liberia county depots and forest reserves.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveModule('HRMIS')}
              className="inline-flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3.5 py-2.5 rounded-lg font-bold shadow-sm transition border border-emerald-600"
            >
              <Calendar className="w-4 h-4 text-emerald-200" />
              <span>Request Leave / Rest</span>
            </button>
            <button
              onClick={() => openPrintModal({
                type: 'PAYMENT_VOUCHER',
                data: paymentVouchers[0]
              })}
              className="inline-flex items-center space-x-1.5 bg-forest-700 hover:bg-forest-600 text-white text-xs px-3 py-2.5 rounded-lg font-medium shadow-sm transition border border-forest-600"
            >
              <Printer className="w-4 h-4" />
              <span>Sample Official Voucher</span>
            </button>
            <button
              onClick={() => setActiveModule('RTM')}
              className="inline-flex items-center space-x-1.5 bg-gold-600 hover:bg-gold-500 text-slate-950 text-xs px-3 py-2.5 rounded-lg font-bold shadow-md transition"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Inspect Traceability (RTM)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Personnel */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff & Rangers</span>
            <div className="p-2 bg-forest-50 text-forest-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{employees.length * 28 + 14}</p>
          <div className="flex items-center space-x-2 mt-2 text-xs">
            <span className="text-emerald-700 font-semibold flex items-center">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              CSA HRMIS Synced
            </span>
            <span className="text-slate-400">• 15 Counties</span>
          </div>
        </div>

        {/* KPI 2: FY Budget Commitment */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FY2026 Vote Allocation</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">${(totalAllotmentUSD / 1000000).toFixed(2)}M USD</p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Committed: ${(totalCommittedUSD / 1000000).toFixed(2)}M</span>
            <span className="font-bold text-forest-700">{budgetExecutionRate}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-forest-700 h-1.5 rounded-full"
              style={{ width: `${budgetExecutionRate}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 3: Fixed Assets */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fixed Asset Registry</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">${(totalAssetValue / 1000).toFixed(0)}k USD</p>
          <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{fixedAssets.length} Major Units</span>
            <span>• Straight-Line Deprec.</span>
          </div>
        </div>

        {/* KPI 4: Forestry Concessions & Incidents */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Concessions & CoC</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <TreePine className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{timberConcessions.length} Concessions</p>
          <div className="flex items-center space-x-2 mt-2 text-xs">
            <span className="text-amber-800 font-semibold">SGS LiberTrace</span>
            <span className="text-slate-400">• {highSeverityIncidents.length} Alert Cases</span>
          </div>
        </div>

      </div>

      {/* Two-Column Work Desk: Executive Approvals Queue & County Decentralization Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Immediate Authorization Desk (8 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Executive Approvals Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-forest-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Priority Approval Queue (Maker-Checker Workflow)
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Segregation of Duties Enforced
              </span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {/* Managing Director Authorizations */}
              {pendingMDVouchers.length > 0 && (
                <div className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Awaiting Managing Director Sign-Off
                    </span>
                    <span className="text-[11px] text-slate-400">Hon. Rudolph J. Merab, Sr.</span>
                  </div>
                  {pendingMDVouchers.map(v => (
                    <div key={v.id} className="p-3 bg-amber-50/40 rounded-lg border border-amber-200/60 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{v.voucherNo}</span>
                          <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            ${v.amountUSD.toLocaleString()} USD
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-1">{v.payee} — {v.description}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Vote Code: {v.voteCode}</p>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                        {currentPersona.role === 'MANAGING_DIRECTOR' ? (
                          <button
                            onClick={() => authorizeVoucherMD(v.id)}
                            className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3 py-1.5 rounded font-bold shadow-sm transition flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Authorize & Sign</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-amber-800 bg-amber-100/80 px-2 py-1 rounded italic font-medium">
                            Requires MD Persona
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Finance Director Certifications */}
              {pendingFinanceVouchers.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Awaiting Finance Director Verification
                    </span>
                    <span className="text-[11px] text-slate-400">J. Varney Kpaiseh</span>
                  </div>
                  {pendingFinanceVouchers.map(v => (
                    <div key={v.id} className="p-3 bg-blue-50/30 rounded-lg border border-blue-200/60 mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{v.voucherNo}</span>
                          <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                            ${v.amountUSD.toLocaleString()} USD
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-1">{v.payee} — {v.description}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Vote Code: {v.voteCode}</p>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                        {currentPersona.role === 'FINANCE_DIRECTOR' || currentPersona.role === 'MANAGING_DIRECTOR' ? (
                          <button
                            onClick={() => approveVoucherFinance(v.id)}
                            className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded font-bold shadow-sm transition"
                          >
                            Verify Vote Book
                          </button>
                        ) : (
                          <span className="text-[10px] text-blue-800 bg-blue-100/80 px-2 py-1 rounded italic font-medium">
                            Requires Finance Persona
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingMDVouchers.length === 0 && pendingFinanceVouchers.length === 0 && (
                <div className="py-8 text-center text-slate-500">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-700">All payment vouchers are cleared.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No pending executive authorizations in current batch.</p>
                </div>
              )}
            </div>
          </div>

          {/* Critical Forest Protection & Ranger Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Recent High-Priority Field Ranger Incident Reports
                </h3>
              </div>
              <button
                onClick={() => setActiveModule('OPERATIONS')}
                className="text-xs text-forest-700 hover:text-forest-900 font-semibold flex items-center"
              >
                <span>View All In Operations</span>
                <ArrowUpRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {rangerIncidents.slice(0, 2).map(inc => (
                <div key={inc.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800">{inc.incidentNo}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                      inc.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {inc.severity} SEVERITY
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-1">
                    {inc.county} County • {inc.type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                    {inc.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span>Reported by: {inc.reportedBy}</span>
                    <span>Status: <strong className="text-slate-800">{inc.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: County Decentralization & Synchronization (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Liberia County Operations & Sync
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">15 Counties</span>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                Decentralized depots maintain offline transactional logs, syncing with Whein Town HQ when satellite/cellular connectivity is established.
              </p>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {countyStatuses.map(station => (
                  <div
                    key={station.county}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-900">{station.county} County</span>
                        <span className="text-[10px] text-slate-500">({station.region.split(' - ')[1]})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{station.stationHub}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-600 mt-1">
                        <span>{station.rangersOnDuty} Rangers</span>
                        <span>•</span>
                        <span>{station.activeConcessions} Concessions</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1.5 shrink-0">
                      {station.syncStatus === 'SYNCED_REALTIME' ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                          Synced
                        </span>
                      ) : (
                        <button
                          onClick={() => syncCountyOffice(station.county)}
                          className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 transition"
                          title="Click to force offline sync"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Sync ({station.pendingRecords})
                        </button>
                      )}
                      <span className="text-[9px] text-slate-400">
                        {station.lastSyncTimestamp.split(' ')[1] || 'Offline'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Regulatory Reference Card */}
          <div className="bg-forest-50 rounded-xl p-4 border border-forest-200 text-xs text-forest-900 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-forest-800">
              <TreePine className="w-4 h-4 text-forest-700" />
              <span>National Regulatory Gateways Status</span>
            </div>
            <p className="text-[11px] text-forest-700 leading-relaxed">
              In full accordance with REOI & TOR §3, transactions comply with the <strong>Act Creating the Forestry Development Authority (1976)</strong> and the <strong>National Forestry Reform Law (2006)</strong>, interfacing directly with <strong>GoL IFMIS</strong>, <strong>CSA HRMIS</strong>, and <strong>SGS LiberTrace</strong>.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
