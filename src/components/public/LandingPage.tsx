import React, { useEffect, useState } from 'react';
import { usePublicPortal, publicApi } from './usePublicPortal';
import { FDA_LOGO_URL } from '../../assets/logo';
import { LIBERIA_SEAL_URL } from '../../assets/liberiaSeal';
import { FdaPhotoCarousel } from './FdaPhotoCarousel';
import { PublicArchitecture } from './PublicArchitecture';
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
  LogIn,
  Layers
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { publicTenders, bidderQueries, loading, error, reload } = usePublicPortal();
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptId, setReceiptId] = useState('');
  const readSection = () => {
    const section = window.location.hash.slice(1).toUpperCase();
    return ['OVERVIEW','TENDERS','BIDDER_PORTAL','ARCHITECTURE'].includes(section) ? section as 'OVERVIEW' | 'TENDERS' | 'BIDDER_PORTAL' | 'ARCHITECTURE' : 'OVERVIEW';
  };
  const [activeSection, updateSection] = useState<'OVERVIEW' | 'TENDERS' | 'BIDDER_PORTAL' | 'ARCHITECTURE'>(readSection);
  const [selectedTenderRef, setSelectedTenderRef] = useState<string>(publicTenders[0]?.tenderRef || '');


  const setActiveSection = (section: typeof activeSection) => {
    window.location.hash = section.toLowerCase();
    updateSection(section);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => {
    const onHashChange = () => updateSection(readSection());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const openTenders = publicTenders.filter(t => t.status === 'OPEN_FOR_EXPRESSIONS');
  const formatDate = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Monrovia', dateStyle: 'medium', timeStyle: 'short' }) + ' Liberia Time';
  // Bidder query submission form
  const [bidderForm, setBidderForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    question: ''
  });
  const [submittedQuerySuccess, setSubmittedQuerySuccess] = useState(false);

  const handleBidderSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitError(''); setSubmittedQuerySuccess(false);
    const tender = openTenders.find(t => t.tenderRef === selectedTenderRef);
    if (!tender) { setSubmitError('Select an open tender before submitting a question.'); return; }
    setSubmitting(true);
    try {
      const saved = await publicApi<{id:string}>('/api/public/clarifications', {
        method: 'POST', body: JSON.stringify({ ...bidderForm, tenderId: tender.id }),
      });
      setReceiptId(saved.id); setSubmittedQuerySuccess(true);
      setBidderForm({ companyName: '', contactPerson: '', email: '', phone: '', question: '' });
    } catch (err) { setSubmitError(err instanceof Error ? err.message : 'Your question was not saved. Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Governmental Bar */}
      <div className="bg-forest-950 text-forest-200 text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-forest-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Forestry Development Authority (FDA) • Republic of Liberia</span>
        </div>
        <div className="hidden md:flex items-center space-x-4 text-[11px] text-forest-300">
          <span>Whein Town, Bernard Farm, Montserrado County</span>
          <span>•</span>
          <span>Act of 1976 & Reform Law of 2006</span>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 min-h-20 py-4 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Agency Identity */}
          <div className="flex items-center space-x-3.5 shrink-0">
            <div className="flex items-center justify-center shrink-0">
              <img
                src={FDA_LOGO_URL}
                alt="Forestry Development Authority Logo"
                className="h-12 w-auto object-contain drop-shadow-sm"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-sm sm:text-lg tracking-wide uppercase leading-tight">
                Forestry Development Authority
              </h1>
              <p className="text-[10px] sm:text-xs text-forest-800 font-semibold tracking-wide">
                Republic of Liberia • Integrated Information Platform
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex order-3 2xl:order-none w-full 2xl:w-auto flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-700">
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
              Public Procurement Tenders {(!loading && !error) && `(${publicTenders.length})`}
            </button>
            <button
              onClick={() => setActiveSection('BIDDER_PORTAL')}
              className={`hover:text-forest-800 transition ${activeSection === 'BIDDER_PORTAL' ? 'text-forest-800 border-b-2 border-forest-800 pb-1' : ''}`}
            >
              Bidder Clarification Portal {(!loading && !error) && `(${bidderQueries.length})`}
            </button>
            <button
              onClick={() => setActiveSection('ARCHITECTURE')}
              className={`hover:text-forest-800 transition ${activeSection === 'ARCHITECTURE' ? 'text-forest-800 border-b-2 border-forest-800 pb-1' : ''}`}
            >
              Enterprise Architecture & Specs
            </button>
          </nav>

          {/* Intranet ERP Login Button & Republic of Liberia Seal */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => window.location.assign('/secure')}
              className="inline-flex items-center space-x-2 bg-forest-800 hover:bg-forest-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition shrink-0 whitespace-nowrap"
            >
              <LogIn className="w-4 h-4 text-gold-400" />
              <span>Access Staff Intranet / ERP</span>
            </button>

            {/* Republic of Liberia National Seal */}
            <div className="hidden sm:flex items-center pl-3 border-l border-slate-200 shrink-0">
              <div
                className="flex items-center justify-center shrink-0"
                title="Republic of Liberia • The Love of Liberty Brought Us Here"
              >
                <img
                  src={LIBERIA_SEAL_URL}
                  alt="Republic of Liberia National Seal"
                  className="h-11 w-11 object-contain drop-shadow-sm"
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
        {error && <div role="alert" className="mx-auto max-w-7xl px-5 pt-5"><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Public records could not be loaded. {error} <button onClick={() => void reload()} className="ml-2 font-bold underline">Retry</button></div></div>}


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
                    <span>Headquarters • Regions • Counties</span>
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
                      onClick={() => window.location.assign('/secure')}
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

                    <button
                      onClick={() => setActiveSection('ARCHITECTURE')}
                      className="inline-flex items-center space-x-2 bg-forest-950/80 hover:bg-forest-950 text-emerald-300 border border-emerald-600/50 text-xs sm:text-sm font-medium px-4 py-3 rounded-lg transition"
                    >
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Architecture & API Gateways</span>
                    </button>
                  </div>

                  {/* Trust Badges */}
                  <div className="pt-4 border-t border-forest-800/80 grid grid-cols-3 gap-3 text-xs text-forest-200">
                    <div>
                      <span className="block font-bold text-white text-base">15 Counties</span>
                      <span className="text-[11px] text-forest-300">County Operations</span>
                    </div>
                    <div>
                      <span className="block font-bold text-white text-base">GoL IFMIS</span>
                      <span className="text-[11px] text-forest-300">Integration Boundary</span>
                    </div>
                    <div>
                      <span className="block font-bold text-white text-base">SGS LiberTrace</span>
                      <span className="text-[11px] text-forest-300">Integration Boundary</span>
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
              {loading && <p role="status" className="rounded-xl border bg-white p-6 text-sm text-slate-600">Loading published procurement notices…</p>}
              {!loading && !error && publicTenders.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-forest-700"/><h3 className="font-bold text-slate-900">No procurement notices published</h3><p className="mt-2 text-sm text-slate-600">Approved notices will appear here when the procurement team publishes them.</p></div>}
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
                        Published Date: {formatDate(tender.publishedDate)} • Submission Deadline: <strong className="text-red-700">{formatDate(tender.submissionDeadline)}</strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Budget</span>
                      <p className="text-xl font-black font-mono text-slate-900">{tender.estimatedBudgetUSD == null ? 'Not published' : `$${tender.estimatedBudgetUSD.toLocaleString()} USD`}</p>
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
                      <span>Procurement notice and submission requirements</span>{tender.documentsDownloadUrl && <a href={tender.documentsDownloadUrl} target="_blank" rel="noopener noreferrer" className="ml-3 font-bold text-forest-800 underline">Open published dossier</a>}
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
                        <span>{tender.status === 'OPEN_FOR_EXPRESSIONS' ? 'Ask Procurement Team Question' : 'View Tender Clarifications'}</span>
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
                    Procurement Clarification Desk
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Bidder Communication Channel</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  Prospective Bidder Interaction & Clarification Portal
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Submit questions for published, open notices. Reviewed questions and official replies are published here; your contact details remain private.
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
                  <p className="font-bold">Clarification query received</p>
                  <p className="text-emerald-800 mt-0.5">Your inquiry has been saved for procurement review. Reference: {receiptId}. This is an acknowledgement of receipt, not a bid submission.</p>
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

                {submitError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-800">{submitError}</p>}
                {!loading && !error && openTenders.length === 0 && <p className="rounded bg-slate-50 p-3 text-sm text-slate-600">Questions can be submitted once an open procurement notice has been published.</p>}
                <form onSubmit={handleBidderSubmit} className="space-y-3.5 text-xs">
                <fieldset disabled={submitting || loading || Boolean(error) || openTenders.length === 0} className="space-y-3.5 disabled:opacity-60">
                  <div>
                    <label htmlFor="public-tender" className="block text-slate-700 font-semibold mb-1">Target Procurement Tender</label>
                    <select
                      required
                      id="public-tender"
                      value={selectedTenderRef}
                      onChange={e => setSelectedTenderRef(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    >
                      <option value="">Select an open procurement notice</option>
                      {openTenders.map(t => (
                        <option key={t.id} value={t.tenderRef}>{t.tenderRef} — {t.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="bidder-companyName" className="block text-slate-700 font-semibold mb-1">Bidder / Consulting Firm Name</label>
                    <input
                      type="text"
                      required
                      maxLength={240} placeholder="Enter registered company name"
                      id="bidder-companyName" value={bidderForm.companyName}
                      onChange={e => setBidderForm({ ...bidderForm, companyName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="bidder-contactPerson" className="block text-slate-700 font-semibold mb-1">Contact Person</label>
                      <input
                        type="text"
                        required
                        maxLength={240} placeholder="Enter contact person name"
                        id="bidder-contactPerson" value={bidderForm.contactPerson}
                        onChange={e => setBidderForm({ ...bidderForm, contactPerson: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="bidder-phone" className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        required
                        maxLength={80} placeholder="Enter bidder phone number"
                        id="bidder-phone" value={bidderForm.phone}
                        onChange={e => setBidderForm({ ...bidderForm, phone: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-md font-mono focus:ring-forest-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bidder-email" className="block text-slate-700 font-semibold mb-1">Official Email Address</label>
                    <input
                      type="email"
                      required
                      maxLength={254} placeholder="Enter official business email"
                      id="bidder-email" value={bidderForm.email}
                      onChange={e => setBidderForm({ ...bidderForm, email: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="bidder-question" className="block text-slate-700 font-semibold mb-1">Specific Query / Clarification Needed</label>
                    <textarea
                      required
                      rows={4}
                      maxLength={6000} placeholder="Describe your question about this procurement notice"
                      id="bidder-question" value={bidderForm.question}
                      onChange={e => setBidderForm({ ...bidderForm, question: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-forest-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-forest-800 hover:bg-forest-700 text-white rounded-lg font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-gold-400" />
                    <span>{submitting ? 'Submitting…' : 'Submit Query for Official Reply'}</span>
                  </button>
                  <p className="text-xs text-slate-500">Contact details are used for procurement review. Only a reviewed question and response are published.</p>
                </fieldset>
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
                    {loading ? 'Loading…' : error ? 'Unavailable' : `${bidderQueries.length} Published replies`}
                  </span>
                </div>

                <div className="space-y-3">
                  {!loading && !error && bidderQueries.length === 0 && <p className="rounded-xl border bg-white p-6 text-sm text-slate-600">No official clarifications have been published.</p>}
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
                          <strong className="text-slate-700">Reviewed bidder question</strong>
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
                            <span className="text-forest-700 font-normal">{formatDate(q.responseDate)}</span>
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

        {/* 4. SYSTEM ARCHITECTURE & BLUEPRINT SECTION */}
        {activeSection === 'ARCHITECTURE' && (
          <section className="py-10 bg-slate-100/60 border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <PublicArchitecture />
            </div>
          </section>
        )}

      </main>

      {/* Official Government Footer */}
      <footer className="bg-forest-950 text-white border-t border-forest-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-forest-200">
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <img src={FDA_LOGO_URL} alt="FDA Logo" className="w-8 h-auto object-contain drop-shadow" />
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
              <p className="text-[11px] text-forest-300">Contact FDA through its official public channels.</p>
            </div>

            <div>
              <h4 className="font-bold text-white uppercase text-xs mb-3">Executive Intranet</h4>
              <p className="text-[11px] text-forest-300 mb-3">
                Authorized staff, finance officers, rangers, and management may log into the internal ERP.
              </p>
              <button
                onClick={() => window.location.assign('/secure')}
                className="w-full bg-forest-800 hover:bg-forest-700 text-white text-xs px-3 py-2 rounded-lg font-bold transition shadow border border-forest-700"
              >
                Access Staff ERP Portal
              </button>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-forest-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-forest-400">
            <p>© {new Date().getFullYear()} Forestry Development Authority (FDA). All Rights Reserved.</p>
            <p>Governed by Act of 1976 & National Forestry Reform Law of 2006.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};
