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
  retur…10719 tokens truncated…ing(),rows:result.rows});
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
