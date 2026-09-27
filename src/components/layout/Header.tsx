import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FDA_LOGO_URL } from '../../assets/logo';
import { LIBERIA_SEAL_URL } from '../../assets/liberiaSeal';
import { USER_PERSONAS } from '../../data/initialData';
import { UserRole } from '../../types';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Printer,
  Radio,
  X,
  LogOut,
  Globe
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentPersona,
    setCurrentRole,
    notifications,
    dismissNotification,
    openPrintModal,
    rtmRequirements,
    logoutToPublicPortal
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  return (
    <header className="bg-forest-900 border-b border-forest-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Agency Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center border border-forest-200">
              <img
                src={FDA_LOGO_URL}
                alt="Forestry Development Authority Logo"
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-wide text-white uppercase">
                  Forestry Development Authority
                </span>
                <span className="bg-gold-600/30 text-gold-300 text-xs px-2 py-0.5 rounded border border-gold-500/40 font-semibold tracking-wider">
                  FDA • LIBERIA
                </span>
              </div>
              <p className="text-xs text-forest-200 font-medium">
                Integrated MIS/ERP • Whein Town, Bernard Farm, Montserrado County
              </p>
            </div>
          </div>

          {/* National System Gateways Live Status */}
          <div className="hidden xl:flex items-center space-x-4 bg-forest-950/60 px-3.5 py-1.5 rounded-lg border border-forest-800/80 text-xs">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-200">IFMIS (MFDP):</span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
            <span className="text-forest-700">|</span>
            <div className="flex items-center space-x-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>CSA HRMIS:</span>
              <span className="text-blue-400 font-semibold">Synced</span>
            </div>
            <span className="text-forest-700">|</span>
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>SGS LiberTrace:</span>
              <span className="text-amber-400 font-semibold">Connected</span>
            </div>
          </div>

          {/* Right Action Suite: Print Report, Notification Center, Role Switcher & Logout */}
          <div className="flex items-center space-x-3">
            
            {/* View Public Portal */}
            <button
              onClick={logoutToPublicPortal}
              title="Return to Public Home & Tender Portal"
              className="hidden sm:inline-flex items-center space-x-1.5 bg-forest-950/70 hover:bg-forest-950 text-forest-200 hover:text-white text-xs px-3 py-2 rounded-md font-medium transition border border-forest-800"
            >
              <Globe className="w-3.5 h-3.5 text-gold-400" />
              <span>Public Portal</span>
            </button>

            {/* Quick Print Official Report Button */}
            <button
              onClick={() => openPrintModal({
                type: 'RTM_REPORT',
                data: { title: 'FDA Liberia ERP Executive Compliance Dossier', items: rtmRequirements }
              })}
              title="Print Official Document with FDA Letterhead"
              className="hidden md:inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-forest-100 text-xs px-3 py-2 rounded-md font-medium transition border border-forest-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-2 rounded-lg bg-forest-800/80 hover:bg-forest-700 text-forest-200 hover:text-white transition"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-forest-950 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-forest-700" />
                      Platform Notifications
                    </span>
                    <span className="text-xs text-slate-400">{notifications.length} unread</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">No new notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 hover:bg-slate-50 text-xs transition flex justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{n.title}</p>
                            <p className="text-slate-600 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 inline-block">{n.timestamp}</span>
                          </div>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="text-slate-400 hover:text-slate-700 self-start"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role / Persona Switcher (Segregation of Duties Demo) */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2.5 bg-forest-800 hover:bg-forest-700 border border-forest-700 rounded-lg px-3 py-1.5 text-left transition"
              >
                <div className="w-8 h-8 rounded-full bg-gold-600 flex items-center justify-center font-bold text-white text-xs border border-gold-400">
                  {currentPersona.name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-white leading-tight">{currentPersona.name}</p>
                  <p className="text-[10px] text-forest-300 leading-tight">{currentPersona.title}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-forest-300" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white text-slate-900 rounded-lg shadow-2xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Role Persona (RBAC Enforced)
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sidebar menus dynamically adapt to active role permissions:
                    </p>
                  </div>
                  <div className="max-h-88 overflow-y-auto divide-y divide-slate-100">
                    {Object.values(USER_PERSONAS).map(persona => (
                      <button
                        key={persona.role}
                        onClick={() => {
                          setCurrentRole(persona.role as UserRole);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-forest-50 transition flex items-start space-x-2.5 ${
                          currentPersona.role === persona.role ? 'bg-forest-100/70 border-l-4 border-forest-700' : ''
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-forest-800 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {persona.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{persona.name}</p>
                          <p className="text-[11px] text-forest-800 font-medium">{persona.title}</p>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">
                            {persona.badge}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        logoutToPublicPortal();
                      }}
                      className="w-full text-center py-1.5 text-xs text-red-600 hover:text-red-800 font-semibold flex items-center justify-center space-x-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out to Public Portal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Logout Button */}
            <button
              onClick={logoutToPublicPortal}
              title="Sign Out"
              className="p-2 rounded-lg bg-forest-800/80 hover:bg-red-900/60 text-forest-200 hover:text-red-300 transition border border-forest-700"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Republic of Liberia National Seal (Official Coat of Arms) */}
            <div className="flex items-center space-x-2.5 pl-3 border-l border-forest-800/80">
              <div className="bg-forest-950/80 p-1.5 rounded-lg border border-gold-500/40 shadow-sm flex items-center justify-center">
                <img
                  src={LIBERIA_SEAL_URL}
                  alt="Republic of Liberia National Seal"
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="hidden lg:block text-left">
                <span className="block text-[11px] font-bold text-white uppercase tracking-wider leading-tight">
                  Republic of Liberia
                </span>
                <span className="block text-[10px] text-gold-300/90 italic font-serif leading-tight">
                  The Love of Liberty Brought Us Here
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
