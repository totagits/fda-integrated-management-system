import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Building2, CalendarClock, FileCheck2, FileUp, LogOut, LockKeyhole, MessageSquareText, Send, ShieldAlert } from 'lucide-react';

type Eligibility = { eligible: boolean; status: string; reasons: string[] };
type Document = { id: string; documentType: string; originalName: string; expiresOn: string; verificationStatus: string; reviewNote?: string | null; expiryAlerts?:{daysBefore:number;dueAt:string;status:string;sentAt:string|null}[] };
type Profile = { id: string; email: string; contact_name: string; phone: string; status: string; email_verified_at: string | null; review_note: string | null; legal_name: string; registration_no: string; business_lines: { id: string; businessLine: string }[]; documents: Document[]; eligibility: Eligibility };
type Opportunity = { id: string; tenderRef: string; title: string; submissionDeadline: string; sealed: boolean; documentCount: number; keyRequirements: string[]; procurementCategory: string };
type Submission = { id: string; reference: string; submission_kind: string; status: string; submitted_at: string | null; tender_ref: string; title: string; document_count: number };

async function bidderApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
    const csrf = decodeURIComponent(document.cookie.split('; ').find(v => v.startsWith('fda_bidder_csrf='))?.split('=').slice(1).join('=') || '');
    headers.set('X-CSRF-Token', csrf);
  }
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || `Request failed (${response.status}).`);
  return value as T;
}

const nice = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Monrovia', dateStyle: 'medium', timeStyle: 'short' });
const documentTypes = ['BUSINESS_REGISTRATION','TAX_CLEARANCE','PPCC_CERTIFICATE','ARTICLES_OF_INCORPORATION','AUDITED_FINANCIALS','PROFESSIONAL_LICENSE','OTHER'];

export function BidderPortal() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [selected, setSelected] = useState('');
  const [question, setQuestion] = useState('');
  const [form, setForm] = useState({ legalName: '', registrationNo: '', contactName: '', email: '', phone: '', password: '', businessLines: '' });
  const [docType, setDocType] = useState('BUSINESS_REGISTRATION');
  const [expiresOn, setExpiresOn] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const verificationToken = new URLSearchParams(window.location.search).get('token');

  const load = useCallback(async () => {
    try {
      const [me, tenders, bids] = await Promise.all([
        bidderApi<Profile>('/api/bidders/me'), bidderApi<Opportunity[]>('/api/bidders/opportunities'), bidderApi<Submission[]>('/api/bidders/submissions'),
      ]);
      setProfile(me); setOpportunities(tenders); setSubmissions(bids);
    } catch { setProfile(null); setOpportunities([]); setSubmissions([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!verificationToken) return;
    setBusy(true); setError(''); setNotice('');
    bidderApi<{verified:boolean}>('/api/bidders/verify', { method: 'POST', body: JSON.stringify({ token: verificationToken }) })
      .then(() => { setNotice('Business email verified. Sign in, upload current certificates, and complete FDA supplier review.'); setMode('login'); window.history.replaceState({}, '', '/bidder'); })
      .catch(e => setError(e instanceof Error ? e.message : 'Verification failed.'))
      .finally(() => setBusy(false));
  }, [verificationToken]);

  const act = async (callback: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await callback(); }
    catch (e) { setError(e instanceof Error ? e.message : 'The request could not be completed.'); }
    finally { setBusy(false); }
  };

  const submitAccount = (event: FormEvent) => {
    event.preventDefault();
    void act(async () => {
      if (mode === 'register') {
        const result = await bidderApi<{emailSent:boolean;nextStep:string}>('/api/bidders/register', { method: 'POST', body: JSON.stringify({ ...form, businessLines: form.businessLines.split(/[\n,;]/).map(v => v.trim()).filter(Boolean) }) });
        setNotice(result.emailSent ? 'Registration received. Verify the link sent to your business email. FDA approval is required before offers can be submitted.' : `${result.nextStep} Please contact FDA Procurement if the verification email does not arrive.`);
        setMode('login');
      } else {
        await bidderApi('/api/bidders/login', { method: 'POST', body: JSON.stringify({ email: form.email, password: form.password }) });
        await load(); setNotice('Signed in to the FDA supplier portal.');
      }
    });
  };

  const uploadDocument = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get('file');
    if (!(file instanceof File) || !file.size) { setError('Choose the certificate file to upload.'); return; }
    void act(async () => {
      const data = new FormData(); data.set('file', file); data.set('documentType', docType); data.set('expiresOn', expiresOn);
      await bidderApi('/api/bidders/documents', { method: 'POST', body: data });
      form.reset(); setExpiresOn(''); await load(); setNotice('Document uploaded securely and queued for FDA verification. Expiry reminders are scheduled at 14, 7, 3, and 1 day before expiry.');
    });
  };

  const submitClarification = (event: FormEvent, tenderId: string) => {
    event.preventDefault();
    void act(async () => {
      await bidderApi('/api/bidder/clarifications', { method: 'POST', body: JSON.stringify({ tenderId, question }) });
      setQuestion(''); await load(); setNotice('Clarification submitted to FDA Procurement. Only a reviewed response is made public.');
    });
  };

  const submitBid = (event: FormEvent<HTMLFormElement>, tender: Opportunity) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = formData.getAll('offerFiles').filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) { setError('Select at least one offer document.'); return; }
    void act(async () => {
      const draft = await bidderApi<{id:string;reference:string}>('/api/bidders/opportunities/'+tender.id+'/submissions', { method: 'POST', body: JSON.stringify({ submissionKind: formData.get('submissionKind') }) });
      for (const file of files) { const data = new FormData(); data.set('file', file); await bidderApi('/api/bidders/submissions/'+draft.id+'/documents', { method: 'POST', body: data }); }
      await bidderApi('/api/bidders/submissions/'+draft.id+'/submit', { method: 'POST', body: '{}' });
      form.reset(); await load(); setNotice(`Offer received. Reference: ${draft.reference}. Keep this reference for your records.`);
    });
  };

  const logout = () => void act(async () => { await bidderApi('/api/bidders/logout', { method: 'POST', body: '{}' }); setProfile(null); setNotice('You are signed out.'); });

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <header className="bg-forest-950 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5"><div><a href="/" className="mb-2 inline-flex items-center gap-1 text-xs text-forest-200"><ArrowLeft size={14}/> FDA public portal</a><h1 className="text-xl font-bold">Supplier and Bidder Portal</h1><p className="mt-1 text-sm text-forest-100">Supplier registration, certificates, opportunity responses, and clarifications</p></div>{profile && <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm"><LogOut size={16}/> Sign out</button>}</div></header>
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}
      {!profile && <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex gap-2"><button className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode==='login'?'bg-forest-800 text-white':'bg-slate-100'}`} onClick={()=>setMode('login')}>Supplier sign in</button><button className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode==='register'?'bg-forest-800 text-white':'bg-slate-100'}`} onClick={()=>setMode('register')}>Register business</button></div>
        <div className="mb-5 flex gap-3"><Building2 className="mt-1 text-forest-800"/><div><h2 className="font-bold">{mode==='register'?'Create a supplier account':'Access your supplier account'}</h2><p className="mt-1 text-sm text-slate-600">Only registered, email-verified, FDA-approved suppliers with verified current business registration and tax-clearance certificates can submit offers.</p></div></div>
        <form onSubmit={submitAccount} className="grid gap-4 sm:grid-cols-2">
          {mode==='register' && <><Field label="Legal business name" value={form.legalName} onChange={v=>setForm({...form,legalName:v})}/><Field label="Business registration number" value={form.registrationNo} onChange={v=>setForm({...form,registrationNo:v})}/><Field label="Authorized contact person" value={form.contactName} onChange={v=>setForm({...form,contactName:v})}/><Field label="Business telephone" value={form.phone} onChange={v=>setForm({...form,phone:v})}/><label className="block text-sm font-medium sm:col-span-2">Lines of business <span className="text-slate-500">(one per line)</span><textarea required rows={3} maxLength={5000} className="mt-1 w-full rounded-lg border p-3" value={form.businessLines} onChange={e=>setForm({...form,businessLines:e.target.value})}/></label></>}
          <Field label="Business email" type="email" value={form.email} onChange={v=>setForm({...form,email:v})}/><Field label="Password (12 characters minimum)" type="password" value={form.password} onChange={v=>setForm({...form,password:v})}/>
          <button disabled={busy} className="rounded-lg bg-forest-800 px-4 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">{busy?'Please wait…':mode==='register'?'Register and verify email':'Sign in'}</button>
          {mode==='login'&&<button type="button" disabled={busy||!form.email} className="text-left text-sm font-semibold text-forest-800 underline disabled:opacity-50 sm:col-span-2" onClick={()=>void act(async()=>{const result=await bidderApi<{message:string}>('/api/bidders/resend-verification',{method:'POST',body:JSON.stringify({email:form.email})});setNotice(result.message);})}>Resend email verification link</button>}
        </form>
      </div>}
      {profile && <>
        <section className="grid gap-4 md:grid-cols-3"><Stat label="Supplier account" value={nice(profile.status)} icon={<Building2/>}/><Stat label="Offer eligibility" value={profile.eligibility.eligible?'Eligible':'Not eligible'} icon={profile.eligibility.eligible?<BadgeCheck/>:<ShieldAlert/>}/><Stat label="Business email" value={profile.email_verified_at?'Verified':'Not verified'} icon={<FileCheck2/>}/></section>
        <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold"><Building2 size={18}/> Business profile</h2><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p><b>Registered name:</b> {profile.legal_name}</p><p><b>Registration number:</b> {profile.registration_no}</p><p><b>Portal email:</b> {profile.email}</p><p><b>Contact:</b> {profile.contact_name} · {profile.phone}</p><p className="sm:col-span-2"><b>Lines of business:</b> {profile.business_lines.map(x=>x.businessLine).join(' · ') || 'None entered'}</p></div>{profile.review_note && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">FDA review note: {profile.review_note}</p>}{profile.eligibility.reasons.length>0&&<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="text-sm font-bold text-amber-950">Actions required before bidding</h3><ul className="mt-2 list-inside list-disc text-sm text-amber-900">{profile.eligibility.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul></div>}</section>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-bold"><FileUp size={18}/> Business certificates</h2><p className="mt-1 text-xs text-slate-600">Private documents are stored securely and visible to the bidder and authorized procurement reviewers. Supported files: PDF, PNG, JPEG up to 10 MB.</p>
            <form onSubmit={uploadDocument} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Certificate type<select className="mt-1 w-full rounded-lg border p-2" value={docType} onChange={e=>setDocType(e.target.value)}>{documentTypes.map(t=><option key={t} value={t}>{nice(t)}</option>)}</select></label><label className="text-sm font-medium">Expiration date<input required type="date" min={new Date().toISOString().slice(0,10)} className="mt-1 w-full rounded-lg border p-2" value={expiresOn} onChange={e=>setExpiresOn(e.target.value)}/></label><label className="text-sm font-medium sm:col-span-2">Document file<input required name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="mt-1 block w-full rounded-lg border p-2"/></label><button disabled={busy} className="rounded-lg bg-forest-800 px-4 py-2 font-semibold text-white sm:col-span-2">Upload certificate for review</button></form>
            <div className="mt-4 space-y-2">{profile.documents.map(doc=><article key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div><p className="font-semibold">{nice(doc.documentType)} · {nice(doc.verificationStatus)}</p><p className="text-xs text-slate-600">{doc.originalName} · expires {doc.expiresOn}</p>{doc.expiryAlerts&&doc.expiryAlerts.length>0&&<p className="mt-1 text-xs text-slate-500">Reminder status: {doc.expiryAlerts.map(a=>`${a.daysBefore}d ${a.status.toLowerCase()}`).join(' · ')}</p>}{doc.reviewNote&&<p className="mt-1 text-xs text-amber-800">{doc.reviewNote}</p>}</div><a className="text-forest-800 underline" href={`/api/bidders/documents/${doc.id}/download`}>Download</a></article>)}{profile.documents.length===0&&<p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No certificates uploaded yet.</p>}</div>
            <p className="mt-4 flex items-start gap-2 text-xs text-slate-600"><CalendarClock size={16} className="shrink-0"/>When the document is on file at least 14 days before expiry, four email reminders are scheduled for 14, 7, 3, and 1 day before expiry. If it is uploaded later, remaining future reminders are scheduled. FDA approval is a manual review; the system does not verify documents against external agencies.</p>
          </div>
          <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">My submissions</h2><div className="mt-3 space-y-2">{submissions.map(s=><article key={s.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{s.tender_ref} · {s.title}</p><p className="mt-1 text-xs text-slate-600">{s.reference} · {nice(s.submission_kind)} · {nice(s.status)} · {s.document_count} file(s)</p>{s.submitted_at&&<p className="text-xs text-slate-600">Submitted {dateTime(s.submitted_at)}</p>}</article>)}{submissions.length===0&&<p className="text-sm text-slate-600">Your bid submissions will appear here.</p>}</div></div>
        </section>
        <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">Open opportunities</h2><p className="mt-1 text-sm text-slate-600">Only approved suppliers with in-date verified registration and tax-clearance records may submit offers. Sealed tenders require the FDA-issued invitation and encrypted bid channel.</p><div className="mt-4 grid gap-4 xl:grid-cols-2">{opportunities.map(t=><OpportunityCard key={t.id} tender={t} eligible={profile.eligibility.eligible&&profile.status==='ACTIVE'} busy={busy} question={question} onQuestion={setQuestion} submitClarification={submitClarification} submitBid={submitBid}/>)}{opportunities.length===0&&<p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">There are no published open opportunities at this time.</p>}</div></section>
      </>}
    </div>
  </main>;
}

function Field({label,value,onChange,type='text'}:{label:string;value:string;onChange:(v:string)=>void;type?:string}) { return <label className="block text-sm font-medium">{label}<input required type={type} minLength={type==='password'?12:undefined} maxLength={type==='password'?1024:254} autoComplete={type==='password'?'new-password':undefined} className="mt-1 w-full rounded-lg border p-3" value={value} onChange={e=>onChange(e.target.value)}/></label>; }
function Stat({label,value,icon}:{label:string;value:string;icon:React.ReactNode}) { return <div className="flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm"><span className="text-forest-800">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p></div></div>; }
function OpportunityCard({tender,eligible,busy,question,onQuestion,submitClarification,submitBid}:{tender:Opportunity;eligible:boolean;busy:boolean;question:string;onQuestion:(v:string)=>void;submitClarification:(e:FormEvent,tenderId:string)=>void;submitBid:(e:FormEvent<HTMLFormElement>,tender:Opportunity)=>void}) {
  const [documents,setDocuments]=useState<{id:string;original_name:string}[]>([]);
  const [loadError,setLoadError]=useState('');
  useEffect(()=>{bidderApi<{id:string;original_name:string}[]>(`/api/bidders/opportunities/${tender.id}/documents`).then(setDocuments).catch(e=>setLoadError(e.message));},[tender.id]);
  return <article className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">{tender.tenderRef} · {tender.title}</p><p className="mt-1 text-xs text-slate-600">{nice(tender.procurementCategory)} · deadline {dateTime(tender.submissionDeadline)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${tender.sealed?'bg-violet-50 text-violet-800':'bg-emerald-50 text-emerald-800'}`}>{tender.sealed?'Encrypted sealed bid':'Online response'}</span></div>
    {tender.keyRequirements?.length>0&&<ul className="mt-3 list-inside list-disc text-xs text-slate-700">{tender.keyRequirements.slice(0,5).map((x,i)=><li key={i}>{x}</li>)}</ul>}
    <div className="mt-3 flex flex-wrap gap-2 text-xs">{documents.map(d=><a key={d.id} className="rounded-lg border px-2 py-1 text-forest-800 underline" href={`/api/public/tender-documents/${d.id}`}>Download {d.original_name}</a>)}{loadError&&<span className="text-amber-700">Dossier list unavailable: {loadError}</span>}</div>
    {!tender.sealed&&<form onSubmit={e=>submitBid(e,tender)} className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3"><h3 className="text-sm font-bold">Submit an RFQ / RFP / EOI response</h3><select name="submissionKind" required className="w-full rounded border p-2 text-sm"><option value="">Select response type</option>{['RFQ','RFP','EOI'].map(v=><option key={v}>{v}</option>)}</select><input required name="offerFiles" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" className="block w-full rounded border bg-white p-2 text-xs"/><button disabled={!eligible||busy} className="w-full rounded bg-forest-800 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{eligible?'Upload and submit offer':'Complete supplier approval and certificates first'}</button></form>}
    {tender.sealed&&<p className="mt-4 rounded-lg bg-violet-50 p-3 text-xs text-violet-900">Sealed bid packages must be submitted using the unique FDA invitation and encrypted sealed-bid channel; this standard upload is disabled.</p>}
    <form onSubmit={e=>submitClarification(e,tender.id)} className="mt-4 flex gap-2"><input required maxLength={6000} value={question} onChange={e=>onQuestion(e.target.value)} placeholder="Write a clarification question" className="min-w-0 flex-1 rounded-lg border p-2 text-sm"/><button title="Send clarification" disabled={busy} className="rounded-lg border px-3 text-forest-800 disabled:opacity-50"><Send size={16}/></button></form>
  </article>;
}
