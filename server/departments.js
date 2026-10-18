import { randomUUID } from 'node:crypto';
import { parseMinorUnits } from './domain.js';
export const DEPARTMENT_ROLES = {
 hr: ['MANAGING_DIRECTOR','HR_DIRECTOR'],
 finance: ['MANAGING_DIRECTOR','FINANCE_DIRECTOR','INTERNAL_AUDITOR'],
 financeWrite: ['MANAGING_DIRECTOR','FINANCE_DIRECTOR'],
 procurement: ['MANAGING_DIRECTOR','FINANCE_DIRECTOR','PROCUREMENT_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR'],
 planWrite: ['PROCUREMENT_OFFICER','COUNTY_OFFICER'],
 planApprove: ['MANAGING_DIRECTOR','FINANCE_DIRECTOR'],
 assets: ['MANAGING_DIRECTOR','FINANCE_DIRECTOR','PROCUREMENT_OFFICER','ASSET_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR'],
 assetWrite: ['MANAGING_DIRECTOR','ASSET_OFFICER','COUNTY_OFFICER'],
};
export const fail=(message,status=422)=>Object.assign(new Error(message),{status,code:status===403?'FORBIDDEN':status===409?'CONFLICT':'INVALID_INPUT'});
export const required=(value,label,max=2000)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw fail(`${label} is required (maximum ${max} characters).`);return value.trim();};
export const idValue=(v)=>{if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))throw fail('Select a valid record.');return v;};
export const dateValue=(v)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw fail('Enter a valid date.');return v;};
const dbDate=v=>v instanceof Date?v.toISOString().slice(0,10):String(v||'').slice(0,10);
const currencyValue=v=>{if(!['USD','LRD'].includes(v))throw fail('Select USD or LRD.');return v;};
const amount=v=>{const n=parseMinorUnits(v);if(n<=0n)throw fail('Amount must be greater than zero.');return n.toString();};
const numeric=(v,min,max)=>{const n=Number(v);if(v===''||!Number.isFinite(n)||n<min||n>max)throw fail(`Enter a number from ${min} to ${max}.`);return n;};
const checker=(req,creator)=>{if(req.auth.userId===creator)throw fail('A different authorized staff member must approve this record.',403);};
export function departmentAuth(auth,allowed){
 const roles=auth.roles.filter(r=>allowed.includes(r.role));
 if(!roles.length)throw fail('You do not have permission for this workspace.',403);
 return {...auth,roles,role:roles[0].role,orgUnitId:roles[0].orgUnitId};
}
export function registerDepartments(app,deps){
 const {pool,transaction,writeAudit,route,loadAuth,csrfRequired,scopedUnits,assertOrgAccess}=deps;
 const guard=allowed=>(req,_res,next)=>{try{req.departmentAuth=departmentAuth(req.auth,allowed);next();}catch(e){next(e);}};
 const audit=(db,req,action,type,id,data={})=>writeAudit(db,req.departmentAuth||req.auth,action,type,id,data);
 const scope=(req,id)=>assertOrgAccess(req.departmentAuth||req.auth,id,req.departmentDb);
 const row=async(db,table,id,lock=true)=>{
  const r=await db.query(`SELECT * FROM ${table} WHERE id=$1${lock?' FOR UPDATE':''}`,[idValue(id)]);
  if(!r.rowCount)throw fail('Record not found.',404);return r.rows[0];
 };
 const office=async(db,req,id)=>{await scope(req,idValue(id));const o=await row(db,'org_units',id,false);if(!o.active)throw fail('This office is inactive.');};
 const get=(path,roles,fn)=>app.get(path,loadAuth,guard(roles),route(fn));
 const post=(path,roles,fn)=>app.post(path,loadAuth,csrfRequired,guard(roles),route(async(req,res)=>res.json(await transaction(db=>{req.departmentDb=db;return fn(db,req);}))));
 const list=async(req,res,table,searchColumns,scopeColumn='org_unit_id',extra='',extraParams=[])=>{
  const units=await scopedUnits(req.departmentAuth), limit=Math.min(100,Math.max(1,Number(req.query.limit)||25)),offset=Math.max(0,Number(req.query.offset)||0);
  if(!Number.isInteger(offset)||offset>1000000)throw fail('Invalid page.');
  const q=String(req.query.q||'').slice(0,200), params=[units,`%${q}%`,...extraParams];
  const where=`(${scopeColumn ? `$1::uuid[] IS NULL OR ${scopeColumn}=ANY($1::uuid[])`:'$1::uuid[] IS NULL OR true'}) AND (${searchColumns.map(c=>`${c}::text ILIKE $2`).join(' OR ')}) ${extra}`;
  const total=await pool.query(`SELECT count(*) FROM ${table} WHERE ${where}`,params);
  const r=await pool.query(`SELECT * FROM ${table} WHERE ${where} ORDER BY id DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,limit,offset]);
  res.json({rows:r.rows,total:Number(total.rows[0].count),limit,offset});
 };
 get('/api/departments/offices',Object.values(DEPARTMENT_ROLES).flat(),async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth);
  res.json((await pool.query('SELECT id,code,name,level FROM org_units WHERE active AND ($1::uuid[] IS NULL OR id=ANY($1::uuid[])) ORDER BY name',[units])).rows);
 });
 get('/api/departments/transfer-destinations',DEPARTMENT_ROLES.assetWrite,async(_req,res)=>res.json((await pool.query('SELECT id,code,name FROM org_units WHERE active ORDER BY name')).rows));
 get('/api/departments/staff', [...DEPARTMENT_ROLES.hr,...DEPARTMENT_ROLES.assetWrite],async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth);
  res.json((await pool.query(`SELECT DISTINCT u.id,u.full_name,u.email FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.disabled_at IS NULL AND ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[])) ORDER BY u.full_name`,[units])).rows);
 });
 get('/api/hr/positions',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_position_directory',['code','title','grade']));
 post('/api/hr/positions',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body;await office(db,req,b.orgUnitId);const capacity=numeric(b.capacity,1,10000);if(!Number.isInteger(capacity))throw fail('Capacity must be a whole number.');
  const id=randomUUID();await db.query('INSERT INTO hr_positions(id,org_unit_id,code,title,grade,capacity) VALUES($1,$2,$3,$4,$5,$6)',[id,b.orgUnitId,required(b.code,'Position code',80),required(b.title,'Title',200),required(b.grade,'Grade',80),capacity]);
  await audit(db,req,'hr.position.created','hr_position',id);return {id};
 });
 get('/api/hr/employees',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_employee_directory',['staff_number','full_name','position_title','office_name','status']));
 async function checkPosition(db,req,positionId,excludeId=null){
  const p=await row(db,'hr_positions',positionId);await office(db,req,p.org_unit_id);
  const count=await db.query("SELECT count(*) FROM hr_employees WHERE position_id=$1 AND status='ACTIVE' AND ($2::uuid IS NULL OR id<>$2)",[p.id,excludeId]);
  if(Number(count.rows[0].count)>=p.capacity)throw fail('This position has reached its approved capacity.',409);return p;
 }
 post('/api/hr/employees',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,p=await checkPosition(db,req,b.positionId),id=randomUUID();
  let userId=null;if(b.userId){const u=await row(db,'users',b.userId,false);if(u.disabled_at)throw fail('Staff account is disabled.');const assignments=await db.query('SELECT 1 FROM user_roles WHERE user_id=$1 AND org_unit_id=$2',[u.id,p.org_unit_id]);if(!assignments.rowCount)throw fail('Link a staff account assigned to the employee office.');userId=u.id;}
  await db.query('INSERT INTO hr_employees(id,staff_number,full_name,email,user_id,org_unit_id,position_id,start_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,required(b.staffNumber,'Staff number',80),required(b.fullName,'Full name',200),String(b.email||'').slice(0,254),userId,p.org_unit_id,p.id,dateValue(b.startDate)]);
  await audit(db,req,'hr.employee.created','employee',id,{positionId:p.id});return {id};
 });
 post('/api/hr/employees/:id/change',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const e=await row(db,'hr_employees',req.params.id);await scope(req,e.org_unit_id);
  if(e.version!==Number(req.body.version))throw fail('Employee changed. Refresh before updating.',409);
  if(e.status!=='ACTIVE')throw fail('This employee record is no longer active.',409);
  const note=required(req.body.reason,'Reason');
  if(req.body.action==='exit'){
   const pending=await db.query("SELECT 1 FROM hr_leave_requests WHERE employee_id=$1 AND status='SUBMITTED'",[e.id]);if(pending.rowCount)throw fail('Resolve pending leave before recording an exit.',409);
   await db.query("UPDATE hr_employees SET status='EXITED',version=version+1 WHERE id=$1",[e.id]);
  }else if(req.body.action==='transfer'){
   const p=await checkPosition(db,req,req.body.positionId,e.id);
   if(p.org_unit_id!==e.org_unit_id){const pending=await db.query("SELECT 1 FROM hr_leave_requests WHERE employee_id=$1 AND status='SUBMITTED'",[e.id]);if(pending.rowCount)throw fail('Resolve pending leave before moving offices.',409);}
   await db.query('UPDATE hr_employees SET org_unit_id=$2,position_id=$3,version=version+1 WHERE id=$1',[e.id,p.org_unit_id,p.id]);
  }else throw fail('Select transfer or exit.');
  await audit(db,req,`hr.employee.${req.body.action}`,'employee',e.id,{reason:note,previousPosition:e.position_id,newPosition:req.body.positionId||null});return {id:e.id};
 });
 post('/api/hr/employees/:id/entitlement',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const e=await row(db,'hr_employees',req.params.id);await scope(req,e.org_unit_id);
  const year=numeric(req.body.year,2000,2200),days=numeric(req.body.days,0,366);if(!Number.isInteger(year)||!Number.isInteger(days*2))throw fail('Use a whole year and half-day increments.');
  const used=await db.query("SELECT coalesce(sum(days),0) AS days FROM hr_leave_requests WHERE employee_id=$1 AND extract(year FROM start_date)=$2 AND status IN ('SUBMITTED','APPROVED')",[e.id,year]);
  if(days<Number(used.rows[0].days))throw fail('Entitlement cannot be less than approved and pending leave.',409);
  await db.query('INSERT INTO hr_leave_entitlements(employee_id,leave_year,days) VALUES($1,$2,$3) ON CONFLICT(employee_id,leave_year) DO UPDATE SET days=EXCLUDED.days',[e.id,year,days]);
  await audit(db,req,'hr.leave.entitlement_set','employee',e.id,{year,days});return {id:e.id};
 });
 get('/api/hr/leave',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_leave_directory',['status','reason','employee_name','staff_number']));
 app.get('/api/hr/self',loadAuth,route(async(req,res)=>{
  const e=await pool.query('SELECT * FROM hr_employees WHERE user_id=$1',[req.auth.userId]);
  if(!e.rowCount)return res.json({employee:null,leave:[],entitlements:[]});
  const [leave,entitlements]=await Promise.all([pool.query('SELECT * FROM hr_leave_requests WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 100',[e.rows[0].id]),pool.query("SELECT t.*,coalesce((SELECT sum(l.days) FROM hr_leave_requests l WHERE l.employee_id=t.employee_id AND extract(year FROM l.start_date)=t.leave_year AND l.status IN ('SUBMITTED','APPROVED')),0) AS committed_days FROM hr_leave_entitlements t WHERE employee_id=$1 ORDER BY leave_year DESC",[e.rows[0].id])]);
  res.json({employee:e.rows[0],leave:leave.rows,entitlements:entitlements.rows});
 }));
 app.post('/api/hr/leave',loadAuth,csrfRequired,route(async(req,res)=>{
  const result=await transaction(async db=>{
   req.departmentDb=db;const b=req.body,e=await row(db,'hr_employees',b.employeeId);if(e.user_id!==req.auth.userId){req.departmentAuth=departmentAuth(req.auth,DEPARTMENT_ROLES.hr);await scope(req,e.org_unit_id);}
   if(e.status!=='ACTIVE')throw fail('Leave requires an active employee.');
   const start=dateValue(b.startDate),end=dateValue(b.endDate),days=numeric(b.days,0.5,366);
   if(start>end||start.slice(0,4)!==end.slice(0,4)||!Number.isInteger(days*2)||days>(Date.parse(end)-Date.parse(start))/86400000+1)throw fail('Use a valid date range in one year and half-day increments within that range.');
   const balance=await db.query('SELECT days FROM hr_leave_entitlements WHERE employee_id=$1 AND leave_year=$2',[e.id,Number(start.slice(0,4))]);
   const used=await db.query("SELECT coalesce(sum(days),0) AS days FROM hr_leave_requests WHERE employee_id=$1 AND extract(year FROM start_date)=$2 AND status IN ('SUBMITTED','APPROVED')",[e.id,Number(start.slice(0,4))]);
   if(!balance.rowCount||Number(used.rows[0].days)+days>Number(balance.rows[0].days))throw fail('Insufficient configured annual leave entitlement.',409);
   const overlap=await db.query("SELECT 1 FROM hr_leave_requests WHERE employee_id=$1 AND status IN ('SUBMITTED','APPROVED') AND start_date<=$3::date AND end_date>=$2::date",[e.id,start,end]);if(overlap.rowCount)throw fail('Leave overlaps an existing request.',409);
   const id=randomUUID();await db.query('INSERT INTO hr_leave_requests(id,employee_id,org_unit_id,start_date,end_date,days,reason,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,e.id,e.org_unit_id,start,end,days,required(b.reason,'Reason'),req.auth.userId]);
   await audit(db,req,'hr.leave.requested','leave',id,{employeeId:e.id,days});return {id};
  });res.status(201).json(result);
 }));
 post('/api/hr/leave/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const l=await row(db,'hr_leave_requests',req.params.id);await scope(req,l.org_unit_id);const e=await row(db,'hr_employees',l.employee_id);
  checker(req,l.requested_by);if(e.user_id===req.auth.userId)throw fail('You cannot approve your own leave.',403);
  if(l.status!=='SUBMITTED')throw fail('Leave has already been decided.',409);
  if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Select approve or reject.');
  await db.query('UPDATE hr_leave_requests SET status=$2,decided_by=$3,decision_note=$4 WHERE id=$1',[l.id,req.body.status,req.auth.userId,required(req.body.reason,'Decision reason')]);
  await audit(db,req,`hr.leave.${req.body.status.toLowerCase()}`,'leave',l.id);return {id:l.id};
 });
 app.post('/api/hr/leave/:id/cancel',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const l=await row(db,'hr_leave_requests',req.params.id),e=await row(db,'hr_employees',l.employee_id);
  if(e.user_id!==req.auth.userId&&l.requested_by!==req.auth.userId)throw fail('Only the employee or requester may cancel pending leave.',403);
  if(l.status!=='SUBMITTED')throw fail('Only pending leave may be cancelled.',409);
  await db.query("UPDATE hr_leave_requests SET status='CANCELLED' WHERE id=$1",[l.id]);await audit(db,req,'hr.leave.cancelled','leave',l.id);return {id:l.id};
 }))));
 get('/api/finance/accounts',DEPARTMENT_ROLES.finance,async(_req,res)=>res.json((await pool.query('SELECT * FROM gl_accounts ORDER BY code')).rows));
 post('/api/finance/accounts',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const b=req.body,id=randomUUID();if(!['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'].includes(b.accountType))throw fail('Select a valid account type.');
  await db.query('INSERT INTO gl_accounts(id,code,name,account_type) VALUES($1,$2,$3,$4)',[id,required(b.code,'Account code',60),required(b.name,'Account name',200),b.accountType]);await audit(db,req,'finance.account.created','gl_account',id);return {id};
 });
 get('/api/finance/periods',DEPARTMENT_ROLES.finance,async(_req,res)=>res.json((await pool.query('SELECT * FROM fiscal_periods ORDER BY start_date DESC')).rows));
 post('/api/finance/periods',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const start=dateValue(req.body.startDate),end=dateValue(req.body.endDate);if(start>end)throw fail('Period end must follow its start.');
  const overlap=await db.query('SELECT 1 FROM fiscal_periods WHERE start_date<=$2::date AND end_date>=$1::date',[start,end]);if(overlap.rowCount)throw fail('Fiscal periods must not overlap.',409);
  const id=randomUUID();await db.query('INSERT INTO fiscal_periods(id,name,start_date,end_date) VALUES($1,$2,$3,$4)',[id,required(req.body.name,'Period name',120),start,end]);await audit(db,req,'finance.period.created','fiscal_period',id);return {id};
 });
 post('/api/finance/periods/:id/close',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const p=await row(db,'fiscal_periods',req.params.id);if(p.status!=='OPEN')throw fail('Period is already closed.',409);
  if(req.body.confirm!==true)throw fail('Confirm that period reconciliation has been completed.');
  const drafts=await db.query("SELECT 1 FROM gl_journals WHERE period_id=$1 AND status='DRAFT'",[p.id]);if(drafts.rowCount)throw fail('Post or void all draft journals before closing.',409);
  await db.query("UPDATE fiscal_periods SET status='CLOSED',closed_by=$2,closed_at=now() WHERE id=$1",[p.id,req.auth.userId]);await audit(db,req,'finance.period.closed','fiscal_period',p.id,{reason:required(req.body.reason,'Closing note')});return {id:p.id};
 });
 get('/api/finance/journals',DEPARTMENT_ROLES.finance,(req,res)=>list(req,res,'gl_journals',['reference','description','status']));
 get('/api/finance/journals/:id/lines',DEPARTMENT_ROLES.finance,async(req,res)=>{
  const j=await row(pool,'gl_journals',req.params.id,false);await scope(req,j.org_unit_id);
  res.json((await pool.query('SELECT l.*,a.code,a.name FROM gl_journal_lines l JOIN gl_accounts a ON a.id=l.account_id WHERE journal_id=$1 ORDER BY a.code',[j.id])).rows);
 });
 async function createJournal(db,req,b,reversesId=null){
  await office(db,req,b.orgUnitId);const p=await row(db,'fiscal_periods',b.periodId),date=dateValue(b.entryDate);
  const inPeriod=await db.query('SELECT 1 FROM fiscal_periods WHERE id=$1 AND $2::date BETWEEN start_date AND end_date',[p.id,date]);
  if(p.status!=='OPEN'||!inPeriod.rowCount)throw fail('Journal date must be in an open fiscal period.',409);
  if(!Array.isArray(b.lines)||b.lines.length<2||b.lines.length>100)throw fail('Provide between 2 and 100 journal lines.');
  let debit=0n,credit=0n;const lines=[];
  for(const line of b.lines){const a=await row(db,'gl_accounts',line.accountId,false);if(!a.active)throw fail('Journal account is inactive.');const d=parseMinorUnits(line.debit||'0'),c=parseMinorUnits(line.credit||'0');if(!((d>0n&&c===0n)||(c>0n&&d===0n)))throw fail('Each line must contain either a debit or a credit.');debit+=d;credit+=c;lines.push({accountId:a.id,debit:d.toString(),credit:c.toString()});}
  if(debit!==credit)throw fail('Journal debits and credits must balance.');
  const id=randomUUID();await db.query('INSERT INTO gl_journals(id,reference,org_unit_id,period_id,entry_date,currency,description,created_by,reverses_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,required(b.reference,'Reference',100),b.orgUnitId,p.id,date,currencyValue(b.currency),required(b.description,'Description'),req.auth.userId,reversesId]);
  for(const l of lines)await db.query('INSERT INTO gl_journal_lines(id,journal_id,account_id,debit_minor,credit_minor) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,l.accountId,l.debit,l.credit]);
  await audit(db,req,'finance.journal.created','journal',id,{debit:debit.toString(),currency:b.currency,reversesId});return {id};
 }
 post('/api/finance/journals',DEPARTMENT_ROLES.financeWrite,(db,req)=>createJournal(db,req,req.body));
 post('/api/finance/journals/:id/post',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const j=await row(db,'gl_journals',req.params.id);await scope(req,j.org_unit_id);checker(req,j.created_by);const p=await row(db,'fiscal_periods',j.period_id);
  if(j.status!=='DRAFT'||p.status!=='OPEN')throw fail('Only a draft in an open period can be posted.',409);
  const totals=await db.query('SELECT count(*) AS lines,sum(debit_minor) AS debit,sum(credit_minor) AS credit FROM gl_journal_lines WHERE journal_id=$1',[j.id]);
  if(Number(totals.rows[0].lines)<2||BigInt(totals.rows[0].debit)!==BigInt(totals.rows[0].credit))throw fail('Journal is not balanced.',409);
  const reconciled=await db.query("SELECT 1 FROM gl_journal_lines l JOIN bank_statements b ON b.account_id=l.account_id WHERE l.journal_id=$1 AND b.org_unit_id=$2 AND b.currency=$3 AND b.status='RECONCILED' AND $4::date<=b.end_date",[j.id,j.org_unit_id,j.currency,j.entry_date]);if(reconciled.rowCount)throw fail('Posting would alter an already reconciled bank balance. Use a later open period.',409);
  await db.query("UPDATE gl_journals SET status='POSTED',posted_by=$2,posted_at=now() WHERE id=$1",[j.id,req.auth.userId]);await audit(db,req,'finance.journal.posted','journal',j.id);return {id:j.id};
 });
 post('/api/finance/journals/:id/void',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const j=await row(db,'gl_journals',req.params.id);await scope(req,j.org_unit_id);if(j.status!=='DRAFT')throw fail('Posted journals must be reversed, not voided.',409);
  await db.query("UPDATE gl_journals SET status='VOID' WHERE id=$1",[j.id]);await audit(db,req,'finance.journal.voided','journal',j.id,{reason:required(req.body.reason,'Reason')});return {id:j.id};
 });
 post('/api/finance/journals/:id/reverse',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const j=await row(db,'gl_journals',req.params.id);await scope(req,j.org_unit_id);if(j.status!=='POSTED'||j.reverses_id)throw fail('Select an original posted journal.',409);
  const prior=await db.query('SELECT id FROM gl_journals WHERE reverses_id=$1',[j.id]);if(prior.rowCount)throw fail('A reversal already exists for this journal.',409);
  const lines=(await db.query('SELECT * FROM gl_journal_lines WHERE journal_id=$1',[j.id])).rows;
  const decimal=v=>`${BigInt(v)/100n}.${String(BigInt(v)%100n).padStart(2,'0')}`;
  return createJournal(db,req,{...req.body,orgUnitId:j.org_unit_id,currency:j.currency,description:`Reversal of ${j.reference}: ${required(req.body.reason,'Reason')}`,lines:lines.map(l=>({accountId:l.account_id,debit:decimal(l.credit_minor),credit:decimal(l.debit_minor)}))},j.id);
 });
 get('/api/finance/trial-balance',DEPARTMENT_ROLES.finance,async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth),period=req.query.periodId?idValue(req.query.periodId):null;
  res.json((await pool.query(`SELECT a.code,a.name,a.account_type,j.currency,sum(l.debit_minor)::text AS debit_minor,sum(l.credit_minor)::text AS credit_minor,(sum(l.debit_minor)-sum(l.credit_minor))::text AS balance_minor FROM gl_journal_lines l JOIN gl_accounts a ON a.id=l.account_id JOIN gl_journals j ON j.id=l.journal_id WHERE j.status='POSTED' AND ($1::uuid[] IS NULL OR j.org_unit_id=ANY($1::uuid[])) AND ($2::uuid IS NULL OR j.period_id=$2) GROUP BY a.code,a.name,a.account_type,j.currency ORDER BY j.currency,a.code`,[units,period])).rows);
 });
 get('/api/procurement/plans',DEPARTMENT_ROLES.procurement,(req,res)=>list(req,res,'procurement_plans',['reference','title','status']));
 post('/api/procurement/plans',DEPARTMENT_ROLES.planWrite,async(db,req)=>{
  const b=req.body,budget=await row(db,'budget_accounts',b.budgetAccountId);await scope(req,budget.org_unit_id);
  const estimate=amount(b.amount);if(BigInt(estimate)>BigInt(budget.allocated_minor))throw fail('Plan estimate exceeds the annual budget allocation.');
  if(!['RFQ','NATIONAL_COMPETITIVE_BIDDING','INTERNATIONAL_COMPETITIVE_BIDDING','SINGLE_SOURCE','FRAMEWORK'].includes(b.procurementMethod)||!['GOODS','CAPITAL','SERVICES'].includes(b.spendType))throw fail('Select a valid procurement method and spend type.');
  const date=dateValue(b.targetDate);if(Number(date.slice(0,4))!==budget.fiscal_year)throw fail('Target date must fall in the budget fiscal year.');
  const id=randomUUID();await db.query('INSERT INTO procurement_plans(id,reference,org_unit_id,budget_account_id,title,description,estimated_minor,currency,procurement_method,spend_type,target_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[id,required(b.reference,'Plan reference',100),budget.org_unit_id,budget.id,required(b.title,'Title',240),required(b.description,'Description'),estimate,budget.currency,b.procurementMethod,b.spendType,date,req.auth.userId]);
  await audit(db,req,'procurement.plan.submitted','procurement_plan',id);return {id};
 });
 post('/api/procurement/plans/:id/decide',DEPARTMENT_ROLES.planApprove,async(db,req)=>{
  const p=await row(db,'procurement_plans',req.params.id);await scope(req,p.org_unit_id);checker(req,p.created_by);
  if(p.status!=='SUBMITTED')throw fail('Plan has already been decided.',409);if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Choose approve or reject.');
  await db.query('UPDATE procurement_plans SET status=$2,decided_by=$3,decision_note=$4 WHERE id=$1',[p.id,req.body.status,req.auth.userId,required(req.body.reason,'Decision reason')]);await audit(db,req,`procurement.plan.${req.body.status.toLowerCase()}`,'procurement_plan',p.id);return {id:p.id};
 });
 post('/api/procurement/plans/:id/requisition',DEPARTMENT_ROLES.planWrite,async(db,req)=>{
  const p=await row(db,'procurement_plans',req.params.id);await scope(req,p.org_unit_id);if(p.status!=='APPROVED')throw fail('Only an approved, unconverted plan can create a requisition.',409);
  const id=randomUUID();await db.query('INSERT INTO requisitions(id,requisition_no,requester_id,org_unit_id,budget_account_id,title,description,procurement_method,spend_type,currency,amount_minor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,`REQ-${id.slice(0,8).toUpperCase()}`,req.auth.userId,p.org_unit_id,p.budget_account_id,p.title,p.description,p.procurement_method,p.spend_type,p.currency,p.estimated_minor]);
  await db.query("UPDATE procurement_plans SET status='REQUISITIONED',requisition_id=$2 WHERE id=$1",[p.id,id]);await audit(db,req,'procurement.plan.requisitioned','procurement_plan',p.id,{requisitionId:id});await audit(db,req,'requisition.created_from_plan','requisition',id,{planId:p.id});return {id,requisitionId:id};
 });
 get('/api/finance/payment-posting-queue',DEPARTMENT_ROLES.finance,(req,res)=>list(req,res,'finance_payment_posting_queue',['payment_ref','title','vendor_name']));
 post('/api/finance/payments/:id/journal',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const p=await row(db,'payments',req.params.id);
  const source=await db.query('SELECT * FROM finance_payment_posting_queue WHERE id=$1',[p.id]);if(!source.rowCount)throw fail('Payment is not paid or already has a journal.',409);
  const payment=source.rows[0];await scope(req,payment.org_unit_id);
  const debit=await row(db,'gl_accounts',req.body.debitAccountId,false),credit=await row(db,'gl_accounts',req.body.creditAccountId,false);
  if(debit.account_type!==(payment.spend_type==='CAPITAL'?'ASSET':'EXPENSE')||credit.account_type!=='ASSET'||debit.id===credit.id)throw fail('Use a capital asset or expense debit as appropriate and a separate bank/cash asset credit.');
  const decimal=`${BigInt(p.amount_minor)/100n}.${String(BigInt(p.amount_minor)%100n).padStart(2,'0')}`;
  const created=await createJournal(db,req,{...req.body,orgUnitId:payment.org_unit_id,currency:p.currency,description:`Payment ${p.payment_ref} · ${payment.title}`,lines:[{accountId:debit.id,debit:decimal},{accountId:credit.id,credit:decimal}]});
  // Retain old void journals while allowing a replacement to link to the payment.
  await db.query("UPDATE gl_journals SET source_payment_id=NULL WHERE source_payment_id=$1 AND status='VOID'",[p.id]);
  await db.query('UPDATE gl_journals SET source_payment_id=$2 WHERE id=$1',[created.id,p.id]);
  await audit(db,req,'finance.payment_journal_linked','journal',created.id,{paymentId:p.id});return created;
 });
 get('/api/procurement/suppliers',DEPARTMENT_ROLES.procurement,async(_req,res)=>res.json((await pool.query('SELECT id,legal_name,registration_no,tax_clearance_expires,ppcc_registration_no,status,created_by,qualified_by,qualification_note FROM vendors ORDER BY legal_name')).rows));
 post('/api/procurement/suppliers/:id/qualify',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(db,req)=>{
  const v=await row(db,'vendors',req.params.id),b=req.body;
  if(!['ACTIVE','SUSPENDED','INACTIVE'].includes(b.status))throw fail('Choose a valid supplier status.');
  let expiry=null,ppcc=v.ppcc_registration_no;
  if(b.status==='ACTIVE'){
   checker(req,v.created_by);expiry=dateValue(b.taxClearanceExpires);ppcc=required(b.ppccRegistrationNo,'PPCC registration',100);
   const valid=await db.query('SELECT $1::date>=current_date AS valid',[expiry]);if(!valid.rows[0].valid)throw fail('Tax clearance has expired.');
  }
  const note=required(b.reason,'Qualification decision and evidence reference');
  await db.query('UPDATE vendors SET status=$2,tax_clearance_expires=coalesce($3::date,tax_clearance_expires),ppcc_registration_no=$4,qualified_by=$5,qualification_note=$6 WHERE id=$1',[v.id,b.status,expiry,ppcc,req.auth.userId,note]);
  await audit(db,req,'procurement.vendor_qualified','vendor',v.id,{status:b.status,evidenceReference:note});return {id:v.id};
 });
 get('/api/procurement/contracts',DEPARTMENT_ROLES.procurement,(req,res)=>list(req,res,'procurement_contract_directory',['reference','requisition_no','vendor_name','status']));
 post('/api/procurement/contracts',['PROCUREMENT_OFFICER'],async(db,req)=>{
  const b=req.body,r=await row(db,'requisitions',b.requisitionId);await scope(req,r.org_unit_id);
  if(r.status!=='APPROVED')throw fail('Select an approved requisition before issuing its purchase order.',409);
  const v=await row(db,'vendors',b.vendorId,false);if(v.status!=='ACTIVE')throw fail('Select an active qualified supplier.');
  const start=dateValue(b.startDate),end=dateValue(b.endDate);if(start>end)throw fail('Contract end must follow its start.');
  const id=randomUUID();await db.query('INSERT INTO procurement_contracts(id,reference,requisition_id,org_unit_id,vendor_id,description,amount_minor,currency,start_date,end_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,required(b.reference,'Contract reference',100),r.id,r.org_unit_id,v.id,required(b.description,'Contract scope and obligations'),r.amount_minor,r.currency,start,end,req.auth.userId]);
  await audit(db,req,'procurement.contract.submitted','procurement_contract',id,{requisitionId:r.id});return {id};
 });
 post('/api/procurement/contracts/:id/decide',DEPARTMENT_ROLES.planApprove,async(db,req)=>{
  const c=await row(db,'procurement_contracts',req.params.id);await scope(req,c.org_unit_id);checker(req,c.created_by);
  if(c.status!=='SUBMITTED')throw fail('Contract has already been decided.',409);if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Choose approve or reject.');
  const r=await row(db,'requisitions',c.requisition_id);if(r.status!=='APPROVED')throw fail('Requisition is no longer awaiting purchase order issuance.',409);
  await db.query('UPDATE procurement_contracts SET status=$2,decided_by=$3,decision_note=$4 WHERE id=$1',[c.id,req.body.status,req.auth.userId,required(req.body.reason,'Decision reason')]);await audit(db,req,`procurement.contract.${req.body.status.toLowerCase()}`,'procurement_contract',c.id);return {id:c.id};
 });
 post('/api/procurement/contracts/:id/close',['PROCUREMENT_OFFICER'],async(db,req)=>{
  const c=await row(db,'procurement_contracts',req.params.id);await scope(req,c.org_unit_id);if(c.status!=='APPROVED')throw fail('Only an approved contract can close.',409);
  const r=await row(db,'requisitions',c.requisition_id);if(r.status!=='COMPLETE')throw fail('Complete delivery and payment before closing this contract.',409);
  await db.query("UPDATE procurement_contracts SET status='CLOSED' WHERE id=$1",[c.id]);await audit(db,req,'procurement.contract.closed','procurement_contract',c.id,{reason:required(req.body.reason,'Completion note')});return {id:c.id};
 });
 get('/api/assets/register',DEPARTMENT_ROLES.assets,(req,res)=>list(req,res,'assets',['asset_tag','description','lifecycle_status','location']));
 post('/api/assets/register',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const b=req.body;await office(db,req,b.orgUnitId);const id=randomUUID();
  await db.query('INSERT INTO assets(id,asset_tag,description,category,purchase_cost_minor,currency,org_unit_id,source_reference,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,required(b.assetTag,'Asset tag',100),required(b.description,'Description'),required(b.category,'Category',100),amount(b.cost),currencyValue(b.currency),b.orgUnitId,required(b.sourceReference,'Acquisition / opening-register evidence reference',240),required(b.location,'Location',240)]);
  await audit(db,req,'asset.registered','asset',id,{sourceReference:b.sourceReference});return {id};
 });
 const activeAsset=async(db,req,id)=>{const a=await row(db,'assets',id);await scope(req,a.org_unit_id);if(a.lifecycle_status!=='ACTIVE')throw fail('Disposed assets cannot be changed.',409);return a;};
 const noPending=async(db,id)=>{const p=await db.query("SELECT id FROM asset_transfers WHERE asset_id=$1 AND status='PENDING' UNION ALL SELECT id FROM asset_disposals WHERE asset_id=$1 AND status='SUBMITTED'",[id]);if(p.rowCount)throw fail('Resolve the pending transfer or disposal first.',409);};
 post('/api/assets/register/:id/update',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const a=await activeAsset(db,req,req.params.id);if(a.version!==Number(req.body.version))throw fail('Asset changed. Refresh before updating.',409);
  if(!['GOOD','FAIR','POOR','UNSERVICEABLE'].includes(req.body.condition))throw fail('Select an asset condition.');
  await db.query('UPDATE assets SET condition=$2,location=$3,version=version+1 WHERE id=$1',[a.id,req.body.condition,required(req.body.location,'Location',240)]);await audit(db,req,'asset.condition_updated','asset',a.id,{condition:req.body.condition,location:req.body.location});return {id:a.id};
 });
 post('/api/assets/register/:id/assign',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const a=await activeAsset(db,req,req.params.id);await noPending(db,a.id);
  if(a.proposed_custodian_id)throw fail('A custody acceptance is already pending.',409);
  const u=await row(db,'users',req.body.userId,false),r=await db.query('SELECT 1 FROM user_roles WHERE user_id=$1 AND org_unit_id=$2',[u.id,a.org_unit_id]);
  if(u.disabled_at||!r.rowCount)throw fail('Custodian must have an active account assigned to the asset office.');
  await db.query('UPDATE assets SET proposed_custodian_id=$2,version=version+1 WHERE id=$1',[a.id,u.id]);await audit(db,req,'asset.custody_proposed','asset',a.id,{userId:u.id});return {id:a.id};
 });
 app.get('/api/assets/my-custody',loadAuth,route(async(req,res)=>res.json((await pool.query("SELECT id,asset_tag,description,location,condition,custodian_user_id,proposed_custodian_id FROM assets WHERE lifecycle_status='ACTIVE' AND (custodian_user_id=$1 OR proposed_custodian_id=$1) ORDER BY asset_tag",[req.auth.userId])).rows)));
 app.post('/api/assets/register/:id/accept-custody',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const a=await row(db,'assets',req.params.id);if(a.proposed_custodian_id!==req.auth.userId||a.lifecycle_status!=='ACTIVE')throw fail('You are not the proposed custodian of an active asset.',403);
  if(req.body.accept!==true&&req.body.accept!==false)throw fail('Accept or decline custody.');
  if(req.body.accept)await db.query('UPDATE assets SET custodian_user_id=$2,custodian=$3,proposed_custodian_id=NULL,version=version+1 WHERE id=$1',[a.id,req.auth.userId,req.auth.fullName]);
  else await db.query('UPDATE assets SET proposed_custodian_id=NULL,version=version+1 WHERE id=$1',[a.id]);
  await audit(db,req,req.body.accept?'asset.custody_accepted':'asset.custody_declined','asset',a.id);return {id:a.id};
 }))));
 get('/api/assets/transfers',DEPARTMENT_ROLES.assets,(req,res)=>list(req,res,'asset_transfer_directory',['status','reason','asset_tag','source_office','destination_office'],'from_org_unit_id')); // Receiving queue has its own scope.
 get('/api/assets/incoming-transfers',DEPARTMENT_ROLES.assetWrite,(req,res)=>list(req,res,'asset_transfer_directory',['status','reason','asset_tag','source_office','destination_office'],'to_org_unit_id',"AND status='PENDING'"));
 post('/api/assets/register/:id/transfer',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const a=await activeAsset(db,req,req.params.id);await noPending(db,a.id);if(a.proposed_custodian_id)throw fail('Resolve custody acceptance before transfer.',409);
  const work=await db.query("SELECT 1 FROM asset_maintenance WHERE asset_id=$1 AND status='OPEN'",[a.id]);if(work.rowCount)throw fail('Complete maintenance before transferring this asset.',409);
  const to=await row(db,'org_units',req.body.toOrgUnitId,false);if(!to.active||to.id===a.org_unit_id)throw fail('Choose a different active destination office.');
  const id=randomUUID();await db.query('INSERT INTO asset_transfers(id,asset_id,from_org_unit_id,to_org_unit_id,requested_by,reason) VALUES($1,$2,$3,$4,$5,$6)',[id,a.id,a.org_unit_id,to.id,req.auth.userId,required(req.body.reason,'Transfer reason')]);await audit(db,req,'asset.transfer_requested','asset',a.id,{transferId:id,toOrgUnitId:to.id});return {id};
 });
 post('/api/assets/transfers/:id/decide',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const t=await row(db,'asset_transfers',req.params.id);await scope(req,t.to_org_unit_id);checker(req,t.requested_by);
  const a=await row(db,'assets',t.asset_id);if(t.status!=='PENDING'||a.org_unit_id!==t.from_org_unit_id||a.lifecycle_status!=='ACTIVE')throw fail('Transfer is no longer pending.',409);
  if(!['ACCEPTED','REJECTED'].includes(req.body.status))throw fail('Select accept or reject.');
  const note=required(req.body.reason,'Receiving note');
  if(req.body.status==='ACCEPTED')await db.query('UPDATE assets SET org_unit_id=$2,location=$3,custodian=NULL,custodian_user_id=NULL,proposed_custodian_id=NULL,version=version+1 WHERE id=$1',[a.id,t.to_org_unit_id,required(req.body.location,'Receiving location',240)]);
  await db.query('UPDATE asset_transfers SET status=$2,accepted_by=$3 WHERE id=$1',[t.id,req.body.status,req.auth.userId]);await audit(db,req,`asset.transfer_${req.body.status.toLowerCase()}`,'asset',a.id,{transferId:t.id,fromOffice:t.from_org_unit_id,toOffice:t.to_org_unit_id,note});return {id:t.id};
 });
 get('/api/assets/maintenance',DEPARTMENT_ROLES.assets,(req,res)=>list(req,res,'asset_maintenance_directory',['description','status','asset_tag']));
 post('/api/assets/register/:id/maintenance',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const a=await activeAsset(db,req,req.params.id);await noPending(db,a.id);const id=randomUUID();
  await db.query('INSERT INTO asset_maintenance(id,asset_id,org_unit_id,description,due_date) VALUES($1,$2,$3,$4,$5)',[id,a.id,a.org_unit_id,required(req.body.description,'Work description'),dateValue(req.body.dueDate)]);await audit(db,req,'asset.maintenance_scheduled','asset',a.id,{maintenanceId:id});return {id};
 });
 post('/api/assets/maintenance/:id/complete',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const m=await row(db,'asset_maintenance',req.params.id);await scope(req,m.org_unit_id);if(m.status!=='OPEN')throw fail('Maintenance is already complete.',409);
  const cost=parseMinorUnits(req.body.cost||'0').toString();await db.query("UPDATE asset_maintenance SET status='COMPLETE',cost_minor=$2,completion_note=$3,completed_at=now() WHERE id=$1",[m.id,cost,required(req.body.note,'Completion note')]);await audit(db,req,'asset.maintenance_completed','asset',m.asset_id,{maintenanceId:m.id,cost});return {id:m.id};
 });
 get('/api/assets/disposals',DEPARTMENT_ROLES.assets,(req,res)=>list(req,res,'asset_disposal_directory',['reason','status','asset_tag']));
 post('/api/assets/register/:id/dispose',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const a=await activeAsset(db,req,req.params.id);await noPending(db,a.id);
  if(a.proposed_custodian_id)throw fail('Resolve custody acceptance before disposal.',409);
  const work=await db.query("SELECT 1 FROM asset_maintenance WHERE asset_id=$1 AND status='OPEN'",[a.id]);if(work.rowCount)throw fail('Complete open maintenance before disposal.',409);
  const id=randomUUID();await db.query('INSERT INTO asset_disposals(id,asset_id,org_unit_id,reason,requested_by) VALUES($1,$2,$3,$4,$5)',[id,a.id,a.org_unit_id,required(req.body.reason,'Disposal justification'),req.auth.userId]);await audit(db,req,'asset.disposal_requested','asset',a.id,{disposalId:id});return {id};
 });
 post('/api/assets/disposals/:id/decide',['MANAGING_DIRECTOR'],async(db,req)=>{
  const d=await row(db,'asset_disposals',req.params.id);await scope(req,d.org_unit_id);checker(req,d.requested_by);const a=await row(db,'assets',d.asset_id);
  if(d.status!=='SUBMITTED'||a.lifecycle_status!=='ACTIVE')throw fail('Disposal is not pending.',409);if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Select approve or reject.');
  if(req.body.status==='APPROVED')await db.query("UPDATE assets SET lifecycle_status='DISPOSED',custodian_user_id=NULL,custodian=NULL,proposed_custodian_id=NULL,version=version+1 WHERE id=$1",[a.id]);
  await db.query('UPDATE asset_disposals SET status=$2,decided_by=$3,decision_note=$4 WHERE id=$1',[d.id,req.body.status,req.auth.userId,required(req.body.reason,'Decision note')]);await audit(db,req,`asset.disposal_${req.body.status.toLowerCase()}`,'asset',a.id,{disposalId:d.id});return {id:d.id};
 });

 // Recruitment intake and onboarding are backed by the same personnel register,
 // office scope controls and append-only audit chain as the other HR records.
 get('/api/hr/vacancies',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_vacancy_directory',['reference','title','description','position_code','office_name']));
 post('/api/hr/vacancies',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,p=await row(db,'hr_positions',b.positionId);await office(db,req,p.org_unit_id);
  const opens=dateValue(b.opensOn),closes=dateValue(b.closesOn);if(closes<opens)throw fail('Closing date must be on or after the opening date.');
  const active=await db.query("SELECT count(*)::integer AS count FROM hr_employees WHERE position_id=$1 AND status='ACTIVE'",[p.id]);
  if(Number(active.rows[0].count)>=p.capacity)throw fail('A vacancy cannot be opened for a position at its approved capacity.',409);
  const id=randomUUID();await db.query('INSERT INTO hr_vacancies(id,reference,org_unit_id,position_id,title,description,opens_on,closes_on,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,required(b.reference,'Vacancy reference',100),p.org_unit_id,p.id,required(b.title,'Published title',200),required(b.description,'Role description and selection criteria'),opens,closes,req.auth.userId]);
  await audit(db,req,'hr.vacancy.created','vacancy',id,{positionId:p.id,opensOn:opens,closesOn:closes});return {id};
 });
 post('/api/hr/vacancies/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const v=await row(db,'hr_vacancies',req.params.id);await scope(req,v.org_unit_id);
  if(v.status!=='DRAFT')throw fail('Only draft vacancies can be independently published or cancelled.',409);
  if(!['PUBLISHED','CANCELLED'].includes(req.body.status))throw fail('Select publish or cancel.');
  if(req.body.status==='PUBLISHED'){
   checker(req,v.created_by);
   const today=new Date().toISOString().slice(0,10);if(dbDate(v.closes_on)<today)throw fail('The application closing date has passed.',409);
   const p=await row(db,'hr_positions',v.position_id);const filled=await db.query("SELECT count(*)::integer AS count FROM hr_employees WHERE position_id=$1 AND status='ACTIVE'",[p.id]);
   if(Number(filled.rows[0].count)>=p.capacity)throw fail('Position capacity was filled before publication.',409);
  }
  await db.query('UPDATE hr_vacancies SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[v.id,req.body.status,req.auth.userId,required(req.body.reason,'Independent HR publication decision')]);
  await audit(db,req,`hr.vacancy.${req.body.status.toLowerCase()}`,'vacancy',v.id);return {id:v.id};
 });
 get('/api/hr/applications',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_application_directory',['reference','applicant_name','email','contact','vacancy_reference','vacancy_title','status']));
 post('/api/hr/applications',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,v=await row(db,'hr_vacancies',b.vacancyId);await scope(req,v.org_unit_id);
  if(v.status!=='PUBLISHED')throw fail('Applications can only be registered against a published vacancy.',409);
  const today=new Date().toISOString().slice(0,10);if(today<dbDate(v.opens_on)||today>dbDate(v.closes_on))throw fail('Application intake is outside the published dates.',409);
  const email=required(b.email,'Applicant email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('Enter a valid applicant email.');
  const id=randomUUID();await db.query('INSERT INTO hr_applications(id,vacancy_id,reference,applicant_name,email,contact,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,v.id,required(b.reference,'Application reference',100),required(b.applicantName,'Applicant full name',200),email,String(b.contact||'').trim().slice(0,120),req.auth.userId]);
  await audit(db,req,'hr.application.received','application',id,{vacancyId:v.id});return {id};
 });
 post('/api/hr/applications/:id/advance',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const a=await row(db,'hr_applications',req.params.id);const v=await row(db,'hr_vacancies',a.vacancy_id);await scope(req,v.org_unit_id);
  if(['HIRED','REJECTED','WITHDRAWN'].includes(a.status))throw fail('This application is closed.',409);
  const allowed={RECEIVED:['SCREENING','REJECTED','WITHDRAWN'],SCREENING:['INTERVIEW','REJECTED','WITHDRAWN'],INTERVIEW:['RECOMMENDED','REJECTED','WITHDRAWN'],RECOMMENDED:['OFFERED','REJECTED','WITHDRAWN'],OFFERED:['REJECTED','WITHDRAWN']};
  const next=req.body.status;if(!allowed[a.status]?.includes(next))throw fail('The requested application stage is not a valid next step.',409);
  const note=required(req.body.reason,'Stage decision / evidence reference');
  await db.query('UPDATE hr_applications SET status=$2,decision_note=$3,updated_by=$4,updated_at=now() WHERE id=$1',[a.id,next,note,req.auth.userId]);
  await audit(db,req,`hr.application.${next.toLowerCase()}`,'application',a.id,{from:a.status,to:next,decisionNote:note});return {id:a.id};
 });
 post('/api/hr/applications/:id/hire',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const a=await row(db,'hr_applications',req.params.id);const v=await row(db,'hr_vacancies',a.vacancy_id);await scope(req,v.org_unit_id);
  if(a.status!=='OFFERED')throw fail('A candidate must have an issued offer before hiring.',409);
  checker(req,a.updated_by||a.created_by);
  if(v.status!=='PUBLISHED')throw fail('The vacancy must remain active through appointment.',409);
  const p=await checkPosition(db,req,v.position_id);let userId=null;
  if(req.body.userId){const u=await row(db,'users',req.body.userId,false);if(u.disabled_at)throw fail('Staff account is disabled.');const assignments=await db.query('SELECT 1 FROM user_roles WHERE user_id=$1 AND org_unit_id=$2',[u.id,v.org_unit_id]);if(!assignments.rowCount)throw fail('The linked staff account must be assigned to the employee office.');const already=await db.query('SELECT 1 FROM hr_employees WHERE user_id=$1',[u.id]);if(already.rowCount)throw fail('This login is already linked to an employee record.',409);userId=u.id;}
  const employeeId=randomUUID();await db.query('INSERT INTO hr_employees(id,staff_number,full_name,email,user_id,org_unit_id,position_id,start_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[employeeId,required(req.body.staffNumber,'Staff number',80),a.applicant_name,a.email,userId,v.org_unit_id,p.id,dateValue(req.body.startDate)]);
  await db.query("UPDATE hr_applications SET status='HIRED',employee_id=$2,decision_note=$3,updated_by=$4,updated_at=now() WHERE id=$1",[a.id,employeeId,required(req.body.reason,'Hiring authorization reference'),req.auth.userId]);
  await audit(db,req,'hr.application.hired','application',a.id,{employeeId,positionId:p.id,staffNumber:req.body.staffNumber});
  await audit(db,req,'hr.employee.created_from_recruitment','employee',employeeId,{applicationId:a.id,vacancyId:v.id,positionId:p.id});return {id:a.id,employeeId};
 });
 get('/api/hr/onboarding',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_onboarding_directory',['task_code','title','description','staff_number','employee_name','status','office_name']));
 post('/api/hr/onboarding',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,e=await row(db,'hr_employees',b.employeeId);await scope(req,e.org_unit_id);if(e.status!=='ACTIVE')throw fail('Onboarding tasks require an active employee.');
  let assignedTo=null;if(b.assignedTo){const u=await row(db,'users',b.assignedTo,false);if(u.disabled_at)throw fail('Assigned account is disabled.');const inOffice=await db.query('SELECT 1 FROM user_roles WHERE user_id=$1 AND org_unit_id=$2',[u.id,e.org_unit_id]);if(!inOffice.rowCount)throw fail('The task owner must have an account assigned to this office.');assignedTo=u.id;}
  const id=randomUUID();await db.query('INSERT INTO hr_onboarding_tasks(id,employee_id,org_unit_id,task_code,title,description,assigned_to,due_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,e.id,e.org_unit_id,required(b.taskCode,'Task code',80),required(b.title,'Task title',200),required(b.description,'Task instructions'),assignedTo,b.dueDate?dateValue(b.dueDate):null,req.auth.userId]);
  await audit(db,req,'hr.onboarding.task_created','onboarding',id,{employeeId:e.id,assignedTo});return {id};
 });
 app.get('/api/hr/onboarding/my',loadAuth,route(async(req,res)=>{
  res.json((await pool.query('SELECT id,task_code,title,description,due_date,status,completion_note,created_at FROM hr_onboarding_directory WHERE employee_user_id=$1 OR assigned_to=$1 ORDER BY due_date NULLS LAST,created_at',[req.auth.userId])).rows);
 }));
 post('/api/hr/onboarding/:id/complete',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const t=await row(db,'hr_onboarding_tasks',req.params.id);await scope(req,t.org_unit_id);if(t.status!=='OPEN')throw fail('Only open onboarding tasks can be completed.',409);
  await db.query("UPDATE hr_onboarding_tasks SET status='COMPLETE',completion_note=$2,completed_by=$3,completed_at=now() WHERE id=$1",[t.id,required(req.body.reason,'Completion evidence / note'),req.auth.userId]);
  await audit(db,req,'hr.onboarding.task_completed','onboarding',t.id,{employeeId:t.employee_id});return {id:t.id};
 });
 app.post('/api/hr/onboarding/:id/complete-self',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const t=await row(db,'hr_onboarding_tasks',req.params.id),e=await row(db,'hr_employees',t.employee_id,false);
  if(t.assigned_to!==req.auth.userId&&e.user_id!==req.auth.userId)throw fail('Only the employee or assigned task owner can complete this task.',403);
  if(t.status!=='OPEN')throw fail('Only open onboarding tasks can be completed.',409);
  await db.query("UPDATE hr_onboarding_tasks SET status='COMPLETE',completion_note=$2,completed_by=$3,completed_at=now() WHERE id=$1",[t.id,required(req.body.reason,'Completion note'),req.auth.userId]);
  await writeAudit(db,req.auth,'hr.onboarding.task_completed_self','onboarding',t.id,{employeeId:t.employee_id});return {id:t.id};
 }))));
 post('/api/hr/onboarding/:id/waive',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const t=await row(db,'hr_onboarding_tasks',req.params.id);await scope(req,t.org_unit_id);if(t.status!=='OPEN')throw fail('Only open onboarding tasks can be waived.',409);
  checker(req,t.created_by);await db.query("UPDATE hr_onboarding_tasks SET status='WAIVED',completion_note=$2,completed_by=$3,completed_at=now() WHERE id=$1",[t.id,required(req.body.reason,'Waiver approval reason'),req.auth.userId]);
  await audit(db,req,'hr.onboarding.task_waived','onboarding',t.id,{employeeId:t.employee_id});return {id:t.id};
 });

 get('/api/hr/training/programs',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_training_program_directory',['code','title','category','provider','description','status'],null));
 post('/api/hr/training/programs',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,start=dateValue(b.startsOn),end=dateValue(b.endsOn);if(end<start)throw fail('Training end date must follow its start date.');
  const capacity=numeric(b.capacity,1,10000);if(!Number.isInteger(capacity))throw fail('Capacity must be a whole number.');
  const id=randomUUID();await db.query('INSERT INTO hr_training_programs(id,code,title,category,provider,description,starts_on,ends_on,capacity,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,required(b.code,'Course code',80),required(b.title,'Course title',200),required(b.category,'Course category',100),required(b.provider,'Training provider',200),required(b.description,'Course description'),start,end,capacity,req.auth.userId]);
  await audit(db,req,'hr.training.program_created','training_program',id,{code:b.code});return {id};
 });
 post('/api/hr/training/programs/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const p=await row(db,'hr_training_programs',req.params.id);checker(req,p.created_by);if(p.status!=='DRAFT')throw fail('Only draft training programs can be published or cancelled.',409);
  if(!['PUBLISHED','CANCELLED'].includes(req.body.status))throw fail('Select publish or cancel.');
  if(req.body.status==='PUBLISHED'&&dbDate(p.ends_on)<new Date().toISOString().slice(0,10))throw fail('The training program has already ended.');
  await db.query('UPDATE hr_training_programs SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[p.id,req.body.status,req.auth.userId,required(req.body.reason,'Independent publication decision')]);await audit(db,req,`hr.training.program_${req.body.status.toLowerCase()}`,'training_program',p.id);return {id:p.id};
 });
 get('/api/hr/training/enrollments',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_training_enrollment_directory',['program_code','program_title','staff_number','employee_name','status','learning_objective','certificate_reference']));
 post('/api/hr/training/enrollments',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,p=await row(db,'hr_training_programs',b.programId),e=await row(db,'hr_employees',b.employeeId);await scope(req,e.org_unit_id);
  if(e.status!=='ACTIVE'||p.status!=='PUBLISHED')throw fail('Enroll active employees in published training programs only.',409);
  if(dbDate(p.ends_on)<new Date().toISOString().slice(0,10))throw fail('The training program has ended.',409);
  await db.query('SELECT id FROM hr_training_programs WHERE id=$1 FOR UPDATE',[p.id]);const count=await db.query("SELECT count(*)::integer AS total FROM hr_training_enrollments WHERE program_id=$1 AND status NOT IN ('REJECTED','WITHDRAWN')",[p.id]);if(Number(count.rows[0].total)>=p.capacity)throw fail('Training capacity has been reached.',409);
  const id=randomUUID();await db.query('INSERT INTO hr_training_enrollments(id,program_id,employee_id,org_unit_id,learning_objective,created_by) VALUES($1,$2,$3,$4,$5,$6)',[id,p.id,e.id,e.org_unit_id,required(b.learningObjective,'Learning objective'),req.auth.userId]);await audit(db,req,'hr.training.employee_nominated','training_enrollment',id,{employeeId:e.id,programId:p.id});return {id};
 });
 post('/api/hr/training/enrollments/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const e=await row(db,'hr_training_enrollments',req.params.id);await scope(req,e.org_unit_id);checker(req,e.created_by);if(e.status!=='SUBMITTED')throw fail('Only a pending training nomination can be decided.',409);
  if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Select approve or reject.');await db.query('UPDATE hr_training_enrollments SET status=$2,approved_by=$3,completion_note=$4,updated_at=now() WHERE id=$1',[e.id,req.body.status,req.auth.userId,required(req.body.reason,'Training nomination decision')]);await audit(db,req,`hr.training.nomination_${req.body.status.toLowerCase()}`,'training_enrollment',e.id);return {id:e.id};
 });
 app.post('/api/hr/training/enrollments/:id/start',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const e=await row(db,'hr_training_enrollments',req.params.id),employee=await row(db,'hr_employees',e.employee_id,false);
  if(employee.user_id!==req.auth.userId){req.departmentAuth=departmentAuth(req.auth,DEPARTMENT_ROLES.hr);await scope(req,e.org_unit_id);}
  if(e.status!=='APPROVED')throw fail('Only an approved enrollment can be started.',409);await db.query("UPDATE hr_training_enrollments SET status='IN_PROGRESS',updated_at=now() WHERE id=$1",[e.id]);await writeAudit(db,req.departmentAuth||req.auth,'hr.training.started','training_enrollment',e.id,{employeeId:e.employee_id});return {id:e.id};
 }))));
 app.post('/api/hr/training/enrollments/:id/complete',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const e=await row(db,'hr_training_enrollments',req.params.id),employee=await row(db,'hr_employees',e.employee_id,false);
  if(employee.user_id!==req.auth.userId){req.departmentAuth=departmentAuth(req.auth,DEPARTMENT_ROLES.hr);await scope(req,e.org_unit_id);}
  if(e.status!=='IN_PROGRESS')throw fail('Only an in-progress course can be submitted for completion.',409);
  await db.query("UPDATE hr_training_enrollments SET status='COMPLETION_SUBMITTED',completion_note=$2,certificate_reference=$3,completed_by=$4,updated_at=now() WHERE id=$1",[e.id,required(req.body.reason,'Completion evidence / result'),String(req.body.certificateReference||'').trim().slice(0,200)||null,req.auth.userId]);await writeAudit(db,req.departmentAuth||req.auth,'hr.training.completion_submitted','training_enrollment',e.id,{employeeId:e.employee_id});return {id:e.id};
 }))));
 post('/api/hr/training/enrollments/:id/decide-completion',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const e=await row(db,'hr_training_enrollments',req.params.id);await scope(req,e.org_unit_id);checker(req,e.completed_by);if(e.status!=='COMPLETION_SUBMITTED')throw fail('Course completion is not awaiting verification.',409);
  if(!['COMPLETED','FAILED'].includes(req.body.status))throw fail('Select completed or failed.');await db.query('UPDATE hr_training_enrollments SET status=$2,updated_at=now() WHERE id=$1',[e.id,req.body.status]);await audit(db,req,`hr.training.${req.body.status.toLowerCase()}`,'training_enrollment',e.id,{certificateReference:e.certificate_reference,verification:required(req.body.reason,'Independent certificate / result verification')});return {id:e.id};
 });
 get('/api/hr/training/my',Object.values(DEPARTMENT_ROLES).flat(),async(req,res)=>res.json((await pool.query('SELECT id,program_code,program_title,starts_on,ends_on,status,learning_objective,completion_note,certificate_reference FROM hr_training_enrollment_directory WHERE employee_user_id=$1 ORDER BY starts_on DESC',[req.auth.userId])).rows));

 get('/api/hr/performance/cycles',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_performance_cycles',['reference','status','period_start','period_end']));
 post('/api/hr/performance/cycles',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body;await office(db,req,b.orgUnitId);const start=dateValue(b.periodStart),end=dateValue(b.periodEnd);if(end<start)throw fail('Performance period end must follow its start.');let reviewerId=null;
  if(b.reviewerId){const u=await row(db,'users',b.reviewerId,false);if(u.disabled_at)throw fail('Reviewer account is disabled.');const assigned=await db.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND org_unit_id=$2 AND role IN ('MANAGING_DIRECTOR','HR_DIRECTOR')",[u.id,b.orgUnitId]);if(!assigned.rowCount)throw fail('The reviewer must have an HR or MD role assigned to this office.');reviewerId=u.id;}
  const id=randomUUID();await db.query('INSERT INTO hr_performance_cycles(id,reference,org_unit_id,period_start,period_end,reviewer_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,required(b.reference,'Review-cycle reference',100),b.orgUnitId,start,end,reviewerId,req.auth.userId]);await audit(db,req,'hr.performance.cycle_created','performance_cycle',id);return {id};
 });
 post('/api/hr/performance/cycles/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const c=await row(db,'hr_performance_cycles',req.params.id);await scope(req,c.org_unit_id);checker(req,c.created_by);if(c.status!=='DRAFT')throw fail('Only draft review cycles can be opened or cancelled.',409);
  if(!['OPEN','CANCELLED'].includes(req.body.status))throw fail('Select open or cancel.');
  if(req.body.status==='OPEN'){
   const staff=await db.query("SELECT id FROM hr_employees WHERE org_unit_id=$1 AND status='ACTIVE' ORDER BY staff_number",[c.org_unit_id]);
   for(const e of staff.rows)await db.query('INSERT INTO hr_performance_reviews(id,cycle_id,employee_id,org_unit_id,reviewer_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),c.id,e.id,c.org_unit_id,c.reviewer_id]);
  }
  await db.query('UPDATE hr_performance_cycles SET status=$2,opened_by=$3,decision_note=$4 WHERE id=$1',[c.id,req.body.status,req.auth.userId,required(req.body.reason,'Independent cycle decision')]);await audit(db,req,`hr.performance.cycle_${req.body.status.toLowerCase()}`,'performance_cycle',c.id);return {id:c.id};
 });
 post('/api/hr/performance/cycles/:id/close',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const c=await row(db,'hr_performance_cycles',req.params.id);await scope(req,c.org_unit_id);checker(req,c.opened_by||c.created_by);if(c.status!=='OPEN')throw fail('Only an open performance cycle can be closed.',409);
  const outstanding=await db.query("SELECT count(*)::integer AS total FROM hr_performance_reviews r JOIN hr_employees e ON e.id=r.employee_id WHERE r.cycle_id=$1 AND NOT (r.status='ACKNOWLEDGED' OR (e.user_id IS NULL AND r.status='REVIEWED'))",[c.id]);
  if(Number(outstanding.rows[0].total)>0)throw fail('Complete manager reviews and employee acknowledgements before closing the cycle.',409);
  await db.query("UPDATE hr_performance_cycles SET status='CLOSED',closed_by=$2,decision_note=$3 WHERE id=$1",[c.id,req.auth.userId,required(req.body.reason,'Cycle close / completion note')]);await audit(db,req,'hr.performance.cycle_closed','performance_cycle',c.id);return {id:c.id};
 });
 get('/api/hr/performance/reviews',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_performance_review_directory',['cycle_reference','staff_number','employee_name','status','self_assessment','manager_assessment']));
 get('/api/hr/performance/my',Object.values(DEPARTMENT_ROLES).flat(),async(req,res)=>res.json((await pool.query('SELECT id,cycle_reference,period_start,period_end,status,self_assessment,manager_assessment,rating,reviewer_id FROM hr_performance_review_directory WHERE employee_user_id=$1 ORDER BY period_end DESC',[req.auth.userId])).rows));
 app.post('/api/hr/performance/reviews/:id/self-submit',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const r=await row(db,'hr_performance_reviews',req.params.id),e=await row(db,'hr_employees',r.employee_id,false);if(e.user_id!==req.auth.userId)throw fail('Only the employee can submit this self-assessment.',403);
  const c=await row(db,'hr_performance_cycles',r.cycle_id,false);if(c.status!=='OPEN'||r.status!=='PENDING')throw fail('This review is not open for self-assessment.',409);
  await db.query("UPDATE hr_performance_reviews SET status='SELF_SUBMITTED',self_assessment=$2,submitted_by=$3,submitted_at=now() WHERE id=$1",[r.id,required(req.body.assessment,'Employee accomplishments, objectives and development needs'),req.auth.userId]);await writeAudit(db,req.auth,'hr.performance.self_submitted','performance_review',r.id,{cycleId:c.id});return {id:r.id};
 }))));
 post('/api/hr/performance/reviews/:id/capture-self',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const r=await row(db,'hr_performance_reviews',req.params.id);await scope(req,r.org_unit_id);const e=await row(db,'hr_employees',r.employee_id,false);
  if(e.user_id)throw fail('Use employee self-service when the employee has a linked login.');if(r.status!=='PENDING')throw fail('This review already has a self-assessment.',409);
  const c=await row(db,'hr_performance_cycles',r.cycle_id,false);if(c.status!=='OPEN')throw fail('This performance cycle is not open.',409);
  await db.query("UPDATE hr_performance_reviews SET status='SELF_SUBMITTED',self_assessment=$2,submitted_by=$3,submitted_at=now() WHERE id=$1",[r.id,required(req.body.assessment,'Employee interview / written self-assessment evidence'),req.auth.userId]);await audit(db,req,'hr.performance.self_assessment_captured','performance_review',r.id,{cycleId:c.id,employeeId:e.id});return {id:r.id};
 });
 post('/api/hr/performance/reviews/:id/review',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const r=await row(db,'hr_performance_reviews',req.params.id);await scope(req,r.org_unit_id);if(r.status!=='SELF_SUBMITTED')throw fail('Employee self-assessment is required before manager review.',409);if(r.reviewer_id&&r.reviewer_id!==req.auth.userId)throw fail('Only the assigned reviewer can complete this assessment.',403);
  const employee=await row(db,'hr_employees',r.employee_id,false);if(employee.user_id===req.auth.userId)throw fail('Employees cannot approve their own performance review.',403);
  checker(req,r.submitted_by||employee.user_id);
  const rating=numeric(req.body.rating,1,5);if(!Number.isInteger(rating))throw fail('Select a whole-number rating from 1 to 5.');await db.query("UPDATE hr_performance_reviews SET status='REVIEWED',manager_assessment=$2,rating=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1",[r.id,required(req.body.assessment,'Manager review, goals and development actions'),rating,req.auth.userId]);await audit(db,req,'hr.performance.reviewed','performance_review',r.id,{rating});return {id:r.id};
 });
 app.post('/api/hr/performance/reviews/:id/acknowledge',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const r=await row(db,'hr_performance_reviews',req.params.id),e=await row(db,'hr_employees',r.employee_id,false);if(e.user_id!==req.auth.userId)throw fail('Only the employee can acknowledge this review.',403);
  if(r.status!=='REVIEWED')throw fail('A manager-reviewed assessment is required before acknowledgement.',409);await db.query("UPDATE hr_performance_reviews SET status='ACKNOWLEDGED',acknowledged_at=now() WHERE id=$1",[r.id]);await writeAudit(db,req.auth,'hr.performance.acknowledged','performance_review',r.id,{note:required(req.body.reason,'Acknowledgement / response')});return {id:r.id};
 }))));
 // Attendance relies on server timestamps; it does not claim biometric identity verification.
 app.get('/api/hr/attendance/my',loadAuth,route(async(req,res)=>{
  const e=await pool.query('SELECT id,full_name,status FROM hr_employees WHERE user_id=$1',[req.auth.userId]);
  if(!e.rowCount)return res.json({employee:null,today:null,entries:[]});
  const entries=await pool.query('SELECT id,work_date,clocked_in_at,clocked_out_at FROM hr_attendance WHERE employee_id=$1 ORDER BY work_date DESC LIMIT 60',[e.rows[0].id]);
  res.json({employee:e.rows[0],today:entries.rows.find(r=>dbDate(r.work_date)===new Date().toISOString().slice(0,10))||null,entries:entries.rows});
 }));
 app.post('/api/hr/attendance/clock-in',loadAuth,csrfRequired,route(async(req,res)=>res.status(201).json(await transaction(async db=>{
  const e=await db.query('SELECT * FROM hr_employees WHERE user_id=$1 FOR UPDATE',[req.auth.userId]);
  if(!e.rowCount||e.rows[0].status!=='ACTIVE')throw fail('An active linked employee record is required.',403);
  const id=randomUUID();
  try{await db.query('INSERT INTO hr_attendance(id,employee_id,org_unit_id,work_date,clocked_in_at) VALUES($1,$2,$3,(now() AT TIME ZONE \'UTC\')::date,now())',[id,e.rows[0].id,e.rows[0].org_unit_id]);}
  catch(err){if(err.code==='23505')throw fail('Attendance is already recorded for today.',409);throw err;}
  await writeAudit(db,req.auth,'hr.attendance.clocked_in','attendance',id,{employeeId:e.rows[0].id});return {id};
 }))));
 app.post('/api/hr/attendance/clock-out',loadAuth,csrfRequired,route(async(req,res)=>res.json(await transaction(async db=>{
  const e=await db.query('SELECT * FROM hr_employees WHERE user_id=$1',[req.auth.userId]);if(!e.rowCount||e.rows[0].status!=='ACTIVE')throw fail('An active linked employee record is required.',403);
  const a=await db.query("SELECT * FROM hr_attendance WHERE employee_id=$1 AND work_date=(now() AT TIME ZONE 'UTC')::date FOR UPDATE",[e.rows[0].id]);
  if(!a.rowCount||a.rows[0].clocked_out_at)throw fail('No open attendance entry exists for today.',409);
  await db.query('UPDATE hr_attendance SET clocked_out_at=now(),updated_at=now() WHERE id=$1',[a.rows[0].id]);
  await writeAudit(db,req.auth,'hr.attendance.clocked_out','attendance',a.rows[0].id,{employeeId:e.rows[0].id});return {id:a.rows[0].id};
 }))));
 get('/api/hr/attendance',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_attendance_directory',['staff_number','employee_name','office_name','work_date','clocked_in_at','clocked_out_at']));
 post('/api/hr/attendance/:id/corrections',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const a=await row(db,'hr_attendance',req.params.id);await scope(req,a.org_unit_id);
  const pending=await db.query("SELECT 1 FROM hr_attendance_corrections WHERE attendance_id=$1 AND status='SUBMITTED'",[a.id]);if(pending.rowCount)throw fail('Resolve the existing pending correction first.',409);
  const start=new Date(req.body.clockedInAt),end=req.body.clockedOutAt?new Date(req.body.clockedOutAt):null;
  if(!Number.isFinite(start.getTime())||(req.body.clockedOutAt&&!end)||end&&end<start)throw fail('Enter valid correction timestamps; clock-out must follow clock-in.');
  const id=randomUUID();await db.query('INSERT INTO hr_attendance_corrections(id,attendance_id,requested_clock_in,requested_clock_out,reason,requested_by) VALUES($1,$2,$3,$4,$5,$6)',[id,a.id,start.toISOString(),end?.toISOString()||null,required(req.body.reason,'Correction reason'),req.auth.userId]);
  await audit(db,req,'hr.attendance.correction_submitted','attendance',a.id,{correctionId:id});return {id};
 });
 post('/api/hr/attendance/corrections/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const c=await row(db,'hr_attendance_corrections',req.params.id);const a=await row(db,'hr_attendance',c.attendance_id);await scope(req,a.org_unit_id);checker(req,c.requested_by);
  if(c.status!=='SUBMITTED')throw fail('This attendance correction has already been decided.',409);
  if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Select approve or reject.');
  if(req.body.status==='APPROVED')await db.query('UPDATE hr_attendance SET clocked_in_at=$2,clocked_out_at=$3,updated_at=now() WHERE id=$1',[a.id,c.requested_clock_in,c.requested_clock_out]);
  await db.query('UPDATE hr_attendance_corrections SET status=$2,decided_by=$3,decision_note=$4 WHERE id=$1',[c.id,req.body.status,req.auth.userId,required(req.body.reason,'Independent correction decision')]);
  await audit(db,req,`hr.attendance.correction_${req.body.status.toLowerCase()}`,'attendance',a.id,{correctionId:c.id});return {id:c.id};
 });
 // Confidential cases are intentionally visible only to the HR Director and Managing Director.
 const disciplineRoles=['HR_DIRECTOR','MANAGING_DIRECTOR'];
 get('/api/hr/disciplinary-cases',disciplineRoles,(req,res)=>list(req,res,'hr_disciplinary_case_directory',['case_reference','staff_number','employee_name','office_name','allegation_summary','status']));
 post('/api/hr/disciplinary-cases',disciplineRoles,async(db,req)=>{
  const e=await row(db,'hr_employees',req.body.employeeId);await scope(req,e.org_unit_id);if(e.status!=='ACTIVE')throw fail('A case can only be opened for an active employee.');
  const id=randomUUID();await db.query('INSERT INTO hr_disciplinary_cases(id,case_reference,employee_id,org_unit_id,allegation_summary,created_by) VALUES($1,$2,$3,$4,$5,$6)',[id,required(req.body.caseReference,'Case reference',100),e.id,e.org_unit_id,required(req.body.allegationSummary,'Confidential case summary'),req.auth.userId]);
  await audit(db,req,'hr.disciplinary.draft_created','disciplinary_case',id,{employeeId:e.id});return {id};
 });
 post('/api/hr/disciplinary-cases/:id/advance',disciplineRoles,async(db,req)=>{
  const c=await row(db,'hr_disciplinary_cases',req.params.id);await scope(req,c.org_unit_id);checker(req,c.last_action_by||c.created_by);
  const next={DRAFT:['OPEN','CANCELLED'],OPEN:['UNDER_REVIEW'],UNDER_REVIEW:['HEARING','DECIDED'],HEARING:['DECIDED'],DECIDED:['CLOSED']}[c.status]||[];
  if(!next.includes(req.body.status))throw fail('This case cannot move to the selected stage.',409);
  await db.query('UPDATE hr_disciplinary_cases SET status=$2,last_action_by=$3,last_action_note=$4,updated_at=now() WHERE id=$1',[c.id,req.body.status,req.auth.userId,required(req.body.reason,'Procedural action and evidence reference')]);
  await audit(db,req,`hr.disciplinary.${req.body.status.toLowerCase()}`,'disciplinary_case',c.id,{previousStatus:c.status});return {id:c.id};
 });
 const histories={procurement_contract:['procurement_contracts',DEPARTMENT_ROLES.procurement],employee:['hr_employees',DEPARTMENT_ROLES.hr],leave:['hr_leave_requests',DEPARTMENT_ROLES.hr],vacancy:['hr_vacancies',DEPARTMENT_ROLES.hr],application:['hr_application_directory',DEPARTMENT_ROLES.hr],onboarding:['hr_onboarding_tasks',DEPARTMENT_ROLES.hr],training_program:['hr_training_programs',DEPARTMENT_ROLES.hr],training_enrollment:['hr_training_enrollments',DEPARTMENT_ROLES.hr],performance_cycle:['hr_performance_cycles',DEPARTMENT_ROLES.hr],performance_review:['hr_performance_review_directory',DEPARTMENT_ROLES.hr],attendance:['hr_attendance',DEPARTMENT_ROLES.hr],disciplinary_case:['hr_disciplinary_cases',['HR_DIRECTOR','MANAGING_DIRECTOR']],journal:['gl_journals',DEPARTMENT_ROLES.finance],procurement_plan:['procurement_plans',DEPARTMENT_ROLES.procurement],asset:['assets',DEPARTMENT_ROLES.assets]};
 app.get('/api/departments/:type/:id/history',loadAuth,route(async(req,res)=>{
  const config=histories[req.params.type];if(!config)throw fail('Unknown record type.',404);
  req.departmentAuth=departmentAuth(req.auth,config[1]);const r=await row(pool,config[0],req.params.id,false);await scope(req,r.org_unit_id);
  res.json((await pool.query('SELECT action,actor_role,event_data,created_at,event_hash FROM audit_events WHERE entity_type=$1 AND entity_id=$2 ORDER BY sequence DESC LIMIT 100',[req.params.type,r.id])).rows);
 }));
 return {createJournal};
}
