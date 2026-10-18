import { Database, Network, ShieldCheck, Building2 } from 'lucide-react';

export function PublicArchitecture() {
  return <div className="space-y-6">
    <div><p className="text-xs font-bold uppercase tracking-widest text-forest-800">Enterprise Architecture & Specs</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Integrated FDA information platform</h2><p className="mt-2 text-sm text-slate-600">Public services and the staff intranet share one application. Administrative records require an authenticated staff account.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      {[
        { icon: Building2, title: 'Headquarters, regional and county structure', detail: 'Office assignments determine the records a staff account may access. Approval and procurement actions are checked against the account’s permissions.' },
        { icon: Database, title: 'Shared records and linked workflows', detail: 'The implemented purchasing workflow links requisitions, budget reservations, purchase orders, inspected deliveries, assets, invoices and recorded payments in PostgreSQL.' },
        { icon: ShieldCheck, title: 'Staff access and accountability', detail: 'Named accounts, server sessions, permission checks and audit events protect implemented workflows. Public inquiries remain private until a reviewed clarification is published.' },
        { icon: Network, title: 'Interoperability and API gateways', detail: 'IFMIS, CSA and SGS LiberTrace are intended integration boundaries. No verified live connection to these systems is claimed. Connections require the relevant institution’s access, specifications and acceptance testing.' },
      ].map(({icon: Icon,title,detail}) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><Icon className="mb-3 h-6 w-6 text-forest-800"/><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></article>)}
    </div>
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-bold text-amber-950">Implementation and assurance</h3><p className="mt-2 text-sm leading-6 text-amber-900">The wider HR, finance and asset functions are being connected to the authenticated workspace. Full operational readiness also requires workflow acceptance, independent audit protection, recovery testing and verified external integrations.</p></section>
  </div>;
}
