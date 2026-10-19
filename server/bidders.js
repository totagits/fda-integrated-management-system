import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { hashPassword, verifyPassword } from './security.js';
import { sendBidderVerification, sendBidderExpiryReminder } from './identity-email.js';
import { safeUploadsDirectory } from './db.js';

const fail = (message, status = 422, code = 'BIDDER_PORTAL_ERROR') => Object.assign(new Error(message), { status, code });
const required = (value, label, max = 240) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw fail(`${label} is required (maximum ${max} characters).`);
  return value.trim();
};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const emailValue = value => {
  const email = required(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Enter a valid business email address.');
  return email;
};
const cookieMap = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => v.trim()).filter(Boolean).map(part => {
  const i = part.indexOf('=');
  try { return [decodeURIComponent(part.slice(0, i)), decodeURIComponent(part.slice(i + 1))]; } catch { return ['', '']; }
}));
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const allowed = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function uploadMiddleware() {
  return multer({
    storage: multer.diskStorage({
      destination: async (_req, _file, cb) => { try { cb(null, await safeUploadsDirectory()); } catch (error) { cb(error); } },
      filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed[ext] !== file.mimetype) return cb(fail('Only PDF, PNG, and JPEG files are accepted.', 422, 'FILE_TYPE_NOT_ALLOWED'));
      cb(null, true);
    },
  });
}

async function fileDigest(file) {
  const bytes = await fs.readFile(file.path);
  const ext = path.extname(file.originalname).toLowerCase();
  const signatureOk = ext === '.pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : ext === '.png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!signatureOk) throw fail('The file contents do not match the selected file type.', 422, 'FILE_SIGNATURE_INVALID');
  await fs.chmod(file.path, 0o600);
  return { bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), originalName: path.basename(file.originalname).replace(/[\r\n]/g, '_').slice(0, 180) };
}

const dateAtReminder = (expiry, daysBefore) => {
  const date = new Date(`${expiry}T09:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - daysBefore);
  return date;
};

export function registerBidders(app, deps) {
  const { pool, transaction, writeAudit, uuid, route, ensureDb, loadAuth, csrfRequired, guard, scopedUnits } = deps;
  const multipart = uploadMiddleware();
  const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
  const sessionHours = Number(process.env.BIDDER_SESSION_HOURS || 12);

  function bidderAuth(req, res, next) {
    Promise.resolve().then(async () => {
      ensureDb();
      const cookies = cookieMap(req);
      const token = cookies.fda_bidder_session;
      if (!token) return res.status(401).json({ error: 'Sign in to the FDA supplier portal to continue.', code: 'BIDDER_UNAUTHENTICATED' });
      const found = await pool.query(`SELECT s.token_hash,s.csrf_hash,s.expires_at,b.id,b.vendor_id,b.email,b.contact_name,b.phone,b.status,b.email_verified_at,b.review_note,v.legal_name,v.registration_no
        FROM bidder_sessions s JOIN bidder_accounts b ON b.id=s.bidder_id JOIN vendors v ON v.id=b.vendor_id
        WHERE s.token_hash=$1 AND s.expires_at>now()`, [hash(token)]);
      if (!found.rowCount) return res.status(401).json({ error: 'Supplier session expired. Sign in again.', code: 'BIDDER_SESSION_EXPIRED' });
      req.bidder = found.rows[0];
      req.bidderCsrfHash = found.rows[0].csrf_hash;
      await pool.query('UPDATE bidder_sessions SET last_seen_at=now() WHERE token_hash=$1', [hash(token)]);
      next();
    }).catch(next);
  }

  function bidderCsrf(req, res, next) {
    const cookies = cookieMap(req);
    const token = cookies.fda_bidder_csrf || '';
    if (!token || token !== req.get('x-csrf-token') || hash(token) !== req.bidderCsrfHash) return res.status(403).json({ error: 'The supplier portal security token expired. Refresh and retry.', code: 'BIDDER_CSRF_FAILED' });
    next();
  }

  const uploadRoute = (auth, csrf, kind) => [auth, csrf, route(async (req, res, next) => {
    req.uploadKind = kind;
    next();
  }), multipart.single('file'), route(async (req, res, next) => {
    if (!req.file) throw fail('Choose a PDF, PNG, or JPEG file to upload.');
    next();
  })];

  app.post('/api/bidders/register', registerLimiter, route(async (req, res) => {
    ensureDb();
    const body = req.body || {};
    const legalName = required(body.legalName, 'Legal business name', 180);
    const registrationNo = required(body.registrationNo, 'Business registration number', 100);
    const contactName = required(body.contactName, 'Contact person', 160);
    const email = emailValue(body.email);
    const phone = required(body.phone, 'Telephone', 80);
    const password = String(body.password || '');
    if (password.length < 12 || password.length > 1024) throw fail('Choose a password with at least 12 characters.');
    const rawLines = Array.isArray(body.businessLines) ? body.businessLines : String(body.businessLines || '').split(/[\n,;]/);
    const businessLines = [...new Set(rawLines.map(v => String(v).trim()).filter(Boolean))];
    if (!businessLines.length || businessLines.length > 30 || businessLines.some(v => v.length > 160)) throw fail('Enter between 1 and 30 lines of business (maximum 160 characters each).');
    const id = uuid();
    const vendorId = uuid();
    const verificationId = uuid();
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await transaction(async client => {
      await client.query("INSERT INTO vendors(id,legal_name,registration_no,status) VALUES($1,$2,$3,'PENDING')", [vendorId, legalName, registrationNo]);
      await client.query(`INSERT INTO bidder_accounts(id,vendor_id,email,contact_name,phone,password_hash) VALUES($1,$2,$3,$4,$5,$6)`, [id, vendorId, email, contactName, phone, await hashPassword(password)]);
      for (const line of businessLines) await client.query('INSERT INTO bidder_business_lines(id,bidder_id,business_line) VALUES($1,$2,$3)', [uuid(), id, line]);
      await client.query('INSERT INTO bidder_email_verifications(id,bidder_id,token_hash,expires_at) VALUES($1,$2,$3,$4)', [verificationId, id, hash(token), expiresAt]);
      await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.account_registered', 'bidder_account', id, { vendorId, email, legalName, registrationNo, businessLineCount: businessLines.length });
    });
    let emailSent = false;
    try {
      const delivery = await sendBidderVerification({ email, companyName: legalName, token, expiresAt });
      emailSent = Boolean(delivery.sent);
      if (emailSent) await pool.query('UPDATE bidder_email_verifications SET sent_at=now() WHERE id=$1', [verificationId]);
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'bidder_verification_delivery_failed', bidderId: id, code: String(error?.code || error?.name || 'DELIVERY_FAILED').slice(0, 80) }));
    }
    res.status(201).json({ id, status: 'EMAIL_VERIFICATION_REQUIRED', emailSent, nextStep: emailSent ? 'Check your business email and verify the account, then upload current certificates for FDA review.' : 'Email delivery is unavailable. Contact FDA Procurement to request a verification email.' });
  }));

  app.post('/api/bidders/verify', authLimiter, route(async (req, res) => {
    ensureDb();
    const token = required(req.body?.token, 'Verification token', 100);
    if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) throw fail('Verification link is invalid or expired.', 410);
    const result = await transaction(async client => {
      const found = await client.query(`SELECT v.id,v.bidder_id,v.expires_at,v.verified_at,b.status FROM bidder_email_verifications v JOIN bidder_accounts b ON b.id=v.bidder_id WHERE v.token_hash=$1 FOR UPDATE OF v,b`, [hash(token)]);
      const row = found.rows[0];
      if (!row || row.verified_at || new Date(row.expires_at) <= new Date() || row.status === 'SUSPENDED') throw fail('Verification link is invalid or expired. Contact FDA Procurement to request a new link.', 410);
      await client.query('UPDATE bidder_email_verifications SET verified_at=now() WHERE id=$1', [row.id]);
      await client.query('UPDATE bidder_accounts SET email_verified_at=now(),updated_at=now() WHERE id=$1', [row.bidder_id]);
      await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.email_verified', 'bidder_account', row.bidder_id);
      return row.bidder_id;
    });
    res.json({ verified: true, status: 'PENDING_REVIEW', bidderId: result });
  }));

  app.post('/api/bidders/resend-verification', authLimiter, route(async (req, res) => {
    ensureDb();
    const email = emailValue(req.body?.email);
    const found = await pool.query(`SELECT b.id,b.email,v.legal_name FROM bidder_accounts b JOIN vendors v ON v.id=b.vendor_id
      WHERE b.email=$1 AND b.email_verified_at IS NULL AND b.status='PENDING_REVIEW'`, [email]);
    if (found.rowCount) {
      const bidder = found.rows[0];
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const id = uuid();
      await transaction(async client => {
        await client.query('UPDATE bidder_email_verifications SET expires_at=now() WHERE bidder_id=$1 AND verified_at IS NULL', [bidder.id]);
        await client.query('INSERT INTO bidder_email_verifications(id,bidder_id,token_hash,expires_at) VALUES($1,$2,$3,$4)', [id, bidder.id, hash(token), expiresAt]);
      });
      try {
        const delivery = await sendBidderVerification({ email, companyName: bidder.legal_name, token, expiresAt });
        if (delivery.sent) await pool.query('UPDATE bidder_email_verifications SET sent_at=now() WHERE id=$1', [id]);
      } catch (error) {
        console.error(JSON.stringify({ level: 'error', event: 'bidder_verification_delivery_failed', bidderId: bidder.id, code: String(error?.code || error?.name || 'DELIVERY_FAILED').slice(0, 80) }));
      }
    }
    res.json({ accepted: true, message: 'If a matching unverified supplier account exists, a new verification link has been sent.' });
  }));

  app.post('/api/bidders/login', authLimiter, route(async (req, res) => {
    ensureDb();
    const email = emailValue(req.body?.email);
    const password = String(req.body?.password || '');
    if (!password || password.length > 1024) throw fail('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
    const found = await pool.query('SELECT id,email,password_hash,status,email_verified_at FROM bidder_accounts WHERE email=$1', [email]);
    const bidder = found.rows[0];
    if (!bidder || !(await verifyPassword(password, bidder.password_hash))) {
      await pool.query('SELECT pg_sleep(0.12)');
      throw fail('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
    }
    if (!bidder.email_verified_at) throw fail('Verify the email address using the link sent during registration before signing in.', 403, 'BIDDER_EMAIL_NOT_VERIFIED');
    if (bidder.status === 'SUSPENDED') throw fail('This supplier account is suspended. Contact FDA Procurement for assistance.', 403, 'BIDDER_ACCOUNT_INACTIVE');
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
    await transaction(async client => {
      await client.query('INSERT INTO bidder_sessions(token_hash,bidder_id,csrf_hash,expires_at) VALUES($1,$2,$3,$4)', [hash(sessionToken), bidder.id, hash(csrfToken), expiresAt]);
      await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.login', 'bidder_account', bidder.id, { email: bidder.email });
    });
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `fda_bidder_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionHours * 3600}${secure}`,
      `fda_bidder_csrf=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax; Max-Age=${sessionHours * 3600}${secure}`,
    ]);
    res.json({ status: bidder.status, email: bidder.email });
  }));

  app.get('/api/bidders/me', bidderAuth, route(async (req, res) => {
    const profile = await pool.query(`SELECT b.id,b.email,b.contact_name,b.phone,b.status,b.email_verified_at,b.review_note,b.created_at,v.legal_name,v.registration_no,
      COALESCE((SELECT json_agg(json_build_object('id',l.id,'businessLine',l.business_line) ORDER BY l.business_line) FROM bidder_business_lines l WHERE l.bidder_id=b.id),'[]'::json) AS business_lines,
      COALESCE((SELECT json_agg(json_build_object('id',d.id,'documentType',d.document_type,'originalName',d.original_name,'expiresOn',d.expires_on,'verificationStatus',d.verification_status,'reviewNote',d.review_note,'createdAt',d.created_at,
        'expiryAlerts',(SELECT COALESCE(json_agg(json_build_object('daysBefore',a.days_before,'dueAt',a.due_at,'status',a.status,'sentAt',a.sent_at) ORDER BY a.days_before DESC),'[]'::json) FROM bidder_expiry_alerts a WHERE a.document_id=d.id)) ORDER BY d.created_at DESC) FROM bidder_documents d WHERE d.bidder_id=b.id),'[]'::json) AS documents
      FROM bidder_accounts b JOIN vendors v ON v.id=b.vendor_id WHERE b.id=$1`, [req.bidder.id]);
    const data = profile.rows[0];
    const eligibility = await bidderEligibility(pool, req.bidder.id);
    res.json({ ...data, eligibility });
  }));

  app.post('/api/bidders/logout', bidderAuth, bidderCsrf, route(async (req, res) => {
    const cookies = cookieMap(req);
    await transaction(async client => {
      await client.query('DELETE FROM bidder_sessions WHERE token_hash=$1', [hash(cookies.fda_bidder_session || '')]);
      await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.logout', 'bidder_account', req.bidder.id);
    });
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', [
      `fda_bidder_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
      `fda_bidder_csrf=; Path=/; SameSite=Lax; Max-Age=0${secure}`,
    ]);
    res.json({ loggedOut: true });
  }));

  app.post('/api/bidders/documents', ...uploadRoute(bidderAuth, bidderCsrf, 'bidder-document'), route(async (req, res) => {
    const documentType = String(req.body.documentType || '').toUpperCase();
    const categories = ['BUSINESS_REGISTRATION','TAX_CLEARANCE','PPCC_CERTIFICATE','ARTICLES_OF_INCORPORATION','AUDITED_FINANCIALS','PROFESSIONAL_LICENSE','OTHER'];
    if (!categories.includes(documentType)) { await fs.unlink(req.file.path).catch(() => {}); throw fail('Choose a supported certificate type.'); }
    const expiresOn = String(req.body.expiresOn || '');
    if (!validDate(expiresOn) || expiresOn < new Date().toISOString().slice(0, 10)) { await fs.unlink(req.file.path).catch(() => {}); throw fail('Enter a valid future document expiration date.'); }
    const metadata = await fileDigest(req.file).catch(async error => { await fs.unlink(req.file.path).catch(() => {}); throw error; });
    const id = uuid();
    try {
      await transaction(async client => {
        await client.query(`INSERT INTO bidder_documents(id,bidder_id,document_type,original_name,storage_name,media_type,byte_size,sha256,expires_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [id, req.bidder.id, documentType, metadata.originalName, path.basename(req.file.path), req.file.mimetype, req.file.size, metadata.sha256, expiresOn]);
        for (const days of [14,7,3,1]) {
          const dueAt = dateAtReminder(expiresOn, days);
          if (dueAt > new Date()) await client.query('INSERT INTO bidder_expiry_alerts(id,document_id,bidder_id,days_before,due_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(document_id,days_before) DO NOTHING', [uuid(), id, req.bidder.id, days, dueAt]);
        }
        await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.document_uploaded', 'bidder_document', id, { bidderId: req.bidder.id, documentType, expiresOn, sha256: metadata.sha256, byteSize: req.file.size });
      });
    } catch (error) { await fs.unlink(req.file.path).catch(() => {}); throw error; }
    res.status(201).json({ id, documentType, originalName: metadata.originalName, expiresOn, verificationStatus: 'PENDING' });
  }));

  app.get('/api/bidders/documents/:id/download', bidderAuth, route(async (req, res) => {
    if (!idPattern.test(req.params.id)) throw fail('Document not found.', 404);
    const row = await pool.query('SELECT * FROM bidder_documents WHERE id=$1 AND bidder_id=$2', [req.params.id, req.bidder.id]);
    return streamDocument(row.rows[0], res);
  }));

  app.get('/api/bidders/opportunities', bidderAuth, route(async (_req, res) => {
    const rows = await pool.query(`SELECT n.id,n.tender_ref,n.details,n.deadline,n.published_at,
      EXISTS(SELECT 1 FROM sealed_tenders s WHERE s.id=n.id AND s.status='ACCEPTING') AS sealed,
      (SELECT count(*)::int FROM public_notice_documents d WHERE d.notice_id=n.id) AS document_count
      FROM public_tender_notices n WHERE n.publication_status='PUBLISHED' AND n.deadline>now() ORDER BY n.deadline`);
    res.json(rows.rows.map(row => ({ id: row.id, tenderRef: row.tender_ref, ...row.details, submissionDeadline: row.deadline, publishedAt: row.published_at, sealed: row.sealed, documentCount: row.document_count })));
  }));

  app.get('/api/bidders/opportunities/:id/documents', bidderAuth, route(async (req, res) => {
    if (!idPattern.test(req.params.id)) throw fail('Opportunity not found.', 404);
    const n = await pool.query("SELECT id FROM public_tender_notices WHERE id=$1 AND publication_status='PUBLISHED'", [req.params.id]);
    if (!n.rowCount) throw fail('Published opportunity not found.', 404);
    const rows = await pool.query('SELECT id,original_name,media_type,byte_size,created_at FROM public_notice_documents WHERE notice_id=$1 ORDER BY created_at', [req.params.id]);
    res.json(rows.rows);
  }));

  app.get('/api/public/tender-documents/:id', route(async (req, res) => {
    if (!idPattern.test(req.params.id)) throw fail('Document not found.', 404);
    const row = await pool.query(`SELECT d.* FROM public_notice_documents d JOIN public_tender_notices n ON n.id=d.notice_id WHERE d.id=$1 AND n.publication_status='PUBLISHED'`, [req.params.id]);
    return streamDocument(row.rows[0], res);
  }));

  app.get('/api/procurement/notice-documents/:id/download', loadAuth, guard('notice.manage'), route(async (req, res) => {
    const scope = await scopedUnits(req.auth);
    const row = await pool.query(`SELECT d.* FROM public_notice_documents d JOIN public_tender_notices n ON n.id=d.notice_id
      WHERE d.id=$1 AND ($2::uuid[] IS NULL OR n.org_unit_id=ANY($2::uuid[]))`, [req.params.id, scope]);
    return streamDocument(row.rows[0], res);
  }));

  app.get('/api/public/tenders/:id/documents', route(async (req, res) => {
    if (!idPattern.test(req.params.id)) throw fail('Opportunity not found.', 404);
    const n = await pool.query("SELECT 1 FROM public_tender_notices WHERE id=$1 AND publication_status='PUBLISHED'", [req.params.id]);
    if (!n.rowCount) throw fail('Published opportunity not found.', 404);
    const rows = await pool.query('SELECT id,original_name,media_type,byte_size,created_at FROM public_notice_documents WHERE notice_id=$1 ORDER BY created_at', [req.params.id]);
    res.json(rows.rows);
  }));

  app.post('/api/procurement/notices/:id/documents', loadAuth, csrfRequired, guard('notice.manage'), route(async (req, res, next) => {
    if (!idPattern.test(req.params.id)) throw fail('Notice not found.', 404);
    const notice = await pool.query('SELECT id,org_unit_id,publication_status FROM public_tender_notices WHERE id=$1', [req.params.id]);
    if (!notice.rowCount) throw fail('Notice not found.', 404);
    await deps.assertOrgAccess(req.auth, notice.rows[0].org_unit_id);
    if (notice.rows[0].publication_status !== 'DRAFT') throw fail('Notice documents are locked after publication. Withdraw the notice and issue a formal amendment instead.', 409);
    next();
  }), multipart.single('file'), route(async (req, res) => {
    if (!req.file) throw fail('Choose a PDF, PNG, or JPEG document.');
    const metadata = await fileDigest(req.file).catch(async error => { await fs.unlink(req.file.path).catch(() => {}); throw error; });
    const id = uuid();
    try {
      await transaction(async client => {
        await client.query('INSERT INTO public_notice_documents(id,notice_id,uploaded_by,original_name,storage_name,media_type,byte_size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, req.params.id, req.auth.userId, metadata.originalName, path.basename(req.file.path), req.file.mimetype, req.file.size, metadata.sha256]);
        await writeAudit(client, { ...req.auth, role: req.actorRole || req.auth.role }, 'procurement.notice_document_uploaded', 'public_notice_document', id, { noticeId: req.params.id, fileName: metadata.originalName, byteSize: req.file.size, sha256: metadata.sha256 });
      });
    } catch (error) { await fs.unlink(req.file.path).catch(() => {}); throw error; }
    res.status(201).json({ id, originalName: metadata.originalName });
  }));

  app.post('/api/bidders/opportunities/:id/submissions', bidderAuth, bidderCsrf, route(async (req, res) => {
    const noticeId = req.params.id;
    if (!idPattern.test(noticeId)) throw fail('Opportunity not found.', 404);
    await assertBidderEligible(pool, req.bidder.id);
    const kind = String(req.body?.submissionKind || '').toUpperCase();
    if (!['RFQ','RFP','EOI'].includes(kind)) throw fail('Select whether this is an RFQ, RFP, or EOI response.');
    const id = uuid();
    const reference = `FDA-BID-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    await transaction(async client => {
      const n = await client.query("SELECT id,details,deadline FROM public_tender_notices WHERE id=$1 AND publication_status='PUBLISHED' AND deadline>now() FOR UPDATE", [noticeId]);
      if (!n.rowCount) throw fail('The opportunity is closed or unpublished.', 409);
      const sealed = await client.query("SELECT 1 FROM sealed_tenders WHERE id=$1 AND status='ACCEPTING'", [noticeId]);
      if (sealed.rowCount) throw fail('This is a sealed opportunity. Submit through the encrypted sealed-bid portal invitation.', 409);
      await client.query("INSERT INTO bidder_submissions(id,notice_id,bidder_id,submission_kind,reference) VALUES($1,$2,$3,$4,$5)", [id, noticeId, req.bidder.id, kind, reference]);
      await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.submission_draft_created', 'bidder_submission', id, { bidderId: req.bidder.id, noticeId, kind });
    });
    res.status(201).json({ id, reference, status: 'DRAFT' });
  }));

  app.post('/api/bidders/submissions/:id/documents', ...uploadRoute(bidderAuth, bidderCsrf, 'submission-document'), route(async (req, res) => {
    if (!idPattern.test(req.params.id)) { await fs.unlink(req.file.path).catch(() => {}); throw fail('Draft submission not found.', 404); }
    const metadata = await fileDigest(req.file).catch(async error => { await fs.unlink(req.file.path).catch(() => {}); throw error; });
    const id = uuid();
    try {
      await transaction(async client => {
        const draft = await client.query("SELECT id FROM bidder_submissions WHERE id=$1 AND bidder_id=$2 AND status='DRAFT' FOR UPDATE", [req.params.id, req.bidder.id]);
        if (!draft.rowCount) throw fail('Only your open draft can receive bid documents.', 409);
        const total = await client.query('SELECT coalesce(sum(byte_size),0)::bigint AS bytes FROM bidder_submission_documents WHERE submission_id=$1', [req.params.id]);
        if (Number(total.rows[0].bytes) + req.file.size > 50 * 1024 * 1024) throw fail('A bid package may not exceed 50 MB in total.');
        await client.query('INSERT INTO bidder_submission_documents(id,submission_id,original_name,storage_name,media_type,byte_size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, req.params.id, metadata.originalName, path.basename(req.file.path), req.file.mimetype, req.file.size, metadata.sha256]);
        await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.submission_document_uploaded', 'bidder_submission_document', id, { submissionId: req.params.id, fileName: metadata.originalName, byteSize: req.file.size, sha256: metadata.sha256 });
      });
    } catch (error) { await fs.unlink(req.file.path).catch(() => {}); throw error; }
    res.status(201).json({ id, originalName: metadata.originalName });
  }));

  app.post('/api/bidders/submissions/:id/submit', bidderAuth, bidderCsrf, route(async (req, res) => {
    if (!idPattern.test(req.params.id)) throw fail('Draft submission not found.', 404);
    await assertBidderEligible(pool, req.bidder.id);
    await transaction(async client => {
      const submission = await client.query(`SELECT s.*,n.publication_status,n.deadline,n.org_unit_id FROM bidder_submissions s JOIN public_tender_notices n ON n.id=s.notice_id WHERE s.id=$1 AND s.bidder_id=$2 FOR UPDATE OF s,n`, [req.params.id, req.bidder.id]);
      const row = submission.rows[0];
      if (!row || row.status !== 'DRAFT') throw fail('Only your open draft can be submitted.', 409);
      if (row.publication_status !== 'PUBLISHED' || new Date(row.deadline) <= new Date()) throw fail('The opportunity submission window is closed.', 409);
      const sealed = await client.query("SELECT 1 FROM sealed_tenders WHERE id=$1 AND status='ACCEPTING'", [row.notice_id]);
      if (sealed.rowCount) throw fail('Sealed offers must use the encrypted sealed-bid portal.', 409);
      const documents = await client.query('SELECT id FROM bidder_submission_documents WHERE submission_id=$1', [row.id]);
      if (!documents.rowCount) throw fail('Upload at least one signed offer or technical proposal document before submitting.');
      await client.query("UPDATE bidder_submissions SET status='SUBMITTED',submitted_at=now() WHERE id=$1", [row.id]);
      await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.submission_received', 'bidder_submission', row.id, { bidderId: req.bidder.id, noticeId: row.notice_id, reference: row.reference, documentCount: documents.rowCount });
    });
    res.json({ status: 'SUBMITTED', submittedAt: new Date().toISOString() });
  }));

  app.get('/api/bidders/submissions', bidderAuth, route(async (req, res) => {
    const rows = await pool.query(`SELECT s.id,s.reference,s.submission_kind,s.status,s.submitted_at,s.created_at,n.tender_ref,n.details->>'title' AS title,n.deadline,
      (SELECT count(*)::int FROM bidder_submission_documents d WHERE d.submission_id=s.id) AS document_count
      FROM bidder_submissions s JOIN public_tender_notices n ON n.id=s.notice_id WHERE s.bidder_id=$1 ORDER BY s.created_at DESC`, [req.bidder.id]);
    res.json(rows.rows);
  }));

  app.get('/api/bidders/submissions/:id/documents', bidderAuth, route(async (req, res) => {
    const rows = await pool.query(`SELECT d.id,d.original_name,d.media_type,d.byte_size,d.created_at FROM bidder_submission_documents d JOIN bidder_submissions s ON s.id=d.submission_id WHERE s.id=$1 AND s.bidder_id=$2 ORDER BY d.created_at`, [req.params.id, req.bidder.id]);
    res.json(rows.rows);
  }));

  app.get('/api/bidders/submission-documents/:id/download', bidderAuth, route(async (req, res) => {
    const rows = await pool.query(`SELECT d.* FROM bidder_submission_documents d JOIN bidder_submissions s ON s.id=d.submission_id WHERE d.id=$1 AND s.bidder_id=$2`, [req.params.id, req.bidder.id]);
    return streamDocument(rows.rows[0], res);
  }));

  app.get('/api/procurement/bidders', loadAuth, guard('vendor.manage'), route(async (_req, res) => {
    const rows = await pool.query(`SELECT b.id,b.email,b.contact_name,b.phone,b.status,b.email_verified_at,b.review_note,b.reviewed_at,b.created_at,v.legal_name,v.registration_no,v.status AS vendor_status,
      COALESCE((SELECT json_agg(json_build_object('id',l.id,'businessLine',l.business_line) ORDER BY l.business_line) FROM bidder_business_lines l WHERE l.bidder_id=b.id),'[]'::json) AS business_lines,
      COALESCE((SELECT json_agg(json_build_object('id',d.id,'documentType',d.document_type,'originalName',d.original_name,'expiresOn',d.expires_on,'verificationStatus',d.verification_status,'reviewNote',d.review_note) ORDER BY d.created_at DESC) FROM bidder_documents d WHERE d.bidder_id=b.id),'[]'::json) AS documents
      FROM bidder_accounts b JOIN vendors v ON v.id=b.vendor_id ORDER BY b.created_at DESC`);
    res.json(rows.rows);
  }));

  app.post('/api/procurement/bidders/:id/documents/:documentId/review', loadAuth, csrfRequired, guard('vendor.manage'), route(async (req, res) => {
    const status = String(req.body?.status || '').toUpperCase();
    if (!['VERIFIED','REJECTED'].includes(status)) throw fail('Choose verified or rejected.');
    const note = required(req.body?.note, 'Document review note', 1000);
    await transaction(async client => {
      const doc = await client.query('SELECT id,bidder_id,expires_on FROM bidder_documents WHERE id=$1 AND bidder_id=$2 FOR UPDATE', [req.params.documentId, req.params.id]);
      const row = doc.rows[0];
      if (!row) throw fail('Supplier document not found.', 404);
      if (status === 'VERIFIED' && String(row.expires_on).slice(0, 10) < new Date().toISOString().slice(0, 10)) throw fail('An expired certificate cannot be marked verified.', 409);
      await client.query('UPDATE bidder_documents SET verification_status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1', [row.id, status, note, req.auth.userId]);
      await writeAudit(client, { ...req.auth, role: req.actorRole || req.auth.role }, `procurement.bidder_document_${status.toLowerCase()}`, 'bidder_document', row.id, { bidderId: row.bidder_id, note });
    });
    res.json({ status });
  }));

  app.post('/api/procurement/bidders/:id/decision', loadAuth, csrfRequired, guard('vendor.manage'), route(async (req, res) => {
    const status = String(req.body?.status || '').toUpperCase();
    if (!['ACTIVE','REJECTED','SUSPENDED'].includes(status)) throw fail('Choose approve, reject, or suspend.');
    const note = required(req.body?.note, 'Decision rationale', 1000);
    await transaction(async client => {
      const found = await client.query('SELECT b.*,v.id AS vendor_id FROM bidder_accounts b JOIN vendors v ON v.id=b.vendor_id WHERE b.id=$1 FOR UPDATE OF b,v', [req.params.id]);
      const bidder = found.rows[0];
      if (!bidder) throw fail('Supplier account not found.', 404);
      if (status === 'ACTIVE') {
        if (!bidder.email_verified_at) throw fail('Verify the supplier email before approval.', 409);
        const eligibility = await bidderEligibility(client, bidder.id);
        if (!eligibility.eligible) throw fail(`Supplier cannot be approved: ${eligibility.reasons.join(' ')}`, 409);
      }
      await client.query('UPDATE bidder_accounts SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),updated_at=now() WHERE id=$1', [bidder.id, status === 'ACTIVE' ? 'ACTIVE' : status, note, req.auth.userId]);
      await client.query('UPDATE vendors SET status=$2,qualification_note=$3,qualified_by=$4 WHERE id=$1', [bidder.vendor_id, status === 'ACTIVE' ? 'ACTIVE' : status === 'SUSPENDED' ? 'SUSPENDED' : 'INACTIVE', note, req.auth.userId]);
      if (status !== 'ACTIVE') await client.query('DELETE FROM bidder_sessions WHERE bidder_id=$1', [bidder.id]);
      await writeAudit(client, { ...req.auth, role: req.actorRole || req.auth.role }, `procurement.bidder_${status.toLowerCase()}`, 'bidder_account', bidder.id, { vendorId: bidder.vendor_id, note });
    });
    res.json({ status });
  }));

  app.get('/api/procurement/bidders/:id/documents/:documentId/download', loadAuth, guard('vendor.manage'), route(async (req, res) => {
    const row = await pool.query('SELECT * FROM bidder_documents WHERE id=$1 AND bidder_id=$2', [req.params.documentId, req.params.id]);
    return streamDocument(row.rows[0], res);
  }));

  app.get('/api/procurement/bidder-submissions', loadAuth, guard('notice.manage'), route(async (req, res) => {
    const scope = await scopedUnits(req.auth);
    const rows = await pool.query(`SELECT s.id,s.reference,s.submission_kind,s.status,s.submitted_at,s.created_at,b.id AS bidder_id,v.legal_name,v.registration_no,b.email,n.id AS notice_id,n.tender_ref,n.details->>'title' AS title,
      (SELECT count(*)::int FROM bidder_submission_documents d WHERE d.submission_id=s.id) AS document_count
      FROM bidder_submissions s JOIN bidder_accounts b ON b.id=s.bidder_id JOIN vendors v ON v.id=b.vendor_id JOIN public_tender_notices n ON n.id=s.notice_id
      WHERE ($1::uuid[] IS NULL OR n.org_unit_id=ANY($1::uuid[])) ORDER BY s.submitted_at DESC NULLS LAST,s.created_at DESC`, [scope]);
    res.json(rows.rows);
  }));

  app.get('/api/procurement/bid-submissions/:id/documents', loadAuth, guard('notice.manage'), route(async (req, res) => {
    const scope = await scopedUnits(req.auth);
    const access = await pool.query('SELECT n.org_unit_id FROM bidder_submissions s JOIN public_tender_notices n ON n.id=s.notice_id WHERE s.id=$1',[req.params.id]);
    if (!access.rowCount || (scope && !scope.includes(access.rows[0].org_unit_id))) throw fail('Submission is outside your office scope.',403);
    const rows = await pool.query('SELECT id,original_name,media_type,byte_size,created_at FROM bidder_submission_documents WHERE submission_id=$1 ORDER BY created_at', [req.params.id]);
    res.json(rows.rows);
  }));

  app.get('/api/procurement/bid-submission-documents/:id/download', loadAuth, guard('notice.manage'), route(async (req, res) => {
    const scope = await scopedUnits(req.auth);
    const row = await pool.query(`SELECT d.* FROM bidder_submission_documents d JOIN bidder_submissions s ON s.id=d.submission_id JOIN public_tender_notices n ON n.id=s.notice_id WHERE d.id=$1 AND ($2::uuid[] IS NULL OR n.org_unit_id=ANY($2::uuid[]))`, [req.params.id,scope]);
    return streamDocument(row.rows[0], res);
  }));

  app.post('/api/bidder/clarifications', bidderAuth, bidderCsrf, route(async (req, res) => {
    const tenderId = String(req.body?.tenderId || '');
    if (!idPattern.test(tenderId)) throw fail('Select a published opportunity.');
    const question = required(req.body?.question, 'Clarification question', 6000);
    const id = uuid();
    await transaction(async client => {
      const notice = await client.query("SELECT id,deadline,publication_status FROM public_tender_notices WHERE id=$1 FOR UPDATE", [tenderId]);
      if (!notice.rowCount || notice.rows[0].publication_status !== 'PUBLISHED' || new Date(notice.rows[0].deadline) <= new Date()) throw fail('This opportunity is not open for questions.', 409);
      await client.query(`INSERT INTO bidder_clarifications(id,tender_id,bidder_id,company_name,contact_person,email,phone,question) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, tenderId, req.bidder.id, req.bidder.legal_name, req.bidder.contact_name, req.bidder.email, req.bidder.phone, question]);
      await writeAudit(client, { userId: null, role: 'SUPPLIER', requestId: req.requestId }, 'bidder.clarification_received', 'bidder_clarification', id, { bidderId: req.bidder.id, tenderId });
    });
    res.status(201).json({ id, status: 'PENDING_RESPONSE' });
  }));

  app.get('/api/bidders/clarifications', bidderAuth, route(async (req, res) => {
    const rows = await pool.query(`SELECT q.id,q.tender_id,t.tender_ref,q.question,q.public_question,q.official_response,q.response_date,q.created_at
      FROM bidder_clarifications q JOIN public_tender_notices t ON t.id=q.tender_id WHERE q.bidder_id=$1 ORDER BY q.created_at DESC`, [req.bidder.id]);
    res.json(rows.rows);
  }));

  return { bidderAuth, bidderCsrf };
}

async function bidderEligibility(db, bidderId) {
  const rows = await db.query(`SELECT b.status,b.email_verified_at,
    EXISTS(SELECT 1 FROM bidder_business_lines l WHERE l.bidder_id=b.id) AS has_business_line,
    EXISTS(SELECT 1 FROM bidder_documents d WHERE d.bidder_id=b.id AND d.document_type='BUSINESS_REGISTRATION' AND d.verification_status='VERIFIED' AND d.expires_on>=CURRENT_DATE) AS business_registration_current,
    EXISTS(SELECT 1 FROM bidder_documents d WHERE d.bidder_id=b.id AND d.document_type='TAX_CLEARANCE' AND d.verification_status='VERIFIED' AND d.expires_on>=CURRENT_DATE) AS tax_clearance_current
    FROM bidder_accounts b WHERE b.id=$1`, [bidderId]);
  const row = rows.rows[0];
  if (!row) throw fail('Supplier account not found.', 404);
  const reasons = [];
  if (!row.email_verified_at) reasons.push('Verify the business email address.');
  if (!row.has_business_line) reasons.push('Add at least one line of business.');
  if (!row.business_registration_current) reasons.push('Upload and obtain verification of a current business registration certificate.');
  if (!row.tax_clearance_current) reasons.push('Upload and obtain verification of a current tax clearance certificate.');
  return { eligible: reasons.length === 0, status: row.status, reasons };
}

async function assertBidderEligible(db, bidderId) {
  const eligibility = await bidderEligibility(db, bidderId);
  if (eligibility.status !== 'ACTIVE' || !eligibility.eligible) throw fail(`Only FDA-approved suppliers with verified current certificates can submit offers. ${eligibility.reasons.join(' ')}`, 403, 'BIDDER_NOT_ELIGIBLE');
  return eligibility;
}

async function streamDocument(row, res) {
  if (!row) throw fail('Document not found.', 404);
  const directory = await safeUploadsDirectory();
  const file = path.resolve(directory, row.storage_name);
  if (path.dirname(file) !== directory) throw fail('Document not found.', 404);
  try { await fs.access(file); } catch { throw fail('Document content is unavailable.', 404); }
  res.setHeader('Content-Type', row.media_type);
  res.setHeader('Content-Disposition', `attachment; filename="${String(row.original_name).replace(/["\\\r\n]/g, '_')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  return fs.createReadStream(file).pipe(res);
}

export async function deliverBidderExpiryAlerts(pool, transaction, writeAudit = undefined) {
  const scheduled = await pool.query(`SELECT a.id,a.document_id,a.bidder_id,a.days_before,a.due_at,d.document_type,d.expires_on,b.email,v.legal_name
    FROM bidder_expiry_alerts a JOIN bidder_documents d ON d.id=a.document_id JOIN bidder_accounts b ON b.id=a.bidder_id JOIN vendors v ON v.id=b.vendor_id
    WHERE a.due_at<=now() AND a.status IN ('PENDING','FAILED') AND a.attempts<8 AND (a.locked_until IS NULL OR a.locked_until<now()) ORDER BY a.due_at LIMIT 100`);
  for (const row of scheduled.rows) {
    const claimed = await transaction(async client => {
      const result = await client.query(`UPDATE bidder_expiry_alerts SET attempts=attempts+1,locked_until=now()+interval '3 minutes'
        WHERE id=$1 AND status IN ('PENDING','FAILED') AND (locked_until IS NULL OR locked_until<now()) RETURNING id`, [row.id]);
      return result.rowCount > 0;
    });
    if (!claimed) continue;
    try {
      const delivery = await sendBidderExpiryReminder({ email: row.email, companyName: row.legal_name, documentType: row.document_type, expiresOn: String(row.expires_on).slice(0, 10), daysBefore: row.days_before });
      if (!delivery.sent) throw fail('Email delivery is not configured.', 503, 'EMAIL_NOT_CONFIGURED');
      await pool.query("UPDATE bidder_expiry_alerts SET status='SENT',sent_at=now(),locked_until=NULL,last_error=NULL WHERE id=$1", [row.id]);
    } catch (error) {
      await pool.query("UPDATE bidder_expiry_alerts SET status='FAILED',locked_until=NULL,last_error=$2 WHERE id=$1", [row.id, String(error?.code || error?.name || 'DELIVERY_FAILED').slice(0, 100)]).catch(() => {});
      console.error(JSON.stringify({ level: 'error', event: 'bidder_expiry_alert_failed', alertId: row.id, daysBefore: row.days_before }));
    }
  }
  return { processed: scheduled.rowCount };
}
