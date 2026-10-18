import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProcurementRequisition, PurchaseOrder } from '../../types';
import {
  ShoppingCart,
  CheckCircle2,
  FileText,
  Building,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  Clock,
  Printer
} from 'lucide-react';

export const ProcurementModule: React.FC = () => {
  const {
    procurementReqs,
    vendors,
    purchaseOrders,
    createProcurementReq,
    approveProcurementReq,
    createPurchaseOrder,
    executeThreeWayMatch,
    openPrintModal,
    currentPersona
  } = useApp();

  const [activeTab, setActiveTab] = useState<'REQS' | 'VENDORS' | 'PURCHASE_ORDERS' | 'THREE_WAY_MATCH'>('REQS');
  const [showAddReqModal, setShowAddReqModal] = useState(false);
  const [showAddPOModal, setShowAddPOModal] = useState(false);

  // New Requisition state
  const [newReq, setNewReq] = useState({
    title: '',
    department: 'Commercial & Conservation Forestry',
    estimatedBudgetUSD: 25000,
    ppccMethod: 'REQUEST_FOR_QUOTATION' as ProcurementRequisition['ppccMethod'],
    quarter: 'Q3' as const
  });

  // New PO state
  const [newPO, setNewPO] = useState({
    prNo: procurementReqs[0]?.prNo || '',
    vendorId: vendors[0]?.id || '',
    vendorName: vendors[0]?.name || '',
    description: '',
    totalUSD: 25000,
    expectedDelivery: '2026-10-30'
  });

  const handleCreateReq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.title) return;
    createProcurementReq(newReq);
    setShowAddReqModal(false);
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    createPurchaseOrder(newPO);
    setShowAddPOModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              PPCC & e-GP Framework
            </span>
            <span className="text-xs text-slate-500 font-mono">TOR §6 Procurement</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Procurement, Tendering & 3-Way Matching Engine
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Public Procurement and Concessions Commission (PPCC) Compliance • Verified Vendor Registry • Audit-Proof 3-Way Match
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowAddReqModal(true)}
            className="inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Initiate Requisition</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('REQS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'REQS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Annual Procurement Plan Requisitions ({procurementReqs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('VENDORS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'VENDORS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Certified Vendor Registry ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PURCHASE_ORDERS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'PURCHASE_ORDERS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('THREE_WAY_MATCH')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'THREE_WAY_MATCH'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>3-Way Matching Verification</span>
        </button>
      </div>

      {/* TAB 1: REQUISITIONS */}
      {activeTab === 'REQS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Procurement Requisitions & APP Tracking</h3>
                <p className="text-xs text-slate-500">Categorized by PPCC statutory threshold methods</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Requisition # / Quarter</th>
                    <th className="px-4 py-3">Description & Department</th>
                    <th className="px-4 py-3">PPCC Method</th>
                    <th className="px-4 py-3 text-right">Est. Budget (USD)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {procurementReqs.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{req.prNo}</div>
                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                          {req.quarter} Procurement Plan
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-bold text-slate-900">{req.title}</div>
                        <div className="text-slate-500 text-[11px]">{req.department}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {req.ppccMethod.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ${req.estimatedBudgetUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          req.status === 'PPCC_APPROVED' || req.status === 'TENDER_ISSUED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'SUBMITTED' ? (
                          <button
                            onClick={() => approveProcurementReq(req.id)}
                            className="bg-forest-800 hover:bg-forest-700 text-white text-[11px] px-2.5 py-1 rounded font-bold transition shadow-sm"
                          >
                            Approve PPCC
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Cleared</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VENDORS */}
      {activeTab === 'VENDORS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vendors.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{v.name}</h4>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                    {v.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Business Reg:</span>
                    <span className="font-bold text-slate-800">{v.businessRegNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">LRA Tax Clearance:</span>
                    <span className="text-blue-700 font-bold">{v.lraTaxClearanceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">PPCC Vendor ID:</span>
                    <span className="text-purple-700 font-bold">{v.ppccRegId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Tax Clearance Expiry:</span>
                    <span className="text-emerald-700">{v.taxClearanceExpiry}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Contact: {v.contactPerson}</span>
                  <span className="font-bold text-amber-600">★ {v.rating} / 5.0</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASE ORDERS */}
      {activeTab === 'PURCHASE_ORDERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Purchase Orders (PO) Ledger</h3>
                <p className="text-xs text-slate-500">Official commitments dispatched to verified vendors</p>
              </div>
              <button
                onClick={() => setShowAddPOModal(true)}
                className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-sm flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Purchase Order</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">PO Number & Date</th>
                    <th className="px-4 py-3">Vendor / Requisition Ref</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Total (USD)</th>
                    <th className="px-4 py-3 text-center">3-Way Match</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{po.poNumber}</div>
                        <div className="text-[11px] text-slate-400">Issued: {po.issueDate}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{po.vendorName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{po.prNo}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-700">
                        {po.description}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ${po.totalUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          po.threeWayMatch.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {po.threeWayMatch.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 3-WAY MATCHING ENGINE */}
      {activeTab === 'THREE_WAY_MATCH' && (
        <div className="space-y-4">
          <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 text-xs text-forest-900 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-forest-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Automated 3-Way Matching Engine (TOR §6 Methodology)</p>
              <p className="text-forest-700 mt-0.5">
                Before any payment voucher is certified for disbursement, the platform performs cryptographic and data reconciliation between: (1) Approved Requisition, (2) Purchase Order, (3) Physical Goods Received Note (GRN) from Central Stores, and (4) Supplier Commercial Invoice.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {purchaseOrders.map(po => (
              <div key={po.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900">{po.poNumber}</span>
                    <span className="ml-2 text-xs font-semibold text-slate-600">Vendor: {po.vendorName}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{po.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold font-mono text-slate-900">
                      ${po.totalUSD.toLocaleString()} USD
                    </span>
                  </div>
                </div>

                {/* 4 Pillars of Match */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {/* Pillar 1 */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">1. Requisition</span>
                      <p className="font-mono font-bold text-slate-800">{po.prNo}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>

                  {/* Pillar 2 */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">2. Approved PO</span>
                      <p className="font-mono font-bold text-slate-800">{po.poNumber}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>

                  {/* Pillar 3 */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">3. Store GRN</span>
                      <p className="font-mono font-bold text-slate-800">
                        {po.threeWayMatch.grnMatched ? 'GRN-VERIFIED' : 'PENDING RECEIPT'}
                      </p>
                    </div>
                    {po.threeWayMatch.grnMatched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>

                  {/* Pillar 4 */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">4. Supplier Invoice</span>
                      <p className="font-mono font-bold text-slate-800">
                        {po.threeWayMatch.invoiceMatched ? 'INV-AUDITED' : 'PENDING INVOICE'}
                      </p>
                    </div>
                    {po.threeWayMatch.invoiceMatched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </div>

                {/* Match Action */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-700">Audit Status:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      po.threeWayMatch.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {po.threeWayMatch.status === 'VERIFIED' ? '100% 3-Way Match Verified' : 'Awaiting Goods Delivery & Invoice Audit'}
                    </span>
                  </div>

                  {po.threeWayMatch.status !== 'VERIFIED' && (
                    <button
                      onClick={() => executeThreeWayMatch(po.id)}
                      className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold transition shadow-sm"
                    >
                      Execute 3-Way Match Verification
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Requisition Modal */}
      {showAddReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Create Procurement Requisition</h3>
              </div>
              <button
                onClick={() => setShowAddReqModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReq} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Procurement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supply of Solar Powered Field Communications Kits"
                  value={newReq.title}
                  onChange={e => setNewReq({ ...newReq, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <select
                    value={newReq.department}
                    onChange={e => setNewReq({ ...newReq, department: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="Commercial & Conservation Forestry">Commercial & Conservation Forestry</option>
                    <option value="Law Enforcement & Wildlife Division">Law Enforcement & Wildlife Division</option>
                    <option value="Administration & Finance / IT Directorate">Administration & Finance / IT Directorate</option>
                    <option value="Community Forestry">Community Forestry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estimated Budget (USD)</label>
                  <input
                    type="number"
                    required
                    value={newReq.estimatedBudgetUSD}
                    onChange={e => {
                      const cost = Number(e.target.value);
                      let method: ProcurementRequisition['ppccMethod'] = 'REQUEST_FOR_QUOTATION';
                      if (cost > 100000) method = 'INTERNATIONAL_BIDDING';
                      else if (cost > 30000) method = 'NATIONAL_COMPETITIVE_BIDDING';
                      else if (cost > 10000) method = 'RESTRICTED_TENDERING';

                      setNewReq({
                        ...newReq,
                        estimatedBudgetUSD: cost,
                        ppccMethod: method
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">PPCC Statutory Method (Auto-calculated)</label>
                <input
                  type="text"
                  disabled
                  value={newReq.ppccMethod.replace(/_/g, ' ')}
                  className="w-full p-2 border border-slate-200 bg-slate-100 rounded-md font-semibold text-purple-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddReqModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded font-bold transition shadow"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New PO Modal */}
      {showAddPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Issue Official Purchase Order</h3>
              </div>
              <button
                onClick={() => setShowAddPOModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Requisition Reference</label>
                <select
                  value={newPO.prNo}
                  onChange={e => setNewPO({ ...newPO, prNo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                >
                  {procurementReqs.map(r => (
                    <option key={r.id} value={r.prNo}>{r.prNo} — {r.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Awarded Vendor</label>
                <select
                  value={newPO.vendorId}
                  onChange={e => {
                    const vend = vendors.find(v => v.id === e.target.value);
                    setNewPO({
                      ...newPO,
                      vendorId: e.target.value,
                      vendorName: vend?.name || ''
                    });
                  }}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} (PPCC: {v.ppccRegId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Delivery Scope / Description</label>
                <input
                  type="text"
                  required
                  placeholder="Detailed schedule of goods..."
                  value={newPO.description}
                  onChange={e => setNewPO({ ...newPO, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Amount (USD)</label>
                  <input
                    type="number"
                    required
                    value={newPO.totalUSD}
                    onChange={e => setNewPO({ ...newPO, totalUSD: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={newPO.expectedDelivery}
                    onChange={e => setNewPO({ ...newPO, expectedDelivery: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddPOModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded font-bold transition shadow"
                >
                  Generate & Issue PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
