import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GrantDisbursement } from '../../types';
import {
  HandCoins, Plus, Calendar, TrendingUp
} from 'lucide-react';

const GRANT_STATUS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-red-50 text-red-700',
  COMPLETED: 'bg-blue-50 text-blue-700',
  PIPELINE: 'bg-amber-50 text-amber-700',
};

const FOCAL_COLORS: Record<string, string> = {
  CONSERVATION: 'bg-forest-50 text-forest-700',
  CAPACITY_BUILDING: 'bg-blue-50 text-blue-700',
  GOVERNANCE: 'bg-purple-50 text-purple-700',
  COMMUNITY_FORESTRY: 'bg-teal-50 text-teal-700',
  BIODIVERSITY: 'bg-emerald-50 text-emerald-700',
  CLIMATE_RESILIENCE: 'bg-sky-50 text-sky-700',
};

const DISB_STATUS: Record<string, string> = {
  RECEIVED: 'bg-emerald-50 text-emerald-700',
  ALLOCATED: 'bg-blue-50 text-blue-700',
  SPENT: 'bg-purple-50 text-purple-700',
};

export const GrantsModule: React.FC = () => {
  const { donorGrants, grantDisbursements, addGrantDisbursement, addAuditEntry } = useApp();

  const [activeTab, setActiveTab] = useState<'GRANTS' | 'DISBURSEMENTS' | 'REPORTS'>('GRANTS');
  const [showDisbModal, setShowDisbModal] = useState(false);

  const [disbForm, setDisbForm] = useState({
    disbursementNo: `DISB-${new Date().getFullYear()}-${String(grantDisbursements.length + 1).padStart(3, '0')}`,
    grantId: '',
    grantRef: '',
    donorName: '',
    amountUSD: 0,
    disbursementDate: '',
    period: '',
    bankRef: '',
    purpose: '',
    status: 'RECEIVED' as GrantDisbursement['status'],
    milestoneAchieved: '',
  });

  const today = new Date();
  const soon = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const totalPortfolio = donorGrants.reduce((s, g) => s + g.totalAmountUSD, 0);
  const totalDisbursed = donorGrants.reduce((s, g) => s + g.disbursedToDateUSD, 0);
  const totalSpent = donorGrants.reduce((s, g) => s + g.spentToDateUSD, 0);
  const activeGrants = donorGrants.filter(g => g.status === 'ACTIVE').length;
  const upcomingReports = donorGrants.filter(g => g.nextReportDue && new Date(g.nextReportDue) <= soon && g.status === 'ACTIVE').length;

  const daysUntil = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  const handleAddDisbursement = () => {
    const grant = donorGrants.find(g => g.id === disbForm.grantId);
    addGrantDisbursement({
      disbursementNo: disbForm.disbursementNo,
      grantId: disbForm.grantId,
      grantRef: grant?.grantRef || '',
      donorName: grant?.donorName || '',
      amountUSD: disbForm.amountUSD,
      disbursementDate: disbForm.disbursementDate,
      period: disbForm.period,
      bankRef: disbForm.bankRef,
      purpose: disbForm.purpose,
      status: disbForm.status,
      milestoneAchieved: disbForm.milestoneAchieved || undefined,
    });
    addAuditEntry('Grant Disbursement Recorded', 'FINANCE', `Grant: ${grant?.grantTitle}, US$${disbForm.amountUSD.toLocaleString()}`);
    setShowDisbModal(false);
    setDisbForm(f => ({ ...f, disbursementNo: `DISB-${new Date().getFullYear()}-${String(grantDisbursements.length + 2).padStart(3, '0')}`, grantId: '', amountUSD: 0, disbursementDate: '', period: '', bankRef: '', purpose: '', status: 'RECEIVED', milestoneAchieved: '' }));
  };

  const TABS = [
    { id: 'GRANTS', label: 'Active Grants', icon: HandCoins },
    { id: 'DISBURSEMENTS', label: 'Disbursements', icon: TrendingUp },
    { id: 'REPORTS', label: 'Report Calendar', icon: Calendar },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-forest-700" /> Grants &amp; Donor Funds
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">USAID, World Bank, EU &amp; CI grant tracking, disbursements &amp; donor reporting — FDA Liberia</p>
        </div>
        <div className="flex items-center gap-2">
          {upcomingReports > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">⚠ {upcomingReports} report{upcomingReports > 1 ? 's' : ''} due soon</span>
          )}
          <button onClick={() => setShowDisbModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-bold shadow transition">
            <Plus className="w-3.5 h-3.5" /> Add Disbursement
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Grant Portfolio', value: `US$${(totalPortfolio / 1e6).toFixed(2)}M`, sub: `${donorGrants.length} grants`, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Total Disbursed', value: `US$${(totalDisbursed / 1e6).toFixed(2)}M`, sub: `${totalPortfolio > 0 ? Math.round((totalDisbursed / totalPortfolio) * 100) : 0}% of portfolio`, color: 'text-forest-700', bg: 'bg-forest-50' },
          { label: 'Funds Expended', value: `US$${(totalSpent / 1e6).toFixed(2)}M`, sub: `${totalDisbursed > 0 ? Math.round((totalSpent / totalDisbursed) * 100) : 0}% of disbursed`, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Active Grants', value: activeGrants, sub: `${upcomingReports} reports due <30d`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl border border-slate-200 p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color} mt-1`}>{k.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px ${activeTab === t.id ? 'border-forest-700 text-forest-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
              {t.id === 'REPORTS' && upcomingReports > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full">{upcomingReports}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grants */}
      {activeTab === 'GRANTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {donorGrants.map(g => {
            const disbPct = g.totalAmountUSD > 0 ? Math.round((g.disbursedToDateUSD / g.totalAmountUSD) * 100) : 0;
            const spentPct = g.disbursedToDateUSD > 0 ? Math.round((g.spentToDateUSD / g.disbursedToDateUSD) * 100) : 0;
            const days = g.nextReportDue ? daysUntil(g.nextReportDue) : null;
            return (
              <div key={g.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{g.donorName}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${GRANT_STATUS[g.status] || ''}`}>{g.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{g.grantTitle}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{g.grantRef}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${FOCAL_COLORS[g.focalArea] || 'bg-slate-100 text-slate-600'}`}>
                    {g.focalArea.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2.5 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400">Total Award</p>
                    <p className="font-extrabold text-slate-800">US${(g.totalAmountUSD / 1e6).toFixed(2)}M</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Disbursed</p>
                    <p className="font-extrabold text-forest-700">US${(g.disbursedToDateUSD / 1e6).toFixed(2)}M</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Expended</p>
                    <p className="font-extrabold text-purple-700">US${(g.spentToDateUSD / 1e6).toFixed(2)}M</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Disbursement</span>
                      <span className="font-bold text-forest-700">{disbPct}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-forest-500 rounded-full" style={{ width: `${disbPct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Expenditure Rate</span>
                      <span className="font-bold text-purple-700">{spentPct}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${spentPct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{g.startDate} → {g.endDate}</span>
                  {days !== null && (
                    <span className={`font-bold ${days <= 0 ? 'text-red-600' : days <= 7 ? 'text-orange-600' : days <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {days <= 0 ? '⚠ Report OVERDUE' : `Report due in ${days}d`}
                    </span>
                  )}
                </div>

                {g.implementingPartners && g.implementingPartners.length > 0 && (
                  <div className="text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-500">Partners: </span>
                    {g.implementingPartners.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
          {donorGrants.length === 0 && <div className="lg:col-span-2 text-center text-slate-400 py-12">No grants registered</div>}
        </div>
      )}

      {/* Disbursements */}
      {activeTab === 'DISBURSEMENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Disbursement Ledger</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Disb No</th>
                <th className="px-4 py-3 text-left">Donor</th>
                <th className="px-4 py-3 text-left">Purpose</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-right">Amount (USD)</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Bank Ref</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grantDisbursements.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No disbursements recorded</td></tr>}
              {grantDisbursements.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{d.disbursementNo}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{d.donorName}</td>
                  <td className="px-4 py-3 text-slate-600">{d.purpose}</td>
                  <td className="px-4 py-3 text-slate-500">{d.period}</td>
                  <td className="px-4 py-3 text-right font-bold text-forest-700">US${d.amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-slate-500">{d.disbursementDate}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400">{d.bankRef}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${DISB_STATUS[d.status] || 'bg-slate-100 text-slate-500'}`}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Calendar */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Upcoming Donor Reports</h3>
            {donorGrants.filter(g => g.nextReportDue && g.status === 'ACTIVE').length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No upcoming reports</p>
            ) : (
              <div className="space-y-3">
                {donorGrants.filter(g => g.nextReportDue && g.status === 'ACTIVE').sort((a, b) => new Date(a.nextReportDue).getTime() - new Date(b.nextReportDue).getTime()).map(g => {
                  const days = daysUntil(g.nextReportDue);
                  const isOverdue = days < 0;
                  const isUrgent = !isOverdue && days <= 7;
                  const isWarning = !isOverdue && !isUrgent && days <= 30;
                  return (
                    <div key={g.id} className={`flex items-center justify-between p-4 rounded-xl border ${isOverdue ? 'bg-red-50 border-red-200' : isUrgent ? 'bg-orange-50 border-orange-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-sm ${isOverdue ? 'bg-red-100 text-red-700' : isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isOverdue ? '!!' : days}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{g.donorName} — {g.grantTitle}</p>
                          <p className="text-[10px] text-slate-500">{g.focalArea.replace(/_/g, ' ')} · Due: {g.nextReportDue} · Officer: {g.grantOfficer}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isOverdue ? 'bg-red-100 text-red-800' : isUrgent ? 'bg-orange-100 text-orange-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'DUE TODAY' : `${days}d remaining`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grant timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Grant Timeline &amp; Burn Rate</h3>
            <div className="space-y-3">
              {donorGrants.map(g => {
                const totalMs = new Date(g.endDate).getTime() - new Date(g.startDate).getTime();
                const elapsedMs = today.getTime() - new Date(g.startDate).getTime();
                const timePct = Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
                const spentPct = g.totalAmountUSD > 0 ? Math.round((g.spentToDateUSD / g.totalAmountUSD) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 truncate max-w-[60%]">{g.donorName}: {g.grantTitle}</span>
                      <span className="text-slate-400 text-[10px]">{g.startDate} → {g.endDate}</span>
                    </div>
                    <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute top-0 h-full bg-slate-300/60 rounded-full" style={{ width: `${timePct}%` }} />
                      <div className="absolute top-0 h-full bg-forest-500/80 rounded-full" style={{ width: `${spentPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>Time elapsed: {timePct}%</span>
                      <span>Funds spent: {spentPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Disbursement Modal */}
      {showDisbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">Record Disbursement</h2>
              <p className="text-xs text-slate-500 mt-0.5">Record a tranche payment received from a donor</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grant *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={disbForm.grantId} onChange={e => setDisbForm(f => ({ ...f, grantId: e.target.value }))}>
                  <option value="">Select grant…</option>
                  {donorGrants.filter(g => g.status === 'ACTIVE').map(g => (
                    <option key={g.id} value={g.id}>{g.donorName} — {g.grantTitle}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (USD) *</label>
                  <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={disbForm.amountUSD || ''} onChange={e => setDisbForm(f => ({ ...f, amountUSD: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={disbForm.status} onChange={e => setDisbForm(f => ({ ...f, status: e.target.value as GrantDisbursement['status'] }))}>
                    <option value="RECEIVED">Received</option>
                    <option value="ALLOCATED">Allocated</option>
                    <option value="SPENT">Spent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date *</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={disbForm.disbursementDate} onChange={e => setDisbForm(f => ({ ...f, disbursementDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Period (e.g. Q2 FY2025)</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={disbForm.period} onChange={e => setDisbForm(f => ({ ...f, period: e.target.value }))} placeholder="Q2 FY2025" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purpose / Budget Line *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={disbForm.purpose} onChange={e => setDisbForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Field Operations & Patrol Equipment" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank Reference *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" value={disbForm.bankRef} onChange={e => setDisbForm(f => ({ ...f, bankRef: e.target.value }))} placeholder="Bank transfer ref" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Milestone Achieved (optional)</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={disbForm.milestoneAchieved} onChange={e => setDisbForm(f => ({ ...f, milestoneAchieved: e.target.value }))} placeholder="e.g. Q2 Field Patrol Report Submitted" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowDisbModal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handleAddDisbursement} disabled={!disbForm.grantId || !disbForm.amountUSD || !disbForm.disbursementDate || !disbForm.purpose || !disbForm.bankRef} className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                Record Disbursement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
