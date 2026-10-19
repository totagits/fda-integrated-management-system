import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, RefreshCw } from 'lucide-react';

type Measure = { label: string; value: number | string | null; note?: string };
type AnalyticsSection = { key: string; title: string; description: string; metrics: Measure[] };
type Summary = { asOf: string; scope: string; sections: AnalyticsSection[] };
type Api = <T=unknown>(path: string, options?: RequestInit) => Promise<T>;

function CountChart({ metrics }: { metrics: Measure[] }) {
  const values=metrics.filter((item):item is Measure & {value:number}=>typeof item.value==='number');
  if(!values.length)return <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No count-based measures are available to chart for this area. Financial amounts remain separated by currency in the report.</div>;
  const max=Math.max(...values.map(item=>item.value),1);
  return <figure className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Bar chart of current operational counts">
    <figcaption className="mb-4"><h4 className="font-semibold text-slate-900">Current operational counts</h4><p className="mt-1 text-xs text-slate-500">Live record counts by measure. Bars share a scale within this work area; they do not represent targets or performance ratings.</p></figcaption>
    <div className="space-y-3">{values.map(item=><div key={item.label} className="grid grid-cols-[minmax(9rem,1fr)_minmax(8rem,2fr)_3rem] items-center gap-3 text-xs"><span className="truncate text-slate-700" title={item.label}>{item.label}</span><span className="h-3 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-700" style={{width:`${Math.max(item.value===0?0:2,item.value/max*100)}%`}}/></span><strong className="text-right tabular-nums text-slate-900">{item.value.toLocaleString()}</strong></div>)}</div>
  </figure>;
}

export function AnalyticsWorkspace({ api }: { api: Api }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setSummary(await api<Summary>('/api/analytics/summary')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Analytics could not be loaded.'); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const download = () => {
    if (!summary) return;
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Section', 'Measure', 'Value', 'Note'], ...summary.sections.flatMap(item => item.metrics.map(m => [item.title, m.label, m.value, m.note || '']))];
    const csv = rows.map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `fda-analytics-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
    <header className="rounded-2xl bg-gradient-to-r from-forest-950 to-emerald-900 p-6 text-white shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10"><BarChart3 size={24}/></span><div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-200">Performance intelligence</p>
          <h2 className="mt-1 text-2xl font-bold">Analytics &amp; Reports</h2>
          <p className="mt-2 max-w-3xl text-sm text-emerald-50">Live operational measures from the areas your account is authorized to view. Personal and confidential record details are excluded.</p>
        </div></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={download} disabled={!summary} className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"><Download size={16}/>Export CSV</button><button type="button" onClick={()=>void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-forest-950 hover:bg-emerald-50 disabled:opacity-60"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh</button></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-emerald-100"><span>Reporting scope: <strong className="text-white">{summary?.scope || 'Loading…'}</strong></span><span>Updated: <strong className="text-white">{summary?.asOf ? new Date(summary.asOf).toLocaleString() : '—'}</strong></span></div>
    </header>

    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Analytics could not be loaded: {error}</div>}
    {loading && !summary && <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-600">Loading current database measures…</div>}
    {summary?.sections.map(group => <section key={group.key} aria-labelledby={`analytics-${group.key}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h3 id={`analytics-${group.key}`} className="font-bold text-slate-900">{group.title}</h3><p className="mt-1 text-sm text-slate-600">{group.description}</p></div>
      <div className="p-4"><CountChart metrics={group.metrics}/></div>
      <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-3">{group.metrics.map(measure => <article key={measure.label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{measure.label}</p>
        <p className="mt-2 break-words text-2xl font-bold tabular-nums text-slate-950">{measure.value === null ? 'Not available' : measure.value}</p>
        {measure.note && <p className="mt-2 text-xs leading-relaxed text-slate-500">{measure.note}</p>}
      </article>)}</div>
      {group.metrics.length===0 && <p className="px-5 pb-5 text-sm text-slate-500">No records are available for this measure yet.</p>}
    </section>)}
    {!loading && summary?.sections.length===0 && <section className="rounded-xl border bg-white p-6 text-sm text-slate-600">No analytics are available for your current permissions. Contact the IT Director if you believe access is missing.</section>}
    <p className="text-xs leading-relaxed text-slate-500">Measures reflect records currently stored in the system and your assigned office scope. A count of zero means no matching records were found; it does not mean a policy, legal, or financial compliance review was performed.</p>
  </div>;
}
