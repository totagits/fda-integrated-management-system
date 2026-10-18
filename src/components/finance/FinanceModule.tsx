import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentVoucher } from '../../types';
import {
  Coins,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Plus,
  Printer,
  Building2,
  FileCheck2,
  Send,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Ban
} from 'lucide-react';

export const FinanceModule: React.FC = () => {
  const {
    budgetVotes,
    paymentVouchers,
    bankAccounts,
    createPaymentVoucher,
    approveVoucherFinance,
    authorizeVoucherMD,
    markVoucherPaid,
    exportIFMISBatch,
    currentPersona,
    openPrintModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'VOTE_BOOK' | 'VOUCHERS' | 'BANK_ACCOUNTS' | 'IFMIS_GATEWAY'>('VOTE_BOOK');
  const [showNewVoucherModal, setShowNewVoucherModal] = useState(false);
  const [payCheckNumber, setPayCheckNumber] = useState('');
  const [payingVoucherId, setPayingVoucherId] = useState<string | null>(null);

  // New Voucher state
  const [newVoucher, setNewVoucher] = useState({
    payee: '',
    description: '',
    voteCode: budgetVotes[1]?.code || '',
    amountUSD: 1500,
    amountLRD: 292500,
    currency: 'USD' as const,
    paymentMethod: 'CHECK' as const,
    initiator: currentPersona.name
  });

  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const success = createPaymentVoucher({
      ...newVoucher,
      initiator: currentPersona.name
    });

    if (success) {
      setShowNewVoucherModal(false);
      setNewVoucher({
        payee: '',
        description: '',
        voteCode: budgetVotes[1]?.code || '',
        amountUSD: 1500,
        amountLRD: 292500,
        currency: 'USD',
        paymentMethod: 'CHECK',
        initiator: currentPersona.name
      });
    } else {
      setErrorBanner('Budget Ceiling Exceeded! Requisition exceeds available vote allotment balance.');
    }
  };

  const handleDisbursePayment = (id: string) => {
    if (!payCheckNumber) return;
    markVoucherPaid(id, payCheckNumber);
    setPayingVoucherId(null);
    setPayCheckNumber('');
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              TOR §6 Financial Management
            </span>
            <span className="text-xs text-slate-500 font-mono">GoL IFMIS Gateway Active</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Financial Management, Vote Book & Budgetary Controls
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-Time Vote Commitments • Multi-Tier Digital Payment Vouchers • Central Bank of Liberia (CBL) Treasury
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => exportIFMISBatch()}
            className="inline-flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg font-bold border border-blue-200 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Export IFMIS Batch (MFDP)</span>
          </button>
          <button
            onClick={() => setShowNewVoucherModal(true)}
            className="inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Voucher</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('VOTE_BOOK')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'VOTE_BOOK'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Vote Book & Budget Ceilings</span>
        </button>

        <button
          onClick={() => setActiveTab('VOUCHERS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'VOUCHERS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Payment Vouchers ({paymentVouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BANK_ACCOUNTS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'BANK_ACCOUNTS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Treasury & Bank Accounts ({bankAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('IFMIS_GATEWAY')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'IFMIS_GATEWAY'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>GoL IFMIS Boundary</span>
        </button>
      </div>

      {/* TAB 1: VOTE BOOK & CEILINGS */}
      {activeTab === 'VOTE_BOOK' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Hard Budget Ceiling Enforcement Active (TOR §6)</p>
              <p className="text-amber-800 mt-0.5">
                The FDA platform automatically blocks expenditure commitments exceeding the department's authorized annual allotment. Over-spending requires supplementary budget clearance from the Managing Director and MFDP.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                FY2026 Departmental Vote Books & Commitments
              </h3>
              <span className="text-xs text-slate-500">GoL Standard Chart of Accounts</span>
            </div>

            <div className="divide-y divide-slate-100">
              {budgetVotes.map(vote => {
                const percentSpent = ((vote.committedUSD / vote.annualAllotmentUSD) * 100).toFixed(1);
                const isNearLimit = Number(percentSpent) > 80;

                return (
                  <div key={vote.id} className="p-4 hover:bg-slate-50/60 transition space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{vote.code}</span>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-slate-100 text-slate-700">
                            {vote.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-0.5">{vote.title}</p>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-slate-900">
                          ${vote.availableUSD.toLocaleString()} Available
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          Allotment: ${vote.annualAllotmentUSD.toLocaleString()} USD
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Committed: ${vote.committedUSD.toLocaleString()} USD</span>
                        <span className={isNearLimit ? 'text-amber-800 font-bold' : 'text-slate-600'}>
                          {percentSpent}% Committed
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            isNearLimit ? 'bg-amber-600' : 'bg-forest-700'
                          }`}
                          style={{ width: `${percentSpent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT VOUCHERS */}
      {activeTab === 'VOUCHERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Payment Vouchers Ledger</h3>
                <p className="text-xs text-slate-500">Multi-stage approvals: Audit Review → Finance Verification → MD Executive Authorization</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Voucher # / Date</th>
                    <th className="px-4 py-3">Payee & Purpose</th>
                    <th className="px-4 py-3">Vote Code</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentVouchers.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{v.voucherNo}</div>
                        <div className="text-[11px] text-slate-400">{v.dateCreated}</div>
                        {v.ifmisCommitmentNo && (
                          <div className="text-[10px] text-blue-700 font-mono mt-0.5">{v.ifmisCommitmentNo}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-bold text-slate-900">{v.payee}</div>
                        <div className="text-slate-600 truncate">{v.description}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Initiator: {v.initiator}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs truncate">
                        {v.voteCode}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-bold text-slate-900">${v.amountUSD.toLocaleString()} USD</div>
                        <div className="text-[10px] text-slate-400">{v.amountLRD.toLocaleString()} LRD</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          v.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : v.status === 'MD_AUTHORIZED'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : v.status === 'FINANCE_APPROVED'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {v.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Print Voucher */}
                          <button
                            onClick={() => openPrintModal({
                              type: 'PAYMENT_VOUCHER',
                              data: v
                            })}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="Print Voucher Document"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Approval progression buttons */}
                          {v.status === 'AUDIT_REVIEW' && (
                            <button
                              onClick={() => approveVoucherFinance(v.id)}
                              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded font-bold text-[11px] shadow-sm transition"
                            >
                              Verify
                            </button>
                          )}

                          {v.status === 'FINANCE_APPROVED' && (
                            <button
                              onClick={() => authorizeVoucherMD(v.id)}
                              className="px-2.5 py-1 bg-forest-800 hover:bg-forest-700 text-white rounded font-bold text-[11px] shadow-sm transition"
                            >
                              MD Sign-off
                            </button>
                          )}

                          {v.status === 'MD_AUTHORIZED' && (
                            <button
                              onClick={() => setPayingVoucherId(v.id)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-[11px] shadow-sm transition"
                            >
                              Disburse
                            </button>
                          )}

                          {v.status === 'PAID' && (
                            <span className="text-[10px] text-emerald-800 font-mono">
                              Ck #{v.checkNumber}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BANK ACCOUNTS */}
      {activeTab === 'BANK_ACCOUNTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{b.bankName}</h4>
                  <p className="text-xs font-mono text-slate-500">{b.accountNumber}</p>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                  {b.accountType.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500">Current Ledger Balance:</span>
                  <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {b.currency === 'USD' ? '$' : 'L$'}{b.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {b.currency}
                  </p>
                </div>
                <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Reconciled ({b.lastReconciled})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: IFMIS GATEWAY */}
      {activeTab === 'IFMIS_GATEWAY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                GoL IFMIS Integration Gateway — Ministry of Finance & Development Planning (TOR §3)
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative boundary integration ensuring FDA does not bypass or duplicate national financial controls.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 space-y-2">
            <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
              <span>GoL IFMIS Gateway Parameters</span>
              <span className="text-emerald-700">STATUS: READY / CONNECTED</span>
            </div>
            <p>Target System: Republic of Liberia IFMIS (FreeBalance Core v7.2)</p>
            <p>MFDP Agency Code: 02-FDA (Forestry Development Authority)</p>
            <p>Active Currency Protocols: Multi-Currency USD / LRD Parallel Ledgers</p>
            <p>Commitment Transmission Format: ISO 20022 XML / JSON Batch</p>
          </div>

          <button
            onClick={() => exportIFMISBatch()}
            className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow transition flex items-center space-x-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Generate & Transmit Latest IFMIS Commitment Batch</span>
          </button>
        </div>
      )}

      {/* Disburse Modal */}
      {payingVoucherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Disburse Payment Voucher</h3>
            <p className="text-xs text-slate-600">Enter the issued check or electronic transfer reference number:</p>
            <div>
              <input
                type="text"
                placeholder="e.g. CK-CBL-991204"
                value={payCheckNumber}
                onChange={e => setPayCheckNumber(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md text-xs font-mono focus:ring-forest-600 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setPayingVoucherId(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisbursePayment(payingVoucherId)}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition shadow"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Voucher Modal */}
      {showNewVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coins className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Initiate Payment Requisition Voucher</h3>
              </div>
              <button
                onClick={() => setShowNewVoucherModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {errorBanner && (
              <div className="bg-red-50 border-b border-red-200 p-3 text-xs text-red-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorBanner}</span>
              </div>
            )}

            <form onSubmit={handleCreateVoucher} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payee / Beneficiary Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Africa GeoSpatial Solutions Ltd."
                  value={newVoucher.payee}
                  onChange={e => setNewVoucher({ ...newVoucher, payee: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Expenditure Purpose & Justification</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detail goods delivered or field services rendered..."
                  value={newVoucher.description}
                  onChange={e => setNewVoucher({ ...newVoucher, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Budget Vote Book Allocation</label>
                <select
                  value={newVoucher.voteCode}
                  onChange={e => setNewVoucher({ ...newVoucher, voteCode: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                >
                  {budgetVotes.map(v => (
                    <option key={v.id} value={v.code}>
                      {v.code} (Available: ${v.availableUSD.toLocaleString()} USD)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Requisition Amount (USD)</label>
                  <input
                    type="number"
                    required
                    value={newVoucher.amountUSD}
                    onChange={e => setNewVoucher({
                      ...newVoucher,
                      amountUSD: Number(e.target.value),
                      amountLRD: Number(e.target.value) * 195
                    })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Equivalent LRD (Rate: 195)</label>
                  <input
                    type="number"
                    disabled
                    value={newVoucher.amountLRD}
                    className="w-full p-2 border border-slate-200 bg-slate-100 rounded-md font-mono text-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewVoucherModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded font-bold transition shadow"
                >
                  Submit for Audit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
