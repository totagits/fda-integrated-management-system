import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID, randomBytes, generateKeyPairSync, publicEncrypt, createCipheriv, constants } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { hashPassword } from '../server/security.js';
const database=new PGlite();
const transactionContext=new AsyncLocalStorage<any>();
const query=async(sql:string,p?:unknown[])=>{const r=await (transactionContext.getStore()||database).query(sql,p);return {...r,rowCount:r.rows.length||r.affectedRows};};
vi.mock('../server/db.js',async importOriginal=>{
 const original=await importOriginal<Record<string,unknown>>();return {...original,pool:{query:(s:string,p?:unknown[])=>query(s,p)},transaction:(fn:Function)=>database.transaction(async tx=>transactionContext.run(tx,()=>fn({query:async(s:string,p?:unknown[])=>{const r=await tx.query(s,p);return {...r,rowCount:r.rows.length||r.affectedRows};}})))};
});
const office=randomUUID(),otherOffice=randomUUID(),accounts:Record<string,{id:string;cookie:string;csrf:string}>={};
let server:Server,origin:string,uploads:string;
const oldUrl=process.env.DATABASE_URL,oldUploads=process.env.UPLOADS_DIR;
async function call(role:string,path:string,body?:unknown,csrf=true){const a=accounts[role];const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie:a?.cookie||'',...(csrf?{'x-csrf-token':a?.csrf||''}:{}),...(body instanceof FormData?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
async function ok(role:string,path:string,body?:unknown){const r=await call(role,path,body);expect(r.status,`${path}: ${JSON.stringify(r.data)}`).toBeLessThan(300);return r.data;}
beforeAll(async()=>{
 process.env.DATABASE_URL='postgresql://isolated-test-only';uploads=await mkdtemp(join(tmpdir(),'fda-workflow-'));process.env.UPLOADS_DIR=uploads;
 for(const f of ['001_initial.sql','002_public_portal.sql','003_department_workflows.sql','004_enterprise_workflows.sql','005_statutory_and_sealed.sql','006_hr_recruitment_onboarding.sql'])await database.exec(await readFile(new URL(`../server/migrations/${f}`,import.meta.url),'utf8'));
 await query("INSERT INTO org_units(id,code,name,level) VALUES($1,'HQ-TEST','Isolated headquarters','HEADQUARTERS'),($2,'OTHER-TEST','Other office','COUNTY')",[office,otherOffice]);
 const password=randomBytes(24).toString('base64url'),hash=await hashPassword(password);
 for(const [role,unit] of [['MANAGING_DIRECTOR',office],['FINANCE_DIRECTOR',office],['FINANCE_RECORDER',office],['PROCUREMENT_OFFICER',office],['COUNTY_OFFICER',office],['ASSET_OFFICER',office],['HR_DIRECTOR',otherOffice]]){
  const id=randomUUID();await query('INSERT INTO users(id,email,full_name,password_hash,must_change_password) VALUES($1,$2,$3,$4,false)',[id,`${role.toLowerCase()}@example.test`,role,hash]);
  await query('INSERT INTO user_roles(id,user_id,role,org_unit_id) VALUES($1,$2,$3,$4)',[randomUUID(),id,role==='FINANCE_RECORDER'?'FINANCE_DIRECTOR':role,unit]);accounts[role]={id,cookie:'',csrf:''};
 }
 const {app}=await import('../server/index.js');await new Promise<void>(resolve=>{server=app.listen(0,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${(server.address() as any).port}`;
 for(const role of Object.keys(accounts)){
  const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:`${role.toLowerCase()}@example.test`,password})});expect(r.status).toBe(200);
  const cookies=r.headers.getSetCookie().map(v=>v.split(';')[0]);accounts[role].cookie=cookies.join('; ');accounts[role].csrf=decodeURIComponent(cookies.find(c=>c.startsWith('fda_csrf='))!.split('=')[1]);
 }
},30000);
afterAll(async()=>{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await database.close();await rm(uploads,{recursive:true,force:true});if(oldUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=oldUrl;if(oldUploads===undefined)delete process.env.UPLOADS_DIR;else process.env.UPLOADS_DIR=oldUploads;});
it('completes procurement → qualification → contract → inspection → capital asset → payment → ledger with real sessions',async()=>{
 const md='MANAGING_DIRECTOR',proc='PROCUREMENT_OFFICER',finance='FINANCE_DIRECTOR',asset='ASSET_OFFICER',county='COUNTY_OFFICER';
 expect((await call('HR_DIRECTOR','/api/procurement/contracts')).status).toBe(403);
 expect((await call(proc,'/api/procurement/plans',{},false)).status).toBe(403);
 const budget=await ok(md,'/api/admin/budgets',{orgUnitId:office,fiscalYear:2026,voteCode:'CAP-TEST',title:'Equipment',currency:'USD',allocatedAmount:'5000'});
 const supplier=await ok(proc,'/api/admin/vendors',{legalName:'Isolated test supplier',registrationNo:'TEST-SUP'});
 expect((await call(proc,`/api/procurement/suppliers/${supplier.id}/qualify`,{status:'ACTIVE',taxClearanceExpires:'2099-12-31',ppccRegistrationNo:'TEST-PPCC',reason:'Verified supporting records'})).status).toBe(403);
 await ok(md,`/api/procurement/suppliers/${supplier.id}/qualify`,{status:'ACTIVE',taxClearanceExpires:'2099-12-31',ppccRegistrationNo:'TEST-PPCC',reason:'Verified supporting records'});
 const plan=await ok(proc,'/api/procurement/plans',{reference:'PLAN-E2E',budgetAccountId:budget.id,title:'Capital equipment',description:'Isolated workflow test',amount:'1200',procurementMethod:'RFQ',spendType:'CAPITAL',targetDate:'2026-12-01'});
 await ok(md,`/api/procurement/plans/${plan.id}/decide`,{status:'APPROVED',reason:'Approved requirement'});
 const req=await ok(proc,`/api/procurement/plans/${plan.id}/requisition`,{});
 await ok(proc,`/api/requisitions/${req.id}/submit`,{});
 await ok(md,`/api/requisitions/${req.id}/approve`,{});
 const contract=await ok(proc,'/api/procurement/contracts',{reference:'CONTRACT-E2E',requisitionId:req.id,vendorId:supplier.id,description:'Supply capital equipment',startDate:'2020-01-01',endDate:'2099-12-31'});
 expect((await call(proc,`/api/requisitions/${req.id}/purchase-order`,{vendorId:supplier.id,amount:'1200'})).status).toBe(409);
 await ok(md,`/api/procurement/contracts/${contract.id}/decide`,{status:'APPROVED',reason:'Contract reviewed'});
 const po=await ok(proc,`/api/requisitions/${req.id}/purchase-order`,{vendorId:supplier.id,amount:'1200'});
 const receipt=await ok(county,`/api/purchase-orders/${po.id}/receipt`,{conditionNotes:'Delivered sealed'});
 await ok(asset,`/api/receipts/${receipt.id}/inspect`,{outcome:'ACCEPTED',acceptedAmount:'1200',inspectionNotes:'Inspected and functional',assetCategory:'Equipment'});
 expect((await call(county,`/api/purchase-orders/${po.id}/receipt`,{conditionNotes:'Duplicate delivery'})).status).toBe(409);
 const assets=await ok(asset,'/api/assets/register');expect(assets.rows).toHaveLength(1);expect(assets.rows[0].purchase_order_id).toBe(po.id);
 const invoice=await ok(finance,`/api/purchase-orders/${po.id}/invoice`,{invoiceNo:'SUP-E2E',amount:'1200'});
 expect((await call(finance,`/api/purchase-orders/${po.id}/invoice`,{invoiceNo:'DUPLICATE',amount:'1200'})).status).toBe(409);
 const authorized=await ok(md,`/api/invoices/${invoice.id}/authorize`,{});
 await ok('FINANCE_RECORDER',`/api/payments/${authorized.paymentId||authorized.id}/record`,{paymentReference:'BANK-E2E'});
 await ok(proc,`/api/procurement/contracts/${contract.id}/close`,{reason:'Inspected delivery and payment complete'});
 const period=await ok(finance,'/api/finance/periods',{name:'2026',startDate:'2026-01-01',endDate:'2026-12-31'});
 const cap=await ok(finance,'/api/finance/accounts',{code:'1500',name:'Equipment',accountType:'ASSET'});
 const bank=await ok(finance,'/api/finance/accounts',{code:'1100',name:'Bank',accountType:'ASSET'});
 const queue=await ok(finance,'/api/finance/payment-posting-queue');expect(queue.rows).toHaveLength(1);
 const journal=await ok(finance,`/api/finance/payments/${queue.rows[0].id}/journal`,{reference:'PAY-J-E2E',periodId:period.id,entryDate:'2026-10-18',debitAccountId:cap.id,creditAccountId:bank.id});
 expect((await call(finance,`/api/finance/payments/${queue.rows[0].id}/journal`,{reference:'DUP'})).status).toBe(409);
 await ok(md,`/api/finance/journals/${journal.id}/post`,{});
 const trial=await ok(finance,'/api/finance/trial-balance');expect(trial.reduce((sum:number,r:any)=>sum+Number(r.balance_minor),0)).toBe(0);expect(trial).toHaveLength(2);
 const remaining=await ok(finance,'/api/finance/payment-posting-queue');expect(remaining.rows).toHaveLength(0);
 const balances=await ok(finance,'/api/budgets');expect(Number(balances[0].reserved_minor)).toBe(0);expect(Number(balances[0].spent_minor)).toBe(120000);
 const form=new FormData();form.set('file',new Blob(['Isolated inspection evidence'],{type:'text/plain'}),'inspection.txt');
 const attachment=await ok(proc,`/api/records/REQUISITION/${req.id}/attachments`,form);expect(attachment.byte_size).toBeGreaterThan(0);
 const download=await fetch(origin+`/api/attachments/${attachment.id}`,{headers:{cookie:accounts[proc].cookie}});expect(download.status).toBe(200);expect(await download.text()).toBe('Isolated inspection evidence');
 expect((await call('HR_DIRECTOR',`/api/attachments/${attachment.id}`)).status).toBe(403);
 expect((await fetch(origin+`/api/attachments/${attachment.id}`)).status).toBe(401);
},30000);
it('prepares payroll, prevents self-approval, posts accruals and limits employee statements to their owner',async()=>{
 const md='MANAGING_DIRECTOR',finance='FINANCE_DIRECTOR';
 const policy=await ok(finance,'/api/payroll/policies',{reference:'LIBERIA-RULE-TEST',orgUnitId:office,effectiveFrom:'2026-01-01',effectiveTo:'2099-12-31',bands:'70000,0\n200000,500\nABOVE,1500',employeeRateBps:400,employerRateBps:400,injuryRateBps:200,nonCashExemptionLrd:'0',basis:'Official statutory schedule test fixture'});await ok(md,`/api/payroll/policies/${policy.id}/decide`,{status:'APPROVED',reason:'Independent test policy approval'});
 const p=await ok(md,'/api/hr/positions',{orgUnitId:office,code:'PAY-POS',title:'Payroll test position',grade:'A',capacity:1});
 const employee=await ok(md,'/api/hr/employees',{staffNumber:'PAY-EMP',fullName:'Payroll employee',positionId:p.id,userId:accounts.COUNTY_OFFICER.id,startDate:'2026-01-01'});
 const run=await ok(md,'/api/payroll/runs',{reference:'PAY-2026-10',orgUnitId:office,startDate:'2026-10-01',endDate:'2026-10-31',currency:'USD'});
 expect((await call('COUNTY_OFFICER','/api/payroll/runs')).status).toBe(403);
 expect((await call('HR_DIRECTOR','/api/payroll/runs')).data.rows).toHaveLength(0);
 expect((await call(md,`/api/payroll/runs/${run.id}/line`,{employeeId:employee.id,gross:'1000',deduction:'1000',basis:'Salary approval'})).status).toBe(422);expect((await call(md,`/api/payroll/runs/${run.id}/line`,{employeeId:employee.id,gross:'1000',taxable:'1',pensionable:'1000',lrdPerUnit:'180',basis:'Invalid tax base'})).status).toBe(422);
 await ok(md,`/api/payroll/runs/${run.id}/line`,{employeeId:employee.id,gross:'1000',taxable:'1000',pensionable:'1000',otherDeduction:'100',lrdPerUnit:'180',basis:'Approved salary and deductions schedule'});
 await ok(md,`/api/payroll/runs/${run.id}/submit`,{});
 expect((await call(md,`/api/payroll/runs/${run.id}/decide`,{status:'APPROVED',reason:'Review'})).status).toBe(403);
 await ok(finance,`/api/payroll/runs/${run.id}/decide`,{status:'APPROVED',reason:'Salary schedule reconciled'});
 const period=(await ok(finance,'/api/finance/periods'))[0];
 const expense=await ok(finance,'/api/finance/accounts',{code:'5100',name:'Salaries',accountType:'EXPENSE'}),net=await ok(finance,'/api/finance/accounts',{code:'2100',name:'Salaries payable',accountType:'LIABILITY'}),deduction=await ok(finance,'/api/finance/accounts',{code:'2200',name:'Deductions payable',accountType:'LIABILITY'}),paye=await ok(finance,'/api/finance/accounts',{code:'2210',name:'PAYE payable',accountType:'LIABILITY'}),pension=await ok(finance,'/api/finance/accounts',{code:'2220',name:'Pension payable',accountType:'LIABILITY'}),employerExpense=await ok(finance,'/api/finance/accounts',{code:'5110',name:'Employer pension expense',accountType:'EXPENSE'}),employerLiability=await ok(finance,'/api/finance/accounts',{code:'2230',name:'Employer contributions payable',accountType:'LIABILITY'});
 const j=await ok(finance,`/api/payroll/runs/${run.id}/journal`,{reference:'PAY-J',periodId:period.id,entryDate:'2026-10-31',expenseAccountId:expense.id,payableAccountId:net.id,payeAccountId:paye.id,pensionAccountId:pension.id,otherDeductionAccountId:deduction.id,employerExpenseAccountId:employerExpense.id,employerLiabilityAccountId:employerLiability.id});
 expect((await call(finance,`/api/payroll/runs/${run.id}/journal`,{})).status).toBe(409);
 expect((await ok('COUNTY_OFFICER','/api/payroll/my-payslips'))).toHaveLength(0);
 await ok(md,`/api/finance/journals/${j.id}/post`,{});
 const slips=await ok('COUNTY_OFFICER','/api/payroll/my-payslips');expect(slips).toHaveLength(1);expect(Number(slips[0].net_minor)).toBe(72088);expect(slips[0].status).toBe('ACCRUED_NOT_PAYMENT_CONFIRMATION');
 expect((await ok('ASSET_OFFICER','/api/payroll/my-payslips'))).toHaveLength(0);
 expect((await call(md,'/api/payroll/runs',{reference:'DUP-PAY',orgUnitId:office,startDate:'2026-10-15',endDate:'2026-10-31',currency:'USD'})).status).toBe(409);
},30000);
it('takes an immutable stock snapshot and independently reviews all counted assets',async()=>{
 const run=await ok('COUNTY_OFFICER','/api/stocktakes',{reference:'COUNT-1',orgUnitId:office});
 expect((await call('COUNTY_OFFICER',`/api/stocktakes/${run.id}/submit`,{})).status).toBe(422);
 const lines=await ok('ASSET_OFFICER',`/api/stocktakes/${run.id}/lines`);expect(lines.length).toBeGreaterThan(0);
 for(const l of lines)await ok('COUNTY_OFFICER',`/api/stocktakes/${run.id}/count`,{assetTag:l.asset_tag,result:'PRESENT',location:'HQ stores',condition:'GOOD',note:'Physical tag and equipment checked'});
 await ok('COUNTY_OFFICER',`/api/stocktakes/${run.id}/submit`,{});
 await ok('MANAGING_DIRECTOR',`/api/stocktakes/${run.id}/decide`,{status:'APPROVED',reason:'All counts and discrepancies reviewed'});
 expect((await call('COUNTY_OFFICER',`/api/stocktakes/${run.id}/count`,{assetTag:lines[0].asset_tag,result:'MISSING',note:'Too late'})).status).toBe(409);
 const report=await ok('ASSET_OFFICER',`/api/stocktakes/${run.id}/lines`);expect(report[0].expected_location).not.toBe(report[0].actual_location);
},30000);
it('calculates exact depreciation with independent approval and prevents duplicate months',async()=>{
 const finance='FINANCE_DIRECTOR',md='MANAGING_DIRECTOR',asset=(await ok(finance,'/api/assets/register')).rows[0];
 await ok(finance,`/api/assets/register/${asset.id}/depreciation-policy`,{inServiceDate:'2026-10-01',usefulMonths:12,residual:'0',basis:'Approved full-month straight-line policy'});
 const run=await ok(finance,'/api/depreciation/runs',{reference:'DEP-2026-10',orgUnitId:office,month:'2026-10-01',currency:'USD'});
 const lines=await ok(finance,`/api/depreciation/runs/${run.id}/lines`);expect(Number(lines[0].amount_minor)).toBe(10000);
 expect((await call(finance,`/api/depreciation/runs/${run.id}/decide`,{status:'APPROVED',reason:'Review'})).status).toBe(403);
 await ok(md,`/api/depreciation/runs/${run.id}/decide`,{status:'APPROVED',reason:'Policy and calculation checked'});
 const expense=await ok(finance,'/api/finance/accounts',{code:'5200',name:'Depreciation expense',accountType:'EXPENSE'}),contra=await ok(finance,'/api/finance/accounts',{code:'1590',name:'Accumulated depreciation',accountType:'ASSET'}),period=(await ok(finance,'/api/finance/periods'))[0];
 const j=await ok(finance,`/api/depreciation/runs/${run.id}/journal`,{reference:'DEP-J',periodId:period.id,entryDate:'2026-10-31',expenseAccountId:expense.id,accumulatedAccountId:contra.id});await ok(md,`/api/finance/journals/${j.id}/post`,{});
 expect((await call(finance,'/api/depreciation/runs',{reference:'DEP-DUP',orgUnitId:office,month:'2026-10-01',currency:'USD'})).status).toBe(409);
},30000);
it('reconciles the bank against posted ledger lines and blocks later backdated postings',async()=>{
 const finance='FINANCE_DIRECTOR',md='MANAGING_DIRECTOR',accountsList=await ok(finance,'/api/finance/accounts'),bank=accountsList.find((a:any)=>a.code==='1100'),expense=accountsList.find((a:any)=>a.code==='5100');
 const input={reference:'BANK-ST-1',orgUnitId:office,accountId:bank.id,currency:'USD',startDate:'2026-01-01',endDate:'2026-12-31',opening:'0',closing:'-1200',lines:'2026-10-18, BANK-E2E, -1200'};
 expect((await call(finance,'/api/bank/statements',{...input,closing:'0'})).status).toBe(422);
 const s=await ok(finance,'/api/bank/statements',input);
 expect((await call(md,`/api/bank/statements/${s.id}/reconcile`,{reason:'Review'})).status).toBe(409);
 const statement=await ok(finance,`/api/bank/statements/${s.id}/lines`),candidates=await ok(finance,`/api/bank/statements/${s.id}/candidates`);expect(candidates).toHaveLength(1);
 await ok(finance,`/api/bank/statements/${s.id}/match`,{statementLineId:statement[0].id,journalLineId:candidates[0].id});
 expect((await call(finance,`/api/bank/statements/${s.id}/reconcile`,{reason:'Self approval'})).status).toBe(403);
 await ok(md,`/api/bank/statements/${s.id}/reconcile`,{reason:'Statement and ledger agree'});
 expect((await call(finance,`/api/bank/statements/${s.id}/unmatch`,{statementLineId:statement[0].id})).status).toBe(409);
 const period=(await ok(finance,'/api/finance/periods'))[0];
 const backdated=await ok(finance,'/api/finance/journals',{reference:'BACKDATED',orgUnitId:office,periodId:period.id,entryDate:'2026-11-01',currency:'USD',description:'Backdated entry',lines:[{accountId:expense.id,debit:'1'},{accountId:bank.id,credit:'1'}]});
 expect((await call(md,`/api/finance/journals/${backdated.id}/post`,{})).status).toBe(409);
},30000);
it('requires conflict declarations and complete independent bid scores before recommendation approval',async()=>{
 const proc='PROCUREMENT_OFFICER',finance='FINANCE_DIRECTOR',md='MANAGING_DIRECTOR',notice=randomUUID();
 await query("INSERT INTO public_tender_notices(id,tender_ref,org_unit_id,details,deadline,publication_status,created_by) VALUES($1,'CLOSED-TEST',$2,'{}','2020-01-01','PUBLISHED',$3)",[notice,office,accounts[proc].id]);
 const e=await ok(proc,'/api/evaluations',{reference:'EVAL-1',tenderId:notice,technicalWeight:70,passMark:60,criteria:'Published technical and price criteria; signed opening minutes reference'});
 await ok(proc,`/api/evaluations/${e.id}/panel`,{userId:accounts[proc].id});await ok(proc,`/api/evaluations/${e.id}/panel`,{userId:accounts[finance].id});
 const vendor=(await ok(proc,'/api/vendors'))[0];const bid=await ok(proc,`/api/evaluations/${e.id}/bid`,{vendorId:vendor.id,reference:'OPENED-BID',amount:'1200',currency:'USD',evidenceReference:'Signed bid and opening minutes'});
 expect((await call(proc,`/api/evaluations/${e.id}/score`,{bidId:bid.id,technicalScore:80,responsive:'YES',rationale:'Criteria checked'})).status).toBe(403);
 for(const role of [proc,finance]){
  await ok(role,`/api/evaluations/${e.id}/declare`,{conflict:'NONE',declaration:'No conflict; signed declaration reference'});
  await ok(role,`/api/evaluations/${e.id}/score`,{bidId:bid.id,technicalScore:80,responsive:'YES',rationale:'All mandatory criteria and technical factors assessed'});
 }
 const scores=await ok(proc,`/api/evaluations/${e.id}/results`);expect(scores[0].total_score).toBe(86);
 await ok(proc,`/api/evaluations/${e.id}/submit`,{bidId:bid.id,reason:'Highest-ranked eligible bid'});
 expect((await call(finance,`/api/evaluations/${e.id}/score`,{bidId:bid.id,technicalScore:90,responsive:'YES',rationale:'Too late'})).status).toBe(409);
 await ok(md,`/api/evaluations/${e.id}/decide`,{status:'APPROVED',reason:'Independent evaluation review complete'});
 const integrations=await ok(md,'/api/integrations/diagnostics');expect(integrations.find((r:any)=>r.name==='IFMIS').configured).toBe(false);
},30000);

it('keeps supplier bid packets encrypted until a deadline and two assigned openers, then records sealed evidence',async()=>{
 const proc='PROCUREMENT_OFFICER',finance='FINANCE_DIRECTOR',md='MANAGING_DIRECTOR',vendor=(await ok(proc,'/api/vendors'))[0],tender=randomUUID();
 const deadline=new Date(Date.now()+86400000).toISOString();
 await query("INSERT INTO public_tender_notices(id,tender_ref,org_unit_id,details,deadline,publication_status,created_by) VALUES($1,'SEALED-E2E',$2,$3,$4,'PUBLISHED',$5)",[tender,office,JSON.stringify({title:'Encrypted bid test'}),deadline,accounts[proc].id]);
 const pair=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 expect((await call(proc,'/api/sealed/tenders',{tenderId:tender,reference:'NO-KEY',keyId:'test-key-v1',publicKey:pair.publicKey})).status).toBe(503);process.env.SEALED_BID_PRIVATE_KEYS_JSON=JSON.stringify({'test-key-v1':pair.privateKey});
 const sealed=await ok(proc,'/api/sealed/tenders',{tenderId:tender,reference:'SEALED-E2E-REF',keyId:'test-key-v1',publicKey:pair.publicKey});
 const invitation=await ok(proc,`/api/sealed/tenders/${sealed.id}/invitations`,{vendorId:vendor.id,identityReference:'Supplier identity manually verified for isolated test'});expect(invitation.shownOnce).toBe(true);
 const publicInfo=await fetch(origin+'/api/public/sealed/SEALED-E2E-REF').then(r=>r.json());const aes=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',aes,iv);cipher.setAAD(Buffer.from(tender));
 const plaintext=Buffer.from(JSON.stringify({amount:'1200.00',currency:'USD',technicalResponse:'A sufficiently detailed technical response that describes the proposed delivery method, implementation schedule, staffing, safeguards, quality assurance, service support, and compliance with the published requirements.',files:[{name:'offer.txt',type:'text/plain',data:Buffer.from('Confidential sealed offer supporting document').toString('base64')}]}));
 const enc=Buffer.concat([cipher.update(plaintext),cipher.final()]),tag=cipher.getAuthTag(),wrapped=publicEncrypt({key:publicInfo.publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aes);
 const submit=await fetch(origin+'/api/public/sealed/SEALED-E2E-REF/submissions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:invitation.invitationToken,envelope:{wrappedKey:wrapped.toString('base64'),iv:iv.toString('base64'),tag:tag.toString('base64'),ciphertext:enc.toString('base64')}})}).then(async r=>({status:r.status,data:await r.json()}));expect(submit.status).toBe(201);expect(submit.data.receipt).toMatch(/^FDA-/);
 expect(await query('SELECT envelope->>\'ciphertext\' AS c FROM sealed_submissions')).toBeDefined();
 await query("UPDATE public_tender_notices SET deadline=now()-interval '1 minute' WHERE id=$1",[tender]);await query("UPDATE sealed_tenders SET deadline=now()-interval '1 minute' WHERE id=$1",[tender]);
 const evaluation=await ok(proc,'/api/evaluations',{reference:'SEALED-EVAL-E2E',tenderId:tender,technicalWeight:70,passMark:60,criteria:'Published technical and price criteria and sealed bid opening record'});
 await ok(proc,`/api/sealed/tenders/${sealed.id}/openers`,{userId:accounts[finance].id});await ok(proc,`/api/sealed/tenders/${sealed.id}/openers`,{userId:accounts[md].id});
 expect((await call(md,`/api/sealed/tenders/${sealed.id}/open`,{})).status).toBe(403);
 await ok(finance,`/api/sealed/tenders/${sealed.id}/consent`,{});await ok(md,`/api/sealed/tenders/${sealed.id}/consent`,{});
 await ok(md,`/api/sealed/tenders/${sealed.id}/open`,{});delete process.env.SEALED_BID_PRIVATE_KEYS_JSON;
 const opened=await ok(proc,`/api/evaluations/${evaluation.id}/bids`);expect(opened).toHaveLength(1);expect(Number(opened[0].amount_minor)).toBe(120000);expect(opened[0].technical_response).toContain('quality assurance');
 const attachments=await query("SELECT id,original_name FROM attachments WHERE record_type='EVALUATION' AND record_id=$1",[evaluation.id]);expect(attachments.rowCount||attachments.rows.length).toBeGreaterThan(0);
},30000);
