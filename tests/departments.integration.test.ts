import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { registerDepartments } from '../server/departments.js';
import { writeAudit } from '../server/db.js';
const db=new PGlite();
const office=randomUUID(),otherOffice=randomUUID(),maker=randomUUID(),checker=randomUUID(),employeeUser=randomUUID();
const query=async(sql:string,params?:unknown[])=>{const r=await db.query(sql,params);return {...r,rowCount:r.rows.length||r.affectedRows};};
let server:Server,origin:string,positionId:string,employeeId:string,leaveId:string,periodId:string,debitId:string,creditId:string,journalId:string,planId:string,assetId:string,transferId:string;
const budgetId=randomUUID();
const route=(handler:Function)=>(req:any,res:any,next:any)=>Promise.resolve(handler(req,res)).catch(next);
async function request(path:string,body?:unknown,role='HR_DIRECTOR',actor=maker,unit=office,csrf=true){
 const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-role':role,'x-actor':actor,'x-unit':unit,...(csrf?{'x-csrf':'yes'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:r.status,data:await r.json()};
}
beforeAll(async()=>{
 for(const file of ['001_initial.sql','002_public_portal.sql','003_department_workflows.sql','004_enterprise_workflows.sql','005_statutory_and_sealed.sql','006_hr_recruitment_onboarding.sql','007_hr_training_performance.sql','008_attendance_disciplinary.sql','009_partial_settlement_inventory.sql','010_identity_invitations.sql','011_it_director_administration.sql','012_support_desk.sql','013_hr_contracts.sql'])await db.exec(await readFile(new URL(`../server/migrations/${file}`,import.meta.url),'utf8'));
 await query("INSERT INTO org_units(id,code,name,level) VALUES($1,'TEST','Test','COUNTY'),($2,'OTHER','Other','COUNTY')",[office,otherOffice]);
 for(const [id,email] of [[maker,'maker'],[checker,'checker'],[employeeUser,'employee']])await query('INSERT INTO users(id,email,full_name,password_hash) VALUES($1,$2,$3,\'unused\')',[id,`${email}@example.test`,email]);
 await query("INSERT INTO user_roles(id,user_id,role,org_unit_id) VALUES($1,$2,'COUNTY_OFFICER',$3)",[randomUUID(),employeeUser,office]);
 await query("INSERT INTO budget_accounts(id,fiscal_year,vote_code,title,org_unit_id,currency,allocated_minor) VALUES($1,2026,'TEST','Test budget',$2,'USD',10000000)",[budgetId,office]);
 const app=express();app.use(express.json());
 registerDepartments(app,{pool:{query},transaction:(fn:Function)=>db.transaction(async tx=>fn({query:async(sql:string,p?:unknown[])=>{const r=await tx.query(sql,p);return {...r,rowCount:r.rows.length||r.affectedRows};}})),writeAudit,route,
 loadAuth:(req:any,res:any,next:any)=>{if(!req.get('x-role'))return res.status(401).json({error:'Sign in'});const role=req.get('x-role'),unit=req.get('x-unit');req.auth={userId:req.get('x-actor'),role,orgUnitId:unit,fullName:'Test staff',roles:[{role,orgUnitId:unit}]};next();},
 csrfRequired:(req:any,res:any,next:any)=>req.get('x-csrf')==='yes'?next():res.status(403).json({error:'CSRF'}),
 scopedUnits:async(auth:any)=>auth.roles.some((r:any)=>['MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR'].includes(r.role))?null:auth.roles.map((r:any)=>r.orgUnitId),
 assertOrgAccess:async(auth:any,unit:string)=>{if(!auth.roles.some((r:any)=>['MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR'].includes(r.role)||r.orgUnitId===unit))throw Object.assign(new Error('Outside assigned office'),{status:403});},
 });
 app.use((e:any,_req:any,res:any,_next:any)=>res.status(e.status||500).json({error:e.message}));
 await new Promise<void>(resolve=>{server=app.listen(0,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${(server.address() as any).port}`;
},30000);
afterAll(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await db.close();});
describe('HR records and employee self-service',()=>{
 it('blocks anonymous, wrong-role, CSRF, and cross-office access',async()=>{
  expect((await request('/api/hr/employees',undefined,'')).status).toBe(401);
  expect((await request('/api/hr/employees',undefined,'COUNTY_OFFICER')).status).toBe(403);
  const b={orgUnitId:office,code:'POS-1',title:'Officer',grade:'A',capacity:1};
  expect((await request('/api/hr/positions',b,'HR_DIRECTOR',maker,office,false)).status).toBe(403);
  expect((await request('/api/hr/positions',{...b,orgUnitId:otherOffice})).status).toBe(403);
  const p=await request('/api/hr/positions',b);expect(p.status,p.data.error).toBe(200);positionId=p.data.id;
 });
 it('enforces establishment capacity and persists named employee records',async()=>{
  const b={staffNumber:'TEST-EMP',fullName:'Test employee',positionId,startDate:'2026-01-01',userId:employeeUser};
  const e=await request('/api/hr/employees',b);expect(e.status,e.data.error).toBe(200);employeeId=e.data.id;
  expect((await request('/api/hr/employees',{...b,staffNumber:'EXCESS',userId:''})).status).toBe(409);
  const other=await request('/api/hr/employees',undefined,'HR_DIRECTOR',checker,otherOffice);expect(other.data.rows).toEqual([]);
  const self=await request('/api/hr/self',undefined,'COUNTY_OFFICER',employeeUser);expect(self.data.employee.staff_number).toBe('TEST-EMP');
  const another=await request('/api/hr/self',undefined,'COUNTY_OFFICER',checker);expect(another.data.employee).toBeNull();
 });
 it('provides scoped, database-derived workforce analytics only to HR leadership',async()=>{
  const result=await request('/api/hr/analytics/summary');
  expect(result.status,result.data.error).toBe(200);
  expect(result.data.scope).toBe('assigned offices');
  expect(result.data.workforce).toMatchObject({active:1,exited:0,authorizedPositions:1,filledPositions:1,fillRatePct:100});
  expect(result.data.offices).toHaveLength(1);
  expect((await request('/api/hr/analytics/summary',undefined,'FINANCE_DIRECTOR')).status).toBe(403);
  const executive=await request('/api/hr/analytics/summary',undefined,'MANAGING_DIRECTOR');
  expect(executive.data.scope).toBe('FDA-wide');
 });
 it('tracks signed employment terms, prevents overlapping contracts, and requires independent closure',async()=>{
  const contract=await request('/api/hr/contracts',{employeeId,contractReference:'CONTRACT-TEST-1',contractType:'FIXED_TERM',startDate:'2026-01-01',endDate:'2027-01-01',signedDocumentReference:'PERSONNEL-FILE/CONTRACT-1'});
  expect(contract.status,contract.data.error).toBe(200);
  expect((await request('/api/hr/contracts',{employeeId,contractReference:'CONTRACT-TEST-2',contractType:'FIXED_TERM',startDate:'2026-06-01',endDate:'2027-06-01',signedDocumentReference:'PERSONNEL-FILE/CONTRACT-2'})).status).toBe(409);
  expect((await request('/api/hr/contracts',undefined,'COUNTY_OFFICER',employeeUser)).status).toBe(403);
  expect((await request(`/api/hr/contracts/${contract.data.id}/end`,{reason:'Approved separation record SEP-1'})).status).toBe(403);
  expect((await request(`/api/hr/contracts/${contract.data.id}/end`,{reason:'Approved separation record SEP-1'},'HR_DIRECTOR',checker)).status).toBe(200);
  expect((await request(`/api/departments/employment_contract/${contract.data.id}/history`)).data).toHaveLength(2);
 });
 it('reserves entitlement, rejects overlap and self-approval, and preserves decisions',async()=>{
  const leave={employeeId,startDate:'2026-11-02',endDate:'2026-11-06',days:'5',reason:'Annual leave'};
  expect((await request('/api/hr/leave',leave,'COUNTY_OFFICER',employeeUser)).status).toBe(409);
  expect((await request(`/api/hr/employees/${employeeId}/entitlement`,{year:2026,days:10})).status).toBe(200);
  const l=await request('/api/hr/leave',leave,'COUNTY_OFFICER',employeeUser);expect(l.status,l.data.error).toBe(201);leaveId=l.data.id;
  expect((await request('/api/hr/leave',leave,'COUNTY_OFFICER',employeeUser)).status).toBe(409);
  expect((await request(`/api/hr/leave/${leaveId}/decide`,{status:'APPROVED',reason:'Reviewed'},'HR_DIRECTOR',employeeUser)).status).toBe(403);
  expect((await request(`/api/hr/leave/${leaveId}/decide`,{status:'APPROVED',reason:'Reviewed'})).status).toBe(200);
  expect((await request(`/api/hr/leave/${leaveId}/cancel`,{},'COUNTY_OFFICER',employeeUser)).status).toBe(409);
  expect((await request(`/api/hr/employees/${employeeId}/entitlement`,{year:2026,days:4})).status).toBe(409);
  const self=await request('/api/hr/self',undefined,'COUNTY_OFFICER',employeeUser);expect(Number(self.data.entitlements[0].committed_days)).toBe(5);
  expect((await request(`/api/departments/leave/${leaveId}/history`)).data).toHaveLength(2);
 });
 it('rejects stale employee edits and cross-office promotions',async()=>{
  expect((await request(`/api/hr/employees/${employeeId}/change`,{action:'exit',version:99,reason:'Exit'})).status).toBe(409);
  const p=await request('/api/hr/positions',{orgUnitId:otherOffice,code:'POS-OTHER',title:'Other role',grade:'B',capacity:1},'HR_DIRECTOR',checker,otherOffice);
  expect((await request(`/api/hr/employees/${employeeId}/change`,{action:'transfer',version:1,positionId:p.data.id,reason:'Transfer'})).status).toBe(403);
 });
 it('runs scoped recruitment through independently published vacancy, hiring and employee onboarding',async()=>{
  const p=await request('/api/hr/positions',{orgUnitId:office,code:'POS-RECRUIT',title:'Recruitment Test Officer',grade:'B',capacity:1});expect(p.status,p.data.error).toBe(200);
  const vacancy=await request('/api/hr/vacancies',{positionId:p.data.id,reference:'VAC-TEST',title:'Test Officer',description:'Published selection criteria',opensOn:'2026-01-01',closesOn:'2099-01-01'});expect(vacancy.status,vacancy.data.error).toBe(200);
  expect((await request(`/api/hr/vacancies/${vacancy.data.id}/decide`,{status:'PUBLISHED',reason:'Approved staffing authorization'})).status).toBe(403);
  expect((await request(`/api/hr/vacancies/${vacancy.data.id}/decide`,{status:'PUBLISHED',reason:'Approved staffing authorization'},'HR_DIRECTOR',checker)).status).toBe(200);
  expect((await request('/api/hr/applications',undefined,'HR_DIRECTOR',checker,otherOffice)).data.rows).toHaveLength(0);
  const app=await request('/api/hr/applications',{vacancyId:vacancy.data.id,reference:'APP-TEST',applicantName:'Applicant Test',email:'applicant@example.test',contact:'555-0101'});expect(app.status,app.data.error).toBe(200);
  expect((await request(`/api/hr/applications/${app.data.id}/advance`,{status:'OFFERED',reason:'Invalid skipped stages'})).status).toBe(409);
  for(const [status,reason] of [['SCREENING','Eligibility checked'],['INTERVIEW','Shortlisted against criteria'],['RECOMMENDED','Panel recommendation'],['OFFERED','Offer reference OFFER-1']])expect((await request(`/api/hr/applications/${app.data.id}/advance`,{status,reason})).status).toBe(200);
  expect((await request(`/api/hr/applications/${app.data.id}/hire`,{staffNumber:'NEW-STAFF-1',startDate:'2026-11-01',reason:'Approved appointment'})).status).toBe(403);
  const hired=await request(`/api/hr/applications/${app.data.id}/hire`,{staffNumber:'NEW-STAFF-1',startDate:'2026-11-01',reason:'Approved appointment'},'HR_DIRECTOR',checker);expect(hired.status,hired.data.error).toBe(200);
  expect((await request(`/api/hr/applications/${app.data.id}/hire`,{staffNumber:'DUPLICATE',startDate:'2026-11-01',reason:'Duplicate'},'HR_DIRECTOR',checker)).status).toBe(409);
  const task=await request('/api/hr/onboarding',{employeeId:hired.data.employeeId,taskCode:'ID-001',title:'Issue staff identification',description:'Verify identity documents and record issuance',assignedTo:employeeUser,dueDate:'2026-11-15'});expect(task.status,task.data.error).toBe(200);
  expect((await request('/api/hr/onboarding/my',undefined,'COUNTY_OFFICER',employeeUser)).data).toHaveLength(1);
  expect((await request(`/api/hr/onboarding/${task.data.id}/complete-self`,{reason:'Completed'} ,'COUNTY_OFFICER',checker)).status).toBe(403);
  expect((await request(`/api/hr/onboarding/${task.data.id}/complete-self`,{reason:'Issued under receipt ID ID-552'},'COUNTY_OFFICER',employeeUser)).status).toBe(200);
  expect((await request('/api/hr/onboarding',undefined,'HR_DIRECTOR')).data.rows[0].status).toBe('COMPLETE');
  expect((await request(`/api/departments/application/${app.data.id}/history`,undefined,'HR_DIRECTOR')).data.length).toBeGreaterThanOrEqual(6);
 });
 it('tracks training completion and employee-to-manager performance reviews',async()=>{
  const program=await request('/api/hr/training/programs',{code:'SAFE-WORK',title:'Field safety',category:'Safety',provider:'FDA training unit',description:'Operational field safety course',startsOn:'2026-10-01',endsOn:'2026-12-31',capacity:5});expect(program.status,program.data.error).toBe(200);
  expect((await request(`/api/hr/training/programs/${program.data.id}/decide`,{status:'PUBLISHED',reason:'Approved course plan'})).status).toBe(403);
  expect((await request(`/api/hr/training/programs/${program.data.id}/decide`,{status:'PUBLISHED',reason:'Approved course plan'},'HR_DIRECTOR',checker)).status).toBe(200);
  const enrollment=await request('/api/hr/training/enrollments',{programId:program.data.id,employeeId,learningObjective:'Complete the annual safety course'});expect(enrollment.status,enrollment.data.error).toBe(200);
  expect((await request(`/api/hr/training/enrollments/${enrollment.data.id}/decide`,{status:'APPROVED',reason:'Approved learning plan'})).status).toBe(403);
  expect((await request(`/api/hr/training/enrollments/${enrollment.data.id}/decide`,{status:'APPROVED',reason:'Approved learning plan'},'HR_DIRECTOR',checker)).status).toBe(200);
  expect((await request(`/api/hr/training/enrollments/${enrollment.data.id}/start`,{},'COUNTY_OFFICER',employeeUser)).status).toBe(200);
  expect((await request(`/api/hr/training/enrollments/${enrollment.data.id}/complete`,{reason:'Completed; assessment passed',certificateReference:'CERT-22'},'COUNTY_OFFICER',employeeUser)).status).toBe(200);
  expect((await request(`/api/hr/training/enrollments/${enrollment.data.id}/decide-completion`,{status:'COMPLETED',reason:'Certificate checked against register'},'HR_DIRECTOR',employeeUser)).status).toBe(403);
  expect((await request(`/api/hr/training/enrollments/${enrollment.data.id}/decide-completion`,{status:'COMPLETED',reason:'Certificate checked against register'},'HR_DIRECTOR',checker)).status).toBe(200);
  const cycle=await request('/api/hr/performance/cycles',{orgUnitId:office,reference:'PERF-2026',periodStart:'2026-01-01',periodEnd:'2026-12-31'});expect(cycle.status,cycle.data.error).toBe(200);
  expect((await request(`/api/hr/performance/cycles/${cycle.data.id}/decide`,{status:'OPEN',reason:'Approved annual review cycle'})).status).toBe(403);
  expect((await request(`/api/hr/performance/cycles/${cycle.data.id}/decide`,{status:'OPEN',reason:'Approved annual review cycle'},'HR_DIRECTOR',checker)).status).toBe(200);
  const mine=await request('/api/hr/performance/my',undefined,'COUNTY_OFFICER',employeeUser);expect(mine.data).toHaveLength(1);
  expect((await request(`/api/hr/performance/reviews/${mine.data[0].id}/self-submit`,{assessment:'Met field targets and request GIS training'},'COUNTY_OFFICER',checker)).status).toBe(403);
  expect((await request(`/api/hr/performance/reviews/${mine.data[0].id}/self-submit`,{assessment:'Met field targets and request GIS training'},'COUNTY_OFFICER',employeeUser)).status).toBe(200);
  expect((await request(`/api/hr/performance/reviews/${mine.data[0].id}/review`,{rating:4,assessment:'Strong delivery; next period lead one regional mapping exercise'},'HR_DIRECTOR',employeeUser)).status).toBe(403);
  expect((await request(`/api/hr/performance/reviews/${mine.data[0].id}/review`,{rating:4,assessment:'Strong delivery; next period lead one regional mapping exercise'},'HR_DIRECTOR',maker)).status).toBe(200);
  expect((await request(`/api/hr/performance/reviews/${mine.data[0].id}/acknowledge`,{reason:'Reviewed and discussed with manager'},'COUNTY_OFFICER',employeeUser)).status).toBe(200);
  const allReviews=(await request('/api/hr/performance/reviews',undefined,'HR_DIRECTOR')).data.rows;expect(allReviews.find((r:any)=>r.id===mine.data[0].id).status).toBe('ACKNOWLEDGED');
  const noLogin=allReviews.find((r:any)=>!r.employee_user_id);expect(noLogin).toBeTruthy();
  expect((await request(`/api/hr/performance/cycles/${cycle.data.id}/close`,{reason:'Attempted early close'})).status).toBe(409);
  expect((await request(`/api/hr/performance/reviews/${noLogin.id}/capture-self`,{assessment:'Conducted documented review interview; employee discussed objectives'})).status).toBe(200);
  expect((await request(`/api/hr/performance/reviews/${noLogin.id}/review`,{rating:3,assessment:'Meets baseline; plan quarterly coaching'},'HR_DIRECTOR',maker)).status).toBe(403);
  expect((await request(`/api/hr/performance/reviews/${noLogin.id}/review`,{rating:3,assessment:'Meets baseline; plan quarterly coaching'},'HR_DIRECTOR',checker)).status).toBe(200);
  expect((await request(`/api/hr/performance/cycles/${cycle.data.id}/close`,{reason:'All assessments completed and acknowledged'},'HR_DIRECTOR',maker)).status).toBe(200);
 });
 it('records server-time attendance with reviewed corrections and restricts disciplinary cases',async()=>{
  expect((await request('/api/hr/attendance/clock-in',{},'COUNTY_OFFICER',employeeUser)).status).toBe(201);
  expect((await request('/api/hr/attendance/clock-in',{},'COUNTY_OFFICER',employeeUser)).status).toBe(409);
  const mine=await request('/api/hr/attendance/my',undefined,'COUNTY_OFFICER',employeeUser);expect(mine.data.today).toBeTruthy();
  expect((await request('/api/hr/attendance/clock-out',{},'COUNTY_OFFICER',employeeUser)).status).toBe(200);
  expect((await request('/api/hr/attendance/clock-out',{},'COUNTY_OFFICER',employeeUser)).status).toBe(409);
  const rows=await request('/api/hr/attendance',undefined,'HR_DIRECTOR');expect(rows.data.rows).toHaveLength(1);
  const correction=await request(`/api/hr/attendance/${rows.data.rows[0].id}/corrections`,{clockedInAt:'2026-10-18T08:00',clockedOutAt:'2026-10-18T16:00',reason:'Approved signed attendance sheet reference ATT-1'});
  expect(correction.status,correction.data.error).toBe(200);
  expect((await request(`/api/hr/attendance/corrections/${correction.data.id}/decide`,{status:'APPROVED',reason:'Checked against signed attendance sheet'},'HR_DIRECTOR',maker)).status).toBe(403);
  expect((await request(`/api/hr/attendance/corrections/${correction.data.id}/decide`,{status:'APPROVED',reason:'Checked against signed attendance sheet'},'HR_DIRECTOR',checker)).status).toBe(200);
  const c=await request('/api/hr/disciplinary-cases',{employeeId,caseReference:'CASE-TEST-1',allegationSummary:'Restricted procedural summary'});
  expect(c.status,c.data.error).toBe(200);
  expect((await request('/api/hr/disciplinary-cases',undefined,'FINANCE_DIRECTOR')).status).toBe(403);
  expect((await request('/api/hr/disciplinary-cases',undefined,'COUNTY_OFFICER',employeeUser)).status).toBe(403);
  expect((await request(`/api/hr/disciplinary-cases/${c.data.id}/advance`,{status:'OPEN',reason:'Independent case intake check'},'HR_DIRECTOR',checker)).status).toBe(200);
  expect((await request(`/api/hr/disciplinary-cases/${c.data.id}/advance`,{status:'UNDER_REVIEW',reason:'Begin review'},'HR_DIRECTOR',checker)).status).toBe(403);
  expect((await request(`/api/departments/disciplinary_case/${c.data.id}/history`,undefined,'COUNTY_OFFICER',employeeUser)).status).toBe(403);
 });
});
describe('double-entry ledger controls',()=>{
 it('creates accounts and non-overlapping fiscal periods',async()=>{
  expect((await request('/api/finance/accounts',{},'INTERNAL_AUDITOR')).status).toBe(403);
  debitId=(await request('/api/finance/accounts',{code:'100',name:'Cash',accountType:'ASSET'},'FINANCE_DIRECTOR')).data.id;
  creditId=(await request('/api/finance/accounts',{code:'300',name:'Opening capital',accountType:'EQUITY'},'FINANCE_DIRECTOR')).data.id;
  const p=await request('/api/finance/periods',{name:'October 2026',startDate:'2026-10-01',endDate:'2026-10-31'},'FINANCE_DIRECTOR');expect(p.status,p.data.error).toBe(200);periodId=p.data.id;
  expect((await request('/api/finance/periods',{name:'Overlap',startDate:'2026-10-15',endDate:'2026-11-30'},'FINANCE_DIRECTOR')).status).toBe(409);
 });
 it('rejects unbalanced journals without leaving partial records',async()=>{
  const b={orgUnitId:office,reference:'J-1',periodId,entryDate:'2026-10-18',currency:'USD',description:'Opening balances',lines:[{accountId:debitId,debit:'100.01'},{accountId:creditId,credit:'100'}]};
  expect((await request('/api/finance/journals',b,'FINANCE_DIRECTOR')).status).toBe(422);
  expect((await query('SELECT * FROM gl_journals')).rows).toHaveLength(0);
  b.lines[1].credit='100.01';const j=await request('/api/finance/journals',b,'FINANCE_DIRECTOR');expect(j.status,j.data.error).toBe(200);journalId=j.data.id;
  expect((await request('/api/finance/trial-balance',undefined,'INTERNAL_AUDITOR')).data).toHaveLength(0);
 });
 it('requires a different poster and blocks closing with drafts',async()=>{
  expect((await request(`/api/finance/journals/${journalId}/post`,{},'FINANCE_DIRECTOR')).status).toBe(403);
  expect((await request(`/api/finance/periods/${periodId}/close`,{confirm:true,reason:'Reconciled'},'FINANCE_DIRECTOR')).status).toBe(409);
  expect((await request(`/api/finance/journals/${journalId}/post`,{},'MANAGING_DIRECTOR',checker)).status).toBe(200);
  const t=await request('/api/finance/trial-balance',undefined,'INTERNAL_AUDITOR');expect(t.data.map((r:any)=>r.balance_minor)).toEqual(['10001','-10001']);
  expect((await request(`/api/finance/journals/${journalId}/void`,{reason:'No'},'FINANCE_DIRECTOR')).status).toBe(409);
 });
 it('creates a linked reversal and locks closed periods',async()=>{
  const rev=await request(`/api/finance/journals/${journalId}/reverse`,{reference:'REV-1',periodId,entryDate:'2026-10-19',reason:'Correction'},'FINANCE_DIRECTOR');expect(rev.status,rev.data.error).toBe(200);
  expect((await request(`/api/finance/journals/${rev.data.id}/post`,{},'MANAGING_DIRECTOR',checker)).status).toBe(200);
  const t=await request('/api/finance/trial-balance',undefined,'INTERNAL_AUDITOR');expect(t.data.every((r:any)=>r.balance_minor==='0')).toBe(true);
  expect((await request(`/api/finance/periods/${periodId}/close`,{confirm:true,reason:'Reconciled'},'FINANCE_DIRECTOR')).status).toBe(200);
  const j=await request('/api/finance/journals',{orgUnitId:office,reference:'CLOSED',periodId,entryDate:'2026-10-20',currency:'USD',description:'No',lines:[]},'FINANCE_DIRECTOR');expect(j.status).toBe(409);
 });
});
describe('procurement planning integration',()=>{
 it('converts an independently approved plan into exactly one linked draft requisition',async()=>{
  const b={reference:'PLAN-1',budgetAccountId:budgetId,title:'Capital equipment',description:'Equipment requirement',amount:'2000',procurementMethod:'RFQ',spendType:'CAPITAL',targetDate:'2026-11-01'};
  const p=await request('/api/procurement/plans',b,'PROCUREMENT_OFFICER');expect(p.status,p.data.error).toBe(200);planId=p.data.id;
  expect((await request(`/api/procurement/plans/${planId}/requisition`,{},'PROCUREMENT_OFFICER')).status).toBe(409);
  expect((await request(`/api/procurement/plans/${planId}/decide`,{status:'APPROVED',reason:'Approved'},'MANAGING_DIRECTOR')).status).toBe(403);
  expect((await request(`/api/procurement/plans/${planId}/decide`,{status:'APPROVED',reason:'Approved'},'MANAGING_DIRECTOR',checker)).status).toBe(200);
  const r=await request(`/api/procurement/plans/${planId}/requisition`,{},'PROCUREMENT_OFFICER');expect(r.status,r.data.error).toBe(200);
  const saved=(await query('SELECT * FROM requisitions WHERE id=$1',[r.data.id])).rows[0] as any;expect(saved.amount_minor).toBe(200000);expect(saved.status).toBe('DRAFT');expect(saved.budget_account_id).toBe(budgetId);
  expect((await request(`/api/procurement/plans/${planId}/requisition`,{},'PROCUREMENT_OFFICER')).status).toBe(409);
  const budget=(await query('SELECT reserved_minor FROM budget_accounts WHERE id=$1',[budgetId])).rows[0] as any;expect(Number(budget.reserved_minor)).toBe(0);
 });
});
describe('asset custody and controlled office transfers',()=>{
 it('persists opening-register assets and requires custody acceptance',async()=>{
  const a=await request('/api/assets/register',{orgUnitId:office,assetTag:'TEST-A1',description:'Test equipment',category:'Equipment',cost:'2000',currency:'USD',sourceReference:'Opening register reference',location:'Stores'},'ASSET_OFFICER');expect(a.status,a.data.error).toBe(200);assetId=a.data.id;
  expect((await request(`/api/assets/register/${assetId}/assign`,{userId:employeeUser},'ASSET_OFFICER')).status).toBe(200);
  expect((await request(`/api/assets/register/${assetId}/accept-custody`,{accept:true},'COUNTY_OFFICER',checker)).status).toBe(403);
  expect((await request(`/api/assets/register/${assetId}/accept-custody`,{accept:true},'COUNTY_OFFICER',employeeUser)).status).toBe(200);
  expect((await request('/api/assets/my-custody',undefined,'COUNTY_OFFICER',employeeUser)).data).toHaveLength(1);
 });
 it('blocks transfer during maintenance, then requires receiving-office acceptance',async()=>{
  const m=await request(`/api/assets/register/${assetId}/maintenance`,{description:'Service',dueDate:'2026-11-01'},'ASSET_OFFICER');expect(m.status).toBe(200);
  expect((await request(`/api/assets/register/${assetId}/transfer`,{toOrgUnitId:otherOffice,reason:'Regional assignment'},'ASSET_OFFICER')).status).toBe(409);
  expect((await request(`/api/assets/maintenance/${m.data.id}/complete`,{cost:'50',note:'Serviced'},'ASSET_OFFICER')).status).toBe(200);
  const t=await request(`/api/assets/register/${assetId}/transfer`,{toOrgUnitId:otherOffice,reason:'Regional assignment'},'ASSET_OFFICER');expect(t.status,t.data.error).toBe(200);transferId=t.data.id;
  expect((await request(`/api/assets/transfers/${transferId}/decide`,{status:'ACCEPTED',location:'New stores',reason:'Received'},'ASSET_OFFICER',checker)).status).toBe(403);
  const incoming=await request('/api/assets/incoming-transfers',undefined,'ASSET_OFFICER',checker,otherOffice);expect(incoming.data.rows[0].asset_tag).toBe('TEST-A1');
  expect((await request(`/api/assets/transfers/${transferId}/decide`,{status:'ACCEPTED',location:'New stores',reason:'Received'},'ASSET_OFFICER',checker,otherOffice)).status).toBe(200);
  expect((await request('/api/assets/register',undefined,'ASSET_OFFICER')).data.rows).toHaveLength(0);
  expect((await request('/api/assets/my-custody',undefined,'COUNTY_OFFICER',employeeUser)).data).toHaveLength(0);
 });
 it('requires independent disposal approval and preserves immutable audit events',async()=>{
  const d=await request(`/api/assets/register/${assetId}/dispose`,{reason:'Beyond economical repair'},'ASSET_OFFICER',checker,otherOffice);expect(d.status).toBe(200);
  expect((await request(`/api/assets/disposals/${d.data.id}/decide`,{status:'APPROVED',reason:'Reviewed'},'MANAGING_DIRECTOR',checker)).status).toBe(403);
  expect((await request(`/api/assets/disposals/${d.data.id}/decide`,{status:'APPROVED',reason:'Reviewed'},'MANAGING_DIRECTOR')).status).toBe(200);
  expect((await request(`/api/assets/register/${assetId}/update`,{version:4,condition:'GOOD',location:'No'},'ASSET_OFFICER',checker,otherOffice)).status).toBe(409);
  const history=await request(`/api/departments/asset/${assetId}/history`,undefined,'MANAGING_DIRECTOR');expect(history.data.length).toBeGreaterThan(5);
  await expect(query('DELETE FROM audit_events WHERE entity_id=$1',[assetId])).rejects.toThrow('append-only');
 });
});
