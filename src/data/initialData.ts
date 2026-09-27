import {
  Employee,
  LeaveRequest,
  PayrollRecord,
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
  UserPersona,
  BidderClarificationQuery,
  PublicTenderNotice
} from '../types';

export const USER_PERSONAS: Record<string, UserPersona> = {
  MANAGING_DIRECTOR: {
    role: 'MANAGING_DIRECTOR',
    name: 'Hon. Rudolph J. Merab, Sr.',
    title: 'Managing Director & CEO',
    department: 'Executive Office',
    county: 'Montserrado',
    badge: 'Executive Authorization & MD Sign-Off'
  },
  FINANCE_DIRECTOR: {
    role: 'FINANCE_DIRECTOR',
    name: 'J. Varney Kpaiseh',
    title: 'Director of Finance & Budget',
    department: 'Finance & Administration',
    county: 'Montserrado',
    badge: 'Vote Book & Payment Voucher Review'
  },
  HR_DIRECTOR: {
    role: 'HR_DIRECTOR',
    name: 'Helena S. Gbotoe',
    title: 'Director of Human Resources',
    department: 'Human Resources & Administration',
    county: 'Montserrado',
    badge: 'CSA Biometrics & Payroll Processing'
  },
  PROCUREMENT_OFFICER: {
    role: 'PROCUREMENT_OFFICER',
    name: 'Wynn Bryant',
    title: 'Chief Procurement Specialist',
    department: 'Procurement Department',
    county: 'Montserrado',
    badge: 'PPCC Compliance & 3-Way Match'
  },
  ASSET_OFFICER: {
    role: 'ASSET_OFFICER',
    name: 'Moses K. Tamba',
    title: 'Chief Asset & Logistics Officer',
    department: 'Logistics & Depot Operations',
    county: 'Montserrado',
    badge: 'Fixed Asset Register & Barcoding'
  },
  COUNTY_OFFICER: {
    role: 'COUNTY_OFFICER',
    name: 'Capt. Emmanuel D. Toe',
    title: 'County Forestry Officer & Ranger Chief',
    department: 'Commercial & Conservation Forestry',
    county: 'Nimba',
    badge: 'Field Operations & Offline Sync'
  },
  INTERNAL_AUDITOR: {
    role: 'INTERNAL_AUDITOR',
    name: 'Fatu M. Sirleaf',
    title: 'Director of Internal Audit',
    department: 'Office of Internal Audit',
    county: 'Montserrado',
    badge: 'Audit Trail & SoD Enforcement'
  }
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001',
    empNo: 'FDA/DIR/001',
    fullName: 'Hon. Rudolph J. Merab, Sr.',
    email: 'r.merab@fda.gov.lr',
    phone: '+231 776 063 643',
    department: 'Executive Office',
    position: 'Managing Director & CEO',
    county: 'Montserrado',
    dutyStation: 'Whein Town HQ - Bernard Farm',
    gradeBand: 'Cabinet Executive Level 1',
    biometricId: 'BIO-MON-00194',
    cadre: 'CIVIL_SERVICE',
    salaryUSD: 4500,
    salaryLRD: 877500,
    hazardPayUSD: 0,
    fieldAllowanceUSD: 0,
    dateEmployed: '2024-02-15',
    dateOfBirth: '1968-05-14',
    bankName: 'Central Bank of Liberia (CBL)',
    accountNumber: '001-010-882194',
    csaSyncStatus: 'SYNCED',
    status: 'ACTIVE',
    stationHistory: [
      {
        id: 'TRS-01',
        fromStation: 'Forestry Advisory Directorate',
        toStation: 'Whein Town HQ - Bernard Farm',
        fromCounty: 'Montserrado',
        toCounty: 'Montserrado',
        transferDate: '2024-02-15',
        authorizedBy: 'Office of the President (GoL)',
        reason: 'Executive Presidential Appointment as Managing Director & CEO'
      }
    ],
    promotions: [
      {
        id: 'PRM-01',
        effectiveDate: '2024-02-15',
        previousPosition: 'Senior Forestry Advisor',
        newPosition: 'Managing Director & CEO',
        previousGrade: 'Professional Band P4',
        newGrade: 'Cabinet Executive Level 1',
        previousSalaryUSD: 3500,
        newSalaryUSD: 4500
      }
    ],
    disciplinaryRecords: []
  },
  {
    id: 'EMP-002',
    empNo: 'FDA/FIN/014',
    fullName: 'J. Varney Kpaiseh',
    email: 'v.kpaiseh@yahoo.com',
    phone: '+231 886 551 249',
    department: 'Finance & Administration',
    position: 'Director of Finance',
    county: 'Montserrado',
    dutyStation: 'Whein Town HQ - Bernard Farm',
    gradeBand: 'Professional Band P4',
    biometricId: 'BIO-MON-00210',
    cadre: 'CIVIL_SERVICE',
    salaryUSD: 3200,
    salaryLRD: 624000,
    hazardPayUSD: 0,
    fieldAllowanceUSD: 0,
    dateEmployed: '2020-06-10',
    dateOfBirth: '1975-08-22',
    bankName: 'Liberian Bank for Development & Investment (LBDI)',
    accountNumber: '102-441-903210',
    csaSyncStatus: 'SYNCED',
    status: 'ACTIVE',
    stationHistory: [],
    promotions: [
      {
        id: 'PRM-02',
        effectiveDate: '2022-07-01',
        previousPosition: 'Chief Accountant',
        newPosition: 'Director of Finance & Budget',
        previousGrade: 'Professional Band P3',
        newGrade: 'Professional Band P4',
        previousSalaryUSD: 2600,
        newSalaryUSD: 3200
      }
    ],
    disciplinaryRecords: []
  },
  {
    id: 'EMP-003',
    empNo: 'FDA/PRO/008',
    fullName: 'Wynn Bryant',
    email: 'wynnbryant12@gmail.com',
    phone: '+231 776 063 643',
    department: 'Procurement Department',
    position: 'Head of Procurement',
    county: 'Montserrado',
    dutyStation: 'Whein Town HQ - Bernard Farm',
    gradeBand: 'Professional Band P3',
    biometricId: 'BIO-MON-00355',
    cadre: 'CIVIL_SERVICE',
    salaryUSD: 2400,
    salaryLRD: 468000,
    hazardPayUSD: 0,
    fieldAllowanceUSD: 0,
    dateEmployed: '2021-03-01',
    dateOfBirth: '1982-11-19',
    bankName: 'Ecobank Liberia Limited',
    accountNumber: '028-119-440355',
    csaSyncStatus: 'SYNCED',
    status: 'ACTIVE',
    stationHistory: [],
    promotions: [],
    disciplinaryRecords: []
  },
  {
    id: 'EMP-004',
    empNo: 'FDA/RNG/102',
    fullName: 'Capt. Emmanuel D. Toe',
    email: 'e.toe@fda.gov.lr',
    phone: '+231 886 441 902',
    department: 'Conservation & Wildlife',
    position: 'Chief Ranger - East Nimba Nature Reserve',
    county: 'Nimba',
    dutyStation: 'Sanniquellie Field Station',
    gradeBand: 'Technical Cadre T3',
    biometricId: 'BIO-NIM-00812',
    cadre: 'FIELD_RANGER',
    salaryUSD: 1400,
    salaryLRD: 273000,
    hazardPayUSD: 350,
    fieldAllowanceUSD: 200,
    dateEmployed: '2019-11-12',
    dateOfBirth: '1979-03-15',
    bankName: 'Liberian Bank for Development & Investment (LBDI)',
    accountNumber: '102-772-008129',
    csaSyncStatus: 'SYNCED',
    status: 'ACTIVE',
    stationHistory: [
      {
        id: 'TRS-02',
        fromStation: 'Sapo National Park Sector HQ',
        toStation: 'East Nimba Nature Reserve Station',
        fromCounty: 'Sinoe',
        toCounty: 'Nimba',
        transferDate: '2022-09-15',
        authorizedBy: 'Helena S. Gbotoe (HR Director)',
        reason: 'Rotational deployment for transboundary conservation enforcement & wildlife corridor protection'
      }
    ],
    promotions: [
      {
        id: 'PRM-03',
        effectiveDate: '2023-01-10',
        previousPosition: 'Senior Ranger Inspector',
        newPosition: 'Chief Ranger - East Nimba Nature Reserve',
        previousGrade: 'Technical Cadre T2',
        newGrade: 'Technical Cadre T3',
        previousSalaryUSD: 1100,
        newSalaryUSD: 1400
      }
    ],
    disciplinaryRecords: []
  },
  {
    id: 'EMP-005',
    empNo: 'EMP-SINOE-044',
    fullName: 'Grace Nyenpan',
    email: 'g.nyenpan@fda.gov.lr',
    phone: '+231 770 192 384',
    department: 'Commercial Forestry',
    position: 'Senior Concession Monitoring Officer',
    county: 'Sinoe',
    dutyStation: 'Greenville Regional Hub - Sapo Sector',
    gradeBand: 'Professional Band P2',
    biometricId: 'BIO-SIN-00412',
    cadre: 'FDA_PERMANENT',
    salaryUSD: 1650,
    salaryLRD: 321750,
    hazardPayUSD: 200,
    fieldAllowanceUSD: 150,
    dateEmployed: '2022-04-18',
    dateOfBirth: '1986-07-29',
    bankName: 'Ecobank Liberia Limited',
    accountNumber: '028-554-192384',
    csaSyncStatus: 'SYNCED',
    status: 'ACTIVE',
    stationHistory: [
      {
        id: 'TRS-03',
        fromStation: 'Whein Town HQ Monrovia',
        toStation: 'Greenville Regional Hub - Sapo Sector',
        fromCounty: 'Montserrado',
        toCounty: 'Sinoe',
        transferDate: '2023-03-01',
        authorizedBy: 'Helena S. Gbotoe (HR Director)',
        reason: 'Field deployment for commercial timber concession audit & chain-of-custody oversight'
      }
    ],
    promotions: [
      {
        id: 'PRM-04',
        effectiveDate: '2024-01-15',
        previousPosition: 'Concession Monitoring Analyst',
        newPosition: 'Senior Concession Monitoring Officer',
        previousGrade: 'Professional Band P1',
        newGrade: 'Professional Band P2',
        previousSalaryUSD: 1300,
        newSalaryUSD: 1650
      }
    ],
    disciplinaryRecords: []
  },
  {
    id: 'EMP-006',
    empNo: 'EMP-LOFA-089',
    fullName: 'Korpo Kollie',
    email: 'k.kollie@fda.gov.lr',
    phone: '+231 886 903 118',
    department: 'Community Forestry',
    position: 'Community Forestry Extension Agent',
    county: 'Lofa',
    dutyStation: 'Voinjama Depot Outpost',
    gradeBand: 'Technical Cadre T2',
    biometricId: 'BIO-LOF-00109',
    cadre: 'CIVIL_SERVICE',
    salaryUSD: 1100,
    salaryLRD: 214500,
    hazardPayUSD: 150,
    fieldAllowanceUSD: 150,
    dateEmployed: '2023-01-15',
    dateOfBirth: '1991-10-04',
    bankName: 'Guaranty Trust Bank (Liberia) Ltd',
    accountNumber: '204-883-903118',
    csaSyncStatus: 'SYNCED',
    status: 'ACTIVE',
    stationHistory: [
      {
        id: 'TRS-04',
        fromStation: 'Gbarpolu Forest Station',
        toStation: 'Voinjama Depot Outpost',
        fromCounty: 'Gbarpolu',
        toCounty: 'Lofa',
        transferDate: '2023-08-01',
        authorizedBy: 'Helena S. Gbotoe (HR Director)',
        reason: 'Community forestry extension and customary rights stakeholder reinforcement'
      }
    ],
    promotions: [],
    disciplinaryRecords: []
  },
  {
    id: 'EMP-007',
    empNo: 'EMP-BASSA-021',
    fullName: 'Darius B. Wheagar',
    email: 'd.wheagar@fda.gov.lr',
    phone: '+231 777 449 812',
    department: 'Law Enforcement & Checkpoints',
    position: 'Timber Export Port Inspector',
    county: 'Grand Bassa',
    dutyStation: 'Port of Buchanan FDA Control Point',
    gradeBand: 'Technical Cadre T3',
    biometricId: 'BIO-BAS-00551',
    cadre: 'FDA_PERMANENT',
    salaryUSD: 1350,
    salaryLRD: 263250,
    hazardPayUSD: 250,
    fieldAllowanceUSD: 100,
    dateEmployed: '2018-09-01',
    dateOfBirth: '1963-04-18', // Age 63: 2 years remaining to statutory retirement threshold of 65
    bankName: 'Liberian Bank for Development & Investment (LBDI)',
    accountNumber: '102-339-449812',
    csaSyncStatus: 'SYNCED',
    status: 'ACTIVE',
    stationHistory: [
      {
        id: 'TRS-05',
        fromStation: 'Freeport of Monrovia FDA Post',
        toStation: 'Port of Buchanan FDA Control Point',
        fromCounty: 'Montserrado',
        toCounty: 'Grand Bassa',
        transferDate: '2020-05-10',
        authorizedBy: 'Helena S. Gbotoe (HR Director)',
        reason: 'Port timber export chain-of-custody oversight & log container barcode verification'
      }
    ],
    promotions: [],
    disciplinaryRecords: [
      {
        id: 'DISC-01',
        date: '2021-08-14',
        incidentType: 'Delayed Export Log Tagging',
        description: 'Administrative query issued for late log reconciliation during bulk vessel loading.',
        actionTaken: 'Written Warning & Compliance Counseling (Resolved)',
        resolved: true
      }
    ]
  }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'LV-2026-082',
    employeeId: 'EMP-007',
    employeeName: 'Darius B. Wheagar',
    department: 'Law Enforcement & Checkpoints',
    dutyStation: 'Port of Buchanan FDA Control Point',
    county: 'Grand Bassa',
    leaveType: 'OFFICIAL_DUTY',
    startDate: '2026-10-02',
    endDate: '2026-10-06',
    days: 4,
    reason: 'SGS LiberTrace log export barcode scanner calibration and technical port inspector training.',
    status: 'PENDING_SUPERVISOR',
    appliedDate: '2026-09-26'
  },
  {
    id: 'LV-2026-081',
    employeeId: 'EMP-004',
    employeeName: 'Capt. Emmanuel D. Toe',
    department: 'Conservation & Wildlife',
    dutyStation: 'Sanniquellie Field Station / Mount Nimba',
    county: 'Nimba',
    leaveType: 'PATROL_COMPENSATORY',
    startDate: '2026-10-05',
    endDate: '2026-10-12',
    days: 7,
    reason: 'Compensatory rest after 30-day extended border patrol at Mount Nimba strict reserve.',
    status: 'PENDING_HR',
    appliedDate: '2026-09-24',
    supervisorEndorsedBy: 'Capt. Emmanuel D. Toe (County Forestry Officer)',
    supervisorEndorsedDate: '2026-09-25'
  },
  {
    id: 'LV-2026-079',
    employeeId: 'EMP-005',
    employeeName: 'Grace Nyenpan',
    department: 'Commercial Forestry',
    dutyStation: 'Greenville Regional Hub - Sapo Sector',
    county: 'Sinoe',
    leaveType: 'ANNUAL',
    startDate: '2026-10-15',
    endDate: '2026-10-25',
    days: 10,
    reason: 'Statutory annual leave entitlement after 12 months concession monitoring.',
    status: 'APPROVED',
    appliedDate: '2026-09-18',
    supervisorEndorsedBy: 'J. Varney Kpaiseh (Finance & Admin Director)',
    supervisorEndorsedDate: '2026-09-19',
    approvedBy: 'Helena S. Gbotoe (Director of Human Resources)',
    approvedDate: '2026-09-20',
    certificateNo: 'FDA-CERT-LV-2026-079'
  },
  {
    id: 'LV-2026-080',
    employeeId: 'EMP-006',
    employeeName: 'Korpo Kollie',
    department: 'Community Forestry',
    dutyStation: 'Voinjama Depot Outpost',
    county: 'Lofa',
    leaveType: 'SICK',
    startDate: '2026-09-21',
    endDate: '2026-09-24',
    days: 3,
    reason: 'Medical recuperation with certified clinical note from Tellewoyan Memorial Hospital.',
    status: 'APPROVED',
    appliedDate: '2026-09-20',
    supervisorEndorsedBy: 'Helena S. Gbotoe (Director of Human Resources)',
    supervisorEndorsedDate: '2026-09-20',
    approvedBy: 'Helena S. Gbotoe (Director of Human Resources)',
    approvedDate: '2026-09-21',
    certificateNo: 'FDA-CERT-LV-2026-080'
  }
];

export const INITIAL_FIELD_ATTENDANCE_LOGS: FieldAttendanceLog[] = [
  {
    id: 'ATT-2026-09-001',
    employeeId: 'EMP-004',
    employeeName: 'Capt. Emmanuel D. Toe',
    position: 'Chief Ranger - East Nimba Nature Reserve',
    county: 'Nimba',
    dutyStation: 'Sanniquellie Field Station / Mount Nimba',
    timestamp: '2026-09-27T06:14:22Z',
    type: 'GPS_MOBILE_CHECKIN',
    gpsCoordinates: {
      latitude: 7.5321,
      longitude: -8.5302,
      accuracyMeters: 4.2
    },
    geoFenceStatus: 'INSIDE_PROTECTED_AREA',
    status: 'PRESENT'
  },
  {
    id: 'ATT-2026-09-002',
    employeeId: 'EMP-005',
    employeeName: 'Grace Nyenpan',
    position: 'Senior Concession Monitoring Officer',
    county: 'Sinoe',
    dutyStation: 'Greenville Regional Hub - Sapo Sector',
    timestamp: '2026-09-27T06:45:11Z',
    type: 'GPS_MOBILE_CHECKIN',
    gpsCoordinates: {
      latitude: 5.3421,
      longitude: -8.6214,
      accuracyMeters: 5.8
    },
    geoFenceStatus: 'INSIDE_PROTECTED_AREA',
    status: 'PRESENT'
  },
  {
    id: 'ATT-2026-09-003',
    employeeId: 'EMP-007',
    employeeName: 'Darius B. Wheagar',
    position: 'Timber Export Port Inspector',
    county: 'Grand Bassa',
    dutyStation: 'Port of Buchanan FDA Control Point',
    timestamp: '2026-09-27T07:02:45Z',
    type: 'BIOMETRIC_TERMINAL',
    terminalId: 'ZKT-BAS-PORT-02',
    geoFenceStatus: 'VERIFIED',
    status: 'PRESENT'
  },
  {
    id: 'ATT-2026-09-004',
    employeeId: 'EMP-001',
    employeeName: 'Hon. Rudolph J. Merab, Sr.',
    position: 'Managing Director & CEO',
    county: 'Montserrado',
    dutyStation: 'Whein Town HQ - Bernard Farm',
    timestamp: '2026-09-27T07:28:10Z',
    type: 'BIOMETRIC_TERMINAL',
    terminalId: 'ZKT-MON-HQ-MAIN-01',
    geoFenceStatus: 'VERIFIED',
    status: 'PRESENT'
  },
  {
    id: 'ATT-2026-09-005',
    employeeId: 'EMP-006',
    employeeName: 'Korpo Kollie',
    position: 'Community Forestry Extension Agent',
    county: 'Lofa',
    dutyStation: 'Voinjama Depot Outpost',
    timestamp: '2026-09-27T07:35:00Z',
    type: 'GPS_MOBILE_CHECKIN',
    gpsCoordinates: {
      latitude: 8.4219,
      longitude: -9.7483,
      accuracyMeters: 6.1
    },
    geoFenceStatus: 'INSIDE_PROTECTED_AREA',
    status: 'PRESENT'
  }
];

export const INITIAL_PAYROLL_RECORDS: PayrollRecord[] = [
  {
    id: 'PAY-2026-09-01',
    period: 'September 2026',
    employeeId: 'EMP-001',
    employeeName: 'Hon. Rudolph J. Merab, Sr.',
    bankName: 'Central Bank of Liberia (CBL)',
    accountNumber: '001-010-882194',
    baseSalaryUSD: 4500,
    hazardPayUSD: 0,
    fieldAllowanceUSD: 0,
    grossUSD: 4500,
    grossLRD: 877500,
    taxWithheldUSD: 900,
    nasscorpUSD: 180,
    netPayUSD: 3420,
    netPayLRD: 666900,
    csaApprovalRef: 'CSA/AUDIT/2026/09-0194',
    status: 'VERIFIED',
    paymentDate: '2026-09-30'
  },
  {
    id: 'PAY-2026-09-02',
    period: 'September 2026',
    employeeId: 'EMP-002',
    employeeName: 'J. Varney Kpaiseh',
    bankName: 'Liberian Bank for Development & Investment (LBDI)',
    accountNumber: '102-441-903210',
    baseSalaryUSD: 3200,
    hazardPayUSD: 0,
    fieldAllowanceUSD: 0,
    grossUSD: 3200,
    grossLRD: 624000,
    taxWithheldUSD: 640,
    nasscorpUSD: 128,
    netPayUSD: 2432,
    netPayLRD: 474240,
    csaApprovalRef: 'CSA/AUDIT/2026/09-0210',
    status: 'VERIFIED',
    paymentDate: '2026-09-30'
  },
  {
    id: 'PAY-2026-09-03',
    period: 'September 2026',
    employeeId: 'EMP-003',
    employeeName: 'Wynn Bryant',
    bankName: 'Ecobank Liberia Limited',
    accountNumber: '028-119-440355',
    baseSalaryUSD: 2400,
    hazardPayUSD: 0,
    fieldAllowanceUSD: 0,
    grossUSD: 2400,
    grossLRD: 468000,
    taxWithheldUSD: 480,
    nasscorpUSD: 96,
    netPayUSD: 1824,
    netPayLRD: 355680,
    csaApprovalRef: 'CSA/AUDIT/2026/09-0355',
    status: 'VERIFIED',
    paymentDate: '2026-09-30'
  },
  {
    id: 'PAY-2026-09-04',
    period: 'September 2026',
    employeeId: 'EMP-004',
    employeeName: 'Capt. Emmanuel D. Toe',
    bankName: 'Liberian Bank for Development & Investment (LBDI)',
    accountNumber: '102-772-008129',
    baseSalaryUSD: 1400,
    hazardPayUSD: 350,
    fieldAllowanceUSD: 200,
    grossUSD: 1950,
    grossLRD: 380250,
    taxWithheldUSD: 390,
    nasscorpUSD: 78,
    netPayUSD: 1482,
    netPayLRD: 288990,
    csaApprovalRef: 'CSA/AUDIT/2026/09-0812',
    status: 'VERIFIED',
    paymentDate: '2026-09-30'
  },
  {
    id: 'PAY-2026-09-05',
    period: 'September 2026',
    employeeId: 'EMP-005',
    employeeName: 'Grace Nyenpan',
    bankName: 'Ecobank Liberia Limited',
    accountNumber: '028-554-192384',
    baseSalaryUSD: 1650,
    hazardPayUSD: 200,
    fieldAllowanceUSD: 150,
    grossUSD: 2000,
    grossLRD: 390000,
    taxWithheldUSD: 400,
    nasscorpUSD: 80,
    netPayUSD: 1520,
    netPayLRD: 296400,
    csaApprovalRef: 'CSA/AUDIT/2026/09-0412',
    status: 'VERIFIED',
    paymentDate: '2026-09-30'
  }
];

export const INITIAL_BUDGET_VOTES: BudgetVoteCode[] = [
  {
    id: 'VOTE-01',
    code: '211101 - Personnel Basic Salaries',
    title: 'FDA HQ & Field Staff Core Payroll',
    category: 'PERSONNEL',
    annualAllotmentUSD: 2850000,
    committedUSD: 1950000,
    actualSpentUSD: 1890000,
    availableUSD: 900000
  },
  {
    id: 'VOTE-02',
    code: '221402 - Forest Law Enforcement & Ranger Patrol Logistics',
    title: 'Fuel, Field Equipment & Depots Patrol Support',
    category: 'OPERATIONS',
    annualAllotmentUSD: 750000,
    committedUSD: 480000,
    actualSpentUSD: 420000,
    availableUSD: 270000
  },
  {
    id: 'VOTE-03',
    code: '221503 - Timber Legality & Concession Monitoring',
    title: 'SGS LiberTrace verification, Field Audits & Scaling',
    category: 'OPERATIONS',
    annualAllotmentUSD: 520000,
    committedUSD: 310000,
    actualSpentUSD: 295000,
    availableUSD: 210000
  },
  {
    id: 'VOTE-04',
    code: '311102 - Capital Equipment & Depots Modernization',
    title: 'Patrol Pickups, Solar Inverters, GPS Tracking & Drones',
    category: 'CAPITAL',
    annualAllotmentUSD: 980000,
    committedUSD: 620000,
    actualSpentUSD: 550000,
    availableUSD: 360000
  },
  {
    id: 'VOTE-05',
    code: '222109 - Protected Areas & Biodiversity Conservation',
    title: 'Sapo National Park & Gola Rainforest Transboundary Reserves',
    category: 'CONSERVATION',
    annualAllotmentUSD: 640000,
    committedUSD: 390000,
    actualSpentUSD: 360000,
    availableUSD: 250000
  }
];

export const INITIAL_PAYMENT_VOUCHERS: PaymentVoucher[] = [
  {
    id: 'PV-2026-0041',
    voucherNo: 'FDA/PV/2026/09/041',
    payee: 'TotalEnergies Liberia Inc.',
    description: 'Fuel allocation for FDA Regional Patrol Fleet (Nimba, Sinoe, Grand Bassa, Lofa)',
    voteCode: '221402 - Forest Law Enforcement & Ranger Patrol Logistics',
    amountUSD: 18500,
    amountLRD: 3607500,
    currency: 'USD',
    paymentMethod: 'CHECK',
    status: 'MD_AUTHORIZED',
    initiator: 'Moses K. Tamba (Logistics)',
    dateCreated: '2026-09-22',
    authorizedBy: 'Hon. Rudolph J. Merab, Sr.',
    checkNumber: 'CK-CBL-884920',
    ifmisCommitmentNo: 'IFMIS-MFDP-2026-7781'
  },
  {
    id: 'PV-2026-0042',
    voucherNo: 'FDA/PV/2026/09/042',
    payee: 'Starlink Global Broadband',
    description: 'Quarterly satellite connectivity subscription for 12 Remote County Depots',
    voteCode: '311102 - Capital Equipment & Depots Modernization',
    amountUSD: 5400,
    amountLRD: 1053000,
    currency: 'USD',
    paymentMethod: 'BANK_TRANSFER',
    status: 'FINANCE_APPROVED',
    initiator: 'J. Varney Kpaiseh (Finance)',
    dateCreated: '2026-09-25'
  },
  {
    id: 'PV-2026-0043',
    voucherNo: 'FDA/PV/2026/09/043',
    payee: 'West Africa Agro-Forestry Equipment Ltd.',
    description: 'Delivery of 50 Garmin inReach GPS transceivers for forest rangers',
    voteCode: '311102 - Capital Equipment & Depots Modernization',
    amountUSD: 24500,
    amountLRD: 4777500,
    currency: 'USD',
    paymentMethod: 'BANK_TRANSFER',
    status: 'AUDIT_REVIEW',
    initiator: 'Wynn Bryant (Procurement)',
    dateCreated: '2026-09-26'
  }
];

export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'BANK-01',
    bankName: 'Central Bank of Liberia (CBL)',
    accountNumber: 'CBL-02-1004-99820-01',
    accountType: 'OPERATING',
    currency: 'USD',
    balance: 1420580.45,
    lastReconciled: '2026-09-25'
  },
  {
    id: 'BANK-02',
    bankName: 'Central Bank of Liberia (CBL)',
    accountNumber: 'CBL-02-1004-99820-02',
    accountType: 'OPERATING',
    currency: 'LRD',
    balance: 84250300.00,
    lastReconciled: '2026-09-25'
  },
  {
    id: 'BANK-03',
    bankName: 'Liberian Bank for Development & Investment (LBDI)',
    accountNumber: 'LBDI-102-449-001',
    accountType: 'REVENUE_COLLECTION',
    currency: 'USD',
    balance: 894320.10,
    lastReconciled: '2026-09-24'
  },
  {
    id: 'BANK-04',
    bankName: 'Ecobank Liberia Limited',
    accountNumber: 'ECO-552-300-881',
    accountType: 'DONOR_PROJECT',
    currency: 'USD',
    balance: 610000.00,
    lastReconciled: '2026-09-26'
  }
];

export const INITIAL_PROCUREMENT_REQS: ProcurementRequisition[] = [
  {
    id: 'PR-2026-018',
    prNo: 'FDA/PR/2026/018',
    title: 'Procurement of 4 Heavy-Duty 4x4 Field Patrol Pickups for County Depots',
    department: 'Commercial & Conservation Forestry',
    estimatedBudgetUSD: 190000,
    ppccMethod: 'NATIONAL_COMPETITIVE_BIDDING',
    quarter: 'Q3',
    status: 'PPCC_APPROVED',
    requestDate: '2026-08-15'
  },
  {
    id: 'PR-2026-022',
    prNo: 'FDA/PR/2026/022',
    title: 'Supply of High-Resolution GPS Navigation Units & Acoustic Chainsaw Detectors',
    department: 'Law Enforcement & Wildlife Division',
    estimatedBudgetUSD: 45000,
    ppccMethod: 'REQUEST_FOR_QUOTATION',
    quarter: 'Q3',
    status: 'TENDER_ISSUED',
    requestDate: '2026-09-02'
  },
  {
    id: 'PR-2026-025',
    prNo: 'FDA/PR/2026/025',
    title: 'Integrated MIS / ERP System Development (Consulting Services)',
    department: 'Administration & Finance / IT Directorate',
    estimatedBudgetUSD: 180000,
    ppccMethod: 'NATIONAL_COMPETITIVE_BIDDING',
    quarter: 'Q3',
    status: 'TENDER_ISSUED',
    requestDate: '2026-09-10'
  }
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'VEN-001',
    name: 'CFAO Motors Liberia Ltd.',
    businessRegNo: 'LBR-MOT-2018-0914',
    lraTaxClearanceNo: 'LRA-TC-2026-88192',
    taxClearanceExpiry: '2026-12-31',
    ppccRegId: 'PPCC-VEND-1102',
    category: 'VEHICLES_EQUIPMENT',
    rating: 4.8,
    contactPerson: 'Kolie Kollie',
    phone: '+231 777 555 120',
    status: 'VERIFIED'
  },
  {
    id: 'VEN-002',
    name: 'West Africa GeoSpatial & Forestry Solutions Ltd.',
    businessRegNo: 'LBR-IT-2020-4491',
    lraTaxClearanceNo: 'LRA-TC-2026-71822',
    taxClearanceExpiry: '2026-11-30',
    ppccRegId: 'PPCC-VEND-3409',
    category: 'FORESTRY_SUPPLIES',
    rating: 4.6,
    contactPerson: 'Sando Freeman',
    phone: '+231 886 220 901',
    status: 'VERIFIED'
  },
  {
    id: 'VEN-003',
    name: 'Monrovia Modern Stationery & Technology Corp.',
    businessRegNo: 'LBR-STA-2015-0021',
    lraTaxClearanceNo: 'LRA-TC-2026-40192',
    taxClearanceExpiry: '2026-10-15',
    ppccRegId: 'PPCC-VEND-0891',
    category: 'IT_SOFTWARE',
    rating: 4.2,
    contactPerson: 'Mariama Conteh',
    phone: '+231 770 412 888',
    status: 'VERIFIED'
  }
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-2026-009',
    poNumber: 'FDA/PO/2026/009',
    prNo: 'FDA/PR/2026/018',
    vendorId: 'VEN-001',
    vendorName: 'CFAO Motors Liberia Ltd.',
    description: 'Supply of 2 Toyota Hilux 4x4 Double-Cab Vehicles customized with FDA Ranger green livery and winches',
    totalUSD: 94000,
    issueDate: '2026-09-01',
    expectedDelivery: '2026-10-10',
    status: 'ISSUED',
    threeWayMatch: {
      prMatched: true,
      poMatched: true,
      grnMatched: false,
      invoiceMatched: false,
      status: 'PENDING'
    }
  },
  {
    id: 'PO-2026-008',
    poNumber: 'FDA/PO/2026/008',
    prNo: 'FDA/PR/2026/022',
    vendorId: 'VEN-002',
    vendorName: 'West Africa GeoSpatial & Forestry Solutions Ltd.',
    description: '30 units Garmin GPSMAP 66i Handheld Satellite Communicators + Ranger Protective Holsters',
    totalUSD: 17850,
    issueDate: '2026-09-05',
    expectedDelivery: '2026-09-20',
    status: 'GOODS_RECEIVED',
    threeWayMatch: {
      prMatched: true,
      poMatched: true,
      grnMatched: true,
      invoiceMatched: true,
      status: 'VERIFIED'
    }
  }
];

export const INITIAL_FIXED_ASSETS: FixedAsset[] = [
  {
    id: 'AST-001',
    assetTag: 'FDA-VEH-2024-001',
    barcode: '79201948201',
    name: 'Toyota Land Cruiser Prado VX (Official Executive Vehicle)',
    category: 'VEHICLES',
    serialNumber: 'VIN-JTEBX29J8K50192',
    purchaseDate: '2024-03-10',
    purchaseCostUSD: 72000,
    usefulLifeYears: 5,
    salvageValueUSD: 12000,
    currentBookValueUSD: 42000,
    location: 'Whein Town HQ - Bernard Farm',
    assignedStaff: 'Hon. Rudolph J. Merab, Sr.',
    condition: 'OPERATIONAL'
  },
  {
    id: 'AST-002',
    assetTag: 'FDA-VEH-2025-014',
    barcode: '79201948214',
    name: 'Toyota Land Cruiser HZJ79 4x4 Heavy Duty Patrol Pickup',
    category: 'VEHICLES',
    serialNumber: 'VIN-JTE79K009218',
    purchaseDate: '2025-01-20',
    purchaseCostUSD: 58000,
    usefulLifeYears: 6,
    salvageValueUSD: 8000,
    currentBookValueUSD: 44600,
    location: 'Sanniquellie Field Office - Nimba',
    assignedStaff: 'Capt. Emmanuel D. Toe',
    condition: 'OPERATIONAL'
  },
  {
    id: 'AST-003',
    assetTag: 'FDA-GPS-2025-088',
    barcode: '79201948288',
    name: 'Garmin GPSMAP 66i Satellite Communicator & Topo Scanner',
    category: 'FIELD_EQUIPMENT',
    serialNumber: 'SN-GRM66-99210',
    purchaseDate: '2025-05-15',
    purchaseCostUSD: 650,
    usefulLifeYears: 3,
    salvageValueUSD: 50,
    currentBookValueUSD: 420,
    location: 'Greenville Regional Hub - Sinoe',
    assignedStaff: 'Grace Nyenpan',
    condition: 'OPERATIONAL'
  },
  {
    id: 'AST-004',
    assetTag: 'FDA-PWR-2024-005',
    barcode: '79201948305',
    name: 'Victron 10kVA Off-Grid Solar & Battery Storage Array',
    category: 'HEAVY_MACHINERY',
    serialNumber: 'SN-VIC-INV-88219',
    purchaseDate: '2024-08-01',
    purchaseCostUSD: 24000,
    usefulLifeYears: 8,
    salvageValueUSD: 2000,
    currentBookValueUSD: 18500,
    location: 'Sapo National Park Remote HQ - Jalay’s Town',
    assignedStaff: 'Sapo Ranger Command',
    condition: 'OPERATIONAL'
  },
  {
    id: 'AST-005',
    assetTag: 'FDA-IT-2025-032',
    barcode: '79201948332',
    name: 'Dell PowerEdge R750 Enterprise Server (IFMIS/MIS Local Replica)',
    category: 'IT_HARDWARE',
    serialNumber: 'ST-DELL-882001-LR',
    purchaseDate: '2025-02-10',
    purchaseCostUSD: 14500,
    usefulLifeYears: 4,
    salvageValueUSD: 1500,
    currentBookValueUSD: 9800,
    location: 'Whein Town HQ - Bernard Farm Server Room',
    assignedStaff: 'IT Directorate',
    condition: 'OPERATIONAL'
  }
];

export const INITIAL_DEPOT_TRANSFERS: DepotTransfer[] = [
  {
    id: 'TRF-2026-031',
    transferNo: 'FDA/TRF/2026/031',
    assetTag: 'FDA-GPS-2025-088',
    assetName: 'Garmin GPSMAP 66i Satellite Communicator',
    origin: 'Whein Town HQ Central Store',
    destination: 'Greenville Regional Hub - Sinoe',
    dispatchedDate: '2026-09-15',
    status: 'CONFIRMED_AT_DEPOT',
    dispatchedBy: 'Moses K. Tamba (HQ Logistics)',
    receivedBy: 'Grace Nyenpan (Sinoe)'
  },
  {
    id: 'TRF-2026-034',
    transferNo: 'FDA/TRF/2026/034',
    assetTag: 'FDA-DRN-2026-002',
    assetName: 'DJI Matrice 300 RTK Thermal Forest Patrol Drone',
    origin: 'Whein Town HQ Central Store',
    destination: 'Sanniquellie Field Office - Nimba',
    dispatchedDate: '2026-09-24',
    status: 'IN_TRANSIT',
    dispatchedBy: 'Moses K. Tamba (HQ Logistics)'
  }
];

export const INITIAL_INVENTORY_STORES: ConsumableInventory[] = [
  {
    id: 'INV-01',
    itemCode: 'RNG-UNIF-CAMO',
    name: 'FDA Forest Ranger Olive/Camouflage Field Uniforms',
    category: 'RANGER_UNIFORMS',
    quantityInStock: 240,
    unit: 'Sets',
    reorderLevel: 50,
    unitCostUSD: 45,
    depotLocation: 'Whein Town HQ Central Store'
  },
  {
    id: 'INV-02',
    itemCode: 'PET-DSL-VOUCH',
    name: 'TotalEnergies 50-Gallon Diesel Patrol Coupons',
    category: 'FUEL_VOUCHERS',
    quantityInStock: 480,
    unit: 'Books',
    reorderLevel: 100,
    unitCostUSD: 230,
    depotLocation: 'HQ Logistics & County Stations'
  },
  {
    id: 'INV-03',
    itemCode: 'BAT-LITH-GPS',
    name: 'Rechargeable Li-Ion Packs for Ranger GPS Handhelds',
    category: 'GPS_BATTERIES',
    quantityInStock: 160,
    unit: 'Units',
    reorderLevel: 40,
    unitCostUSD: 38,
    depotLocation: 'Whein Town HQ Central Store'
  }
];

export const INITIAL_COUNTY_STATUS: CountyOfficeStatus[] = [
  {
    county: 'Montserrado',
    stationHub: 'Whein Town Bernard Farm HQ',
    region: 'Region 2 - Central',
    rangersOnDuty: 42,
    activeConcessions: 2,
    syncStatus: 'SYNCED_REALTIME',
    lastSyncTimestamp: '2026-09-27 10:40:00',
    pendingRecords: 0
  },
  {
    county: 'Nimba',
    stationHub: 'Sanniquellie & East Nimba Reserve Outpost',
    region: 'Region 5 - Northern',
    rangersOnDuty: 35,
    activeConcessions: 4,
    syncStatus: 'SYNCED_REALTIME',
    lastSyncTimestamp: '2026-09-27 10:35:12',
    pendingRecords: 0
  },
  {
    county: 'Sinoe',
    stationHub: 'Greenville & Sapo National Park Station',
    region: 'Region 3 - South-East',
    rangersOnDuty: 48,
    activeConcessions: 5,
    syncStatus: 'SYNCED_REALTIME',
    lastSyncTimestamp: '2026-09-27 09:55:04',
    pendingRecords: 2
  },
  {
    county: 'Grand Bassa',
    stationHub: 'Buchanan Commercial Port FDA Station',
    region: 'Region 3 - South-East',
    rangersOnDuty: 22,
    activeConcessions: 3,
    syncStatus: 'SYNCED_REALTIME',
    lastSyncTimestamp: '2026-09-27 10:15:30',
    pendingRecords: 0
  },
  {
    county: 'Lofa',
    stationHub: 'Voinjama & Wologisi Range Station',
    region: 'Region 5 - Northern',
    rangersOnDuty: 28,
    activeConcessions: 3,
    syncStatus: 'OFFLINE_SYNC_PENDING',
    lastSyncTimestamp: '2026-09-26 18:20:10',
    pendingRecords: 8
  },
  {
    county: 'Rivercess',
    stationHub: 'Cestos City & Kpelle Forest Sector',
    region: 'Region 3 - South-East',
    rangersOnDuty: 18,
    activeConcessions: 2,
    syncStatus: 'OFFLINE_SYNC_PENDING',
    lastSyncTimestamp: '2026-09-26 19:44:00',
    pendingRecords: 5
  },
  {
    county: 'Gbarpolu',
    stationHub: 'Bopolu & Gola Forest Transboundary Post',
    region: 'Region 1 - Western',
    rangersOnDuty: 26,
    activeConcessions: 4,
    syncStatus: 'SYNCED_REALTIME',
    lastSyncTimestamp: '2026-09-27 09:12:00',
    pendingRecords: 0
  },
  {
    county: 'Grand Gedeh',
    stationHub: 'Zwedru & Grebo-Krahn National Park Station',
    region: 'Region 4 - Eastern',
    rangersOnDuty: 32,
    activeConcessions: 4,
    syncStatus: 'SYNCED_REALTIME',
    lastSyncTimestamp: '2026-09-27 10:02:18',
    pendingRecords: 1
  }
];

export const INITIAL_TIMBER_CONCESSIONS: TimberConcessionPermit[] = [
  {
    id: 'CONC-001',
    permitNumber: 'FDA-FMC-001/2026',
    holderName: 'Alpha Logging & Wood Processing Ltd.',
    county: 'Nimba',
    concessionType: 'Forest Management Contract (FMC)',
    areaHectares: 119240,
    annualOperationalPlanStatus: 'APPROVED',
    sgsLiberTraceId: 'LT-COC-LR-2026-8819',
    revenueStatus: 'ROYALTIES_CURRENT'
  },
  {
    id: 'CONC-002',
    permitNumber: 'FDA-TSC-004/2026',
    holderName: 'Atlantic Timber Processing Corp.',
    county: 'Grand Bassa',
    concessionType: 'Timber Sale Contract (TSC)',
    areaHectares: 15000,
    annualOperationalPlanStatus: 'APPROVED',
    sgsLiberTraceId: 'LT-COC-LR-2026-4402',
    revenueStatus: 'ROYALTIES_CURRENT'
  },
  {
    id: 'CONC-003',
    permitNumber: 'FDA-CFMA-012/2026',
    holderName: 'Zorzor Community Forest Enterprise',
    county: 'Lofa',
    concessionType: 'Community Forest (CFMA)',
    areaHectares: 24800,
    annualOperationalPlanStatus: 'APPROVED',
    sgsLiberTraceId: 'LT-COC-LR-2026-1192',
    revenueStatus: 'ROYALTIES_CURRENT'
  },
  {
    id: 'CONC-004',
    permitNumber: 'FDA-FMC-007/2026',
    holderName: 'Euro-Liberia Timber Conglomerate',
    county: 'Grand Gedeh',
    concessionType: 'Forest Management Contract (FMC)',
    areaHectares: 98000,
    annualOperationalPlanStatus: 'UNDER_REVIEW',
    sgsLiberTraceId: 'LT-COC-LR-2026-0094',
    revenueStatus: 'ARREARS_FLAGGED'
  }
];

export const INITIAL_RANGER_INCIDENTS: FieldRangerIncident[] = [
  {
    id: 'INC-2026-044',
    incidentNo: 'FDA/RNG/2026/044',
    incidentDate: '2026-09-24',
    county: 'Sinoe',
    locationDetails: 'Sapo National Park Southern Buffer Zone, Coordinates: 5.3412° N, 8.7891° W',
    type: 'ILLEGAL_PIT_SAWING',
    severity: 'HIGH',
    description: 'Ranger patrol team intercepted an unauthorized pit-sawing operation inside the buffer perimeter. Confiscated 2 Stihl MS-661 chainsaws and 140 pieces of squared Sipo timber.',
    reportedBy: 'Capt. James Wisseh (Sapo Command)',
    evidenceCount: 4,
    status: 'INVESTIGATING'
  },
  {
    id: 'INC-2026-045',
    incidentNo: 'FDA/RNG/2026/045',
    incidentDate: '2026-09-25',
    county: 'Nimba',
    locationDetails: 'East Nimba Nature Reserve Checkpoint Sector 3',
    type: 'UNAUTHORIZED_HAULING',
    severity: 'CRITICAL',
    description: 'Truck carrying unprocessed Niangon logs intercepted without valid FDA LiberTrace barcode tags and lacking county log hauling waybill.',
    reportedBy: 'Capt. Emmanuel D. Toe',
    evidenceCount: 6,
    status: 'ESCALATED_TO_MD'
  },
  {
    id: 'INC-2026-046',
    incidentNo: 'FDA/RNG/2026/046',
    incidentDate: '2026-09-26',
    county: 'Gbarpolu',
    locationDetails: 'Gola Forest National Park Boundary Line Post 14',
    type: 'ENCROACHMENT',
    severity: 'MEDIUM',
    description: 'Agricultural clearing observed extending 200 meters into protected community forestry demarcation zone. Community forest committee convened.',
    reportedBy: 'Ranger Sarah Sumo',
    evidenceCount: 2,
    status: 'RESOLVED'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-09-27 10:14:22',
    actorName: 'Hon. Rudolph J. Merab, Sr.',
    actorRole: 'MANAGING_DIRECTOR',
    action: 'EXECUTIVE_PAYMENT_AUTHORIZATION',
    module: 'FINANCE',
    details: 'Authorized Payment Voucher FDA/PV/2026/09/041 ($18,500.00 USD) for TotalEnergies Patrol Fleet fuel allocation. IFMIS batch queued.',
    ipAddress: '197.231.10.4 (HQ Executive Office)',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-09-27 09:42:15',
    actorName: 'J. Varney Kpaiseh',
    actorRole: 'FINANCE_DIRECTOR',
    action: 'VOTE_BOOK_COMMITMENT',
    module: 'FINANCE',
    details: 'Verified Vote Code 311102 available ceiling: committed $5,400.00 USD for Starlink Depot Satellite Connectivity.',
    ipAddress: '197.231.10.8 (HQ Finance Wing)',
    hash: 'a98f123490bcaef31128790014abdf094892cda1982749817293847aefbc0019'
  },
  {
    id: 'AUD-003',
    timestamp: '2026-09-27 08:30:00',
    actorName: 'Helena S. Gbotoe',
    actorRole: 'HR_DIRECTOR',
    action: 'CSA_BIOMETRIC_RECONCILIATION',
    module: 'HRMIS',
    details: 'Automated biometric sync batch executed across HQ and 8 County Depots. 194 staff verified on duty.',
    ipAddress: '197.231.10.12 (HQ HR Suite)',
    hash: 'c81928374aef0019823479018471928347102938471029384710293847102938'
  },
  {
    id: 'AUD-004',
    timestamp: '2026-09-26 16:15:40',
    actorName: 'Wynn Bryant',
    actorRole: 'PROCUREMENT_OFFICER',
    action: 'THREE_WAY_MATCH_APPROVAL',
    module: 'PROCUREMENT',
    details: 'Completed 3-Way Match validation for Purchase Order FDA/PO/2026/008 (West Africa GeoSpatial GPS Units). Requisition, PO, and Store Receipt matched.',
    ipAddress: '197.231.10.16 (HQ Procurement Office)',
    hash: '4481902837198203918239018230918230918203918230918230918230918230'
  }
];

export const INITIAL_PUBLIC_TENDERS: PublicTenderNotice[] = [
  {
    id: 'TND-2026-001',
    tenderRef: 'FDA/REOI/CONS/2026/001',
    title: 'Integrated System Development (HR, Financial, Procurement & Asset Management System) — Consulting Services',
    procurementCategory: 'CONSULTING_SERVICES',
    publishedDate: 'September 20, 2026',
    submissionDeadline: 'October 20, 2026 at 1:00 PM Liberia Time',
    managingDirector: 'Hon. Rudolph J. Merab, Sr.',
    submissionAddress: 'Forestry Development Authority, Whein Town, Bernard Farm, Montserrado County, Liberia',
    primaryEmail: 'v.kpaiseh@yahoo.com',
    clarificationEmail: 'wynnbryant12@gmail.com',
    telephones: ['0776-063-643', '0886-551-249'],
    estimatedBudgetUSD: 180000,
    status: 'OPEN_FOR_EXPRESSIONS',
    keyRequirements: [
      'Valid Business Registration & Liberia Tax Clearance',
      'Articles of Incorporation & Power of Attorney',
      'Past performance for at least 3 relevant assignments',
      'Audited Financial Statements for at least 2 years',
      'Qualified Key Personnel (PM, Functional Lead, CISSP Security Engineer, Enterprise Architect, Data Migration Specialist)'
    ]
  },
  {
    id: 'TND-2026-002',
    tenderRef: 'FDA/NCB/GOODS/2026/004',
    title: 'Procurement of 4 Heavy-Duty 4x4 Field Patrol Pickups for County Depots',
    procurementCategory: 'GOODS',
    publishedDate: 'September 15, 2026',
    submissionDeadline: 'October 25, 2026 at 2:00 PM Liberia Time',
    managingDirector: 'Hon. Rudolph J. Merab, Sr.',
    submissionAddress: 'FDA Headquarters, Bernard Farm, Montserrado County, Liberia',
    primaryEmail: 'wynnbryant12@gmail.com',
    clarificationEmail: 'v.kpaiseh@yahoo.com',
    telephones: ['0776-063-643'],
    estimatedBudgetUSD: 190000,
    status: 'OPEN_FOR_EXPRESSIONS',
    keyRequirements: [
      'Authorized Manufacturer Dealership certificate in Liberia',
      'Valid LRA Tax Clearance & PPCC Registration',
      'Provision of manufacturer warranty & local maintenance service center'
    ]
  },
  {
    id: 'TND-2026-003',
    tenderRef: 'FDA/RFQ/EQUIP/2026/012',
    title: 'Supply of High-Resolution GPS Navigation Units & Acoustic Chainsaw Detectors for Forest Rangers',
    procurementCategory: 'GOODS',
    publishedDate: 'September 22, 2026',
    submissionDeadline: 'October 15, 2026 at 12:00 PM Liberia Time',
    managingDirector: 'Hon. Rudolph J. Merab, Sr.',
    submissionAddress: 'FDA Headquarters, Bernard Farm, Montserrado County, Liberia',
    primaryEmail: 'wynnbryant12@gmail.com',
    clarificationEmail: 'v.kpaiseh@yahoo.com',
    telephones: ['0886-551-249'],
    estimatedBudgetUSD: 45000,
    status: 'OPEN_FOR_EXPRESSIONS',
    keyRequirements: [
      'Direct importer or technology partner credentials',
      'Standardized satellite messaging compatibility (Iridium/InReach)',
      'Rugged IP67 water/dust resistance rating'
    ]
  }
];

export const INITIAL_BIDDER_QUERIES: BidderClarificationQuery[] = [
  {
    id: 'CLAR-01',
    tenderRef: 'FDA/REOI/CONS/2026/001',
    tenderTitle: 'Integrated System Development (HR, Financial, Procurement & Asset Management System)',
    bidderCompanyName: 'Global Sahel IT Solutions & Partners',
    bidderContactPerson: 'Dr. Alusine Camara',
    bidderEmail: 'a.camara@saheltech.org',
    bidderPhone: '+231 770 918 203',
    question: 'Section 3 mentions integration with IFMIS and CSA HRMIS. Does the FDA intend for the consultant to supply middleware/connectors, or will standard REST API endpoints be exposed by MFDP and CSA?',
    questionDate: '2026-09-24',
    status: 'ANSWERED',
    officialResponse: 'The Consultant shall deliver the integration boundaries and middleware connectors conforming to GoL IFMIS (FreeBalance ISO 20022 XML/JSON batch) and CSA HRMIS biometric standards. All middleware must be included in the core solution.',
    respondedBy: 'J. Varney Kpaiseh (Finance & Functional Lead)',
    responseDate: '2026-09-25'
  },
  {
    id: 'CLAR-02',
    tenderRef: 'FDA/REOI/CONS/2026/001',
    tenderTitle: 'Integrated System Development (HR, Financial, Procurement & Asset Management System)',
    bidderCompanyName: 'West African Forestry Systems Consortium',
    bidderContactPerson: 'Foday Kromah',
    bidderEmail: 'foday@waf-systems.com',
    bidderPhone: '+231 886 312 900',
    question: 'Can foreign firms submit in partnership with qualified Liberian software firms to satisfy local capacity building and knowledge transfer obligations?',
    questionDate: '2026-09-25',
    status: 'ANSWERED',
    officialResponse: 'Yes, in full compliance with PPCC Act regulations, joint ventures and implementation partner consortiums with accredited Liberian entities are strongly encouraged to facilitate continuous post-implementation support.',
    respondedBy: 'Wynn Bryant (Head of Procurement)',
    responseDate: '2026-09-26'
  }
];

