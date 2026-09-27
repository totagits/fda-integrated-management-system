export type UserRole =
  | 'MANAGING_DIRECTOR'     // Hon. Rudolph J. Merab, Sr. - Executive authorization
  | 'FINANCE_DIRECTOR'      // Budget Vote Book control, Payment Voucher approvals, IFMIS Gateway
  | 'HR_DIRECTOR'           // Civil service personnel, Leave workflows, Dual-Currency Payroll, CSA Sync
  | 'PROCUREMENT_OFFICER'   // PPCC compliance, RFQs, Vendor Registry, 3-Way Matching
  | 'ASSET_OFFICER'         // Fixed Asset Register, Barcode/QR tags, Depreciation, County Depot Transfers
  | 'COUNTY_OFFICER'        // Regional Forestry Operations, Field Patrols, Concession checks, Offline Sync
  | 'INTERNAL_AUDITOR';     // Immutable Audit Trail, Segregation of Duties (SoD) oversight

export interface UserPersona {
  role: UserRole;
  name: string;
  title: string;
  department: string;
  county: string;
  badge: string;
}

export type LiberiaCounty =
  | 'Montserrado'
  | 'Nimba'
  | 'Grand Bassa'
  | 'Sinoe'
  | 'Lofa'
  | 'Rivercess'
  | 'Gbarpolu'
  | 'Grand Gedeh'
  | 'Maryland'
  | 'Bong'
  | 'Margibi'
  | 'Bomi'
  | 'Grand Cape Mount'
  | 'River Gee'
  | 'Grand Kru';

// ==================== 1. HRMIS & PAYROLL ====================
export interface CountyPostingRecord {
  id: string;
  fromStation: string;
  toStation: string;
  fromCounty: LiberiaCounty;
  toCounty: LiberiaCounty;
  transferDate: string;
  authorizedBy: string;
  reason: string;
}

export interface PromotionRecord {
  id: string;
  effectiveDate: string;
  previousPosition: string;
  newPosition: string;
  previousGrade: string;
  newGrade: string;
  previousSalaryUSD: number;
  newSalaryUSD: number;
}

export interface DisciplinaryRecord {
  id: string;
  date: string;
  incidentType: string;
  description: string;
  actionTaken: string;
  resolved: boolean;
}

export interface FieldAttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  county: LiberiaCounty;
  dutyStation: string;
  timestamp: string;
  type: 'BIOMETRIC_TERMINAL' | 'GPS_MOBILE_CHECKIN';
  terminalId?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  };
  geoFenceStatus: 'INSIDE_PROTECTED_AREA' | 'OFF_STATION_FLAG' | 'VERIFIED';
  status: 'PRESENT' | 'LATE' | 'EXCUSED';
}

export interface Employee {
  id: string;
  empNo: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  county: LiberiaCounty;
  dutyStation: string;
  gradeBand: string;
  biometricId: string;
  cadre: 'CIVIL_SERVICE' | 'FDA_PERMANENT' | 'FIELD_RANGER' | 'CONTRACTUAL';
  salaryUSD: number;
  salaryLRD: number;
  hazardPayUSD?: number;
  fieldAllowanceUSD?: number;
  dateEmployed: string;
  dateOfBirth?: string;
  bankName?: string;
  accountNumber?: string;
  csaSyncStatus: 'SYNCED' | 'PENDING' | 'RECONCILED';
  status: 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED';
  stationHistory?: CountyPostingRecord[];
  promotions?: PromotionRecord[];
  disciplinaryRecords?: DisciplinaryRecord[];
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  dutyStation?: string;
  county?: LiberiaCounty;
  leaveType: 'ANNUAL' | 'SICK' | 'MATERNITY' | 'PATROL_COMPENSATORY' | 'OFFICIAL_DUTY';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING_SUPERVISOR' | 'PENDING_HR' | 'APPROVED' | 'REJECTED';
  appliedDate: string;
  supervisorEndorsedBy?: string;
  supervisorEndorsedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
  certificateNo?: string;
  rejectionReason?: string;
}

export interface PayrollRecord {
  id: string;
  period: string; // e.g. "September 2026"
  employeeId: string;
  employeeName: string;
  bankName?: string;
  accountNumber?: string;
  baseSalaryUSD?: number;
  hazardPayUSD?: number;
  fieldAllowanceUSD?: number;
  grossUSD: number;
  grossLRD: number;
  taxWithheldUSD: number; // LRA Withholding (20%)
  nasscorpUSD: number;   // Social Security (4%)
  netPayUSD: number;
  netPayLRD: number;
  csaApprovalRef?: string;
  status: 'DRAFT' | 'VERIFIED' | 'DISBURSED';
  paymentDate: string;
}

// ==================== 2. FINANCE & VOTE BOOK ====================
export interface BudgetVoteCode {
  id: string;
  code: string; // e.g. "211101 - FDA Forest Ranger Personnel"
  title: string;
  category: 'PERSONNEL' | 'OPERATIONS' | 'CAPITAL' | 'CONSERVATION';
  annualAllotmentUSD: number;
  committedUSD: number;
  actualSpentUSD: number;
  availableUSD: number;
}

export interface PaymentVoucher {
  id: string;
  voucherNo: string;
  payee: string;
  description: string;
  voteCode: string;
  amountUSD: number;
  amountLRD: number;
  currency: 'USD' | 'LRD';
  paymentMethod: 'CHECK' | 'BANK_TRANSFER' | 'MOBILE_MONEY';
  status: 'DRAFT' | 'AUDIT_REVIEW' | 'FINANCE_APPROVED' | 'MD_AUTHORIZED' | 'PAID' | 'REJECTED';
  initiator: string;
  dateCreated: string;
  authorizedBy?: string;
  checkNumber?: string;
  ifmisCommitmentNo?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'OPERATING' | 'REVENUE_COLLECTION' | 'DONOR_PROJECT' | 'PAYROLL';
  currency: 'USD' | 'LRD';
  balance: number;
  lastReconciled: string;
}

// ==================== 3. PROCUREMENT (PPCC & e-GP) ====================
export interface ProcurementRequisition {
  id: string;
  prNo: string;
  title: string;
  department: string;
  estimatedBudgetUSD: number;
  ppccMethod: 'REQUEST_FOR_QUOTATION' | 'NATIONAL_COMPETITIVE_BIDDING' | 'INTERNATIONAL_BIDDING' | 'RESTRICTED_TENDERING';
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  status: 'SUBMITTED' | 'COMMITTEE_REVIEW' | 'PPCC_APPROVED' | 'TENDER_ISSUED' | 'CANCELLED';
  requestDate: string;
}

export interface Vendor {
  id: string;
  name: string;
  businessRegNo: string;
  lraTaxClearanceNo: string;
  taxClearanceExpiry: string;
  ppccRegId: string;
  category: 'VEHICLES_EQUIPMENT' | 'IT_SOFTWARE' | 'FORESTRY_SUPPLIES' | 'CIVIL_WORKS' | 'CONSULTANCY';
  rating: number; // 1-5
  contactPerson: string;
  phone: string;
  status: 'VERIFIED' | 'EXPIRED_CLEARANCE' | 'BLACKLISTED';
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prNo: string;
  vendorId: string;
  vendorName: string;
  description: string;
  totalUSD: number;
  issueDate: string;
  expectedDelivery: string;
  status: 'ISSUED' | 'GOODS_RECEIVED' | 'INVOICED' | 'COMPLETED' | 'CANCELLED';
  threeWayMatch: {
    prMatched: boolean;
    poMatched: boolean;
    grnMatched: boolean; // Goods Received Note
    invoiceMatched: boolean;
    status: 'PENDING' | 'VERIFIED' | 'DISCREPANCY';
  };
}

export interface BidderClarificationQuery {
  id: string;
  tenderRef: string;
  tenderTitle: string;
  bidderCompanyName: string;
  bidderContactPerson: string;
  bidderEmail: string;
  bidderPhone: string;
  question: string;
  questionDate: string;
  status: 'PENDING_RESPONSE' | 'ANSWERED';
  officialResponse?: string;
  respondedBy?: string;
  responseDate?: string;
}

export interface PublicTenderNotice {
  id: string;
  tenderRef: string;
  title: string;
  procurementCategory: 'CONSULTING_SERVICES' | 'GOODS' | 'WORKS' | 'NON_CONSULTING';
  publishedDate: string;
  submissionDeadline: string;
  managingDirector: string;
  submissionAddress: string;
  primaryEmail: string;
  clarificationEmail: string;
  telephones: string[];
  estimatedBudgetUSD: number;
  status: 'OPEN_FOR_EXPRESSIONS' | 'UNDER_EVALUATION' | 'AWARDED';
  keyRequirements: string[];
  documentsDownloadUrl?: string;
}


// ==================== 4. ASSET & INVENTORY ====================
export interface FixedAsset {
  id: string;
  assetTag: string; // e.g. "FDA-VEH-2026-042"
  barcode: string;
  name: string;
  category: 'VEHICLES' | 'FIELD_EQUIPMENT' | 'IT_HARDWARE' | 'COMMUNICATION' | 'HEAVY_MACHINERY';
  serialNumber: string;
  purchaseDate: string;
  purchaseCostUSD: number;
  usefulLifeYears: number;
  salvageValueUSD: number;
  currentBookValueUSD: number;
  location: string; // e.g. "Whein Town HQ - Bernard Farm" or "Nimba Field Office - Sanniquellie"
  assignedStaff: string;
  condition: 'OPERATIONAL' | 'NEEDS_SERVICE' | 'DEPRECIATED' | 'DAMAGED' | 'DISPOSED';
}

export interface DepotTransfer {
  id: string;
  transferNo: string;
  assetTag: string;
  assetName: string;
  origin: string;
  destination: string;
  dispatchedDate: string;
  status: 'PENDING_DISPATCH' | 'IN_TRANSIT' | 'CONFIRMED_AT_DEPOT';
  dispatchedBy: string;
  receivedBy?: string;
}

export interface ConsumableInventory {
  id: string;
  itemCode: string;
  name: string;
  category: 'RANGER_UNIFORMS' | 'GPS_BATTERIES' | 'FUEL_VOUCHERS' | 'SAFETY_GEAR' | 'OFFICE_SUPPLIES';
  quantityInStock: number;
  unit: string;
  reorderLevel: number;
  unitCostUSD: number;
  depotLocation: string;
}

// ==================== 5. FORESTRY OPERATIONS ====================
export interface CountyOfficeStatus {
  county: LiberiaCounty;
  stationHub: string;
  region: 'Region 1 - Western' | 'Region 2 - Central' | 'Region 3 - South-East' | 'Region 4 - Eastern' | 'Region 5 - Northern';
  rangersOnDuty: number;
  activeConcessions: number;
  syncStatus: 'SYNCED_REALTIME' | 'OFFLINE_SYNC_PENDING' | 'DISCONNECTED';
  lastSyncTimestamp: string;
  pendingRecords: number;
}

export interface TimberConcessionPermit {
  id: string;
  permitNumber: string; // e.g. "FDA-FMC-001/2026"
  holderName: string;
  county: LiberiaCounty;
  concessionType: 'Forest Management Contract (FMC)' | 'Timber Sale Contract (TSC)' | 'Community Forest (CFMA)';
  areaHectares: number;
  annualOperationalPlanStatus: 'APPROVED' | 'UNDER_REVIEW' | 'EXPIRED';
  sgsLiberTraceId: string;
  revenueStatus: 'ROYALTIES_CURRENT' | 'ARREARS_FLAGGED';
}

export interface FieldRangerIncident {
  id: string;
  incidentNo: string;
  incidentDate: string;
  county: LiberiaCounty;
  locationDetails: string;
  type: 'ILLEGAL_PIT_SAWING' | 'CHAINSAW_SEIZURE' | 'ENCROACHMENT' | 'UNAUTHORIZED_HAULING' | 'WILDLIFE_TRAFFICKING';
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  description: string;
  reportedBy: string;
  evidenceCount: number;
  status: 'INVESTIGATING' | 'ESCALATED_TO_MD' | 'LEGAL_ACTION' | 'RESOLVED';
}

// ==================== 6. GOVERNANCE & AUDIT ====================
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  module: 'HRMIS' | 'FINANCE' | 'PROCUREMENT' | 'ASSETS' | 'OPERATIONS' | 'SECURITY';
  details: string;
  ipAddress: string;
  hash: string;
}

export interface RTMRequirement {
  reqId: string;
  torSection: string;
  category: string;
  title: string;
  specification: string;
  platformImplementation: string;
  testCase: string;
  status: 'FULLY_COMPLIANT' | 'CONFIGURED' | 'EVIDENCE_DEMO_READY';
}
