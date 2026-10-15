import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpeciesSighting } from '../../types';
import {
  Leaf, Plus, Eye, MapPin, AlertTriangle, Camera, Shield
} from 'lucide-react';

const THREAT_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-50 text-orange-700',
  MODERATE: 'bg-amber-50 text-amber-700',
  LOW: 'bg-emerald-50 text-emerald-700',
};

const CONSERVATION_STYLES: Record<string, string> = {
  CRITICALLY_ENDANGERED: 'bg-red-100 text-red-800',
  ENDANGERED: 'bg-orange-50 text-orange-700',
  VULNERABLE: 'bg-amber-50 text-amber-700',
  NEAR_THREATENED: 'bg-blue-50 text-blue-700',
  LEAST_CONCERN: 'bg-emerald-50 text-emerald-700',
};

const AREA_STATUS_STYLES: Record<string, string> = {
  STABLE: 'bg-emerald-50 text-emerald-700',
  UNDER_PRESSURE: 'bg-amber-50 text-amber-700',
  DEGRADED: 'bg-red-50 text-red-700',
  RECOVERING: 'bg-blue-50 text-blue-700',
};

export const BiodiversityModule: React.FC = () => {
  const { protectedAreas, speciesSightings, addSpeciesSighting, addAuditEntry, currentPersona } = useApp();

  const [activeTab, setActiveTab] = useState<'AREAS' | 'SIGHTINGS' | 'LOG'>('AREAS');
  const [showSightingModal, setShowSightingModal] = useState(false);

  const [sightingForm, setSightingForm] = useState({
    sightingNo: `FDA-SIT-${new Date().getFullYear()}-${String(speciesSightings.length + 1).padStart(3, '0')}`,
    protectedAreaId: '',
    protectedAreaName: '',
    county: 'Sinoe' as SpeciesSighting['county'],
    species: '',
    conservationStatus: 'VULNERABLE' as SpeciesSighting['conservationStatus'],
    individualCount: 1,
    gpsLat: 0,
    gpsLon: 0,
    recordedBy: currentPersona.name,
    method: 'DIRECT_OBSERVATION' as SpeciesSighting['method'],
    threatObserved: false,
    notes: '',
    sightingDate: new Date().toISOString().split('T')[0],
  });

  const totalSpecies = new Set(speciesSightings.map(s => s.species)).size;
  const criticalSightings = speciesSightings.filter(s => s.conservationStatus === 'CRITICALLY_ENDANGERED').length;
  const totalCameraTraps = protectedAreas.reduce((sum, a) => sum + a.cameraTraps, 0);
  const avgBioScore = protectedAreas.length > 0
    ? Math.round(protectedAreas.reduce((sum, a) => sum + a.biodiversityScore, 0) / protectedAreas.length)
    : 0;

  const handleAddSighting = () => {
    const area = protectedAreas.find(a => a.id === sightingForm.protectedAreaId);
    addSpeciesSighting({
      sightingNo: sightingForm.sightingNo,
      protectedAreaId: sightingForm.protectedAreaId,
      protectedAreaName: area?.name || sightingForm.protectedAreaName,
      county: sightingForm.county,
      sightingDate: sightingForm.sightingDate,
      species: sightingForm.species,
      conservationStatus: sightingForm.conservationStatus,
      individualCount: sightingForm.individualCount,
      gpsLat: sightingForm.gpsLat,
      gpsLon: sightingForm.gpsLon,
      recordedBy: sightingForm.recordedBy,
      method: sightingForm.method,
      threatObserved: sightingForm.threatObserved,
      notes: sightingForm.notes,
    });
    addAuditEntry('Species Sighting Recorded', 'OPERATIONS', `Species: ${sightingForm.species}, Status: ${sightingForm.conservationStatus}`);
    setShowSightingModal(false);
  };

  const TABS = [
    { id: 'AREAS', label: 'Protected Areas', icon: Shield },
    { id: 'SIGHTINGS', label: 'Species Sightings', icon: Eye },
    { id: 'LOG', label: 'Monitoring Log', icon: Camera },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Leaf className="w-6 h-6 text-forest-700" /> Biodiversity &amp; Wildlife
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Protected areas monitoring, species sightings &amp; wildlife surveillance — FDA Liberia</p>
        </div>
        <button onClick={() => setShowSightingModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-bold shadow transition">
          <Plus className="w-3.5 h-3.5" /> Log Sighting
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Protected Areas', value: protectedAreas.length, sub: 'National & community reserves', color: 'text-forest-700', bg: 'bg-forest-50' },
          { label: 'Species Recorded', value: totalSpecies, sub: `${speciesSightings.length} total sightings`, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Critically Endangered', value: criticalSightings, sub: 'Sightings on record', color: criticalSightings > 0 ? 'text-red-700' : 'text-emerald-700', bg: criticalSightings > 0 ? 'bg-red-50' : 'bg-emerald-50' },
          { label: 'Avg Biodiversity Score', value: `${avgBioScore}/100`, sub: `${totalCameraTraps} camera traps active`, color: 'text-purple-700', bg: 'bg-purple-50' },
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
            </button>
          );
        })}
      </div>

      {/* Protected Areas */}
      {activeTab === 'AREAS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {protectedAreas.map(area => (
            <div key={area.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{area.name}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3" /> {area.county} · {area.areaHectares.toLocaleString()} ha · Est. {area.establishedYear}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${THREAT_STYLES[area.threatLevel] || ''}`}>
                    {area.threatLevel} THREAT
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${AREA_STATUS_STYLES[area.status] || ''}`}>
                    {area.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Biodiversity Score */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Biodiversity Score</span>
                  <span className={`font-extrabold ${area.biodiversityScore >= 70 ? 'text-forest-700' : area.biodiversityScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                    {area.biodiversityScore}/100
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${area.biodiversityScore >= 70 ? 'bg-forest-500' : area.biodiversityScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${area.biodiversityScore}%` }} />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Key Species</p>
                <div className="flex flex-wrap gap-1">
                  {area.keySpecies.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-forest-50 text-forest-700 text-[10px] font-semibold rounded">{s}</span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2.5 text-center text-xs">
                <div>
                  <p className="text-[10px] text-slate-400">Rangers</p>
                  <p className="font-bold text-slate-800">{area.rangerCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Camera Traps</p>
                  <p className="font-bold text-slate-800">{area.cameraTraps}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Last Survey</p>
                  <p className="font-semibold text-slate-600 text-[10px]">{area.lastSurveyDate}</p>
                </div>
              </div>
            </div>
          ))}
          {protectedAreas.length === 0 && <div className="lg:col-span-2 text-center text-slate-400 py-12">No protected areas registered</div>}
        </div>
      )}

      {/* Species Sightings */}
      {activeTab === 'SIGHTINGS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Species Observation Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">IUCN Red List status tracked for all sightings</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Sighting No</th>
                <th className="px-4 py-3 text-left">Species</th>
                <th className="px-4 py-3 text-left">IUCN Status</th>
                <th className="px-4 py-3 text-right">Count</th>
                <th className="px-4 py-3 text-left">Protected Area</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Observer</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Threat?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {speciesSightings.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No sightings logged</td></tr>}
              {speciesSightings.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{s.sightingNo}</td>
                  <td className="px-4 py-3 font-semibold italic text-slate-800">{s.species}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${CONSERVATION_STYLES[s.conservationStatus] || ''}`}>
                      {s.conservationStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{s.individualCount}</td>
                  <td className="px-4 py-3 text-slate-500">{s.protectedAreaName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.method.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-600">{s.recordedBy}</td>
                  <td className="px-4 py-3 text-slate-500">{s.sightingDate}</td>
                  <td className="px-4 py-3">
                    {s.threatObserved ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700">⚠ Yes</span>
                    ) : (
                      <span className="text-slate-300 text-[10px]">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Monitoring Log */}
      {activeTab === 'LOG' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {protectedAreas.map(area => (
              <div key={area.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">{area.name}</h4>
                <div className="space-y-2 text-xs">
                  {[
                    ['Sightings Logged', speciesSightings.filter(s => s.protectedAreaId === area.id).length.toString(), 'text-forest-700'],
                    ['Unique Species', new Set(speciesSightings.filter(s => s.protectedAreaId === area.id).map(s => s.species)).size.toString(), 'text-blue-700'],
                    ['Camera Traps', area.cameraTraps.toString(), 'text-slate-700'],
                    ['Rangers', area.rangerCount.toString(), 'text-slate-700'],
                    ['Last Survey', area.lastSurveyDate, 'text-slate-500'],
                  ].map(([label, val, cls]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500">{label}:</span>
                      <span className={`font-bold ${cls}`}>{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Area Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${AREA_STATUS_STYLES[area.status]}`}>{area.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {criticalSightings > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-red-800">Critically Endangered Species — Immediate Action Required</h3>
              </div>
              <div className="space-y-1">
                {speciesSightings.filter(s => s.conservationStatus === 'CRITICALLY_ENDANGERED').map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-red-700">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                    <span className="font-semibold italic">{s.species}</span>
                    <span>— {s.protectedAreaName} · {s.sightingDate}</span>
                    {s.threatObserved && <span className="text-red-500 font-bold">⚠ Threat Observed</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Sighting Modal */}
      {showSightingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-900">Log Species Sighting</h2>
              <p className="text-xs text-slate-500 mt-0.5">Record a wildlife observation from field patrol or camera trap</p>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Protected Area *</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={sightingForm.protectedAreaId} onChange={e => {
                    const area = protectedAreas.find(a => a.id === e.target.value);
                    setSightingForm(f => ({ ...f, protectedAreaId: e.target.value, protectedAreaName: area?.name || '', county: area?.county || f.county }));
                  }}>
                    <option value="">Select area…</option>
                    {protectedAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Species (Scientific Name) *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs italic" value={sightingForm.species} onChange={e => setSightingForm(f => ({ ...f, species: e.target.value }))} placeholder="e.g. Pan troglodytes verus" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">IUCN Status *</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={sightingForm.conservationStatus} onChange={e => setSightingForm(f => ({ ...f, conservationStatus: e.target.value as SpeciesSighting['conservationStatus'] }))}>
                    <option value="CRITICALLY_ENDANGERED">Critically Endangered</option>
                    <option value="ENDANGERED">Endangered</option>
                    <option value="VULNERABLE">Vulnerable</option>
                    <option value="NEAR_THREATENED">Near Threatened</option>
                    <option value="LEAST_CONCERN">Least Concern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observation Method</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={sightingForm.method} onChange={e => setSightingForm(f => ({ ...f, method: e.target.value as SpeciesSighting['method'] }))}>
                    <option value="DIRECT_OBSERVATION">Direct Observation</option>
                    <option value="CAMERA_TRAP">Camera Trap</option>
                    <option value="ACOUSTIC_SURVEY">Acoustic Survey</option>
                    <option value="TRACK_SIGN">Track / Sign</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Individual Count</label>
                  <input type="number" min="1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={sightingForm.individualCount} onChange={e => setSightingForm(f => ({ ...f, individualCount: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GPS Lat</label>
                  <input type="number" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" value={sightingForm.gpsLat || ''} onChange={e => setSightingForm(f => ({ ...f, gpsLat: parseFloat(e.target.value) || 0 }))} placeholder="6.1234" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GPS Lon</label>
                  <input type="number" step="0.0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" value={sightingForm.gpsLon || ''} onChange={e => setSightingForm(f => ({ ...f, gpsLon: parseFloat(e.target.value) || 0 }))} placeholder="-10.567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recorded By</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" value={sightingForm.recordedBy} onChange={e => setSightingForm(f => ({ ...f, recordedBy: e.target.value }))} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input type="checkbox" className="rounded" checked={sightingForm.threatObserved} onChange={e => setSightingForm(f => ({ ...f, threatObserved: e.target.checked }))} />
                    Threat/Poaching Activity Observed
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Field Notes</label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" rows={2} value={sightingForm.notes} onChange={e => setSightingForm(f => ({ ...f, notes: e.target.value }))} placeholder="Behavioral observations, habitat, group composition..." />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowSightingModal(false)} className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handleAddSighting} disabled={!sightingForm.protectedAreaId || !sightingForm.species} className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                <Eye className="w-3.5 h-3.5 inline mr-1" />Log Sighting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
