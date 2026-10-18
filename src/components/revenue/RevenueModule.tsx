import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  DollarSign, Plus, CheckCircle2, CreditCard, FileText,
  TrendingUp, Download, BarChart3
} from 'lucide-react';
import { RoyaltyInvoice } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  ISSUED: 'bg-blue-50 text-blue-700',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-700',
  DISPUTED: 'bg-purple-50 text-purple-700',
};

const fmtUSD = (n: number) => `US$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const fmtLRD = (n: number) => `L$${n.toLocaleString('en-LR', { minimumFractionDigits: 2 })}`;

export const RevenueModule: React.FC = () => {
  const {
    royaltyInvoices, issueRoyaltyInvoice, recordRoyaltyPayment,
    harvestLogs, openPrintModal, addAuditEntry, currentPersona
  } = useApp();

  const [activeTab, setActiveTab] = useState<'INVOICES' | 'HARVEST' | 'ANALYTICS'>('INVOICES');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<RoyaltyInvoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [issueForm, setIssueForm] = useState({
    invoiceNo: `FDA-ROY-${new Date().getFullYear()}-${String(royaltyInvoices.length + 1).padStart(3, '0')}`,
    concessionId: '',
    concessionPermitNo: '',
    holderName: '',
    county: 'Sinoe' as RoyaltyInvoice['county'],
    invoiceType: 'STUMPAGE_FEE' as RoyaltyInvoice['invoiceType'],
    periodFrom: '',
    periodTo: '',
    volumeM3: 0,
    ratePerUnit: 0,
    dueDate: '',
    issuedBy: currentPersona.name,
  });
  const [payAmt, setPayAmt] = useState('');
  const [payRef, setPayRef] = useState('');

  const filtered = filterStatus === 'ALL' ? royaltyInvoices : royaltyInvoices.filter(i => i.status === filterStatus);
  const totalInvoiced = royaltyInvoices.reduce((s, i) => s + i.amountUSD, 0);
  const totalPaid = royaltyInvoices.reduce((s, i) => s + (i.paidAmountUSD || 0), 0);
  const totalOverdue = royaltyInvoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.amountUSD - (i.paidAmountUSD || 0), 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;
  const ANNUAL_TARGET = 4_500_000;
  const targetPct = Math.min(100, Math.round((totalPaid / ANNUAL_TARGET) * 100));

  const byType = ['AREA_FEE', 'STUMPAGE_FEE', 'NTFP_LEVY', 'PROCESSING_FEE', 'CONCESSION_RENEWAL'].map(t => ({
    type: t.replace(/_/g, ' '),
    amount: royaltyInvoices.filter(i => i.invoiceType === t).reduce((s, i) => s + (i.paidAmountUSD || 0), 0)
  })).filter(r => r.amount > 0);

  const handleIssue = () => {
    const amtUSD = issueForm.volumeM3 * issueForm.ratePerUnit;
    issueRoyaltyInvoice({
      invoiceNo: issueForm.invoiceNo,
      concessionId: issueForm.concessionId,
      concessionPermitNo: issueForm.concessionPermitNo,
      holderName: issueForm.holderName,
      county: issueForm.county,
      invoiceType: issueForm.invoiceType,
      periodFrom: issueForm.periodFrom,
      periodTo: issueForm.periodTo,
      volumeM3: issueForm.volumeM3,
      ratePerUnit: issueForm.ratePerUnit,
      amountUSD: amtUSD,
      amountLRD: amtUSD * 195,
      dueDate: issueForm.dueDate,
      status: 'ISSUED',
      issuedBy: issueForm.issuedBy,
    });
    addAuditEntry(`Royalty Invoice ${issueForm.invoiceNo} issued to ${issueForm.holderName}`, 'FINANCE', `Type: ${issueForm.invoiceType}, Amount: US$${amtUSD.toLocaleString()}`);
    setShowIssueModal(false);
  };

  const handlePay = () => {
    if (!showPayModal) return;
    const amt = parseFloat(payAmt);
    if (isNaN(amt) || amt <= 0) return;
    recordRoyaltyPayment(showPayModal.id, amt, payRef);
    addAuditEntry(`Royalty Payment on ${showPayModal.invoiceNo}`, 'FINANCE', `Amount: US$${amt.toLocaleString()}, Ref: ${payRef}`);
    setShowPayModal(null);
    setPayAmt(''); setPayRef('');
  };

  const TABS = [
    { id: 'INVOICES', label: 'Royalty Invoices', icon: FileText },
    { id: 'HARVEST', label: 'Harvest Logs', icon: TrendingUp },
    { id: 'ANALYTICS', label: 'Revenue Analytics', icon: BarChart3 },
  ] as const;

  const COUNTIES = ['Bong','Grand Bassa','Grand Cape Mount','Grand Gedeh','Grand Kru','Lofa','Margibi','Maryland','Montserrado','Nimba','River Cess','River Gee','Sinoe'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-forest-700" /> Revenue &amp; Royalty Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Stumpage fees, area fees, export levies &amp; LRA remittance tracking — FDA Liberia</p>
        </div>
        <button onClick={() => setShowIssueModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-bold shadow transition">
          <Plus className="w-3.5 h-3.5" /> Issue Invoice
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoiced (FY)', value: fmtUSD(totalInvoiced), sub: `${royaltyInvoices.length} invoices`, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Collected (FY)', value: fmtUSD(totalPaid), sub: `${collectionRate}% collection rate`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Overdue Balance', value: fmtUSD(totalOverdue), sub: `${royaltyInvoices.filter(i => i.status === 'OVERDUE').length} invoices`, color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Target Progress', value: `${targetPct}%`, sub: `vs US$${(ANNUAL_TARGET / 1e6).toFixed(1)}M annual target`, color: 'text-forest-700', bg: 'bg-forest-50' },
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

      {/* Invoices tab */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {['ALL', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${filterStatus === s ? 'bg-forest-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s === 'ALL' ? `All (${royaltyInvoices.length})` : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Invoice No</th>
                  <th className="px-4 py-3 text-left">Holder</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">County</th>
                  <th className="px-4 py-3 text-right">Amount (USD)</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No invoices found</td></tr>}
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{inv.holderName}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.invoiceType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.county}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtUSD(inv.amountUSD)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{fmtUSD(inv.paidAmountUSD || 0)}</td>
                    <td className="px-4 py-3 text-slate-500">{inv.dueDate}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[inv.status] || 'bg-slate-100 text-slate-500'}`}>
                        {inv.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1.5">
                      {inv.status !== 'PAID' && (
                        <button onClick={() => setShowPayModal(inv)} className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition" title="Record Payment">
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openPrintModal({ type: 'ROYALTY_INVOICE', data: inv })} className="p-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 transition" title="Print Invoice">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Harvest Logs tab */}
      {activeTab === 'HARVEST' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Timber Harvest & AAC Tracking</h3>
            <span className="text-[10px] text-slate-400 font-mono">{harvestLogs.length} log records · SGS LiberTrace</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Log No</th>
                <th className="px-4 py-3 text-left">Permit Holder</th>
                <th className="px-4 py-3 text-left">Species</th>
                <th className="px-4 py-3 text-left">County</th>
                <th className="px-4 py-3 text-right">Volume (m³)</th>
                <th className="px-4 py-3 text-right">AAC Allowed</th>
                <th className="px-4 py-3 text-right">Cumulative</th>
                <th className="px-4 py-3 text-right">AAC %</th>
                <th className="px-4 py-3 text-left">SGS Waybill</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {harvestLogs.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">No harvest logs recorded</td></tr>}
              {harvestLogs.map(h => (
                <tr key={h.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-600">{h.logNo}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{h.holderName}</td>
                  <td className="px-4 py-3 text-slate-600 italic">{h.species}</td>
                  <td className="px-4 py-3 text-slate-500">{h.county}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{h.volumeHarvestedM3.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{h.aacAllowedM3.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{h.cumulativeHarvestedM3.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-extrabold ${h.aacCompliancePercent > 90 ? 'text-red-600' : h.aacCompliancePercent > 70 ? 'text-amber-600' : 'text-forest-700'}`}>
                      {h.aacCompliancePercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{h.sgsWaybillNo}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' : h.status === 'FLAGGED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics tab */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">FY Revenue vs Annual Target (US$4.5M)</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Collected: {fmtUSD(totalPaid)}</span>
                  <span className="font-bold text-forest-700">{targetPct}%</span>
                </div>
                <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-forest-600 to-forest-400 rounded-full" style={{ width: `${targetPct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Annual Target: {fmtUSD(ANNUAL_TARGET)}</p>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Overdue: {fmtUSD(totalOverdue)}</span>
                  <span className="font-bold text-red-600">{totalInvoiced > 0 ? Math.round((totalOverdue / totalInvoiced) * 100) : 0}% of invoiced</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${totalInvoiced > 0 ? Math.min(100, Math.round((totalOverdue / totalInvoiced) * 100)) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Collections by Revenue Type</h3>
            {byType.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No collected revenue yet</p>
            ) : (
              <div className="space-y-3">
                {byType.sort((a, b) => b.amount - a.amount).map((r, i) => {
                  const pct = Math.round((r.amount / totalPaid) * 100);
                  const colors = ['bg-forest-600', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-teal-500'];
                  return (
                    <div key={r.type}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 capitalize">{r.type.toLowerCase()}</span>
                        <span className="text-slate-500">{fmtUSD(r.amount)} ({pct}%)</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Invoice Status Breakdown</h3>
            <div className="grid grid-cols-3 gap-3">
              {['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED'].map(s => {
                const cnt = royaltyInvoices.filter(i => i.status === s).length;
                if (cnt === 0) return null;
                return (
                  <div key={s} className={`rounded-lg p-3 text-center ${STATUS_STYLES[s] || 'bg-slate-50 text-slate-600'}`}>
                    <p className="text-xl font-extrabold">{cnt}</p>
                    <p className="text-[10px] font-bold mt-0.5">{s.replace(/_/g, ' ')}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Issue Invoice Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">Issue Royalty Invoice</h2>
              <p className="text-xs text-slate-500 mt-0.5">Stumpage fee, area fee, or levy invoice to concession holder</p>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice No</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" value={issueForm.invoiceNo} onChange={e => setIssueForm(f => ({ ...f, invoiceNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Invoice Type *</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.invoiceType} onChange={e => setIssueForm(f => ({ ...f, invoiceType: e.target.value as RoyaltyInvoice['invoiceType'] }))}>
                    <option value="AREA_FEE">Area Fee</option>
                    <option value="STUMPAGE_FEE">Stumpage Fee</option>
                    <option value="NTFP_LEVY">NTFP Levy</option>
                    <option value="PROCESSING_FEE">Processing Fee</option>
                    <option value="CONCESSION_RENEWAL">Concession Renewal</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Permit Holder Name *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.holderName} onChange={e => setIssueForm(f => ({ ...f, holderName: e.target.value }))} placeholder="e.g. Salala Rubber Corp" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Permit No</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" value={issueForm.concessionPermitNo} onChange={e => setIssueForm(f => ({ ...f, concessionPermitNo: e.target.value }))} placeholder="FDA-FMC-001" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">County</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.county} onChange={e => setIssueForm(f => ({ ...f, county: e.target.value as RoyaltyInvoice['county'] }))}>
                    {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Volume (m³)</label>
                  <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.volumeM3 || ''} onChange={e => setIssueForm(f => ({ ...f, volumeM3: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate / m³ (USD)</label>
                  <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.ratePerUnit || ''} onChange={e => setIssueForm(f => ({ ...f, ratePerUnit: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="bg-forest-50 rounded-lg px-3 py-2 text-xs font-bold text-forest-700">
                Total: {fmtUSD(issueForm.volumeM3 * issueForm.ratePerUnit)} / {fmtLRD(issueForm.volumeM3 * issueForm.ratePerUnit * 195)}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Period From</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.periodFrom} onChange={e => setIssueForm(f => ({ ...f, periodFrom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Period To</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.periodTo} onChange={e => setIssueForm(f => ({ ...f, periodTo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Due Date *</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={issueForm.dueDate} onChange={e => setIssueForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handleIssue} disabled={!issueForm.holderName || !issueForm.dueDate} className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                Issue Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">Record Payment</h2>
              <p className="text-xs text-slate-500 mt-0.5">{showPayModal.holderName} — {showPayModal.invoiceNo}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-slate-400">Invoice Amount</p><p className="font-bold text-slate-800">{fmtUSD(showPayModal.amountUSD)}</p></div>
                <div><p className="text-slate-400">Already Paid</p><p className="font-bold text-emerald-700">{fmtUSD(showPayModal.paidAmountUSD || 0)}</p></div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Amount (USD) *</label>
                <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bank/MoFP Reference *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Bank receipt or remittance ref" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowPayModal(null)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handlePay} disabled={!payAmt || !payRef} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const COUNTIES = ['Bong','Grand Bassa','Grand Cape Mount','Grand Gedeh','Grand Kru','Lofa','Margibi','Maryland','Montserrado','Nimba','River Cess','River Gee','Sinoe'];
