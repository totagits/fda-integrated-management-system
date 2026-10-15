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
  avatarUrl?: string;
  mustChangePassword?: boolean;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  accumulatedAnnualLeaveDays?: number; // Total annual entitlement (e.g. 21 days = 168 hrs)
  usedAnnualLeaveDays?: number;
  accumulatedSickLeaveDays?: number;   // Total sick entitlement (e.g. 15 days = 120 hrs)
  usedSickLeaveDays?: number;
  compensatoryPatrolDays?: number;    // Field patrol compensatory rest days
}

export interface OnboardingNotification {
  id: string;
  employeeId: string;
  employeeName: string;
  email: string;
  phone: string;
  temporaryPassword: string;
  emailStatus: 'DELIVERED' | 'QUEUED' | 'FAILED';
  smsStatus: 'DELIVERED' | 'QUEUED' | 'FAILED';
  emailContent: {
    subject: string;
    body: string;
  };
  smsContent: string;
  dispatchedAt: string;
  csaBiometricRef: string;
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

// ==================== TRAINING & CAPACITY DEVELOPMENT ====================
export type TrainingDeliveryMethod = 'ON_THE_JOB' | 'FIELD_SIMULATION' | 'CLASSROOM_WORKSHOP' | 'E_LEARNING';
export type TrainingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface TrainingProgram {
  id: string;
  code: string;
  title: string;
  category: 'FOREST_GOVERNANCE' | 'FIELD_OPERATIONS' | 'CHAIN_OF_CUSTODY' | 'FINANCE_PROCUREMENT' | 'HEALTH_SAFETY' | 'LEADERSHIP';
  targetCadre: 'ALL' | 'FIELD_RANGER' | 'CIVIL_SERVICE' | 'FDA_PERMANENT' | 'CONTRACTUAL';
  durationHours: number;
  deliveryMethod: TrainingDeliveryMethod;
  facilitator: string;
  description: string;
  syllabusTopics: string[];
  certificationIssued: boolean;
}

export interface EmployeeTrainingEnrollment {
  id: string;
  trainingId: string;
  trainingTitle: string;
  category: TrainingProgram['category'];
  deliveryMethod: TrainingDeliveryMethod;
  employeeId: string;
  employeeName: string;
  department: string;
  dutyStation: string;
  county: LiberiaCounty;
  assignedDate: string;
  dueDate: string;
  status: TrainingStatus;
  progressPercent: number;
  hoursCompleted: number;
  totalHours: number;
  score?: number;
  supervisorFeedback?: string;
  completedDate?: string;
  certificateNo?: string;
  isMandatory: boolean;
  trainerSignedBy?: string;
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

// ==================== 7. REVENUE & ROYALTY MANAGEMENT ====================
export interface RoyaltyInvoice {
  id: string;
  invoiceNo: string;         // e.g. "FDA-ROY-2026-001"
  concessionId: string;
  concessionPermitNo: string;
  holderName: string;
  county: LiberiaCounty;
  invoiceType: 'AREA_FEE' | 'STUMPAGE_FEE' | 'NTFP_LEVY' | 'PROCESSING_FEE' | 'CONCESSION_RENEWAL';
  periodFrom: string;
  periodTo: string;
  areaBilled?: number;       // hectares billed
  volumeM3?: number;         // cubic meters (stumpage)
  ratePerUnit: number;       // USD per ha or per m3
  amountUSD: number;
  amountLRD: number;
  dueDate: string;
  status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'DISPUTED';
  paidAmountUSD?: number;
  paymentDate?: string;
  paymentRef?: string;       // Bank receipt / MoFP remittance ref
  lraRemittanceRef?: string;
  issuedBy: string;
}

// ==================== 8. TIMBER HARVEST & AAC TRACKING ====================
export interface HarvestLog {
  id: string;
  logNo: string;             // e.g. "FDA-HRV-2026-001"
  concessionId: string;
  concessionPermitNo: string;
  holderName: string;
  county: LiberiaCounty;
  harvestDate: string;
  species: string;           // e.g. "Iroko", "African Mahogany", "Sipo"
  volumeHarvestedM3: number;
  aacAllowedM3: number;      // Annual Allowable Cut for this concession
  cumulativeHarvestedM3: number; // Year-to-date for this concession
  aacCompliancePercent: number;  // cumulative/aac * 100
  sgsWaybillNo: string;      // SGS LiberTrace waybill
  logGrader: string;         // Ranger / log grader name
  destination: string;       // e.g. "Port of Buchanan", "Local Mill"
  status: 'VERIFIED' | 'UNDER_REVIEW' | 'FLAGGED';
}

// ==================== 9. LEGAL CASE MANAGEMENT ====================
export interface LegalCase {
  id: string;
  caseNo: string;            // e.g. "FDA-CASE-2026-001"
  incidentId?: string;       // Linked ranger incident
  incidentNo?: string;
  county: LiberiaCounty;
  caseType: 'ILLEGAL_LOGGING' | 'ENCROACHMENT' | 'WILDLIFE_TRAFFICKING' | 'CHAINSAW_SEIZURE' | 'CONTRACT_VIOLATION' | 'REVENUE_FRAUD';
  suspects: string[];        // Suspect names
  filedDate: string;
  assignedLegalOfficer: string;
  courtName?: string;        // e.g. "Montserrado County Court"
  hearingDate?: string;
  penaltyUSD?: number;
  penaltyCollectedUSD?: number;
  status: 'FILED' | 'UNDER_INVESTIGATION' | 'REFERRED_TO_COURT' | 'JUDGMENT_ISSUED' | 'PENALTY_COLLECTED' | 'CLOSED' | 'DISMISSED';
  description: string;
  evidenceFiles: number;
  closedDate?: string;
  judgment?: string;
}

// ==================== 10. COMMUNITY & SOCIAL SAFEGUARDS ====================
export interface CommunityRegistry {
  id: string;
  communityName: string;
  county: LiberiaCounty;
  district: string;
  gpsLat: number;
  gpsLon: number;
  populationEstimate: number;
  chiefLeader: string;
  contactPhone: string;
  nearbyForestArea: string;  // e.g. "Sapo National Park Buffer Zone"
  benefitSharingStatus: 'ACTIVE' | 'PENDING_RENEWAL' | 'NOT_ESTABLISHED';
  fpicStatus: 'OBTAINED' | 'PENDING' | 'NOT_REQUIRED' | 'WITHDRAWN';
  fpicDate?: string;
  fpicRefNo?: string;
  grievancePending: number;  // count of open grievances
}

export interface CommunityGrievance {
  id: string;
  grievanceNo: string;       // e.g. "FDA-GRV-2026-001"
  communityId: string;
  communityName: string;
  county: LiberiaCounty;
  filedDate: string;
  filedBy: string;
  grievanceType: 'BOUNDARY_DISPUTE' | 'BENEFIT_SHARE_DELAY' | 'ENVIRONMENTAL_DAMAGE' | 'RANGER_CONDUCT' | 'CONCESSION_ENCROACHMENT' | 'OTHER';
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedOfficer: string;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'IN_MEDIATION' | 'RESOLVED' | 'ESCALATED';
  resolutionNotes?: string;
  resolvedDate?: string;
}

// ==================== 11. BIODIVERSITY & WILDLIFE MONITORING ====================
export interface ProtectedArea {
  id: string;
  name: string;              // e.g. "Sapo National Park"
  areaType: 'NATIONAL_PARK' | 'BIOSPHERE_RESERVE' | 'WILDLIFE_REFUGE' | 'FOREST_RESERVE' | 'COMMUNITY_FOREST';
  county: LiberiaCounty;
  areaHectares: number;
  establishedYear: number;
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  lastSurveyDate: string;
  biodiversityScore: number; // 0-100 composite health index
  rangerCount: number;
  cameraTraps: number;
  keySpecies: string[];      // e.g. ["Western Chimpanzee", "Pygmy Hippo", "Forest Elephant"]
  status: 'STABLE' | 'UNDER_PRESSURE' | 'DEGRADED' | 'RECOVERING';
}

export interface SpeciesSighting {
  id: string;
  sightingNo: string;        // e.g. "FDA-SIT-2026-001"
  protectedAreaId: string;
  protectedAreaName: string;
  county: LiberiaCounty;
  sightingDate: string;
  species: string;
  conservationStatus: 'CRITICALLY_ENDANGERED' | 'ENDANGERED' | 'VULNERABLE' | 'NEAR_THREATENED' | 'LEAST_CONCERN';
  individualCount: number;
  gpsLat: number;
  gpsLon: number;
  recordedBy: string;        // Ranger name
  method: 'DIRECT_OBSERVATION' | 'CAMERA_TRAP' | 'ACOUSTIC_SURVEY' | 'TRACK_SIGN';
  threatObserved: boolean;
  notes: string;
}

// ==================== 12. GRANT & DONOR MANAGEMENT ====================
export interface DonorGrant {
  id: string;
  grantRef: string;          // e.g. "USAID-FDA-2026-LIB-001"
  donorName: string;         // e.g. "USAID", "World Bank", "EU", "GEF"
  grantTitle: string;
  projectCode: string;
  totalAmountUSD: number;
  disbursedToDateUSD: number;
  spentToDateUSD: number;
  startDate: string;
  endDate: string;
  focalArea: 'CONSERVATION' | 'CAPACITY_BUILDING' | 'GOVERNANCE' | 'COMMUNITY_FORESTRY' | 'BIODIVERSITY' | 'CLIMATE_RESILIENCE';
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'PIPELINE';
  grantOfficer: string;
  nextReportDue: string;
  conditions: string[];      // Key compliance conditions
  implementingPartners?: string[];
}

export interface GrantDisbursement {
  id: string;
  disbursementNo: string;    // e.g. "DISB-2026-001"
  grantId: string;
  grantRef: string;
  donorName: string;
  amountUSD: number;
  disbursementDate: string;
  period: string;            // e.g. "Q2 FY2026"
  bankRef: string;
  purpose: string;
  status: 'RECEIVED' | 'ALLOCATED' | 'SPENT';
  milestoneAchieved?: string;
}

// ==================== 13. IN-APP NOTIFICATIONS ====================
export interface AppNotification {
  id: string;
  createdAt: string;
  type:
    | 'LEAVE_APPROVED'
    | 'LEAVE_REJECTED'
    | 'VOUCHER_AWAITING_APPROVAL'
    | 'VOUCHER_APPROVED'
    | 'TRAINING_ASSIGNED'
    | 'TRAINING_DUE'
    | 'INCIDENT_ESCALATED'
    | 'GRANT_REPORT_DUE'
    | 'ROYALTY_OVERDUE'
    | 'CASE_UPDATE'
    | 'ASSET_TRANSFER';
  title: string;
  message: string;
  targetRoles: UserRole[];   // Which roles should see this notification
  isRead: boolean;
  linkModule?: string;       // Which module to navigate to on click
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

// ==================== PrintModal payload ====================
export type PrintModalPayload =
  | { type: 'PAY_SLIP'; data: PayrollRecord }
  | { type: 'LEAVE_CERTIFICATE'; data: LeaveRequest }
  | { type: 'PAYMENT_VOUCHER'; data: PaymentVoucher }
  | { type: 'PURCHASE_ORDER'; data: PurchaseOrder }
  | { type: 'ASSET_TAG'; data: FixedAsset }
  | { type: 'TRAINING_CERTIFICATE'; data: EmployeeTrainingEnrollment }
  | { type: 'ROYALTY_INVOICE'; data: RoyaltyInvoice }
  | { type: 'LEGAL_CASE_REPORT'; data: LegalCase };
