import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RTMRequirement } from '../../types';
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  Search,
  Filter,
  Printer,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const RTMModule: React.FC = () => {
  const { rtmRequirements, setActiveModule, openPrintModal } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const categories = Array.from(new Set(rtmRequirements.map(r => r.category)));

  const filtered = rtmRequirements.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.reqId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.specification.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.torSection.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCategory === 'ALL' || r.category === filterCategory;
    return matchesSearch && matchesCat;
  });

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

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              REOI §4 Mandatory Deliverable
            </span>
            <span className="text-xs text-emerald-700 font-bold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              100% Demonstration Evidence Ready
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Requirements Traceability Matrix (RTM)
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Full statutory alignment with REOI & Terms of Reference for FDA Integrated System Development
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => openPrintModal({
              type: 'RTM_REPORT',
              data: {
                title: 'Official FDA Requirements Traceability Matrix & Compliance Dossier',
                items: rtmRequirements
              }
            })}
            className="inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Compliance Dossier</span>
          </button>
        </div>
      </div>

      {/* REOI Legal Assurance Alert */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800 text-xs flex items-start space-x-3">
        <Sparkles className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-slate-100">
            Mandate Verification (REOI §4 Specification):
          </p>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            "Deliver a requirements traceability matrix linking every requirement to the proposed feature, configuration, customization, interface/intranet, test case, evidence, and acceptance status. Responses such as 'available' or 'compliant' without demonstration evidence shall not be sufficient."
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search requirements, REOI clauses, test cases..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-600 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Category:</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-md text-xs py-1 px-2 focus:ring-forest-600 focus:outline-none"
          >
            <option value="ALL">All Categories ({rtmRequirements.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-4">
        {filtered.map(req => {
          const targetModule = getModuleForReq(req.reqId);

          return (
            <div
              key={req.reqId}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                    {req.reqId}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {req.torSection}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {req.category}
                  </span>
                </div>

                <span className="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  {req.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{req.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  <strong className="text-slate-800">REOI / TOR Clause:</strong> {req.specification}
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-200 space-y-1.5">
                <p className="text-forest-900">
                  <strong className="text-slate-900">Platform Implementation:</strong> {req.platformImplementation}
                </p>
                <p className="text-blue-900 font-mono text-[11px]">
                  <strong>Test Case & Evidence:</strong> {req.testCase}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Evidence Location: <strong>Module {targetModule}</strong>
                </span>
                <button
                  onClick={() => setActiveModule(targetModule as any)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-forest-700 hover:text-forest-900 hover:underline"
                >
                  <span>Launch Interactive Evidence Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
