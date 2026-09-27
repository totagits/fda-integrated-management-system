import React from 'react';
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
  Sparkles
} from 'lucide-react';

export const SecurityModule: React.FC = () => {
  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
            REOI §5 & §6 Compliance
          </span>
          <span className="text-xs text-slate-500 font-mono">CISSP Security Posture</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mt-1">
          Cybersecurity Architecture, Business Continuity & Technical Handover
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Certified Information Systems Security Professional (CISSP) Standard • Disaster Recovery (RTO/RPO) • Full Source Code Handover
        </p>
      </div>

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
  );
};
