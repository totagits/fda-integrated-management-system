import React from 'react';
import { ArrowRight, Building2, LockKeyhole } from 'lucide-react';

const areas = [
  ['Human resources', 'Employee records, establishment controls, attendance, leave, training, and payroll preparation.'],
  ['Financial management', 'Budgets, commitments, approvals, accounting controls, and financial reporting.'],
  ['Procurement', 'Planning, sourcing, approvals, contracts, receipts, invoice matching, and supplier oversight.'],
  ['Asset control', 'Registration, custody, transfers, stocktaking, maintenance, and disposal controls.'],
];

export const LandingPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-forest-900 text-white"><Building2 aria-hidden="true" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-forest-800">Forestry Development Authority</p>
            <h1 className="text-lg font-extrabold">Management Information System</h1>
          </div>
        </div>
        <a href="/secure" className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-700 focus:ring-offset-2">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Staff sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </header>
    <main>
      <section className="bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Headquarters · Regional · County operations</p>
          <h2 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">One secure system for FDA’s core administrative workflows.</h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50">Authorized staff use named accounts and office-scoped access. Sign in to view the records and tasks assigned to your role.</p>
          <a href="/secure" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-forest-950 hover:bg-emerald-50">Open staff workspace <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14">
        <h2 className="text-2xl font-extrabold">Core administrative areas</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Workflow availability depends on FDA-approved configuration, assigned permissions, and the records maintained in the system.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map(([title, description]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></article>)}
        </div>
      </section>
    </main>
    <footer className="border-t border-slate-200 bg-white px-5 py-5 text-center text-xs text-slate-500">Forestry Development Authority · Republic of Liberia</footer>
  </div>
);
