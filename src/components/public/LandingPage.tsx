import React, { useEffect, useState } from 'react';
import { usePublicPortal } from './usePublicPortal';
import { FDA_LOGO_URL } from '../../assets/logo';
import { PublicArchitecture } from './PublicArchitecture';
import {
  FileText,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  LogIn,
  Layers,
  UsersRound,
  WalletCards,
  ClipboardList,
  Boxes,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';

const workspaces = [
  { title: 'Human resources', detail: 'Workforce, employee services and development', section: 'hr', icon: UsersRound },
  { title: 'Financial management', detail: 'Budgets, accounting and financial controls', section: 'finance', icon: WalletCards },
  { title: 'Procurement & supply chain', detail: 'Sourcing, contracts, inventory and distribution', section: 'workflow', icon: ClipboardList },
  { title: 'Assets & fleet', detail: 'Custody, maintenance and lifecycle records', section: 'assets', icon: Boxes },
];

export const LandingPage: React.FC = () => {
  const { publicTenders, bidderQueries, loading, error, reload } = usePublicPortal();
  const readSection = () => {
    const section = window.location.hash.slice(1).toUpperCase();
    return ['OVERVIEW','TENDERS','BIDDER_PORTAL','ARCHITECTURE'].includes(section) ? section as 'OVERVIEW' | 'TENDERS' | 'BIDDER_PORTAL' | 'ARCHITECTURE' : 'OVERVIEW';
  };
  const [activeSection, updateSection] = useState<'OVERVIEW' | 'TENDERS' | 'BIDDER_PORTAL' | 'ARCHITECTURE'>(readSection);


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
  const formatDate = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Monrovia', dateStyle: 'medium', timeStyle: 'short' }) + ' Liberia Time';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3" aria-label="FDA Enterprise Management System home">
            <img src={FDA_LOGO_URL} alt="Forestry Development Authority" className="h-11 w-14 shrink-0 object-contain" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">FDA Enterprise Management System</span>
              <span className="block text-[11px] font-medium text-slate-500">Forestry Development Authority • Republic of Liberia</span>
            </span>
          </a>

          <nav aria-label="Public services" className="order-3 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-600 sm:order-none sm:w-auto sm:justify-end">
            <button
              onClick={() => setActiveSection('OVERVIEW')}
              className={`transition hover:text-forest-800 ${activeSection === 'OVERVIEW' ? 'text-forest-800' : ''}`}
            >
              Platform
            </button>
            <button
              onClick={() => setActiveSection('TENDERS')}
              className={`transition hover:text-forest-800 ${activeSection === 'TENDERS' ? 'text-forest-800' : ''}`}
            >
              Public tenders {(!loading && !error && publicTenders.length > 0) && <span className="ml-1 rounded-full bg-forest-100 px-1.5 py-0.5 text-[10px]">{publicTenders.length}</span>}
            </button>
            <button
              onClick={() => setActiveSection('BIDDER_PORTAL')}
              className={`transition hover:text-forest-800 ${activeSection === 'BIDDER_PORTAL' ? 'text-forest-800' : ''}`}
            >
              Clarifications {(!loading && !error && bidderQueries.length > 0) && <span className="ml-1 rounded-full bg-forest-100 px-1.5 py-0.5 text-[10px]">{bidderQueries.length}</span>}
            </button>
            <button
              onClick={() => setActiveSection('ARCHITECTURE')}
              className={`transition hover:text-forest-800 ${activeSection === 'ARCHITECTURE' ? 'text-forest-800' : ''}`}
            >
              Platform overview
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <a href="/bidder" className="hidden rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 sm:inline-flex">Supplier portal</a>
            <button
              onClick={() => window.location.assign('/secure')}
              className="inline-flex items-center gap-2 rounded-lg bg-forest-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-forest-700"
            >
              <LogIn className="h-4 w-4 text-gold-400" />
              <span>Staff sign in</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="flex-1">
        {error && <div role="alert" className="mx-auto max-w-7xl px-5 pt-5"><div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Public records could not be loaded. {error} <button onClick={() => void reload()} className="ml-2 font-bold underline">Retry</button></div></div>}


        {/* Product landing */}
        {activeSection === 'OVERVIEW' && (
          <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-forest-100 via-white to-slate-50">
            <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-14 lg:px-8 lg:py-16">
              <div className="lg:col-span-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-forest-800 shadow-sm">
                  <Layers className="h-3.5 w-3.5" />
                  Enterprise management platform
                </div>
                <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-forest-800 sm:text-5xl lg:text-6xl">
                  One operating platform for FDA.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                  A role-based digital workspace designed to connect people, finance, procurement, supply chain, and asset operations across FDA offices.
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                  Internal workflows are available to authorized staff as they are approved and brought into operational use. Public notices and supplier services are available separately.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button onClick={() => setActiveSection('TENDERS')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-forest-300 hover:text-forest-800">
                    <FileText className="h-4 w-4" /> Public procurement
                  </button>
                  <a href="/bidder" className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-forest-800 transition hover:bg-forest-50">
                    Supplier portal <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a href="/sealed-bid" className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                    Invited sealed bid <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="mt-8 flex items-start gap-3 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" />
                  <p>Separate public and staff access. Staff data and tools require an authenticated account and assigned permissions.</p>
                </div>
              </div>

              <div className="lg:col-span-6">
                <section aria-labelledby="workspace-overview" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.45)]">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-forest-700">FDA | ERP</p>
                      <h2 id="workspace-overview" className="mt-1 text-base font-bold text-slate-900">Role-based workspaces</h2>
                    </div>
                    <div className="rounded-xl bg-forest-800 p-2.5 text-white"><Layers className="h-5 w-5" /></div>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                    {workspaces.map(({ title, detail, section, icon: Icon }, index) => (
                      <a key={title} href={`/secure?section=${section}`} aria-label={`Open ${title} workspace; sign in required`} className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-forest-400 hover:bg-forest-50/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-2">
                        <div className="flex items-start justify-between gap-3">
                          <span className={`grid h-10 w-10 place-items-center rounded-lg ${index % 2 === 0 ? 'bg-forest-100 text-forest-800' : 'bg-amber-100 text-amber-900'}`}>
                            <Icon aria-hidden="true" className="h-5 w-5" />
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-forest-800">Workspace 0{index + 1}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></span>
                        </div>
                        <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                      </a>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>Access is controlled by assigned role and office scope.</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-forest-800"><ShieldCheck className="h-3.5 w-3.5" /> Secure staff access</span>
                  </div>
                </section>
                <div className="mt-4 flex items-center justify-between px-1 text-[11px] font-medium text-slate-500">
                  <span>Headquarters</span><span className="h-px flex-1 mx-3 bg-slate-300" /><span>Regional offices</span><span className="h-px flex-1 mx-3 bg-slate-300" /><span>Counties</span>
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
              {!loading && !error && publicTenders.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-forest-700"/><h3 className="font-bold text-slate-900">No notices currently published</h3><p className="mt-2 text-sm text-slate-600">Approved notices will appear here when the procurement team publishes them.</p></div>}
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
                        onClick={() => window.location.assign('/bidder')}
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Submit New Query Form (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">Submit Bidder Clarification Query</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Direct channel to FDA Procurement Specialists</p>
                </div>

                <div className="rounded-xl border border-forest-200 bg-forest-50 p-5">
                  <p className="text-sm text-slate-700">Clarification requests are accepted from verified supplier accounts so FDA can link each question to the registered business. Sign in or register, then select an open opportunity in the supplier portal.</p>
                  <a href="/bidder" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-forest-800 px-4 py-3 text-sm font-bold text-white"><LogIn size={16}/> Register or sign in to ask a question</a>
                </div>
              </div>

              {/* Right Column: Published Official Clarifications (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Official Tender Clarifications & Addenda</h3>
                    <p className="text-xs text-slate-500">Public record of responses issued by FDA Procurement Evaluation Team</p>
                  </div>
                  {(loading || error || bidderQueries.length > 0) && <span className="text-xs font-mono font-bold text-forest-800 bg-forest-50 px-2 py-0.5 rounded border border-forest-200">
                    {loading ? 'Loading…' : error ? 'Unavailable' : `${bidderQueries.length} Published replies`}
                  </span>}
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
              <h4 className="font-bold text-white uppercase text-xs mb-3">Staff workspace</h4>
              <p className="text-[11px] text-forest-300">
                FDA staff use the authenticated workspace. Access is available from the sign-in button at the top of this page.
              </p>
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
