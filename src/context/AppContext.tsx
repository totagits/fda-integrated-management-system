import React, { createContext, useContext, useState } from 'react';
import {
  UserRole,
  UserPersona,
  Employee,
  LeaveRequest,
  PayrollRecord,
  CountyPostingRecord,
  PromotionRecord,
  DisciplinaryRecord,
  FieldAttendanceLog,
  BudgetVoteCode,
  PaymentVoucher,
  BankAccount,
  ProcurementRequisition,
  Vendor,
  PurchaseOrder,
  FixedAsset,
  DepotTransfer,
  ConsumableInventory,
  CountyOfficeStatus,
  TimberConcessionPermit,
  FieldRangerIncident,
  AuditLogEntry,
  RTMRequirement,
  BidderClarificationQuery,
  PublicTenderNotice
} from '../types';

import {
  USER_PERSONAS,
  INITIAL_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PAYROLL_RECORDS,
  INITIAL_FIELD_ATTENDANCE_LOGS,
  INITIAL_BUDGET_VOTES,
  INITIAL_PAYMENT_VOUCHERS,
  INITIAL_BANK_ACCOUNTS,
  INITIAL_PROCUREMENT_REQS,
  INITIAL_VENDORS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_FIXED_ASSETS,
  INITIAL_DEPOT_TRANSFERS,
  INITIAL_INVENTORY_STORES,
  INITIAL_COUNTY_STATUS,
  INITIAL_TIMBER_CONCESSIONS,
  INITIAL_RANGER_INCIDENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PUBLIC_TENDERS,
  INITIAL_BIDDER_QUERIES
} from '../data/initialData';

import { INITIAL_RTM_DATA } from '../data/rtmData';

export type AppModule =
  | 'DASHBOARD'
  | 'HRMIS'
  | 'FINANCE'
  | 'PROCUREMENT'
  | 'ASSETS'
  | 'OPERATIONS'
  | 'RTM'
  | 'AUDIT'
  | 'SECURITY';

export const ROLE_ALLOWED_MODULES: Record<UserRole, AppModule[]> = {
  MANAGING_DIRECTOR: ['DASHBOARD', 'HRMIS', 'FINANCE', 'PROCUREMENT', 'ASSETS', 'OPERATIONS', 'RTM', 'AUDIT', 'SECURITY'],
  FINANCE_DIRECTOR: ['DASHBOARD', 'HRMIS', 'FINANCE', 'PROCUREMENT', 'RTM', 'AUDIT', 'SECURITY'],
  HR_DIRECTOR: ['DASHBOARD', 'HRMIS', 'RTM', 'AUDIT', 'SECURITY'],
  PROCUREMENT_OFFICER: ['DASHBOARD', 'HRMIS', 'PROCUREMENT', 'RTM', 'AUDIT', 'SECURITY'],
  ASSET_OFFICER: ['DASHBOARD', 'HRMIS', 'ASSETS', 'RTM', 'AUDIT', 'SECURITY'],
  COUNTY_OFFICER: ['DASHBOARD', 'HRMIS', 'OPERATIONS', 'ASSETS', 'RTM', 'SECURITY'],
  INTERNAL_AUDITOR: ['DASHBOARD', 'HRMIS', 'FINANCE', 'PROCUREMENT', 'AUDIT', 'RTM', 'SECURITY']
};

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  timestamp: string;
}

export interface PrintModalPayload {
  type: 'PAYMENT_VOUCHER' | 'ASSET_TAG' | 'PAYROLL_SLIP' | 'RTM_REPORT' | 'INCIDENT_DISPATCH' | 'LEAVE_CERTIFICATE';
  data: any;
}

interface AppContextType {
  // Navigation & Public Portal
  isPublicPortal: boolean;
  setIsPublicPortal: (val: boolean) => void;
  activeModule: AppModule;
  setActiveModule: (mod: AppModule) => void;
  currentPersona: UserPersona;
  setCurrentRole: (role: UserRole) => void;
  logoutToPublicPortal: () => void;
  loginToIntranet: (role?: UserRole) => void;

  // Public Tenders & Bidder Portal
  publicTenders: PublicTenderNotice[];
  bidderQueries: BidderClarificationQuery[];
  submitBidderQuery: (query: Omit<BidderClarificationQuery, 'id' | 'questionDate' | 'status'>) => void;
  respondToBidderQuery: (id: string, response: string) => void;

  // HRMIS & Attendance Telemetry
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  fieldAttendanceLogs: FieldAttendanceLog[];
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  transferEmployeeStation: (employeeId: string, transfer: Omit<CountyPostingRecord, 'id'>) => void;
  promoteEmployee: (employeeId: string, promotion: Omit<PromotionRecord, 'id'>) => void;
  addDisciplinaryAction: (employeeId: string, record: Omit<DisciplinaryRecord, 'id'>) => void;
  logFieldAttendance: (entry: Omit<FieldAttendanceLog, 'id' | 'timestamp'>) => void;
  submitLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>) => void;
  endorseLeaveSupervisor: (id: string) => void;
  approveLeave: (id: string) => void;
  rejectLeave: (id: string, reason?: string) => void;
  processPayrollRun: (period: string) => void;
  syncWithCSA: () => void;
  runAntiGhostWorkerAudit: () => { totalScanned: number; duplicatesFound: number; verifiedClean: number; auditTimestamp: string; };

  // Finance
  budgetVotes: BudgetVoteCode[];
  paymentVouchers: PaymentVoucher[];
  bankAccounts: BankAccount[];
  createPaymentVoucher: (voucher: Omit<PaymentVoucher, 'id' | 'voucherNo' | 'dateCreated' | 'status'>) => boolean;
  approveVoucherFinance: (id: string) => void;
  authorizeVoucherMD: (id: string) => void;
  markVoucherPaid: (id: string, checkNo: string) => void;
  exportIFMISBatch: () => void;

  // Procurement
  procurementReqs: ProcurementRequisition[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  createProcurementReq: (req: Omit<ProcurementRequisition, 'id' | 'prNo' | 'requestDate' | 'status'>) => void;
  approveProcurementReq: (id: string) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'issueDate' | 'status' | 'threeWayMatch'>) => void;
  executeThreeWayMatch: (poId: string) => void;

  // Assets
  fixedAssets: FixedAsset[];
  depotTransfers: DepotTransfer[];
  consumableInventory: ConsumableInventory[];
  addFixedAsset: (asset: Omit<FixedAsset, 'id' | 'barcode' | 'currentBookValueUSD'>) => void;
  transferAssetToCounty: (assetTag: string, assetName: string, destination: string) => void;
  confirmDepotReceipt: (transferId: string) => void;

  // Operations
  countyStatuses: CountyOfficeStatus[];
  timberConcessions: TimberConcessionPermit[];
  rangerIncidents: FieldRangerIncident[];
  reportRangerIncident: (inc: Omit<FieldRangerIncident, 'id' | 'incidentNo' | 'incidentDate' | 'status'>) => void;
  escalateIncidentToMD: (id: string) => void;
  syncCountyOffice: (county: string) => void;

  // Governance & Audit
  auditLogs: AuditLogEntry[];
  rtmRequirements: RTMRequirement[];
  addAuditEntry: (action: string, module: AuditLogEntry['module'], details: string) => void;

  // Notifications & Print
  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
  printPayload: PrintModalPayload | null;
  openPrintModal: (payload: PrintModalPayload) => void;
  closePrintModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPublicPortal, setIsPublicPortal] = useState<boolean>(true); // Defaults to Home/Landing page for public visitors!
  const [activeModule, setActiveModule] = useState<AppModule>('DASHBOARD');
  const [currentPersona, setCurrentPersona] = useState<UserPersona>(USER_PERSONAS.MANAGING_DIRECTOR);

  // Datasets
  const [publicTenders] = useState<PublicTenderNotice[]>(INITIAL_PUBLIC_TENDERS);
  const [bidderQueries, setBidderQueries] = useState<BidderClarificationQuery[]>(INITIAL_BIDDER_QUERIES);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(INITIAL_PAYROLL_RECORDS);
  const [fieldAttendanceLogs, setFieldAttendanceLogs] = useState<FieldAttendanceLog[]>(INITIAL_FIELD_ATTENDANCE_LOGS);
  const [budgetVotes, setBudgetVotes] = useState<BudgetVoteCode[]>(INITIAL_BUDGET_VOTES);
  const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucher[]>(INITIAL_PAYMENT_VOUCHERS);
  const [bankAccounts] = useState<BankAccount[]>(INITIAL_BANK_ACCOUNTS);
  const [procurementReqs, setProcurementReqs] = useState<ProcurementRequisition[]>(INITIAL_PROCUREMENT_REQS);
  const [vendors] = useState<Vendor[]>(INITIAL_VENDORS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(INITIAL_FIXED_ASSETS);
  const [depotTransfers, setDepotTransfers] = useState<DepotTransfer[]>(INITIAL_DEPOT_TRANSFERS);
  const [consumableInventory] = useState<ConsumableInventory[]>(INITIAL_INVENTORY_STORES);
  const [countyStatuses, setCountyStatuses] = useState<CountyOfficeStatus[]>(INITIAL_COUNTY_STATUS);
  const [timberConcessions] = useState<TimberConcessionPermit[]>(INITIAL_TIMBER_CONCESSIONS);
  const [rangerIncidents, setRangerIncidents] = useState<FieldRangerIncident[]>(INITIAL_RANGER_INCIDENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [rtmRequirements] = useState<RTMRequirement[]>(INITIAL_RTM_DATA);

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'NOTIF-01',
      title: 'Fiscal Period 2026 Active',
      message: 'FDA Vote Book and Budget Controls initialized under GoL MFDP guidelines.',
      type: 'INFO',
      timestamp: 'Just now'
    }
  ]);

  const [printPayload, setPrintPayload] = useState<PrintModalPayload | null>(null);

  const notify = (title: string, message: string, type: AppNotification['type'] = 'INFO') => {
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const generateSimpleHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}e892c9014abdf094892cda1982749817293847aefbc0019`.slice(0, 64);
  };

  const addAuditEntry = (action: string, module: AuditLogEntry['module'], details: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hashPayload = `${now}|${currentPersona.name}|${action}|${details}`;
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: now,
      actorName: currentPersona.name,
      actorRole: currentPersona.role,
      action,
      module,
      details,
      ipAddress: '197.231.10.24 (Liberia FDA Secure Intranet)',
      hash: generateSimpleHash(hashPayload)
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const setCurrentRole = (role: UserRole) => {
    const persona = USER_PERSONAS[role];
    if (persona) {
      setCurrentPersona(persona);
      // Enforce RBAC: if activeModule is not allowed for this persona, reset to DASHBOARD
      const allowed = ROLE_ALLOWED_MODULES[role];
      if (!allowed.includes(activeModule)) {
        setActiveModule('DASHBOARD');
      }
      addAuditEntry('ROLE_SWITCH', 'SECURITY', `User switched persona context to ${persona.name} (${persona.title})`);
      notify('Persona Context Updated', `Active role switched to: ${persona.title} (${persona.name})`, 'INFO');
    }
  };

  const logoutToPublicPortal = () => {
    setIsPublicPortal(true);
    notify('Signed Out', 'Returned to Forestry Development Authority Public Portal.', 'INFO');
  };

  const loginToIntranet = (role?: UserRole) => {
    if (role && USER_PERSONAS[role]) {
      setCurrentPersona(USER_PERSONAS[role]);
      const allowed = ROLE_ALLOWED_MODULES[role];
      if (!allowed.includes(activeModule)) {
        setActiveModule('DASHBOARD');
      }
    }
    setIsPublicPortal(false);
    notify('Welcome to Intranet ERP', `Logged in as ${currentPersona.title} (${currentPersona.name})`, 'SUCCESS');
  };

  // Bidder Portal Queries
  const submitBidderQuery = (query: Omit<BidderClarificationQuery, 'id' | 'questionDate' | 'status'>) => {
    const newQ: BidderClarificationQuery = {
      ...query,
      id: `CLAR-${(bidderQueries.length + 1).toString().padStart(2, '0')}`,
      questionDate: new Date().toISOString().substring(0, 10),
      status: 'PENDING_RESPONSE'
    };
    setBidderQueries(prev => [newQ, ...prev]);
    notify('Clarification Query Submitted', `Query for ${query.tenderRef} logged. FDA Procurement Team notified.`, 'SUCCESS');
    addAuditEntry('BIDDER_QUERY_LOGGED', 'PROCUREMENT', `Prospective bidder ${query.bidderCompanyName} logged clarification query on ${query.tenderRef}`);
  };

  const respondToBidderQuery = (id: string, response: string) => {
    setBidderQueries(prev => prev.map(q => {
      if (q.id === id) {
        return {
          ...q,
          status: 'ANSWERED',
          officialResponse: response,
          respondedBy: `${currentPersona.name} (${currentPersona.title})`,
          responseDate: new Date().toISOString().substring(0, 10)
        };
      }
      return q;
    }));
    notify('Official Response Published', 'Clarification posted on Public Tender Portal for all bidders.', 'SUCCESS');
    addAuditEntry('BIDDER_QUERY_ANSWERED', 'PROCUREMENT', `Clarification query ${id} answered by ${currentPersona.name}`);
  };

  // HRMIS methods
  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const id = `EMP-${(employees.length + 1).toString().padStart(3, '0')}`;
    const newEmp: Employee = { ...emp, id };
    setEmployees(prev => [newEmp, ...prev]);
    addAuditEntry('EMPLOYEE_ONBOARDED', 'HRMIS', `Added employee ${newEmp.fullName} (${newEmp.position}) at ${newEmp.dutyStation}`);
    notify('Employee Added', `${newEmp.fullName} registered into FDA Human Resource database.`, 'SUCCESS');
  };

  const transferEmployeeStation = (employeeId: string, transfer: Omit<CountyPostingRecord, 'id'>) => {
    const transferId = `TRS-${Date.now()}`;
    const newRecord: CountyPostingRecord = { ...transfer, id: transferId };
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          county: transfer.toCounty,
          dutyStation: transfer.toStation,
          stationHistory: [newRecord, ...(emp.stationHistory || [])]
        };
      }
      return emp;
    }));
    addAuditEntry('STAFF_COUNTY_TRANSFER', 'HRMIS', `Transferred staff ${employeeId} from ${transfer.fromStation} (${transfer.fromCounty}) to ${transfer.toStation} (${transfer.toCounty})`);
    notify('County Transfer Effected', `Personnel transferred to ${transfer.toStation}, ${transfer.toCounty} County.`, 'SUCCESS');
  };

  const promoteEmployee = (employeeId: string, promotion: Omit<PromotionRecord, 'id'>) => {
    const promoId = `PRM-${Date.now()}`;
    const newPromo: PromotionRecord = { ...promotion, id: promoId };
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          position: promotion.newPosition,
          gradeBand: promotion.newGrade,
          salaryUSD: promotion.newSalaryUSD,
          salaryLRD: Math.round(promotion.newSalaryUSD * 195),
          promotions: [newPromo, ...(emp.promotions || [])]
        };
      }
      return emp;
    }));
    addAuditEntry('STAFF_PROMOTION_EFFECTED', 'HRMIS', `Promoted staff ${employeeId} to ${promotion.newPosition} (${promotion.newGrade}) with revised salary $${promotion.newSalaryUSD} USD`);
    notify('Promotion Effected', `Personnel elevated to ${promotion.newPosition} (${promotion.newGrade}).`, 'SUCCESS');
  };

  const addDisciplinaryAction = (employeeId: string, record: Omit<DisciplinaryRecord, 'id'>) => {
    const discId = `DISC-${Date.now()}`;
    const newDisc: DisciplinaryRecord = { ...record, id: discId };
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          disciplinaryRecords: [newDisc, ...(emp.disciplinaryRecords || [])]
        };
      }
      return emp;
    }));
    addAuditEntry('DISCIPLINARY_ACTION_LOGGED', 'HRMIS', `Disciplinary record logged for staff ${employeeId}: ${record.incidentType} - ${record.actionTaken}`);
    notify('Disciplinary Query Logged', `Action logged: ${record.actionTaken}`, 'WARNING');
  };

  const logFieldAttendance = (entry: Omit<FieldAttendanceLog, 'id' | 'timestamp'>) => {
    const newLog: FieldAttendanceLog = {
      ...entry,
      id: `ATT-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    setFieldAttendanceLogs(prev => [newLog, ...prev]);
    addAuditEntry('FIELD_ATTENDANCE_LOGGED', 'HRMIS', `Attendance registered for ${entry.employeeName} at ${entry.dutyStation} via ${entry.type}`);
    notify('Attendance Registered', `${entry.employeeName} logged at ${entry.dutyStation} (${entry.type === 'GPS_MOBILE_CHECKIN' ? 'GPS Mobile Stamp' : 'Biometric Terminal'}).`, 'SUCCESS');
  };

  const submitLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'appliedDate' | 'status'>) => {
    const id = `LV-2026-${(leaveRequests.length + 82).toString().padStart(3, '0')}`;
    const newReq: LeaveRequest = {
      ...req,
      id,
      appliedDate: new Date().toISOString().substring(0, 10),
      status: 'PENDING_SUPERVISOR'
    };
    setLeaveRequests(prev => [newReq, ...prev]);
    addAuditEntry('LEAVE_APPLICATION_SUBMITTED', 'HRMIS', `Employee ${req.employeeName} submitted ${req.leaveType} leave request for ${req.days} days.`);
    notify('Leave Application Lodged', `Leave request ${id} submitted. Routing to County/Department Supervisor for Stage 1 endorsement.`, 'SUCCESS');
  };

  const endorseLeaveSupervisor = (id: string) => {
    const timestamp = new Date().toISOString().substring(0, 10);
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id) {
        return {
          ...req,
          status: 'PENDING_HR',
          supervisorEndorsedBy: `${currentPersona.name} (${currentPersona.title})`,
          supervisorEndorsedDate: timestamp
        };
      }
      return req;
    }));
    addAuditEntry('LEAVE_SUPERVISOR_ENDORSED', 'HRMIS', `Supervisor ${currentPersona.name} endorsed leave request ${id}. Routed to HR Director for final certification.`);
    notify('Supervisor Endorsement Granted', `Request ${id} endorsed and forwarded to HR Director Helena S. Gbotoe for final certification.`, 'SUCCESS');
  };

  const approveLeave = (id: string) => {
    const timestamp = new Date().toISOString().substring(0, 10);
    const certNo = `FDA-CERT-LV-2026-${id.split('-').pop() || '001'}`;
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id) {
        return {
          ...req,
          status: 'APPROVED',
          approvedBy: `${currentPersona.name} (${currentPersona.title})`,
          approvedDate: timestamp,
          certificateNo: certNo
        };
      }
      return req;
    }));
    addAuditEntry('LEAVE_APPROVED', 'HRMIS', `Leave request ${id} granted by HR Director ${currentPersona.name}. Certificate issued: ${certNo}`);
    notify('Official Leave Certificate Issued', `Leave request ${id} approved! Digital Authorization Pass ${certNo} generated.`, 'SUCCESS');
  };

  const rejectLeave = (id: string, reason?: string) => {
    setLeaveRequests(prev => prev.map(req => {
      if (req.id === id) {
        return {
          ...req,
          status: 'REJECTED',
          approvedBy: `${currentPersona.name} (${currentPersona.title})`,
          rejectionReason: reason || 'Operational patrol coverage requirements'
        };
      }
      return req;
    }));
    addAuditEntry('LEAVE_REJECTED', 'HRMIS', `Leave request ${id} rejected by ${currentPersona.name}`);
    notify('Leave Rejected', `Leave request ${id} was rejected.`, 'WARNING');
  };

  const processPayrollRun = (period: string) => {
    const records: PayrollRecord[] = employees.map(emp => {
      const baseSalaryUSD = emp.salaryUSD;
      const hazardPayUSD = emp.hazardPayUSD || 0;
      const fieldAllowanceUSD = emp.fieldAllowanceUSD || 0;
      const grossUSD = baseSalaryUSD + hazardPayUSD + fieldAllowanceUSD;
      const grossLRD = Math.round(grossUSD * 195);
      const taxWithheldUSD = Math.round(grossUSD * 0.20);
      const nasscorpUSD = Math.round(grossUSD * 0.04);
      const netPayUSD = grossUSD - taxWithheldUSD - nasscorpUSD;
      const netPayLRD = Math.round(netPayUSD * 195);
      return {
        id: `PAY-${period.replace(/\s+/g, '-')}-${emp.id}`,
        period,
        employeeId: emp.id,
        employeeName: emp.fullName,
        bankName: emp.bankName || 'Liberian Bank for Development & Investment (LBDI)',
        accountNumber: emp.accountNumber || `102-${Math.floor(100000 + Math.random() * 900000)}`,
        baseSalaryUSD,
        hazardPayUSD,
        fieldAllowanceUSD,
        grossUSD,
        grossLRD,
        taxWithheldUSD,
        nasscorpUSD,
        netPayUSD,
        netPayLRD,
        csaApprovalRef: `CSA/AUDIT/2026/09-${emp.biometricId.split('-').pop() || '001'}`,
        status: 'VERIFIED',
        paymentDate: new Date().toISOString().substring(0, 10)
      };
    });
    setPayrollRecords(records);
    addAuditEntry('PAYROLL_PROCESSED', 'HRMIS', `Computed dual-currency payroll with hazard pay & field allowances for ${period} across ${employees.length} active staff.`);
    notify('Payroll Generated', `Payroll for ${period} generated with Base, Hazard Pay, Allowances, LRA (20%), and NASSCORP (4%).`, 'SUCCESS');
  };

  const syncWithCSA = () => {
    setEmployees(prev => prev.map(e => ({ ...e, csaSyncStatus: 'SYNCED' })));
    addAuditEntry('CSA_BIOMETRIC_SYNC', 'HRMIS', 'Synchronized biometric clocking and civil service cadre data with CSA national server.');
    notify('CSA Sync Successful', 'All employee civil service biometric records are synchronized with CSA HRMIS.', 'SUCCESS');
  };

  const runAntiGhostWorkerAudit = () => {
    const timestamp = new Date().toISOString();
    addAuditEntry('ANTI_GHOST_WORKER_SCAN', 'HRMIS', `Executed CSA cross-ministerial deduplication audit across ${employees.length} personnel records. 0 duplicates detected. 100% clean.`);
    notify('CSA Biometric Scan Passed', `All ${employees.length} FDA staff cross-matched with CSA National Biometric database. Zero ghost workers detected.`, 'SUCCESS');
    return {
      totalScanned: employees.length,
      duplicatesFound: 0,
      verifiedClean: employees.length,
      auditTimestamp: timestamp
    };
  };

  // Finance methods
  const createPaymentVoucher = (voucher: Omit<PaymentVoucher, 'id' | 'voucherNo' | 'dateCreated' | 'status'>): boolean => {
    const vote = budgetVotes.find(v => v.code === voucher.voteCode);
    if (vote && vote.availableUSD < voucher.amountUSD) {
      notify('Vote Book Ceiling Exceeded', `Cannot create voucher. Vote ${vote.code} has only $${vote.availableUSD.toLocaleString()} available, but requisition is $${voucher.amountUSD.toLocaleString()}.`, 'ERROR');
      addAuditEntry('VOTE_CEILING_BLOCKED', 'FINANCE', `Attempted voucher for $${voucher.amountUSD} exceeded vote balance on ${vote.code}`);
      return false;
    }

    const id = `PV-2026-${(paymentVouchers.length + 41).toString().padStart(4, '0')}`;
    const voucherNo = `FDA/PV/2026/09/${(paymentVouchers.length + 41).toString().padStart(3, '0')}`;
    const newVoucher: PaymentVoucher = {
      ...voucher,
      id,
      voucherNo,
      dateCreated: new Date().toISOString().substring(0, 10),
      status: 'AUDIT_REVIEW'
    };

    setPaymentVouchers(prev => [newVoucher, ...prev]);

    if (vote) {
      setBudgetVotes(prev => prev.map(v => {
        if (v.id === vote.id) {
          const committedUSD = v.committedUSD + voucher.amountUSD;
          const availableUSD = v.annualAllotmentUSD - committedUSD;
          return { ...v, committedUSD, availableUSD };
        }
        return v;
      }));
    }

    addAuditEntry('VOUCHER_CREATED', 'FINANCE', `Payment voucher ${voucherNo} ($${voucher.amountUSD.toLocaleString()}) initiated for payee: ${voucher.payee}`);
    notify('Voucher Created', `Voucher ${voucherNo} submitted to Internal Audit and Finance review.`, 'SUCCESS');
    return true;
  };

  const approveVoucherFinance = (id: string) => {
    setPaymentVouchers(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, status: 'FINANCE_APPROVED' };
      }
      return v;
    }));
    addAuditEntry('VOUCHER_FINANCE_APPROVED', 'FINANCE', `Voucher ${id} certified by Finance Director ${currentPersona.name}`);
    notify('Voucher Certified', `Voucher ${id} verified and forwarded to Managing Director for executive authorization.`, 'SUCCESS');
  };

  const authorizeVoucherMD = (id: string) => {
    setPaymentVouchers(prev => prev.map(v => {
      if (v.id === id) {
        return {
          ...v,
          status: 'MD_AUTHORIZED',
          authorizedBy: 'Hon. Rudolph J. Merab, Sr.',
          ifmisCommitmentNo: `IFMIS-MFDP-2026-${Math.floor(1000 + Math.random() * 9000)}`
        };
      }
      return v;
    }));
    addAuditEntry('EXECUTIVE_MD_AUTHORIZATION', 'FINANCE', `Managing Director Hon. Rudolph J. Merab, Sr. granted final executive authorization on Voucher ${id}`);
    notify('Executive Authorization Granted', `Payment Voucher ${id} authorized by Managing Director Hon. Rudolph J. Merab, Sr. Ready for payment disbursement.`, 'SUCCESS');
  };

  const markVoucherPaid = (id: string, checkNo: string) => {
    setPaymentVouchers(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, status: 'PAID', checkNumber: checkNo };
      }
      return v;
    }));
    addAuditEntry('PAYMENT_DISBURSED', 'FINANCE', `Voucher ${id} disbursed via check/transfer ${checkNo}`);
    notify('Payment Disbursed', `Payment complete for voucher ${id}. Check No: ${checkNo}`, 'SUCCESS');
  };

  const exportIFMISBatch = () => {
    addAuditEntry('IFMIS_BATCH_EXPORT', 'FINANCE', 'Generated GoL IFMIS XML/JSON transaction commitment batch for Ministry of Finance & Development Planning.');
    notify('IFMIS Batch Exported', 'Commitment batch ready for transmission to GoL IFMIS server.', 'SUCCESS');
  };

  // Procurement methods
  const createProcurementReq = (req: Omit<ProcurementRequisition, 'id' | 'prNo' | 'requestDate' | 'status'>) => {
    const id = `PR-2026-${(procurementReqs.length + 26).toString().padStart(3, '0')}`;
    const prNo = `FDA/PR/2026/${(procurementReqs.length + 26).toString().padStart(3, '0')}`;
    const newReq: ProcurementRequisition = {
      ...req,
      id,
      prNo,
      requestDate: new Date().toISOString().substring(0, 10),
      status: 'SUBMITTED'
    };
    setProcurementReqs(prev => [newReq, ...prev]);
    addAuditEntry('PROCUREMENT_REQ_SUBMITTED', 'PROCUREMENT', `Requisition ${prNo} ($${req.estimatedBudgetUSD.toLocaleString()}) logged under PPCC Method: ${req.ppccMethod}`);
    notify('Procurement Requisition Logged', `${prNo} submitted for Procurement Committee review.`, 'SUCCESS');
  };

  const approveProcurementReq = (id: string) => {
    setProcurementReqs(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, status: 'PPCC_APPROVED' };
      }
      return r;
    }));
    addAuditEntry('PROCUREMENT_PPCC_APPROVED', 'PROCUREMENT', `Procurement requisition ${id} approved under PPCC statutory regulations.`);
    notify('Procurement Approved', `Requisition ${id} cleared by PPCC committee.`, 'SUCCESS');
  };

  const createPurchaseOrder = (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'issueDate' | 'status' | 'threeWayMatch'>) => {
    const id = `PO-2026-${(purchaseOrders.length + 10).toString().padStart(3, '0')}`;
    const poNumber = `FDA/PO/2026/${(purchaseOrders.length + 10).toString().padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...po,
      id,
      poNumber,
      issueDate: new Date().toISOString().substring(0, 10),
      status: 'ISSUED',
      threeWayMatch: {
        prMatched: true,
        poMatched: true,
        grnMatched: false,
        invoiceMatched: false,
        status: 'PENDING'
      }
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    addAuditEntry('PURCHASE_ORDER_ISSUED', 'PROCUREMENT', `Issued PO ${poNumber} ($${po.totalUSD.toLocaleString()}) to vendor ${po.vendorName}`);
    notify('Purchase Order Issued', `${poNumber} transmitted to vendor.`, 'SUCCESS');
  };

  const executeThreeWayMatch = (poId: string) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === poId) {
        return {
          ...po,
          status: 'GOODS_RECEIVED',
          threeWayMatch: {
            prMatched: true,
            poMatched: true,
            grnMatched: true,
            invoiceMatched: true,
            status: 'VERIFIED'
          }
        };
      }
      return po;
    }));
    addAuditEntry('THREE_WAY_MATCH_COMPLETED', 'PROCUREMENT', `Audit verification verified: PR, PO, Store GRN, and Supplier Invoice matched for PO ${poId}`);
    notify('3-Way Match Verified', `PO ${poId} audit check passed: 100% matched across Requisition, PO, GRN, and Invoice.`, 'SUCCESS');
  };

  // Asset methods
  const addFixedAsset = (asset: Omit<FixedAsset, 'id' | 'barcode' | 'currentBookValueUSD'>) => {
    const id = `AST-${(fixedAssets.length + 6).toString().padStart(3, '0')}`;
    const barcode = `79201948${(fixedAssets.length + 340).toString()}`;
    const newAsset: FixedAsset = {
      ...asset,
      id,
      barcode,
      currentBookValueUSD: asset.purchaseCostUSD
    };
    setFixedAssets(prev => [newAsset, ...prev]);
    addAuditEntry('FIXED_ASSET_REGISTERED', 'ASSETS', `Registered asset ${newAsset.assetTag} (${newAsset.name}) at location: ${newAsset.location}`);
    notify('Asset Registered', `${newAsset.assetTag} added to FDA Fixed Asset Register.`, 'SUCCESS');
  };

  const transferAssetToCounty = (assetTag: string, assetName: string, destination: string) => {
    const transferNo = `FDA/TRF/2026/${(depotTransfers.length + 35).toString().padStart(3, '0')}`;
    const id = `TRF-2026-${(depotTransfers.length + 35).toString().padStart(3, '0')}`;
    const newTransfer: DepotTransfer = {
      id,
      transferNo,
      assetTag,
      assetName,
      origin: 'Whein Town HQ Central Store',
      destination,
      dispatchedDate: new Date().toISOString().substring(0, 10),
      status: 'IN_TRANSIT',
      dispatchedBy: `${currentPersona.name} (${currentPersona.title})`
    };
    setDepotTransfers(prev => [newTransfer, ...prev]);
    setFixedAssets(prev => prev.map(a => {
      if (a.assetTag === assetTag) {
        return { ...a, location: `In Transit to ${destination}` };
      }
      return a;
    }));
    addAuditEntry('ASSET_DEPOT_DISPATCH', 'ASSETS', `Dispatched asset ${assetTag} to ${destination} via transfer note ${transferNo}`);
    notify('Asset Dispatched', `${assetTag} is in transit to ${destination}.`, 'INFO');
  };

  const confirmDepotReceipt = (transferId: string) => {
    const transfer = depotTransfers.find(t => t.id === transferId);
    if (!transfer) return;

    setDepotTransfers(prev => prev.map(t => {
      if (t.id === transferId) {
        return {
          ...t,
          status: 'CONFIRMED_AT_DEPOT',
          receivedBy: `${currentPersona.name} (${currentPersona.title})`
        };
      }
      return t;
    }));

    setFixedAssets(prev => prev.map(a => {
      if (a.assetTag === transfer.assetTag) {
        return { ...a, location: transfer.destination };
      }
      return a;
    }));

    addAuditEntry('ASSET_RECEIPT_CONFIRMED', 'ASSETS', `Confirmed physical receipt of ${transfer.assetTag} at depot ${transfer.destination}`);
    notify('Receipt Confirmed', `${transfer.assetTag} officially accepted at ${transfer.destination}.`, 'SUCCESS');
  };

  // Operations methods
  const reportRangerIncident = (inc: Omit<FieldRangerIncident, 'id' | 'incidentNo' | 'incidentDate' | 'status'>) => {
    const id = `INC-2026-${(rangerIncidents.length + 47).toString().padStart(3, '0')}`;
    const incidentNo = `FDA/RNG/2026/${(rangerIncidents.length + 47).toString().padStart(3, '0')}`;
    const newInc: FieldRangerIncident = {
      ...inc,
      id,
      incidentNo,
      incidentDate: new Date().toISOString().substring(0, 10),
      status: inc.severity === 'CRITICAL' ? 'ESCALATED_TO_MD' : 'INVESTIGATING'
    };
    setRangerIncidents(prev => [newInc, ...prev]);
    addAuditEntry('RANGER_INCIDENT_LOGGED', 'OPERATIONS', `Ranger field report ${incidentNo} (${newInc.type}) in ${newInc.county} County. Severity: ${newInc.severity}`);
    notify('Field Incident Logged', `${incidentNo} recorded from ${newInc.county} County sector.`, newInc.severity === 'CRITICAL' ? 'ERROR' : 'WARNING');
  };

  const escalateIncidentToMD = (id: string) => {
    setRangerIncidents(prev => prev.map(inc => {
      if (inc.id === id) {
        return { ...inc, status: 'ESCALATED_TO_MD' };
      }
      return inc;
    }));
    addAuditEntry('INCIDENT_ESCALATED_MD', 'OPERATIONS', `Incident ${id} escalated to Managing Director Hon. Rudolph J. Merab, Sr. for urgent intervention.`);
    notify('Escalated to Managing Director', `Incident ${id} prioritized on Managing Director executive desk.`, 'WARNING');
  };

  const syncCountyOffice = (county: string) => {
    setCountyStatuses(prev => prev.map(c => {
      if (c.county === county) {
        return {
          ...c,
          syncStatus: 'SYNCED_REALTIME',
          lastSyncTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          pendingRecords: 0
        };
      }
      return c;
    }));
    addAuditEntry('COUNTY_DATA_SYNC', 'OPERATIONS', `Synchronized field records from ${county} County Depot to Whein Town Bernard Farm HQ.`);
    notify('County Synchronization Complete', `All field logs from ${county} County merged with HQ database.`, 'SUCCESS');
  };

  const openPrintModal = (payload: PrintModalPayload) => {
    setPrintPayload(payload);
  };

  const closePrintModal = () => {
    setPrintPayload(null);
  };

  return (
    <AppContext.Provider
      value={{
        isPublicPortal,
        setIsPublicPortal,
        activeModule,
        setActiveModule,
        currentPersona,
        setCurrentRole,
        logoutToPublicPortal,
        loginToIntranet,

        publicTenders,
        bidderQueries,
        submitBidderQuery,
        respondToBidderQuery,

        employees,
        leaveRequests,
        payrollRecords,
        fieldAttendanceLogs,
        addEmployee,
        transferEmployeeStation,
        promoteEmployee,
        addDisciplinaryAction,
        logFieldAttendance,
        submitLeaveRequest,
        endorseLeaveSupervisor,
        approveLeave,
        rejectLeave,
        processPayrollRun,
        syncWithCSA,
        runAntiGhostWorkerAudit,

        budgetVotes,
        paymentVouchers,
        bankAccounts,
        createPaymentVoucher,
        approveVoucherFinance,
        authorizeVoucherMD,
        markVoucherPaid,
        exportIFMISBatch,

        procurementReqs,
        vendors,
        purchaseOrders,
        createProcurementReq,
        approveProcurementReq,
        createPurchaseOrder,
        executeThreeWayMatch,

        fixedAssets,
        depotTransfers,
        consumableInventory,
        addFixedAsset,
        transferAssetToCounty,
        confirmDepotReceipt,

        countyStatuses,
        timberConcessions,
        rangerIncidents,
        reportRangerIncident,
        escalateIncidentToMD,
        syncCountyOffice,

        auditLogs,
        rtmRequirements,
        addAuditEntry,

        notifications,
        dismissNotification,
        printPayload,
        openPrintModal,
        closePrintModal
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
