import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CommunityGrievance } from '../../types';
import {
  Users2, Plus, CheckCircle2, AlertCircle, MapPin,
  MessageSquare, Globe
} from 'lucide-react';

const FPIC_STYLES: Record<string, string> = {
  OBTAINED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  NOT_REQUIRED: 'bg-slate-100 text-slate-500',
  WITHDRAWN: 'bg-red-50 text-red-700',
};

const GRIEVANCE_STATUS: Record<string, string> = {
  RECEIVED: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700',
  IN_MEDIATION: 'bg-purple-50 text-purple-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  ESCALATED: 'bg-red-50 text-red-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-orange-50 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-800',
};

export const CommunityModule: React.FC = () => {
  const { communities, grievances, addGrievance, resolveGrievance, addAuditEntry, currentPersona } = useApp();

  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'FPIC' | 'GRIEVANCES'>('REGISTRY');
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState<CommunityGrievance | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const [grievForm, setGrievForm] = useState({
    communityId: '',
    communityName: '',
    county: 'Nimba' as CommunityGrievance['county'],
    filedBy: '',
    grievanceType: 'BOUNDARY_DISPUTE' as CommunityGrievance['grievanceType'],
    priority: 'MEDIUM' as CommunityGrievance['priority'],
    description: '',
    assignedOfficer: currentPersona.name,
    grievanceNo: `FDA-GRV-${new Date().getFullYear()}-${String(grievances.length + 1).padStart(3, '0')}`,
  });

  const COUNTIES = ['Bong','Grand Bassa','Grand Cape Mount','Grand Gedeh','Grand Kru','Lofa','Margibi','Maryland','Montserrado','Nimba','River Cess','River Gee','Sinoe'];

  const openGrievances = grievances.filter(g => !['RESOLVED'].includes(g.status)).length;
  const fpicObtained = communities.filter(c => c.fpicStatus === 'OBTAINED').length;
  const fpicPending = communities.filter(c => c.fpicStatus === 'PENDING').length;

  const handleAddGrievance = () => {
    const community = communities.find(c => c.id === grievForm.communityId);
    addGrievance({
      grievanceNo: grievForm.grievanceNo,
      communityId: grievForm.communityId,
      communityName: community?.communityName || grievForm.communityName,
      county: grievForm.county,
      filedDate: new Date().toISOString().split('T')[0],
      filedBy: grievForm.filedBy,
      grievanceType: grievForm.grievanceType,
      description: grievForm.description,
      priority: grievForm.priority,
      assignedOfficer: grievForm.assignedOfficer,
      status: 'RECEIVED',
    });
    addAuditEntry('Community Grievance Filed', 'OPERATIONS', `Type: ${grievForm.grievanceType}, Community: ${community?.communityName}`);
    setShowGrievanceModal(false);
  };

  const handleResolve = () => {
    if (!showResolveModal) return;
    resolveGrievance(showResolveModal.id, resolveNote);
    addAuditEntry('Grievance Resolved', 'OPERATIONS', `ID: ${showResolveModal.grievanceNo}`);
    setShowResolveModal(null); setResolveNote('');
  };

  const TABS = [
    { id: 'REGISTRY', label: 'Community Registry', icon: Users2 },
    { id: 'FPIC', label: 'FPIC Records', icon: Globe },
    { id: 'GRIEVANCES', label: 'Grievance Register', icon: MessageSquare },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users2 className="w-6 h-6 text-forest-700" /> Community &amp; FPIC
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Social safeguards, Free Prior Informed Consent &amp; grievance management — FDA Liberia</p>
        </div>
        <button onClick={() => setShowGrievanceModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-bold shadow transition">
          <Plus className="w-3.5 h-3.5" /> File Grievance
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Communities Registered', value: communities.length, sub: 'Across all counties', color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'FPIC Obtained', value: fpicObtained, sub: `of ${communities.length} communities`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'FPIC Pending', value: fpicPending, sub: 'Awaiting consent', color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Open Grievances', value: openGrievances, sub: `of ${grievances.length} total`, color: openGrievances > 0 ? 'text-red-700' : 'text-forest-700', bg: openGrievances > 0 ? 'bg-red-50' : 'bg-forest-50' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl border border-slate-200 p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color} mt-1`}>{k.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition -mb-px ${activeTab === t.id ? 'border-forest-700 text-forest-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
              {t.id === 'GRIEVANCES' && openGrievances > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">{openGrievances}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Community Registry */}
      {activeTab === 'REGISTRY' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {communities.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{c.communityName}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3" /> {c.county} County · {c.district}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${FPIC_STYLES[c.fpicStatus] || 'bg-slate-100 text-slate-500'}`}>
                  FPIC: {c.fpicStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-lg p-2.5">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Population</p>
                  <p className="text-sm font-bold text-slate-800">{c.populationEstimate.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">GPS</p>
                  <p className="text-[10px] font-mono text-slate-600 mt-0.5">{c.gpsLat.toFixed(4)}, {c.gpsLon.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Forest Area</p>
                  <p className="text-[10px] font-semibold text-slate-600 mt-0.5">{c.nearbyForestArea}</p>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div><span className="font-semibold">Chief: </span>{c.chiefLeader}</div>
                {c.contactPhone && <div><span className="font-semibold">Phone: </span>{c.contactPhone}</div>}
                <div>
                  <span className="font-semibold">Benefit Sharing: </span>
                  <span className={`font-semibold ${c.benefitSharingStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-600'}`}>{c.benefitSharingStatus.replace(/_/g, ' ')}</span>
                </div>
              </div>
              {c.grievancePending > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  <AlertCircle className="w-3 h-3" />
                  {c.grievancePending} open grievance{c.grievancePending > 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
          {communities.length === 0 && <div className="lg:col-span-2 text-center text-slate-400 py-12">No communities registered yet</div>}
        </div>
      )}

      {/* FPIC Records */}
      {activeTab === 'FPIC' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">FPIC Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">Free Prior Informed Consent tracking per FLEGT/VPA requirements</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Community</th>
                <th className="px-4 py-3 text-left">County / District</th>
                <th className="px-4 py-3 text-left">Chief</th>
                <th className="px-4 py-3 text-right">Population</th>
                <th className="px-4 py-3 text-left">FPIC Status</th>
                <th className="px-4 py-3 text-left">FPIC Date</th>
                <th className="px-4 py-3 text-left">FPIC Ref</th>
                <th className="px-4 py-3 text-left">Benefit Sharing</th>
                <th className="px-4 py-3 text-right">Grievances</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {communities.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.communityName}</td>
                  <td className="px-4 py-3 text-slate-500">{c.county} / {c.district}</td>
                  <td className="px-4 py-3 text-slate-600">{c.chiefLeader}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">{c.populationEstimate.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${FPIC_STYLES[c.fpicStatus] || ''}`}>{c.fpicStatus.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.fpicDate || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{c.fpicRefNo || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.benefitSharingStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {c.benefitSharingStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.grievancePending > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">{c.grievancePending}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grievance Register */}
      {activeTab === 'GRIEVANCES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Community Grievance Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">Track, acknowledge and resolve grievances per IFC Performance Standard 5</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Grievance No</th>
                <th className="px-4 py-3 text-left">Community</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Filed By</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Filed</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grievances.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No grievances filed</td></tr>}
              {grievances.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{g.grievanceNo}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{g.communityName}</td>
                  <td className="px-4 py-3 text-slate-600">{g.grievanceType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-600">{g.filedBy}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PRIORITY_STYLES[g.priority] || ''}`}>{g.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{g.filedDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${GRIEVANCE_STATUS[g.status] || ''}`}>{g.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    {g.status !== 'RESOLVED' && (
                      <button onClick={() => setShowResolveModal(g)} className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition" title="Resolve">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* File Grievance Modal */}
      {showGrievanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">File Community Grievance</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Community *</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={grievForm.communityId} onChange={e => {
                    const comm = communities.find(c => c.id === e.target.value);
                    setGrievForm(f => ({ ...f, communityId: e.target.value, communityName: comm?.communityName || '', county: comm?.county || f.county }));
                  }}>
                    <option value="">Select community…</option>
                    {communities.map(c => <option key={c.id} value={c.id}>{c.communityName} ({c.county})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filed By *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={grievForm.filedBy} onChange={e => setGrievForm(f => ({ ...f, filedBy: e.target.value }))} placeholder="Community rep name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grievance Type *</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={grievForm.grievanceType} onChange={e => setGrievForm(f => ({ ...f, grievanceType: e.target.value as CommunityGrievance['grievanceType'] }))}>
                    <option value="BOUNDARY_DISPUTE">Boundary Dispute</option>
                    <option value="BENEFIT_SHARE_DELAY">Benefit Share Delay</option>
                    <option value="ENVIRONMENTAL_DAMAGE">Environmental Damage</option>
                    <option value="RANGER_CONDUCT">Ranger Conduct</option>
                    <option value="CONCESSION_ENCROACHMENT">Concession Encroachment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={grievForm.priority} onChange={e => setGrievForm(f => ({ ...f, priority: e.target.value as CommunityGrievance['priority'] }))}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description *</label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" rows={3} value={grievForm.description} onChange={e => setGrievForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the grievance..." />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowGrievanceModal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handleAddGrievance} disabled={!grievForm.communityId || !grievForm.filedBy || !grievForm.description} className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                Submit Grievance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">Resolve Grievance</h2>
              <p className="text-xs text-slate-500 mt-0.5">{showResolveModal.grievanceNo}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                <p className="font-semibold mb-1">Grievance:</p>
                <p>{showResolveModal.description}</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resolution Notes *</label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" rows={4} value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Describe resolution outcome and actions taken..." />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowResolveModal(null)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handleResolve} disabled={!resolveNote} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
