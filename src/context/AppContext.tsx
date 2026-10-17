import { ROLE_MODULES, canRead, canAct, inCounty } from '../lib/rbac';
import { useDemoState } from '../lib/demoStore';
import { validateCommitment, voucherTransition, downloadJson } from '../lib/controls';
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
  PublicTenderNotice,
  OnboardingNotification,
  TrainingProgram,
  EmployeeTrainingEnrollment,
  TrainingStatus,
  RoyaltyInvoice,
  HarvestLog,
  LegalCase,
  CommunityRegistry,
  CommunityGrievance,
  ProtectedArea,
  SpeciesSighting,
  DonorGrant,
  GrantDisbursement,
  AppNotification,
  PrintModalPayload
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
  INITIAL_BIDDER_QUERIES,
  INITIAL_TRAINING_PROGRAMS,
  INITIAL_TRAINING_ENROLLMENTS,
  INITIAL_ROYALTY_INVOICES,
  INITIAL_HARVEST_LOGS,
  INITIAL_LEGAL_CASES,
  INITIAL_COMMUNITIES,
  INITIAL_GRIEVANCES,
  INITIAL_PROTECTED_AREAS,
  INITIAL_SPECIES_SIGHTINGS,
  INITIAL_DONOR_GRANTS,
  INITIAL_GRANT_DISBURSEMENTS,
  INITIAL_NOTIFICATIONS
} from '../data/initialData';

import { INITIAL_RTM_DATA } from '../data/rtmData';

export type AppModule =
  | 'DASHBOARD'
  | 'MY_ACCOUNT'
  | 'HRMIS'
  | 'FINANCE'
  | 'PROCUREMENT'
  | 'ASSETS'
  | 'OPERATIONS'
  | 'RTM'
  | 'AUDIT'
  | 'SECURITY'
  | 'REVENUE'
  | 'COMPLIANCE'
  | 'COMMUNITY'
  | 'BIODIVERSITY'
  | 'GRANTS'
  | 'INTEGRATION';

export const ROLE_ALLOWED_MODULES = ROLE_MODULES as unknown as Record<UserRole, AppModule[]>;


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

  // HRMIS, Leave & Attendance Telemetry
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  fieldAttendanceLogs: FieldAttendanceLog[];
  activeEmployee: Employee;
  updateEmployeeProfile: (employeeId: string, updates: Partial<Employee>) => void;
  changePassword: (employeeId: string, newPass: string) => boolean;
  dispatchedOnboardings: OnboardingNotification[];
  onboardEmployeeWithNotifications: (emp: Omit<Employee, 'id'>) => OnboardingNotification;
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

  // Training & Capacity Development
  trainingPrograms: TrainingProgram[];
  trainingEnrollments: EmployeeTrainingEnrollment[];
  assignTraining: (data: {
    trainingId: string;
    employeeId: string;
    dueDate: string;
    isMandatory?: boolean;
  }) => void;
  updateTrainingProgress: (
    enrollmentId: string,
    hoursCompleted: number,
    feedback?: string,
    score?: number,
    certify?: boolean
  ) => void;
  createTrainingProgram: (prog: Omit<TrainingProgram, 'id'>) => void;

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

  // Revenue & Royalty Management
  royaltyInvoices: RoyaltyInvoice[];
  issueRoyaltyInvoice: (inv: Omit<RoyaltyInvoice, 'id'>) => void;
  recordRoyaltyPayment: (invoiceId: string, amountUSD: number, paymentRef: string) => void;

  // Harvest & AAC Tracking
  harvestLogs: HarvestLog[];
  addHarvestLog: (log: Omit<HarvestLog, 'id'>) => void;

  // Legal Case Management
  legalCases: LegalCase[];
  createLegalCase: (c: Omit<LegalCase, 'id'>) => void;
  updateCaseStatus: (caseId: string, status: LegalCase['status'], notes?: string) => void;

  // Community & Social Safeguards
  communities: CommunityRegistry[];
  grievances: CommunityGrievance[];
  addGrievance: (g: Omit<CommunityGrievance, 'id'>) => void;
  resolveGrievance: (grievanceId: string, notes: string) => void;

  // Biodiversity & Wildlife Monitoring
  protectedAreas: ProtectedArea[];
  speciesSightings: SpeciesSighting[];
  addSpeciesSighting: (s: Omit<SpeciesSighting, 'id'>) => void;

  // Grant & Donor Management
  donorGrants: DonorGrant[];
  grantDisbursements: GrantDisbursement[];
  addGrantDisbursement: (d: Omit<GrantDisbursement, 'id'>) => void;

  // In-App Notifications & Print
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;
  dismissNotification: (id: string) => void;
  printPayload: PrintModalPayload | null;
  openPrintModal: (payload: PrintModalPayload) => void;
  closePrintModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPublicPortal, setIsPublicPortal] = useState<boolean>(true); // Fresh visitors start on the public Home/Landing page.
  const [activeModule, setActiveModule] = useState<AppModule>('DASHBOARD');
  const [currentPersona, setCurrentPersona] = useState<UserPersona>(USER_PERSONAS.MANAGING_DIRECTOR);

  // Datasets
  const [publicTenders] = useDemoState<PublicTenderNotice[]>('INITIAL_PUBLIC_TENDERS', INITIAL_PUBLIC_TENDERS);
  const [bidderQueries, setBidderQueries] = useDemoState<BidderClarificationQuery[]>('INITIAL_BIDDER_QUERIES', INITIAL_BIDDER_QUERIES);
  const [employees, setEmployees] = useDemoState<Employee[]>('INITIAL_EMPLOYEES', INITIAL_EMPLOYEES);
  const [leaveRequests, setLeaveRequests] = useDemoState<LeaveRequest[]>('INITIAL_LEAVE_REQUESTS', INITIAL_LEAVE_REQUESTS);
  const [payrollRecords, setPayrollRecords] = useDemoState<PayrollRecord[]>('INITIAL_PAYROLL_RECORDS', INITIAL_PAYROLL_RECORDS);
  const [fieldAttendanceLogs, setFieldAttendanceLogs] = useDemoState<FieldAttendanceLog[]>('INITIAL_FIELD_ATTENDANCE_LOGS', INITIAL_FIELD_ATTENDANCE_LOGS);
  const [budgetVotes, setBudgetVotes] = useDemoState<BudgetVoteCode[]>('INITIAL_BUDGET_VOTES', INITIAL_BUDGET_VOTES);
  const [paymentVouchers, setPaymentVouchers] = useDemoState<PaymentVoucher[]>('INITIAL_PAYMENT_VOUCHERS', INITIAL_PAYMENT_VOUCHERS);
  const [bankAccounts] = useDemoState<BankAccount[]>('INITIAL_BANK_ACCOUNTS', INITIAL_BANK_ACCOUNTS);
  const [procurementReqs, setProcurementReqs] = useDemoState<ProcurementRequisition[]>('INITIAL_PROCUREMENT_REQS', INITIAL_PROCUREMENT_REQS);
  const [vendors] = useDemoState<Vendor[]>('INITIAL_VENDORS', INITIAL_VENDORS);
  const [purchaseOrders, setPurchaseOrders] = useDemoState<PurchaseOrder[]>('INITIAL_PURCHASE_ORDERS', INITIAL_PURCHASE_ORDERS);
  const [fixedAssets, setFixedAssets] = useDemoState<FixedAsset[]>('INITIAL_FIXED_ASSETS', INITIAL_FIXED_ASSETS);
  const [depotTransfers, setDepotTransfers] = useDemoState<DepotTransfer[]>('INITIAL_DEPOT_TRANSFERS', INITIAL_DEPOT_TRANSFERS);
  const [consumableInventory] = useDemoState<ConsumableInventory[]>('INITIAL_INVENTORY_STORES', INITIAL_INVENTORY_STORES);
  const [countyStatuses, setCountyStatuses] = useDemoState<CountyOfficeStatus[]>('INITIAL_COUNTY_STATUS', INITIAL_COUNTY_STATUS);
  const [timberConcessions] = useDemoState<TimberConcessionPermit[]>('INITIAL_TIMBER_CONCESSIONS', INITIAL_TIMBER_CONCESSIONS);
  const [rangerIncidents, setRangerIncidents] = useDemoState<FieldRangerIncident[]>('INITIAL_RANGER_INCIDENTS', INITIAL_RANGER_INCIDENTS);
  const [auditLogs, setAuditLogs] = useDemoState<AuditLogEntry[]>('INITIAL_AUDIT_LOGS', INITIAL_AUDIT_LOGS);
  const [rtmRequirements] = useDemoState<RTMRequirement[]>('INITIAL_RTM_DATA', INITIAL_RTM_DATA);
  const [dispatchedOnboardings, setDispatchedOnboardings] = useState<OnboardingNotification[]>([]);
  const [trainingPrograms, setTrainingPrograms] = useDemoState<TrainingProgram[]>('INITIAL_TRAINING_PROGRAMS', INITIAL_TRAINING_PROGRAMS);
  const [trainingEnrollments, setTrainingEnrollments] = useDemoState<EmployeeTrainingEnrollment[]>('INITIAL_TRAINING_ENROLLMENTS', INITIAL_TRAINING_ENROLLMENTS);

  // New state datasets for 8 additional modules
  const [royaltyInvoices, setRoyaltyInvoices] = useDemoState<RoyaltyInvoice[]>('INITIAL_ROYALTY_INVOICES', INITIAL_ROYALTY_INVOICES);
  const [harvestLogs, setHarvestLogs] = useDemoState<HarvestLog[]>('INITIAL_HARVEST_LOGS', INITIAL_HARVEST_LOGS);
  const [legalCases, setLegalCases] = useDemoState<LegalCase[]>('INITIAL_LEGAL_CASES', INITIAL_LEGAL_CASES);
  const [communities, setCommunities] = useDemoState<CommunityRegistry[]>('INITIAL_COMMUNITIES', INITIAL_COMMUNITIES);
  const [grievances, setGrievances] = useDemoState<CommunityGrievance[]>('INITIAL_GRIEVANCES', INITIAL_GRIEVANCES);
  const [protectedAreas, setProtectedAreas] = useDemoState<ProtectedArea[]>('INITIAL_PROTECTED_AREAS', INITIAL_PROTECTED_AREAS);
  const [speciesSightings, setSpeciesSightings] = useDemoState<SpeciesSighting[]>('INITIAL_SPECIES_SIGHTINGS', INITIAL_SPECIES_SIGHTINGS);
  const [donorGrants, setDonorGrants] = useDemoState<DonorGrant[]>('INITIAL_DONOR_GRANTS', INITIAL_DONOR_GRANTS);
  const [grantDisbursements, setGrantDisbursements] = useDemoState<GrantDisbursement[]>('INITIAL_GRANT_DISBURSEMENTS', INITIAL_GRANT_DISBURSEMENTS);
  const [notifications, setNotifications] = useDemoState<AppNotification[]>('INITIAL_NOTIFICATIONS', INITIAL_NOTIFICATIONS);

  const [printPayload, setPrintPayload] = useState<PrintModalPayload | null>(null);

  /** Internal shortcut used by existing action functions to produce a visible toast-style notification */
  const notify = (title: string, message: string, _type?: string) => {
    const newNotif: AppNotification = {
      id: `NOTIF-${Date.now()}`,
      createdAt: new Date().toISOString(),
      type: 'ASSET_TRANSFER', // generic fallback type for system toasts
      title,
      message,
      targetRoles: ['MANAGING_DIRECTOR', 'FINANCE_DIRECTOR', 'HR_DIRECTOR', 'PROCUREMENT_OFFICER', 'ASSET_OFFICER', 'COUNTY_OFFICER', 'INTERNAL_AUDITOR'],
      isRead: false,
      priority: 'NORMAL'
    };
    setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
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
      id: `AUD-${crypto.randomUUID()}`,
      timestamp: now,
      actorName: currentPersona.name,
      actorRole: currentPersona.role,
      action,
      module,
      details,
      ipAddress: 'Local demonstration browser',
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
    if (!canAct(currentPersona.role, 'procurement')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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

  // Active employee mapped from current persona context (RBAC)
  const activeEmployee: Employee = employees.find(e => {
    const pName = currentPersona.name.toLowerCase();
    const eName = e.fullName.toLowerCase();
    if (pName.includes('merab') && eName.includes('merab')) return true;
    if (pName.includes('kpaiseh') && eName.includes('kpaiseh')) return true;
    if (pName.includes('bryant') && eName.includes('bryant')) return true;
    if (pName.includes('toe') && eName.includes('toe')) return true;
    if (pName.includes('gbotoe') && eName.includes('gbotoe')) return true;
    if (pName.includes('tamba') && eName.includes('tamba')) return true;
    if (pName.includes('sirleaf') && eName.includes('sirleaf')) return true;
    return e.position === currentPersona.title;
  }) || employees[0];

  const updateEmployeeProfile = (employeeId: string, updates: Partial<Employee>) => {
    if (employeeId !== activeEmployee.id) { notify('Access denied','Only your own profile can be edited here.'); return; }
    const allowed=['email','phone','address','avatarUrl','emergencyContact'];
    updates=Object.fromEntries(Object.entries(updates).filter(([k])=>allowed.includes(k)));

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, ...updates };
      }
      return emp;
    }));
    addAuditEntry(
      'PROFILE_UPDATED',
      'SECURITY',
      `Employee ${employeeId} updated self-service profile details (Contact/Address/Photo).`
    );
    notify('Profile Updated', 'Your employee profile information has been saved successfully.', 'SUCCESS');
  };

  const changePassword = (employeeId: string, _newPass: string): boolean => {
    if (employeeId !== activeEmployee.id) { notify('Access denied','This action is limited to your own employee record.'); return undefined as never; }

    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, mustChangePassword: false };
      }
      return emp;
    }));
    addAuditEntry(
      'PASSWORD_CHANGED',
      'SECURITY',
      `Employee ${employeeId} completed mandatory first-time password update. Account active.`
    );
    notify('Password Changed', 'Your account password has been updated and security verified.', 'SUCCESS');
    return true;
  };

  // Automated HR Onboarding with Dual Email and SMS Dispatch
  const onboardEmployeeWithNotifications = (emp: Omit<Employee, 'id'>): OnboardingNotification => {
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const id = `EMP-${(employees.length + 1).toString().padStart(3, '0')}`;
    const tempPassword = `FDA#${Math.random().toString(36).slice(-4).toUpperCase()}2026!`;
    const csaBiometricRef = emp.biometricId || `BIO-${emp.county.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newEmp: Employee = {
      ...emp,
      id,
      biometricId: csaBiometricRef,
      mustChangePassword: true,
      accumulatedAnnualLeaveDays: 21,
      usedAnnualLeaveDays: 0,
      accumulatedSickLeaveDays: 15,
      usedSickLeaveDays: 0,
      compensatoryPatrolDays: emp.cadre === 'FIELD_RANGER' ? 6 : 0,
      address: emp.address || `${emp.dutyStation}, ${emp.county} County`,
      csaSyncStatus: 'SYNCED',
      status: 'ACTIVE'
    };

    setEmployees(prev => [newEmp, ...prev]);

    // Dispatch Official Onboarding Email
    const emailSubject = `Official Appointment & Mandatory Portal Activation — Forestry Development Authority (${newEmp.empNo})`;
    const emailBody = `Dear ${newEmp.fullName},

Welcome to the Forestry Development Authority (FDA), Republic of Liberia. Your appointment as ${newEmp.position} in the Department of ${newEmp.department} (Station: ${newEmp.dutyStation}, ${newEmp.county} County) has been officially processed and registered with the Civil Service Agency (CSA HRMIS) Biometric Registry.

==================================================
YOUR OFFICIAL FDA INTRANET LOGIN CREDENTIALS
==================================================
• Official Email: ${newEmp.email}
• Employee Number: ${newEmp.empNo}
• CSA Biometric ID: ${csaBiometricRef}
• Initial Temporary Password: ${tempPassword}
• Access Portal: https://totagits.github.io/fda-integrated-management-system/

IMPORTANT MANDATORY REQUIREMENT:
Under Civil Service Agency (CSA) Regulations & FDA Information Security Policy §4, you are required to log into the FDA Employee Portal within 24 hours and complete a mandatory password change to activate your digital payroll enrollment, field telemetry, and annual leave accruals.

For IT and HR assistance, contact the FDA HR Helpdesk at Whein Town HQ (0776-063-643 / 0886-551-249).

Sincerely,
Helena S. Gbotoe, Director of Human Resources
Hon. Rudolph J. Merab, Sr., Managing Director & CEO
Forestry Development Authority, Republic of Liberia`;

    // Dispatch Instant SMS Alert (via Liberia Lonestar Cell MTN / Orange GSM Gateway)
    const smsMessage = `[FDA LIBERIA] Welcome ${newEmp.fullName}! Your employee profile (${newEmp.empNo}) at ${newEmp.dutyStation} is active. Login credentials & mandatory password reset instructions have been sent to ${newEmp.email}. Temp Pass: ${tempPassword}. Portal: https://totagits.github.io/fda-integrated-management-system/`;

    const notificationRecord: OnboardingNotification = {
      id: `NOTIF-ONB-${Date.now()}`,
      employeeId: id,
      employeeName: newEmp.fullName,
      email: newEmp.email,
      phone: newEmp.phone,
      temporaryPassword: tempPassword,
      emailStatus: 'DELIVERED',
      smsStatus: 'DELIVERED',
      emailContent: {
        subject: emailSubject,
        body: emailBody
      },
      smsContent: smsMessage,
      dispatchedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      csaBiometricRef
    };

    setDispatchedOnboardings(prev => [notificationRecord, ...prev]);

    addAuditEntry(
      'EMPLOYEE_ONBOARDED_WITH_CREDENTIALS',
      'HRMIS',
      `Onboarded ${newEmp.fullName} (${newEmp.position}). Welcome email & SMS dispatched to ${newEmp.email} and ${newEmp.phone}. Mandatory password change flagged.`
    );

    notify(
      'Onboarding Notification Dispatched',
      `Welcome email & SMS notification dispatched to ${newEmp.fullName} (${newEmp.email} & ${newEmp.phone}).`,
      'SUCCESS'
    );

    return notificationRecord;
  };

  // HRMIS methods
  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    onboardEmployeeWithNotifications(emp);
  };

  const transferEmployeeStation = (employeeId: string, transfer: Omit<CountyPostingRecord, 'id'>) => {
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (entry.employeeId !== activeEmployee.id) { notify('Access denied','This action is limited to your own employee record.'); return undefined as never; }

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
    if (req.employeeId !== activeEmployee.id) { notify('Access denied','This action is limited to your own employee record.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'payroll')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    addAuditEntry('CSA_SANDBOX_PREVIEW', 'HRMIS', 'Prepared local personnel reconciliation preview. No CSA connection or transmission.');
    downloadJson('fda-csa-demo-preview.json', { mode: 'SANDBOX', records: employees.map(e => ({ id:e.id, biometricId:e.biometricId })), notice:'CSA approval and official schema required.' });
    notify('CSA preview downloaded', 'Local demonstration only. National records were not changed.', 'INFO');
  };
  const runAntiGhostWorkerAudit = () => {
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const ids = new Set<string>(); let duplicatesFound=0;
    employees.forEach(e => { if (!e.biometricId || ids.has(e.biometricId)) duplicatesFound++; else ids.add(e.biometricId); });
    const auditTimestamp=new Date().toISOString();
    addAuditEntry('LOCAL_DUPLICATE_SCAN','HRMIS',`Checked ${employees.length} local records; ${duplicatesFound} duplicate/missing identifiers. No national verification.`);
    notify('Local identifier check complete', `${duplicatesFound} duplicate/missing IDs. No national biometric lookup performed.`, duplicatesFound ? 'WARNING' : 'INFO');
    return {totalScanned:employees.length,duplicatesFound,verifiedClean:employees.length-duplicatesFound,auditTimestamp};
  };

  // Training & Capacity Development
  const assignTraining = (data: {
    trainingId: string;
    employeeId: string;
    dueDate: string;
    isMandatory?: boolean;
  }) => {
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const prog = trainingPrograms.find(p => p.id === data.trainingId);
    const emp = employees.find(e => e.id === data.employeeId);
    if (!prog || !emp) {
      notify('Assignment Error', 'Program or Employee not found.', 'ERROR');
      return;
    }

    const newEnrollment: EmployeeTrainingEnrollment = {
      id: `ENR-${Date.now()}`,
      trainingId: prog.id,
      trainingTitle: prog.title,
      category: prog.category,
      deliveryMethod: prog.deliveryMethod,
      employeeId: emp.id,
      employeeName: emp.fullName,
      department: emp.department,
      dutyStation: emp.dutyStation,
      county: emp.county,
      assignedDate: new Date().toISOString().substring(0, 10),
      dueDate: data.dueDate,
      status: 'NOT_STARTED',
      progressPercent: 0,
      hoursCompleted: 0,
      totalHours: prog.durationHours,
      isMandatory: data.isMandatory ?? true
    };

    setTrainingEnrollments(prev => [newEnrollment, ...prev]);

    addAuditEntry(
      'TRAINING_ASSIGNED',
      'HRMIS',
      `Assigned course "${prog.title}" to ${emp.fullName} (${emp.position}, ${emp.dutyStation}). Due: ${data.dueDate}.`
    );

    notify(
      'Training Assigned',
      `"${prog.title}" successfully assigned to ${emp.fullName}.`,
      'SUCCESS'
    );
  };

  const updateTrainingProgress = (
    enrollmentId: string,
    hoursCompleted: number,
    feedback?: string,
    score?: number,
    certify: boolean = false
  ) => {
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    setTrainingEnrollments(prev => prev.map(enr => {
      if (enr.id === enrollmentId) {
        const cappedHours = Math.min(enr.totalHours, Math.max(0, hoursCompleted));
        const progressPercent = Math.min(100, Math.round((cappedHours / enr.totalHours) * 100));
        const isDone = certify || progressPercent >= 100;
        const finalStatus: TrainingStatus = isDone ? 'COMPLETED' : (cappedHours > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');
        const certNo = isDone ? (enr.certificateNo || `FDA-CERT-TRN-2026-${Date.now().toString().slice(-4)}`) : undefined;
        const completedDate = isDone ? (enr.completedDate || new Date().toISOString().substring(0, 10)) : undefined;

        return {
          ...enr,
          hoursCompleted: isDone ? enr.totalHours : cappedHours,
          progressPercent: isDone ? 100 : progressPercent,
          status: finalStatus,
          supervisorFeedback: feedback !== undefined ? feedback : enr.supervisorFeedback,
          score: score !== undefined ? score : enr.score,
          completedDate,
          certificateNo: certNo,
          trainerSignedBy: isDone ? (enr.trainerSignedBy || currentPersona.name) : undefined
        };
      }
      return enr;
    }));

    addAuditEntry(
      'TRAINING_PROGRESS_LOGGED',
      'HRMIS',
      `Updated training progress for enrollment ${enrollmentId} (${hoursCompleted} hrs, certified: ${certify}). Signed by ${currentPersona.name}.`
    );

    notify(
      'Training Progress Saved',
      'Training record and competencies updated successfully.',
      'SUCCESS'
    );
  };

  const createTrainingProgram = (prog: Omit<TrainingProgram, 'id'>) => {
    if (!canAct(currentPersona.role, 'hr')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const newProg: TrainingProgram = {
      ...prog,
      id: `TRN-${(trainingPrograms.length + 1).toString().padStart(3, '0')}`
    };
    setTrainingPrograms(prev => [newProg, ...prev]);
    addAuditEntry('TRAINING_PROGRAM_CREATED', 'HRMIS', `Created new curriculum "${newProg.title}" (${newProg.code})`);
    notify('Training Program Created', `Course "${newProg.title}" added to FDA Training Catalog.`, 'SUCCESS');
  };

  // Finance methods
  const createPaymentVoucher = (voucher: Omit<PaymentVoucher, 'id' | 'voucherNo' | 'dateCreated' | 'status'>): boolean => {
    if (!canAct(currentPersona.role, 'finance')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const vote = budgetVotes.find(v => v.code === voucher.voteCode);
    const issue = validateCommitment(voucher.amountUSD, vote?.availableUSD);
    if (issue) {
      notify('Vote Book Ceiling Exceeded', issue, 'ERROR');
      addAuditEntry('VOTE_CEILING_BLOCKED', 'FINANCE', `Attempted voucher for $${voucher.amountUSD} exceeded vote balance on ${vote?.code}`);
      return false;
    }

    const id = `PV-2026-${(paymentVouchers.length + 41).toString().padStart(4, '0')}`;
    const voucherNo = `FDA/PV/2026/09/${(paymentVouchers.length + 41).toString().padStart(3, '0')}`;
    const newVoucher: PaymentVoucher = {
      ...voucher,
      initiator: currentPersona.name,
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

    const issue = voucherTransition(paymentVouchers.find(v=>v.id===id), currentPersona.role, currentPersona.name, 'FINANCE_APPROVED');
    if (issue) { notify('Workflow control',issue,'ERROR'); return; }
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

    const issue = voucherTransition(paymentVouchers.find(v=>v.id===id), currentPersona.role, currentPersona.name, 'MD_AUTHORIZED');
    if (issue) { notify('Workflow control',issue,'ERROR'); return; }
    setPaymentVouchers(prev => prev.map(v => {
      if (v.id === id) {
        return {
          ...v,
          status: 'MD_AUTHORIZED',
          authorizedBy: currentPersona.name,
          ifmisCommitmentNo: `DEMO-LOCAL-2026-${Math.floor(1000 + Math.random() * 9000)}`
        };
      }
      return v;
    }));
    addAuditEntry('EXECUTIVE_MD_AUTHORIZATION', 'FINANCE', `Managing Director Hon. Rudolph J. Merab, Sr. granted final executive authorization on Voucher ${id}`);
    notify('Executive Authorization Granted', `Payment Voucher ${id} authorized by Managing Director Hon. Rudolph J. Merab, Sr. Ready for payment disbursement.`, 'SUCCESS');
  };

  const markVoucherPaid = (id: string, checkNo: string) => {

    const issue = voucherTransition(paymentVouchers.find(v=>v.id===id), currentPersona.role, currentPersona.name, 'PAID');
    if (issue) { notify('Workflow control',issue,'ERROR'); return; }
    if (!checkNo.trim()) { notify('Reference required','Enter a sample payment reference.','ERROR'); return; }
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
    if (!canAct(currentPersona.role, 'finance')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const records=paymentVouchers.filter(v=>['MD_AUTHORIZED','PAID'].includes(v.status)).map(v=>({externalId:v.id,amount:v.amountUSD,currency:'USD',voteCode:v.voteCode}));
    downloadJson('fda-ifmis-demo-batch.json',{schema:'totag.fda.commitment-demo.v1',mode:'SANDBOX',records,controlTotal:records.reduce((s,r)=>s+r.amount,0),notice:'No IFMIS transmission. Official interface approval required.'});
    addAuditEntry('IFMIS_SANDBOX_EXPORT','FINANCE',`Downloaded ${records.length} authorized local commitments; no external transmission.`);
    notify('Demo batch downloaded','Inspect the JSON or use the interoperability workbench to validate it.','INFO');
  };

  // Procurement methods
  const createProcurementReq = (req: Omit<ProcurementRequisition, 'id' | 'prNo' | 'requestDate' | 'status'>) => {
    if (!canAct(currentPersona.role, 'procurement')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'procurement')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'procurement')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'procurement')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const po=purchaseOrders.find(p=>p.id===poId); if (!po) return;
    const m=po.threeWayMatch; const valid=m.prMatched && m.poMatched && m.grnMatched && m.invoiceMatched;
    setPurchaseOrders(prev=>prev.map(p=>p.id===poId?{...p,threeWayMatch:{...p.threeWayMatch,status:valid?'VERIFIED':'DISCREPANCY'}}:p));
    addAuditEntry('MATCH_EVIDENCE_CHECK','PROCUREMENT',`${poId}: ${valid?'sample evidence flags complete':'missing requisition, order, receipt or invoice evidence'}. No external document verification.`);
    notify(valid?'Sample evidence complete':'Missing matching evidence',valid?'All four stored sample evidence flags are present.':'Receipt and invoice evidence must be recorded before matching; this check does not invent receipts.','INFO');
  };

  // Asset methods
  const addFixedAsset = (asset: Omit<FixedAsset, 'id' | 'barcode' | 'currentBookValueUSD'>) => {
    if (!canAct(currentPersona.role, 'assets')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'assets')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (currentPersona.role === 'COUNTY_OFFICER' && !inCounty(depotTransfers.find(t=>t.id===transferId)?.destination || '', currentPersona.county)) { notify('Access denied','This receipt is outside your county.'); return; }

    if (!canAct(currentPersona.role, 'receipt')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (currentPersona.role === 'COUNTY_OFFICER' && inc.county !== currentPersona.county) { notify('Access denied','The record is outside your assigned county.'); return; }

    if (!canAct(currentPersona.role, 'field')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (!canAct(currentPersona.role, 'executive')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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
    if (currentPersona.role === 'COUNTY_OFFICER' && county !== currentPersona.county) { notify('Access denied','The record is outside your assigned county.'); return; }

    if (!canAct(currentPersona.role, 'field')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

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


  // ==================== REVENUE & ROYALTY ====================
  const issueRoyaltyInvoice = (inv: Omit<RoyaltyInvoice, 'id'>) => {
    if (!canAct(currentPersona.role, 'finance')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const newInv: RoyaltyInvoice = { ...inv, id: `ROY-${Date.now()}` };
    setRoyaltyInvoices(prev => [newInv, ...prev]);
    addAuditEntry('ROYALTY_INVOICE_ISSUED', 'FINANCE', `Royalty invoice ${newInv.invoiceNo} issued for ${newInv.holderName} — $${newInv.amountUSD.toLocaleString()} USD`);
  };

  const recordRoyaltyPayment = (invoiceId: string, amountUSD: number, paymentRef: string) => {
    if (!canAct(currentPersona.role, 'finance')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    setRoyaltyInvoices(prev => prev.map(inv =>
      inv.id === invoiceId
        ? { ...inv, status: (inv.paidAmountUSD || 0) + amountUSD >= inv.amountUSD ? 'PAID' : 'PARTIALLY_PAID', paidAmountUSD: (inv.paidAmountUSD || 0) + amountUSD, paymentRef, paymentDate: new Date().toISOString().split('T')[0] }
        : inv
    ));
    addAuditEntry('ROYALTY_PAYMENT_RECORDED', 'FINANCE', `Royalty payment of $${amountUSD.toLocaleString()} recorded for invoice ${invoiceId} — Ref: ${paymentRef}`);
  };

  // ==================== HARVEST TRACKING ====================
  const addHarvestLog = (log: Omit<HarvestLog, 'id'>) => {
    if (currentPersona.role === 'COUNTY_OFFICER' && log.county !== currentPersona.county) { notify('Access denied','The record is outside your assigned county.'); return; }

    if (!canAct(currentPersona.role, 'field')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const newLog: HarvestLog = { ...log, id: `HRV-${Date.now()}` };
    setHarvestLogs(prev => [newLog, ...prev]);
    addAuditEntry('HARVEST_LOG_CREATED', 'OPERATIONS', `Harvest log ${newLog.logNo} recorded: ${newLog.volumeHarvestedM3}m³ ${newLog.species} — ${newLog.holderName}`);
  };

  // ==================== LEGAL CASE MANAGEMENT ====================
  const createLegalCase = (c: Omit<LegalCase, 'id'>) => {
    if (!canAct(currentPersona.role, 'legal')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const newCase: LegalCase = { ...c, id: `CASE-${Date.now()}` };
    setLegalCases(prev => [newCase, ...prev]);
    addAuditEntry('LEGAL_CASE_FILED', 'OPERATIONS', `Legal case ${newCase.caseNo} filed — ${newCase.caseType} in ${newCase.county} County`);
  };

  const updateCaseStatus = (caseId: string, status: LegalCase['status'], notes?: string) => {
    if (!canAct(currentPersona.role, 'legal')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    setLegalCases(prev => prev.map(c =>
      c.id === caseId ? { ...c, status, judgment: notes || c.judgment } : c
    ));
    addAuditEntry('LEGAL_CASE_STATUS_UPDATED', 'OPERATIONS', `Legal case ${caseId} status updated to ${status}`);
  };

  // ==================== COMMUNITY & SOCIAL SAFEGUARDS ====================
  const addGrievance = (g: Omit<CommunityGrievance, 'id'>) => {
    if (currentPersona.role === 'COUNTY_OFFICER' && g.county !== currentPersona.county) { notify('Access denied','The record is outside your assigned county.'); return; }

    if (!canAct(currentPersona.role, 'community')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const newG: CommunityGrievance = { ...g, id: `GRV-${Date.now()}` };
    setGrievances(prev => [newG, ...prev]);
    addAuditEntry('GRIEVANCE_REGISTERED', 'OPERATIONS', `Community grievance ${newG.grievanceNo} registered — ${newG.communityName}, ${newG.county} County`);
  };

  const resolveGrievance = (grievanceId: string, notes: string) => {
    if (currentPersona.role === 'COUNTY_OFFICER' && grievances.find(g=>g.id===grievanceId)?.county !== currentPersona.county) { notify('Access denied','This grievance is outside your county.'); return; }

    if (!canAct(currentPersona.role, 'community')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    setGrievances(prev => prev.map(g =>
      g.id === grievanceId ? { ...g, status: 'RESOLVED', resolutionNotes: notes, resolvedDate: new Date().toISOString().split('T')[0] } : g
    ));
    addAuditEntry('GRIEVANCE_RESOLVED', 'OPERATIONS', `Grievance ${grievanceId} resolved: ${notes}`);
  };

  // ==================== BIODIVERSITY & WILDLIFE ====================
  const addSpeciesSighting = (s: Omit<SpeciesSighting, 'id'>) => {
    if (currentPersona.role === 'COUNTY_OFFICER' && s.county !== currentPersona.county) { notify('Access denied','The record is outside your assigned county.'); return; }

    if (!canAct(currentPersona.role, 'field')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const newS: SpeciesSighting = { ...s, id: `SIT-${Date.now()}` };
    setSpeciesSightings(prev => [newS, ...prev]);
    addAuditEntry('SPECIES_SIGHTING_RECORDED', 'OPERATIONS', `Species sighting ${newS.sightingNo} recorded: ${newS.species} at ${newS.protectedAreaName}`);
  };

  // ==================== GRANT & DONOR MANAGEMENT ====================
  const addGrantDisbursement = (d: Omit<GrantDisbursement, 'id'>) => {
    if (!canAct(currentPersona.role, 'grant')) { notify('Access denied', 'Your role cannot perform this action.'); return undefined as never; }

    const newD: GrantDisbursement = { ...d, id: `DISB-${Date.now()}` };
    setGrantDisbursements(prev => [newD, ...prev]);
    setDonorGrants(prev => prev.map(g =>
      g.id === d.grantId ? { ...g, disbursedToDateUSD: g.disbursedToDateUSD + d.amountUSD } : g
    ));
    addAuditEntry('GRANT_DISBURSEMENT_RECORDED', 'FINANCE', `Grant disbursement ${newD.disbursementNo} of $${newD.amountUSD.toLocaleString()} received — ${newD.donorName}`);
  };

  // ==================== NOTIFICATIONS ====================
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const addNotification = (n: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const newN: AppNotification = { ...n, id: `NOTIF-${Date.now()}`, createdAt: new Date().toISOString(), isRead: false };
    setNotifications(prev => [newN, ...prev.slice(0, 49)]);
  };

  const openPrintModal = (payload: PrintModalPayload) => {
    const module = {LEGAL_CASE_REPORT:'COMPLIANCE',PAY_SLIP:'MY_ACCOUNT',PURCHASE_ORDER:'PROCUREMENT',ROYALTY_INVOICE:'REVENUE',TRAINING_CERTIFICATE:'MY_ACCOUNT',PAYMENT_VOUCHER:'FINANCE',ASSET_TAG:'ASSETS',PAYROLL_SLIP:'MY_ACCOUNT',RTM_REPORT:'RTM',INCIDENT_DISPATCH:'OPERATIONS',LEAVE_CERTIFICATE:'MY_ACCOUNT'}[payload.type];
    if (module && !canRead(currentPersona.role,module)) { notify('Access denied','Your role cannot export this resource.'); return; }

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
        bidderQueries: canRead(currentPersona.role,'PROCUREMENT') ? bidderQueries : [],
        submitBidderQuery,
        respondToBidderQuery,

        employees: canRead(currentPersona.role,'HRMIS') ? employees : employees.filter(r=>r.id === activeEmployee.id),
        leaveRequests: canRead(currentPersona.role,'HRMIS') ? leaveRequests : leaveRequests.filter(r=>r.employeeId === activeEmployee.id),
        payrollRecords: canRead(currentPersona.role,'HRMIS') ? payrollRecords : payrollRecords.filter(r=>r.employeeId === activeEmployee.id),
        fieldAttendanceLogs: canRead(currentPersona.role,'HRMIS') ? fieldAttendanceLogs : fieldAttendanceLogs.filter(r=>r.employeeId === activeEmployee.id),
        activeEmployee,
        updateEmployeeProfile,
        changePassword,
        dispatchedOnboardings: currentPersona.role === 'HR_DIRECTOR' ? dispatchedOnboardings : [],
        onboardEmployeeWithNotifications,
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

        trainingPrograms,
        trainingEnrollments: canRead(currentPersona.role,'HRMIS') ? trainingEnrollments : trainingEnrollments.filter(r=>r.employeeId === activeEmployee.id),
        assignTraining,
        updateTrainingProgress,
        createTrainingProgram,

        budgetVotes: canRead(currentPersona.role,'FINANCE') ? budgetVotes : [],
        paymentVouchers: canRead(currentPersona.role,'FINANCE') ? paymentVouchers : [],
        bankAccounts: canRead(currentPersona.role,'FINANCE') ? bankAccounts : [],
        createPaymentVoucher,
        approveVoucherFinance,
        authorizeVoucherMD,
        markVoucherPaid,
        exportIFMISBatch,

        procurementReqs: canRead(currentPersona.role,'PROCUREMENT') ? procurementReqs : [],
        vendors: canRead(currentPersona.role,'PROCUREMENT') ? vendors : [],
        purchaseOrders: canRead(currentPersona.role,'PROCUREMENT') ? purchaseOrders : [],
        createProcurementReq,
        approveProcurementReq,
        createPurchaseOrder,
        executeThreeWayMatch,

        fixedAssets: canRead(currentPersona.role,'ASSETS') ? fixedAssets.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || inCounty(r.location,currentPersona.county)) : [],
        depotTransfers: canRead(currentPersona.role,'ASSETS') ? depotTransfers.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || inCounty(r.destination,currentPersona.county) || inCounty(r.origin,currentPersona.county)) : [],
        consumableInventory: canRead(currentPersona.role,'ASSETS') ? consumableInventory.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || inCounty(r.depotLocation,currentPersona.county)) : [],
        addFixedAsset,
        transferAssetToCounty,
        confirmDepotReceipt,

        countyStatuses: canRead(currentPersona.role,'OPERATIONS') ? countyStatuses.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        timberConcessions: canRead(currentPersona.role,'OPERATIONS') ? timberConcessions.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        rangerIncidents: canRead(currentPersona.role,'OPERATIONS') ? rangerIncidents.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        reportRangerIncident,
        escalateIncidentToMD,
        syncCountyOffice,

        auditLogs: canRead(currentPersona.role,'AUDIT') ? auditLogs : [],
        rtmRequirements: canRead(currentPersona.role,'RTM') ? rtmRequirements : [],
        addAuditEntry,

        notifications: notifications.filter(n=>n.targetRoles.includes(currentPersona.role) && (!n.linkModule || canRead(currentPersona.role,n.linkModule))),
        dismissNotification,
        markNotificationRead,
        markAllNotificationsRead,
        addNotification,

        royaltyInvoices: canRead(currentPersona.role,'REVENUE') ? royaltyInvoices : [],
        issueRoyaltyInvoice,
        recordRoyaltyPayment,

        harvestLogs: canRead(currentPersona.role,'OPERATIONS') ? harvestLogs.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        addHarvestLog,

        legalCases: canRead(currentPersona.role,'COMPLIANCE') ? legalCases.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        createLegalCase,
        updateCaseStatus,

        communities: canRead(currentPersona.role,'COMMUNITY') ? communities.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        grievances: canRead(currentPersona.role,'COMMUNITY') ? grievances.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        addGrievance,
        resolveGrievance,

        protectedAreas: canRead(currentPersona.role,'BIODIVERSITY') ? protectedAreas.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        speciesSightings: canRead(currentPersona.role,'BIODIVERSITY') ? speciesSightings.filter(r=>currentPersona.role !== 'COUNTY_OFFICER' || r.county === currentPersona.county) : [],
        addSpeciesSighting,

        donorGrants: canRead(currentPersona.role,'GRANTS') ? donorGrants : [],
        grantDisbursements: canRead(currentPersona.role,'GRANTS') ? grantDisbursements : [],
        addGrantDisbursement,

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
