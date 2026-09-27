import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FDA_LOGO_URL } from '../../assets/logo';
import {
  Printer,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  FileText,
  Search,
  ArrowRight
} from 'lucide-react';

export const PrintModal: React.FC = () => {
  const { printPayload, closePrintModal, setActiveModule } = useApp();
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePrintModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePrintModal]);

  if (!printPayload) return null;

  const handlePrint = () => {
    window.print();
  };

  const toggleExpand = (reqId: string) => {
    setExpandedReqId(prev => (prev === reqId ? null : reqId));
  };

  const getModuleForReq = (reqId: string) => {
    switch (reqId) {
      case 'REQ-TOR-02':
      case 'REQ-TOR-06':
      case 'REQ-TOR-07':
        return 'FINANCE';
      case 'REQ-TOR-03':
      case 'REQ-TOR-08':
        return 'HRMIS';
      case 'REQ-TOR-04':
      case 'REQ-TOR-09':
        return 'PROCUREMENT';
      case 'REQ-TOR-10':
        return 'ASSETS';
      case 'REQ-TOR-05':
      case 'REQ-TOR-11':
        return 'OPERATIONS';
      case 'REQ-TOR-12':
        return 'AUDIT';
      default:
        return 'DASHBOARD';
    }
  };

  const handleNavigateToModule = (reqId: string) => {
    const target = getModuleForReq(reqId);
    closePrintModal();
    setActiveModule(target as any);
  };

  // Filter items if it's RTM report
  const rawItems = printPayload.type === 'RTM_REPORT' ? printPayload.data.items || [] : [];
  const filteredItems = rawItems.filter((item: any) => {
    if (!searchTerm) return true;
    return (
      item.reqId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.specification?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        // Close if clicking outside the modal dialog
        if (e.target === e.currentTarget) {
          closePrintModal();
        }
      }}
    >
      {/* Floating Exit Button (Always accessible) */}
      <button
        onClick={closePrintModal}
        title="Exit Form (Press Escape)"
        className="no-print fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-2xl transition flex items-center justify-center border-2 border-white"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-4 sm:my-8 flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        
        {/* Sticky Top Controls Header */}
        <div className="no-print sticky top-0 z-30 px-5 py-3.5 bg-forest-900 text-white flex items-center justify-between border-b border-forest-800 shadow-md">
          <div className="flex items-center space-x-2.5">
            <Printer className="w-4 h-4 text-gold-400" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                Official Document Preview & Line Items
              </span>
              <span className="text-[10px] text-forest-300">
                Click any line item to expand full technical specifications
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-forest-700 hover:bg-forest-600 text-white text-xs px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={closePrintModal}
              className="bg-red-700 hover:bg-red-600 text-white text-xs px-3.5 py-2 rounded-lg font-bold transition flex items-center space-x-1 shadow"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Form (Esc)</span>
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-6 sm:p-10 text-slate-900 space-y-6 bg-white" id="printable-area">
          
          {/* Official Letterhead */}
          <div className="border-b-2 border-forest-900 pb-4 text-center relative">
            <div className="flex items-center justify-center space-x-4">
              <img
                src={FDA_LOGO_URL}
                alt="FDA Seal"
                className="w-16 h-16 object-contain"
              />
              <div>
                <h2 className="text-xl font-black text-forest-900 uppercase tracking-wide">
                  Forestry Development Authority
                </h2>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Republic of Liberia
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Whein Town, Bernard Farm, Montserrado County • P.O. Box 3010, Monrovia, Liberia
                </p>
                <p className="text-[10px] text-forest-800 font-semibold">
                  Established under the Act of 1976 & National Forestry Reform Law of 2006
                </p>
              </div>
              <img
                src={FDA_LOGO_URL}
                alt="FDA Seal"
                className="w-16 h-16 object-contain opacity-0 sm:opacity-100"
              />
            </div>
          </div>

          {/* DOCUMENT BODY: 1. PAYMENT VOUCHER */}
          {printPayload.type === 'PAYMENT_VOUCHER' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Document Reference</span>
                  <p className="text-base font-bold font-mono text-slate-900">{printPayload.data.voucherNo}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Date Issued</span>
                  <p className="font-mono text-slate-800">{printPayload.data.dateCreated}</p>
                  {printPayload.data.ifmisCommitmentNo && (
                    <p className="text-[10px] font-mono text-blue-700 font-bold">{printPayload.data.ifmisCommitmentNo}</p>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Beneficiary / Payee:</span>
                    <p className="font-bold text-sm text-slate-900 mt-0.5">{printPayload.data.payee}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Payment Currency:</span>
                    <p className="font-bold text-slate-900 mt-0.5">{printPayload.data.currency} (United States Dollars / Liberian Dollars)</p>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Expenditure Description & Account Code:</span>
                  <p className="text-slate-800 font-medium mt-0.5">{printPayload.data.description}</p>
                  <p className="font-mono text-[11px] text-forest-800 font-bold mt-1">Vote Code: {printPayload.data.voteCode}</p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-mono bg-forest-50/50 p-3 rounded">
                  <div>
                    <span className="font-sans font-bold text-slate-700">Total Authorized Amount:</span>
                    <p className="text-xl font-extrabold text-forest-900 mt-0.5">
                      ${printPayload.data.amountUSD.toLocaleString()} USD
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-sans text-[11px] text-slate-500">Official Rate Equivalent:</span>
                    <p className="text-sm font-bold text-slate-800">
                      {printPayload.data.amountLRD.toLocaleString()} LRD
                    </p>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 text-[11px]">
                <div className="border-t border-slate-400 pt-2 text-center">
                  <p className="font-bold text-slate-800">{printPayload.data.initiator}</p>
                  <p className="text-[10px] text-slate-500">Requisitioner / Department Head</p>
                  <p className="text-[9px] text-slate-400 mt-1">Date: {printPayload.data.dateCreated}</p>
                </div>

                <div className="border-t border-slate-400 pt-2 text-center">
                  <p className="font-bold text-slate-800">J. Varney Kpaiseh</p>
                  <p className="text-[10px] text-slate-500">Director of Finance & Budget</p>
                  <p className="text-[9px] text-emerald-700 font-bold mt-1">✓ Vote Book Certified</p>
                </div>

                <div className="border-t border-slate-400 pt-2 text-center">
                  <p className="font-bold text-slate-800">Hon. Rudolph J. Merab, Sr.</p>
                  <p className="text-[10px] text-slate-500">Managing Director & CEO</p>
                  <p className="text-[9px] text-forest-800 font-bold mt-1">✓ Executive Approval Signed</p>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT BODY: 2. ASSET TAG */}
          {printPayload.type === 'ASSET_TAG' && (
            <div className="p-6 border-2 border-dashed border-forest-800 rounded-xl space-y-4 text-center max-w-md mx-auto bg-slate-50">
              <div className="flex items-center justify-center space-x-2">
                <img src={FDA_LOGO_URL} alt="FDA Logo" className="w-10 h-10 object-contain" />
                <div className="text-left">
                  <h3 className="font-extrabold text-sm text-forest-900 uppercase">
                    Forestry Development Authority
                  </h3>
                  <p className="text-[10px] text-slate-600 font-semibold">Government of Liberia Official Asset</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-slate-300 font-mono text-center space-y-2">
                <p className="text-xl font-black text-slate-900 tracking-wider">
                  {printPayload.data.assetTag}
                </p>
                <div className="h-10 bg-slate-800 text-white flex items-center justify-center text-[10px] tracking-widest">
                  || | ||| || |||| || ||| |||| | ||
                </div>
                <p className="text-xs text-slate-500">Barcode: {printPayload.data.barcode}</p>
              </div>

              <div className="text-left text-xs space-y-1 bg-white p-3 rounded border border-slate-200">
                <p><strong>Item Name:</strong> {printPayload.data.name}</p>
                <p><strong>Serial Number:</strong> {printPayload.data.serialNumber}</p>
                <p><strong>Duty Station:</strong> {printPayload.data.location}</p>
                <p><strong>Custodian:</strong> {printPayload.data.assignedStaff}</p>
              </div>
            </div>
          )}

          {/* DOCUMENT BODY: 3. PAYROLL SLIP */}
          {printPayload.type === 'PAYROLL_SLIP' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Republic of Liberia • Civil Service & FDA Pay Advice</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{printPayload.data.employeeName}</h3>
                  <p className="text-[11px] text-slate-600">Payroll Cycle: {printPayload.data.period} • Exchange Rate: 1 USD = 195 LRD</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Disbursement Ref</span>
                  <p className="text-xs font-bold text-slate-800">{printPayload.data.id}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">{printPayload.data.csaApprovalRef || 'CSA Reconciled & Approved'}</p>
                </div>
              </div>

              {/* Bank & Remittance Details */}
              <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex flex-wrap justify-between items-center text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-semibold">Commercial Bank:</span>
                  <span className="font-bold text-blue-900">{printPayload.data.bankName || 'LBDI (Liberian Bank for Dev & Investment)'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-semibold">Account Number:</span>
                  <span className="font-mono font-bold text-slate-800">{printPayload.data.accountNumber || '102-441-903210'}</span>
                </div>
                <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                  <span>● Direct ACH/EFT Authorized</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 rounded-lg font-mono">
                <div className="space-y-2">
                  <h4 className="font-sans font-bold text-slate-800 border-b pb-1">Earnings & Field Allowances</h4>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Monthly Salary:</span>
                    <strong>${(printPayload.data.baseSalaryUSD || printPayload.data.grossUSD).toLocaleString()} USD</strong>
                  </div>
                  {printPayload.data.hazardPayUSD ? (
                    <div className="flex justify-between text-amber-800">
                      <span>Ranger Hazard Pay:</span>
                      <span>+${printPayload.data.hazardPayUSD.toLocaleString()} USD</span>
                    </div>
                  ) : null}
                  {printPayload.data.fieldAllowanceUSD ? (
                    <div className="flex justify-between text-blue-800">
                      <span>County Duty Allowance:</span>
                      <span>+${printPayload.data.fieldAllowanceUSD.toLocaleString()} USD</span>
                    </div>
                  ) : null}
                  <div className="border-t pt-1 flex justify-between font-bold text-slate-900">
                    <span>Total Gross Wages:</span>
                    <span>${printPayload.data.grossUSD.toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>LRD Equivalent:</span>
                    <span>{printPayload.data.grossLRD.toLocaleString()} LRD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-sans font-bold text-slate-800 border-b pb-1">Statutory Deductions (GoL)</h4>
                  <div className="flex justify-between text-red-600">
                    <span>LRA Personal Income Tax (20%):</span>
                    <span>-${printPayload.data.taxWithheldUSD.toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>NASSCORP Pension (4%):</span>
                    <span>-${printPayload.data.nasscorpUSD.toLocaleString()} USD</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-bold text-red-700">
                    <span>Total Statutory Deductions:</span>
                    <span>-${(printPayload.data.taxWithheldUSD + printPayload.data.nasscorpUSD).toLocaleString()} USD</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans mt-2">
                    Deductions withheld at source in strict compliance with Liberian Revenue Authority and NASSCORP Acts.
                  </p>
                </div>
              </div>

              <div className="bg-forest-50 p-3.5 rounded-lg border border-forest-200 flex justify-between font-mono font-bold text-forest-900 text-sm">
                <span>Net Commercial Bank Remittance:</span>
                <span>${printPayload.data.netPayUSD.toLocaleString()} USD ({printPayload.data.netPayLRD.toLocaleString()} LRD)</span>
              </div>
            </div>
          )}

          {/* DOCUMENT BODY: 4. RTM COMPLIANCE DOSSIER (WITH EXPANDABLE LINE ITEMS) */}
          {printPayload.type === 'RTM_REPORT' && (
            <div className="space-y-4 text-xs">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Requirements Traceability Matrix (REOI §4 Compliance Dossier)
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                    All 12 REOI / TOR Clauses Verified
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every clause is mapped directly to a live functional feature. <strong>Click any requirement card below</strong> to expand its full technical specifications, test case procedure, and live evidence.
                </p>

                {/* Quick Search */}
                <div className="no-print pt-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search requirement, clause, or feature (e.g. IFMIS, Payroll, Biometrics)..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:ring-forest-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Line Items */}
              <div className="space-y-2.5">
                {filteredItems.map((item: any) => {
                  const isExpanded = expandedReqId === item.reqId;

                  return (
                    <div
                      key={item.reqId}
                      className={`rounded-xl border transition cursor-pointer ${
                        isExpanded
                          ? 'border-forest-700 bg-forest-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                      onClick={() => toggleExpand(item.reqId)}
                    >
                      {/* Card Summary Header */}
                      <div className="p-3.5 flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                              {item.reqId}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {item.torSection}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {item.specification}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            FULLY COMPLIANT
                          </span>
                          <div className="no-print text-slate-400 hover:text-slate-700 p-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Full Technical Details */}
                      {isExpanded && (
                        <div
                          className="px-4 pb-4 pt-1 border-t border-slate-200/80 space-y-3 text-xs bg-white/80 rounded-b-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 uppercase text-[10px]">
                              Official Statutory Mandate & Specification:
                            </span>
                            <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 font-medium">
                              {item.specification}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="font-bold text-forest-900 uppercase text-[10px]">
                              Platform Engineering Implementation:
                            </span>
                            <p className="text-forest-950 leading-relaxed bg-forest-50/70 p-2.5 rounded border border-forest-200">
                              {item.platformImplementation}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="font-bold text-blue-900 uppercase text-[10px]">
                              Approved Test Case & Acceptance Verification:
                            </span>
                            <p className="text-blue-950 font-mono text-[11px] bg-blue-50/60 p-2.5 rounded border border-blue-200">
                              {item.testCase}
                            </p>
                          </div>

                          {/* Action Button: Jump directly to live feature in system */}
                          <div className="no-print pt-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">
                              Target System Module: <strong>{getModuleForReq(item.reqId)}</strong>
                            </span>

                            <button
                              onClick={() => handleNavigateToModule(item.reqId)}
                              className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 shadow"
                            >
                              <span>Exit Preview & Open Live Feature</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Document Security Footnote */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 font-mono gap-2">
            <span>FDA Integrated MIS Platform • Whein Town, Bernard Farm HQ</span>
            <span>Digitally Authenticated Government Document</span>
          </div>

        </div>

        {/* Sticky Bottom Actions Bar (Convenient for mobile or scrolled users) */}
        <div className="no-print sticky bottom-0 z-30 px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium hidden sm:inline">
            Press <strong>Escape</strong> or click <strong>Exit Form</strong> to return to the active platform screen.
          </span>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition flex items-center space-x-1 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
            <button
              onClick={closePrintModal}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition flex items-center space-x-1 shadow"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit Form</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
