import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FDA_LOGO_URL } from '../../assets/logo';
import { LIBERIA_SEAL_URL } from '../../assets/liberiaSeal';
import { FdaPhotoCarousel } from './FdaPhotoCarousel';
import { USER_PERSONAS } from '../../data/initialData';
import { UserRole } from '../../types';
import {
  TreePine,
  Shield,
  FileText,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Users,
  Compass,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  LogIn
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const {
    publicTenders,
    bidderQueries,
    submitBidderQuery,
    loginToIntranet,
    currentPersona
  } = useApp();

  const [activeSection, setActiveSection] = useState<'OVERVIEW' | 'TENDERS' | 'BIDDER_PORTAL'>('OVERVIEW');
  const [selectedTenderRef, setSelectedTenderRef] = useState<string>(publicTenders[0]?.tenderRef || '');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Bidder query submission form
  const [bidderForm, setBidderForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    question: ''
  });
  const [submittedQuerySuccess, setSubmittedQuerySuccess] = useState(false);

  const handleBidderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidderForm.companyName || !bidderForm.question) return;

    const tender = publicTenders.find(t => t.tenderRef === selectedTenderRef) || publicTenders[0];

    submitBidderQuery({
      tenderRef: tender.tenderRef,
      tenderTitle: tender.title,
      bidderCompanyName: bidderForm.companyName,
      bidderContactPerson: bidderForm.contactPerson,
      bidderEmail: bidderForm.email,
      bidderPhone: bidderForm.phone,
      question: bidderForm.question
    });

    setSubmittedQuerySuccess(true);
    setBidderForm({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      question: ''
    });
    setTimeout(() => setSubmittedQuerySuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Governmental Bar */}
      <div className="bg-forest-950 text-forest-200 text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-forest-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Official Portal of the Forestry Development Authority (FDA) • Republic of Liberia</span>
        </div>
        <div className="hidden md:flex items-center space-x-4 text-[11px] text-forest-300">
          <span>Whein Town, Bernard Farm, Montserrado County</span>
          <span>•</span>
          <span>Act of 1976 & Reform Law of 2006</span>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Agency Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center">
              <img
                src={FDA_LOGO_URL}
                alt="Forestry Development Authority Logo"
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-wide uppercase leading-tight">
                Forestry Development Authority
              </h1>
              <p className="text-xs text-forest-800 font-semibold tracking-wide">
                Republic of Liberia • Integrated Information Platform
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-bold text-slate-700">
            <button
              onClick={() => setActiveSection('OVERVIEW')}
              className={`hover:text-forest-800 transition ${activeSection === 'OVERVIEW' ? 'text-forest-800 border-b-2 border-forest-800 pb-1' : ''}`}
            >
              Home & Mandate
            </button>
            <button
              onClick={() => setActiveSection('TENDERS')}
              className={`hover:text-forest-800 transition ${activeSection === 'TENDERS' ? 'text-forest-800 border-b-2 border-forest-800 pb-1' : ''}`}
            >
              Public Procurement Tenders ({publicTenders.length})
            </button>
            <button
              onClick={() => setActiveSection('BIDDER_PORTAL')}
              className={`hover:text-forest-800 transition ${activeSection === 'BIDDER_PORTAL' ? 'text-forest-800 border-b-2 border-forest-800 pb-1' : ''}`}
            >
              Bidder Clarification Portal ({bidderQueries.length})
            </button>
          </nav>

          {/* Intranet ERP Login Button & Republic of Liberia Seal */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center space-x-2 bg-forest-800 hover:bg-forest-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition"
            >
              <LogIn className="w-4 h-4 text-gold-400" />
              <span>Access Staff Intranet / ERP</span>
            </button>

            {/* Republic of Liberia National Seal */}
            <div className="flex items-center pl-3 border-l border-slate-200">
              <div
                className="bg-amber-50/90 p-1.5 rounded-lg border border-amber-200/90 shadow-sm flex items-center justify-center"
                title="Republic of Liberia • The Love of Liberty Brought Us Here"
              >
                <img
                  src={LIBERIA_SEAL_URL}
                  alt="Republic of Liberia National Seal"
                  className="h-12 w-12 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1">

        {/* 1. HERO SECTION */}
        {activeSection === 'OVERVIEW' && (
          <section className="relative overflow-hidden bg-gradient-to-b from-forest-900 via-forest-900 to-forest-950 text-white py-12 lg:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                
                {/* Left Column: Hero Title, Subtitle, CTAs */}
                <div className="lg:col-span-6 space-y-6">
                  
                  <div className="inline-flex items-center space-x-2 bg-gold-500/20 text-gold-300 border border-gold-400/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    <span>Liberia Forest Sector Governance</span>
                    <span>•</span>
                    <span>15 Counties Operational</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    Integrated Forest Management & Enterprise Information System
                  </h1>

                  <p className="text-sm sm:text-base text-forest-100 font-normal leading-relaxed max-w-xl">
                    The Forestry Development Authority (FDA) manages, protects, conserves, and sustainably develops Liberia’s forest resources under the Act of 1976 and the National Forestry Reform Law of 2006.
                  </p>

                  <p className="text-xs text-forest-200 leading-relaxed max-w-xl border-l-2 border-gold-500 pl-3">
                    Replacing fragmented manual operations with controlled digital workflows across Human Resources, Financial Vote Books, PPCC Public Procurement, and Fixed Asset Registers from Bernard Farm HQ to remote county outposts.
                  </p>

                  {/* Hero CTAs */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="inline-flex items-center space-x-2 bg-gold-600 hover:bg-gold-500 text-slate-950 text-xs sm:text-sm font-bold px-5 py-3 rounded-lg shadow-lg hover:shadow-xl transition"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Access FDA Staff Intranet (ERP)</span>
                    </button>

                    <button
                      onClick={() => setActiveSection('TENDERS')}
                      className="inline-flex items-center space-x-2 bg-forest-800 hover:bg-forest-700 text-white border border-forest-600 text-xs sm:text-sm font-semibold px-4 py-3 rounded-lg transition"
                    >
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>View Public Procurement Tenders</span>
                    </button>

                    <button
                      onClick={() => setActiveSection('BIDDER_PORTAL')}
                      className="inline-flex items-center space-x-2 bg-forest-950/80 hover:bg-forest-950 text-forest-200 border border-forest-700 text-xs sm:text-sm font-medium px-4 py-3 rounded-lg transition"
                    >
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      <span>Bidder Clarification Portal</span>
                    </button>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-4 border-t border-forest-800/80 grid grid-cols-3 gap-3 text-xs text-forest-200">
                    <div>
                      <span className="block font-bold text-white text-base">15 Counties</span>
                      <span className="text-[11px] text-forest-300">Decentralized Sync</span>
                    </div>
                    <div>
                      <span className="block font-bold text-white text-base">GoL IFMIS</span>
                      <span className="text-[11px] text-forest-300">MFDP Budget Boundary</span>
                    </div>
                    <div>
                      <span className="block font-bold text-white text-base">SGS LiberTrace</span>
                      <span className="text-[11px] text-forest-300">Timber Chain of Custody</span>
                    </div>
                  </div>

                </div>

                {/* Right Column: Dynamic Interactive Carousel of Authentic FDA Photos from fda.gov.lr */}
                <div className="lg:col-span-6">
                  <FdaPhotoCarousel />
                </div>

              </div>
            </div>
          </section>
        )}

        {/* 2. PUBLIC TENDERS SECTION */}
        <section className={`py-12 ${activeSection === 'TENDERS' ? 'block' : activeSection === 'OVERVIEW' ? 'block bg-slate-100/60 border-t border-slate-200' : 'hidden'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-forest-100 text-forest-800 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    PPCC Public Procurement Notices
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Open Competition</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Active Procurement Tenders & Requests for Expressions of Interest (REOI)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  In accordance with the Public Procurement and Concessions Act (PPCA), eligible firms may inspect notices and participate.
                </p>
              </div>

              <button
                onClick={() => setActiveSection('BIDDER_PORTAL')}
                className="inline-flex items-center space-x-1.5 bg-forest-800 hover:bg-forest-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow transition self-start sm:self-auto"
              >
                <MessageSquare className="w-4 h-4 text-gold-400" />
                <span>Interact with Procurement Team</span>
              </button>
            </div>

            {/* Tender Cards */}
            <div className="space-y-4">
              {publicTenders.map(tender => (
                <div
                  key={tender.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center space-x-2.5 mb-1.5">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                          {tender.tenderRef}
                        </span>
                        <span className="text-xs font-semibold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                          {tender.procurementCategory.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-emerald-700 font-bold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {tender.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{tender.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Published Date: {tender.publishedDate} • Submission Deadline: <strong className="text-red-700">{tender.submissionDeadline}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Budget</span>
                      <p className="text-xl font-black font-mono text-slate-900">${tender.estimatedBudgetUSD.toLocaleString()} USD</p>
                    </div>
                  </div>

                  {/* Requirements & Submission Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                      <p className="font-bold text-slate-800">Mandatory Submission Criteria:</p>
                      <ul className="space-y-1 text-slate-600 pl-4 list-disc text-[11px]">
                        {tender.keyRequirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1 text-slate-600 text-[11px]">
                      <p className="font-bold text-slate-800 text-xs">Submission Address & Officer:</p>
                      <p><strong>Addressed to:</strong> {tender.managingDirector}, Managing Director</p>
                      <p><strong>Physical Address:</strong> {tender.submissionAddress}</p>
                      <p><strong>Primary Inquiries:</strong> {tender.primaryEmail}</p>
                      <p><strong>Clarifications:</strong> {tender.clarificationEmail}</p>
                      <p><strong>Telephones:</strong> {tender.telephones.join(' / ')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500">
                      <span>Official REOI & TOR Consulting Services Dossier</span>
                    </div>

                    <div className="flex items-center space-x-2.5">
                      <button
                        onClick={() => {
                          setSelectedTenderRef(tender.tenderRef);
                          setActiveSection('BIDDER_PORTAL');
                        }}
                        className="bg-forest-800 hover:bg-forest-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-gold-400" />
                        <span>Ask Procurement Team Question</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 3. BIDDER CLARIFICATION & INTERACTION PORTAL */}
        <section className={`py-12 ${activeSection === 'BIDDER_PORTAL' ? 'block' : 'hidden'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    REOI Section 7 Clarification Desk
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Bidder Communication Channel</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Prospective Bidder Interaction & Clarification Portal
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Prospective bidders may obtain clarifications during office hours (9:00 AM - 3:00 PM Liberia Time). Official replies are published publicly for transparency.
                </p>
              </div>

              <button
                onClick={() => setActiveSection('TENDERS')}
                className="text-xs text-forest-800 hover:text-forest-900 font-bold flex items-center space-x-1"
              >
                <span>← Back to Public Tenders</span>
              </button>
            </div>

            {submittedQuerySuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-center space-x-3 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Clarification Query Transmitted Successfully!</p>
                  <p className="text-emerald-800 mt-0.5">Your inquiry has been submitted to the FDA Procurement Directorate. The official response will appear on this portal.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Submit New Query Form (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Submit Bidder Clarification Query</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Direct channel to FDA Procurement Specialists</p>
                </div>

                <form onSubmit={handleBidderSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Target Procurement Tender</label>
                    <select
                      value={selectedTenderRef}
                      onChange={e => setSelectedTenderRef(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    >
                      {publicTenders.map(t => (
                        <option key={t.id} value={t.tenderRef}>{t.tenderRef} — {t.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bidder / Consulting Firm Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. West African Forestry IT Consortium Ltd."
                      value={bidderForm.companyName}
                      onChange={e => setBidderForm({ ...bidderForm, companyName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Contact Person</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kolie S. Vaye"
                        value={bidderForm.contactPerson}
                        onChange={e => setBidderForm({ ...bidderForm, contactPerson: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        required
                        placeholder="+231 776 000 000"
                        value={bidderForm.phone}
                        onChange={e => setBidderForm({ ...bidderForm, phone: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Official Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="procurement@yourcompany.com"
                      value={bidderForm.email}
                      onChange={e => setBidderForm({ ...bidderForm, email: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Specific Query / Clarification Needed</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Detail questions regarding scope of assignment, IFMIS integration boundary, CISSP key personnel qualifications, or submission formats..."
                      value={bidderForm.question}
                      onChange={e => setBidderForm({ ...bidderForm, question: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-forest-800 hover:bg-forest-700 text-white rounded-lg font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-gold-400" />
                    <span>Submit Query for Official Reply</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Published Official Clarifications (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Official Tender Clarifications & Addenda</h3>
                    <p className="text-xs text-slate-500">Public record of responses issued by FDA Procurement Evaluation Team</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                    {bidderQueries.length} Threads
                  </span>
                </div>

                <div className="space-y-3">
                  {bidderQueries.map(q => (
                    <div
                      key={q.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-mono font-bold text-slate-900">{q.tenderRef}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          q.status === 'ANSWERED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {q.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Bidder Question */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                          <strong className="text-slate-700">{q.bidderCompanyName}</strong>
                          <span>({q.bidderContactPerson})</span>
                          <span>• {q.questionDate}</span>
                        </div>
                        <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded border border-slate-200">
                          "{q.question}"
                        </p>
                      </div>

                      {/* Official Response */}
                      {q.officialResponse ? (
                        <div className="bg-forest-50/70 border border-forest-200 rounded-lg p-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-forest-900">
                            <span>Official Response from FDA:</span>
                            <span className="text-forest-700 font-normal">{q.responseDate}</span>
                          </div>
                          <p className="text-forest-950 font-medium leading-relaxed">
                            {q.officialResponse}
                          </p>
                          <p className="text-[10px] text-forest-700 pt-1">
                            Issued by: <strong>{q.respondedBy}</strong>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded italic">
                          Awaiting official review by FDA Technical Evaluation Committee...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* Official Government Footer */}
      <footer className="bg-forest-950 text-white border-t border-forest-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-forest-200">
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="bg-white p-1 rounded">
                  <img src={FDA_LOGO_URL} alt="FDA Logo" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white uppercase text-xs">Forestry Development Authority</h4>
                  <p className="text-[10px] text-forest-300">Republic of Liberia</p>
                </div>
              </div>
              <p className="text-[11px] text-forest-300 leading-relaxed">
                Principal institution responsible for managing, conserving, and sustainably developing Liberia's forest heritage.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase text-xs mb-3">Headquarters Contact</h4>
              <p className="text-[11px] leading-relaxed text-forest-300">
                Forestry Development Authority<br />
                Whein Town, Bernard Farm<br />
                Montserrado County, Liberia<br />
                P.O. Box 3010, Monrovia
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase text-xs mb-3">Procurement & REOI Inquiries</h4>
              <p className="text-[11px] text-forest-300"><strong>Primary:</strong> v.kpaiseh@yahoo.com</p>
              <p className="text-[11px] text-forest-300 mt-1"><strong>Clarifications:</strong> wynnbryant12@gmail.com</p>
              <p className="text-[11px] text-forest-300 mt-1"><strong>Hotlines:</strong> 0776-063-643 / 0886-551-249</p>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase text-xs mb-3">Executive Intranet</h4>
              <p className="text-[11px] text-forest-300 mb-3">
                Authorized staff, finance officers, rangers, and management may log into the internal ERP.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full bg-forest-800 hover:bg-forest-700 text-white text-xs px-3 py-2 rounded-lg font-bold transition shadow border border-forest-700"
              >
                Access Staff ERP Portal
              </button>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-forest-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-forest-400">
            <p>© 2026 Forestry Development Authority (FDA). All Rights Reserved.</p>
            <p>Governed by Act of 1976 & National Forestry Reform Law of 2006.</p>
          </div>
        </div>
      </footer>

      {/* Login / Persona Selection Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-forest-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src={FDA_LOGO_URL} alt="FDA Logo" className="w-6 h-6 object-contain bg-white rounded p-0.5" />
                <h3 className="font-bold text-sm">FDA Staff Intranet Login (RBAC)</h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-300 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                Select your designated role persona to authenticate into the Integrated Management Information System:
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {Object.values(USER_PERSONAS).map(persona => (
                  <button
                    key={persona.role}
                    onClick={() => {
                      loginToIntranet(persona.role as UserRole);
                      setShowLoginModal(false);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-forest-700 hover:bg-forest-50/70 transition flex items-center space-x-3 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-forest-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {persona.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-forest-900">{persona.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{persona.title}</p>
                      <span className="text-[10px] text-forest-800 bg-forest-100/70 px-1.5 py-0.2 rounded inline-block mt-0.5">
                        {persona.badge}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-forest-800 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
