import React from 'react';
import { ArrowRight, Building2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { FDA_LOGO_URL } from '../../assets/logo';
import { LIBERIA_SEAL_URL } from '../../assets/liberiaSeal';
import { FdaPhotoCarousel } from './FdaPhotoCarousel';

const areas = [
  ['Human resources', 'Personnel administration, establishment controls, attendance, leave, training, and payroll preparation.'],
  ['Financial management', 'Budget oversight, commitments, approvals, accounting controls, and reporting.'],
  ['Procurement', 'Planning, sourcing, approvals, contracts, delivery, invoice matching, and supplier oversight.'],
  ['Asset control', 'Registration, custody, transfers, stocktaking, maintenance, and disposal.'],
];

export const LandingPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="bg-forest-950 px-4 py-2 text-center text-xs text-emerald-100">Forestry Development Authority · Republic of Liberia</div>
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={FDA_LOGO_URL} alt="Forestry Development Authority" className="h-14 w-auto object-contain" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-forest-900 sm:text-sm">Forestry Development Authority</p>
            <h1 className="text-sm font-bold text-slate-700 sm:text-base">Integrated Management Information System</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <img src={LIBERIA_SEAL_URL} alt="Republic of Liberia seal" className="hidden h-11 w-11 object-contain sm:block" />
          <a href="/secure" className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-700 focus:ring-offset-2">
            <LockKeyhole aria-hidden="true" className="h-4 w-4" /> Staff sign in
          </a>
        </div>
      </div>
    </header>
    <main>
      <section className="bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Headquarters · regional · county operations</p>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">One connected system for FDA’s core administrative work.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-emerald-50 sm:text-base">The platform brings administrative records and workflows into a shared, role-based workspace. Staff sign in with accounts issued by their system administrator; access is checked by the service.</p>
            <a href="/secure" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-amber-300"><LockKeyhole className="h-4 w-4" aria-hidden="true" /> Open staff workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            <div className="mt-8 flex items-center gap-3 border-t border-white/15 pt-5 text-xs text-emerald-100"><Building2 className="h-5 w-5 shrink-0" aria-hidden="true" /><span>Workflow access and records depend on configured accounts, permissions, and the connected production database.</span></div>
          </div>
          <FdaPhotoCarousel />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-forest-800">Administrative work areas</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">A shared platform across departments</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">The system is designed for staff workflows across headquarters, regional offices, and county operations. Available actions are limited to each account’s permissions.</p>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map(([title, description]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-forest-50 text-forest-900"><Building2 className="h-5 w-5" aria-hidden="true" /></div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}
        </div>
      </section>
    </main>
    <footer className="border-t border-slate-200 bg-white px-5 py-5 text-center text-xs text-slate-500">Forestry Development Authority · Republic of Liberia</footer>
  </div>
);
