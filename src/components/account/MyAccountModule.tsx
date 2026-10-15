import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FDA_LOGO_URL } from '../../assets/logo';
import { LIBERIA_SEAL_URL } from '../../assets/liberiaSeal';
import {
  User,
  Calendar,
  Clock,
  FileText,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Camera,
  Mail,
  Phone,
  MapPin,
  Lock,
  Download,
  Printer,
  ChevronRight,
  PlusCircle,
  Briefcase,
  Heart,
  Landmark,
  KeyRound,
  Compass,
  Radio,
  FileCheck2,
  HelpCircle,
  GraduationCap,
  Award,
  BookOpen,
  TrendingUp,
  Check
} from 'lucide-react';
import { LeaveRequest, EmployeeTrainingEnrollment } from '../../types';

// Official Republic of Liberia Statutory Public Holidays (Act of Legislature)
const LIBERIA_STATUTORY_HOLIDAYS = [
  { name: "New Year's Day", date: "January 1", status: "National Holiday", description: "First day of the civil year across Liberia." },
  { name: "Armed Forces Day", date: "February 11", status: "National Holiday", description: "Commemorates the Armed Forces of Liberia (AFL)." },
  { name: "Decoration Day", date: "2nd Wednesday in March", status: "Public Holiday", description: "Day of remembrance and gravesite decoration for departed loved ones." },
  { name: "J.J. Roberts' Birthday", date: "March 15", status: "National Holiday", description: "Honoring Joseph Jenkins Roberts, the first President of the Republic of Liberia." },
  { name: "Fast and Prayer Day", date: "2nd Friday in April", status: "Public Holiday", description: "National day of supplication, fasting, and prayer for peace and prosperity." },
  { name: "National Unification Day", date: "May 14", status: "National Holiday", description: "Celebrates the integration and national solidarity policy of 1960." },
  { name: "Independence Day", date: "July 26", status: "National Holiday", description: "Commemorating the Declaration of Independence in 1847 (Grand National Day)." },
  { name: "National Flag Day", date: "August 24", status: "National Holiday", description: "Honoring the Liberian Lone Star national flag designed in 1847." },
  { name: "Thanksgiving Day", date: "1st Thursday in November", status: "Public Holiday", description: "National day of giving thanks for the nation's preservation and harvest." },
  { name: "William V.S. Tubman's Birthday", date: "November 29", status: "National Holiday", description: "Honoring the 19th President of Liberia and the Open Door Policy." },
  { name: "Christmas Day", date: "December 25", status: "National Holiday", description: "Observance of the nativity and festive national holiday." }
];

export const MyAccountModule: React.FC = () => {
  const {
    activeEmployee,
    updateEmployeeProfile,
    changePassword,
    leaveRequests,
    submitLeaveRequest,
    payrollRecords,
    fieldAttendanceLogs,
    logFieldAttendance,
    openPrintModal,
    currentPersona,
    trainingPrograms,
    trainingEnrollments,
    updateTrainingProgress
  } = useApp();

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'LEAVE' | 'HOURS' | 'PAYSTUBS' | 'TRAINING'>('DETAILS');

  // Form states for profile editing
  const [email, setEmail] = useState(activeEmployee.email || '');
  const [phone, setPhone] = useState(activeEmployee.phone || '');
  const [address, setAddress] = useState(activeEmployee.address || `${activeEmployee.dutyStation}, ${activeEmployee.county} County`);
  const [emergencyName, setEmergencyName] = useState(activeEmployee.emergencyContact?.name || 'Maima Toe');
  const [emergencyRel, setEmergencyRel] = useState(activeEmployee.emergencyContact?.relationship || 'Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState(activeEmployee.emergencyContact?.phone || '+231 886 112 334');
  const [avatarUrl, setAvatarUrl] = useState(activeEmployee.avatarUrl || '');

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Leave request form state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('ANNUAL');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [handoverPerson, setHandoverPerson] = useState('');

  // Selected paystub
  const userPayrollRecords = payrollRecords.filter(p =>
    p.employeeId === activeEmployee.id || p.employeeName.toLowerCase().includes(activeEmployee.fullName.toLowerCase().split(' ')[0])
  );
  const [selectedPaystub, setSelectedPaystub] = useState(userPayrollRecords[0] || payrollRecords[0]);

  // Employee-specific leaves
  const userLeaveRequests = leaveRequests.filter(l =>
    l.employeeId === activeEmployee.id || l.employeeName.toLowerCase().includes(activeEmployee.fullName.toLowerCase().split(' ')[0])
  );

  // Employee-specific attendance
  const userAttendanceLogs = fieldAttendanceLogs.filter(a =>
    a.employeeId === activeEmployee.id || a.employeeName.toLowerCase().includes(activeEmployee.fullName.toLowerCase().split(' ')[0])
  );

  // Employee-specific trainings
  const userTrainingEnrollments = trainingEnrollments.filter(e =>
    e.employeeId === activeEmployee.id || e.employeeName.toLowerCase().includes(activeEmployee.fullName.toLowerCase().split(' ')[0])
  );
  const completedTrainings = userTrainingEnrollments.filter(e => e.status === 'COMPLETED');
  const inProgressTrainings = userTrainingEnrollments.filter(e => e.status === 'IN_PROGRESS' || e.status === 'NOT_STARTED');
  const totalTrainingHoursLogged = userTrainingEnrollments.reduce((acc, curr) => acc + curr.hoursCompleted, 0);

  // Training progress modal state
  const [selectedTrainingEnrollment, setSelectedTrainingEnrollment] = useState<EmployeeTrainingEnrollment | null>(null);
  const [logHours, setLogHours] = useState<number>(0);
  const [logFeedback, setLogFeedback] = useState<string>('');
  const [logScore, setLogScore] = useState<number>(90);
  const [certifyCompletion, setCertifyCompletion] = useState<boolean>(false);

  // Leave calculations
  const totalAnnual = activeEmployee.accumulatedAnnualLeaveDays ?? 21;
  const usedAnnual = activeEmployee.usedAnnualLeaveDays ?? 3;
  const availableAnnual = Math.max(0, totalAnnual - usedAnnual);

  const totalSick = activeEmployee.accumulatedSickLeaveDays ?? 15;
  const usedSick = activeEmployee.usedSickLeaveDays ?? 1;
  const availableSick = Math.max(0, totalSick - usedSick);

  const compDays = activeEmployee.compensatoryPatrolDays ?? (activeEmployee.cadre === 'FIELD_RANGER' ? 6 : 0);

  // Calculate days between dates
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = d2.getTime() - d1.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const requestedDays = calculateDays(leaveStart, leaveEnd);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmployeeProfile(activeEmployee.id, {
      email,
      phone,
      address,
      avatarUrl,
      emergencyContact: {
        name: emergencyName,
        relationship: emergencyRel,
        phone: emergencyPhone
      }
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      setPasswordStatusMsg({ text: 'New password must be at least 8 characters long.', type: 'error' });
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordStatusMsg({ text: 'New password and confirmation do not match.', type: 'error' });
      return;
    }
    changePassword(activeEmployee.id, newPass);
    setPasswordStatusMsg({ text: 'Password successfully updated! Account security verified with CSA HRMIS.', type: 'success' });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => setPasswordStatusMsg(null), 6000);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || requestedDays <= 0) return;

    submitLeaveRequest({
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.fullName,
      department: activeEmployee.department,
      dutyStation: activeEmployee.dutyStation,
      county: activeEmployee.county,
      leaveType,
      startDate: leaveStart,
      endDate: leaveEnd,
      days: requestedDays,
      reason: `${leaveReason} ${handoverPerson ? `[Relief Officer: ${handoverPerson}]` : ''}`
    });

    setShowLeaveModal(false);
    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
    setHandoverPerson('');
  };

  const handleSimulateCheckIn = () => {
    logFieldAttendance({
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.fullName,
      position: activeEmployee.position,
      county: activeEmployee.county,
      dutyStation: activeEmployee.dutyStation,
      type: activeEmployee.cadre === 'FIELD_RANGER' ? 'GPS_MOBILE_CHECKIN' : 'BIOMETRIC_TERMINAL',
      terminalId: activeEmployee.cadre === 'FIELD_RANGER' ? undefined : 'ZKT-WHEIN-01',
      gpsCoordinates: activeEmployee.cadre === 'FIELD_RANGER' ? {
        latitude: 7.5321,
        longitude: -8.5382,
        accuracyMeters: 4.2
      } : undefined,
      geoFenceStatus: 'VERIFIED',
      status: 'PRESENT'
    });
  };

  return (
    <div className="space-y-6">

      {/* TOP HERO PROFILE BANNER */}
      <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-850 rounded-2xl border border-forest-800 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            
            {/* Avatar & Photo Picker */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-gold-600 to-amber-400 p-0.5 shadow-lg">
                <div className="w-full h-full bg-forest-900 rounded-2xl flex items-center justify-center overflow-hidden border border-gold-400/40">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={activeEmployee.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-gold-300">
                      {activeEmployee.fullName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  const url = prompt('Enter image URL or photo link for your official FDA profile:', avatarUrl);
                  if (url !== null) {
                    setAvatarUrl(url);
                    updateEmployeeProfile(activeEmployee.id, { avatarUrl: url });
                  }
                }}
                className="absolute -bottom-1 -right-1 bg-forest-800 hover:bg-forest-700 text-gold-300 p-1.5 rounded-lg border border-forest-600 shadow-md transition"
                title="Update Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {activeEmployee.fullName}
                </h1>
                <span className="bg-gold-500/20 text-gold-300 border border-gold-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {activeEmployee.empNo}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Active Account
                </span>
              </div>

              <p className="text-xs text-forest-200 font-medium flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gold-400" />
                <span>{activeEmployee.position}</span>
                <span className="text-forest-600">•</span>
                <span>{activeEmployee.department}</span>
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-forest-300 font-mono">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gold-400" />
                  {activeEmployee.dutyStation}, {activeEmployee.county} County
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <ShieldCheck className="w-3 h-3" />
                  CSA Biometric: {activeEmployee.biometricId}
                </span>
                <span>•</span>
                <span className="text-amber-300">
                  Grade: {activeEmployee.gradeBand}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Suite */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={() => {
                setActiveTab('LEAVE');
                setShowLeaveModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-gold-500 hover:from-amber-600 hover:to-gold-600 text-slate-950 rounded-xl text-xs font-black transition shadow-lg flex items-center space-x-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Request Leave</span>
            </button>
            <button
              onClick={handleSimulateCheckIn}
              className="px-4 py-2 bg-forest-800 hover:bg-forest-750 text-white border border-forest-700 rounded-xl text-xs font-bold transition shadow flex items-center space-x-1.5"
            >
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Clock In (Telemetry)</span>
            </button>
          </div>
        </div>

        {/* 4 STATS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-forest-800/80">
          <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
            <p className="text-[10px] text-forest-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Hours Logged (Month)</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
            </p>
            <p className="text-xl font-extrabold text-white mt-1">168.0 <span className="text-xs text-forest-300 font-normal">hrs</span></p>
            <p className="text-[10px] text-emerald-400 mt-0.5">160 reg + 8.0 patrol overtime</p>
          </div>

          <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
            <p className="text-[10px] text-forest-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Available Annual Leave</span>
              <Calendar className="w-3.5 h-3.5 text-gold-400" />
            </p>
            <p className="text-xl font-extrabold text-white mt-1">{availableAnnual} <span className="text-xs text-forest-300 font-normal">Days</span></p>
            <p className="text-[10px] text-gold-400 mt-0.5">{availableAnnual * 8} Hours • Total Allotted: {totalAnnual}d</p>
          </div>

          <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
            <p className="text-[10px] text-forest-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Accumulated Sick Leave</span>
              <Heart className="w-3.5 h-3.5 text-rose-400" />
            </p>
            <p className="text-xl font-extrabold text-white mt-1">{availableSick} <span className="text-xs text-forest-300 font-normal">Days</span></p>
            <p className="text-[10px] text-rose-300 mt-0.5">{availableSick * 8} Hours • Statutory Sick Accrual</p>
          </div>

          <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
            <p className="text-[10px] text-forest-300 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Monthly Net Pay (EFT)</span>
              <Landmark className="w-3.5 h-3.5 text-blue-400" />
            </p>
            <p className="text-xl font-extrabold text-emerald-400 mt-1">
              ${(activeEmployee.salaryUSD * 0.76).toLocaleString()} <span className="text-xs text-forest-300 font-normal">USD</span>
            </p>
            <p className="text-[10px] text-forest-300 mt-0.5">
              LRD {Math.round(activeEmployee.salaryUSD * 0.76 * 195).toLocaleString()} @ 195 FX
            </p>
          </div>
        </div>
      </div>

      {/* MANDATORY PASSWORD CHANGE BANNER (IF APPLICABLE) */}
      {activeEmployee.mustChangePassword && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0 mt-0.5">
              <KeyRound className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Mandatory First-Time Password Change Required</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Under Civil Service Agency (CSA) & GoL Security Directive §4, newly onboarded employees must update their temporary password to secure their account and activate full self-service benefits.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('DETAILS')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shrink-0 shadow"
          >
            Change Password Now
          </button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DETAILS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'DETAILS'
              ? 'bg-forest-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Profile & Security</span>
        </button>

        <button
          onClick={() => setActiveTab('LEAVE')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'LEAVE'
              ? 'bg-forest-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Leave, Holidays & Time-Off ({availableAnnual}d Avail)</span>
        </button>

        <button
          onClick={() => setActiveTab('HOURS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'HOURS'
              ? 'bg-forest-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Hours Worked & Telemetry ({userAttendanceLogs.length} logs)</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYSTUBS')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'PAYSTUBS'
              ? 'bg-forest-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Digital Paystubs & Deductions ({userPayrollRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TRAINING')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'TRAINING'
              ? 'bg-forest-800 text-white shadow'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-gold-400" />
          <span>Trainings & Certifications ({userTrainingEnrollments.length})</span>
        </button>
      </div>

      {/* TAB 1: PROFILE & INFORMATION */}
      {activeTab === 'DETAILS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Personal Info Form */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-forest-700" />
                Employee Profile & Contact Information
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your contact phone, email, residential address, and emergency notification contacts.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    disabled
                    value={activeEmployee.fullName}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">Locked to Civil Service Agency record</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Employee ID</label>
                  <input
                    type="text"
                    disabled
                    value={activeEmployee.empNo}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Contact (SMS Notifications)</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Lonestar Cell MTN / Orange Liberia</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Residential Address</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="e.g. Whein Town, Bernard Farm, Montserrado County"
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Emergency Contact / Next of Kin
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Relationship</label>
                    <input
                      type="text"
                      value={emergencyRel}
                      onChange={e => setEmergencyRel(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emergency Phone</label>
                    <input
                      type="text"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-forest-800 hover:bg-forest-700 text-white rounded-lg font-bold text-xs shadow transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Security, Password Change & Official Badges */}
          <div className="lg:col-span-5 space-y-6">

            {/* Mandatory / Self-Service Password Change Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  Account Security & Password
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your intranet portal credentials. Enforces civil service cryptographic hashing.
                </p>
              </div>

              {passwordStatusMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold ${
                    passwordStatusMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {passwordStatusMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current / Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={e => setCurrentPass(e.target.value)}
                    placeholder="Enter current or initial temporary password"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Secure Password</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="Min 8 characters (letters, numbers, symbol)"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new secure password"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition shadow flex items-center justify-center space-x-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-gold-400" />
                  <span>Update Account Password</span>
                </button>
              </form>
            </div>

            {/* Official Banking & CSA Badge Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-xs uppercase tracking-wider text-gold-300">
                  Government Payroll Deposit Account
                </span>
                <Landmark className="w-4 h-4 text-gold-400" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Designated Bank:</span>
                  <span className="font-bold text-white text-right">{activeEmployee.bankName || 'LBDI'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Number:</span>
                  <span className="font-mono font-bold text-emerald-400">{activeEmployee.accountNumber || '102-772-008129'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CSA Sync Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified & Synced
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">NASSCORP ID:</span>
                  <span className="font-mono text-slate-300">NASS-LR-00918</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: LEAVE & STATUTORY HOLIDAYS */}
      {activeTab === 'LEAVE' && (
        <div className="space-y-6">

          {/* LEAVE BALANCES ROW (ACCUMULATED, USED, AVAILABLE) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Annual Paid Leave Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-forest-700" />
                  Annual Paid Leave
                </h4>
                <span className="text-xs font-bold bg-forest-100 text-forest-800 px-2 py-0.5 rounded">
                  21 Days / Year
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-3xl font-black text-forest-900">{availableAnnual}</p>
                  <p className="text-xs text-slate-500 font-medium">Days Available ({availableAnnual * 8} Hours)</p>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-0.5">
                  <p>Allotted: <strong className="text-slate-800">{totalAnnual}d</strong></p>
                  <p>Consumed: <strong className="text-amber-700">{usedAnnual}d</strong></p>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-forest-700 h-full rounded-full"
                  style={{ width: `${(availableAnnual / totalAnnual) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Accrues at 1.75 days per completed calendar month under Civil Service Law.
              </p>
            </div>

            {/* Sick Leave Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-600" />
                  Accumulated Sick Leave
                </h4>
                <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                  15 Days / Year
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-3xl font-black text-slate-900">{availableSick}</p>
                  <p className="text-xs text-slate-500 font-medium">Days Available ({availableSick * 8} Hours)</p>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-0.5">
                  <p>Entitlement: <strong className="text-slate-800">{totalSick}d</strong></p>
                  <p>Used: <strong className="text-rose-700">{usedSick}d</strong></p>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full"
                  style={{ width: `${(availableSick / totalSick) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Supported by clinical medical certificate from accredited national clinics.
              </p>
            </div>

            {/* Field Patrol Compensatory Days */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-600" />
                  Patrol Rest / Compensatory
                </h4>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Field Rangers
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-3xl font-black text-amber-800">{compDays}</p>
                  <p className="text-xs text-slate-500 font-medium">Days Earned ({compDays * 8} Hours)</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Active Station:</p>
                  <p className="font-semibold text-slate-800">{activeEmployee.dutyStation}</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full w-3/4" />
              </div>
              <p className="text-[11px] text-slate-400">
                Earned during deep-forest cross-border anti-poaching patrols and concession audits.
              </p>
            </div>

          </div>

          {/* ACTION BAR: REQUEST LEAVE BUTTON & STATS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-forest-50 border border-forest-200 p-4 rounded-xl">
            <div>
              <h4 className="text-sm font-bold text-forest-900">Need to Request Annual, Sick, or Official Leave?</h4>
              <p className="text-xs text-forest-700">
                Submit an official digital request. Routes dynamically to your County Supervisor, HR Director Helena S. Gbotoe, and syncs with CSA HRMIS.
              </p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-white rounded-lg text-xs font-bold transition shadow flex items-center space-x-1.5 shrink-0"
            >
              <PlusCircle className="w-4 h-4 text-gold-400" />
              <span>Submit Leave Request</span>
            </button>
          </div>

          {/* MY SUBMITTED LEAVE REQUESTS TABLE */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                My Leave Applications & Live Approval Stepper
              </span>
              <span className="text-xs text-slate-500">{userLeaveRequests.length} Applications Recorded</span>
            </div>

            {userLeaveRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No leave requests found for this employee account. Click "Submit Leave Request" above to apply.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {userLeaveRequests.map(req => (
                  <div key={req.id} className="p-4 hover:bg-slate-50/80 transition space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold text-forest-900 bg-forest-100 px-2 py-0.5 rounded border border-forest-200">
                          {req.id}
                        </span>
                        <span className="font-bold text-sm text-slate-900">
                          {req.leaveType.replace('_', ' ')} LEAVE ({req.days} Days / {req.days * 8} Hours)
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {req.startDate} to {req.endDate}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {req.status === 'APPROVED' && (
                          <button
                            onClick={() => openPrintModal({
                              type: 'LEAVE_CERTIFICATE',
                              data: {
                                certificateNo: req.certificateNo || `FDA-CERT-${req.id}`,
                                employeeName: req.employeeName,
                                empNo: activeEmployee.empNo,
                                position: activeEmployee.position,
                                department: req.department,
                                dutyStation: req.dutyStation || activeEmployee.dutyStation,
                                leaveType: req.leaveType,
                                startDate: req.startDate,
                                endDate: req.endDate,
                                days: req.days,
                                approvedBy: req.approvedBy || 'Helena S. Gbotoe (HR Director)',
                                approvedDate: req.approvedDate || '2026-09-20'
                              }
                            })}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded border border-emerald-300 transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Print Certificate</span>
                          </button>
                        )}

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : req.status === 'PENDING_HR'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : req.status === 'PENDING_SUPERVISOR'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {req.status === 'APPROVED' ? 'Approved & Certified' : req.status === 'PENDING_HR' ? 'Supervisor Endorsed • Awaiting HR' : req.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <strong>Reason / Handover Notes:</strong> {req.reason}
                    </p>

                    {/* Visual Stepper */}
                    <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>1. Applied ({req.appliedDate})</span>
                      </div>

                      <div className={`flex items-center space-x-1.5 font-semibold ${
                        req.status === 'PENDING_HR' || req.status === 'APPROVED' ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${
                          req.status === 'PENDING_HR' || req.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-300'
                        }`} />
                        <span>2. Supervisor Endorsed</span>
                      </div>

                      <div className={`flex items-center space-x-1.5 font-semibold ${
                        req.status === 'APPROVED' ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${
                          req.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-300'
                        }`} />
                        <span>3. HR Director Approved</span>
                      </div>

                      <div className={`flex items-center space-x-1.5 font-semibold ${
                        req.status === 'APPROVED' ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        <FileCheck2 className={`w-3.5 h-3.5 shrink-0 ${
                          req.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-300'
                        }`} />
                        <span>4. CSA HRMIS Gate Pass</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OFFICIAL REPUBLIC OF LIBERIA STATUTORY HOLIDAYS SECTION */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-gold-600" />
                  Statutory Public Holidays of the Republic of Liberia (Paid Time-Off)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  11 Official National Holidays established by statutory Acts of the National Legislature. All FDA employees receive full pay.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                11 Paid Statutory Holidays
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {LIBERIA_STATUTORY_HOLIDAYS.map((holiday, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-gold-400 transition space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{holiday.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold-100 text-gold-900">
                      {holiday.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono font-bold text-forest-800">{holiday.date}</p>
                  <p className="text-[11px] text-slate-500 leading-tight">{holiday.description}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: HOURS WORKED & ATTENDANCE TELEMETRY */}
      {activeTab === 'HOURS' && (
        <div className="space-y-6">

          {/* Top Hours Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold">Standard Shift Hours</p>
              <p className="text-2xl font-black text-slate-900 mt-1">160.0 <span className="text-xs text-slate-400 font-normal">hrs</span></p>
              <span className="text-[11px] text-emerald-600 font-semibold">40 hrs / week standard</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold">Field Patrol Overtime</p>
              <p className="text-2xl font-black text-amber-700 mt-1">18.5 <span className="text-xs text-slate-400 font-normal">hrs</span></p>
              <span className="text-[11px] text-amber-600 font-semibold">Qualifies for hazard allowance</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold">Total Logged (Month)</p>
              <p className="text-2xl font-black text-forest-800 mt-1">178.5 <span className="text-xs text-slate-400 font-normal">hrs</span></p>
              <span className="text-[11px] text-forest-600 font-semibold">100% Payroll Threshold Met</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold">Punctuality & Geo-Fence</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">99.4%</p>
              <span className="text-[11px] text-slate-500">Zero perimeter anomalies</span>
            </div>
          </div>

          {/* Attendance Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-forest-700" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Attendance Telemetry Stream (HQ Biometrics & Field GPS Bursts)
                </span>
              </div>
              <button
                onClick={handleSimulateCheckIn}
                className="px-3 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded-lg text-xs font-bold transition shadow flex items-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5 text-gold-400" />
                <span>Simulate Check-In</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">Duty Station & County</th>
                    <th className="px-4 py-2.5">Check-In Telemetry</th>
                    <th className="px-4 py-2.5">Geo-Fence Validation</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {userAttendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">
                        No telemetry logs yet for this employee account today. Click "Simulate Check-In" to record an entry.
                      </td>
                    </tr>
                  ) : (
                    userAttendanceLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">
                          {log.timestamp}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{log.dutyStation}</span>
                          <span className="text-[10px] text-slate-400 block">{log.county} County</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            {log.type === 'GPS_MOBILE_CHECKIN' ? (
                              <>
                                <Radio className="w-3 h-3 text-emerald-500" />
                                <span>GPS Mobile Burst</span>
                              </>
                            ) : (
                              <>
                                <KeyRound className="w-3 h-3 text-blue-500" />
                                <span>HQ Biometric Scanner ({log.terminalId || 'ZKT-WHEIN-01'})</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {log.geoFenceStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: DIGITAL PAYSTUBS & EARNINGS */}
      {activeTab === 'PAYSTUBS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: List of paystubs */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Monthly Paystub Archives
            </h4>
            <div className="space-y-2">
              {payrollRecords.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPaystub(p)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedPaystub.id === p.id
                      ? 'bg-forest-50 border-forest-600 shadow-sm'
                      : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{p.period}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Disbursed
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-forest-800 mt-1">
                    ${p.netPayUSD.toLocaleString()} USD
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    LRD {p.netPayLRD.toLocaleString()} • {p.paymentDate}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Paystub Card with Print */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-forest-900 to-forest-850 text-white flex items-center justify-between border-b border-forest-800">
              <div className="flex items-center space-x-3">
                <img src={FDA_LOGO_URL} alt="FDA Logo" className="w-12 h-auto object-contain drop-shadow" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">Forestry Development Authority</h3>
                  <p className="text-xs text-gold-300">Republic of Liberia • Official Electronic Paystub</p>
                </div>
              </div>
              <button
                onClick={() => openPrintModal({
                  type: 'PAYROLL_SLIP',
                  data: {
                    ...selectedPaystub,
                    employeeName: activeEmployee.fullName,
                    position: activeEmployee.position,
                    department: activeEmployee.department,
                    dutyStation: activeEmployee.dutyStation,
                    empNo: activeEmployee.empNo,
                    bankName: activeEmployee.bankName,
                    accountNumber: activeEmployee.accountNumber
                  }
                })}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Paystub</span>
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Employee & Pay Period Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 block">Employee:</span>
                  <strong className="text-slate-900">{activeEmployee.fullName}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Employee ID:</span>
                  <strong className="text-slate-900 font-mono">{activeEmployee.empNo}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Pay Period:</span>
                  <strong className="text-forest-900">{selectedPaystub.period}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Disbursement Date:</span>
                  <strong className="text-slate-900 font-mono">{selectedPaystub.paymentDate}</strong>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Gross Earnings */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1">
                    Gross Earnings Breakdown
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Base Salary (USD)</span>
                      <strong className="font-mono text-slate-900">${activeEmployee.salaryUSD.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Hazard Allowance</span>
                      <strong className="font-mono text-slate-900">${(activeEmployee.hazardPayUSD || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Field Operational Subsidy</span>
                      <strong className="font-mono text-slate-900">${(activeEmployee.fieldAllowanceUSD || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 bg-forest-50 px-2 rounded font-bold text-forest-900">
                      <span>Total Gross Earnings</span>
                      <span className="font-mono">${selectedPaystub.grossUSD.toLocaleString()} USD</span>
                    </div>
                  </div>
                </div>

                {/* Statutory Deductions */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b pb-1">
                    Statutory Deductions (Liberia Law)
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">NASSCORP Social Security (4%)</span>
                      <strong className="font-mono text-rose-700">-${selectedPaystub.nasscorpUSD.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">LRA Withholding Income Tax (20%)</span>
                      <strong className="font-mono text-rose-700">-${selectedPaystub.taxWithheldUSD.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 bg-rose-50 px-2 rounded font-bold text-rose-900">
                      <span>Total Statutory Deductions</span>
                      <span className="font-mono">-${(selectedPaystub.nasscorpUSD + selectedPaystub.taxWithheldUSD).toLocaleString()} USD</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Net Disbursed Box */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Net Direct Bank Deposit (Dual Currency EFT)
                  </span>
                  <p className="text-2xl font-black text-emerald-950 mt-0.5">
                    ${selectedPaystub.netPayUSD.toLocaleString()} USD
                    <span className="text-sm font-semibold text-emerald-800 ml-2">
                      (LRD {selectedPaystub.netPayLRD.toLocaleString()} @ 195 FX)
                    </span>
                  </p>
                </div>
                <div className="text-right text-[11px] text-emerald-900">
                  <p><strong>Bank:</strong> {activeEmployee.bankName || 'LBDI'}</p>
                  <p className="font-mono"><strong>Acct:</strong> {activeEmployee.accountNumber || '102-772-008129'}</p>
                  <p className="font-mono text-emerald-700">EFT-REF-2026-09-8812</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 5: ON-THE-JOB TRAINING & CERTIFICATIONS */}
      {activeTab === 'TRAINING' && (
        <div className="space-y-6">
          
          {/* Top Capacity Building Header Banner */}
          <div className="bg-gradient-to-r from-forest-900 via-forest-850 to-slate-900 rounded-2xl p-6 text-white border border-forest-800 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-gold-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <GraduationCap className="w-4 h-4" />
                  <span>FDA Capacity Building & Field Workforce Development</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  My On-the-Job Trainings & Professional Certifications
                </h2>
                <p className="text-xs text-forest-200 mt-1 max-w-2xl">
                  Track assigned practical field curricula, log hands-on competencies, monitor supervisory evaluations, and print accredited Forestry Development Authority certificates of completion.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className="bg-forest-800/80 border border-forest-700 p-3 rounded-xl text-center">
                  <span className="text-[10px] uppercase text-forest-300 font-bold block">Overall Completion</span>
                  <span className="text-xl font-black text-gold-400">
                    {userTrainingEnrollments.length > 0
                      ? Math.round((completedTrainings.length / userTrainingEnrollments.length) * 100)
                      : 100}%
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-forest-800/80">
              <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
                <span className="text-[10px] text-forest-300 font-bold uppercase tracking-wider block">Assigned Programs</span>
                <p className="text-xl font-extrabold text-white mt-1">{userTrainingEnrollments.length} <span className="text-xs font-normal text-forest-300">Curricula</span></p>
                <p className="text-[10px] text-forest-300 mt-0.5">Mandatory & Cadre-specific</p>
              </div>

              <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
                <span className="text-[10px] text-forest-300 font-bold uppercase tracking-wider block">Practical Hours Completed</span>
                <p className="text-xl font-extrabold text-emerald-400 mt-1">{totalTrainingHoursLogged} <span className="text-xs font-normal text-forest-300">Hours</span></p>
                <p className="text-[10px] text-emerald-300 mt-0.5">Field simulation & workshops</p>
              </div>

              <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
                <span className="text-[10px] text-forest-300 font-bold uppercase tracking-wider block">Official Certificates</span>
                <p className="text-xl font-extrabold text-gold-400 mt-1">{completedTrainings.length} <span className="text-xs font-normal text-forest-300">Earned</span></p>
                <p className="text-[10px] text-gold-300 mt-0.5">Accredited & Printable</p>
              </div>

              <div className="bg-forest-900/60 p-3 rounded-xl border border-forest-800">
                <span className="text-[10px] text-forest-300 font-bold uppercase tracking-wider block">In-Progress Practicums</span>
                <p className="text-xl font-extrabold text-amber-400 mt-1">{inProgressTrainings.length} <span className="text-xs font-normal text-forest-300">Active</span></p>
                <p className="text-[10px] text-amber-300 mt-0.5">On-the-job training in field</p>
              </div>
            </div>
          </div>

          {/* Training Cards Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Enrolled Training Curricula & Field Practicums</h3>
                <p className="text-xs text-slate-500">Curricula assigned by HR & Department Training Coordinators for {activeEmployee.fullName}</p>
              </div>
              <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200">
                {userTrainingEnrollments.length} Programs
              </span>
            </div>

            {userTrainingEnrollments.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-700">No Training Programs Currently Assigned</p>
                <p className="text-xs text-slate-500 mt-1">The HR Training Directorate assigns regular courses based on employee cadre and county post.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {userTrainingEnrollments.map(enr => {
                  const isDone = enr.status === 'COMPLETED';
                  return (
                    <div
                      key={enr.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-4"
                    >
                      {/* Card Top: Badges & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-forest-100 text-forest-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {enr.category.replace(/_/g, ' ')}
                            </span>
                            <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded font-semibold">
                              {enr.deliveryMethod.replace(/_/g, ' ')}
                            </span>
                            {enr.isMandatory && (
                              <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Mandatory OJT
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-slate-900">{enr.trainingTitle}</h4>
                          <p className="text-xs text-slate-500">
                            Station: <strong className="text-slate-700">{enr.dutyStation}</strong> ({enr.county} County) • Assigned: {enr.assignedDate} • Due Date: <strong className="text-slate-800">{enr.dueDate}</strong>
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                          {isDone ? (
                            <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Completed & Certified</span>
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-full flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                              <span>In Progress ({enr.progressPercent}%)</span>
                            </span>
                          )}
                          {enr.score && (
                            <span className="text-[11px] font-bold text-forest-800 font-mono">
                              Evaluation Score: {enr.score}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar & Hours */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-forest-700" />
                            <span>Practical On-the-Job Hours</span>
                          </span>
                          <span className="font-mono text-slate-900 font-bold">
                            {enr.hoursCompleted} / {enr.totalHours} Hours ({enr.progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isDone
                                ? 'bg-gradient-to-r from-emerald-500 to-forest-700'
                                : 'bg-gradient-to-r from-amber-500 to-forest-600'
                            }`}
                            style={{ width: `${Math.min(100, enr.progressPercent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Supervisor / Trainer Remarks */}
                      {enr.supervisorFeedback && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                          <span className="font-bold text-slate-600 uppercase text-[10px] block mb-0.5">
                            Trainer & Supervisory Field Feedback
                          </span>
                          <p className="text-slate-800 italic">"{enr.supervisorFeedback}"</p>
                          {enr.trainerSignedBy && (
                            <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                              ✓ Evaluated & Signed by: {enr.trainerSignedBy}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Card Action Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-500">
                          {isDone ? (
                            <span className="font-mono text-emerald-800 font-semibold flex items-center gap-1">
                              <Award className="w-4 h-4 text-gold-500" />
                              <span>Certificate No: {enr.certificateNo} (Completed on {enr.completedDate})</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              {enr.totalHours - enr.hoursCompleted} practical hours remaining before competency certification.
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedTrainingEnrollment(enr);
                              setLogHours(enr.hoursCompleted);
                              setLogFeedback(enr.supervisorFeedback || '');
                              setLogScore(enr.score || 90);
                              setCertifyCompletion(isDone);
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border border-slate-300 shadow-sm"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-forest-700" />
                            <span>Update Practical Hours</span>
                          </button>

                          {isDone && (
                            <button
                              onClick={() => {
                                openPrintModal({
                                  type: 'TRAINING_CERTIFICATE',
                                  data: enr
                                });
                              }}
                              className="px-4 py-1.5 bg-forest-800 hover:bg-forest-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow"
                            >
                              <Award className="w-3.5 h-3.5 text-gold-400" />
                              <span>View & Print Official Certificate</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL: UPDATE TRAINING PROGRESS & COMPETENCIES */}
      {selectedTrainingEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Update On-the-Job Training Progress</h3>
              </div>
              <button
                onClick={() => setSelectedTrainingEnrollment(null)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateTrainingProgress(
                  selectedTrainingEnrollment.id,
                  Number(logHours),
                  logFeedback,
                  Number(logScore),
                  certifyCompletion
                );
                setSelectedTrainingEnrollment(null);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Course Details</span>
                <p className="font-bold text-sm text-slate-900">{selectedTrainingEnrollment.trainingTitle}</p>
                <p className="text-[11px] text-slate-600">
                  Cadre / Employee: <strong>{selectedTrainingEnrollment.employeeName}</strong> ({selectedTrainingEnrollment.dutyStation})
                </p>
                <p className="text-[11px] text-forest-800 font-mono">
                  Total Required Hours: <strong>{selectedTrainingEnrollment.totalHours} hrs</strong> • Current Logged: {selectedTrainingEnrollment.hoursCompleted} hrs
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Practical Hours Completed (Cumulative out of {selectedTrainingEnrollment.totalHours} hrs)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min={0}
                    max={selectedTrainingEnrollment.totalHours}
                    value={logHours}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLogHours(val);
                      if (val >= selectedTrainingEnrollment.totalHours) {
                        setCertifyCompletion(true);
                      }
                    }}
                    required
                    className="w-32 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none font-bold text-sm"
                  />
                  <span className="text-slate-500 font-mono text-xs">
                    = {Math.min(100, Math.round((Number(logHours) / selectedTrainingEnrollment.totalHours) * 100))}% completed
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Practical Field Exercises / Logged Activities Notes
                </label>
                <textarea
                  rows={3}
                  value={logFeedback}
                  onChange={(e) => setLogFeedback(e.target.value)}
                  placeholder="Summarize practical competencies performed (e.g. handheld scanner barcode sync at checkpoint, GPS waypoint logging on patrol, voucher matching)..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Practical Evaluation Score (%)</label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={logScore}
                    onChange={(e) => setLogScore(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="text"
                    disabled
                    value={selectedTrainingEnrollment.dueDate}
                    className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-forest-50 border border-forest-200 rounded-lg flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="certifyCompletionCheck"
                  checked={certifyCompletion}
                  onChange={(e) => setCertifyCompletion(e.target.checked)}
                  className="mt-0.5 rounded text-forest-700 focus:ring-forest-600"
                />
                <label htmlFor="certifyCompletionCheck" className="text-xs text-forest-900 cursor-pointer">
                  <strong className="block">Certify Competency & Issue Official FDA Certificate</strong>
                  <span>Marks this practical training as fully completed and generates an authentic FDA certificate of competency.</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTrainingEnrollment(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest-800 hover:bg-forest-700 text-white rounded-lg font-bold transition shadow flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-gold-400" />
                  <span>Save Progress & Hours</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT LEAVE REQUEST */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gold-400" />
                <h3 className="font-bold text-sm">Request Official Leave / Time-Off</h3>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-600 focus:outline-none font-semibold text-slate-800"
                >
                  <option value="ANNUAL">Annual Paid Leave (Available: {availableAnnual} Days)</option>
                  <option value="SICK">Sick Leave (Available: {availableSick} Days)</option>
                  <option value="PATROL_COMPENSATORY">Field Patrol Compensatory Rest ({compDays} Days)</option>
                  <option value="OFFICIAL_DUTY">Official Duty / Training Pass</option>
                  <option value="MATERNITY">Maternity / Paternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={e => setLeaveStart(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-forest-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={e => setLeaveEnd(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-forest-600 focus:outline-none"
                  />
                </div>
              </div>

              {requestedDays > 0 && (
                <div className="p-3 bg-forest-50 border border-forest-200 rounded-lg flex items-center justify-between text-forest-900 font-semibold">
                  <span>Total Duration:</span>
                  <span className="font-mono text-sm">{requestedDays} Calendar Days ({requestedDays * 8} Working Hours)</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designated Relief / Handover Officer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ranger Sando Blama or Deputy Officer"
                  value={handoverPerson}
                  onChange={e => setHandoverPerson(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Reason & Contact During Leave</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason for leave and emergency contact telephone while away from post..."
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-forest-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestedDays <= 0}
                  className="px-5 py-2 bg-forest-800 hover:bg-forest-700 disabled:opacity-50 text-white rounded-lg font-bold transition shadow flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-gold-400" />
                  <span>Submit Leave Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
