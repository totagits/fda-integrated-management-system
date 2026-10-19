import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { PublishedTender } from '../public/usePublicPortal';

type Api = <T>(url: string, options?: RequestInit) => Promise<T>;
type Question = { id: string; tender_ref: string; company_name: string; contact_person: string; email: string; phone: string; question: string; official_response: string | null; response_date: string | null };
type Office = { id: string; name: string };
type Supplier = { id:string; email:string; contact_name:string; status:string; email_verified_at:string|null; legal_name:string; registration_no:string; review_note:string|null; business_lines:{id:string;businessLine:string}[]; documents:{id:string;documentType:string;originalName:string;expiresOn:string;verificationStatus:string;reviewNote:string|null}[] };
type Submission = {id:string;reference:string;submission_kind:string;status:string;submitted_at:string|null;bidder_id:string;legal_name:string;email:string;tender_ref:string;title:string;document_count:number};
const emptyNotice = { tenderRef: '', title: '', procurementCategory: 'CONSULTING_SERVICES', orgUnitId: '', submissionDeadline: '', managingDirector: '', submissionAddress: '', primaryEmail: '', clarificationEmail: '', telephones: '', estimatedBudgetUSD: '', requirements: '', documentsDownloadUrl: '' };

export function PublicProcurementAdmin({api, offices}: {api: Api; offices: Office[]}) {
  const [notices, setNotices] = useState<PublishedTender[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [noticeDocs, setNoticeDocs] = useState<Record<string,{id:string;original_name:string}[]>>({});
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
      const [n, q, b, s] = await Promise.all([api<PublishedTender[]>('/api/procurement/notices'), api<Question[]>('/api/procurement/clarifications'), api<Supplier[]>('/api/procurement/bidders'), api<Submission[]>('/api/procurement/bidder-submissions')]);
      setNotices(n); setQuestions(q); setSuppliers(b); setSubmissions(s);
      const docs = await Promise.all(n.map(async notice => [notice.id, await api<{id:string;original_name:string}[]>(`/api/procurement/notices/${notice.id}/documents`)] as const));
      setNoticeDocs(Object.fromEntries(docs));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load procurement publication records.'); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  const save = async (url: string, body: unknown) => {
    setBusy(true); setError(''); setMessage('');
    try { await api(url, {method: 'POST', body: JSON.stringify(body)}); await load(); setMessage('Saved. The action is recorded in the audit history.'); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'The record could not be saved.'); return false; }
    finally { setBusy(false); }
  };
  const uploadNoticeDoc = async (noticeId: string, file?: File) => {
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try { const data=new FormData();data.set('file',file);await api(`/api/procurement/notices/${noticeId}/documents`,{method:'POST',body:data});await load();setMessage('Solicitation document uploaded to protected storage and attached to the draft.'); }
    catch(err){setError(err instanceof Error?err.message:'The dossier document could not be uploaded.');}
    finally{setBusy(false);}
  };
  const reviewDocument = async (supplier:Supplier, documentId:string, status:'VERIFIED'|'REJECTED') => {
    await save(`/api/procurement/bidders/${supplier.id}/documents/${documentId}/review`,{status,note:status==='VERIFIED'?'Reviewed by FDA Procurement against the submitted certificate.':'Could not validate the submitted certificate; supplier must upload a corrected copy.'});
  };
  const decideSupplier = async (supplier:Supplier, status:'ACTIVE'|'REJECTED'|'SUSPENDED') => {
    await save(`/api/procurement/bidders/${supplier.id}/decision`,{status,note:status==='ACTIVE'?'Supplier eligibility reviewed and approved by FDA Procurement.':`Supplier account ${status.toLowerCase()} after documented procurement review.`});
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
      <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold">RFQ / RFP / EOI dossier files</p><div className="mt-2 space-y-1">{(noticeDocs[n.id]||[]).map(doc=><a key={doc.id} className="block text-forest-800 underline" href={`/api/procurement/notice-documents/${doc.id}/download`}>{doc.original_name}</a>)}{!(noticeDocs[n.id]||[]).length&&<p className="text-xs text-slate-500">No uploaded dossier files.</p>}</div>{n.publicationStatus==='DRAFT'&&<label className="mt-3 block text-xs font-semibold">Upload solicitation document (PDF, PNG, JPEG; max 10 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="mt-1 block w-full rounded border bg-white p-2" onChange={e=>{const file=e.target.files?.[0];e.target.value='';void uploadNoticeDoc(n.id,file);}}/></label>}</div>
      {n.publicationStatus === 'DRAFT' && <button disabled={busy} onClick={() => void save(`/api/procurement/notices/${n.id}/publish`, {})} className="rounded bg-forest-800 px-3 py-2 font-bold text-white">Publish reviewed notice</button>}
      {n.publicationStatus === 'PUBLISHED' && <button disabled={busy} onClick={() => void save(`/api/procurement/notices/${n.id}/withdraw`, {})} className="rounded bg-amber-50 px-3 py-2 font-bold text-amber-900">Withdraw from public portal</button>}
    </div></details>)}</div>
    <h4 className="mt-6 font-bold">Bidder inquiry queue</h4><p className="mt-1 text-xs text-slate-600">The contact details below are visible only to authorized staff.</p>
    <div className="mt-3 space-y-3">{questions.length === 0 && <p className="text-sm text-slate-600">No bidder inquiries received.</p>}{questions.map(q => <article key={q.id} className="rounded-lg border p-4 text-sm"><p className="font-bold">{q.tender_ref} · {q.company_name}</p><p className="mt-1 text-xs text-slate-600">{q.contact_person} · {q.email} · {q.phone}</p><p className="mt-3 whitespace-pre-wrap">{q.question}</p>{q.response_date ? <p className="mt-3 rounded bg-forest-50 p-3">Published response: {q.official_response}</p> : <button className="mt-3 rounded bg-forest-800 px-3 py-2 text-white" onClick={() => {setSelected(q);setPublicQuestion(q.question);setResponse('');setConfirmPublication(false);}}>Review and answer</button>}</article>)}</div>
    {selected && <form onSubmit={publishReply} className="mt-5 space-y-4 rounded-lg border border-forest-200 bg-forest-50 p-5"><h4 className="font-bold">Publish clarification for {selected.tender_ref}</h4><label className="block text-sm font-semibold">Reviewed public question<textarea required maxLength={6000} rows={3} className="input mt-1" value={publicQuestion} onChange={e => setPublicQuestion(e.target.value)}/></label><label className="block text-sm font-semibold">Official response<textarea required maxLength={12000} rows={4} className="input mt-1" value={response} onChange={e => setResponse(e.target.value)}/></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={confirmPublication} onChange={e => setConfirmPublication(e.target.checked)}/>I have removed confidential information and approve this question and response for public publication.</label><div className="flex gap-3"><button disabled={busy} className="rounded bg-forest-800 px-4 py-2 font-bold text-white">Publish official clarification</button><button type="button" onClick={()=>setSelected(null)} className="rounded border bg-white px-4 py-2">Cancel</button></div></form>}
    <h4 className="mt-8 font-bold">Registered supplier review</h4><p className="mt-1 text-xs text-slate-600">Download and independently review each certificate before marking it verified. FDA staff approval—not account creation—makes a bidder eligible.</p>
    <div className="mt-3 space-y-4">{suppliers.length===0&&<p className="text-sm text-slate-600">No suppliers have registered.</p>}{suppliers.map(s=><article key={s.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{s.legal_name} · {s.status.replaceAll('_',' ')}</p><p className="text-xs text-slate-600">{s.registration_no} · {s.email} · {s.contact_name} · email {s.email_verified_at?'verified':'unverified'}</p><p className="mt-1 text-xs text-slate-600">Lines of business: {s.business_lines.map(x=>x.businessLine).join(' · ')||'None'}</p></div><div className="flex gap-2">{s.status!=='ACTIVE'&&<button disabled={busy||!s.email_verified_at} className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={()=>void decideSupplier(s,'ACTIVE')}>Approve supplier</button>}{s.status==='ACTIVE'&&<button disabled={busy} className="rounded bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900" onClick={()=>void decideSupplier(s,'SUSPENDED')}>Suspend</button>}{s.status!=='REJECTED'&&<button disabled={busy} className="rounded border px-3 py-2 text-xs" onClick={()=>void decideSupplier(s,'REJECTED')}>Reject</button>}</div></div><div className="mt-3 space-y-2">{s.documents.map(doc=><div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 p-3 text-xs"><span><b>{doc.documentType.replaceAll('_',' ')}</b> · {doc.originalName} · expires {doc.expiresOn} · {doc.verificationStatus}{doc.reviewNote&&` · ${doc.reviewNote}`}</span><div className="flex gap-2"><a className="text-forest-800 underline" href={`/api/procurement/bidders/${s.id}/documents/${doc.id}/download`}>Download / review</a>{doc.verificationStatus==='PENDING'&&<><button className="font-bold text-emerald-800" disabled={busy} onClick={()=>void reviewDocument(s,doc.id,'VERIFIED')}>Verify</button><button className="font-bold text-red-700" disabled={busy} onClick={()=>void reviewDocument(s,doc.id,'REJECTED')}>Reject</button></>}</div></div>)}{s.documents.length===0&&<p className="text-xs text-slate-500">No certificates uploaded yet.</p>}</div></article>)}</div>
    <h4 className="mt-8 font-bold">Received RFQ / RFP / EOI submissions</h4><div className="mt-3 space-y-3">{submissions.length===0&&<p className="text-sm text-slate-600">No online supplier submissions received.</p>}{submissions.map(s=><article key={s.id} className="rounded-lg border p-4 text-sm"><p className="font-bold">{s.tender_ref} · {s.title}</p><p className="mt-1 text-xs text-slate-600">{s.legal_name} · {s.email} · {s.reference} · {s.submission_kind} · {s.status} · {s.document_count} file(s)</p>{s.submitted_at&&<p className="text-xs text-slate-600">Submitted {new Date(s.submitted_at).toLocaleString()}</p>}<SubmissionFiles api={api} id={s.id}/></article>)}</div>
  </section>;
}

function SubmissionFiles({api,id}:{api:Api;id:string}) {
  const [files,setFiles]=useState<{id:string;original_name:string}[]>([]);
  useEffect(()=>{void api<{id:string;original_name:string}[]>(`/api/procurement/bid-submissions/${id}/documents`).then(setFiles).catch(()=>setFiles([]));},[api,id]);
  return <div className="mt-2 flex flex-wrap gap-2">{files.map(file=><a key={file.id} className="text-forest-800 underline" href={`/api/procurement/bid-submission-documents/${file.id}/download`}>{file.original_name}</a>)}</div>;
}
