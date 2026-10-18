import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { PublishedTender } from '../public/usePublicPortal';

type Api = <T>(url: string, options?: RequestInit) => Promise<T>;
type Question = { id: string; tender_ref: string; company_name: string; contact_person: string; email: string; phone: string; question: string; official_response: string | null; response_date: string | null };
type Office = { id: string; name: string };
const emptyNotice = { tenderRef: '', title: '', procurementCategory: 'CONSULTING_SERVICES', orgUnitId: '', submissionDeadline: '', managingDirector: '', submissionAddress: '', primaryEmail: '', clarificationEmail: '', telephones: '', estimatedBudgetUSD: '', requirements: '', documentsDownloadUrl: '' };

export function PublicProcurementAdmin({api, offices}: {api: Api; offices: Office[]}) {
  const [notices, setNotices] = useState<PublishedTender[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState(emptyNotice);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Question | null>(null);
  const [publicQuestion, setPublicQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [confirmPublication, setConfirmPublication] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [n, q] = await Promise.all([api<PublishedTender[]>('/api/procurement/notices'), api<Question[]>('/api/procurement/clarifications')]);
      setNotices(n); setQuestions(q);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load procurement publication records.'); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  const save = async (url: string, body: unknown) => {
    setBusy(true); setError(''); setMessage('');
    try { await api(url, {method: 'POST', body: JSON.stringify(body)}); await load(); setMessage('Saved. The action is recorded in the audit history.'); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'The record could not be saved.'); return false; }
    finally { setBusy(false); }
  };
  const draft = async (event: FormEvent) => {
    event.preventDefault();
    if (await save('/api/procurement/notices', {...form, submissionDeadline: new Date(`${form.submissionDeadline}:00Z`).toISOString()})) { setForm(emptyNotice); setShowForm(false); }
  };
  const publishReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    if (await save(`/api/procurement/clarifications/${selected.id}/respond`, {publicQuestion, response, confirmPublication})) setSelected(null);
  };
  const field = (key: keyof typeof form, label: string, required = true, type = 'text') => <label className="block text-sm font-semibold" key={key}>{label}<input required={required} type={type} className="input mt-1" value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}/></label>;
  return <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Public procurement notices & bidder clarifications</h3><p className="mt-1 text-xs text-slate-600">Prepare and publish notices for your office. Review inquiries before publishing a response.</p></div><button className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-bold text-white" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close draft form' : 'New notice'}</button></div>
    {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
    {showForm && <form onSubmit={draft} className="mt-5 grid gap-4 rounded-lg border bg-slate-50 p-4 md:grid-cols-2"><fieldset disabled={busy} className="contents">
      {field('tenderRef','Tender reference')}{field('title','Notice title')}
      <label className="block text-sm font-semibold">Procurement category<select className="input mt-1" value={form.procurementCategory} onChange={e => setForm({...form,procurementCategory:e.target.value})}>{['CONSULTING_SERVICES','GOODS','WORKS','NON_CONSULTING'].map(v => <option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>
      <label className="block text-sm font-semibold">Office scope<select required className="input mt-1" value={form.orgUnitId} onChange={e => setForm({...form,orgUnitId:e.target.value})}><option value="">Select office</option>{offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      {field('submissionDeadline','Deadline (Liberia time)',true,'datetime-local')}{field('estimatedBudgetUSD','Estimated budget USD (optional)',false,'number')}
      {field('managingDirector','Submission addressee')}{field('submissionAddress','Submission address')}
      {field('primaryEmail','Primary inquiry email',true,'email')}{field('clarificationEmail','Clarification email (optional)',false,'email')}
      {field('telephones','Contact telephone(s), separated by commas')}{field('documentsDownloadUrl','Published dossier HTTPS URL (optional)',false,'url')}
      <label className="block text-sm font-semibold md:col-span-2">Submission requirements (one per line)<textarea required rows={4} maxLength={12000} className="input mt-1" value={form.requirements} onChange={e => setForm({...form,requirements:e.target.value})}/></label>
      <div className="flex items-center justify-between gap-4 md:col-span-2"><p className="text-xs text-slate-600">Save the draft, review its content below, then publish it explicitly.</p><button className="rounded-lg bg-forest-800 px-4 py-2 font-bold text-white" disabled={busy}>Save draft</button></div>
    </fieldset></form>}
    <div className="mt-5 space-y-3">{notices.length === 0 && <p className="text-sm text-slate-600">No notices have been created for your office scope.</p>}{notices.map(n => <details key={n.id} className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-bold">{n.tenderRef} · {n.title} · {n.publicationStatus}</summary><div className="mt-3 space-y-2 text-sm"><p>Deadline: {new Date(n.submissionDeadline).toLocaleString('en-GB',{timeZone:'Africa/Monrovia'})} Liberia time</p><p>Category: {n.procurementCategory.replaceAll('_',' ')}</p><p>Estimated budget: {n.estimatedBudgetUSD == null ? 'Not published' : `USD ${n.estimatedBudgetUSD.toLocaleString()}`}</p><p>Addressed to: {n.managingDirector}</p><p>{n.submissionAddress}</p><p>{n.primaryEmail} · {n.clarificationEmail} · {n.telephones.join(', ')}</p><ul className="list-inside list-disc">{n.keyRequirements.map((r,i)=><li key={i}>{r}</li>)}</ul>{n.documentsDownloadUrl && <a className="block underline" href={n.documentsDownloadUrl} target="_blank" rel="noopener noreferrer">Review linked dossier</a>}
      {n.publicationStatus === 'DRAFT' && <button disabled={busy} onClick={() => void save(`/api/procurement/notices/${n.id}/publish`, {})} className="rounded bg-forest-800 px-3 py-2 font-bold text-white">Publish reviewed notice</button>}
      {n.publicationStatus === 'PUBLISHED' && <button disabled={busy} onClick={() => void save(`/api/procurement/notices/${n.id}/withdraw`, {})} className="rounded bg-amber-50 px-3 py-2 font-bold text-amber-900">Withdraw from public portal</button>}
    </div></details>)}</div>
    <h4 className="mt-6 font-bold">Bidder inquiry queue</h4><p className="mt-1 text-xs text-slate-600">The contact details below are visible only to authorized staff.</p>
    <div className="mt-3 space-y-3">{questions.length === 0 && <p className="text-sm text-slate-600">No bidder inquiries received.</p>}{questions.map(q => <article key={q.id} className="rounded-lg border p-4 text-sm"><p className="font-bold">{q.tender_ref} · {q.company_name}</p><p className="mt-1 text-xs text-slate-600">{q.contact_person} · {q.email} · {q.phone}</p><p className="mt-3 whitespace-pre-wrap">{q.question}</p>{q.response_date ? <p className="mt-3 rounded bg-forest-50 p-3">Published response: {q.official_response}</p> : <button className="mt-3 rounded bg-forest-800 px-3 py-2 text-white" onClick={() => {setSelected(q);setPublicQuestion(q.question);setResponse('');setConfirmPublication(false);}}>Review and answer</button>}</article>)}</div>
    {selected && <form onSubmit={publishReply} className="mt-5 space-y-4 rounded-lg border border-forest-200 bg-forest-50 p-5"><h4 className="font-bold">Publish clarification for {selected.tender_ref}</h4><label className="block text-sm font-semibold">Reviewed public question<textarea required maxLength={6000} rows={3} className="input mt-1" value={publicQuestion} onChange={e => setPublicQuestion(e.target.value)}/></label><label className="block text-sm font-semibold">Official response<textarea required maxLength={12000} rows={4} className="input mt-1" value={response} onChange={e => setResponse(e.target.value)}/></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={confirmPublication} onChange={e => setConfirmPublication(e.target.checked)}/>I have removed confidential information and approve this question and response for public publication.</label><div className="flex gap-3"><button disabled={busy} className="rounded bg-forest-800 px-4 py-2 font-bold text-white">Publish official clarification</button><button type="button" onClick={()=>setSelected(null)} className="rounded border bg-white px-4 py-2">Cancel</button></div></form>}
  </section>;
}
