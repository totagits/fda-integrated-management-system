import { sendSignedWebhook, validateWebhookConfiguration } from './integration-transport.js';
import { registerEnterprise } from './enterprise.js';
import { registerSealedBidding } from './sealed-bidding.js';
import { registerSupport } from './support.js';
import { registerDepartments, departmentAuth, DEPARTMENT_ROLES } from './departments.js';
import { registerAnalytics } from './analytics.js';
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
import { registerPublicPortal } from './public-portal.js';
import { deliverIdentityInvitation, issueIdentityInvitation, makeUnusablePasswordHash } from './identity-invitations.js';
import { identityEmailConfigured, invitationLinkIsConfigured } from './identity-email.js';

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 100 : 8, standardHeaders: 'draft-8', legacyHeaders: false });
const invitationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false });

async function deliverOutboxBatch() {
  const target=String(process.env.INTEGRATION_WEBHOOK_URL||'').trim();
  const secret=String(process.env.INTEGRATION_WEBHOOK_SECRET||'');
  if(!target||!secret)return;
  if(!target.startsWith('https://')||secret.length<32)return;
  const batch=await transaction(async(client)=>{
    const claimed=await client.query(`SELECT id,event_type,aggregate_type,aggregate_id,payload,idempotency_key,attempts,created_at FROM integration_outbox WHERE delivered_at IS NULL AND next_attempt_at<=now() AND (locked_until IS NULL OR locked_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20`);
    if(!claimed.rowCount)return [];
    await client.query('UPDATE integration_outbox SET locked_until=now()+interval \'2 minutes\' WHERE id=ANY($1::uuid[])',[claimed.rows.map(row=>row.id)]);
    return claimed.rows;
  });
  for(const item of batch){
    try{
      await sendSignedWebhook(item,target,secret);
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
  return res.json({ status: 'ready', checkedAt: new Date().toISOString(), integrations: { webhookConfigured: Boolean(process.env.INTEGRATION_WEBHOOK_URL&&process.env.INTEGRATION_WEBHOOK_SECRET) }, email: { configured: identityEmailConfigured() && invitationLinkIsConfigured() } });
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

async function scopedUnits(auth, client = pool) {
  if (auth.roles.some((item) => item.role === 'ETHICS_OFFICER' && !item.orgUnitId)) return null;
  if (unrestricted(auth)) return null;
  const roots = auth.roles.map((item) => item.orgUnitId).filter(Boolean);
  if (!roots.length) return [];
  const result = await client.query(
    `WITH RECURSIVE descendants(id) AS (
       SELECT id FROM org_units WHERE id=ANY($1::uuid[])
       UNION ALL SELECT o.id FROM org_units o JOIN descendants d ON o.parent_id=d.id
     ) SELECT DISTINCT id FROM descendants`, [roots],
  );
  return result.rows.map(r => r.id);
}

async function assertOrgAccess(auth, orgUnitId, client = pool) {
  if (!orgUnitId) throw Object.assign(new Error('This record has no office scope.'), { status: 403, code: 'OFFICE_SCOPE_REQUIRED' });
  if (unrestricted(auth) || (auth.roles.some((item) => item.role === 'ETHICS_OFFICER' && !item.orgUnitId))) return;
  const units = await scopedUnits(auth, client);
  if (!units.includes(orgUnitId)) throw Object.assign(new Error('This record is outside your assigned office scope.'), { status: 403, code: 'OFFICE_SCOPE_FORBIDDEN' });
}

function actorFor(req) {
  return { ...req.auth, role: req.actorRole || req.auth.role };
}

function positiveMinorUnits(value) {
  const amount = parseMinorUnits(value);
  if (amount <= 0n) throw Object.assign(new Error('Amount must be greater than zero.'), { status: 422, code: 'INVALID_AMOUNT' });
  return amount.toString();
}

function validCurrency(value) {
  if (!['USD', 'LRD'].includes(value)) throw Object.assign(new Error('Currency must be USD or LRD.'), { status: 422, code: 'INVALID_CURRENCY' });
  return value;
}

function validEnum(value, allowed, label) {
  if (!allowed.includes(value)) throw Object.assign(new Error(`${label} is not supported.`), { status: 422, code: 'INVALID_INPUT' });
  return value;
}

function audit(client, req, action, entityType, entityId, data = {}) {
  return writeAudit(client, actorFor(req), action, entityType, entityId, data);
}

app.get('/api/health/live', (_req, res) => res.json({ status: 'live' }));

// Authentication: passwords are verified server-side; only random, hashed session tokens are stored.
app.post('/api/auth/login', loginLimiter, route(async (req, res) => {
  ensureDb();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 1024) {
    return res.status(401).json({ error: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS' });
  }
  const result = await pool.query('SELECT id,email,full_name,password_hash,must_change_password,disabled_at FROM users WHERE email=$1', [email]);
  const user = result.rows[0];
  if (!user || user.disabled_at || !(await verifyPassword(password, user.password_hash))) {
    await pool.query('SELECT pg_sleep(0.15)');
    return res.status(401).json({ error: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS' });
  }
  const assignments = await pool.query('SELECT role,org_unit_id FROM user_roles WHERE user_id=$1 ORDER BY created_at', [user.id]);
  if (!assignments.rowCount) return res.status(403).json({ error: 'This account has no assigned role.', code: 'ROLE_NOT_ASSIGNED' });
  const session = makeSessionToken();
  const csrf = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000);
  await transaction(async (client) => {
    await client.query('INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at) VALUES($1,$2,$3,$4)', [session.hash, user.id, sha256(csrf), expiresAt]);
    await audit(client, { auth: { userId: user.id, email, fullName: user.full_name, role: assignments.rows[0].role, orgUnitId: assignments.rows[0].org_unit_id, requestId: req.requestId }, actorRole: assignments.rows[0].role }, 'identity.login', 'user', user.id, { email });
  });
  setSessionCookies(res, session.token, csrf);
  res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, mustChangePassword: user.must_change_password }, roles: assignments.rows.map((row) => ({ role: row.role, orgUnitId: row.org_unit_id })) });
}));

app.post('/api/auth/accept-invitation', invitationLimiter, route(async (req, res) => {
  ensureDb();
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token) || password.length < 12 || password.length > 1024) {
    throw Object.assign(new Error('The invitation is invalid or expired, or the password does not meet the minimum length of 12 characters.'), { status: 422, code: 'INVALID_INVITATION' });
  }
  const passwordHash = await hashPassword(password);
  const accepted = await transaction(async (client) => {
    const found = await client.query(
      `SELECT i.id,i.user_id,i.org_unit_id,i.expires_at,i.accepted_at,i.revoked_at,
              u.email,u.full_name,u.disabled_at,r.role
       FROM identity_invitations i JOIN users u ON u.id=i.user_id
       JOIN user_roles r ON r.user_id=u.id
       WHERE i.token_hash=$1 FOR UPDATE OF i,u`,
      [crypto.createHash('sha256').update(token).digest('hex')],
    );
    const invitation = found.rows[0];
    if (!invitation || invitation.disabled_at || invitation.accepted_at || invitation.revoked_at || new Date(invitation.expires_at) <= new Date()) {
      throw Object.assign(new Error('The invitation is invalid or expired. Ask your FDA administrator to send a new invitation.'), { status: 410, code: 'INVITATION_EXPIRED' });
    }
    await client.query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1 AND disabled_at IS NULL', [invitation.user_id, passwordHash]);
    await client.query('UPDATE identity_invitations SET accepted_at=now() WHERE id=$1', [invitation.id]);
    await client.query('UPDATE identity_invitations SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND accepted_at IS NULL AND revoked_at IS NULL', [invitation.user_id, invitation.id]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [invitation.user_id]);
    const role = invitation.role;
    const actor = { userId: invitation.user_id, email: invitation.email, fullName: invitation.full_name, role, orgUnitId: invitation.org_unit_id, requestId: req.requestId };
    await writeAudit(client, actor, 'identity.invitation_accepted', 'user', invitation.user_id, { role });
    return { email: invitation.email };
  });
  res.json({ status: 'activated', email: accepted.email });
}));

app.get('/api/auth/me', loadAuth, route(async (req, res) => {
  res.json({ user: { id: req.auth.userId, email: req.auth.email, fullName: req.auth.fullName, mustChangePassword: req.auth.mustChangePassword }, roles: req.auth.roles });
}));

app.post('/api/auth/change-password', loadAuth, csrfRequired, route(async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 12 || newPassword.length > 1024 || newPassword === currentPassword) {
    throw Object.assign(new Error('Choose a different password with at least 12 characters.'), { status: 422, code: 'INVALID_PASSWORD' });
  }
  const user = await pool.query('SELECT password_hash FROM users WHERE id=$1 AND disabled_at IS NULL', [req.auth.userId]);
  if (!user.rowCount || !(await verifyPassword(currentPassword, user.rows[0].password_hash))) {
    throw Object.assign(new Error('Current password is incorrect.'), { status: 401, code: 'INVALID_CREDENTIALS' });
  }
  const passwordHash = await hashPassword(newPassword);
  await transaction(async (client) => {
    await client.query('UPDATE users SET password_hash=$2,must_change_password=false WHERE id=$1', [req.auth.userId, passwordHash]);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [req.auth.userId]);
    await audit(client, req, 'identity.password_changed', 'user', req.auth.userId);
  });
  clearSessionCookies(res);
  res.json({ status: 'password_changed' });
}));

app.post('/api/auth/logout', loadAuth, csrfRequired, route(async (req, res) => {
  await transaction(async (client) => {
    await client.query('DELETE FROM sessions WHERE token_hash=$1', [sha256(parseCookies(req).fda_session)]);
    await audit(client, req, 'identity.logout', 'user', req.auth.userId);
  });
  clearSessionCookies(res);
  res.json({ status: 'signed_out' });
}));

// Organization-scoped master data and work queues.
app.get('/api/admin/org-units', loadAuth, guardAny('org.manage','org.read.all'), route(async (_req, res) => {
  const rows = await pool.query('SELECT id,code,name,level,parent_id,county,active FROM org_units ORDER BY level, name');
  res.json(rows.rows);
}));

app.post('/api/admin/org-units', loadAuth, csrfRequired, guard('org.manage'), route(async (req, res) => {
  const body = req.body || {};
  const code = text(body.code, 'Office code', 30).toUpperCase();
  const name = text(body.name, 'Office name', 160);
  const level = validEnum(body.level, ['HEADQUARTERS','REGION','COUNTY'], 'Office level');
  const parentId = body.parentId ? requireUuid(body.parentId, 'Parent office') : null;
  if (level === 'HEADQUARTERS' && parentId) throw Object.assign(new Error('Headquarters cannot have a parent office.'), { status: 422, code: 'INVALID_HIERARCHY' });
  if (level !== 'HEADQUARTERS' && !parentId) throw Object.assign(new Error('Regional and county offices require a parent office.'), { status: 422, code: 'INVALID_HIERARCHY' });
  if (level === 'COUNTY' && !text(body.county, 'County', 80)) throw Object.assign(new Error('County is required.'), { status: 422, code: 'INVALID_INPUT' });
  const id = uuid();
  await transaction(async (client) => {
    if (parentId) {
      const parent = await client.query('SELECT level FROM org_units WHERE id=$1 AND active=true', [parentId]);
      const expected = level === 'REGION' ? 'HEADQUARTERS' : 'REGION';
      if (!parent.rowCount || parent.rows[0].level !== expected) throw Object.assign(new Error(`A ${level.toLowerCase()} office must be assigned under an active ${expected.toLowerCase()} office.`), { status: 422, code: 'INVALID_HIERARCHY' });
    }
    await client.query('INSERT INTO org_units(id,code,name,level,parent_id,county) VALUES($1,$2,$3,$4,$5,$6)', [id, code, name, level, parentId, level === 'COUNTY' ? text(body.county, 'County', 80) : null]);
    await audit(client, req, 'organization.office_created', 'org_unit', id, { code, name, level, parentId });
  });
  res.status(201).json({ id, code, name, level, parent_id: parentId, county: body.county || null });
}));

app.post('/api/admin/users', loadAuth, csrfRequired, guardAny('user.manage','it.admin.bootstrap'), route(async (req, res) => {
  const body = req.body || {};
  const email = text(body.email, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Enter a valid work email.'), { status: 422, code: 'INVALID_INPUT' });
  if ((await pool.query('SELECT 1 FROM users WHERE email=$1',[email])).rowCount) throw Object.assign(new Error('An account already uses this email address.'), { status: 409, code: 'ACCOUNT_EXISTS' });
  const fullName = text(body.fullName, 'Full name', 160);
  const role = validEnum(body.role, ['IT_DIRECTOR','FINANCE_DIRECTOR','HR_DIRECTOR','PROCUREMENT_OFFICER','ASSET_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR','ETHICS_OFFICER'], 'Role');
  const isITDirector = req.auth.roles.some((assignment) => assignment.role === 'IT_DIRECTOR');
  const isMD = req.auth.roles.some((assignment) => assignment.role === 'MANAGING_DIRECTOR');
    if (isMD && !isITDirector && !['IT_DIRECTOR','HR_DIRECTOR','ETHICS_OFFICER'].includes(role)) throw Object.assign(new Error('The Managing Director may appoint the HR Director, IT Director, or the designated ethics officer. The IT Director provisions other system accounts; HR invites employees during onboarding.'), { status: 403, code: 'ROLE_PROVISIONING_RESTRICTED' });
  if (!isITDirector && !isMD) throw Object.assign(new Error('Only the IT Director or Managing Director may provision accounts.'), { status: 403, code: 'FORBIDDEN' });
  if (isITDirector && role === 'IT_DIRECTOR') throw Object.assign(new Error('Only the Managing Director may appoint an IT Director.'), { status: 403, code: 'ROLE_PROVISIONING_RESTRICTED' });
  const orgUnitId = body.orgUnitId ? requireUuid(body.orgUnitId, 'Office') : null;
  if (!['MANAGING_DIRECTOR','IT_DIRECTOR','ETHICS_OFFICER'].includes(role) && !orgUnitId) throw Object.assign(new Error('Assign this user to an office scope.'), { status: 422, code: 'OFFICE_SCOPE_REQUIRED' });
  if (orgUnitId) {
    const office = await pool.query('SELECT id FROM org_units WHERE id=$1 AND active=true', [orgUnitId]);
    if (!office.rowCount) throw Object.assign(new Error('The selected office is not active.'), { status: 422, code: 'INVALID_OFFICE' });
  }
  const id = uuid();
  const invitation = await transaction(async (client) => {
    await client.query('INSERT INTO users(id,email,full_name,password_hash,must_change_password) VALUES($1,$2,$3,$4,true)', [id, email, fullName, await makeUnusablePasswordHash()]);
    await client.query('INSERT INTO user_roles(id,user_id,role,org_unit_id) VALUES($1,$2,$3,$4)', [uuid(), id, role, orgUnitId]);
    await audit(client, req, 'identity.user_created', 'user', id, { email, role, orgUnitId });
    const issued=await issueIdentityInvitation(client, { user: { id, email, full_name: fullName }, requestedBy: req.auth.userId, orgUnitId, invitationType: 'MD_ROLE_ACCOUNT' });
    await audit(client,req,'identity.invitation_issued','user',id,{role,orgUnitId});
    return issued;
  });
  const delivery = await deliverIdentityInvitation(pool, { invitation, role });
  res.status(201).json({ user: { id, email, fullName }, ...delivery });
}));

app.post('/api/admin/users/:id/invitation/resend', loadAuth, csrfRequired, guardAny('user.manage','it.admin.bootstrap'), route(async (req, res) => {
  const id = requireUuid(req.params.id, 'User');
  const invitation = await transaction(async (client) => {
    const found = await client.query(`SELECT u.id,u.email,u.full_name,u.must_change_password,u.disabled_at,r.role,r.org_unit_id
      FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 FOR UPDATE OF u`, [id]);
    const user = found.rows[0];
    if (!user || user.disabled_at || !user.must_change_password) throw Object.assign(new Error('This account has already been activated or is unavailable.'), { status: 409, code: 'INVITATION_NOT_AVAILABLE' });
    const isITDirector = req.auth.roles.some((assignment) => assignment.role === 'IT_DIRECTOR');
    const isMD = req.auth.roles.some((assignment) => assignment.role === 'MANAGING_DIRECTOR');
    if (isMD && !isITDirector && !['IT_DIRECTOR','HR_DIRECTOR','ETHICS_OFFICER'].includes(user.role)) throw Object.assign(new Error('The Managing Director may resend only leadership or designated ethics officer invitations.'), { status: 403, code: 'ROLE_PROVISIONING_RESTRICTED' });
    if (!isITDirector && !isMD) throw Object.assign(new Error('Only the IT Director or Managing Director may manage account invitations.'), { status: 403, code: 'FORBIDDEN' });
    if (isITDirector && ['MANAGING_DIRECTOR','IT_DIRECTOR'].includes(user.role)) throw Object.assign(new Error('Only the Managing Director may manage executive account invitations.'), { status: 403, code: 'ROLE_PROVISIONING_RESTRICTED' });
    const issued=await issueIdentityInvitation(client, { user, requestedBy: req.auth.userId, orgUnitId: user.org_unit_id, invitationType: 'MD_ROLE_ACCOUNT' });
    await audit(client,req,'identity.invitation_resent','user',id,{role:user.role,orgUnitId:user.org_unit_id});
    return issued;
  });
  const delivery = await deliverIdentityInvitation(pool, { invitation, role: invitation.user.role });
  res.json(delivery);
}));

app.get('/api/admin/user-invitations', loadAuth, guardAny('user.manage','it.admin.bootstrap'), route(async (req, res) => {
  const rows=await pool.query(`SELECT u.id AS user_id,u.email,u.full_name,r.role,o.name AS office_name,
      i.id AS invitation_id,i.created_at,i.sent_at,i.expires_at,
      CASE WHEN i.expires_at<=now() THEN 'EXPIRED'
           WHEN i.sent_at IS NULL THEN 'PENDING_DELIVERY'
           ELSE 'SENT' END AS invitation_status
    FROM users u
    JOIN LATERAL (SELECT role,org_unit_id FROM user_roles WHERE user_id=u.id ORDER BY created_at LIMIT 1) r ON true
    LEFT JOIN org_units o ON o.id=r.org_unit_id
    JOIN LATERAL (SELECT id,created_at,sent_at,expires_at FROM identity_invitations WHERE user_id=u.id AND accepted_at IS NULL AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1) i ON true
    WHERE u.must_change_password=true AND u.disabled_at IS NULL
    ORDER BY i.created_at DESC LIMIT 200`);
  const isITDirector = req.auth.roles.some((assignment) => assignment.role === 'IT_DIRECTOR');
  const isMD = req.auth.roles.some((assignment) => assignment.role === 'MANAGING_DIRECTOR');
  res.json(isITDirector ? rows.rows.filter((row) => !['MANAGING_DIRECTOR','IT_DIRECTOR'].includes(row.role)) : isMD ? rows.rows.filter((row) => ['HR_DIRECTOR','IT_DIRECTOR','ETHICS_OFFICER'].includes(row.role)) : []);
}));

app.post('/api/admin/budgets', loadAuth, csrfRequired, guard('budget.manage'), route(async (req, res) => {
  const b = req.body || {};
  const fiscalYear = Number(b.fiscalYear);
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2200) throw Object.assign(new Error('Fiscal year is invalid.'), { status: 422, code: 'INVALID_INPUT' });
  const voteCode = text(b.voteCode, 'Vote code', 50).toUpperCase();
  const title = text(b.title, 'Budget description', 180);
  const orgUnitId = requireUuid(b.orgUnitId, 'Office');
  const currency = validCurrency(b.currency);
  const allocated = parseMinorUnits(b.allocatedAmount).toString();
  await assertOrgAccess(req.auth, orgUnitId);
  const id = uuid();
  await transaction(async (client) => {
    await client.query('INSERT INTO budget_accounts(id,fiscal_year,vote_code,title,org_unit_id,currency,allocated_minor) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, fiscalYear, voteCode, title, orgUnitId, currency, allocated]);
    await audit(client, req, 'finance.budget_created', 'budget_account', id, { fiscalYear, voteCode, title, orgUnitId, currency, allocatedMinor: allocated });
  });
  res.status(201).json({ id, fiscal_year: fiscalYear, vote_code: voteCode, title, org_unit_id: orgUnitId, currency, allocated_minor: allocated, reserved_minor: '0', spent_minor: '0', available_minor: allocated });
}));

app.get('/api/admin/vendors', loadAuth, guard('vendor.manage'), route(async (_req, res) => {
  const rows = await pool.query('SELECT id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status,created_at FROM vendors ORDER BY legal_name');
  res.json(rows.rows);
}));

app.get('/api/vendors', loadAuth, guard('vendor.manage'), route(async (_req, res) => {
  const rows = await pool.query("SELECT id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status,created_at FROM vendors WHERE status='ACTIVE' ORDER BY legal_name");
  res.json(rows.rows);
}));

app.post('/api/admin/vendors', loadAuth, csrfRequired, guard('vendor.manage'), route(async (req, res) => {
  const b = req.body || {};
  const id = uuid();
  const legalName = text(b.legalName, 'Legal business name', 180);
  const registrationNo = text(b.registrationNo, 'Registration number', 80);
  const expiry = b.taxClearanceExpires ? String(b.taxClearanceExpires) : null;
  if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) throw Object.assign(new Error('Tax-clearance expiry must be a valid date.'), { status: 422, code: 'INVALID_INPUT' });
  await transaction(async (client) => {
    await client.query('INSERT INTO vendors(id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status) VALUES($1,$2,$3,$4,$5,$6)', [id, legalName, registrationNo, expiry, b.ppccRegistrationNo ? text(b.ppccRegistrationNo, 'PPCC registration', 80) : null, 'PENDING']);
    await client.query('UPDATE vendors SET created_by=$2 WHERE id=$1',[id,req.auth.userId]);
    await audit(client, req, 'procurement.vendor_registered', 'vendor', id, { legalName, registrationNo, status: 'PENDING' });
  });
  res.status(201).json({ id, legal_name: legalName, registration_no: registrationNo, tax_clearance_expires: expiry, ppcc_registration_no: b.ppccRegistrationNo || null, status: 'PENDING' });
}));

app.get('/api/budgets', loadAuth, route(async (req, res) => {
  const assignment = req.auth.roles.find((item) => ROLE_CAPABILITIES[item.role]?.some((cap) => ['budget.read.all','budget.read.scope','workflow.read.all','workflow.read.scope'].includes(cap)));
  if (!assignment) requireCapability(req.auth.role, 'budget.read.scope');
  const units = await scopedUnits(req.auth);
  const rows = await pool.query(`SELECT id,fiscal_year,vote_code,title,org_unit_id,currency,allocated_minor,reserved_minor,spent_minor,(allocated_minor-reserved_minor-spent_minor) AS available_minor,version FROM budget_accounts WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) ORDER BY fiscal_year DESC,vote_code`, [units]);
  res.json(rows.rows);
}));

app.get('/api/workflow', loadAuth, route(async (req, res) => {
  const assignment = req.auth.roles.find((item) => ROLE_CAPABILITIES[item.role]?.some((cap) => ['workflow.read.all','workflow.read.scope'].includes(cap)));
  if (!assignment) requireCapability(req.auth.role, 'workflow.read.scope');
  const units = await scopedUnits(req.auth);
  const rows = await pool.query(`SELECT r.id,r.requisition_no,r.requester_id,r.org_unit_id,r.budget_account_id,r.title,r.description,r.procurement_method,r.spend_type,r.currency,r.amount_minor,r.status,r.returned_reason,r.version,r.created_at,u.full_name AS requester_name,b.vote_code,b.title AS budget_title,
    po.id AS po_id,po.po_number,po.vendor_id,v.legal_name AS vendor_name,po.amount_minor AS po_amount_minor,po.status AS po_status,
    gr.id AS receipt_id,gr.receipt_no,gr.status AS receipt_status,gr.accepted_amount_minor,gr.received_by AS receipt_received_by,
    i.id AS invoice_id,i.invoice_no,i.status AS invoice_status,i.amount_minor AS invoice_amount_minor,i.submitted_by AS invoice_submitted_by,
    p.id AS payment_id,p.payment_ref,p.status AS payment_status,p.amount_minor AS payment_amount_minor,p.authorized_by AS payment_authorized_by,
    a.id AS asset_id,a.asset_tag,a.description AS asset_description
    FROM requisitions r JOIN users u ON u.id=r.requester_id JOIN budget_accounts b ON b.id=r.budget_account_id
    LEFT JOIN purchase_orders po ON po.requisition_id=r.id LEFT JOIN vendors v ON v.id=po.vendor_id
    LEFT JOIN LATERAL (SELECT * FROM goods_receipts WHERE purchase_order_id=po.id ORDER BY received_at DESC LIMIT 1) gr ON true
    LEFT JOIN LATERAL (SELECT * FROM invoices WHERE purchase_order_id=po.id ORDER BY created_at DESC LIMIT 1) i ON true
    LEFT JOIN payments p ON p.invoice_id=i.id LEFT JOIN assets a ON a.purchase_order_id=po.id
    WHERE ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[])) ORDER BY r.created_at DESC LIMIT 500`, [units]);
  res.json(rows.rows);
}));

async function requisitionForUpdate(client, id) {
  const result = await client.query('SELECT r.*,b.currency AS budget_currency,b.org_unit_id AS budget_org_unit_id FROM requisitions r JOIN budget_accounts b ON b.id=r.budget_account_id WHERE r.id=$1 FOR UPDATE OF r,b', [requireUuid(id, 'Requisition')]);
  if (!result.rowCount) throw Object.assign(new Error('Requisition not found.'), { status: 404, code: 'NOT_FOUND' });
  return result.rows[0];
}

async function receiptForUpdate(client, id) {
  const result = await client.query('SELECT gr.*,po.id AS po_id,po.requisition_id,po.vendor_id,po.amount_minor AS po_amount_minor,po.currency AS po_currency,r.title AS requisition_title,r.requester_id,r.org_unit_id,r.budget_account_id,r.spend_type,r.amount_minor AS requisition_amount_minor FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE gr.id=$1 FOR UPDATE OF gr,po,r', [requireUuid(id, 'Receipt')]);
  if (!result.rowCount) throw Object.assign(new Error('Delivery record not found.'), { status: 404, code: 'NOT_FOUND' });
  return result.rows[0];
}

async function invoiceForUpdate(client, id) {
  const result = await client.query('SELECT i.*,po.id AS po_id,po.requisition_id,po.vendor_id AS po_vendor_id,po.amount_minor AS po_amount_minor,po.currency AS po_currency,r.requester_id,r.org_unit_id,r.budget_account_id,r.amount_minor AS requisition_amount_minor FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE i.id=$1 FOR UPDATE OF i,po,r', [requireUuid(id, 'Invoice')]);
  if (!result.rowCount) throw Object.assign(new Error('Supplier invoice not found.'), { status: 404, code: 'NOT_FOUND' });
  return result.rows[0];
}

app.post('/api/requisitions', loadAuth, csrfRequired, guard('requisition.create'), route(async (req, res) => {
  const b = req.body || {};
  const title = text(b.title, 'Request title', 180);
  const description = text(b.description, 'Description', 4000);
  const budgetId = requireUuid(b.budgetAccountId, 'Budget account');
  const amount = positiveMinorUnits(b.amount);
  const currency = validCurrency(b.currency);
  const method = validEnum(b.procurementMethod, ['RFQ','NATIONAL_COMPETITIVE_BIDDING','INTERNATIONAL_COMPETITIVE_BIDDING','SINGLE_SOURCE','FRAMEWORK'], 'Procurement method');
  const spendType = validEnum(b.spendType, ['CAPITAL','GOODS','SERVICES'], 'Spend type');
  const assignment = req.auth.roles.find((item) => item.role === req.actorRole && item.orgUnitId);
  const orgUnitId = assignment?.orgUnitId;
  if (!orgUnitId) throw Object.assign(new Error('Your account needs an office assignment before creating a requisition.'), { status: 403, code: 'OFFICE_SCOPE_REQUIRED' });
  const budget = await pool.query('SELECT currency,org_unit_id FROM budget_accounts WHERE id=$1', [budgetId]);
  if (!budget.rowCount || budget.rows[0].org_unit_id !== orgUnitId || budget.rows[0].currency !== currency) throw Object.assign(new Error('Select an active budget for your assigned office and currency.'), { status: 422, code: 'BUDGET_SCOPE_MISMATCH' });
  const id = uuid();
  const number = `FDA-PR-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  await transaction(async (client) => {
    await client.query('INSERT INTO requisitions(id,requisition_no,requester_id,org_unit_id,budget_account_id,title,description,procurement_method,spend_type,currency,amount_minor,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,\'DRAFT\')', [id, number, req.auth.userId, orgUnitId, budgetId, title, description, method, spendType, currency, amount]);
    await audit(client, req, 'procurement.requisition_created', 'requisition', id, { requisitionNo: number, amountMinor: amount, currency, budgetAccountId: budgetId });
  });
  res.status(201).json({ id, requisition_no: number, title, description, amount_minor: amount, currency, status: 'DRAFT' });
}));

app.post('/api/requisitions/:id/submit', loadAuth, csrfRequired, guard('requisition.submit.own'), route(async (req, res) => {
  const result = await transaction(async (client) => {
    const r = await requisitionForUpdate(client, req.params.id);
    await assertOrgAccess(req.auth, r.org_unit_id, client);
    if (r.requester_id !== req.auth.userId) throw Object.assign(new Error('Only the requesting employee can submit this requisition.'), { status: 403, code: 'FORBIDDEN' });
    if (!canTransition('requisition', r.status, 'SUBMITTED')) throw Object.assign(new Error('This requisition cannot be submitted in its current state.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    const budget = await client.query(`UPDATE budget_accounts SET reserved_minor=reserved_minor+$2,version=version+1 WHERE id=$1 AND allocated_minor-reserved_minor-spent_minor >= $2::bigint RETURNING id`, [r.budget_account_id, r.amount_minor]);
    if (!budget.rowCount) throw Object.assign(new Error('The budget has insufficient available funds.'), { status: 409, code: 'INSUFFICIENT_BUDGET' });
    await client.query("UPDATE requisitions SET status='SUBMITTED',submitted_at=now(),updated_at=now(),version=version+1 WHERE id=$1", [r.id]);
    await audit(client, req, 'procurement.requisition_submitted', 'requisition', r.id, { budgetAccountId: r.budget_account_id, reservedMinor: r.amount_minor });
    return { id: r.id, status: 'SUBMITTED' };
  });
  res.json(result);
}));

app.post('/api/requisitions/:id/correct', loadAuth, csrfRequired, guard('requisition.submit.own'), route(async (req, res) => {
  const b = req.body || {};
  const title = text(b.title, 'Request title', 180);
  const description = text(b.description, 'Description', 4000);
  const amount = positiveMinorUnits(b.amount);
  const result = await transaction(async (client) => {
    const r = await requisitionForUpdate(client, req.params.id);
    await assertOrgAccess(req.auth, r.org_unit_id, client);
    if (r.requester_id !== req.auth.userId) throw Object.assign(new Error('Only the requesting employee can correct this requisition.'), { status: 403, code: 'FORBIDDEN' });
    if (r.status !== 'RETURNED') throw Object.assign(new Error('Only a returned requisition can be corrected.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    await client.query("UPDATE requisitions SET title=$2,description=$3,amount_minor=$4,status='DRAFT',returned_reason=NULL,updated_at=now(),version=version+1 WHERE id=$1", [r.id, title, description, amount]);
    await audit(client, req, 'procurement.requisition_corrected', 'requisition', r.id, { amountMinor: amount });
    return { id: r.id, status: 'DRAFT' };
  });
  res.json(result);
}));

async function decideRequisition(req, res, decision) {
  const reason = ['RETURNED','REJECTED'].includes(decision) ? text(req.body?.reason, 'Decision reason', 2000) : null;
  const result = await transaction(async (client) => {
    const r = await requisitionForUpdate(client, req.params.id);
    await assertOrgAccess(req.auth, r.org_unit_id, client);
    if (r.requester_id === req.auth.userId) throw Object.assign(new Error('The requester cannot approve or decide their own requisition.'), { status: 403, code: 'SEGREGATION_OF_DUTIES' });
    if (!canTransition('requisition', r.status, decision)) throw Object.assign(new Error('This requisition cannot be moved to that state.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    await client.query('UPDATE requisitions SET status=$2,returned_reason=$3,approved_by=$4,decided_at=now(),updated_at=now(),version=version+1 WHERE id=$1', [r.id, decision, reason, decision === 'APPROVED' ? req.auth.userId : null]);
    await audit(client, req, `procurement.requisition_${decision.toLowerCase()}`, 'requisition', r.id, { reason });
    return { id: r.id, status: decision };
  });
  res.json(result);
}

app.post('/api/requisitions/:id/approve', loadAuth, csrfRequired, guard('requisition.approve'), route((req, res) => decideRequisition(req, res, 'APPROVED')));
app.post('/api/requisitions/:id/return', loadAuth, csrfRequired, guard('requisition.approve'), route((req, res) => decideRequisition(req, res, 'RETURNED')));
app.post('/api/requisitions/:id/reject', loadAuth, csrfRequired, guard('requisition.approve'), route((req, res) => decideRequisition(req, res, 'REJECTED')));

app.post('/api/requisitions/:id/purchase-order', loadAuth, csrfRequired, guard('purchase_order.create'), route(async (req, res) => {
  const b = req.body || {};
  const vendorId = requireUuid(b.vendorId, 'Vendor');
  const amount = positiveMinorUnits(b.amount);
  const expectedDelivery = b.expectedDelivery ? String(b.expectedDelivery) : null;
  if (expectedDelivery && !/^\d{4}-\d{2}-\d{2}$/.test(expectedDelivery)) throw Object.assign(new Error('Expected delivery date is invalid.'), { status: 422, code: 'INVALID_INPUT' });
  const id = uuid();
  const poNumber = `FDA-PO-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  await transaction(async (client) => {
    const r = await requisitionForUpdate(client, req.params.id);
    await assertOrgAccess(req.auth, r.org_unit_id, client);
    if (r.status !== 'APPROVED') throw Object.assign(new Error('Only an approved requisition can receive a purchase order.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    if (amount !== String(r.amount_minor)) throw Object.assign(new Error('Purchase order amount must match the approved requisition amount.'), { status: 422, code: 'AMOUNT_MISMATCH' });
    const vendor = await client.query("SELECT id FROM vendors WHERE id=$1 AND status='ACTIVE'", [vendorId]);
    if (!vendor.rowCount) throw Object.assign(new Error('Select an active, qualified vendor.'), { status: 422, code: 'VENDOR_NOT_ACTIVE' });
    const contracts=await client.query('SELECT *,current_date BETWEEN start_date AND end_date AS valid_now FROM procurement_contracts WHERE requisition_id=$1 FOR UPDATE',[r.id]);
    const contract=contracts.rows[0];
    if(contract&&(contract.status!=='APPROVED'||contract.vendor_id!==vendorId||String(contract.amount_minor)!==amount||!contract.valid_now))throw Object.assign(new Error('The contract must be approved, within its effective dates, and match the selected supplier and value.'),{status:409,code:'CONTRACT_NOT_READY'});
    await client.query('INSERT INTO purchase_orders(id,po_number,requisition_id,vendor_id,created_by,amount_minor,currency,expected_delivery,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,\'ISSUED\')', [id, poNumber, r.id, vendorId, req.auth.userId, amount, r.currency, expectedDelivery]);
    if(contract)await client.query('UPDATE purchase_orders SET contract_id=$2 WHERE id=$1',[id,contract.id]);
    await client.query("UPDATE requisitions SET status='PO_ISSUED',updated_at=now(),version=version+1 WHERE id=$1", [r.id]);
    await audit(client, req, 'procurement.purchase_order_issued', 'purchase_order', id, { poNumber, requisitionId: r.id, vendorId, amountMinor: amount });
  });
  res.status(201).json({ id, po_number: poNumber, status: 'ISSUED' });
}));

app.post('/api/purchase-orders/:id/receipt', loadAuth, csrfRequired, guardAny('receipt.inspect','asset.manage.scope'), route(async (req, res) => {
  const poId = requireUuid(req.params.id, 'Purchase order');
  const conditionNotes = text(req.body?.conditionNotes, 'Delivery condition notes', 2000);
  const id = uuid();
  const receiptNo = `FDA-GR-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  await transaction(async (client) => {
    const result = await client.query("SELECT po.id,po.status,po.amount_minor,po.received_amount_minor,po.requisition_id,r.org_unit_id FROM purchase_orders po JOIN requisitions r ON r.id=po.requisition_id WHERE po.id=$1 FOR UPDATE OF po,r", [poId]);
    if (!result.rowCount) throw Object.assign(new Error('Purchase order not found.'), { status: 404, code: 'NOT_FOUND' });
    const po = result.rows[0];
    await assertOrgAccess(req.auth, po.org_unit_id, client);
    if (!['ISSUED','RECEIVED'].includes(po.status)) throw Object.assign(new Error('This purchase order cannot receive a delivery.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    if(BigInt(po.received_amount_minor)>=BigInt(po.amount_minor))throw Object.assign(new Error('The purchase order has no remaining unreceived value.'),{status:409,code:'PURCHASE_ORDER_FULLY_RECEIVED'});
    const prior=await client.query("SELECT 1 FROM goods_receipts WHERE purchase_order_id=$1 AND status='PENDING'",[poId]);
    if(prior.rowCount)throw Object.assign(new Error('Complete the pending delivery inspection before recording another receipt.'),{status:409,code:'DELIVERY_ALREADY_RECORDED'});
    await client.query("INSERT INTO goods_receipts(id,receipt_no,purchase_order_id,received_by,accepted_amount_minor,condition_notes,status) VALUES($1,$2,$3,$4,0,$5,'PENDING')", [id, receiptNo, poId, req.auth.userId, conditionNotes]);
    await client.query("UPDATE purchase_orders SET status='RECEIVED' WHERE id=$1", [poId]);
    await audit(client, req, 'asset.delivery_recorded', 'goods_receipt', id, { receiptNo, purchaseOrderId: poId });
  });
  res.status(201).json({ id, receipt_no: receiptNo, status: 'PENDING' });
}));

app.post('/api/receipts/:id/inspect', loadAuth, csrfRequired, guard('receipt.inspect'), route(async (req, res) => {
  const outcome = validEnum(req.body?.outcome, ['ACCEPTED','REJECTED'], 'Inspection outcome');
  const inspectionNotes = text(req.body?.inspectionNotes, 'Inspection notes', 2000);
  const accepted = outcome === 'ACCEPTED' ? positiveMinorUnits(req.body?.acceptedAmount) : '0';
  const id = requireUuid(req.params.id, 'Receipt');
  const result = await transaction(async (client) => {
    const receipt = await receiptForUpdate(client, id);
    await assertOrgAccess(req.auth, receipt.org_unit_id, client);
    if (receipt.status !== 'PENDING') throw Object.assign(new Error('This delivery was already inspected.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    if (receipt.received_by === req.auth.userId) throw Object.assign(new Error('The receiver cannot inspect the same delivery.'), { status: 403, code: 'SEGREGATION_OF_DUTIES' });
    const priorAccepted=await client.query("SELECT coalesce(sum(accepted_amount_minor),0)::text AS total FROM goods_receipts WHERE purchase_order_id=$1 AND status='ACCEPTED' AND id<>$2",[receipt.purchase_order_id,id]);
    const remaining=BigInt(receipt.po_amount_minor)-BigInt(priorAccepted.rows[0].total);
    if (outcome === 'ACCEPTED' && (BigInt(accepted) > remaining || BigInt(accepted) > BigInt(receipt.requisition_amount_minor))) throw Object.assign(new Error('Accepted delivery value exceeds the outstanding purchase-order balance.'), { status: 422, code: 'AMOUNT_MISMATCH' });
    if(outcome==='ACCEPTED'&&receipt.spend_type==='CAPITAL'&&BigInt(accepted)!==BigInt(remaining))throw Object.assign(new Error('Capital-asset receipts must be accepted as a complete delivery so each asset can be registered against its full value.'),{status:422,code:'PARTIAL_CAPITAL_RECEIPT_UNSUPPORTED'});
    await client.query('UPDATE goods_receipts SET status=$2,accepted_amount_minor=$3,inspected_by=$4,inspected_at=now(),condition_notes=condition_notes || $5 WHERE id=$1', [id, outcome, accepted, req.auth.userId, `\nInspection: ${inspectionNotes}`]);
    if(outcome==='ACCEPTED')await client.query("UPDATE purchase_orders SET received_amount_minor=received_amount_minor+$2::bigint,status='RECEIVED' WHERE id=$1",[receipt.purchase_order_id,accepted]);
    let asset = null;
    if (outcome === 'ACCEPTED' && receipt.spend_type === 'CAPITAL') {
      const category = text(req.body?.assetCategory || 'GENERAL', 'Asset category', 80);
      const assetId = uuid();
      const assetTag = `FDA-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      await client.query('INSERT INTO assets(id,asset_tag,purchase_order_id,receipt_id,description,category,purchase_cost_minor,currency,org_unit_id,custodian) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [assetId, assetTag, receipt.po_id, id, receipt.requisition_title, category, accepted, receipt.po_currency, receipt.org_unit_id, null]);
      asset = { id: assetId, asset_tag: assetTag };
    }
    await audit(client, req, `asset.delivery_${outcome.toLowerCase()}`, 'goods_receipt', id, { acceptedAmountMinor: accepted, asset });
    return { id, status: outcome, accepted_amount_minor: accepted, asset };
  });
  res.json(result);
}));

async function matchInvoice(client, invoiceId) {
  const invoice = await client.query(`SELECT i.id,po.id AS po_id,i.vendor_id,i.amount_minor,i.currency,po.vendor_id AS po_vendor_id,po.amount_minor AS po_amount_minor,po.currency AS po_currency,
    coalesce((SELECT sum(accepted_amount_minor) FROM goods_receipts WHERE purchase_order_id=po.id AND status='ACCEPTED'),0)::text AS accepted_amount_minor,
    coalesce((SELECT sum(amount_minor) FROM invoices prior WHERE prior.purchase_order_id=po.id AND prior.id<>i.id AND prior.status IN ('MATCHED','AUTHORIZED','PAID')),0)::text AS prior_billed_minor
    FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id WHERE i.id=$1`, [invoiceId]);
  const row = invoice.rows[0];
  const matches = row && row.vendor_id === row.po_vendor_id && row.currency === row.po_currency && BigInt(row.amount_minor)<=BigInt(row.accepted_amount_minor)-BigInt(row.prior_billed_minor);
  await client.query('UPDATE invoices SET status=$2 WHERE id=$1', [invoiceId, matches ? 'MATCHED' : 'EXCEPTION']);
  if(row)await client.query("UPDATE purchase_orders SET billed_amount_minor=coalesce((SELECT sum(amount_minor) FROM invoices WHERE purchase_order_id=$1 AND status IN ('MATCHED','AUTHORIZED','PAID')),0) WHERE id=$1",[row.po_id]);
  return Boolean(matches);
}

app.post('/api/purchase-orders/:id/invoice', loadAuth, csrfRequired, guard('invoice.create'), route(async (req, res) => {
  const poId = requireUuid(req.params.id, 'Purchase order');
  const invoiceNo = text(req.body?.invoiceNo, 'Supplier invoice number', 100);
  const amount = positiveMinorUnits(req.body?.amount);
  const id = uuid();
  const result = await transaction(async (client) => {
    const po = await client.query('SELECT po.id,po.vendor_id,po.amount_minor,po.billed_amount_minor,po.currency,r.org_unit_id FROM purchase_orders po JOIN requisitions r ON r.id=po.requisition_id WHERE po.id=$1 FOR UPDATE OF po,r', [poId]);
    if (!po.rowCount) throw Object.assign(new Error('Purchase order not found.'), { status: 404, code: 'NOT_FOUND' });
    await assertOrgAccess(req.auth, po.rows[0].org_unit_id, client);
    if(BigInt(po.rows[0].billed_amount_minor)>=BigInt(po.rows[0].amount_minor))throw Object.assign(new Error('This purchase order has already been fully invoiced.'),{status:409,code:'PURCHASE_ORDER_FULLY_BILLED'});
    const priorInvoice=await client.query('SELECT 1 FROM invoices WHERE vendor_id=$1 AND invoice_no=$2',[po.rows[0].vendor_id,invoiceNo]);
    if(priorInvoice.rowCount)throw Object.assign(new Error('That supplier invoice number is already recorded.'),{status:409,code:'DUPLICATE_INVOICE'});
    const accepted = await client.query("SELECT 1 FROM goods_receipts WHERE purchase_order_id=$1 AND status='ACCEPTED'", [poId]);
    if (!accepted.rowCount) throw Object.assign(new Error('An accepted delivery inspection is required before invoice entry.'), { status: 409, code: 'DELIVERY_NOT_ACCEPTED' });
    await client.query('INSERT INTO invoices(id,invoice_no,vendor_id,purchase_order_id,submitted_by,amount_minor,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,\'EXCEPTION\')', [id, invoiceNo, po.rows[0].vendor_id, poId, req.auth.userId, amount, po.rows[0].currency]);
    const matched = await matchInvoice(client, id);
    await audit(client, req, 'finance.invoice_entered', 'invoice', id, { invoiceNo, purchaseOrderId: poId, amountMinor: amount, matchStatus: matched ? 'MATCHED' : 'EXCEPTION' });
    return { id, status: matched ? 'MATCHED' : 'EXCEPTION' };
  });
  res.status(201).json(result);
}));

app.post('/api/invoices/:id/recheck-match', loadAuth, csrfRequired, guard('invoice.create'), route(async (req, res) => {
  const result = await transaction(async (client) => {
    const invoice = await invoiceForUpdate(client, req.params.id);
    await assertOrgAccess(req.auth, invoice.org_unit_id, client);
    if (['AUTHORIZED','PAID'].includes(invoice.status)) throw Object.assign(new Error('An authorized invoice cannot be rematched.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    const matched = await matchInvoice(client, invoice.id);
    await audit(client, req, 'finance.invoice_match_rechecked', 'invoice', invoice.id, { matchStatus: matched ? 'MATCHED' : 'EXCEPTION' });
    return { id: invoice.id, status: matched ? 'MATCHED' : 'EXCEPTION' };
  });
  res.json(result);
}));

app.post('/api/invoices/:id/correct', loadAuth, csrfRequired, guard('invoice.create'), route(async (req, res) => {
  const amount = positiveMinorUnits(req.body?.amount);
  const reason = text(req.body?.reason, 'Correction reason', 2000);
  const result = await transaction(async (client) => {
    const invoice = await invoiceForUpdate(client, req.params.id);
    await assertOrgAccess(req.auth, invoice.org_unit_id, client);
    if (invoice.status !== 'EXCEPTION') throw Object.assign(new Error('Only an invoice exception can be corrected.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    await client.query('UPDATE invoices SET amount_minor=$2 WHERE id=$1', [invoice.id, amount]);
    const matched = await matchInvoice(client, invoice.id);
    await audit(client, req, 'finance.invoice_corrected', 'invoice', invoice.id, { oldAmountMinor: invoice.amount_minor, amountMinor: amount, reason, matchStatus: matched ? 'MATCHED' : 'EXCEPTION' });
    return { id: invoice.id, status: matched ? 'MATCHED' : 'EXCEPTION' };
  });
  res.json(result);
}));

app.post('/api/invoices/:id/authorize', loadAuth, csrfRequired, guard('invoice.authorize'), route(async (req, res) => {
  const result = await transaction(async (client) => {
    const invoice = await invoiceForUpdate(client, req.params.id);
    await assertOrgAccess(req.auth, invoice.org_unit_id, client);
    if (invoice.status !== 'MATCHED') throw Object.assign(new Error('Only a matched invoice can be authorized.'), { status: 409, code: 'INVOICE_NOT_MATCHED' });
    if (invoice.submitted_by === req.auth.userId || invoice.requester_id === req.auth.userId) throw Object.assign(new Error('The invoice submitter and requester cannot authorize its payment.'), { status: 403, code: 'SEGREGATION_OF_DUTIES' });
    const ref = `PENDING-${uuid()}`;
    const paymentId = uuid();
    await client.query("INSERT INTO payments(id,payment_ref,invoice_id,authorized_by,amount_minor,currency,status) VALUES($1,$2,$3,$4,$5,$6,'AUTHORIZED')", [paymentId, ref, invoice.id, req.auth.userId, invoice.amount_minor, invoice.currency]);
    await client.query("UPDATE invoices SET status='AUTHORIZED' WHERE id=$1", [invoice.id]);
    await audit(client, req, 'finance.payment_authorized', 'payment', paymentId, { invoiceId: invoice.id, amountMinor: invoice.amount_minor, currency: invoice.currency });
    return { id: paymentId, status: 'AUTHORIZED' };
  });
  res.json(result);
}));

app.post('/api/payments/:id/record', loadAuth, csrfRequired, guard('payment.record'), route(async (req, res) => {
  const paymentReference = text(req.body?.paymentReference, 'Payment reference', 100);
  const result = await transaction(async (client) => {
    const payment = await client.query(`SELECT p.*,i.purchase_order_id,i.submitted_by,po.requisition_id,r.requester_id,r.org_unit_id,r.budget_account_id,r.amount_minor AS requisition_amount_minor
      FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE p.id=$1 FOR UPDATE OF p,i,po,r`, [requireUuid(req.params.id, 'Payment')]);
    if (!payment.rowCount) throw Object.assign(new Error('Payment not found.'), { status: 404, code: 'NOT_FOUND' });
    const p = payment.rows[0];
    await assertOrgAccess(req.auth, p.org_unit_id, client);
    if (p.status !== 'AUTHORIZED') throw Object.assign(new Error('Only an authorized payment can be recorded.'), { status: 409, code: 'INVALID_STATE_TRANSITION' });
    if (p.authorized_by === req.auth.userId || p.submitted_by === req.auth.userId || p.requester_id === req.auth.userId) throw Object.assign(new Error('Payment recording must be completed by a different authorized officer.'), { status: 403, code: 'SEGREGATION_OF_DUTIES' });
    const totals=await client.query("SELECT coalesce(sum(amount_minor),0)::text AS paid FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE purchase_order_id=$1) AND status='PAID'",[p.purchase_order_id]);
    if(BigInt(totals.rows[0].paid)+BigInt(p.amount_minor)>BigInt(p.requisition_amount_minor))throw Object.assign(new Error('Cumulative payments cannot exceed the approved requisition value.'),{status:409,code:'AMOUNT_MISMATCH'});
    await client.query("UPDATE payments SET payment_ref=$2,paid_by=$3,status='PAID',paid_at=now() WHERE id=$1", [p.id, paymentReference, req.auth.userId]);
    await client.query("UPDATE invoices SET status='PAID' WHERE id=$1", [p.invoice_id]);
    const budget = await client.query('UPDATE budget_accounts SET reserved_minor=reserved_minor-$2::bigint,spent_minor=spent_minor+$2::bigint,version=version+1 WHERE id=$1 AND reserved_minor >= $2::bigint RETURNING id', [p.budget_account_id, p.amount_minor]);
    if (!budget.rowCount) throw Object.assign(new Error('Reserved budget does not cover this payment; payment was not recorded.'), { status: 409, code: 'BUDGET_RESERVATION_MISMATCH' });
    const paidTotal=BigInt(totals.rows[0].paid)+BigInt(p.amount_minor);
    await client.query('UPDATE purchase_orders SET paid_amount_minor=$2,status=CASE WHEN $2::bigint>=amount_minor AND received_amount_minor>=amount_minor THEN \'CLOSED\' ELSE status END WHERE id=$1',[p.purchase_order_id,paidTotal.toString()]);
    if(paidTotal>=BigInt(p.requisition_amount_minor))await client.query("UPDATE requisitions SET status='COMPLETE',updated_at=now(),version=version+1 WHERE id=$1",[p.requisition_id]);
    await audit(client, req, 'finance.payment_recorded', 'payment', p.id, { paymentReference, amountMinor: p.amount_minor, invoiceId: p.invoice_id, requisitionId: p.requisition_id });
    return { id: p.id, status: 'PAID', payment_ref: paymentReference };
  });
  res.json(result);
}));

app.get('/api/audit-events',loadAuth,guard('audit.read.all'),route(async(req,res)=>{
  const limit=Math.min(Math.max(Number(req.query.limit||50),1),200);
  const canReadConfidentialCases=req.auth.roles?.some(item=>['HR_DIRECTOR','MANAGING_DIRECTOR'].includes(item.role))||['HR_DIRECTOR','MANAGING_DIRECTOR'].includes(req.auth.role);
  const result=await pool.query(`SELECT id,sequence,actor_id,actor_role,org_unit_id,action,entity_type,entity_id,request_id,event_data,previous_hash,event_hash,created_at FROM audit_events WHERE ($2::boolean OR entity_type<>'disciplinary_case') AND entity_type<>'hr_grievance' ORDER BY sequence DESC LIMIT $1`,[limit,Boolean(canReadConfidentialCases)]);
  res.json(result.rows);
}));

const allowedFiles={'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.txt':'text/plain'};
async function assertRecordAttachmentAccess(auth,type,id,capability) {
  if(type==='GRIEVANCE'){
    const found=await pool.query('SELECT id,org_unit_id,reporter_user_id,restricted_to_md,escalation_route,case_assignee_id FROM hr_grievances WHERE id=$1',[requireUuid(id,'Record')]);
    if(!found.rowCount)throw Object.assign(new Error('Record not found.'),{status:404});
    const g=found.rows[0],reporter=g.reporter_user_id===auth.userId,isMd=auth.roles?.some(item=>item.role==='MANAGING_DIRECTOR')||auth.role==='MANAGING_DIRECTOR';
    const isHr=auth.roles?.some(item=>item.role==='HR_DIRECTOR')||auth.role==='HR_DIRECTOR';
    const hasEthicsRole=auth.roles?.some(item=>item.role==='ETHICS_OFFICER');
    const assignedEthics=hasEthicsRole&&((g.escalation_route==='INDEPENDENT'&&g.case_assignee_id===auth.userId)||(await pool.query("SELECT 1 FROM hr_grievance_appeals WHERE grievance_id=$1 AND assigned_to=$2",[g.id,auth.userId])).rowCount>0);
    const isAssignedEthics=assignedEthics&&(await pool.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CLEAR'",[g.id,auth.userId])).rowCount>0;
    const standardHandler=g.escalation_route==='STANDARD'&&!g.restricted_to_md&&(isMd||isHr);
    if(!reporter&&!(isAssignedEthics||standardHandler))throw Object.assign(new Error('You do not have permission to access this confidential grievance.'),{status:403,code:'FORBIDDEN'});
    if(standardHandler&&!reporter)await assertOrgAccess(departmentAuth(auth,['HR_DIRECTOR','MANAGING_DIRECTOR']),g.org_unit_id);
    if(capability.includes('write')&&!(reporter||standardHandler||isAssignedEthics))throw Object.assign(new Error('You do not have permission to add grievance evidence.'),{status:403,code:'FORBIDDEN'});
    return g;
  }
  const extra={PAYROLL:['payroll_runs',capability.includes('write')?[...DEPARTMENT_ROLES.hr,...DEPARTMENT_ROLES.financeWrite]:[...DEPARTMENT_ROLES.hr,...DEPARTMENT_ROLES.finance]],STOCKTAKE:['stocktakes',capability.includes('write')?DEPARTMENT_ROLES.assetWrite:DEPARTMENT_ROLES.assets],DEPRECIATION:['depreciation_runs',capability.includes('write')?DEPARTMENT_ROLES.financeWrite:DEPARTMENT_ROLES.finance],BANK_STATEMENT:['bank_statements',capability.includes('write')?DEPARTMENT_ROLES.financeWrite:DEPARTMENT_ROLES.finance],EVALUATION:['bid_evaluations',capability.includes('write')?['MANAGING_DIRECTOR','PROCUREMENT_OFFICER']:DEPARTMENT_ROLES.procurement],PROCUREMENT_CONTRACT:['procurement_contracts',capability.includes('write')?['MANAGING_DIRECTOR','PROCUREMENT_OFFICER']:DEPARTMENT_ROLES.procurement],EMPLOYEE:['hr_employees',DEPARTMENT_ROLES.hr],LEAVE:['hr_leave_requests',DEPARTMENT_ROLES.hr],DISCIPLINARY:['hr_disciplinary_cases',['HR_DIRECTOR','MANAGING_DIRECTOR']],JOURNAL:['gl_journals',capability.includes('write')?DEPARTMENT_ROLES.financeWrite:DEPARTMENT_ROLES.finance],PROCUREMENT_PLAN:['procurement_plans',capability.includes('write')?DEPARTMENT_ROLES.planWrite:DEPARTMENT_ROLES.procurement]}[type];
  if(extra){const scoped=departmentAuth(auth,extra[1]);const found=await pool.query(`SELECT id,org_unit_id FROM ${extra[0]} WHERE id=$1`,[requireUuid(id,'Record')]);if(!found.rowCount)throw Object.assign(new Error('Record not found.'),{status:404});await assertOrgAccess(scoped,found.rows[0].org_unit_id);return found.rows[0];}
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
  const type=String(req.params.type||'').toUpperCase();
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

const departmentServices=registerDepartments(app, { pool, transaction, writeAudit, route, loadAuth, csrfRequired, scopedUnits, assertOrgAccess });
registerAnalytics(app, { pool, route, loadAuth, scopedUnits });
registerEnterprise(app, { pool, transaction, writeAudit, route, loadAuth, csrfRequired, scopedUnits, assertOrgAccess, ...departmentServices });
registerSealedBidding(app,{pool,transaction,writeAudit,route,loadAuth,csrfRequired,scopedUnits,assertOrgAccess});
registerSupport(app,{pool,transaction,writeAudit,route,loadAuth,csrfRequired,uuid});

registerPublicPortal(app, { pool, transaction, writeAudit, uuid, route, ensureDb, loadAuth, csrfRequired, guard, assertOrgAccess, scopedUnits, actorFor });

app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found.',code:'API_NOT_FOUND'}));
app.use(express.static(distDir,{index:false,etag:true,maxAge:'1h',setHeaders(res,file){if(file.includes(`${path.sep}assets${path.sep}`))res.setHeader('Cache-Control','public,max-age=31536000,immutable');}}));
app.get(/.*/,(_req,res)=>res.sendFile(path.join(distDir,'index.html')));

app.use((error,req,res,_next)=>{
  if(error.code==='23505'){error.status=409;error.message='A record with this reference already exists, or this action is already pending.';}
  if(['23503','23514','22P02'].includes(error.code)){error.status=422;error.message='The record contains an invalid value or references an unavailable record.';}
  const status=Number(error.status||error.statusCode||500);
  if(status>=500) console.error(JSON.stringify({level:'error',requestId:req.requestId,message:error.message,code:error.code}));
  else console.warn(JSON.stringify({level:'warn',requestId:req.requestId,code:error.code||'REQUEST_ERROR',status}));
  if(res.headersSent) return res.end();
  if(error instanceof multer.MulterError) return res.status(422).json({error:'Upload failed. Check file size and try again.',code:error.code});
  res.status(status).json({error:status>=500?'The server could not complete the request. Share the request ID with support.':error.message,code:error.code||'REQUEST_ERROR',requestId:req.requestId});
});

async function start() {
  if (process.env.DATABASE_URL) {
    await migrate();
    await bootstrapInitialAdmin();
    await pool.query('SELECT 1');
  } else {
    console.error(JSON.stringify({ level: 'error', event: 'database_not_configured', message: 'Staff workflows are unavailable until PostgreSQL is configured.' }));
  }
  await safeUploadsDirectory();
  if(process.env.INTEGRATION_WEBHOOK_URL&&process.env.INTEGRATION_WEBHOOK_SECRET){
    validateWebhookConfiguration(process.env.INTEGRATION_WEBHOOK_URL,process.env.INTEGRATION_WEBHOOK_SECRET);
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
