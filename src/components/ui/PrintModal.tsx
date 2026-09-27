import React from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';

export const PrintModal: React.FC = () => {
  const { printPayload, closePrintModal } = useApp();

  if (!printPayload) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8">
        
        {/* Modal Controls (Not printed) */}
        <div className="no-print px-5 py-3.5 bg-forest-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-gold-400" />
            <span className="font-bold text-xs uppercase tracking-wider">Official Document Print Preview</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-forest-700 hover:bg-forest-600 text-white text-xs px-3 py-1.5 rounded font-bold transition flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Document</span>
            </button>
            <button
              onClick={closePrintModal}
              className="text-slate-300 hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Printable Document Content */}
        <div className="p-8 text-slate-900 space-y-6 bg-white" id="printable-area">
          
          {/* Official Letterhead */}
          <div className="border-b-2 border-forest-900 pb-4 text-center relative">
            <div className="flex items-center justify-center space-x-4">
              <img
                src="/fda-logo.png"
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
                src="/fda-logo.png"
                alt="FDA Seal"
                className="w-16 h-16 object-contain opacity-0 sm:opacity-100"
              />
            </div>
          </div>

          {/* DOCUMENT BODY BASED ON TYPE */}
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

          {/* ASSET TAG PRINT PREVIEW */}
          {printPayload.type === 'ASSET_TAG' && (
            <div className="p-6 border-2 border-dashed border-forest-800 rounded-xl space-y-4 text-center max-w-md mx-auto bg-slate-50">
              <div className="flex items-center justify-center space-x-2">
                <img src="/fda-logo.png" alt="FDA Logo" className="w-10 h-10 object-contain" />
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

          {/* PAYROLL SLIP */}
          {printPayload.type === 'PAYROLL_SLIP' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Official Pay Advice</span>
                  <h3 className="text-sm font-bold text-slate-900">{printPayload.data.employeeName}</h3>
                  <p className="text-[11px] text-slate-600">Period: {printPayload.data.period}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Disbursement Ref</span>
                  <p className="text-xs font-bold text-slate-800">{printPayload.data.id}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">CSA Reconciled</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 rounded font-mono">
                <div className="space-y-2">
                  <h4 className="font-sans font-bold text-slate-700 border-b pb-1">Earnings</h4>
                  <div className="flex justify-between">
                    <span>Base Monthly Gross:</span>
                    <strong>${printPayload.data.grossUSD.toLocaleString()} USD</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>LRD Component:</span>
                    <span>{printPayload.data.grossLRD.toLocaleString()} LRD</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-sans font-bold text-slate-700 border-b pb-1">Statutory Deductions</h4>
                  <div className="flex justify-between text-red-600">
                    <span>LRA Personal Income Tax:</span>
                    <span>-${printPayload.data.taxWithheldUSD.toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>NASSCORP Social Security:</span>
                    <span>-${printPayload.data.nasscorpUSD.toLocaleString()} USD</span>
                  </div>
                </div>
              </div>

              <div className="bg-forest-50 p-3 rounded border border-forest-200 flex justify-between font-mono font-bold text-forest-900">
                <span>Net Disbursed Take-Home:</span>
                <span>${printPayload.data.netPayUSD.toLocaleString()} USD ({printPayload.data.netPayLRD.toLocaleString()} LRD)</span>
              </div>
            </div>
          )}

          {/* RTM DOSSIER SUMMARY */}
          {printPayload.type === 'RTM_REPORT' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Requirements Traceability Matrix (REOI Section 4 Compliance Dossier)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Full demonstration evidence across all legal mandates, national integration boundaries, budget vote books, asset tagging, and decentralized county operations.
                </p>
              </div>

              <div className="space-y-2">
                {printPayload.data.items?.map((item: any) => (
                  <div key={item.reqId} className="p-2.5 rounded border border-slate-200 bg-white">
                    <div className="flex justify-between font-bold">
                      <span className="font-mono">{item.reqId} — {item.title}</span>
                      <span className="text-emerald-700">FULLY COMPLIANT</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{item.specification}</p>
                    <p className="text-[10px] text-forest-900 font-medium mt-0.5">Implementation: {item.platformImplementation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Security Footnote */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>FDA Integrated MIS Platform • Whein Town, Bernard Farm HQ</span>
            <span>Digitally Authenticated Document</span>
          </div>

        </div>

      </div>
    </div>
  );
};
