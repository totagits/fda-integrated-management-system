import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Employee, LiberiaCounty } from '../../types';
import {
  Users,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Printer,
  ShieldCheck,
  Building,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export const HRMISModule: React.FC = () => {
  const {
    employees,
    addEmployee,
    leaveRequests,
    approveLeave,
    rejectLeave,
    payrollRecords,
    processPayrollRun,
    syncWithCSA,
    openPrintModal,
    currentPersona
  } = useApp();

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'LEAVE' | 'PAYROLL' | 'CSA_SYNC'>('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCounty, setFilterCounty] = useState<string>('ALL');
  const [filterCadre, setFilterCadre] = useState<string>('ALL');

  // New Employee Modal state
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    empNo: `FDA/RNG/${Math.floor(100 + Math.random() * 900)}`,
    fullName: '',
    email: '',
    phone: '',
    department: 'Conservation & Wildlife',
    position: 'Forest Ranger',
    county: 'Nimba' as LiberiaCounty,
    dutyStation: 'East Nimba Nature Reserve Station',
    gradeBand: 'Technical Cadre T2',
    biometricId: `BIO-NIM-${Math.floor(10000 + Math.random() * 90000)}`,
    cadre: 'FIELD_RANGER' as Employee['cadre'],
    salaryUSD: 1200,
    salaryLRD: 234000,
    dateEmployed: new Date().toISOString().substring(0, 10),
    csaSyncStatus: 'SYNCED' as const,
    status: 'ACTIVE' as const
  });

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.empNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCounty = filterCounty === 'ALL' || emp.county === filterCounty;
    const matchesCadre = filterCadre === 'ALL' || emp.cadre === filterCadre;
    return matchesSearch && matchesCounty && matchesCadre;
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.fullName) return;
    addEmployee(newEmp);
    setShowAddEmpModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              TOR §6 Enterprise Module
            </span>
            <span className="text-xs text-slate-500 font-mono">CSA Boundary Active</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Human Resource Management & Dual-Currency Payroll
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Headquarters & County Ranger Cadre Administration • Civil Service Agency (CSA) Biometric Synchronization
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => syncWithCSA()}
            className="inline-flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg font-bold border border-blue-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync CSA Biometrics</span>
          </button>
          <button
            onClick={() => setShowAddEmpModal(true)}
            className="inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Personnel</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'DIRECTORY'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVE')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'LEAVE'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Leave & Field Patrol Rest ({leaveRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYROLL')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'PAYROLL'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Dual-Currency Payroll (USD/LRD)</span>
        </button>

        <button
          onClick={() => setActiveTab('CSA_SYNC')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'CSA_SYNC'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>CSA HRMIS / Biometric Gateway</span>
        </button>
      </div>

      {/* TAB 1: DIRECTORY */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, emp # or post..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-forest-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>County:</span>
                <select
                  value={filterCounty}
                  onChange={e => setFilterCounty(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-md text-xs py-1 px-2 focus:ring-forest-600 focus:outline-none"
                >
                  <option value="ALL">All 15 Counties</option>
                  <option value="Montserrado">Montserrado (HQ)</option>
                  <option value="Nimba">Nimba</option>
                  <option value="Sinoe">Sinoe</option>
                  <option value="Grand Bassa">Grand Bassa</option>
                  <option value="Lofa">Lofa</option>
                  <option value="Gbarpolu">Gbarpolu</option>
                  <option value="Grand Gedeh">Grand Gedeh</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                <span>Cadre:</span>
                <select
                  value={filterCadre}
                  onChange={e => setFilterCadre(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-md text-xs py-1 px-2 focus:ring-forest-600 focus:outline-none"
                >
                  <option value="ALL">All Cadres</option>
                  <option value="CIVIL_SERVICE">Civil Service Cadre</option>
                  <option value="FDA_PERMANENT">FDA Permanent</option>
                  <option value="FIELD_RANGER">Field Ranger / Wildlife</option>
                  <option value="CONTRACTUAL">Contractual</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Employee # / Name</th>
                    <th className="px-4 py-3">Department & Role</th>
                    <th className="px-4 py-3">Duty Station & County</th>
                    <th className="px-4 py-3">Biometric ID</th>
                    <th className="px-4 py-3 text-right">Base Salary</th>
                    <th className="px-4 py-3 text-center">CSA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{emp.fullName}</div>
                        <div className="text-[11px] font-mono text-slate-500">{emp.empNo}</div>
                        <div className="text-[10px] text-slate-400">{emp.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{emp.position}</div>
                        <div className="text-[11px] text-slate-500">{emp.department}</div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {emp.gradeBand}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{emp.dutyStation}</div>
                        <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {emp.county} County
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {emp.biometricId}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-bold text-slate-900">${emp.salaryUSD.toLocaleString()} USD</div>
                        <div className="text-[10px] text-slate-500">{emp.salaryLRD.toLocaleString()} LRD</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />
                          {emp.csaSyncStatus}
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

      {/* TAB 2: LEAVE & FIELD REST */}
      {activeTab === 'LEAVE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Leave & Extended Patrol Compensatory Rest Workflow
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Controlled multi-tier digital authorization for FDA Headquarters and County Ranger stations.
            </p>

            <div className="divide-y divide-slate-100">
              {leaveRequests.map(req => (
                <div key={req.id} className="py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">{req.employeeName}</span>
                      <span className="text-[10px] font-bold bg-forest-50 text-forest-800 px-2 py-0.5 rounded border border-forest-200">
                        {req.leaveType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">({req.days} days)</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{req.reason}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Period: {req.startDate} to {req.endDate} • Applied on {req.appliedDate}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                    {req.status === 'APPROVED' ? (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Approved by {req.approvedBy}
                      </span>
                    ) : req.status === 'REJECTED' ? (
                      <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-200">
                        Rejected
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => approveLeave(req.id)}
                          className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3 py-1.5 rounded font-bold transition shadow-sm"
                        >
                          Approve Leave
                        </button>
                        <button
                          onClick={() => rejectLeave(req.id)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded font-medium transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DUAL-CURRENCY PAYROLL */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Dual-Currency (USD / LRD) Statutory Payroll Processing
                </h3>
                <p className="text-xs text-slate-500">
                  Compliant with Liberia Revenue Authority (LRA) personal income tax schedule & NASSCORP social security.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => processPayrollRun('September 2026')}
                  className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Execute Monthly Payroll Run</span>
                </button>
                <button
                  onClick={() => openPrintModal({
                    type: 'PAYROLL_SLIP',
                    data: payrollRecords[0]
                  })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-2 rounded-lg font-bold border border-slate-300 transition flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pay Slip</span>
                </button>
              </div>
            </div>

            {/* Payroll Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Gross Monthly Wage Bill</span>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  ${payrollRecords.reduce((acc, r) => acc + r.grossUSD, 0).toLocaleString()} USD
                </p>
                <p className="text-xs text-slate-500">
                  {payrollRecords.reduce((acc, r) => acc + r.grossLRD, 0).toLocaleString()} LRD
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">LRA Income Tax Withheld</span>
                <p className="text-lg font-bold text-blue-700 mt-1">
                  ${payrollRecords.reduce((acc, r) => acc + r.taxWithheldUSD, 0).toLocaleString()} USD
                </p>
                <p className="text-xs text-slate-500">Payable to Liberia Revenue Authority</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">NASSCORP Social Security (4%)</span>
                <p className="text-lg font-bold text-emerald-700 mt-1">
                  ${payrollRecords.reduce((acc, r) => acc + r.nasscorpUSD, 0).toLocaleString()} USD
                </p>
                <p className="text-xs text-slate-500">Statutory Pension Contribution</p>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Staff Name</th>
                    <th className="px-4 py-2.5 text-right">Gross (USD)</th>
                    <th className="px-4 py-2.5 text-right">LRA Tax (20%)</th>
                    <th className="px-4 py-2.5 text-right">NASSCORP (4%)</th>
                    <th className="px-4 py-2.5 text-right">Net Payable (USD)</th>
                    <th className="px-4 py-2.5 text-right">Net Payable (LRD)</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payrollRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5 font-sans font-semibold text-slate-900">
                        {r.employeeName}
                        <span className="block text-[10px] text-slate-400 font-normal">{r.period}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">${r.grossUSD.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">-${r.taxWithheldUSD.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700">-${r.nasscorpUSD.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                        ${r.netPayUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                        ${r.netPayLRD.toLocaleString()} LRD
                      </td>
                      <td className="px-4 py-2.5 text-center font-sans">
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                          {r.status}
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

      {/* TAB 4: CSA SYNC */}
      {activeTab === 'CSA_SYNC' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Civil Service Agency (CSA) Biometric & Cadre Boundary (TOR §3)
              </h3>
              <p className="text-xs text-slate-500">
                Complies with national civil service regulations to ensure FDA staffing complements national biometric records.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">CSA Biometric Registry</span>
              <p className="text-xl font-bold text-slate-900 mt-1">100% Mapped</p>
              <p className="text-[11px] text-slate-500 mt-1">All 15 county rangers and HQ staff linked with CSA biometric IDs.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Civil Service Grade Sync</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">Standardized Bands</p>
              <p className="text-[11px] text-slate-500 mt-1">Executive, Professional P1-P4, and Technical Ranger Cadres aligned.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Ghost Employee Defense</span>
              <p className="text-xl font-bold text-blue-700 mt-1">Zero Discrepancies</p>
              <p className="text-[11px] text-slate-500 mt-1">Biometric clock-in required for payroll approval.</p>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Onboard FDA Staff / Ranger</h3>
              </div>
              <button
                onClick={() => setShowAddEmpModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={newEmp.fullName}
                    onChange={e => setNewEmp({ ...newEmp, fullName: e.target.value })}
                    placeholder="e.g. Sando G. Blama"
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee Number</label>
                  <input
                    type="text"
                    required
                    value={newEmp.empNo}
                    onChange={e => setNewEmp({ ...newEmp, empNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <select
                    value={newEmp.department}
                    onChange={e => setNewEmp({ ...newEmp, department: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="Conservation & Wildlife">Conservation & Wildlife</option>
                    <option value="Commercial Forestry">Commercial Forestry</option>
                    <option value="Community Forestry">Community Forestry</option>
                    <option value="Finance & Administration">Finance & Administration</option>
                    <option value="Law Enforcement & Checkpoints">Law Enforcement & Checkpoints</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Position / Job Title</label>
                  <input
                    type="text"
                    required
                    value={newEmp.position}
                    onChange={e => setNewEmp({ ...newEmp, position: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">County of Assignment</label>
                  <select
                    value={newEmp.county}
                    onChange={e => setNewEmp({ ...newEmp, county: e.target.value as LiberiaCounty })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="Montserrado">Montserrado</option>
                    <option value="Nimba">Nimba</option>
                    <option value="Sinoe">Sinoe</option>
                    <option value="Grand Bassa">Grand Bassa</option>
                    <option value="Lofa">Lofa</option>
                    <option value="Gbarpolu">Gbarpolu</option>
                    <option value="Grand Gedeh">Grand Gedeh</option>
                    <option value="Maryland">Maryland</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Duty Station</label>
                  <input
                    type="text"
                    value={newEmp.dutyStation}
                    onChange={e => setNewEmp({ ...newEmp, dutyStation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Base Monthly Salary (USD)</label>
                  <input
                    type="number"
                    required
                    value={newEmp.salaryUSD}
                    onChange={e => setNewEmp({
                      ...newEmp,
                      salaryUSD: Number(e.target.value),
                      salaryLRD: Number(e.target.value) * 195
                    })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Equivalent LRD (Rate: 195)</label>
                  <input
                    type="number"
                    disabled
                    value={newEmp.salaryLRD}
                    className="w-full p-2 border border-slate-200 bg-slate-100 rounded-md font-mono text-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded font-bold transition shadow"
                >
                  Confirm & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
