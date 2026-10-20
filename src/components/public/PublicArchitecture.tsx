import { Building2, FileText, Network, Users } from 'lucide-react';

export function PublicArchitecture() {
  const areas = [
    {
      icon: FileText,
      title: 'Public procurement services',
      detail: 'Visitors can review published notices, use supplier services, and view official clarifications made public by FDA.',
    },
    {
      icon: Users,
      title: 'Staff workspace',
      detail: 'FDA staff access internal services through a separate sign-in. Available records and actions depend on each account’s assigned permissions.',
    },
    {
      icon: Building2,
      title: 'Multi-office operations',
      detail: 'The platform is intended to support work across headquarters, regional offices, and county locations, subject to FDA’s organizational setup and rollout.',
    },
    {
      icon: Network,
      title: 'External system connections',
      detail: 'Connections to government, finance, supplier-verification, or forestry systems are not represented as live. Each requires the system owner’s approval, technical coordination, security review, and acceptance testing.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-forest-800">Public information</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">FDA information platform</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          This page describes the platform at a high level. It does not publish internal technical designs, security controls, or infrastructure details. Public services and authenticated staff services have separate access paths.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {areas.map(({ icon: Icon, title, detail }) => (
          <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Icon aria-hidden="true" className="mb-3 h-6 w-6 text-forest-800" />
            <h3 className="font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
          </article>
        ))}
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-bold text-amber-950">Operational status</h3>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Availability of this website does not by itself confirm that every internal workflow is in operational use. FDA authorization, approved procedures, user acceptance, and verified external connections are required before those capabilities can be treated as operational.
        </p>
      </section>
    </div>
  );
}
