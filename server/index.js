import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { pool, migrate, transaction, writeAudit, sha256, makeSessionToken, safeUploadsDirectory, uuid } from './db.js';
import { ROLE_CAPABILITIES, parseMinorUnits, requireCapability, canTransition } from './domain.js';
import { hashPassword, verifyPassword } from './security.js';

const app = express();
const port = Number(process.env.PORT || 8080);
const secureCookies = process.env.NODE_ENV === 'production';
const sessionHours = Number(process.env.SESSION_HOURS || 10);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const noDb = () => Object.assign(new Error('The secure service database is not configured.'), { status: 503, code: 'DATABASE_NOT_CONFIGURED' });
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false });

async function deliverOutboxBatch() {
  const target=String(process.env.INTEGRATION_WEBHOOK_URL||'').trim();
  const secret=String(process.env.INTEGRATION_WEBHOOK_SECRET||'');
  if(!target||!secret)return;
  if(!target.startsWith('https://')||secret.length<32)return;
  const batch=await transaction(async(client)=>{
    const claimed=await client.query(`SELECT id,event_type,aggregate_type,aggregate_id,payload,idempotency_key,attempts FROM integration_outbox WHERE delivered_at IS NULL AND next_attempt_at<=now() AND (locked_until IS NULL OR locked_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20`);
    if(!claimed.rowCount)return [];
    await client.query('UPDATE integration_outbox SET locked_until=now()+interval \'2 minutes\' WHERE id=ANY($1::uuid[])',[claimed.rows.map(row=>row.id)]);
    return claimed.rows;
  });
  for(const item of batch){
    const body=JSON.stringify({id:item.id,eventType:item.event_type,aggregateType:item.aggregate_type,aggregateId:item.aggregate_id,payload:item.payload,occurredAt:new Date().toISOString()});
    const signature=crypto.createHmac('sha256',secret).update(body).digest('hex');
    try{
      const response=await fetch(target,{method:'POST',headers:{'content-type':'application/json','x-fda-signature':`sha256=${signature}`,'idempotency-key':item.idempotency_key},body,signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw new Error(`HTTP_${response.status}`);
      await pool.query('UPDATE integration_outbox SET delivered_at=now(),locked_until=NULL,last_error=NULL WHERE id=$1',[item.id]);
    }catch(error){
      const attempts=Number(item.attempts)+1,delay=Math.min(43200,30*2**Math.min(attempts,10));
      await pool.query(`UPDATE integration_outbox SET attempts=$2,next_attempt_at=now()+($3 * interval '1 second'),locked_until=NULL,last_error=$4 WHERE id=$1`,[item.id,attempts,delay,String(error.message||'DELIVERY_FAILED').slice(0,120)]).catch(()=>{});
      console.error(JSON.stringify({level:'error',event:'integration_delivery_failed',outboxId:item.id,eventType:item.event_type,attempts}));
    }
  }
}

app.get('/api/health/ready', route(async (_req, res) => {
  if (!process.env.DATABASE_URL) return res.status(503).json({ status: 'not_ready', reason: 'database_not_configured' });
  await pool.query('SELECT 1');
  const schema=await pool.query("SELECT to_regclass('public.users') AS users_table,to_regclass('public.audit_events') AS audit_table");
  if(!schema.rows[0]?.users_table||!schema.rows[0]?.audit_table)return res.status(503).json({status:'not_ready',reason:'schema_not_migrated'});
  return res.json({ status: 'ready', checkedAt: new Date().toISOString(), integrations: { webhookConfigured: Boolean(process.env.INTEGRATION_WEBHOOK_URL&&process.env.INTEGRATION_WEBHOOK_SECRET) } });
}));

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

function setSessionCookies(res, token, csrf) {
  const secure = secureCookies ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `fda_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionHours * 3600}${secure}`,
    `fda_csrf=${encodeURIComponent(csrf)}; Path=/; SameSite=Lax; Max-Age=${sessionHours * 3600}${secure}`,
  ]);
}

function clearSessionCookies(res) {
  const secure = secureCookies ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `fda_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    `fda_csrf=; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  ]);
}

function ensureDb() {
  if (!process.env.DATABASE_URL) throw noDb();
}

function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function text(value, name, max = 240) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result || result.length > max) {
    const error = new Error(`${name} is required and must be no more than ${max} characters.`);
    error.status = 422;
    error.code = 'INVALID_INPUT';
    throw error;
  }
  return result;
}

function requireUuid(value, name = 'id') {
  if (!uuidRe.test(String(value || ''))) {
    const error = new Error(`${name} must be a valid identifier.`);
    error.status = 422;
    error.code = 'INVALID_INPUT';
    throw error;
  }
  return value;
}

async function loadAuth(req, res, next) {
  try {
    ensureDb();
    const cookies = parseCookies(req);
    const token = cookies.fda_session;
    if (!token) return res.status(401).json({ error: 'Sign in to continue.', code: 'UNAUTHENTICATED' });
    const found = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.must_change_password, u.disabled_at, s.csrf_hash,
              s.expires_at, r.role, r.org_unit_id, o.code AS org_code, o.name AS org_name
       FROM sessions s JOIN users u ON u.id=s.user_id
       LEFT JOIN user_roles r ON r.user_id=u.id
       LEFT JOIN org_units o ON o.id=r.org_unit_id
       WHERE s.token_hash=$1 AND s.expires_at > now() ORDER BY r.created_at ASC`,
      [sha256(token)],
    );
    if (!found.rowCount || found.rows[0].disabled_at) {
      clearSessionCookies(res);
      return res.status(401).json({ error: 'Your session has expired or been disabled. Sign in again.', code: 'SESSION_EXPIRED' });
    }
    const first = found.rows[0];
    const roles = found.rows.filter((row) => row.role).map((row) => ({
      role: row.role,
      orgUnitId: row.org_unit_id,
      orgCode: row.org_code,
      orgName: row.org_name,
    }));
    if (!roles.length) return res.status(403).json({ error: 'This account has no assigned role.', code: 'ROLE_NOT_ASSIGNED' });
    req.auth = {
      userId: first.id,
      email: first.email,
      fullName: first.full_name,
      mustChangePassword: first.must_change_password,
      csrfHash: first.csrf_hash,
      role: roles[0].role,
      orgUnitId: roles[0].orgUnitId,
      roles,
      requestId: req.requestId,
    };
    if (req.auth.mustChangePassword && !['/api/auth/me','/api/auth/change-password','/api/auth/logout'].includes(req.path)) {
      return res.status(403).json({ error: 'Set a new password before using the system.', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    await pool.query('UPDATE sessions SET last_seen_at=now() WHERE token_hash=$1', [sha256(token)]);
    next();
  } catch (error) { next(error); }
}

function csrfRequired(req, res, next) {
  const cookies = parseCookies(req);
  const cookieToken = cookies.fda_csrf || '';
  const headerToken = req.get('x-csrf-token') || '';
  if (!cookieToken || !headerToken || cookieToken !== headerToken || sha256(headerToken) !== req.auth.csrfHash) {
    return res.status(403).json({ error: 'The request security token is missing or expired. Refresh and retry.', code: 'CSRF_FAILED' });
  }
  next();
}

function roleForCapability(auth, capability) {
  const assignment = auth.roles.find((item) => ROLE_CAPABILITIES[item.role]?.includes(capability));
  if (!assignment) requireCapability(auth.role, capability);
  return assignment;
}

function guard(capability) {
  return (req, res, next) => {
    try {
      req.actorRole = roleForCapability(req.auth, capability).role;
      next();
    } catch (error) { next(error); }
  };
}

function guardAny(...capabilities) {
  return (req, res, next) => {
    try {
      const assignment = req.auth.roles.find((item) => capabilities.some((capability) => ROLE_CAPABILITIES[item.role]?.includes(capability)));
      if (!assignment) requireCapability(req.auth.role, capabilities[0]);
      req.actorRole = assignment.role;
      next();
    } catch (error) { next(error); }
  };
}

function unrestricted(auth) {
  return auth.roles.some((item) => ['MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR'].includes(item.role));
}

async function scopedUnits(auth) {
  if (unrestricted(auth)) return null;
  const roots = auth.roles.map((item) => item.orgUnitId).filter(Boolean);
  if (!roots.length) return [];
  const result = await pool.query(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM org_units WHERE id=ANY($1::uuid[])
       UNION ALL SELECT o.id FROM org_units o JOIN descendants d ON o.parent_id=d.id
     ) SELECT DISTINCT id FROM descendants`, [roots],
  );
  return result.rows.map((row) => row.id);
}

async function assertOrgAccess(auth, orgUnitId) {
  if (unrestricted(auth)) return;
  const ids = await scopedUnits(auth);
  if (!ids?.includes(orgUnitId)) {
    const error = new Error('This record is outside your assigned office scope.');
    error.status = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
}

function cookieSessionToken(req) { return parseCookies(req).fda_session || ''; }

app.get('/api/health/live', (_req, res) => res.json({ status: 'live' }));

app.post('/api/auth/login', loginLimiter, route(async (req, res) => {
  ensureDb();
  const email = text(req.body?.email, 'Email', 254).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || password.length > 256) return res.status(401).json({ error: 'Email or password is incorrect.', code: 'LOGIN_FAILED' });
  const result = await pool.query('SELECT id,email,full_name,password_hash,must_change_password,disabled_at FROM users WHERE email=$1', [email]);
  const user = result.rows[0];
  if (!user || user.disabled_at || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.', code: 'LOGIN_FAILED' });
  }
  const roles = await pool.query(
    `SELECT r.role,r.org_unit_id,o.code AS org_code,o.name AS org_name FROM user_roles r
     LEFT JOIN org_units o ON o.id=r.org_unit_id WHERE r.user_id=$1 ORDER BY r.created_at ASC`, [user.id],
  );
  if (!roles.rowCount) return res.status(403).json({ error: 'No system role is assigned to this account.', code: 'ROLE_NOT_ASSIGNED' });
  const session = makeSessionToken();
  const csrf = crypto.randomBytes(32).toString('base64url');
  await pool.query('DELETE FROM sessions WHERE user_id=$1 OR expires_at < now()', [user.id]);
  await pool.query('INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at) VALUES($1,$2,$3,now()+($4 * interval \'1 hour\'))',
    [session.hash, user.id, sha256(csrf), sessionHours]);
  setSessionCookies(res, session.token, csrf);
  res.json({
    user: { id: user.id, email: user.email, fullName: user.full_name, mustChangePassword: user.must_change_password },
    roles: roles.rows,
    csrfToken: csrf,
  });
}));

app.get('/api/auth/me', loadAuth, (req, res) => res.json({
  user: { id: req.auth.userId, email: req.auth.email, fullName: req.auth.fullName, mustChangePassword: req.auth.mustChangePassword },
  roles: req.auth.roles,
  csrfToken: parseCookies(req).fda_csrf,
}));

app.post('/api/auth/logout', loadAuth, csrfRequired, route(async (req, res) => {
  await pool.query('DELETE FROM sessions WHERE token_hash=$1', [sha256(cookieSessionToken(req))]);
  clearSessionCookies(res);
  res.status(204).end();
}));

app.post('/api/auth/change-password', loadAuth, csrfRequired, route(async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 12 || newPassword.length > 128) return res.status(422).json({ error: 'Use a password between 12 and 128 characters.', code: 'INVALID_PASSWORD' });
  const found = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.auth.userId]);
  if (!(await verifyPassword(currentPassword, found.rows[0].password_hash))) return res.status(401).json({ error: 'Current password is incorrect.', code: 'CURRENT_PASSWORD_INVALID' });
  const hash = await hashPassword(newPassword);
  await pool.query('UPDATE users SET password_hash=$1,must_change_password=false WHERE id=$2', [hash, req.auth.userId]);
  await pool.query('DELETE FROM sessions WHERE user_id=$1', [req.auth.userId]);
  clearSessionCookies(res);
  res.status(200).json({ message: 'Password updated. Sign in again.' });
}));

app.get('/api/budgets', loadAuth, guardAny('budget.read.all','workflow.read.scope'), route(async (req, res) => {
  ensureDb();
  const ids = await scopedUnits(req.auth);
  const values = ids ? await pool.query(
    `SELECT id,fiscal_year,vote_code,title,org_unit_id,currency,allocated_minor::text,reserved_minor::text,spent_minor::text,
       (allocated_minor-reserved_minor-spent_minor)::text AS available_minor,version
     FROM budget_accounts WHERE org_unit_id=ANY($1::uuid[]) ORDER BY fiscal_year DESC,vote_code`, [ids],
  ) : await pool.query(
    `SELECT id,fiscal_year,vote_code,title,org_unit_id,currency,allocated_minor::text,reserved_minor::text,spent_minor::text,
       (allocated_minor-reserved_minor-spent_minor)::text AS available_minor,version
     FROM budget_accounts ORDER BY fiscal_year DESC,vote_code`,
  );
  res.json(values.rows);
}));

app.get('/api/admin/org-units',loadAuth,guard('org.manage'),route(async(_req,res)=>{
  const rows=await pool.query(`SELECT id,code,name,level,parent_id,county,active,created_at FROM org_units ORDER BY level,code`);
  res.json(rows.rows);
}));

app.post('/api/admin/org-units',loadAuth,csrfRequired,guard('org.manage'),route(async(req,res)=>{
  const code=text(req.body?.code,'Office code',30).toUpperCase();
  const name=text(req.body?.name,'Office name',160);
  const level=String(req.body?.level||'');
  const parentId=req.body?.parentId?requireUuid(req.body.parentId,'Parent office'):null;
  const county=req.body?.county?text(req.body.county,'County',80):null;
  if(!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(code)||!['HEADQUARTERS','REGION','COUNTY'].includes(level)) throw Object.assign(new Error('Enter a valid office code and level.'),{status:422,code:'INVALID_INPUT'});
  if(level==='HEADQUARTERS'&&parentId) throw Object.assign(new Error('Headquarters cannot have a parent office.'),{status:422,code:'INVALID_HIERARCHY'});
  if(level!=='HEADQUARTERS'&&!parentId) throw Object.assign(new Error('Regional and county offices must be linked to a parent office.'),{status:422,code:'INVALID_HIERARCHY'});
  const id=uuid();
  const row=await transaction(async(client)=>{
    if(parentId){const p=await client.query('SELECT level FROM org_units WHERE id=$1 AND active=true',[parentId]);if(!p.rowCount)throw Object.assign(new Error('Parent office not found or inactive.'),{status:422,code:'INVALID_HIERARCHY'});if(level==='REGION'&&p.rows[0].level!=='HEADQUARTERS'||level==='COUNTY'&&p.rows[0].level!=='REGION')throw Object.assign(new Error('Office hierarchy must be Headquarters → Region → County.'),{status:422,code:'INVALID_HIERARCHY'});}
    const inserted=await client.query(`INSERT INTO org_units(id,code,name,level,parent_id,county) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,code,name,level,parent_id,county,active`,[id,code,name,level,parentId,county]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'organization.unit_created','org_unit',id,{code,name,level,parentId,county});return inserted.rows[0];
  });res.status(201).json(row);
}));

app.get('/api/admin/users',loadAuth,guard('user.manage'),route(async(_req,res)=>{
  const rows=await pool.query(`SELECT u.id,u.email,u.full_name,u.must_change_password,u.disabled_at,u.created_at,
    COALESCE(json_agg(json_build_object('role',r.role,'orgUnitId',r.org_unit_id,'orgName',o.name)) FILTER(WHERE r.id IS NOT NULL),'[]') AS roles
    FROM users u LEFT JOIN user_roles r ON r.user_id=u.id LEFT JOIN org_units o ON o.id=r.org_unit_id GROUP BY u.id ORDER BY u.created_at DESC`);
  res.json(rows.rows);
}));

app.post('/api/admin/users',loadAuth,csrfRequired,guard('user.manage'),route(async(req,res)=>{
  const email=text(req.body?.email,'Email',254).toLowerCase();
  const fullName=text(req.body?.fullName,'Full name',160);
  const role=String(req.body?.role||'');
  const validRoles=['MANAGING_DIRECTOR','FINANCE_DIRECTOR','HR_DIRECTOR','PROCUREMENT_OFFICER','ASSET_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR'];
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validRoles.includes(role))throw Object.assign(new Error('Enter a valid email and approved role.'),{status:422,code:'INVALID_INPUT'});
  const orgUnitId=req.body?.orgUnitId?requireUuid(req.body.orgUnitId,'Office'):null;
  if(['PROCUREMENT_OFFICER','ASSET_OFFICER','COUNTY_OFFICER','HR_DIRECTOR'].includes(role)&&!orgUnitId)throw Object.assign(new Error('Select an office scope for this role.'),{status:422,code:'OFFICE_SCOPE_REQUIRED'});
  const tempPassword=crypto.randomBytes(18).toString('base64url');
  const userId=uuid();
  const row=await transaction(async(client)=>{
    if(orgUnitId){const unit=await client.query('SELECT id FROM org_units WHERE id=$1 AND active=true',[orgUnitId]);if(!unit.rowCount)throw Object.assign(new Error('Office not found or inactive.'),{status:422,code:'INVALID_OFFICE'});}
    const inserted=await client.query(`INSERT INTO users(id,email,full_name,password_hash,must_change_password) VALUES($1,$2,$3,$4,true) RETURNING id,email,full_name,must_change_password,created_at`,[userId,email,fullName,await hashPassword(tempPassword)]);
    await client.query(`INSERT INTO user_roles(id,user_id,role,org_unit_id) VALUES($1,$2,$3,$4)`,[uuid(),userId,role,orgUnitId]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'identity.user_created','user',userId,{email,role,orgUnitId});
    return inserted.rows[0];
  });
  res.status(201).json({user:row,temporaryPassword:tempPassword,notice:'Copy this one-time password now and deliver it securely. The user must change it at first sign-in.'});
}));

app.post('/api/admin/users/:id/disable',loadAuth,csrfRequired,guard('user.manage'),route(async(req,res)=>{
  const userId=requireUuid(req.params.id,'User');
  if(userId===req.auth.userId)throw Object.assign(new Error('You cannot disable your own active administrator account.'),{status:409,code:'SELF_DISABLE_BLOCKED'});
  const reason=text(req.body?.reason,'Reason',500);
  await transaction(async(client)=>{
    const target=await client.query('SELECT id,email,disabled_at FROM users WHERE id=$1 FOR UPDATE',[userId]);
    if(!target.rowCount)throw Object.assign(new Error('User not found.'),{status:404,code:'NOT_FOUND'});
    if(target.rows[0].disabled_at)throw Object.assign(new Error('This account is already disabled.'),{status:409,code:'INVALID_TRANSITION'});
    const admin=await client.query(`SELECT count(*)::int AS enabled_admins FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role='MANAGING_DIRECTOR' AND u.disabled_at IS NULL AND u.id<>$1`,[userId]);
    const targetRole=await client.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role='MANAGING_DIRECTOR'",[userId]);
    if(targetRole.rowCount&&admin.rows[0].enabled_admins===0)throw Object.assign(new Error('At least one active Managing Director account must remain.'),{status:409,code:'LAST_ADMIN_BLOCKED'});
    await client.query('UPDATE users SET disabled_at=now() WHERE id=$1',[userId]);
    await client.query('DELETE FROM sessions WHERE user_id=$1',[userId]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'identity.user_disabled','user',userId,{email:target.rows[0].email,reason});
  });res.json({id:userId,disabled:true});
}));

app.post('/api/admin/budgets',loadAuth,csrfRequired,guard('budget.manage'),route(async(req,res)=>{
  const fiscalYear=Number(req.body?.fiscalYear), voteCode=text(req.body?.voteCode,'Vote code',40), title=text(req.body?.title,'Budget title',180), orgUnitId=requireUuid(req.body?.orgUnitId,'Office');
  const currency=String(req.body?.currency||'');
  if(!Number.isInteger(fiscalYear)||fiscalYear<2000||fiscalYear>2200||!['USD','LRD'].includes(currency))throw Object.assign(new Error('Enter a valid fiscal year and currency.'),{status:422,code:'INVALID_INPUT'});
  const amount=parseMinorUnits(req.body?.allocatedAmount);
  const id=uuid();
  const row=await transaction(async(client)=>{
    const unit=await client.query('SELECT id FROM org_units WHERE id=$1 AND active=true',[orgUnitId]);if(!unit.rowCount)throw Object.assign(new Error('Office not found or inactive.'),{status:422,code:'INVALID_OFFICE'});
    const inserted=await client.query(`INSERT INTO budget_accounts(id,fiscal_year,vote_code,title,org_unit_id,currency,allocated_minor) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,fiscal_year,vote_code,title,org_unit_id,currency,allocated_minor::text,reserved_minor::text,spent_minor::text`,[id,fiscalYear,voteCode,title,orgUnitId,currency,amount.toString()]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'finance.budget_account_created','budget_account',id,{fiscalYear,voteCode,orgUnitId,currency,allocatedMinor:amount.toString()});return inserted.rows[0];
  });res.status(201).json(row);
}));

app.post('/api/admin/vendors',loadAuth,csrfRequired,guard('vendor.manage'),route(async(req,res)=>{
  const legalName=text(req.body?.legalName,'Vendor legal name',180),registrationNo=text(req.body?.registrationNo,'Business registration number',80);
  const taxExpiry=req.body?.taxClearanceExpires?text(req.body.taxClearanceExpires,'Tax clearance expiry date',10):null;
  const ppccNo=req.body?.ppccRegistrationNo?text(req.body.ppccRegistrationNo,'PPCC registration number',80):null;
  const id=uuid();
  const row=await transaction(async(client)=>{
    const inserted=await client.query(`INSERT INTO vendors(id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status) VALUES($1,$2,$3,$4,$5,'PENDING') RETURNING id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status`,[id,legalName,registrationNo,taxExpiry,ppccNo]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'procurement.vendor_registered','vendor',id,{registrationNo,status:'PENDING'});return inserted.rows[0];
  });res.status(201).json(row);
}));

app.get('/api/admin/vendors',loadAuth,guard('vendor.manage'),route(async(_req,res)=>{
  const rows=await pool.query(`SELECT id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status,created_at FROM vendors ORDER BY created_at DESC`);
  res.json(rows.rows);
}));

app.post('/api/admin/vendors/:id/activate',loadAuth,csrfRequired,guard('vendor.manage'),route(async(req,res)=>{
  const qualificationNote=text(req.body?.qualificationNote,'Qualification verification note',500);
  const id=requireUuid(req.params.id);
  const row=await transaction(async(client)=>{
    const updated=await client.query(`UPDATE vendors SET status='ACTIVE' WHERE id=$1 AND status='PENDING' RETURNING id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status`,[id]);
    if(!updated.rowCount)throw Object.assign(new Error('Only a pending vendor can be activated.'),{status:409,code:'INVALID_TRANSITION'});
    await writeAudit(client,{...req.auth,role:req.actorRole},'procurement.vendor_qualified','vendor',id,{qualificationNote});return updated.rows[0];
  });res.json(row);
}));

app.get('/api/vendors', loadAuth, guard('purchase_order.create'), route(async (_req, res) => {
  const result = await pool.query(`SELECT id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status FROM vendors WHERE status='ACTIVE' ORDER BY legal_name`);
  res.json(result.rows);
}));

app.get('/api/workflow', loadAuth, guardAny('workflow.read.all','workflow.read.scope'), route(async (req, res) => {
  const ids = await scopedUnits(req.auth);
  const result = await pool.query(
    `SELECT r.id,r.requisition_no,r.title,r.description,r.procurement_method,r.spend_type,r.currency,r.amount_minor::text,
       r.status,r.org_unit_id,r.requester_id,u.full_name AS requester_name,r.created_at,
       b.vote_code,b.title AS budget_title,b.allocated_minor::text,b.reserved_minor::text,b.spent_minor::text,
       po.id AS po_id,po.po_number,po.vendor_id,v.legal_name AS vendor_name,po.amount_minor::text AS po_amount_minor,po.status AS po_status,
       gr.id AS receipt_id,gr.receipt_no,gr.status AS receipt_status,gr.accepted_amount_minor::text,
       i.id AS invoice_id,i.invoice_no,i.status AS invoice_status,i.amount_minor::text AS invoice_amount_minor,
       p.id AS payment_id,p.payment_ref,p.status AS payment_status,p.amount_minor::text AS payment_amount_minor,
       a.id AS asset_id,a.asset_tag,a.description AS asset_description
     FROM requisitions r JOIN users u ON u.id=r.requester_id JOIN budget_accounts b ON b.id=r.budget_account_id
     LEFT JOIN purchase_orders po ON po.requisition_id=r.id LEFT JOIN vendors v ON v.id=po.vendor_id
     LEFT JOIN LATERAL (SELECT * FROM goods_receipts x WHERE x.purchase_order_id=po.id ORDER BY x.received_at DESC LIMIT 1) gr ON true LEFT JOIN invoices i ON i.purchase_order_id=po.id
     LEFT JOIN payments p ON p.invoice_id=i.id LEFT JOIN assets a ON a.purchase_order_id=po.id
     WHERE ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[])) ORDER BY r.created_at DESC LIMIT 250`, [ids],
  );
  res.json(result.rows);
}));

app.post('/api/requisitions', loadAuth, csrfRequired, guard('requisition.create'), route(async (req, res) => {
  const title = text(req.body?.title, 'Title', 160);
  const description = text(req.body?.description, 'Description', 4000);
  const accountId = requireUuid(req.body?.budgetAccountId, 'Budget account');
  const method = String(req.body?.procurementMethod || 'RFQ');
  const spendType = String(req.body?.spendType || 'GOODS');
  if (!['RFQ','NATIONAL_COMPETITIVE_BIDDING','INTERNATIONAL_COMPETITIVE_BIDDING','SINGLE_SOURCE','FRAMEWORK'].includes(method)) throw Object.assign(new Error('Select a valid procurement method.'), { status: 422, code: 'INVALID_INPUT' });
  if (!['CAPITAL','GOODS','SERVICES'].includes(spendType)) throw Object.assign(new Error('Select a valid spend type.'), { status: 422, code: 'INVALID_INPUT' });
  const amount = parseMinorUnits(req.body?.amount);
  if (amount <= 0n) throw Object.assign(new Error('Amount must be greater than zero.'), { status: 422, code: 'INVALID_AMOUNT' });
  const row = await transaction(async (client) => {
    const budget = await client.query('SELECT * FROM budget_accounts WHERE id=$1 FOR UPDATE', [accountId]);
    if (!budget.rowCount) throw Object.assign(new Error('Budget account not found.'), { status: 404, code: 'NOT_FOUND' });
    await assertOrgAccess(req.auth, budget.rows[0].org_unit_id);
    if (budget.rows[0].currency !== req.body?.currency) throw Object.assign(new Error('Requisition currency must match the selected budget account.'), { status: 422, code: 'CURRENCY_MISMATCH' });
    const available = BigInt(budget.rows[0].allocated_minor) - BigInt(budget.rows[0].reserved_minor) - BigInt(budget.rows[0].spent_minor);
    if (amount > available) throw Object.assign(new Error('The requested amount exceeds the available budget.'), { status: 409, code: 'BUDGET_EXCEEDED' });
    const id = uuid();
    const requisitionNo = `FDA-PR-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const inserted = await client.query(
      `INSERT INTO requisitions(id,requisition_no,requester_id,org_unit_id,budget_account_id,title,description,procurement_method,spend_type,currency,amount_minor)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id,requisitionNo,req.auth.userId,budget.rows[0].org_unit_id,title,description,method,spendType,req.body.currency,amount.toString()],
    );
    await writeAudit(client,{...req.auth,role:req.actorRole},'requisition.created','requisition',id,{status:'DRAFT',amountMinor:amount.toString(),currency:req.body.currency});
    return inserted.rows[0];
  });
  res.status(201).json(row);
}));

app.post('/api/requisitions/:id/submit', loadAuth, csrfRequired, guard('requisition.submit.own'), route(async (req, res) => {
  const result = await transaction(async (client) => {
    const found = await client.query('SELECT * FROM requisitions WHERE id=$1 FOR UPDATE', [requireUuid(req.params.id)]);
    if (!found.rowCount) throw Object.assign(new Error('Requisition not found.'), { status: 404, code: 'NOT_FOUND' });
    const item = found.rows[0];
    await assertOrgAccess(req.auth,item.org_unit_id);
    if (item.requester_id !== req.auth.userId) throw Object.assign(new Error('Only the requester can submit this requisition.'), { status: 403, code: 'FORBIDDEN' });
    if (!canTransition('requisition',item.status,'SUBMITTED')) throw Object.assign(new Error(`Cannot submit a requisition in ${item.status} status.`), { status: 409, code: 'INVALID_TRANSITION' });
    const reserve = await client.query(
      `UPDATE budget_accounts SET reserved_minor=reserved_minor+$1,version=version+1
       WHERE id=$2 AND allocated_minor-reserved_minor-spent_minor >= $1 RETURNING id`, [item.amount_minor,item.budget_account_id],
    );
    if (!reserve.rowCount) throw Object.assign(new Error('The available budget changed and is no longer sufficient. Refresh and review the budget.'), { status: 409, code: 'BUDGET_CHANGED' });
    const updated = await client.query(`UPDATE requisitions SET status='SUBMITTED',submitted_at=now(),updated_at=now(),version=version+1 WHERE id=$1 RETURNING *`, [item.id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'requisition.submitted','requisition',item.id,{from:'DRAFT',to:'SUBMITTED',amountMinor:item.amount_minor});
    return updated.rows[0];
  });
  res.json(result);
}));

async function decideRequisition(req, res, targetStatus) {
  const capability = 'requisition.approve';
  const result = await transaction(async (client) => {
    const found = await client.query('SELECT * FROM requisitions WHERE id=$1 FOR UPDATE', [requireUuid(req.params.id)]);
    if (!found.rowCount) throw Object.assign(new Error('Requisition not found.'), { status: 404, code: 'NOT_FOUND' });
    const item = found.rows[0];
    await assertOrgAccess(req.auth,item.org_unit_id);
    if (item.requester_id === req.auth.userId) throw Object.assign(new Error('The requester cannot approve or reject their own requisition.'), { status: 403, code: 'SEGREGATION_OF_DUTIES' });
    if (!canTransition('requisition',item.status,targetStatus)) throw Object.assign(new Error(`Cannot move requisition from ${item.status} to ${targetStatus}.`), { status: 409, code: 'INVALID_TRANSITION' });
    if (targetStatus === 'RETURNED' || targetStatus === 'REJECTED') {
      const reason = text(req.body?.reason,'Decision reason',1000);
      await client.query('UPDATE budget_accounts SET reserved_minor=reserved_minor-$1,version=version+1 WHERE id=$2', [item.amount_minor,item.budget_account_id]);
      const updated = await client.query(`UPDATE requisitions SET status=$1,returned_reason=$2,decided_at=now(),approved_by=$3,updated_at=now(),version=version+1 WHERE id=$4 RETURNING *`, [targetStatus,reason,req.auth.userId,item.id]);
      await writeAudit(client,{...req.auth,role:req.actorRole},`requisition.${targetStatus.toLowerCase()}`,'requisition',item.id,{from:'SUBMITTED',to:targetStatus,reason});
      return updated.rows[0];
    }
    const updated = await client.query(`UPDATE requisitions SET status='APPROVED',decided_at=now(),approved_by=$1,updated_at=now(),version=version+1 WHERE id=$2 RETURNING *`, [req.auth.userId,item.id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'requisition.approved','requisition',item.id,{from:'SUBMITTED',to:'APPROVED'});
    return updated.rows[0];
  });
  res.json(result);
}

app.post('/api/requisitions/:id/approve',loadAuth,csrfRequired,guard('requisition.approve'),route((req,res)=>decideRequisition(req,res,'APPROVED')));
app.post('/api/requisitions/:id/return',loadAuth,csrfRequired,guard('requisition.approve'),route((req,res)=>decideRequisition(req,res,'RETURNED')));
app.post('/api/requisitions/:id/reject',loadAuth,csrfRequired,guard('requisition.approve'),route((req,res)=>decideRequisition(req,res,'REJECTED')));

app.post('/api/requisitions/:id/correct',loadAuth,csrfRequired,guard('requisition.submit.own'),route(async(req,res)=>{
  const title=text(req.body?.title,'Title',160), description=text(req.body?.description,'Description',4000);
  const amount=parseMinorUnits(req.body?.amount);
  if(amount<=0n)throw Object.assign(new Error('Amount must be greater than zero.'),{status:422,code:'INVALID_AMOUNT'});
  const result=await transaction(async(client)=>{
    const found=await client.query('SELECT * FROM requisitions WHERE id=$1 FOR UPDATE',[requireUuid(req.params.id)]);
    if(!found.rowCount)throw Object.assign(new Error('Requisition not found.'),{status:404,code:'NOT_FOUND'});
    const item=found.rows[0]; await assertOrgAccess(req.auth,item.org_unit_id);
    if(item.requester_id!==req.auth.userId)throw Object.assign(new Error('Only the requester can correct this requisition.'),{status:403,code:'FORBIDDEN'});
    if(item.status!=='RETURNED')throw Object.assign(new Error('Only returned requisitions can be corrected.'),{status:409,code:'INVALID_TRANSITION'});
    const budget=await client.query('SELECT allocated_minor,reserved_minor,spent_minor FROM budget_accounts WHERE id=$1 FOR UPDATE',[item.budget_account_id]);
    const available=BigInt(budget.rows[0].allocated_minor)-BigInt(budget.rows[0].reserved_minor)-BigInt(budget.rows[0].spent_minor);
    if(amount>available)throw Object.assign(new Error('Corrected amount exceeds the current available budget.'),{status:409,code:'BUDGET_EXCEEDED'});
    const updated=await client.query(`UPDATE requisitions SET title=$1,description=$2,amount_minor=$3,status='DRAFT',returned_reason=NULL,updated_at=now(),version=version+1 WHERE id=$4 RETURNING *`,[title,description,amount.toString(),item.id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'requisition.corrected','requisition',item.id,{from:'RETURNED',to:'DRAFT',amountMinor:amount.toString()});
    return updated.rows[0];
  });res.json(result);
}));

app.post('/api/requisitions/:id/purchase-order',loadAuth,csrfRequired,guard('purchase_order.create'),route(async (req,res)=>{
  const vendorId=requireUuid(req.body?.vendorId,'Vendor');
  const result=await transaction(async(client)=>{
    const found=await client.query('SELECT * FROM requisitions WHERE id=$1 FOR UPDATE',[requireUuid(req.params.id)]);
    if(!found.rowCount) throw Object.assign(new Error('Requisition not found.'),{status:404,code:'NOT_FOUND'});
    const item=found.rows[0]; await assertOrgAccess(req.auth,item.org_unit_id);
    if(!canTransition('requisition',item.status,'PO_ISSUED')) throw Object.assign(new Error('Only an approved requisition can receive a purchase order.'),{status:409,code:'INVALID_TRANSITION'});
    if(item.approved_by===req.auth.userId || item.requester_id===req.auth.userId) throw Object.assign(new Error('The requester or approver cannot issue the purchase order for this requisition.'),{status:403,code:'SEGREGATION_OF_DUTIES'});
    const vendor=await client.query(`SELECT id FROM vendors WHERE id=$1 AND status='ACTIVE' FOR SHARE`,[vendorId]);
    if(!vendor.rowCount) throw Object.assign(new Error('Select an active, qualified vendor.'),{status:422,code:'VENDOR_NOT_ACTIVE'});
    const amount=req.body?.amount===undefined?BigInt(item.amount_minor):parseMinorUnits(req.body.amount);
    if(amount>BigInt(item.amount_minor)) throw Object.assign(new Error('Purchase order value cannot exceed the approved requisition.'),{status:422,code:'PO_EXCEEDS_REQUISITION'});
    const poId=uuid(); const poNo=`FDA-PO-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expected=req.body?.expectedDelivery?text(req.body.expectedDelivery,'Expected delivery date',10):null;
    const po=await client.query(`INSERT INTO purchase_orders(id,po_number,requisition_id,vendor_id,created_by,amount_minor,currency,expected_delivery) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[poId,poNo,item.id,vendorId,req.auth.userId,amount.toString(),item.currency,expected]);
    const reduction=BigInt(item.amount_minor)-amount;
    if(reduction>0n) await client.query('UPDATE budget_accounts SET reserved_minor=reserved_minor-$1,version=version+1 WHERE id=$2',[reduction.toString(),item.budget_account_id]);
    await client.query(`UPDATE requisitions SET status='PO_ISSUED',updated_at=now(),version=version+1 WHERE id=$1`,[item.id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'purchase_order.issued','purchase_order',poId,{poNumber:poNo,requisitionId:item.id,vendorId,amountMinor:amount.toString()});
    await client.query(`INSERT INTO integration_outbox(id,event_type,aggregate_type,aggregate_id,payload,idempotency_key) VALUES($1,'procurement.po_issued','purchase_order',$2,$3,$4)`,[uuid(),poId,{poNumber:poNo,requisitionId:item.id,vendorId,amountMinor:amount.toString(),currency:item.currency},`po-issued:${poId}`]);
    return po.rows[0];
  }); res.status(201).json(result);
}));

app.post('/api/purchase-orders/:id/receipt',loadAuth,csrfRequired,guard('receipt.inspect'),route(async(req,res)=>{
  const notes=text(req.body?.conditionNotes,'Condition notes',2000);
  const result=await transaction(async(client)=>{
    const found=await client.query(`SELECT po.*,r.org_unit_id,r.spend_type FROM purchase_orders po JOIN requisitions r ON r.id=po.requisition_id WHERE po.id=$1 FOR UPDATE OF po`,[requireUuid(req.params.id)]);
    if(!found.rowCount) throw Object.assign(new Error('Purchase order not found.'),{status:404,code:'NOT_FOUND'});
    const po=found.rows[0]; await assertOrgAccess(req.auth,po.org_unit_id);
    if(po.status!=='ISSUED') throw Object.assign(new Error('Only an issued purchase order can be received.'),{status:409,code:'INVALID_TRANSITION'});
    const receiptId=uuid(), receiptNo=`FDA-GR-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const receipt=await client.query(`INSERT INTO goods_receipts(id,receipt_no,purchase_order_id,received_by,accepted_amount_minor,condition_notes,status) VALUES($1,$2,$3,$4,0,$5,'PENDING') RETURNING *`,[receiptId,receiptNo,po.id,req.auth.userId,notes]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'goods_receipt.recorded','goods_receipt',receiptId,{receiptNo,purchaseOrderId:po.id,status:'PENDING'});
    return receipt.rows[0];
  }); res.status(201).json(result);
}));

app.post('/api/receipts/:id/inspect',loadAuth,csrfRequired,guard('receipt.inspect'),route(async(req,res)=>{
  const outcome=String(req.body?.outcome||'');
  if(!['ACCEPTED','REJECTED'].includes(outcome)) throw Object.assign(new Error('Choose Accept or Reject.'),{status:422,code:'INVALID_INPUT'});
  const note=text(req.body?.inspectionNotes,'Inspection notes',2000);
  const result=await transaction(async(client)=>{
    const found=await client.query(`SELECT gr.*,po.id AS po_id,po.po_number,po.amount_minor AS po_amount,po.currency,po.vendor_id,r.id AS requisition_id,r.org_unit_id,r.spend_type,r.title AS requisition_title FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE gr.id=$1 FOR UPDATE OF gr,po`,[requireUuid(req.params.id)]);
    if(!found.rowCount) throw Object.assign(new Error('Goods receipt not found.'),{status:404,code:'NOT_FOUND'});
    const gr=found.rows[0]; await assertOrgAccess(req.auth,gr.org_unit_id);
    if(gr.status!=='PENDING') throw Object.assign(new Error('This receipt has already been inspected.'),{status:409,code:'INVALID_TRANSITION'});
    if(gr.received_by===req.auth.userId) throw Object.assign(new Error('The person recording receipt cannot inspect and accept it.'),{status:403,code:'SEGREGATION_OF_DUTIES'});
    let accepted=0n;
    if(outcome==='ACCEPTED') {
      accepted=parseMinorUnits(req.body?.acceptedAmount);
      if(accepted<=0n||accepted>BigInt(gr.po_amount)) throw Object.assign(new Error('Accepted value must be greater than zero and cannot exceed the purchase order.'),{status:422,code:'RECEIPT_VALUE_INVALID'});
    }
    const updated=await client.query(`UPDATE goods_receipts SET status=$1,accepted_amount_minor=$2,inspected_by=$3,inspected_at=now(),condition_notes=condition_notes || E'\\nInspection: ' || $4 WHERE id=$5 RETURNING *`,[outcome,accepted.toString(),req.auth.userId,note,gr.id]);
    if(outcome==='ACCEPTED') {
      await client.query(`UPDATE purchase_orders SET status='RECEIVED' WHERE id=$1`,[gr.po_id]);
      if(gr.spend_type==='CAPITAL') {
        const assetId=uuid(), tag=`FDA-AST-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        await client.query(`INSERT INTO assets(id,asset_tag,purchase_order_id,receipt_id,description,category,purchase_cost_minor,currency,org_unit_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[assetId,tag,gr.po_id,gr.id,gr.requisition_title,text(req.body?.assetCategory||'GENERAL','Asset category',80),accepted.toString(),gr.currency,gr.org_unit_id]);
        await writeAudit(client,{...req.auth,role:req.actorRole},'asset.registered','asset',assetId,{assetTag:tag,purchaseOrderId:gr.po_id,receiptId:gr.id,purchaseCostMinor:accepted.toString()});
      }
    }
    await writeAudit(client,{...req.auth,role:req.actorRole},`goods_receipt.${outcome.toLowerCase()}`,'goods_receipt',gr.id,{purchaseOrderId:gr.po_id,outcome,acceptedAmountMinor:accepted.toString(),inspectionNotes:note});
    return updated.rows[0];
  }); res.json(result);
}));

app.post('/api/purchase-orders/:id/invoice',loadAuth,csrfRequired,guard('invoice.create'),route(async(req,res)=>{
  const invoiceNo=text(req.body?.invoiceNo,'Supplier invoice number',80);
  const amount=parseMinorUnits(req.body?.amount);
  const result=await transaction(async(client)=>{
    const found=await client.query(`SELECT po.*,r.org_unit_id,gr.id AS receipt_id,gr.status AS receipt_status,gr.accepted_amount_minor FROM purchase_orders po JOIN requisitions r ON r.id=po.requisition_id LEFT JOIN LATERAL (SELECT * FROM goods_receipts x WHERE x.purchase_order_id=po.id ORDER BY x.received_at DESC LIMIT 1) gr ON true WHERE po.id=$1 FOR UPDATE OF po`,[requireUuid(req.params.id)]);
    if(!found.rowCount) throw Object.assign(new Error('Purchase order not found.'),{status:404,code:'NOT_FOUND'});
    const po=found.rows[0]; await assertOrgAccess(req.auth,po.org_unit_id);
    if(po.status!=='RECEIVED'||po.receipt_status!=='ACCEPTED') throw Object.assign(new Error('An inspected and accepted delivery is required before invoice matching.'),{status:409,code:'RECEIPT_NOT_ACCEPTED'});
    const exact=amount===BigInt(po.amount_minor)&&amount===BigInt(po.accepted_amount_minor);
    const invoiceId=uuid();
    const inv=await client.query(`INSERT INTO invoices(id,invoice_no,vendor_id,purchase_order_id,submitted_by,amount_minor,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[invoiceId,invoiceNo,po.vendor_id,po.id,req.auth.userId,amount.toString(),po.currency,exact?'MATCHED':'EXCEPTION']);
    await writeAudit(client,{...req.auth,role:req.actorRole},'invoice.submitted','invoice',invoiceId,{purchaseOrderId:po.id,invoiceNo,status:exact?'MATCHED':'EXCEPTION',amountMinor:amount.toString(),poAmountMinor:po.amount_minor,acceptedReceiptMinor:po.accepted_amount_minor});
    return inv.rows[0];
  }); res.status(201).json(result);
}));

app.post('/api/invoices/:id/recheck-match',loadAuth,csrfRequired,guard('invoice.create'),route(async(req,res)=>{
  const result=await transaction(async(client)=>{
    const found=await client.query(`SELECT i.*,po.amount_minor AS po_amount,po.vendor_id AS po_vendor,gr.status AS receipt_status,gr.accepted_amount_minor FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN LATERAL (SELECT * FROM goods_receipts x WHERE x.purchase_order_id=po.id ORDER BY x.received_at DESC LIMIT 1) gr ON true WHERE i.id=$1 FOR UPDATE OF i`,[requireUuid(req.params.id)]);
    if(!found.rowCount) throw Object.assign(new Error('Invoice not found.'),{status:404,code:'NOT_FOUND'});
    const i=found.rows[0];
    if(i.status!=='EXCEPTION') throw Object.assign(new Error('Only an exception invoice can be rechecked.'),{status:409,code:'INVALID_TRANSITION'});
    const match=i.vendor_id===i.po_vendor&&i.receipt_status==='ACCEPTED'&&BigInt(i.amount_minor)===BigInt(i.po_amount)&&BigInt(i.amount_minor)===BigInt(i.accepted_amount_minor);
    if(!match) throw Object.assign(new Error('The invoice still does not match vendor, purchase order, and accepted receipt values.'),{status:409,code:'THREE_WAY_MISMATCH'});
    const updated=await client.query(`UPDATE invoices SET status='MATCHED' WHERE id=$1 RETURNING *`,[i.id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'invoice.matched','invoice',i.id,{purchaseOrderId:i.purchase_order_id,amountMinor:i.amount_minor});
    return updated.rows[0];
  }); res.json(result);
}));

app.post('/api/invoices/:id/correct',loadAuth,csrfRequired,guard('invoice.create'),route(async(req,res)=>{
  const amount=parseMinorUnits(req.body?.amount), reason=text(req.body?.reason,'Correction reason',1000);
  if(amount<=0n)throw Object.assign(new Error('Invoice amount must be greater than zero.'),{status:422,code:'INVALID_AMOUNT'});
  const result=await transaction(async(client)=>{
    const found=await client.query(`SELECT i.*,r.org_unit_id FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE i.id=$1 FOR UPDATE OF i`,[requireUuid(req.params.id)]);
    if(!found.rowCount)throw Object.assign(new Error('Invoice not found.'),{status:404,code:'NOT_FOUND'});
    const invoice=found.rows[0]; await assertOrgAccess(req.auth,invoice.org_unit_id);
    if(invoice.status!=='EXCEPTION')throw Object.assign(new Error('Only exception invoices can be corrected.'),{status:409,code:'INVALID_TRANSITION'});
    const updated=await client.query(`UPDATE invoices SET amount_minor=$1 WHERE id=$2 RETURNING *`,[amount.toString(),invoice.id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'invoice.corrected','invoice',invoice.id,{reason,oldAmountMinor:invoice.amount_minor,newAmountMinor:amount.toString()});
    return updated.rows[0];
  });res.json(result);
}));

app.post('/api/invoices/:id/authorize',loadAuth,csrfRequired,guard('invoice.authorize'),route(async(req,res)=>{
  const result=await transaction(async(client)=>{
    const found=await client.query(`SELECT i.*,po.requisition_id,po.vendor_id AS po_vendor_id,po.amount_minor AS po_amount,r.requester_id,r.budget_account_id,r.org_unit_id,gr.status AS receipt_status,gr.accepted_amount_minor FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id JOIN LATERAL (SELECT * FROM goods_receipts x WHERE x.purchase_order_id=po.id ORDER BY x.received_at DESC LIMIT 1) gr ON true WHERE i.id=$1 FOR UPDATE OF i`,[requireUuid(req.params.id)]);
    if(!found.rowCount) throw Object.assign(new Error('Invoice not found.'),{status:404,code:'NOT_FOUND'});
    const i=found.rows[0]; await assertOrgAccess(req.auth,i.org_unit_id);
    if(i.status!=='MATCHED'||i.vendor_id!==i.po_vendor_id||i.receipt_status!=='ACCEPTED'||BigInt(i.amount_minor)!==BigInt(i.po_amount)||BigInt(i.amount_minor)!==BigInt(i.accepted_amount_minor)) throw Object.assign(new Error('Only a fully matched invoice may be authorized.'),{status:409,code:'THREE_WAY_MATCH_REQUIRED'});
    if(i.submitted_by===req.auth.userId||i.requester_id===req.auth.userId) throw Object.assign(new Error('The invoice submitter or requisition requester cannot authorize its payment.'),{status:403,code:'SEGREGATION_OF_DUTIES'});
    const paymentId=uuid(), ref=`FDA-PAY-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payment=await client.query(`INSERT INTO payments(id,payment_ref,invoice_id,authorized_by,amount_minor,currency,status) VALUES($1,$2,$3,$4,$5,$6,'AUTHORIZED') RETURNING *`,[paymentId,ref,i.id,req.auth.userId,i.amount_minor,i.currency]);
    await client.query(`UPDATE invoices SET status='AUTHORIZED' WHERE id=$1`,[i.id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'payment.authorized','payment',paymentId,{paymentRef:ref,invoiceId:i.id,amountMinor:i.amount_minor,currency:i.currency});
    return payment.rows[0];
  }); res.status(201).json(result);
}));

app.post('/api/payments/:id/record',loadAuth,csrfRequired,guard('payment.record'),route(async(req,res)=>{
  const paymentRef=text(req.body?.paymentReference,'Payment reference',80);
  const result=await transaction(async(client)=>{
    const found=await client.query(`SELECT p.*,i.id AS invoice_id,i.purchase_order_id,po.requisition_id,r.requester_id,r.budget_account_id,r.org_unit_id FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE p.id=$1 FOR UPDATE OF p`,[requireUuid(req.params.id)]);
    if(!found.rowCount) throw Object.assign(new Error('Authorized payment not found.'),{status:404,code:'NOT_FOUND'});
    const p=found.rows[0]; await assertOrgAccess(req.auth,p.org_unit_id);
    if(p.status!=='AUTHORIZED') throw Object.assign(new Error('This payment is already recorded.'),{status:409,code:'INVALID_TRANSITION'});
    if(p.authorized_by===req.auth.userId||p.requester_id===req.auth.userId) throw Object.assign(new Error('The authorizer or original requester cannot record payment.'),{status:403,code:'SEGREGATION_OF_DUTIES'});
    const spent=await client.query(`UPDATE budget_accounts SET reserved_minor=reserved_minor-$1,spent_minor=spent_minor+$1,version=version+1 WHERE id=$2 AND reserved_minor >= $1 RETURNING id`,[p.amount_minor,p.budget_account_id]);
    if(!spent.rowCount) throw Object.assign(new Error('The reserved budget could not be reconciled. Finance review is required.'),{status:409,code:'BUDGET_RECONCILIATION_REQUIRED'});
    const updated=await client.query(`UPDATE payments SET status='PAID',paid_by=$1,paid_at=now(),payment_ref=$2 WHERE id=$3 RETURNING *`,[req.auth.userId,paymentRef,p.id]);
    await client.query(`UPDATE invoices SET status='PAID' WHERE id=$1`,[p.invoice_id]);
    await client.query(`UPDATE requisitions SET status='COMPLETE',updated_at=now(),version=version+1 WHERE id=$1`,[p.requisition_id]);
    await writeAudit(client,{...req.auth,role:req.actorRole},'payment.recorded','payment',p.id,{paymentReference:paymentRef,invoiceId:p.invoice_id,amountMinor:p.amount_minor,currency:p.currency});
    await client.query(`INSERT INTO integration_outbox(id,event_type,aggregate_type,aggregate_id,payload,idempotency_key) VALUES($1,'finance.payment_recorded','payment',$2,$3,$4)`,[uuid(),p.id,{paymentId:p.id,invoiceId:p.invoice_id,amountMinor:p.amount_minor,currency:p.currency,paymentReference:paymentRef},`payment-recorded:${p.id}`]);
    return updated.rows[0];
  }); res.json(result);
}));

app.get('/api/reports/financial-summary',loadAuth,guard('budget.read.all'),route(async(req,res)=>{
  const ids=await scopedUnits(req.auth);
  const result=await pool.query(`SELECT fiscal_year,vote_code,title,currency,allocated_minor::text,reserved_minor::text,spent_minor::text,(allocated_minor-reserved_minor-spent_minor)::text AS available_minor FROM budget_accounts WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) ORDER BY fiscal_year DESC,vote_code`,[ids]);
  res.json({generatedAt:new Date().toISOString(),rows:result.rows});
}));

app.get('/api/audit-events',loadAuth,guard('audit.read.all'),route(async(req,res)=>{
  const limit=Math.min(Math.max(Number(req.query.limit||50),1),200);
  const result=await pool.query(`SELECT id,sequence,actor_id,actor_role,org_unit_id,action,entity_type,entity_id,request_id,event_data,previous_hash,event_hash,created_at FROM audit_events ORDER BY sequence DESC LIMIT $1`,[limit]);
  res.json(result.rows);
}));

const allowedFiles={'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.txt':'text/plain'};
async function assertRecordAttachmentAccess(auth,type,id,capability) {
  const table={REQUISITION:'requisitions',PURCHASE_ORDER:'purchase_orders',RECEIPT:'goods_receipts',INVOICE:'invoices',ASSET:'assets'}[type];
  if(!table) throw Object.assign(new Error('Unsupported attachment record type.'),{status:422,code:'INVALID_INPUT'});
  let sql;
  if(type==='REQUISITION') sql='SELECT id,org_unit_id FROM requisitions WHERE id=$1';
  else if(type==='PURCHASE_ORDER') sql='SELECT po.id,r.org_unit_id FROM purchase_orders po JOIN requisitions r ON r.id=po.requisition_id WHERE po.id=$1';
  else if(type==='RECEIPT') sql='SELECT gr.id,r.org_unit_id FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE gr.id=$1';
  else if(type==='INVOICE') sql='SELECT i.id,r.org_unit_id FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE i.id=$1';
  else sql='SELECT a.id,a.org_unit_id FROM assets a WHERE a.id=$1';
  const row=await pool.query(sql,[requireUuid(id,'Record')]);
  if(!row.rowCount) throw Object.assign(new Error('Record not found.'),{status:404,code:'NOT_FOUND'});
  const allCapability=capability.replace('.scope','.all');
  const permitted=auth.roles.some((item)=>ROLE_CAPABILITIES[item.role]?.includes(capability)||ROLE_CAPABILITIES[item.role]?.includes(allCapability));
  if(!permitted) throw Object.assign(new Error('You do not have permission to access attachments.'),{status:403,code:'FORBIDDEN'});
  await assertOrgAccess(auth,row.rows[0].org_unit_id);
  return row.rows[0];
}

const upload = multer({
  storage: multer.diskStorage({ destination: async (_req,_file,cb)=>{try{cb(null,await safeUploadsDirectory());}catch(error){cb(error);}}, filename: (_req,_file,cb)=>cb(null,crypto.randomUUID()) }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    if(allowedFiles[ext]!==file.mimetype) return cb(Object.assign(new Error('Only PDF, PNG, JPEG, and plain-text evidence files are accepted.'),{status:422,code:'FILE_TYPE_NOT_ALLOWED'}));
    cb(null,true);
  },
});

app.post('/api/records/:type/:id/attachments',loadAuth,csrfRequired,route(async(req,res,next)=>{
  const type=String(req.params.type||'').toUpperCase();
  await assertRecordAttachmentAccess(req.auth,type,req.params.id,'attachment.write.scope');
  next();
}),upload.single('file'),route(async(req,res)=>{
  if(!req.file) throw Object.assign(new Error('Choose an evidence file to upload.'),{status:422,code:'FILE_REQUIRED'});
  const ext=path.extname(req.file.originalname).toLowerCase();
  const bytes=fs.readFileSync(req.file.path);
  const signatureOk=ext==='.pdf'?bytes.subarray(0,5).toString()==='%PDF-':ext==='.png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):ext==='.jpg'||ext==='.jpeg'?bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff:ext==='.txt';
  if(!signatureOk){fs.unlinkSync(req.file.path);throw Object.assign(new Error('The file contents do not match the selected file type.'),{status:422,code:'FILE_SIGNATURE_INVALID'});}
  fs.chmodSync(req.file.path,0o600);
  const id=uuid();
  try {
    const row=await transaction(async(client)=>{
      const inserted=await client.query(`INSERT INTO attachments(id,record_type,record_id,uploaded_by,original_name,storage_name,media_type,byte_size,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,record_type,record_id,original_name,media_type,byte_size,sha256,created_at`,[id,String(req.params.type).toUpperCase(),req.params.id,req.auth.userId,path.basename(req.file.originalname).slice(0,180),path.basename(req.file.path),req.file.mimetype,req.file.size,sha256(bytes)]);
      await writeAudit(client,{...req.auth,role:req.auth.role},'attachment.uploaded','attachment',id,{recordType:type,recordId:req.params.id,fileName:path.basename(req.file.originalname).slice(0,180),byteSize:req.file.size,sha256:sha256(bytes)});
      return inserted.rows[0];
    });res.status(201).json(row);
  } catch(error){fs.unlinkSync(req.file.path);throw error;}
}));

app.get('/api/attachments/:id',loadAuth,route(async(req,res)=>{
  const attachment=await pool.query('SELECT * FROM attachments WHERE id=$1',[requireUuid(req.params.id)]);
  if(!attachment.rowCount) return res.status(404).json({error:'Attachment not found.',code:'NOT_FOUND'});
  const item=attachment.rows[0];
  await assertRecordAttachmentAccess(req.auth,item.record_type,item.record_id,'attachment.read.scope');
  const directory=await safeUploadsDirectory();
  const file=path.resolve(directory,item.storage_name);
  if(path.dirname(file)!==directory||!fs.existsSync(file)) return res.status(404).json({error:'Attachment content is unavailable.',code:'FILE_NOT_FOUND'});
  res.setHeader('Content-Type',item.media_type);
  res.setHeader('Content-Disposition',`attachment; filename="${item.original_name.replace(/["\\\r\n]/g,'_')}"`);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Cache-Control','private, no-store');
  fs.createReadStream(file).pipe(res);
}));

app.get('/api/records/:type/:id/attachments',loadAuth,route(async(req,res)=>{
  const type=String(req.params.type||'').toUpperCase();
  await assertRecordAttachmentAccess(req.auth,type,req.params.id,'attachment.read.scope');
  const rows=await pool.query(`SELECT id,record_type,record_id,original_name,media_type,byte_size,sha256,created_at FROM attachments WHERE record_type=$1 AND record_id=$2 ORDER BY created_at DESC`,[type,req.params.id]);
  res.json(rows.rows);
}));

app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found.',code:'API_NOT_FOUND'}));
app.use(express.static(distDir,{index:false,etag:true,maxAge:'1h',setHeaders(res,file){if(file.includes(`${path.sep}assets${path.sep}`))res.setHeader('Cache-Control','public,max-age=31536000,immutable');}}));
app.get(/.*/,(_req,res)=>res.sendFile(path.join(distDir,'index.html')));

app.use((error,req,res,_next)=>{
  const status=Number(error.status||error.statusCode||500);
  if(status>=500) console.error(JSON.stringify({level:'error',requestId:req.requestId,message:error.message,code:error.code}));
  else console.warn(JSON.stringify({level:'warn',requestId:req.requestId,code:error.code||'REQUEST_ERROR',status}));
  if(res.headersSent) return res.end();
  if(error instanceof multer.MulterError) return res.status(422).json({error:'Upload failed. Check file size and try again.',code:error.code});
  res.status(status).json({error:status>=500?'The server could not complete the request. Share the request ID with support.':error.message,code:error.code||'REQUEST_ERROR',requestId:req.requestId});
});

async function start() {
  if(process.env.DATABASE_URL) {
    await migrate();
    await bootstrapInitialAdmin();
    await pool.query('SELECT 1');
  } else {
    console.warn('DATABASE_URL is unset; static demo pages will load, but secure API is not ready.');
  }
  await safeUploadsDirectory();
  if(process.env.INTEGRATION_WEBHOOK_URL&&process.env.INTEGRATION_WEBHOOK_SECRET){
    if(!process.env.INTEGRATION_WEBHOOK_URL.startsWith('https://')||process.env.INTEGRATION_WEBHOOK_SECRET.length<32)throw new Error('Integration webhook must use HTTPS and a secret of at least 32 characters.');
    const timer=setInterval(()=>deliverOutboxBatch().catch(error=>console.error(JSON.stringify({level:'error',event:'outbox_worker_error',message:error.message}))),5000);
    timer.unref();
  }
  app.listen(port,'0.0.0.0',()=>console.log(JSON.stringify({level:'info',event:'server_started',port,dbConfigured:Boolean(process.env.DATABASE_URL)})));
}

async function bootstrapInitialAdmin() {
  const email=String(process.env.INITIAL_ADMIN_EMAIL||'').trim().toLowerCase();
  const fullName=String(process.env.INITIAL_ADMIN_NAME||'').trim();
  const password=String(process.env.INITIAL_ADMIN_PASSWORD||'');
  if(!email&&!fullName&&!password)return;
  if(!email||!fullName||password.length<16)throw new Error('Initial administrator provisioning needs name, email, and a one-time password of at least 16 characters.');
  const found=await pool.query('SELECT id FROM users WHERE email=$1',[email]);
  if(found.rowCount)return;
  await transaction(async(client)=>{
    const unitId=uuid();
    await client.query(`INSERT INTO org_units(id,code,name,level) VALUES($1,'FDA-HQ','FDA Headquarters','HEADQUARTERS') ON CONFLICT(code) DO NOTHING`,[unitId]);
    const unit=await client.query(`SELECT id FROM org_units WHERE code='FDA-HQ'`);
    const userId=uuid();
    await client.query(`INSERT INTO users(id,email,full_name,password_hash,must_change_password) VALUES($1,$2,$3,$4,true)`,[userId,email,fullName,await hashPassword(password)]);
    await client.query(`INSERT INTO user_roles(id,user_id,role,org_unit_id) VALUES($1,$2,'MANAGING_DIRECTOR',$3)`,[uuid(),userId,unit.rows[0].id]);
    await writeAudit(client,{userId,role:'MANAGING_DIRECTOR',orgUnitId:unit.rows[0].id,requestId:crypto.randomUUID()},'identity.initial_admin_provisioned','user',userId,{role:'MANAGING_DIRECTOR'});
  });
  console.log('Initial administrator created; first sign-in requires a password change. Remove INITIAL_ADMIN_* variables from the deployment after this deployment starts.');
}

export { app, start };

if (process.env.NODE_ENV !== 'test') start().catch((error)=>{console.error('Startup failed:',error.message);process.exit(1);});
