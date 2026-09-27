import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FieldRangerIncident, LiberiaCounty } from '../../types';
import {
  TreePine,
  ShieldAlert,
  Radio,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FileCheck2,
  Printer,
  Compass,
  MapPin
} from 'lucide-react';

export const OperationsModule: React.FC = () => {
  const {
    countyStatuses,
    timberConcessions,
    rangerIncidents,
    reportRangerIncident,
    escalateIncidentToMD,
    syncCountyOffice,
    currentPersona,
    openPrintModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'COUNTIES' | 'CONCESSIONS' | 'INCIDENTS'>('COUNTIES');
  const [showAddIncidentModal, setShowAddIncidentModal] = useState(false);

  // New Incident state
  const [newIncident, setNewIncident] = useState({
    county: 'Nimba' as LiberiaCounty,
    locationDetails: '',
    type: 'ILLEGAL_PIT_SAWING' as FieldRangerIncident['type'],
    severity: 'HIGH' as FieldRangerIncident['severity'],
    description: '',
    reportedBy: currentPersona.name,
    evidenceCount: 3
  });

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.locationDetails || !newIncident.description) return;
    reportRangerIncident(newIncident);
    setShowAddIncidentModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              TOR §6 Forestry Operations
            </span>
            <span className="text-xs text-slate-500 font-mono">SGS LiberTrace CoC Active</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Forestry Field Operations & Field-to-HQ Data Exchange
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Decentralized County Sync across 15 Counties • Concession Permitting & Timber Traceability • Ranger Protection Patrols
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowAddIncidentModal(true)}
            className="inline-flex items-center space-x-1.5 bg-red-700 hover:bg-red-600 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Log Ranger Incident</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('COUNTIES')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'COUNTIES'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Field-to-HQ County Sync (15 Counties)</span>
        </button>

        <button
          onClick={() => setActiveTab('CONCESSIONS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'CONCESSIONS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TreePine className="w-4 h-4" />
          <span>Timber Concessions & SGS LiberTrace ({timberConcessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'INCIDENTS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Ranger Incidents & Seizures ({rangerIncidents.length})</span>
        </button>
      </div>

      {/* TAB 1: COUNTIES */}
      {activeTab === 'COUNTIES' && (
        <div className="space-y-4">
          <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 text-xs text-forest-900 flex items-start space-x-3">
            <Radio className="w-5 h-5 text-forest-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Offline-First Field-to-HQ Architecture (TOR §8)</p>
              <p className="text-forest-700 mt-0.5">
                County forest stations (e.g. Sapo National Park, Nimba, Lofa) queue transaction logs, timber scaling measurements, and ranger patrol incident packets locally. When satellite (Starlink) or cellular connectivity is present, batches automatically sync to Whein Town Bernard Farm HQ.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {countyStatuses.map(st => (
              <div key={st.county} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{st.county} County</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    st.syncStatus === 'SYNCED_REALTIME'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {st.syncStatus === 'SYNCED_REALTIME' ? 'REALTIME' : 'PENDING'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <p className="text-[11px] text-slate-500 font-medium">{st.stationHub}</p>
                  <p className="text-[11px] text-slate-400">{st.region}</p>
                  <div className="flex justify-between pt-1">
                    <span>Rangers on Duty:</span>
                    <strong className="text-slate-900">{st.rangersOnDuty}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Concessions:</span>
                    <strong className="text-slate-900">{st.activeConcessions}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Last: {st.lastSyncTimestamp.split(' ')[1]}
                  </span>
                  {st.syncStatus !== 'SYNCED_REALTIME' ? (
                    <button
                      onClick={() => syncCountyOffice(st.county)}
                      className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2.5 py-1 rounded transition flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync ({st.pendingRecords})</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" />
                      Synced
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CONCESSIONS */}
      {activeTab === 'CONCESSIONS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Commercial & Community Timber Concessions</h3>
                <p className="text-xs text-slate-500">Cross-referenced with SGS LiberTrace Chain of Custody (CoC)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Permit # / Concessionaire</th>
                    <th className="px-4 py-3">Contract Type</th>
                    <th className="px-4 py-3">County & Area</th>
                    <th className="px-4 py-3">SGS LiberTrace CoC ID</th>
                    <th className="px-4 py-3 text-center">AOP Status</th>
                    <th className="px-4 py-3 text-center">Revenue Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timberConcessions.map(conc => (
                    <tr key={conc.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{conc.permitNumber}</div>
                        <div className="text-slate-800 font-semibold">{conc.holderName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {conc.concessionType}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{conc.county} County</div>
                        <div className="text-[11px] text-slate-500">{conc.areaHectares.toLocaleString()} Hectares</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-700 font-bold">
                        {conc.sgsLiberTraceId}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          conc.annualOperationalPlanStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {conc.annualOperationalPlanStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          conc.revenueStatus === 'ROYALTIES_CURRENT'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-red-50 text-red-800'
                        }`}>
                          {conc.revenueStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INCIDENTS */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ranger Law Enforcement Patrol Log</h3>
                <p className="text-xs text-slate-500">Deforestation alerts, chainsaw seizures, boundary encroachments</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {rangerIncidents.map(inc => (
                <div key={inc.id} className="p-4 space-y-2 hover:bg-slate-50/70 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{inc.incidentNo}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {inc.severity} SEVERITY
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {inc.county} County • {inc.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">Date: {inc.incidentDate}</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {inc.description}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <div>
                      <span>Location: <strong>{inc.locationDetails}</strong></span>
                      <span className="mx-2">•</span>
                      <span>Officer: {inc.reportedBy}</span>
                      <span className="mx-2">•</span>
                      <span>Evidence Items: {inc.evidenceCount} photos/GPS points</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-700">Status: {inc.status}</span>
                      {inc.status === 'INVESTIGATING' && (
                        <button
                          onClick={() => escalateIncidentToMD(inc.id)}
                          className="bg-red-700 hover:bg-red-600 text-white text-[11px] px-2.5 py-1 rounded font-bold transition shadow-sm"
                        >
                          Escalate to Managing Director
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Incident Modal */}
      {showAddIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Log Ranger Forest Protection Incident</h3>
              </div>
              <button
                onClick={() => setShowAddIncidentModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">County Sector</label>
                  <select
                    value={newIncident.county}
                    onChange={e => setNewIncident({ ...newIncident, county: e.target.value as LiberiaCounty })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="Nimba">Nimba</option>
                    <option value="Sinoe">Sinoe</option>
                    <option value="Grand Bassa">Grand Bassa</option>
                    <option value="Lofa">Lofa</option>
                    <option value="Gbarpolu">Gbarpolu</option>
                    <option value="Grand Gedeh">Grand Gedeh</option>
                    <option value="Rivercess">Rivercess</option>
                    <option value="Montserrado">Montserrado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Incident Classification</label>
                  <select
                    value={newIncident.type}
                    onChange={e => setNewIncident({ ...newIncident, type: e.target.value as FieldRangerIncident['type'] })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="ILLEGAL_PIT_SAWING">Illegal Pit-Sawing</option>
                    <option value="CHAINSAW_SEIZURE">Chainsaw Confiscation</option>
                    <option value="ENCROACHMENT">Protected Demarcation Encroachment</option>
                    <option value="UNAUTHORIZED_HAULING">Log Hauling without Waybill</option>
                    <option value="WILDLIFE_TRAFFICKING">Poaching & Wildlife Protection</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Location Coordinates & Landmarks</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sapo National Park Southern Perimeter, GPS 5.3412 N, 8.7891 W"
                  value={newIncident.locationDetails}
                  onChange={e => setNewIncident({ ...newIncident, locationDetails: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Threat Severity</label>
                  <select
                    value={newIncident.severity}
                    onChange={e => setNewIncident({ ...newIncident, severity: e.target.value as FieldRangerIncident['severity'] })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="MEDIUM">Medium Severity</option>
                    <option value="HIGH">High Severity</option>
                    <option value="CRITICAL">Critical (Immediate MD Escalation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Evidence Files Count</label>
                  <input
                    type="number"
                    value={newIncident.evidenceCount}
                    onChange={e => setNewIncident({ ...newIncident, evidenceCount: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Field Incident Narrative & Seizure Inventory</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe ranger patrol findings, equipment confiscated, suspects apprehended..."
                  value={newIncident.description}
                  onChange={e => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddIncidentModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded font-bold transition shadow"
                >
                  Transmit Report to HQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
