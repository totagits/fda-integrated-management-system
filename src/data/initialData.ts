import type {
  AppNotification, AuditLogEntry, BankAccount, BidderClarificationQuery, BudgetVoteCode,
  CommunityGrievance, CommunityRegistry, ConsumableInventory, CountyOfficeStatus,
  DonorGrant, Employee, EmployeeTrainingEnrollment, FieldAttendanceLog,
  FieldRangerIncident, FixedAsset, GrantDisbursement, HarvestLog, LegalCase,
  LeaveRequest, PaymentVoucher, PayrollRecord, ProcurementRequisition, ProtectedArea,
  PublicTenderNotice, RoyaltyInvoice, SpeciesSighting, TimberConcessionPermit,
  TrainingProgram, UserPersona, Vendor, PurchaseOrder, DepotTransfer,
} from '../types';

// Do not ship sample business data. These remain empty until a module is connected to its approved service.
export const USER_PERSONAS: Record<string, UserPersona> = {
  MANAGING_DIRECTOR: { role: 'MANAGING_DIRECTOR', name: 'Signed-in staff member', title: 'Managing Director & CEO', department: 'Executive Office', county: '', badge: 'Role assigned by administrator' },
  FINANCE_DIRECTOR: { role: 'FINANCE_DIRECTOR', name: 'Signed-in staff member', title: 'Director of Finance & Budget', department: 'Finance & Administration', county: '', badge: 'Role assigned by administrator' },
  HR_DIRECTOR: { role: 'HR_DIRECTOR', name: 'Signed-in staff member', title: 'Director of Human Resources', department: 'Human Resources & Administration', county: '', badge: 'Role assigned by administrator' },
  PROCUREMENT_OFFICER: { role: 'PROCUREMENT_OFFICER', name: 'Signed-in staff member', title: 'Procurement Officer', department: 'Procurement', county: '', badge: 'Role assigned by administrator' },
  ASSET_OFFICER: { role: 'ASSET_OFFICER', name: 'Signed-in staff member', title: 'Asset Officer', department: 'Asset Management', county: '', badge: 'Role assigned by administrator' },
  COUNTY_OFFICER: { role: 'COUNTY_OFFICER', name: 'Signed-in staff member', title: 'County Officer', department: 'County Operations', county: '', badge: 'Role assigned by administrator' },
  INTERNAL_AUDITOR: { role: 'INTERNAL_AUDITOR', name: 'Signed-in staff member', title: 'Internal Auditor', department: 'Internal Audit', county: '', badge: 'Role assigned by administrator' },
};

export const INITIAL_EMPLOYEES: Employee[] = [];
export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];
export const INITIAL_FIELD_ATTENDANCE_LOGS: FieldAttendanceLog[] = [];
export const INITIAL_PAYROLL_RECORDS: PayrollRecord[] = [];
export const INITIAL_BUDGET_VOTES: BudgetVoteCode[] = [];
export const INITIAL_PAYMENT_VOUCHERS: PaymentVoucher[] = [];
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [];
export const INITIAL_PROCUREMENT_REQS: ProcurementRequisition[] = [];
export const INITIAL_VENDORS: Vendor[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const INITIAL_FIXED_ASSETS: FixedAsset[] = [];
export const INITIAL_DEPOT_TRANSFERS: DepotTransfer[] = [];
export const INITIAL_INVENTORY_STORES: ConsumableInventory[] = [];
export const INITIAL_COUNTY_STATUS: CountyOfficeStatus[] = [];
export const INITIAL_TIMBER_CONCESSIONS: TimberConcessionPermit[] = [];
export const INITIAL_RANGER_INCIDENTS: FieldRangerIncident[] = [];
export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];
export const INITIAL_PUBLIC_TENDERS: PublicTenderNotice[] = [];
export const INITIAL_BIDDER_QUERIES: BidderClarificationQuery[] = [];
export const INITIAL_TRAINING_PROGRAMS: TrainingProgram[] = [];
export const INITIAL_TRAINING_ENROLLMENTS: EmployeeTrainingEnrollment[] = [];
export const INITIAL_ROYALTY_INVOICES: RoyaltyInvoice[] = [];
export const INITIAL_HARVEST_LOGS: HarvestLog[] = [];
export const INITIAL_LEGAL_CASES: LegalCase[] = [];
export const INITIAL_COMMUNITIES: CommunityRegistry[] = [];
export const INITIAL_GRIEVANCES: CommunityGrievance[] = [];
export const INITIAL_PROTECTED_AREAS: ProtectedArea[] = [];
export const INITIAL_SPECIES_SIGHTINGS: SpeciesSighting[] = [];
export const INITIAL_DONOR_GRANTS: DonorGrant[] = [];
export const INITIAL_GRANT_DISBURSEMENTS: GrantDisbursement[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
