import React, { useState } from 'react';
import { useApp, AppModule } from '../../context/AppContext';
import {
  Server,
  ShieldCheck,
  HardDrive,
  Clock,
  CheckCircle2,
  Lock,
  Users,
  Award,
  FileCode,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  Radio,
  Cpu,
  Smartphone,
  Landmark,
  Coins,
  ShoppingCart,
  Box,
  TreePine,
  RefreshCw,
  Zap,
  Globe,
  ChevronRight,
  Code2,
  Check,
  AlertTriangle
} from 'lucide-react';

export const SecurityModule: React.FC = () => {
  const { setActiveModule, isPublicPortal, loginToIntranet } = useApp();
  const [activeTab, setActiveTab] = useState<'ARCHITECTURE' | 'PROCESSES' | 'SPECS' | 'GATEWAYS' | 'STAFFING'>('ARCHITECTURE');
  
  const handleNavigateModule = (mod: AppModule) => {
    if (isPublicPortal) {
      loginToIntranet('MANAGING_DIRECTOR');
    }
    setActiveModule(mod);
  };
  
  // State for interactive Gateway Simulator
  const [simulatedGateway, setSimulatedGateway] = useState<string | null>(null);
  const [gatewaySimResult, setGatewaySimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runGatewaySimulation = (gatewayKey: string) => {
    setIsSimulating(true);
    setSimulatedGateway(gatewayKey);
    setGatewaySimResult(null);

    setTimeout(() => {
      setIsSimulating(false);
      switch (gatewayKey) {
        case 'CSA':
          setGatewaySimResult({
            gateway: 'CSA HRMIS & National Biometric Database',
            endpoint: 'https://hrmis.csa.gov.lr/api/v2/biometric/verify-cadre',
            status: '200 OK • Synced',
            latency: '42ms',
            auth: 'OAuth2 Bearer (Token Scopes: csa:biometric:read, csa:cadre:verify)',
            payload: {
              activeFDAEmployeesAudited: 184,
              biometricMatches: 184,
              duplicateCivilServiceIdentities: 0,
              ghostWorkerRiskScore: '0.00% (CLEARED)',
              lastReconciliationHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
            }
          });
          break;
        case 'IFMIS':
          setGatewaySimResult({
            gateway: 'Ministry of Finance (MFDP) - GoL IFMIS',
            endpoint: 'https://ifmis.mfdp.gov.lr/gateway/commitment/check-ceiling',
            status: '200 OK • Hard Ceiling Enforced',
            latency: '68ms',
            auth: 'mTLS (X.509 Certificate) + GoL PFM API Signature',
            payload: {
              fyAllotmentCode: 'FDA-2026-VOTE-211101',
              annualAppropriationUSD: 2450000.00,
              warrantAllottedUSD: 1850000.00,
              totalCommittedUSD: 1420500.00,
              availableHardCeilingUSD: 429500.00,
              hardStopRule: 'REQUISITION_BLOCKED_IF_OVER_CEILING',
              statusMessage: 'Transaction approved within vote book ceiling'
            }
          });
          break;
        case 'PPCC':
          setGatewaySimResult({
            gateway: 'PPCC e-GP National Public Procurement Portal',
            endpoint: 'https://egp.ppcc.gov.lr/api/tenders/clearance',
            status: '200 OK • Cleared',
            latency: '55ms',
            auth: 'PPCC Public Authority API Key + HMAC-SHA256',
            payload: {
              procurementPlanReference: 'FDA-APP-FY2026-V1',
              statutoryThresholdCheck: 'NCB (National Competitive Bidding) <= $100,000 USD',
              vendorDebarmentListCheck: 'CLEARED (0 matches against PPCC Blacklist)',
              lraTaxClearanceRequired: true,
              tenderNoticePublished: true
            }
          });
          break;
        case 'BANK':
          setGatewaySimResult({
            gateway: 'Commercial Banks & CBL Direct Disbursement Gateway',
            endpoint: 'https://eft.lbdi.net/iso20022/payroll/disburse',
            status: '200 OK • Batch Formatted',
            latency: '89ms',
            auth: 'ISO 20022 pain.001.001.09 + PGP Encrypted Signature',
            payload: {
              batchReference: 'FDA-PAY-2026-09-BATCH-01',
              disbursementCurrency: 'DUAL (USD + LRD)',
              totalDisbursedUSD: 46920.00,
              totalDisbursedLRD: 9149400.00,
              recipientInstitutions: ['LBDI', 'Ecobank Liberia', 'Central Bank of Liberia (CBL)'],
              nasscorpRemittanceUSD: 2880.00,
              lraTaxWithholdingUSD: 14400.00
            }
          });
          break;
        case 'MOBILE':
          setGatewaySimResult({
            gateway: 'Decentralized County Mobile App & Field Telemetry Gateway',
            endpoint: 'https://api.fda.gov.lr/telemetry/field-sync/v1',
            status: '200 OK • Bidirectional Sync Complete',
            latency: '112ms (via Starlink/GSM)',
            auth: 'Encrypted Device JWT + SQLite Reconnect Handshake',
            payload: {
              activeCountyStationsReporting: 15,
              bufferedOfflinePacketsProcessed: 48,
              syncedRangerPatrols: 12,
              timberMeasurementsReceived: 186,
              sgsLiberTraceCoCVerifications: 14,
              sqliteStorageStatus: 'SYNCHRONIZED (Zero Packet Loss)'
            }
          });
          break;
        default:
          break;
      }
    }, 700);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              REOI §4, §5 & §6 Architecture Blueprint
            </span>
            <span className="text-xs text-slate-500 font-mono">End-to-End Enterprise Specification</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">
            Central FDA ERP Core Platform & Authoritative System Boundary Layer
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Clean Modular Architecture • 5 Core Business Modules • 5 Authoritative National System Gateways • Technical Specifications Matrix
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('ARCHITECTURE')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'ARCHITECTURE' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-700 hover:text-forest-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture Diagram</span>
          </button>
          <button
            onClick={() => setActiveTab('PROCESSES')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'PROCESSES' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-700 hover:text-forest-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>5 Core Modules</span>
          </button>
          <button
            onClick={() => setActiveTab('SPECS')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'SPECS' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-700 hover:text-forest-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Technical Specs (TOR §3)</span>
          </button>
          <button
            onClick={() => setActiveTab('GATEWAYS')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'GATEWAYS' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-700 hover:text-forest-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-gold-400" />
            <span>API Gateway Console</span>
          </button>
          <button
            onClick={() => setActiveTab('STAFFING')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'STAFFING' ? 'bg-forest-800 text-white shadow-sm' : 'text-slate-700 hover:text-forest-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Staffing & Continuity</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ARCHITECTURE DIAGRAM (INTERACTIVE VISUALIZER) */}
      {/* ========================================================================= */}
      {activeTab === 'ARCHITECTURE' && (
        <div className="space-y-6">
          
          {/* Architectural Overview Card */}
          <div className="bg-forest-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-forest-800 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-forest-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-forest-900 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-white">
                    Central FDA ERP Core Platform Architecture
                  </h2>
                  <p className="text-xs text-forest-300">
                    High-Cohesion Modular Core with Authoritative System Boundary Layer (REOI §4 & TOR §3)
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
                Active Blueprint
              </span>
            </div>

            {/* Core ERP Platform Box */}
            <div className="border-2 border-forest-700 rounded-xl p-5 bg-forest-900/80 backdrop-blur shadow-2xl">
              <div className="text-center pb-3 mb-4 border-b border-forest-800">
                <span className="text-xs font-extrabold tracking-widest text-gold-400 uppercase">
                  CENTRAL FDA ERP CORE PLATFORM (MODULAR MONOLITH / MICROSERVICES ENGINE)
                </span>
              </div>

              {/* 5 Core Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs">
                
                {/* Module 1 */}
                <div 
                  onClick={() => handleNavigateModule('HRMIS')}
                  className="bg-forest-950 hover:bg-forest-800/90 cursor-pointer p-4 rounded-xl border border-forest-700/80 transition group shadow flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center space-x-2 text-gold-300 font-bold mb-2">
                      <Users className="w-4 h-4 text-gold-400" />
                      <span className="text-xs font-extrabold uppercase">HR & Payroll</span>
                    </div>
                    <ul className="text-[11px] text-forest-200 space-y-1.5">
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Biometric Attendance</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>CSA Alignment & Bands</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Dual-Currency Pay Slips</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>County Station Transfers</span>
                      </li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-gold-400 group-hover:underline font-semibold flex items-center space-x-1">
                    <span>Open Module</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Module 2 */}
                <div 
                  onClick={() => handleNavigateModule('FINANCE')}
                  className="bg-forest-950 hover:bg-forest-800/90 cursor-pointer p-4 rounded-xl border border-forest-700/80 transition group shadow flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center space-x-2 text-gold-300 font-bold mb-2">
                      <Coins className="w-4 h-4 text-gold-400" />
                      <span className="text-xs font-extrabold uppercase">Financial Mgmt</span>
                    </div>
                    <ul className="text-[11px] text-forest-200 space-y-1.5">
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Multi-Fund PFM Rules</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>General Ledger & AP/AR</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Hard Budget Ceilings</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Payment Voucher Flow</span>
                      </li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-gold-400 group-hover:underline font-semibold flex items-center space-x-1">
                    <span>Open Module</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Module 3 */}
                <div 
                  onClick={() => handleNavigateModule('PROCUREMENT')}
                  className="bg-forest-950 hover:bg-forest-800/90 cursor-pointer p-4 rounded-xl border border-forest-700/80 transition group shadow flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center space-x-2 text-gold-300 font-bold mb-2">
                      <ShoppingCart className="w-4 h-4 text-gold-400" />
                      <span className="text-xs font-extrabold uppercase">Procurement</span>
                    </div>
                    <ul className="text-[11px] text-forest-200 space-y-1.5">
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Requisition to PO</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Public Vendor Portal</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>PPCC / e-GP Thresholds</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>4-Pillar 3-Way Match</span>
                      </li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-gold-400 group-hover:underline font-semibold flex items-center space-x-1">
                    <span>Open Module</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Module 4 */}
                <div 
                  onClick={() => handleNavigateModule('ASSETS')}
                  className="bg-forest-950 hover:bg-forest-800/90 cursor-pointer p-4 rounded-xl border border-forest-700/80 transition group shadow flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center space-x-2 text-gold-300 font-bold mb-2">
                      <Box className="w-4 h-4 text-gold-400" />
                      <span className="text-xs font-extrabold uppercase">Asset & Inventory</span>
                    </div>
                    <ul className="text-[11px] text-forest-200 space-y-1.5">
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Barcode / QR / RFID</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Automated Depreciation</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>15-County Waybills</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Consumables Re-order</span>
                      </li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-gold-400 group-hover:underline font-semibold flex items-center space-x-1">
                    <span>Open Module</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Module 5 */}
                <div 
                  onClick={() => handleNavigateModule('OPERATIONS')}
                  className="bg-forest-950 hover:bg-forest-800/90 cursor-pointer p-4 rounded-xl border border-forest-700/80 transition group shadow flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center space-x-2 text-gold-300 font-bold mb-2">
                      <TreePine className="w-4 h-4 text-gold-400" />
                      <span className="text-xs font-extrabold uppercase">Forestry Ops</span>
                    </div>
                    <ul className="text-[11px] text-forest-200 space-y-1.5">
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Concessions (FMC/TSC)</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>SGS LiberTrace CoC</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Patrol Telemetry</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Ranger Incident Logs</span>
                      </li>
                    </ul>
                  </div>
                  <span className="text-[10px] text-gold-400 group-hover:underline font-semibold flex items-center space-x-1">
                    <span>Open Module</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

              </div>
            </div>

            {/* Vertical Flow Connectors */}
            <div className="py-4 flex justify-around text-gold-400 font-mono text-xs font-bold">
              <span>▲ ▼ (OIDC/REST)</span>
              <span>▲ ▼ (mTLS/JSON)</span>
              <span>▲ ▼ (e-GP API)</span>
              <span>▲ ▼ (ISO 20022)</span>
              <span>▲ ▼ (SQLite Sync)</span>
            </div>

            {/* System Boundary Layer (API Gateway) */}
            <div className="border-2 border-dashed border-gold-500/60 rounded-xl p-5 bg-forest-900/60 backdrop-blur shadow-lg">
              <div className="text-center pb-2 mb-4 border-b border-forest-800">
                <span className="text-xs font-extrabold tracking-widest text-emerald-300 uppercase">
                  INTEGRATION & AUTHORITATIVE SYSTEM BOUNDARY LAYER (SECURE API GATEWAY)
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Decoupled Boundary Adapters with OAuth2, Mutual TLS, Queue Buffers & Circuit Breakers
                </p>
              </div>

              {/* 5 Boundary Gateways */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs text-center">
                
                <div 
                  onClick={() => { setActiveTab('GATEWAYS'); runGatewaySimulation('CSA'); }}
                  className="bg-forest-950/90 hover:bg-forest-800 p-3 rounded-lg border border-forest-700 cursor-pointer transition shadow"
                >
                  <p className="font-bold text-white text-xs">CSA HRMIS / Biometric</p>
                  <p className="text-[10px] text-forest-300 mt-1">National Cadre Master & Anti-Ghost Worker Sync</p>
                  <span className="inline-block mt-2 text-[9px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                    OIDC / REST
                  </span>
                </div>

                <div 
                  onClick={() => { setActiveTab('GATEWAYS'); runGatewaySimulation('IFMIS'); }}
                  className="bg-forest-950/90 hover:bg-forest-800 p-3 rounded-lg border border-forest-700 cursor-pointer transition shadow"
                >
                  <p className="font-bold text-white text-xs">IFMIS (MFDP)</p>
                  <p className="text-[10px] text-forest-300 mt-1">Warrant Feeds & Vote Book Commitment Bridges</p>
                  <span className="inline-block mt-2 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    mTLS / REST
                  </span>
                </div>

                <div 
                  onClick={() => { setActiveTab('GATEWAYS'); runGatewaySimulation('PPCC'); }}
                  className="bg-forest-950/90 hover:bg-forest-800 p-3 rounded-lg border border-forest-700 cursor-pointer transition shadow"
                >
                  <p className="font-bold text-white text-xs">e-GP (PPCC)</p>
                  <p className="text-[10px] text-forest-300 mt-1">Tender Publication & APP Statutory Thresholds</p>
                  <span className="inline-block mt-2 text-[9px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                    REST / Webhooks
                  </span>
                </div>

                <div 
                  onClick={() => { setActiveTab('GATEWAYS'); runGatewaySimulation('BANK'); }}
                  className="bg-forest-950/90 hover:bg-forest-800 p-3 rounded-lg border border-forest-700 cursor-pointer transition shadow"
                >
                  <p className="font-bold text-white text-xs">Commercial Banks</p>
                  <p className="text-[10px] text-forest-300 mt-1">LBDI, Ecobank, CBL Dual-Currency Payroll EFT</p>
                  <span className="inline-block mt-2 text-[9px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                    ISO 20022 / ACH
                  </span>
                </div>

                <div 
                  onClick={() => { setActiveTab('GATEWAYS'); runGatewaySimulation('MOBILE'); }}
                  className="bg-forest-950/90 hover:bg-forest-800 p-3 rounded-lg border border-forest-700 cursor-pointer transition shadow"
                >
                  <p className="font-bold text-white text-xs">Field Mobile App</p>
                  <p className="text-[10px] text-forest-300 mt-1">Offline-First SQLite Sync across 15 County Posts</p>
                  <span className="inline-block mt-2 text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    PWA / SQLite Sync
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* Quick Explanatory Callout */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
            <div className="p-2 rounded-lg bg-forest-50 text-forest-800 border border-forest-200 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                Architectural Rationale: Why Authoritative Boundaries Matter for FDA Liberia
              </p>
              <p className="leading-relaxed">
                As mandated by the TOR and GoL public financial regulations, the Forestry Development Authority must not duplicate national authoritative masters. The FDA ERP establishes strict API boundaries: <strong>CSA</strong> remains the sole authority for civil service personnel IDs, <strong>MFDP IFMIS</strong> governs national appropriations and cash warrants, <strong>PPCC</strong> regulates statutory procurement thresholds, and commercial banks disburse funds. The FDA ERP serves as the high-integrity operational core enforcing hard budget ceilings, timber traceability, and local asset custody.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 5 CORE PROCESS MODULES (END-TO-END BUSINESS PROCESSES) */}
      {/* ========================================================================= */}
      {activeTab === 'PROCESSES' && (
        <div className="space-y-4">
          
          {/* Module 1 Deep Dive */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-forest-100 text-forest-800 font-extrabold flex items-center justify-center text-xs">1</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Module 1: Human Resources & Payroll Administration</h3>
                  <p className="text-[11px] text-slate-500">Employee Lifecycle • CSA Biometrics • Time & Attendance • Automated Dual-Currency Engine</p>
                </div>
              </div>
              <button
                onClick={() => handleNavigateModule('HRMIS')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-700 text-white text-xs font-bold transition shadow"
              >
                <span>Launch Live HRMIS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Employee Lifecycle Management</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Digital personnel files, recruitment onboarding, promotions, disciplinary hearings, leave tracking, and scheduled retirement planning.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">National Alignment & Boundary</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Rigorous boundary with CSA HRMIS and national biometric databases to avoid duplicate civil service payrolls and eradicate ghost workers.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Time & Field Attendance</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Integration with regional biometric scanners and GPS-stamped mobile check-ins for county rangers, checkpoint inspectors, and mobile patrols.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Automated Payroll Engine</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Automated basic salaries, hazard pay, LRA income tax (20%), NASSCORP social security (4%), automated pay slips, and commercial bank batch files.
                </p>
              </div>
            </div>
          </div>

          {/* Module 2 Deep Dive */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs">2</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Module 2: Financial Management & Budgetary Control</h3>
                  <p className="text-[11px] text-slate-500">Public Financial Management (PFM) • Strict Commitment Ceilings • IFMIS Reconciliations • GAC Audit</p>
                </div>
              </div>
              <button
                onClick={() => handleNavigateModule('FINANCE')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-700 text-white text-xs font-bold transition shadow"
              >
                <span>Launch Live Finance</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">PFM Act Compliance</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  GoL standard Chart of Accounts (COA), general ledger, accounts payable, accounts receivable, multi-currency bank accounts, and daily cashbook.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Strict Budget Commitment Checks</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Automated hard budget checks that mechanically halt and block purchase requisitions or payment vouchers if line-item ceilings are exceeded.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">IFMIS Integration Boundary</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Automated commitment batch feeds matching the Ministry of Finance and Development Planning’s (MFDP) central warrant allocation ledger.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Immutable Audit Trail (GAC)</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Cryptographically chained, append-only transaction logs (SHA-256) ensuring compliance with General Auditing Commission standards.
                </p>
              </div>
            </div>
          </div>

          {/* Module 3 Deep Dive */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-xs">3</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Module 3: Procurement & Vendor Management</h3>
                  <p className="text-[11px] text-slate-500">PPCC Compliance • Needs Requisition to PO • Supplier Tax Clearance • 4-Pillar 3-Way Match</p>
                </div>
              </div>
              <button
                onClick={() => handleNavigateModule('PROCUREMENT')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-700 text-white text-xs font-bold transition shadow"
              >
                <span>Launch Live Procurement</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Public Procurement (PPCC) Alignment</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Full adherence to statutory procurement thresholds (RFQ &lt;= $10K, Restricted Tendering &lt;= $50K, NCB &lt;= $100K, ICB &gt; $100K) and e-GP.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">End-to-End Procurement Lifecycle</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Needs Requisition → APP Clearance → RFQ/Tender Publication → Bid Evaluation Scoring → Contract Award → Purchase Order Issuance.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Supplier Management & LRA Clearance</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Mandatory vendor registration, Liberia Business Registry (LBR) check, LRA Tax Clearance validity verification, and performance rating.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">4-Pillar 3-Way Reconciliation</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Mechanical verification linking Approved PR + Official PO + Central Stores GRN + Vendor Invoice prior to payment voucher initiation.
                </p>
              </div>
            </div>
          </div>

          {/* Module 4 Deep Dive */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-xs">4</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Module 4: Fixed Assets & Inventory Control</h3>
                  <p className="text-[11px] text-slate-500">Barcode/QR/RFID Tagging • Straight-Line Depreciation • County Depot Transfers • Consumables</p>
                </div>
              </div>
              <button
                onClick={() => handleNavigateModule('ASSETS')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-700 text-white text-xs font-bold transition shadow"
              >
                <span>Launch Live Assets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Asset Tracking & Tagging</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  QR/Barcode/RFID assignment for vehicles (Land Cruisers/Hilux), survey tools, GPS Garmin communicators, drones, and office electronics.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Automated Depreciation</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Real-time computation of asset useful life, salvage value, annual straight-line / declining balance depreciation, and net book value.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">HQ to County Transfers</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Inter-office transfer waybill workflow from Whein Town HQ to remote county forest depots with chain of custody sign-offs.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Consumables & Central Stores</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Stock levels, minimum re-order thresholds, automated alerts, and Goods Received Note (GRN) integration with procurement.
                </p>
              </div>
            </div>
          </div>

          {/* Module 5 Deep Dive */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 font-extrabold flex items-center justify-center text-xs">5</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Module 5: Forestry Operations & Field Integration</h3>
                  <p className="text-[11px] text-slate-500">Concession Tracking (FMC/TSC/CFMA) • SGS LiberTrace Chain of Custody • Field Patrol Telemetry</p>
                </div>
              </div>
              <button
                onClick={() => handleNavigateModule('OPERATIONS')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-700 text-white text-xs font-bold transition shadow"
              >
                <span>Launch Live Forestry Ops</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Concession Lifecycle Oversight</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Management of Forest Management Contracts (FMC), Timber Sale Contracts (TSC), and Community Forest Management Agreements (CFMA).
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">SGS LiberTrace CoC Integration</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Log barcode validation, export permit verification, Buchanan/Monrovia port inspection cross-checks, and FLEGT-VPA compliance.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Ranger Incident Logging</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  GPS-tagged incident reporting for illegal chainsaw milling, bushmeat poaching, chainsaw seizures, and direct escalation to the Managing Director.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">15-County Field-to-HQ Telemetry</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Decentralized station status, offline sync queues, Starlink packet dispatch, and real-time operational feeds into central executive dashboards.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TECHNICAL SPECIFICATIONS (TOR §3 EVALUATION MATRIX) */}
      {/* ========================================================================= */}
      {activeTab === 'SPECS' && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Database className="w-5 h-5 text-forest-700" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Technical Specifications & Enterprise Stack Evaluation Matrix
                </h3>
                <p className="text-[11px] text-slate-500">
                  Analysis of Recommended Specifications, Framework Trade-Offs & Liberia Infrastructure Alignment
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Component</th>
                    <th className="py-2.5 px-3">Recommended Specification</th>
                    <th className="py-2.5 px-3">Option A: Open-Core (ERPNext/Odoo)</th>
                    <th className="py-2.5 px-3">Option B: Custom Stack (Node/Postgres)</th>
                    <th className="py-2.5 px-3 text-right">Implementation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">System Architecture</td>
                    <td className="py-3 px-3 text-slate-700">Modular, API-Driven Enterprise Architecture (Headless Core with Microservices / Clean Modular Monolith).</td>
                    <td className="py-3 px-3 text-slate-600">Monolithic modular app framework with Frappe REST API.</td>
                    <td className="py-3 px-3 text-slate-600">Clean layered modular monolith with decoupled gateway microservices.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Implemented</span></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">Core Framework / Platform</td>
                    <td className="py-3 px-3 text-slate-700">Customized ERPNext / Frappe (Python/MariaDB) or Custom Enterprise Stack (Node/React/Spring Boot).</td>
                    <td className="py-3 px-3 text-slate-600">ERPNext DocType customization; zero vendor lock-in.</td>
                    <td className="py-3 px-3 text-slate-600">React 19 + TypeScript frontend with NestJS/Node API gateway.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Production Ready</span></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">Database Engine</td>
                    <td className="py-3 px-3 text-slate-700">Enterprise PostgreSQL 16+ with <strong>PostGIS extension</strong> enabled for geospatial/county field mapping.</td>
                    <td className="py-3 px-3 text-slate-600">MariaDB Enterprise with basic GIS or PostgreSQL Frappe fork.</td>
                    <td className="py-3 px-3 text-slate-600 font-semibold text-forest-800">PostgreSQL 16 with native PostGIS for forest boundaries.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">PostGIS Compatible</span></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">Authentication & Access</td>
                    <td className="py-3 px-3 text-slate-700">OpenID Connect (OIDC) / OAuth 2.0 with RBAC + ABAC; Multi-Factor Authentication (MFA) via TOTP.</td>
                    <td className="py-3 px-3 text-slate-600">Built-in Frappe OAuth2 with standard RBAC.</td>
                    <td className="py-3 px-3 text-slate-600">OIDC Keycloak / Auth0 bridge with granular SoD RBAC.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">RBAC Enforced</span></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">API & Integrations</td>
                    <td className="py-3 px-3 text-slate-700">RESTful and GraphQL APIs; asynchronous message queuing (RabbitMQ or Redis Streams) for transaction sync.</td>
                    <td className="py-3 px-3 text-slate-600">Redis default task queue + Frappe REST hooks.</td>
                    <td className="py-3 px-3 text-slate-600">RabbitMQ event-driven bus for IFMIS/Bank batch dispatches.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">RESTful / Async</span></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">Security Standards</td>
                    <td className="py-3 px-3 text-slate-700">TLS 1.3 in-transit encryption, AES-256 for data at rest, OWASP Top 10 mitigation, signed audit logs.</td>
                    <td className="py-3 px-3 text-slate-600">SSL/TLS + MariaDB encryption-at-rest plugins.</td>
                    <td className="py-3 px-3 text-slate-600 font-semibold text-forest-800">Native TLS 1.3, AES-256 column encryption, SHA-256 audit.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">CISSP Certified</span></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">Data Migration Pipeline</td>
                    <td className="py-3 px-3 text-slate-700">Automated ETL pipelines (Python/Airflow) with checksum validation, data staging tables, deduplication routines.</td>
                    <td className="py-3 px-3 text-slate-600">Data Import tool with CSV/Excel staging.</td>
                    <td className="py-3 px-3 text-slate-600">Python ETL scripts with automated checksum verification.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">ETL Validated</span></td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">Mobile / Field Layer</td>
                    <td className="py-3 px-3 text-slate-700">Progressive Web App (PWA) or Flutter cross-platform client with SQLite-backed local encrypted storage & sync.</td>
                    <td className="py-3 px-3 text-slate-600">PWA web interface; requires custom offline plugin.</td>
                    <td className="py-3 px-3 text-slate-600 font-semibold text-forest-800">PWA + SQLite local cache with auto-sync upon reconnect.</td>
                    <td className="py-3 px-3 text-right"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Offline-First Sync</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Architecture Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-forest-800 font-bold text-sm">
                <Code2 className="w-4 h-4" />
                <h4>Option A: Enterprise Open-Core (ERPNext / Frappe)</h4>
              </div>
              <p className="text-slate-600 leading-relaxed">
                <strong>Key Advantages:</strong> Eliminates software licensing fees forever (critical under constrained GoL national budgets), rapid out-of-the-box deployment of general ledger and purchasing modules, highly configurable DocTypes for Liberia forestry nuances, and global community active development.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-emerald-700 font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Optimal for rapid statutory deployment with zero recurring license liability</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-forest-800 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <h4>Option B: Custom Enterprise Stack (Node.js/PostgreSQL)</h4>
              </div>
              <p className="text-slate-600 leading-relaxed">
                <strong>Key Advantages:</strong> Precision-tailored to FDA Liberia’s exact 4-pillar 3-way matching rules, zero bloated unused features, native <strong>PostGIS</strong> geospatial querying for boundary tracking across 15 counties, and lightweight PWA offline caching designed specifically for intermittent Liberian rural networks.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 text-[11px] text-emerald-700 font-medium">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Optimal for bespoke forestry telemetry, SGS LiberTrace CoC, and PostGIS spatial queries</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: API GATEWAY CONSOLE (AUTHORITATIVE SYSTEM BOUNDARY SIMULATOR) */}
      {/* ========================================================================= */}
      {activeTab === 'GATEWAYS' && (
        <div className="space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <Radio className="w-5 h-5 text-forest-700" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Live Authoritative System Boundary Gateway Console
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Interactive testing & inspection of the 5 boundary adapters connecting central FDA ERP to national systems
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono text-slate-500">API Gateway v2.4 (Active)</span>
            </div>

            {/* Gateway Trigger Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              
              <button
                onClick={() => runGatewaySimulation('CSA')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  simulatedGateway === 'CSA' ? 'border-forest-700 bg-forest-50' : 'border-slate-200 hover:border-forest-400 bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Boundary 1</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">CSA HRMIS</p>
                  <p className="text-[10px] text-slate-600">Biometric & Anti-Ghost Worker Sync</p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-forest-700">Test Ping →</span>
              </button>

              <button
                onClick={() => runGatewaySimulation('IFMIS')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  simulatedGateway === 'IFMIS' ? 'border-forest-700 bg-forest-50' : 'border-slate-200 hover:border-forest-400 bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Boundary 2</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">MFDP IFMIS</p>
                  <p className="text-[10px] text-slate-600">Vote Book Commitment Ceilings</p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-forest-700">Test Ping →</span>
              </button>

              <button
                onClick={() => runGatewaySimulation('PPCC')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  simulatedGateway === 'PPCC' ? 'border-forest-700 bg-forest-50' : 'border-slate-200 hover:border-forest-400 bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Boundary 3</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">PPCC e-GP</p>
                  <p className="text-[10px] text-slate-600">Tenders & Statutory Thresholds</p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-forest-700">Test Ping →</span>
              </button>

              <button
                onClick={() => runGatewaySimulation('BANK')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  simulatedGateway === 'BANK' ? 'border-forest-700 bg-forest-50' : 'border-slate-200 hover:border-forest-400 bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Boundary 4</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">Commercial Banks</p>
                  <p className="text-[10px] text-slate-600">LBDI/Ecobank/CBL Dual-Pay EFT</p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-forest-700">Test Ping →</span>
              </button>

              <button
                onClick={() => runGatewaySimulation('MOBILE')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  simulatedGateway === 'MOBILE' ? 'border-forest-700 bg-forest-50' : 'border-slate-200 hover:border-forest-400 bg-slate-50'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Boundary 5</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">Field Mobile App</p>
                  <p className="text-[10px] text-slate-600">15-County Offline SQLite Telemetry</p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-forest-700">Test Ping →</span>
              </button>

            </div>

            {/* Simulation Results Display */}
            <div className="bg-slate-950 text-slate-100 rounded-xl p-5 font-mono text-xs shadow-inner">
              {isSimulating ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-2 text-forest-300">
                  <RefreshCw className="w-6 h-6 animate-spin text-gold-400" />
                  <p>Handshaking with Authoritative Gateway & Verifying Certificates...</p>
                </div>
              ) : gatewaySimResult ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                    <div>
                      <span className="text-slate-400 text-[11px]">TARGET GATEWAY:</span>
                      <p className="font-bold text-gold-400 text-sm">{gatewaySimResult.gateway}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {gatewaySimResult.status}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2">Latency: {gatewaySimResult.latency}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <p><span className="text-slate-500">ENDPOINT:</span> <span className="text-slate-300">{gatewaySimResult.endpoint}</span></p>
                    <p><span className="text-slate-500">SECURITY / AUTH:</span> <span className="text-emerald-400">{gatewaySimResult.auth}</span></p>
                  </div>

                  <div className="pt-2">
                    <span className="text-slate-500 text-[10px] block mb-1">AUTHORITATIVE BOUNDARY PAYLOAD (JSON):</span>
                    <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto">
                      {JSON.stringify(gatewaySimResult.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <p>Click any of the 5 boundary adapters above to simulate a live transaction handshake.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: STAFFING MATRIX & BUSINESS CONTINUITY (REOI §6) */}
      {/* ========================================================================= */}
      {activeTab === 'STAFFING' && (
        <div className="space-y-6">
          
          {/* CISSP & Team Qualifications Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Award className="w-5 h-5 text-gold-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Key Personnel Technical Staffing Matrix (REOI §6 Minimum Qualifications)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Project Manager</span>
                <p className="text-xs font-bold text-slate-900">B.Sc. in IT, PMP Certified</p>
                <p className="text-[11px] text-slate-600">7+ years delivering public sector ERP platforms across West Africa.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Business / Functional Lead</span>
                <p className="text-xs font-bold text-slate-900">MBA, Public Finance & Supply Chain</p>
                <p className="text-[11px] text-slate-600">Expertise in GoL PFM Act, PPCC Act & public expenditure vote books.</p>
              </div>

              <div className="p-4 bg-forest-50/70 rounded-lg border border-forest-200 space-y-1">
                <span className="text-[10px] font-bold text-forest-800 uppercase">Cybersecurity / Systems Engineer</span>
                <p className="text-xs font-bold text-forest-900">MBA InfoSec & Certified CISSP</p>
                <p className="text-[11px] text-forest-700">8+ years designing role-based access, cryptographic ledgers & ISO 27001.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Enterprise Architect</span>
                <p className="text-xs font-bold text-slate-900">B.Sc. Computer Science</p>
                <p className="text-[11px] text-slate-600">Specialist in decentralized distributed systems & offline-first data sync.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Database & Migration Specialist</span>
                <p className="text-xs font-bold text-slate-900">M.Sc. Computer Science & Technology</p>
                <p className="text-[11px] text-slate-600">Data cleansing, legacy record reconciliation and IFMIS schema bridges.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Forestry GIS & Traceability Expert</span>
                <p className="text-xs font-bold text-slate-900">GIS Specialist (ArcGIS/LiberTrace)</p>
                <p className="text-[11px] text-slate-600">SGS LiberTrace barcode tracking and protected area geospatial integration.</p>
              </div>
            </div>
          </div>

          {/* Continuity & Disaster Recovery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Disaster Recovery (DRP)</h4>
                <Server className="w-5 h-5 text-forest-700" />
              </div>
              <p className="text-xs text-slate-600">
                Automated hot-standby replication between Whein Town HQ and secure cloud repository.
              </p>
              <div className="space-y-1 text-xs font-mono pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recovery Time (RTO):</span>
                  <span className="font-bold text-emerald-700">&lt; 2 Hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recovery Point (RPO):</span>
                  <span className="font-bold text-emerald-700">&lt; 15 Minutes</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Backup Schedules</h4>
                <HardDrive className="w-5 h-5 text-blue-700" />
              </div>
              <p className="text-xs text-slate-600">
                Triple-redundancy database snapshots: local NVMe storage, offsite encrypted cold storage, and daily differential archives.
              </p>
              <div className="space-y-1 text-xs font-mono pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Snapshot Frequency:</span>
                  <span className="font-bold text-slate-800">Every 4 Hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Retention Horizon:</span>
                  <span className="font-bold text-slate-800">7 Years (Statutory)</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Source Code Handover</h4>
                <FileCode className="w-5 h-5 text-amber-700" />
              </div>
              <p className="text-xs text-slate-600">
                100% intellectual property, full Git repository, schema migration scripts, and administrator deployment manuals transferred to FDA.
              </p>
              <div className="space-y-1 text-xs font-mono pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Licensing:</span>
                  <span className="font-bold text-slate-800">Full FDA Ownership</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Warranty / SLA:</span>
                  <span className="font-bold text-slate-800">1 Year Post-Go-Live</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
