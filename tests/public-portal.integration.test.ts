import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { registerPublicPortal, validateNotice } from '../server/public-portal.js';
import { requireCapability } from '../server/domain.js';
import { writeAudit } from '../server/db.js';

// PostgreSQL runs entirely in memory. No live connection or production records are used.
const database = new PGlite();
const actorId = randomUUID(), officeId = randomUUID(), otherOfficeId = randomUUID();
let server: Server, origin: string, noticeId: string, queryId: string;
const pool = { query: async (sql: string, params?: unknown[]) => {
  const result = await database.query(sql, params);
  return { ...result, rowCount: result.rows.length || result.affectedRows };
} };
const input = { tenderRef: 'TEST-PUBLIC-1', title: 'Isolated test notice', procurementCategory: 'GOODS', orgUnitId: officeId,
  submissionDeadline: new Date(Date.now() + 86400000).toISOString(), managingDirector: 'Procurement Office', submissionAddress: 'Test office',
  primaryEmail: 'procurement@example.test', telephones: '123456', requirements: 'Requirement one\nRequirement two' };
const route = (handler: Function) => (req: any, res: any, next: any) => Promise.resolve(handler(req, res)).catch(next);
async function request(path: string, body?: unknown, role?: string, csrf = true) {
  const response = await fetch(`${origin}${path}`, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(role ? {'x-test-role': role} : {}), ...(csrf ? {'x-test-csrf':'valid'} : {}) },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}) });
  return {status: response.status, data: await response.json()};
}
beforeAll(async () => {
  await database.exec(await readFile(new URL('../server/migrations/001_initial.sql', import.meta.url), 'utf8'));
  await database.exec(await readFile(new URL('../server/migrations/002_public_portal.sql', import.meta.url), 'utf8'));
  await pool.query("INSERT INTO org_units(id,code,name,level) VALUES($1,'TEST-HQ','Test HQ','HEADQUARTERS'),($2,'TEST-OTHER','Other','HEADQUARTERS')", [officeId,otherOfficeId]);
  await pool.query("INSERT INTO users(id,email,full_name,password_hash) VALUES($1,'test@example.test','Test staff','unused')",[actorId]);
  const app = express(); app.use(express.json());
  registerPublicPortal(app, { pool,
    transaction: (callback: Function) => database.transaction(async tx => callback({query: async (sql: string, params?: unknown[]) => {const r = await tx.query(sql,params);return {...r,rowCount:r.rows.length||r.affectedRows};}})),
    writeAudit, uuid: randomUUID, route, ensureDb: () => {},
    loadAuth: (req: any, res: any, next: any) => {
      if (!req.get('x-test-role')) return res.status(401).json({error:'Sign in to continue.'});
      req.auth = {userId: actorId, role: req.get('x-test-role'), orgUnitId: officeId}; next();
    },
    csrfRequired: (req: any,res: any,next: any) => req.get('x-test-csrf') === 'valid' ? next() : res.status(403).json({error:'CSRF required'}),
    guard: (capability: string) => (req: any,_res: any,next: any) => {try {requireCapability(req.auth.role,capability);next();} catch(e) {next(e);}},
    assertOrgAccess: async (_auth: any, unit: string) => {if (unit !== officeId) throw Object.assign(new Error('Outside office scope'),{status:403});},
    scopedUnits: async () => [officeId], actorFor: (req: any) => req.auth,
  });
  app.use((err: any,_req: any,res: any,_next: any) => res.status(err.status||500).json({error:err.message}));
  await new Promise<void>(resolve => {server=app.listen(0,'127.0.0.1',resolve);});
  origin = `http://127.0.0.1:${(server.address() as any).port}`;
}, 30000);
afterAll(async () => { await new Promise<void>(resolve => server?.close(()=>resolve())); await database.close(); });

describe('public portal publication and privacy', () => {
  it('starts empty and protects staff publication routes', async () => {
    expect((await request('/api/public/tenders')).data).toEqual([]);
    expect((await request('/api/procurement/notices', input)).status).toBe(401);
    expect((await request('/api/procurement/notices', input, 'COUNTY_OFFICER')).status).toBe(403);
    expect((await request('/api/procurement/notices', input, 'PROCUREMENT_OFFICER', false)).status).toBe(403);
    expect((await request('/api/procurement/notices', {...input,orgUnitId:otherOfficeId}, 'PROCUREMENT_OFFICER')).status).toBe(403);
  });
  it('keeps drafts private until explicit publication', async () => {
    const created = await request('/api/procurement/notices',input,'PROCUREMENT_OFFICER');
    expect(created.status).toBe(201); noticeId=created.data.id;
    expect((await request('/api/public/tenders')).data).toEqual([]);
    expect((await request(`/api/procurement/notices/${noticeId}/publish`,{},'PROCUREMENT_OFFICER')).status).toBe(200);
    const published = await request('/api/public/tenders');
    expect(published.data).toHaveLength(1); expect(published.data[0].tenderRef).toBe(input.tenderRef);
    expect(published.data[0].estimatedBudgetUSD).toBeNull();
  });
  it('persists inquiries without publicly exposing private data', async () => {
    const anonymous = await request('/api/public/clarifications',{tenderId:noticeId,companyName:'Private test firm',contactPerson:'Private person',email:'private@example.test',phone:'123',question:'Original confidential question'});
    expect(anonymous.status).toBe(401);
    queryId=randomUUID();
    await pool.query(`INSERT INTO bidder_clarifications(id,tender_id,company_name,contact_person,email,phone,question) VALUES($1,$2,$3,$4,$5,$6,$7)`,[queryId,noticeId,'Private test firm','Private person','private@example.test','123','Original confidential question']);
    expect((await request('/api/public/clarifications')).data).toEqual([]);
    const queue = await request('/api/procurement/clarifications',undefined,'PROCUREMENT_OFFICER');
    expect(queue.data[0].email).toBe('private@example.test');
    expect((await request(`/api/procurement/clarifications/${queryId}/respond`,{publicQuestion:'Reviewed question',response:'Official answer'},'PROCUREMENT_OFFICER')).status).toBe(422);
    expect((await request(`/api/procurement/clarifications/${queryId}/respond`,{publicQuestion:'Reviewed question',response:'Official answer',confirmPublication:true},'PROCUREMENT_OFFICER')).status).toBe(200);
    const visible = await request('/api/public/clarifications');
    expect(visible.data[0].question).toBe('Reviewed question');
    expect(JSON.stringify(visible.data)).not.toMatch(/private@example|Private person|Private test firm|confidential question/);
    const audit = await pool.query("SELECT action FROM audit_events WHERE entity_id=$1",[queryId]);
    expect(audit.rows.map((r:any)=>r.action)).toEqual(['CLARIFICATION_PUBLISHED']);
  });
  it('withdraws notices and related clarifications without deleting their records', async () => {
    expect((await request(`/api/procurement/notices/${noticeId}/withdraw`,{},'PROCUREMENT_OFFICER')).status).toBe(200);
    expect((await request('/api/public/tenders')).data).toEqual([]);
    expect((await request('/api/public/clarifications')).data).toEqual([]);
    expect((await request('/api/procurement/clarifications',undefined,'PROCUREMENT_OFFICER')).data).toHaveLength(1);
    expect((await request('/api/public/clarifications',{tenderId:noticeId,companyName:'Test',contactPerson:'Test',email:'a@example.test',phone:'123',question:'Question'})).status).toBe(401);
  });
  it('rejects unsafe document links, invalid budgets and past deadlines', () => {
    expect(()=>validateNotice({...input,documentsDownloadUrl:'javascript:alert(1)'})).toThrow();
    expect(()=>validateNotice({...input,estimatedBudgetUSD:'NaN'})).toThrow();
    expect(()=>validateNotice({...input,submissionDeadline:'2000-01-01'})).toThrow();
  });
});
