import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FDA_LOGO_URL } from '../../assets/logo';
import { FixedAsset } from '../../types';
import {
  Box,
  QrCode,
  TrendingDown,
  Truck,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Fuel,
  BatteryCharging,
  Layers
} from 'lucide-react';

export const AssetModule: React.FC = () => {
  const {
    fixedAssets,
    depotTransfers,
    consumableInventory,
    addFixedAsset,
    transferAssetToCounty,
    confirmDepotReceipt,
    openPrintModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'REGISTER' | 'DEPRECIATION' | 'TRANSFERS' | 'CONSUMABLES'>('REGISTER');
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<FixedAsset | null>(fixedAssets[0] || null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // New Asset state
  const [newAsset, setNewAsset] = useState({
    assetTag: `FDA-VEH-2026-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    category: 'VEHICLES' as FixedAsset['category'],
    serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
    purchaseDate: new Date().toISOString().substring(0, 10),
    purchaseCostUSD: 45000,
    usefulLifeYears: 5,
    salvageValueUSD: 5000,
    location: 'Whein Town HQ - Bernard Farm',
    assignedStaff: 'HQ Motor Pool Command',
    condition: 'OPERATIONAL' as const
  });

  // Transfer state
  const [transferTarget, setTransferTarget] = useState({
    assetTag: fixedAssets[0]?.assetTag || '',
    destination: 'Sanniquellie Field Office - Nimba'
  });

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name) return;
    addFixedAsset(newAsset);
    setShowAddAssetModal(false);
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = fixedAssets.find(a => a.assetTag === transferTarget.assetTag);
    if (!asset) return;
    transferAssetToCounty(asset.assetTag, asset.name, transferTarget.destination);
    setShowTransferModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
              TOR §6 Asset & Depot Control
            </span>
            <span className="text-xs text-slate-500 font-mono">Barcode / QR Enabled</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Fixed Asset Register, QR Tagging & Depot Logistics
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Automated Straight-Line Depreciation • HQ to County Custody Transfers • Consumables & Patrol Stores
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowTransferModal(true)}
            className="inline-flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg font-bold border border-blue-200 transition"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Dispatch to County Depot</span>
          </button>
          <button
            onClick={() => setShowAddAssetModal(true)}
            className="inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Fixed Asset</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('REGISTER')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'REGISTER'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Fixed Asset Register ({fixedAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DEPRECIATION')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'DEPRECIATION'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Depreciation Schedules (Straight-Line)</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'TRANSFERS'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Inter-County Depot Transfers ({depotTransfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CONSUMABLES')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            activeTab === 'CONSUMABLES'
              ? 'border-forest-700 text-forest-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stores & Patrol Consumables</span>
        </button>
      </div>

      {/* TAB 1: REGISTER & QR TAGS */}
      {activeTab === 'REGISTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Asset List Table (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tracked Physical Assets</h3>
              <span className="text-xs text-slate-500">Click any row to inspect QR tag</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tag # / Barcode</th>
                    <th className="px-4 py-3">Asset Description</th>
                    <th className="px-4 py-3">Current Location</th>
                    <th className="px-4 py-3 text-right">Book Value</th>
                    <th className="px-4 py-3 text-center">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fixedAssets.map(asset => (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAssetForQR(asset)}
                      className={`cursor-pointer transition ${
                        selectedAssetForQR?.id === asset.id ? 'bg-forest-50/80 font-medium' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900">{asset.assetTag}</div>
                        <div className="text-[10px] font-mono text-slate-400">{asset.barcode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{asset.name}</div>
                        <div className="text-[11px] text-slate-500">SN: {asset.serialNumber}</div>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {asset.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{asset.location}</div>
                        <div className="text-[10px] text-slate-400">Custody: {asset.assignedStaff}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-bold text-slate-900">${asset.currentBookValueUSD.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">Cost: ${asset.purchaseCostUSD.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                          {asset.condition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive QR / Barcode Card (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-forest-700" />
                <h3 className="font-bold text-sm text-slate-900">Standard FDA Asset Tag</h3>
              </div>
              <button
                onClick={() => selectedAssetForQR && openPrintModal({
                  type: 'ASSET_TAG',
                  data: selectedAssetForQR
                })}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1 rounded border border-slate-300 flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Tag</span>
              </button>
            </div>

            {selectedAssetForQR ? (
              <div className="bg-slate-50 border-2 border-dashed border-forest-600 rounded-xl p-4 text-center space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <img src={FDA_LOGO_URL} alt="FDA Logo" className="w-8 h-8 object-contain" />
                  <div className="text-left">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-forest-900">
                      Forestry Development Authority
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold">Government of Liberia Asset Tag</p>
                  </div>
                </div>

                {/* Simulated Visual QR Matrix */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 inline-block shadow-inner">
                  <div className="w-32 h-32 bg-slate-900 text-white flex flex-col items-center justify-center font-mono text-[9px] p-2 rounded relative">
                    {/* Simulated 2D Data Matrix / QR Code graphics */}
                    <div className="absolute inset-2 grid grid-cols-6 grid-rows-6 gap-0.5 opacity-90">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`${
                            (i % 2 === 0 || i % 7 === 0 || i === 0 || i === 5 || i === 30 || i === 35)
                              ? 'bg-white'
                              : 'bg-transparent'
                          } rounded-xs`}
                        ></div>
                      ))}
                    </div>
                    <div className="z-10 bg-white p-1 rounded">
                      <img src={FDA_LOGO_URL} alt="Seal" className="w-6 h-6 object-contain" />
                    </div>
                  </div>
                </div>

                <div className="font-mono">
                  <p className="font-extrabold text-sm text-slate-900 tracking-wider">
                    {selectedAssetForQR.assetTag}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Barcode: {selectedAssetForQR.barcode}
                  </p>
                </div>

                <div className="text-[11px] text-slate-600 text-left bg-white p-2.5 rounded border border-slate-200 space-y-0.5">
                  <p><strong>Item:</strong> {selectedAssetForQR.name}</p>
                  <p><strong>Serial #:</strong> {selectedAssetForQR.serialNumber}</p>
                  <p><strong>Location:</strong> {selectedAssetForQR.location}</p>
                  <p><strong>Custodian:</strong> {selectedAssetForQR.assignedStaff}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">Select an asset from the register</p>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: DEPRECIATION SCHEDULES */}
      {activeTab === 'DEPRECIATION' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <TrendingDown className="w-5 h-5 text-forest-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Automated Straight-Line Depreciation Engine (TOR §6)
              </h3>
              <p className="text-xs text-slate-500">
                Formula: Annual Depreciation = (Initial Cost - Salvage Value) ÷ Useful Life Years
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Asset Tag & Name</th>
                  <th className="px-4 py-3 text-right">Initial Cost</th>
                  <th className="px-4 py-3 text-center">Useful Life</th>
                  <th className="px-4 py-3 text-right">Salvage Value</th>
                  <th className="px-4 py-3 text-right">Annual Deprec.</th>
                  <th className="px-4 py-3 text-right font-bold text-forest-800">Net Book Value (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {fixedAssets.map(asset => {
                  const annualDep = Math.round((asset.purchaseCostUSD - asset.salvageValueUSD) / asset.usefulLifeYears);
                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-slate-900">{asset.name}</div>
                        <span className="font-mono text-xs text-slate-500">{asset.assetTag}</span>
                      </td>
                      <td className="px-4 py-3 text-right">${asset.purchaseCostUSD.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">{asset.usefulLifeYears} Years</td>
                      <td className="px-4 py-3 text-right text-slate-500">${asset.salvageValueUSD.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-red-600">-${annualDep.toLocaleString()}/yr</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                        ${asset.currentBookValueUSD.toLocaleString()} USD
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFERS */}
      {activeTab === 'TRANSFERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inter-County Custody Transfer Records</h3>
                <p className="text-xs text-slate-500">Waybills and physical handover between Whein Town HQ and regional depots</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {depotTransfers.map(trf => (
                <div key={trf.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-slate-900">{trf.transferNo}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        trf.status === 'CONFIRMED_AT_DEPOT'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {trf.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {trf.assetName} ({trf.assetTag})
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                      <span>{trf.origin}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-slate-800">{trf.destination}</strong>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Dispatched by: {trf.dispatchedBy} on {trf.dispatchedDate}
                      {trf.receivedBy && ` • Received by: ${trf.receivedBy}`}
                    </p>
                  </div>

                  <div className="shrink-0 self-end md:self-center">
                    {trf.status === 'IN_TRANSIT' ? (
                      <button
                        onClick={() => confirmDepotReceipt(trf.id)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold shadow-sm transition flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Acknowledge Depot Receipt</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded">
                        Depot Inventory Updated
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONSUMABLES */}
      {activeTab === 'CONSUMABLES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {consumableInventory.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">{item.itemCode}</span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {item.category.replace(/_/g, ' ')}
                </span>
              </div>

              <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
              <p className="text-xs text-slate-500">Location: {item.depotLocation}</p>

              <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between font-mono">
                <div>
                  <span className="text-[11px] text-slate-500 font-sans">Stock Balance:</span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">
                    {item.quantityInStock} {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-sans">Reorder Threshold:</span>
                  <p className="text-xs text-amber-700 font-bold">{item.reorderLevel} {item.unit}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboard Asset Modal */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Register Physical Asset</h3>
              </div>
              <button
                onClick={() => setShowAddAssetModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Asset Tag Reference</label>
                  <input
                    type="text"
                    required
                    value={newAsset.assetTag}
                    onChange={e => setNewAsset({ ...newAsset, assetTag: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={newAsset.category}
                    onChange={e => setNewAsset({ ...newAsset, category: e.target.value as FixedAsset['category'] })}
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                  >
                    <option value="VEHICLES">Vehicles & Transport</option>
                    <option value="FIELD_EQUIPMENT">Field & Patrol Equipment</option>
                    <option value="IT_HARDWARE">IT & Servers</option>
                    <option value="COMMUNICATION">Satellite & Radio Systems</option>
                    <option value="HEAVY_MACHINERY">Heavy Machinery & Solar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Asset Name / Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Toyota Hilux 4x4 Patrol Double-Cab"
                  value={newAsset.name}
                  onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Serial / VIN Number</label>
                  <input
                    type="text"
                    required
                    value={newAsset.serialNumber}
                    onChange={e => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purchase Cost (USD)</label>
                  <input
                    type="number"
                    required
                    value={newAsset.purchaseCostUSD}
                    onChange={e => setNewAsset({ ...newAsset, purchaseCostUSD: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Useful Life (Years)</label>
                  <input
                    type="number"
                    required
                    value={newAsset.usefulLifeYears}
                    onChange={e => setNewAsset({ ...newAsset, usefulLifeYears: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Salvage Value (USD)</label>
                  <input
                    type="number"
                    required
                    value={newAsset.salvageValueUSD}
                    onChange={e => setNewAsset({ ...newAsset, salvageValueUSD: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded font-bold transition shadow"
                >
                  Save & Generate Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Dispatch Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Dispatch Asset to County Depot</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatch} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Asset to Dispatch</label>
                <select
                  value={transferTarget.assetTag}
                  onChange={e => setTransferTarget({ ...transferTarget, assetTag: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                >
                  {fixedAssets.map(a => (
                    <option key={a.id} value={a.assetTag}>{a.assetTag} — {a.name} ({a.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Destination County Depot Station</label>
                <select
                  value={transferTarget.destination}
                  onChange={e => setTransferTarget({ ...transferTarget, destination: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                >
                  <option value="Sanniquellie Field Office - Nimba">Sanniquellie Field Office - Nimba</option>
                  <option value="Greenville Regional Hub - Sinoe">Greenville Regional Hub - Sinoe</option>
                  <option value="Port of Buchanan FDA Control Point - Grand Bassa">Port of Buchanan FDA Control Point - Grand Bassa</option>
                  <option value="Voinjama Depot Outpost - Lofa">Voinjama Depot Outpost - Lofa</option>
                  <option value="Bopolu Field Station - Gbarpolu">Bopolu Field Station - Gbarpolu</option>
                  <option value="Zwedru Regional Command - Grand Gedeh">Zwedru Regional Command - Grand Gedeh</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded font-bold transition shadow"
                >
                  Issue Waybill & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
