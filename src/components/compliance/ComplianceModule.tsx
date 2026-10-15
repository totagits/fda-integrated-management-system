import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LegalCase } from '../../types';
import {
  Scale, Plus, FileText, BarChart3, Gavel, MapPin
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  FILED: 'bg-blue-50 text-blue-700',
  UNDER_INVESTIGATION: 'bg-amber-50 text-amber-700',
  REFERRED_TO_COURT: 'bg-purple-50 text-purple-700',
  JUDGMENT_ISSUED: 'bg-orange-50 text-orange-700',
  PENALTY_COLLECTED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-500',
  DISMISSED: 'bg-slate-100 text-slate-400',
};

export const ComplianceModule: React.FC = () => {
  const {
    legalCases, createLegalCase, updateCaseStatus,
    rangerIncidents, openPrintModal, addAuditEntry, currentPersona
  } = useApp();

  const [activeTab, setActiveTab] = useState<'CASES' | 'FILE' | 'ANALYTICS'>('CASES');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showUpdateModal, setShowUpdateModal] = useState<LegalCase | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const COUNTIES = ['Bong','Grand Bassa','Grand Cape Mount','Grand Gedeh','Grand Kru','Lofa','Margibi','Maryland','Montserrado','Nimba','River Cess','River Gee','Sinoe'];

  const [caseForm, setCaseForm] = useState({
    caseNo: `FDA-CASE-${new Date().getFullYear()}-${String(legalCases.length + 1).padStart(3, '0')}`,
    county: 'Nimba' as LegalCase['county'],
    caseType: 'ILLEGAL_LOGGING' as LegalCase['caseType'],
    suspects: '',
    filedDate: new Date().toISOString().split('T')[0],
    assignedLegalOfficer: currentPersona.name,
    courtName: '',
    hearingDate: '',
    penaltyUSD: 0,
    description: '',
    evidenceFiles: 0,
    incidentId: '',
  });

  const filtered = filterStatus === 'ALL' ? legalCases : legalCases.filter(c => c.status === filterStatus);
  const openCases = legalCases.filter(c => !['CLOSED', 'DISMISSED'].includes(c.status)).length;
  const totalPenalties = legalCases.reduce((s, c) => s + (c.penaltyUSD || 0), 0);
  const totalCollected = legalCases.reduce((s, c) => s + (c.penaltyCollectedUSD || 0), 0);

  const handleFileCase = () => {
    createLegalCase({
      caseNo: caseForm.caseNo,
      county: caseForm.county,
      caseType: caseForm.caseType,
      suspects: caseForm.suspects.split(',').map(s => s.trim()).filter(Boolean),
      filedDate: caseForm.filedDate,
      assignedLegalOfficer: caseForm.assignedLegalOfficer,
      courtName: caseForm.courtName || undefined,
      hearingDate: caseForm.hearingDate || undefined,
      penaltyUSD: caseForm.penaltyUSD || undefined,
      status: 'FILED',
      description: caseForm.description,
      evidenceFiles: caseForm.evidenceFiles,
      incidentId: caseForm.incidentId || undefined,
    });
    addAuditEntry(`Legal Case Filed: ${caseForm.caseNo}`, 'OPERATIONS', `Type: ${caseForm.caseType}, County: ${caseForm.county}`);
    setActiveTab('CASES');
  };

  const handleUpdateStatus = () => {
    if (!showUpdateModal || !newStatus) return;
    updateCaseStatus(showUpdateModal.id, newStatus as LegalCase['status'], statusNote);
    addAuditEntry(`Case ${showUpdateModal.caseNo} status updated to ${newStatus}`, 'OPERATIONS', statusNote);
    setShowUpdateModal(null); setNewStatus(''); setStatusNote('');
  };

  const TABS = [
    { id: 'CASES', label: 'Active Cases', icon: Scale },
    { id: 'FILE', label: 'File New Case', icon: Plus },
    { id: 'ANALYTICS', label: 'Enforcement Analytics', icon: BarChart3 },
  ] as const;

  const caseTypeCount = (type: string) => legalCases.filter(c => c.caseType === type).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-forest-700" /> Legal &amp; Enforcement
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Case management, penalties, court proceedings &amp; enforcement analytics — FDA Liberia</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${openCases > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {openCases} Open Cases
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: legalCases.length, sub: 'All time', color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Active Cases', value: openCases, sub: 'Requiring action', color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Penalties Assessed', value: `US$${totalPenalties.toLocaleString()}`, sub: 'Total fines issued', color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Penalties Collected', value: `US$${totalCollected.toLocaleString()}`, sub: `${totalPenalties > 0 ? Math.round((totalCollected / totalPenalties) * 100) : 0}% recovery rate`, color: 'text-forest-700', bg: 'bg-forest-50' },
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
            </button>
          );
        })}
      </div>

      {/* Cases */}
      {activeTab === 'CASES' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {['ALL', 'FILED', 'UNDER_INVESTIGATION', 'REFERRED_TO_COURT', 'JUDGMENT_ISSUED', 'PENALTY_COLLECTED'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${filterStatus === s ? 'bg-forest-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s === 'ALL' ? `All (${legalCases.length})` : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Case No</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Suspects</th>
                  <th className="px-4 py-3 text-left">County</th>
                  <th className="px-4 py-3 text-right">Penalty</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-left">Filed</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No cases found</td></tr>}
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{c.caseNo}</td>
                    <td className="px-4 py-3 text-slate-700">{c.caseType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">{c.suspects.join(', ')}</td>
                    <td className="px-4 py-3 text-slate-500"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.county}</span></td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">
                      {c.penaltyUSD ? `US$${c.penaltyUSD.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {c.penaltyCollectedUSD ? `US$${c.penaltyCollectedUSD.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.filedDate}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-500'}`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1.5">
                      <button onClick={() => setShowUpdateModal(c)} className="p-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 transition" title="Update Status">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                      </button>
                      <button onClick={() => openPrintModal({ type: 'LEGAL_CASE_REPORT', data: c })} className="p-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 transition" title="Print Report">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Case */}
      {activeTab === 'FILE' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-800">File New Enforcement Case</h3>
            <p className="text-xs text-slate-500">Record illegal logging, wildlife crime, encroachment, or contract violations</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Case Number</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" value={caseForm.caseNo} onChange={e => setCaseForm(f => ({ ...f, caseNo: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Case Type *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.caseType} onChange={e => setCaseForm(f => ({ ...f, caseType: e.target.value as LegalCase['caseType'] }))}>
                <option value="ILLEGAL_LOGGING">Illegal Logging</option>
                <option value="ENCROACHMENT">Encroachment</option>
                <option value="WILDLIFE_TRAFFICKING">Wildlife Trafficking</option>
                <option value="CHAINSAW_SEIZURE">Chainsaw Seizure</option>
                <option value="CONTRACT_VIOLATION">Contract Violation</option>
                <option value="REVENUE_FRAUD">Revenue Fraud</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Suspects (comma-separated) *</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.suspects} onChange={e => setCaseForm(f => ({ ...f, suspects: e.target.value }))} placeholder="John Doe, ABC Company" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">County *</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.county} onChange={e => setCaseForm(f => ({ ...f, county: e.target.value as LegalCase['county'] }))}>
                {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description / Evidence Summary</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" rows={3} value={caseForm.description} onChange={e => setCaseForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the violation, evidence, and circumstances..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Penalty (USD)</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.penaltyUSD || ''} onChange={e => setCaseForm(f => ({ ...f, penaltyUSD: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Evidence Files (#)</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.evidenceFiles || ''} onChange={e => setCaseForm(f => ({ ...f, evidenceFiles: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Officer</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.assignedLegalOfficer} onChange={e => setCaseForm(f => ({ ...f, assignedLegalOfficer: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Court Name (if known)</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.courtName} onChange={e => setCaseForm(f => ({ ...f, courtName: e.target.value }))} placeholder="e.g. Montserrado County Court" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Linked Ranger Incident</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={caseForm.incidentId} onChange={e => setCaseForm(f => ({ ...f, incidentId: e.target.value }))}>
                <option value="">None</option>
                {rangerIncidents.map(i => <option key={i.id} value={i.id}>{i.incidentNo} — {i.type}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleFileCase} disabled={!caseForm.suspects || !caseForm.county} className="px-6 py-2.5 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-2">
            <Gavel className="w-3.5 h-3.5" /> File Case
          </button>
        </div>
      )}

      {/* Analytics */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Cases by Violation Type</h3>
            <div className="space-y-3">
              {['ILLEGAL_LOGGING', 'WILDLIFE_TRAFFICKING', 'ENCROACHMENT', 'CONTRACT_VIOLATION', 'CHAINSAW_SEIZURE', 'REVENUE_FRAUD'].map((type, i) => {
                const cnt = caseTypeCount(type);
                const pct = legalCases.length > 0 ? Math.round((cnt / legalCases.length) * 100) : 0;
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-slate-500'];
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700">{type.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500 font-semibold">{cnt} ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i]} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Penalty Recovery Rate</h3>
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-5xl font-extrabold text-forest-700">
                  {totalPenalties > 0 ? Math.round((totalCollected / totalPenalties) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-500 mt-1">Collection Rate</p>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full" style={{ width: `${totalPenalties > 0 ? Math.round((totalCollected / totalPenalties) * 100) : 0}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div className="bg-red-50 rounded-lg p-3"><p className="font-bold text-red-700 text-lg">US${totalPenalties.toLocaleString()}</p><p className="text-slate-500">Assessed</p></div>
                <div className="bg-emerald-50 rounded-lg p-3"><p className="font-bold text-emerald-700 text-lg">US${totalCollected.toLocaleString()}</p><p className="text-slate-500">Collected</p></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Case Status Distribution</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_STYLES).map(([status, cls]) => {
                const cnt = legalCases.filter(c => c.status === status).length;
                if (cnt === 0) return null;
                return (
                  <div key={status} className={`${cls} rounded-xl px-4 py-3 text-center min-w-[120px]`}>
                    <p className="text-2xl font-extrabold">{cnt}</p>
                    <p className="text-[10px] font-bold mt-0.5">{status.replace(/_/g, ' ')}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">Update Case Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">{showUpdateModal.caseNo} — {showUpdateModal.suspects.join(', ')}</p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Status</label>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[showUpdateModal.status] || ''}`}>{showUpdateModal.status.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Status *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">Select new status…</option>
                  {['FILED', 'UNDER_INVESTIGATION', 'REFERRED_TO_COURT', 'JUDGMENT_ISSUED', 'PENALTY_COLLECTED', 'CLOSED', 'DISMISSED'].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" rows={3} value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Case update notes..." />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowUpdateModal(null)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handleUpdateStatus} disabled={!newStatus} className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">Update Status</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
