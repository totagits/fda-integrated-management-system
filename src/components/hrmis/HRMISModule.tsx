import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Employee, LiberiaCounty, FieldAttendanceLog } from '../../types';
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
  AlertCircle,
  MapPin,
  Compass,
  Radio,
  Award,
  AlertTriangle,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ChevronRight,
  X,
  Check,
  Briefcase,
  TrendingUp,
  Send,
  ArrowRight
} from 'lucide-react';

export const HRMISModule: React.FC = () => {
  const {
    employees,
    addEmployee,
    transferEmployeeStation,
    promoteEmployee,
    addDisciplinaryAction,
    fieldAttendanceLogs,
    logFieldAttendance,
    leaveRequests,
    approveLeave,
    rejectLeave,
    payrollRecords,
    processPayrollRun,
    syncWithCSA,
    runAntiGhostWorkerAudit,
    openPrintModal,
    currentPersona
  } = useApp();

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE' | 'PAYROLL' | 'LEAVE' | 'CSA_SYNC'>('DIRECTORY');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCounty, setFilterCounty] = useState<string>('ALL');
  const [filterCadre, setFilterCadre] = useState<string>('ALL');

  // Selected Employee for Dossier Drawer/Modal
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [dossierTab, setDossierTab] = useState<'OVERVIEW' | 'TRANSFERS' | 'PROMOTIONS' | 'DISCIPLINE' | 'RETIREMENT'>('OVERVIEW');

  // Sub-actions within dossier
  const [showTransferSubModal, setShowTransferSubModal] = useState(false);
  const [transferData, setTransferData] = useState({
    toCounty: 'Sinoe' as LiberiaCounty,
    toStation: 'Sapo National Park Sector HQ',
    reason: 'Strategic deployment for conservation law enforcement and chain-of-custody oversight'
  });

  const [showPromoSubModal, setShowPromoSubModal] = useState(false);
  const [promoData, setPromoData] = useState({
    newPosition: 'Senior Conservation Specialist',
    newGrade: 'Professional Band P3',
    newSalaryUSD: 2100
  });

  const [showDiscSubModal, setShowDiscSubModal] = useState(false);
  const [discData, setDiscData] = useState({
    incidentType: 'Field Patrol Route Discrepancy',
    description: 'Ranger log omitted checkpoint verification protocol at Sector 4 border marker.',
    actionTaken: 'Formal Written Warning & Protocol Retraining'
  });

  // Mobile Ranger GPS Checkin Simulation Modal
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    employeeId: employees[3]?.id || 'EMP-004',
    dutyStation: 'East Nimba Nature Reserve Station / Sanniquellie',
    county: 'Nimba' as LiberiaCounty,
    latitude: 7.5321,
    longitude: -8.5302,
    type: 'GPS_MOBILE_CHECKIN' as const,
    geoFenceStatus: 'INSIDE_PROTECTED_AREA' as const
  });

  // Commercial Bank ACH / Direct Disbursement Batch Generator Modal
  const [showBankBatchModal, setShowBankBatchModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('LBDI');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Anti-Ghost Worker Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{
    totalScanned: number;
    duplicatesFound: number;
    verifiedClean: number;
    auditTimestamp: string;
  } | null>(null);

  // New Employee Modal state
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    empNo: `FDA/RNG/${Math.floor(100 + Math.random() * 900)}`,
    fullName: '',
    email: '',
    phone: '',
    department: 'Conservation & Wildlife',
    position: 'Forest Ranger Inspector',
    county: 'Nimba' as LiberiaCounty,
    dutyStation: 'East Nimba Nature Reserve Station',
    gradeBand: 'Technical Cadre T2',
    biometricId: `BIO-NIM-${Math.floor(10000 + Math.random() * 90000)}`,
    cadre: 'FIELD_RANGER' as Employee['cadre'],
    salaryUSD: 1400,
    salaryLRD: 273000,
    hazardPayUSD: 300,
    fieldAllowanceUSD: 150,
    dateEmployed: new Date().toISOString().substring(0, 10),
    dateOfBirth: '1985-06-12',
    bankName: 'Liberian Bank for Development & Investment (LBDI)',
    accountNumber: `102-${Math.floor(100000 + Math.random() * 900000)}`,
    csaSyncStatus: 'SYNCED' as const,
    status: 'ACTIVE' as const
  });

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.empNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.biometricId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCounty = filterCounty === 'ALL' || emp.county === filterCounty;
    const matchesCadre = filterCadre === 'ALL' || emp.cadre === filterCadre;
    return matchesSearch && matchesCounty && matchesCadre;
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.fullName) return;
    addEmployee({
      ...newEmp,
      stationHistory: [],
      promotions: [],
      disciplinaryRecords: []
    });
    setShowAddEmpModal(false);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    transferEmployeeStation(selectedEmp.id, {
      fromStation: selectedEmp.dutyStation,
      toStation: transferData.toStation,
      fromCounty: selectedEmp.county,
      toCounty: transferData.toCounty,
      transferDate: new Date().toISOString().substring(0, 10),
      authorizedBy: `${currentPersona.name} (${currentPersona.title})`,
      reason: transferData.reason
    });
    // refresh active selection
    setSelectedEmp({
      ...selectedEmp,
      dutyStation: transferData.toStation,
      county: transferData.toCounty
    });
    setShowTransferSubModal(false);
  };

  const handleExecutePromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    promoteEmployee(selectedEmp.id, {
      effectiveDate: new Date().toISOString().substring(0, 10),
      previousPosition: selectedEmp.position,
      newPosition: promoData.newPosition,
      previousGrade: selectedEmp.gradeBand,
      newGrade: promoData.newGrade,
      previousSalaryUSD: selectedEmp.salaryUSD,
      newSalaryUSD: promoData.newSalaryUSD
    });
    setSelectedEmp({
      ...selectedEmp,
      position: promoData.newPosition,
      gradeBand: promoData.newGrade,
      salaryUSD: promoData.newSalaryUSD,
      salaryLRD: Math.round(promoData.newSalaryUSD * 195)
    });
    setShowPromoSubModal(false);
  };

  const handleExecuteDisciplinary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    addDisciplinaryAction(selectedEmp.id, {
      date: new Date().toISOString().substring(0, 10),
      incidentType: discData.incidentType,
      description: discData.description,
      actionTaken: discData.actionTaken,
      resolved: false
    });
    setShowDiscSubModal(false);
  };

  const handleExecuteGPSCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === checkinForm.employeeId);
    if (!emp) return;
    logFieldAttendance({
      employeeId: emp.id,
      employeeName: emp.fullName,
      position: emp.position,
      county: checkinForm.county,
      dutyStation: checkinForm.dutyStation,
      type: checkinForm.type,
      gpsCoordinates: {
        latitude: checkinForm.latitude,
        longitude: checkinForm.longitude,
        accuracyMeters: 4.5
      },
      geoFenceStatus: checkinForm.geoFenceStatus,
      status: 'PRESENT'
    });
    setShowCheckinModal(false);
  };

  const handleRunGhostAudit = () => {
    setIsScanning(true);
    setTimeout(() => {
      const res = runAntiGhostWorkerAudit();
      setScanResults(res);
      setIsScanning(false);
    }, 1200);
  };

  // Calculate retirement countdown
  const calculateRetirement = (dob?: string, dateEmployed?: string) => {
    if (!dob) return { yearsLeft: 12, retirementYear: 2038, milestone: 'Normal Horizon' };
    const birthYear = parseInt(dob.split('-')[0], 10);
    const statutoryAgeLimit = 65;
    const retirementYearByAge = birthYear + statutoryAgeLimit;
    const currentYear = 2026;
    const yearsLeft = retirementYearByAge - currentYear;
    return {
      yearsLeft: Math.max(0, yearsLeft),
      retirementYear: retirementYearByAge,
      milestone: yearsLeft <= 2 ? 'Imminent Transition (Statutory Succession Prep)' : 'Active Career Stage'
    };
  };

  // Generate Bank ACH file text
  const generateBankBatchContent = () => {
    const timestamp = new Date().toISOString();
    let content = `FDA-GOL-EFT-BATCH-v2.4\n`;
    content += `HEADER: DEST_BANK=${selectedBank} | SPONSOR=FORESTRY DEVELOPMENT AUTHORITY | CURRENCY=USD | CYCLE=SEPT2026 | DATE=${timestamp}\n`;
    content += `CSA_BOUNDARY_REF: CSA/AUTHPAY/2026/09/CLEARANCE-001\n`;
    content += `--------------------------------------------------------------------------------------------------------\n`;
    content += `RECORD# | EMP_ID     | BENEFICIARY NAME          | BANK_NAME                | ACC_NUM        | NET_PAY_USD | NET_PAY_LRD\n`;
    content += `--------------------------------------------------------------------------------------------------------\n`;
    
    payrollRecords.forEach((r, idx) => {
      const emp = employees.find(e => e.id === r.employeeId);
      const acc = r.accountNumber || emp?.accountNumber || '102-000-000000';
      const bName = (r.bankName || emp?.bankName || selectedBank).padEnd(24, ' ');
      const empName = r.employeeName.padEnd(25, ' ');
      content += `${(idx + 1).toString().padStart(7, '0')} | ${r.employeeId.padEnd(10, ' ')} | ${empName} | ${bName} | ${acc.padEnd(14, ' ')} | $${r.netPayUSD.toLocaleString().padStart(9, ' ')} | ${r.netPayLRD.toLocaleString().padStart(10, ' ')} LRD\n`;
    });

    const totalUSD = payrollRecords.reduce((sum, r) => sum + r.netPayUSD, 0);
    const totalLRD = payrollRecords.reduce((sum, r) => sum + r.netPayLRD, 0);
    content += `--------------------------------------------------------------------------------------------------------\n`;
    content += `BATCH_TRAILER: TOTAL_RECORDS=${payrollRecords.length} | TOTAL_USD=$${totalUSD.toLocaleString()} | TOTAL_LRD=${totalLRD.toLocaleString()} LRD\n`;
    content += `HASH_SIGNATURE: SHA256-${Math.random().toString(36).substring(2, 15).toUpperCase()}FDA-GOL-CBL-PAYROLL\n`;
    return content;
  };

  const handleDownloadBatch = () => {
    const content = generateBankBatchContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FDA_PAYROLL_SEPT2026_${selectedBank}.ACH`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              TOR §6 & Civil Service Enterprise Pillar
            </span>
            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-semibold border border-blue-200">
              CSA HRMIS Boundary Active
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Human Resources & Payroll Administration
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Personnel Lifecycle • Regional Biometrics & GPS Ranger Attendance • Automated Payroll Engine • Commercial Bank Batch EFT
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCheckinModal(true)}
            className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs px-3 py-2 rounded-lg font-bold border border-emerald-200 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ranger GPS Check-In</span>
          </button>
          <button
            onClick={() => setShowBankBatchModal(true)}
            className="inline-flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs px-3 py-2 rounded-lg font-bold border border-blue-200 transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Bank EFT Batch</span>
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
      <div className="flex border-b border-slate-200 space-x-2 md:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
            activeTab === 'DIRECTORY'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Digital Personnel Files ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
            activeTab === 'ATTENDANCE'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-600" />
          <span>Time & Field Attendance ({fieldAttendanceLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYROLL')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
            activeTab === 'PAYROLL'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Automated Payroll Engine</span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVE')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
            activeTab === 'LEAVE'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Leave & Patrol Rest ({leaveRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CSA_SYNC')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
            activeTab === 'CSA_SYNC'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>CSA Boundary & Anti-Ghost Audit</span>
        </button>
      </div>

      {/* TAB 1: DIRECTORY & DIGITAL PERSONNEL FILES */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search personnel by name, emp # or post..."
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
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Digital Personnel Registry • Click any row to inspect complete Dossier & Lifecycle Actions</span>
              <span className="text-slate-500 font-mono">Showing {filteredEmployees.length} of {employees.length} personnel</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Employee # / Name</th>
                    <th className="px-4 py-3">Department & Role</th>
                    <th className="px-4 py-3">Duty Station & County</th>
                    <th className="px-4 py-3">Biometric ID</th>
                    <th className="px-4 py-3 text-right">Base Salary</th>
                    <th className="px-4 py-3 text-center">Lifecycle Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => (
                    <tr
                      key={emp.id}
                      onClick={() => { setSelectedEmp(emp); setDossierTab('OVERVIEW'); }}
                      className="hover:bg-forest-50/50 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{emp.fullName}</span>
                          {emp.cadre === 'FIELD_RANGER' && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">RANGER</span>
                          )}
                        </div>
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
                        <div className="flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>{emp.biometricId}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">CSA Sync: {emp.csaSyncStatus}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-bold text-slate-900">${emp.salaryUSD.toLocaleString()} USD</div>
                        <div className="text-[10px] text-slate-500">{emp.salaryLRD.toLocaleString()} LRD</div>
                        {(emp.hazardPayUSD || 0) > 0 && (
                          <div className="text-[10px] text-amber-700 font-semibold">+${emp.hazardPayUSD} Hazard</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmp(emp);
                            setDossierTab('OVERVIEW');
                          }}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-forest-800 bg-forest-50 hover:bg-forest-100 px-2.5 py-1 rounded-lg border border-forest-200 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-forest-700" />
                          <span>View Dossier</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIME & FIELD ATTENDANCE TELEMETRY */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    Field Telemetry & Regional Biometrics
                  </span>
                  <span className="text-xs text-slate-400">Integration with ZKTeco / Suprema Readers & GPS Check-ins</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Time & Field Attendance Stream (Headquarters & County Forest Posts)
                </h3>
                <p className="text-xs text-slate-500">
                  Guarantees that ranger payroll disbursements are strictly backed by verifiable field presence, geo-fence validations, and biometric timestamps.
                </p>
              </div>

              <button
                onClick={() => setShowCheckinModal(true)}
                className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition flex items-center space-x-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Simulate Field Ranger GPS Check-In</span>
              </button>
            </div>

            {/* Attendance Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Biometric Terminals</span>
                <p className="text-lg font-bold text-slate-900 mt-1">15 Hubs</p>
                <p className="text-[11px] text-emerald-700 font-semibold">100% Online & Clocked</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">GPS Mobile Ranger Posts</span>
                <p className="text-lg font-bold text-emerald-800 mt-1">Sapo • Nimba • Lofa</p>
                <p className="text-[11px] text-slate-500">Offline Burst Geo-Sync</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Geo-Fence Compliance</span>
                <p className="text-lg font-bold text-blue-700 mt-1">100% In-Zone</p>
                <p className="text-[11px] text-slate-500">Zero perimeter anomalies</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Payroll Attendance Gate</span>
                <p className="text-lg font-bold text-forest-800 mt-1">Certified</p>
                <p className="text-[11px] text-slate-500">Ghost-Worker Proof</p>
              </div>
            </div>

            {/* Field Attendance Log Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Staff & Position</th>
                    <th className="px-4 py-2.5">Station & County</th>
                    <th className="px-4 py-2.5">Check-In Type & Telemetry</th>
                    <th className="px-4 py-2.5">GPS Coordinates / Terminal ID</th>
                    <th className="px-4 py-2.5">Geo-Fence Verification</th>
                    <th className="px-4 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fieldAttendanceLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900">{log.employeeName}</div>
                        <div className="text-[11px] text-slate-500">{log.position}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {log.timestamp.substring(0, 10)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800">{log.dutyStation}</div>
                        <span className="inline-block text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                          {log.county} County
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {log.type === 'GPS_MOBILE_CHECKIN' ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Radio className="w-3 h-3 text-emerald-600" />
                            <span>GPS Mobile Burst</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>Biometric Terminal</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px]">
                        {log.gpsCoordinates ? (
                          <div>
                            <span className="text-slate-800 font-bold">Lat: {log.gpsCoordinates.latitude.toFixed(4)}°, Long: {log.gpsCoordinates.longitude.toFixed(4)}°</span>
                            <div className="text-[10px] text-slate-400">Accuracy: ±{log.gpsCoordinates.accuracyMeters}m (Galileo/GPS)</div>
                          </div>
                        ) : (
                          <div className="text-slate-700 font-semibold">{log.terminalId || 'Terminal BIO-01'}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          {log.geoFenceStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-emerald-700">
                        {log.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DUAL-CURRENCY PAYROLL & BANK EFT BATCH */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Automated Dual-Currency Payroll Engine (USD & LRD)
                </h3>
                <p className="text-xs text-slate-500">
                  Integrated calculation of Basic Salaries, Field Allowances, Ranger Hazard Pay, LRA Tax (20%), and NASSCORP (4%) with Commercial Bank Direct Disbursement Export.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => processPayrollRun('September 2026')}
                  className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Execute Monthly Payroll Run</span>
                </button>
                <button
                  onClick={() => setShowBankBatchModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Generate Bank ACH/EFT Batch</span>
                </button>
                <button
                  onClick={() => openPrintModal({
                    type: 'PAYROLL_SLIP',
                    data: payrollRecords[3] || payrollRecords[0]
                  })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3 py-2 rounded-lg font-bold border border-slate-300 transition flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pay Slip</span>
                </button>
              </div>
            </div>

            {/* Payroll Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Gross Wage Bill</span>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  ${payrollRecords.reduce((acc, r) => acc + r.grossUSD, 0).toLocaleString()} USD
                </p>
                <p className="text-xs text-slate-500">
                  {payrollRecords.reduce((acc, r) => acc + r.grossLRD, 0).toLocaleString()} LRD
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Hazard Pay & Field Allowances</span>
                <p className="text-lg font-bold text-amber-700 mt-1">
                  ${payrollRecords.reduce((acc, r) => acc + (r.hazardPayUSD || 0) + (r.fieldAllowanceUSD || 0), 0).toLocaleString()} USD
                </p>
                <p className="text-xs text-slate-500">Rangers & Remote Posts</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">LRA Income Tax (20%)</span>
                <p className="text-lg font-bold text-blue-700 mt-1">
                  ${payrollRecords.reduce((acc, r) => acc + r.taxWithheldUSD, 0).toLocaleString()} USD
                </p>
                <p className="text-xs text-slate-500">Payable to LRA Central Account</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">NASSCORP Pension (4%)</span>
                <p className="text-lg font-bold text-emerald-700 mt-1">
                  ${payrollRecords.reduce((acc, r) => acc + r.nasscorpUSD, 0).toLocaleString()} USD
                </p>
                <p className="text-xs text-slate-500">Statutory Social Security</p>
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Staff & Bank Account</th>
                    <th className="px-4 py-2.5 text-right">Base Salary</th>
                    <th className="px-4 py-2.5 text-right">Hazard / Allowances</th>
                    <th className="px-4 py-2.5 text-right">Gross USD</th>
                    <th className="px-4 py-2.5 text-right">LRA Tax (20%)</th>
                    <th className="px-4 py-2.5 text-right">NASSCORP (4%)</th>
                    <th className="px-4 py-2.5 text-right">Net Payable USD</th>
                    <th className="px-4 py-2.5 text-right">Net Payable LRD</th>
                    <th className="px-4 py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {payrollRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5 font-sans">
                        <div className="font-semibold text-slate-900">{r.employeeName}</div>
                        <div className="text-[10px] text-slate-500">
                          {r.bankName || 'LBDI'} • <span className="font-mono">{r.accountNumber || '102-xxx-xxx'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        ${(r.baseSalaryUSD || r.grossUSD).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-amber-700 font-semibold">
                        +${((r.hazardPayUSD || 0) + (r.fieldAllowanceUSD || 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                        ${r.grossUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600">
                        -${r.taxWithheldUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-amber-800">
                        -${r.nasscorpUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                        ${r.netPayUSD.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                        ${r.netPayLRD.toLocaleString()} LRD
                      </td>
                      <td className="px-4 py-2.5 text-center font-sans">
                        <button
                          onClick={() => openPrintModal({
                            type: 'PAYROLL_SLIP',
                            data: r
                          })}
                          className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 transition"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEAVE & FIELD REST */}
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

      {/* TAB 5: CSA HRMIS BOUNDARY & ANTI-GHOST WORKER GATEWAY */}
      {activeTab === 'CSA_SYNC' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Civil Service Agency (CSA) Biometric & National Payroll Boundary (TOR §3)
                </h3>
                <p className="text-xs text-slate-500">
                  Enforces strict deduplication with national biometric databases to permanently eliminate ghost workers and dual-payroll civil service drawdowns.
                </p>
              </div>
            </div>

            <button
              onClick={handleRunGhostAudit}
              disabled={isScanning}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow-sm transition flex items-center space-x-2 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Executing Biometric Cross-Scan...' : 'Run Anti-Ghost Worker Audit Scan'}</span>
            </button>
          </div>

          {/* Audit Result Banner */}
          {scanResults && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    National Biometric Cross-Match Audit Passed (100% Clean)
                  </h4>
                  <p className="text-[11px] text-emerald-700">
                    Scanned {scanResults.totalScanned} FDA personnel against CSA Central Civil Service Roster, Ministry of Agriculture, and Ministry of Mines & Energy.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-white px-2 py-1 rounded border border-emerald-200">
                0 Duplicates • Verified Clean
              </span>
            </div>
          )}

          {/* Core Boundary Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">National Biometric Registry</span>
              <p className="text-xl font-bold text-slate-900 mt-1">100% Synchronized</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Every FDA ranger, inspector, and administrative employee holds a CSA biometric ID mapped to national civil service bands.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Boundary Segregation</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">Strict Functional SoD</p>
              <p className="text-[11px] text-slate-500 mt-1">
                CSA controls core civil service establishment numbers and baseline salary scales; FDA manages duty post deployments and hazard allowances.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase">Double-Dipping Elimination</span>
              <p className="text-xl font-bold text-blue-700 mt-1">Zero Tolerance</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Automated monthly pre-payroll webhook validates against CSA to detect and block any dual-ministerial payroll drawdowns.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: DIGITAL PERSONNEL DOSSIER DRAWER/MODAL */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-forest-800 border border-forest-600 flex items-center justify-center text-sm font-bold text-gold-400">
                  {selectedEmp.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">{selectedEmp.fullName}</h3>
                  <p className="text-xs text-slate-300">
                    {selectedEmp.position} • <span className="font-mono">{selectedEmp.empNo}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 space-x-3 overflow-x-auto text-xs">
              <button
                onClick={() => setDossierTab('OVERVIEW')}
                className={`py-2.5 font-bold border-b-2 transition whitespace-nowrap ${
                  dossierTab === 'OVERVIEW'
                    ? 'border-forest-700 text-forest-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overview & Bank
              </button>
              <button
                onClick={() => setDossierTab('TRANSFERS')}
                className={`py-2.5 font-bold border-b-2 transition whitespace-nowrap ${
                  dossierTab === 'TRANSFERS'
                    ? 'border-forest-700 text-forest-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                County Transfers ({selectedEmp.stationHistory?.length || 0})
              </button>
              <button
                onClick={() => setDossierTab('PROMOTIONS')}
                className={`py-2.5 font-bold border-b-2 transition whitespace-nowrap ${
                  dossierTab === 'PROMOTIONS'
                    ? 'border-forest-700 text-forest-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Promotions ({selectedEmp.promotions?.length || 0})
              </button>
              <button
                onClick={() => setDossierTab('DISCIPLINE')}
                className={`py-2.5 font-bold border-b-2 transition whitespace-nowrap ${
                  dossierTab === 'DISCIPLINE'
                    ? 'border-forest-700 text-forest-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Disciplinary Actions ({selectedEmp.disciplinaryRecords?.length || 0})
              </button>
              <button
                onClick={() => setDossierTab('RETIREMENT')}
                className={`py-2.5 font-bold border-b-2 transition whitespace-nowrap ${
                  dossierTab === 'RETIREMENT'
                    ? 'border-forest-700 text-forest-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Retirement Horizon
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              
              {/* SUBTAB: OVERVIEW */}
              {dossierTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Duty Station</span>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedEmp.dutyStation}</p>
                      <p className="text-[11px] text-emerald-800 font-semibold">{selectedEmp.county} County</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Civil Service Cadre</span>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedEmp.cadre.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-slate-600 font-mono">{selectedEmp.gradeBand}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">National Biometric ID</span>
                      <p className="font-bold text-blue-900 font-mono mt-0.5">{selectedEmp.biometricId}</p>
                      <p className="text-[11px] text-slate-500">CSA Status: {selectedEmp.csaSyncStatus}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">Employment Date</span>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedEmp.dateEmployed}</p>
                      <p className="text-[11px] text-slate-500">Status: <span className="text-emerald-700 font-bold">{selectedEmp.status}</span></p>
                    </div>
                  </div>

                  {/* Compensation & Bank Info */}
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 space-y-2">
                    <h4 className="font-bold text-blue-900 flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4 text-blue-700" />
                      <span>Commercial Bank Remittance Information</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Commercial Bank</span>
                        <p className="font-bold text-slate-900 mt-0.5">{selectedEmp.bankName || 'LBDI (Liberian Bank for Dev & Investment)'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Account Number</span>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">{selectedEmp.accountNumber || '102-441-903210'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Base Monthly Salary</span>
                        <p className="font-mono font-bold text-slate-900 mt-0.5">${selectedEmp.salaryUSD.toLocaleString()} USD ({selectedEmp.salaryLRD.toLocaleString()} LRD)</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Hazard & Field Allowances</span>
                        <p className="font-mono font-bold text-amber-800 mt-0.5">
                          +${((selectedEmp.hazardPayUSD || 0) + (selectedEmp.fieldAllowanceUSD || 0)).toLocaleString()} USD
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB: COUNTY POSTINGS & STATION TRANSFERS */}
              {dossierTab === 'TRANSFERS' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">County Station Postings & Deployments</h4>
                      <p className="text-slate-500 text-[11px]">Track historical rotational postings across Liberia's 15 counties.</p>
                    </div>
                    <button
                      onClick={() => setShowTransferSubModal(true)}
                      className="inline-flex items-center space-x-1 bg-forest-800 hover:bg-forest-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Re-Post to County Station</span>
                    </button>
                  </div>

                  {(!selectedEmp.stationHistory || selectedEmp.stationHistory.length === 0) ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 border border-slate-200">
                      No transfer history recorded. Personnel currently active at original posting: <strong>{selectedEmp.dutyStation} ({selectedEmp.county} County)</strong>.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedEmp.stationHistory.map(tr => (
                        <div key={tr.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{tr.fromStation} ({tr.fromCounty})</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-forest-800 font-bold">{tr.toStation} ({tr.toCounty})</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">{tr.transferDate}</span>
                          </div>
                          <p className="text-[11px] text-slate-600">{tr.reason}</p>
                          <p className="text-[10px] text-slate-400">Authorized By: {tr.authorizedBy}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB: PROMOTIONS */}
              {dossierTab === 'PROMOTIONS' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">Career Progression & Grade Promotions</h4>
                      <p className="text-slate-500 text-[11px]">Official reclassifications aligned with Civil Service standing orders.</p>
                    </div>
                    <button
                      onClick={() => setShowPromoSubModal(true)}
                      className="inline-flex items-center space-x-1 bg-forest-800 hover:bg-forest-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Record Promotion</span>
                    </button>
                  </div>

                  {(!selectedEmp.promotions || selectedEmp.promotions.length === 0) ? (
                    <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500 border border-slate-200">
                      No promotion history recorded yet for this personnel.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedEmp.promotions.map(pr => (
                        <div key={pr.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              {pr.previousPosition} → <span className="text-forest-800">{pr.newPosition}</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">{pr.effectiveDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center space-x-3">
                            <span>Grade: {pr.previousGrade} → <strong>{pr.newGrade}</strong></span>
                            <span>Salary: ${pr.previousSalaryUSD} → <strong className="text-emerald-700">${pr.newSalaryUSD} USD</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB: DISCIPLINARY ACTIONS */}
              {dossierTab === 'DISCIPLINE' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">Disciplinary Records & Official Queries</h4>
                      <p className="text-slate-500 text-[11px]">Governance actions in compliance with FDA Code of Conduct.</p>
                    </div>
                    <button
                      onClick={() => setShowDiscSubModal(true)}
                      className="inline-flex items-center space-x-1 bg-amber-700 hover:bg-amber-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Log Query / Disciplinary Action</span>
                    </button>
                  </div>

                  {(!selectedEmp.disciplinaryRecords || selectedEmp.disciplinaryRecords.length === 0) ? (
                    <div className="p-4 bg-emerald-50 rounded-xl text-center text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                      Clean disciplinary record. No active queries or compliance sanctions on file.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedEmp.disciplinaryRecords.map(dr => (
                        <div key={dr.id} className="p-3.5 bg-amber-50/50 rounded-lg border border-amber-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900">{dr.incidentType}</span>
                            <span className="font-mono text-[10px] text-slate-500">{dr.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-700">{dr.description}</p>
                          <div className="pt-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              {dr.actionTaken}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              {dr.resolved ? '✓ Cleared & Reconciled' : '● Under Review'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB: RETIREMENT PLANNING */}
              {dossierTab === 'RETIREMENT' && (
                <div className="space-y-4">
                  {(() => {
                    const ret = calculateRetirement(selectedEmp.dateOfBirth, selectedEmp.dateEmployed);
                    return (
                      <div className="space-y-3">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold uppercase text-slate-500">Statutory Civil Service Retirement Status</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              ret.yearsLeft <= 2 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {ret.milestone}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 pt-2">
                            <div>
                              <span className="text-[10px] text-slate-500">Date of Birth:</span>
                              <p className="font-bold text-slate-900">{selectedEmp.dateOfBirth || '1979-03-15'}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">Statutory Retirement Year:</span>
                              <p className="font-bold text-slate-900">{ret.retirementYear} (Age 65)</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">Years Remaining:</span>
                              <p className="font-bold text-blue-900 font-mono text-base">{ret.yearsLeft} Years</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                          <h4 className="font-bold text-blue-900 text-xs">NASSCORP Pension & Transition Checklist</h4>
                          <ul className="space-y-1.5 text-[11px] text-slate-600">
                            <li className="flex items-center space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                              <span>Monthly 4% employee pension contribution logged with NASSCORP since date of onboarding.</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                              <span>Civil Service Agency (CSA) Biometric Social Security ID confirmed in national registry.</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                              <span>Automated 12-month pre-retirement succession notice scheduled for HR Directorate review.</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">FDA Personnel File Ref: {selectedEmp.id}</span>
              <button
                onClick={() => setSelectedEmp(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold transition"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SUBMODAL: COUNTY STATION RE-POSTING */}
      {showTransferSubModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-forest-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Post / Transfer to County Station</h3>
              <button onClick={() => setShowTransferSubModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleExecuteTransfer} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target County</label>
                <select
                  value={transferData.toCounty}
                  onChange={e => setTransferData({ ...transferData, toCounty: e.target.value as LiberiaCounty })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                >
                  <option value="Sinoe">Sinoe (Sapo National Park Sector)</option>
                  <option value="Nimba">Nimba (East Nimba Nature Reserve)</option>
                  <option value="Lofa">Lofa (Voinjama Depot Outpost)</option>
                  <option value="Grand Bassa">Grand Bassa (Port of Buchanan Control)</option>
                  <option value="Gbarpolu">Gbarpolu (Community Forest Sector)</option>
                  <option value="Grand Gedeh">Grand Gedeh (Grebo-Krahn Post)</option>
                  <option value="Montserrado">Montserrado (Whein Town HQ)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Station Name</label>
                <input
                  type="text"
                  required
                  value={transferData.toStation}
                  onChange={e => setTransferData({ ...transferData, toStation: e.target.value })}
                  placeholder="e.g. Sapo National Park Sector HQ"
                  className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Transfer Rationale</label>
                <textarea
                  rows={3}
                  required
                  value={transferData.reason}
                  onChange={e => setTransferData({ ...transferData, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowTransferSubModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white font-bold rounded shadow transition"
                >
                  Confirm County Re-Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMODAL: PROMOTION & REGARDING */}
      {showPromoSubModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-forest-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Promotion & Grade Elevation</h3>
              <button onClick={() => setShowPromoSubModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleExecutePromotion} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Position / Title</label>
                <input
                  type="text"
                  required
                  value={promoData.newPosition}
                  onChange={e => setPromoData({ ...promoData, newPosition: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Civil Service Grade Band</label>
                <select
                  value={promoData.newGrade}
                  onChange={e => setPromoData({ ...promoData, newGrade: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                >
                  <option value="Technical Cadre T3">Technical Cadre T3</option>
                  <option value="Professional Band P1">Professional Band P1</option>
                  <option value="Professional Band P2">Professional Band P2</option>
                  <option value="Professional Band P3">Professional Band P3</option>
                  <option value="Professional Band P4">Professional Band P4</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Revised Base Salary (USD)</label>
                <input
                  type="number"
                  required
                  value={promoData.newSalaryUSD}
                  onChange={e => setPromoData({ ...promoData, newSalaryUSD: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 font-mono rounded focus:ring-forest-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                  LRD Equivalent: {(promoData.newSalaryUSD * 195).toLocaleString()} LRD
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPromoSubModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white font-bold rounded shadow transition"
                >
                  Confirm Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMODAL: DISCIPLINARY ACTION / QUERY */}
      {showDiscSubModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-amber-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Issue Query / Disciplinary Sanction</h3>
              <button onClick={() => setShowDiscSubModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleExecuteDisciplinary} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Incident Category</label>
                <select
                  value={discData.incidentType}
                  onChange={e => setDiscData({ ...discData, incidentType: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-amber-600 focus:outline-none"
                >
                  <option value="Field Patrol Route Discrepancy">Field Patrol Route Discrepancy</option>
                  <option value="Delayed Export Log Tagging">Delayed Export Log Tagging</option>
                  <option value="Unexcused Station Absence">Unexcused Station Absence</option>
                  <option value="Insubordination / Protocol Violation">Insubordination / Protocol Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Particulars</label>
                <textarea
                  rows={3}
                  required
                  value={discData.description}
                  onChange={e => setDiscData({ ...discData, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Action / Sanction Imposed</label>
                <input
                  type="text"
                  required
                  value={discData.actionTaken}
                  onChange={e => setDiscData({ ...discData, actionTaken: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDiscSubModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded shadow transition"
                >
                  Register Sanction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GPS MOBILE RANGER CHECK-IN SIMULATOR */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Simulate Field Ranger GPS Check-In</h3>
              </div>
              <button onClick={() => setShowCheckinModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleExecuteGPSCheckin} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                Simulates real-world handheld mobile terminal transmission from deep forest stations (Mount Nimba, Sapo, Gola) with GPS telemetry and geo-fence perimeter stamp.
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ranger / Officer</label>
                <select
                  value={checkinForm.employeeId}
                  onChange={e => {
                    const emp = employees.find(x => x.id === e.target.value);
                    if (emp) {
                      setCheckinForm({
                        ...checkinForm,
                        employeeId: emp.id,
                        dutyStation: emp.dutyStation,
                        county: emp.county
                      });
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.position}) - {emp.county} County
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Duty Post / Station</label>
                  <input
                    type="text"
                    value={checkinForm.dutyStation}
                    onChange={e => setCheckinForm({ ...checkinForm, dutyStation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">County</label>
                  <input
                    type="text"
                    disabled
                    value={checkinForm.county}
                    className="w-full p-2 border border-slate-200 bg-slate-100 rounded text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">GPS Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={checkinForm.latitude}
                    onChange={e => setCheckinForm({ ...checkinForm, latitude: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 font-mono rounded focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">GPS Longitude (°W)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={checkinForm.longitude}
                    onChange={e => setCheckinForm({ ...checkinForm, longitude: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 font-mono rounded focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Perimeter Geo-Fence State</label>
                <select
                  value={checkinForm.geoFenceStatus}
                  onChange={e => setCheckinForm({ ...checkinForm, geoFenceStatus: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded focus:ring-forest-600 focus:outline-none"
                >
                  <option value="INSIDE_PROTECTED_AREA">INSIDE_PROTECTED_AREA (Verified)</option>
                  <option value="VERIFIED">VERIFIED (Station Compound)</option>
                  <option value="OFF_STATION_FLAG">OFF_STATION_FLAG (Requires Review)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white font-bold rounded shadow transition"
                >
                  Transmit Attendance Burst
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COMMERCIAL BANK DIRECT DISBURSEMENT BATCH GENERATOR */}
      {showBankBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Commercial Bank Direct Disbursement Batch File (ACH / ISO 20022)</h3>
              </div>
              <button onClick={() => setShowBankBatchModal(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-700 font-semibold">Select Destination Bank:</span>
                  <select
                    value={selectedBank}
                    onChange={e => setSelectedBank(e.target.value)}
                    className="p-1.5 border border-slate-300 rounded font-semibold text-xs focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="LBDI">LBDI (Liberian Bank for Development & Investment)</option>
                    <option value="ECOBANK">Ecobank Liberia Limited</option>
                    <option value="GTBANK">Guaranty Trust Bank (Liberia) Ltd</option>
                    <option value="CBL_NEPS">Central Bank of Liberia (CBL NEPS ISO 20022)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownloadBatch}
                    className="inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-white px-3.5 py-1.5 rounded-lg font-bold shadow transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .ACH Batch</span>
                  </button>
                </div>
              </div>

              {downloadSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Batch file generated and saved successfully as FDA_PAYROLL_SEPT2026_{selectedBank}.ACH!</span>
                </div>
              )}

              {/* Batch Preview Box */}
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                  Electronic Batch Payload Preview (Ready for Direct Bank EFT Submission)
                </span>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-64">
                  {generateBankBatchContent()}
                </pre>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-900 text-[11px] space-y-1">
                <span className="font-bold">Automated Banking Controls:</span>
                <p>
                  This batch file adheres to the Central Bank of Liberia (CBL) National Electronic Payment Switch (NEPS) format and direct corporate banking protocol for automatic credit to staff checking and mobile savings accounts.
                </p>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">Records: {payrollRecords.length} staff</span>
              <button
                onClick={() => setShowBankBatchModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ONBOARD EMPLOYEE MODAL */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Onboard FDA Staff / Forest Ranger</h3>
              </div>
              <button
                onClick={() => setShowAddEmpModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
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
                  <label className="block text-slate-700 font-semibold mb-1">Civil Service Cadre</label>
                  <select
                    value={newEmp.cadre}
                    onChange={e => setNewEmp({ ...newEmp, cadre: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="FIELD_RANGER">Field Ranger / Wildlife</option>
                    <option value="CIVIL_SERVICE">Civil Service Cadre</option>
                    <option value="FDA_PERMANENT">FDA Permanent</option>
                    <option value="CONTRACTUAL">Contractual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newEmp.dateOfBirth}
                    onChange={e => setNewEmp({ ...newEmp, dateOfBirth: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Commercial Bank</label>
                  <select
                    value={newEmp.bankName}
                    onChange={e => setNewEmp({ ...newEmp, bankName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="Liberian Bank for Development & Investment (LBDI)">LBDI</option>
                    <option value="Ecobank Liberia Limited">Ecobank Liberia</option>
                    <option value="Guaranty Trust Bank (Liberia) Ltd">GTBank Liberia</option>
                    <option value="Central Bank of Liberia (CBL)">Central Bank of Liberia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Number</label>
                  <input
                    type="text"
                    value={newEmp.accountNumber}
                    onChange={e => setNewEmp({ ...newEmp, accountNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Base Salary (USD)</label>
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
                  <label className="block text-slate-700 font-semibold mb-1">Hazard Pay</label>
                  <input
                    type="number"
                    value={newEmp.hazardPayUSD}
                    onChange={e => setNewEmp({ ...newEmp, hazardPayUSD: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Field Allowance</label>
                  <input
                    type="number"
                    value={newEmp.fieldAllowanceUSD}
                    onChange={e => setNewEmp({ ...newEmp, fieldAllowanceUSD: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
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
                  Confirm & Register Personnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
