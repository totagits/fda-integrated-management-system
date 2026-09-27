import { RTMRequirement } from '../types';

export const INITIAL_RTM_DATA: RTMRequirement[] = [
  {
    reqId: 'REQ-TOR-01',
    torSection: 'REOI §1 & TOR §1',
    category: 'Legal Mandate & Institutional Identity',
    title: 'Statutory Alignment under 1976 Act & 2006 Reform Law',
    specification: 'System must encapsulate the governance mandate of the Forestry Development Authority (FDA) of Liberia.',
    platformImplementation: 'FDA Headquarters Whein Town, Bernard Farm hierarchy, official Seal/Branding, Managing Director executive workflow, and forestry statutes built into system configuration.',
    testCase: 'TC-GOV-01: Verify legal metadata, official seal, and authority structures in all generated documents and dashboards.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-02',
    torSection: 'REOI §3 & TOR §2',
    category: 'Interoperability Boundary',
    title: 'GoL IFMIS Gateway (MFDP)',
    specification: 'Complement national IFMIS for Ministry of Finance & Development Planning without duplicate or bypass.',
    platformImplementation: 'Dedicated IFMIS Gateway exporting standardized GoL Commitment Vouchers, Chart of Accounts mapping, and IFMIS Transaction Batch export in JSON/CSV.',
    testCase: 'TC-FIN-01: Generate IFMIS Commitment Batch from approved Payment Vouchers and verify balance reconciliation.',
    status: 'EVIDENCE_DEMO_READY'
  },
  {
    reqId: 'REQ-TOR-03',
    torSection: 'REOI §3 & TOR §2',
    category: 'Interoperability Boundary',
    title: 'CSA HRMIS & Civil Service Biometric Boundary',
    specification: 'Sync with Civil Service Agency (CSA) HRMIS, biometric attendance records, and civil-service payroll standards.',
    platformImplementation: 'Personnel registry with Biometric ID mapping, CSA Civil Service Cadre classification, and automated biometric time-roster synchronization.',
    testCase: 'TC-HR-01: Execute CSA reconciliation sync for FDA headquarters and county staff records.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-04',
    torSection: 'REOI §3 & TOR §2',
    category: 'Interoperability Boundary',
    title: 'e-GP & PPCC Procurement Integration',
    specification: 'Interface with electronic Government Procurement (e-GP) and ensure full compliance with PPCC Act regulations.',
    platformImplementation: 'PPCC Annual Procurement Plan (APP) tracker, statutory procurement thresholds (RFQ, NCB, ICB), and vendor LRA tax clearance validation.',
    testCase: 'TC-PROC-01: Test PPCC threshold verification and automatic classification of requisition tender method.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-05',
    torSection: 'REOI §3 & TOR §2',
    category: 'Interoperability Boundary',
    title: 'SGS LiberTrace & Timber Legality Verification (Chain of Custody)',
    specification: 'Interoperability boundary with national forestry sector platforms including timber legality and concession tracking.',
    platformImplementation: 'Forestry Operations Module integrating SGS LiberTrace Chain of Custody IDs, FMC/TSC/CFMA concession boundaries, and annual operational plan (AOP) checks.',
    testCase: 'TC-OPS-01: Verify timber concession harvest permit against SGS LiberTrace CoC registry.',
    status: 'EVIDENCE_DEMO_READY'
  },
  {
    reqId: 'REQ-TOR-06',
    torSection: 'REOI §2 & TOR §1',
    category: 'Financial Management',
    title: 'Vote Book Commitment & Budget Ceiling Controls',
    specification: 'Automated digital workflows with hard budget ceiling controls preventing unbudgeted expenditures across departments.',
    platformImplementation: 'Interactive Vote Book monitoring allotments, commitments, and actual expenditures in real time with automatic over-budget prevention.',
    testCase: 'TC-FIN-02: Attempt voucher creation exceeding available vote code balance; confirm automated block and alert.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-07',
    torSection: 'TOR §6 (Methodology)',
    category: 'Financial Management',
    title: 'Multi-Tier Digital Payment Voucher Authorization',
    specification: 'Multi-level approvals replacing manual signature paper files (Initiator -> Finance -> Managing Director).',
    platformImplementation: 'Payment Voucher lifecycle with strict maker-checker segregation of duties and Managing Director Hon. Rudolph J. Merab, Sr. final executive authorization.',
    testCase: 'TC-FIN-03: Route payment voucher through 3 approval tiers and verify timestamped digital sign-off.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-08',
    torSection: 'REOI §2 & TOR §6',
    category: 'HRMIS & Payroll',
    title: 'Dual-Currency Payroll (USD & LRD) & Statutory Deductions',
    specification: 'Support Liberian multi-currency economy with LRA income tax withholding, NASSCORP social security, and pay vouchers.',
    platformImplementation: 'Dual-currency payroll calculation engine with automated LRA personal income tax scales, 4% NASSCORP employee deduction, and voucher printout.',
    testCase: 'TC-HR-02: Run September 2026 payroll run; verify dual-currency totals, LRA withholding, and NASSCORP schedules.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-09',
    torSection: 'TOR §6 (Methodology)',
    category: 'Procurement Management',
    title: '3-Way Matching Engine for Public Expenditures',
    specification: 'Audit-ready matching between Purchase Requisition, Purchase Order, Goods Received Note (GRN), and Supplier Invoice.',
    platformImplementation: 'Automated 3-Way Matching interface flags quantity, price, or description mismatches before payment authorization.',
    testCase: 'TC-PROC-02: Run 3-way match validation on vendor delivery against approved Purchase Order.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-10',
    torSection: 'TOR §6 (Methodology)',
    category: 'Asset Management',
    title: 'Fixed Asset Register with QR/Barcode Tagging & Depreciation',
    specification: 'Comprehensive asset tracking across HQ and regional field depots with barcode tagging and straight-line depreciation.',
    platformImplementation: 'Asset register with automated straight-line depreciation engine, salvage value calculation, and interactive barcode/QR tag generator and scanner.',
    testCase: 'TC-AST-01: Calculate current book value of patrol vehicles and print standardized FDA barcode asset tag.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-11',
    torSection: 'REOI §2 & TOR §8',
    category: 'Field Operations',
    title: 'Field-to-Headquarters Data Exchange across 15 Counties',
    specification: 'Reliable decentralized data exchange between remote county depots (Sapo, Nimba, Lofa) and Whein Town HQ with offline resilience.',
    platformImplementation: 'County Data Exchange Hub tracking connection health across all 15 Liberia counties with offline queueing and synchronization.',
    testCase: 'TC-OPS-02: Simulate offline ranger patrol incident submission and subsequent sync to Bernard Farm HQ server.',
    status: 'FULLY_COMPLIANT'
  },
  {
    reqId: 'REQ-TOR-12',
    torSection: 'REOI §4 & TOR §7',
    category: 'Governance & Security',
    title: 'Immutable Audit Trail & Segregation of Duties (SoD)',
    specification: 'Comprehensive auditability, tamper-resistant transaction logging, and strict role-based access control.',
    platformImplementation: 'SHA-256 style cryptographic hashing on every system event, immutable audit viewer, and interactive 7-role RBAC persona switcher.',
    testCase: 'TC-SEC-01: Perform sensitive transaction; verify cryptographic hash generation and tamper check in audit log.',
    status: 'FULLY_COMPLIANT'
  }
];
