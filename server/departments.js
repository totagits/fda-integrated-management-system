import { randomUUID } from 'node:crypto';
import { parseMinorUnits } from './domain.js';
import { deliverIdentityInvitation, issueIdentityInvitation, makeUnusablePasswordHash } from './identity-invitations.js';

export const DEPARTMENT_PERMISSIONS = {
  financeWrite: ['MANAGING_DIRECTOR', 'FINANCE_DIRECTOR'],
  procurement: ['MANAGING_DIRECTOR', 'FINANCE_DIRECTOR', 'PROCUREMENT_OFFICER', 'COUNTY_OFFICER', 'INTERNAL_AUDITOR'],
  planWrite: ['PROCUREMENT_OFFICER', 'COUNTY_OFFICER'],
  planApprove: ['MANAGING_DIRECTOR', 'FINANCE_DIRECTOR'],
  assets: ['MANAGING_DIRECTOR', 'FINANCE_DIRECTOR', 'PROCUREMENT_OFFICER', 'ASSET_OFFICER', 'COUNTY_OFFICER', 'INTERNAL_AUDITOR'],
  assetWrite: ['MANAGING_DIRECTOR', 'ASSET_OFFICER', 'COUNTY_OFFICER'],
};
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
 get('/api/hr/analytics/summary',DEPARTMENT_ROLES.hr,async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth);
  const filter='($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))';
  const [workforce,recruitment,performance,learning,service,offices,contracts]=await Promise.all([
   pool.query(`SELECT count(*) FILTER(WHERE status='ACTIVE')::integer AS active,
      count(*) FILTER(WHERE status='EXITED')::integer AS exited
     FROM hr_employees WHERE ${filter}`,[units]),
   pool.query(`SELECT
      (SELECT count(*)::integer FROM hr_vacancies WHERE ${filter} AND status='PUBLISHED') AS published_vacancies,
      (SELECT count(*)::integer FROM hr_application_directory WHERE ${filter} AND status NOT IN ('HIRED','REJECTED','WITHDRAWN')) AS active_applications,
      (SELECT count(*)::integer FROM hr_application_directory WHERE ${filter} AND status='OFFERED') AS offers,
      (SELECT count(*)::integer FROM hr_application_directory WHERE ${filter} AND status='HIRED') AS hires,
      (SELECT round(avg(a.updated_at::date-v.opens_on))::integer FROM hr_applications a JOIN hr_vacancies v ON v.id=a.vacancy_id WHERE ($1::uuid[] IS NULL OR v.org_unit_id=ANY($1::uuid[])) AND a.status='HIRED') AS average_days_to_hire`,[units]),
   pool.query(`SELECT count(r.id)::integer AS total,
      count(r.id) FILTER(WHERE r.status='ACKNOWLEDGED' OR (r.status='REVIEWED' AND r.employee_user_id IS NULL))::integer AS completed,
      count(DISTINCT c.id)::integer AS open_cycles
     FROM hr_performance_cycles c LEFT JOIN hr_performance_review_directory r ON r.cycle_id=c.id
     WHERE c.status='OPEN' AND ($1::uuid[] IS NULL OR c.org_unit_id=ANY($1::uuid[]))`,[units]),
   pool.query(`SELECT count(*)::integer AS participants,
      count(*) FILTER(WHERE status='COMPLETED')::integer AS verified_completions
     FROM hr_training_enrollment_directory WHERE ${filter}`,[units]),
   pool.query(`SELECT
      (SELECT count(*)::integer FROM hr_leave_requests WHERE ${filter} AND status='SUBMITTED') AS pending_leave,
      (SELECT count(*)::integer FROM hr_attendance WHERE ${filter} AND work_date >= date_trunc('month',now() AT TIME ZONE 'UTC')::date) AS attendance_events_this_month`,[units]),
   pool.query(`WITH staff AS (SELECT org_unit_id,count(*)::integer AS active_staff FROM hr_employees WHERE status='ACTIVE' AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) GROUP BY org_unit_id),
      positions AS (SELECT org_unit_id,sum(capacity)::integer AS authorized_positions,sum(filled)::integer AS filled_positions FROM hr_position_directory WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) GROUP BY org_unit_id)
     SELECT o.id,o.name,o.level,coalesce(s.active_staff,0)::integer AS active_staff,
      coalesce(p.authorized_positions,0)::integer AS authorized_positions,coalesce(p.filled_positions,0)::integer AS filled_positions
     FROM org_units o LEFT JOIN staff s ON s.org_unit_id=o.id LEFT JOIN positions p ON p.org_unit_id=o.id
     WHERE o.active AND ($1::uuid[] IS NULL OR o.id=ANY($1::uuid[])) AND (s.org_unit_id IS NOT NULL OR p.org_unit_id IS NOT NULL)
     ORDER BY o.level,o.name LIMIT 30`,[units]),
   pool.query(`SELECT count(*) FILTER(WHERE end_date>=current_date AND end_date<=current_date+30)::integer AS expiring_30_days,
      count(*) FILTER(WHERE end_date<current_date)::integer AS expired_not_closed
     FROM hr_employment_contracts WHERE ${filter} AND status='ACTIVE'`,[units]),
  ]);
  const w=workforce.rows[0],r=recruitment.rows[0],p=performance.rows[0],l=learning.rows[0],s=service.rows[0];
  const establishment=await pool.query(`SELECT coalesce(sum(capacity),0)::integer AS authorized,
      coalesce(sum(filled),0)::integer AS filled FROM hr_position_directory WHERE ${filter}`,[units]);
  const authorized=Number(establishment.rows[0].authorized),filled=Number(establishment.rows[0].filled);
  const reviewTotal=Number(p.total),trainingTotal=Number(l.participants);
  res.json({asOf:new Date().toISOString(),scope:req.departmentAuth.roles.some(x=>x.role==='MANAGING_DIRECTOR')?'FDA-wide':'assigned offices',
   workforce:{active:Number(w.active),exited:Number(w.exited),authorizedPositions:authorized,filledPositions:filled,fillRatePct:authorized?Math.round(filled*100/authorized):null},
   recruitment:{publishedVacancies:Number(r.published_vacancies),activeApplications:Number(r.active_applications),offers:Number(r.offers),hires:Number(r.hires),averageDaysToHire:r.average_days_to_hire===null?null:Number(r.average_days_to_hire)},
   performance:{openCycles:Number(p.open_cycles),reviews:reviewTotal,completed:Number(p.completed),completionRatePct:reviewTotal?Math.round(Number(p.completed)*100/reviewTotal):null},
   learning:{participants:trainingTotal,verifiedCompletions:Number(l.verified_completions),completionRatePct:trainingTotal?Math.round(Number(l.verified_completions)*100/trainingTotal):null},
   service:{pendingLeave:Number(s.pending_leave),attendanceEventsThisMonth:Number(s.attendance_events_this_month),contractsExpiring30Days:Number(contracts.rows[0].expiring_30_days),expiredContractsNotClosed:Number(contracts.rows[0].expired_not_closed)},
   offices:offices.rows.map(o=>({...o,active_staff:Number(o.active_staff),authorized_positions:Number(o.authorized_positions),filled_positions:Number(o.filled_positions)}))});
 });
 post('/api/hr/positions',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body;await office(db,req,b.orgUnitId);const capacity=numeric(b.capacity,1,10000);if(!Number.isInteger(capacity))throw fail('Capacity must be a whole number.');
  const id=randomUUID();await db.query('INSERT INTO hr_positions(id,org_unit_id,code,title,grade,capacity) VALUES($1,$2,$3,$4,$5,$6)',[id,b.orgUnitId,required(b.code,'Position code',80),required(b.title,'Title',200),required(b.grade,'Grade',80),capacity]);
  await audit(db,req,'hr.position.created','hr_position',id);return {id};
 });
 get('/api/hr/contracts',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_employment_contract_directory',['contract_reference','contract_type','staff_number','employee_name','office_name','signed_document_reference']));
 post('/api/hr/contracts',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,e=await row(db,'hr_employees',b.employeeId);await scope(req,e.org_unit_id);
  if(e.status!=='ACTIVE')throw fail('A contract may only be recorded for an active employee.');
  const type=b.contractType;if(!['PERMANENT','FIXED_TERM','PROBATION','SECONDMENT'].includes(type))throw fail('Select a valid contract type.');
  const start=dateValue(b.startDate),end=b.endDate?dateValue(b.endDate):null;if(end&&end<start)throw fail('Contract end date must be on or after its start date.');
  if(type!=='PERMANENT'&&!end)throw fail('A fixed-term, probation or secondment contract requires an end date.');
  const duplicate=await db.query(`SELECT 1 FROM hr_employment_contracts WHERE employee_id=$1 AND status='ACTIVE' AND start_date<=coalesce($3::date,'infinity'::date) AND coalesce(end_date,'infinity'::date)>= $2::date`,[e.id,start,end]);
  if(duplicate.rowCount)throw fail('This contract overlaps another active contract for the employee.',409);
  const id=randomUUID();await db.query('INSERT INTO hr_employment_contracts(id,employee_id,org_unit_id,contract_reference,contract_type,start_date,end_date,signed_document_reference,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,e.id,e.org_unit_id,required(b.contractReference,'Contract reference',120),type,start,end,required(b.signedDocumentReference,'Signed contract file or records reference',240),req.auth.userId]);
  await audit(db,req,'hr.employment_contract.recorded','employment_contract',id,{employeeId:e.id,contractType:type,startDate:start,endDate:end});return {id};
 });
 post('/api/hr/contracts/:id/end',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const c=await row(db,'hr_employment_contracts',req.params.id);await scope(req,c.org_unit_id);if(c.status!=='ACTIVE')throw fail('Only an active contract can be ended.',409);
  checker(req,c.created_by);const note=required(req.body.reason,'Contract-end authorization and reason');
  await db.query("UPDATE hr_employment_contracts SET status='ENDED',ended_by=$2,ended_at=now(),end_reason=$3 WHERE id=$1",[c.id,req.auth.userId,note]);
  await audit(db,req,'hr.employment_contract.ended','employment_contract',c.id,{employeeId:c.employee_id,reason:note});return {id:c.id};
 });
 get('/api/hr/employees',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_employee_access_directory',['staff_number','full_name','email','position_title','office_name','status','login_status']));
 app.post('/api/hr/employees/:id/invite-login',loadAuth,csrfRequired,guard(DEPARTMENT_ROLES.hr),route(async(req,res)=>{
  const invitation=await transaction(async db=>{
   req.departmentDb=db;const employee=await row(db,'hr_employees',req.params.id);await scope(req,employee.org_unit_id);
   if(employee.status!=='ACTIVE')throw fail('Only active employees can receive an account invitation.',409);
   const email=String(employee.email||'').trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('Add a valid work email to the employee record before inviting them.');
   let user;
   if(employee.user_id){
    const found=await db.query(`SELECT u.id,u.email,u.full_name,u.must_change_password,u.disabled_at,r.role
      FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 FOR UPDATE OF u`,[employee.user_id]);
    user=found.rows[0];
    if(!user||user.disabled_at||user.email!==email||user.role!=='EMPLOYEE')throw fail('The linked account is not an eligible employee account. Ask the Managing Director to review the account linkage.',409);
    if(!user.must_change_password)throw fail('This employee has already activated their account. Use the approved account recovery process if they need access help.',409);
   }else{
    const existing=await db.query('SELECT id FROM users WHERE email=$1',[email]);
    if(existing.rowCount)throw fail('An account already uses this email. Ask the Managing Director to review and link the correct account before inviting.',409);
    user={id:randomUUID(),email,full_name:employee.full_name};
    await db.query('INSERT INTO users(id,email,full_name,password_hash,must_change_password) VALUES($1,$2,$3,$4,true)',[user.id,email,employee.full_name,await makeUnusablePasswordHash()]);
    await db.query("INSERT INTO user_roles(id,user_id,role,org_unit_id) VALUES($1,$2,'EMPLOYEE',$3)",[randomUUID(),user.id,employee.org_unit_id]);
    await db.query('UPDATE hr_employees SET user_id=$2,version=version+1 WHERE id=$1',[employee.id,user.id]);
    await audit(db,req,'identity.employee_account_created','user',user.id,{employeeId:employee.id,orgUnitId:employee.org_unit_id});
   }
   const issued=await issueIdentityInvitation(db,{user,requestedBy:req.auth.userId,orgUnitId:employee.org_unit_id,invitationType:'HR_EMPLOYEE_ONBOARDING'});
   await audit(db,req,'identity.employee_invitation_issued','employee',employee.id,{userId:user.id,orgUnitId:employee.org_unit_id});
   return issued;
  });
  const delivery=await deliverIdentityInvitation(pool,{invitation,role:'FDA employee'});
  res.status(202).json({employeeId:req.params.id,...delivery});
 }));
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
 post('/api/hr/employees/:id/contact',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const employee=await row(db,'hr_employees',req.params.id);await scope(req,employee.org_unit_id);
  if(employee.status!=='ACTIVE')throw fail('Only active employee records can be updated.',409);
  const email=required(req.body?.email,'Work email',254).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail('Enter a valid work email.');
  const existing=await db.query('SELECT id FROM users WHERE email=$1 AND id IS DISTINCT FROM $2',[email,employee.user_id]);
  if(existing.rowCount)throw fail('Another login account already uses this email. Ask the Managing Director to review the account before continuing.',409);
  if(employee.user_id){
   const linked=await db.query('SELECT must_change_password FROM users WHERE id=$1 AND disabled_at IS NULL FOR UPDATE',[employee.user_id]);
   if(!linked.rowCount||!linked.rows[0].must_change_password)throw fail('The employee has an active login. Update active account email using the approved identity administration process.',409);
   await db.query('UPDATE users SET email=$2 WHERE id=$1',[employee.user_id,email]);
   await db.query('UPDATE identity_invitations SET revoked_at=now() WHERE user_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL',[employee.user_id]);
  }
  await db.query('UPDATE hr_employees SET email=$2,version=version+1 WHERE id=$1',[employee.id,email]);
  await audit(db,req,'hr.employee.work_email_updated','employee',employee.id,{orgUnitId:employee.org_unit_id,linkedAccount:Boolean(employee.user_id)});return {id:employee.id};
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
 get('/api/finance/budget-revisions',DEPARTMENT_ROLES.finance,async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth);
  const rows=await pool.query(`SELECT v.*,b.fiscal_year,b.vote_code,b.title AS budget_title,b.currency,b.org_unit_id,o.name AS office_name
   FROM finance_budget_revisions v JOIN budget_accounts b ON b.id=v.budget_account_id JOIN org_units o ON o.id=b.org_unit_id
   WHERE ($1::uuid[] IS NULL OR b.org_unit_id=ANY($1::uuid[])) ORDER BY v.created_at DESC LIMIT 200`,[units]);
  res.json(rows.rows);
 });
 post('/api/finance/budget-revisions',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const b=req.body,budget=await row(db,'budget_accounts',b.budgetAccountId);await scope(req,budget.org_unit_id);
  const proposed=BigInt(amount(b.proposedAllocation));
  const reason=required(b.reason,'Budget revision justification');
  const id=randomUUID();
  await db.query('INSERT INTO finance_budget_revisions(id,budget_account_id,org_unit_id,base_version,previous_allocation_minor,proposed_allocation_minor,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,budget.id,budget.org_unit_id,budget.version,budget.allocated_minor,proposed.toString(),reason,req.auth.userId]);
  await audit(db,req,'finance.budget_revision_submitted','finance_budget_revision',id,{budgetAccountId:budget.id,baseVersion:budget.version,previousAllocationMinor:String(budget.allocated_minor),proposedAllocationMinor:proposed.toString()});
  return {id,status:'PENDING'};
 });
 post('/api/finance/budget-revisions/:id/decide',DEPARTMENT_ROLES.financeWrite,async(db,req)=>{
  const revision=await row(db,'finance_budget_revisions',req.params.id),budget=await row(db,'budget_accounts',revision.budget_account_id);
  await scope(req,budget.org_unit_id);checker(req,revision.created_by);
  if(revision.status!=='PENDING')throw fail('Only a pending budget revision can be decided.',409);
  if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Choose approve or reject.');
  const note=required(req.body.reason,'Independent decision rationale');
  if(req.body.status==='APPROVED'){
   if(Number(budget.version)!==Number(revision.base_version)||String(budget.allocated_minor)!==String(revision.previous_allocation_minor))throw fail('The budget changed after this revision was submitted. Create a fresh revision using the current allocation.',409);
   if(BigInt(revision.proposed_allocation_minor)<BigInt(budget.reserved_minor)+BigInt(budget.spent_minor))throw fail('The proposed allocation cannot be lower than existing commitments and expenditure.');
   await db.query('UPDATE budget_accounts SET allocated_minor=$2,version=version+1 WHERE id=$1',[budget.id,revision.proposed_allocation_minor]);
  }
  await db.query('UPDATE finance_budget_revisions SET status=$2,decided_by=$3,decision_note=$4,decided_at=now() WHERE id=$1',[revision.id,req.body.status,req.auth.userId,note]);
  await audit(db,req,`finance.budget_revision_${req.body.status.toLowerCase()}`,'finance_budget_revision',revision.id,{budgetAccountId:budget.id,previousAllocationMinor:String(revision.previous_allocation_minor),proposedAllocationMinor:String(revision.proposed_allocation_minor)});
  return {id:revision.id,status:req.body.status};
 });
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
 get('/api/assets/register',DEPARTMENT_ROLES.assets,(req,res)=>list(req,res,'asset_register_directory',['asset_tag','description','lifecycle_status','location']));
 post('/api/assets/register',DEPARTMENT_ROLES.assetWrite,async(db,req)=>{
  const b=req.body;await office(db,req,b.orgUnitId);const id=randomUUID();
  const acquisitionType=b.acquisitionType||'OPENING_BALANCE';if(!['DONATED','TRANSFERRED_IN','OPENING_BALANCE'].includes(acquisitionType))throw fail('Select donated, transferred-in, or opening-balance for manual registration. Purchased assets must come from an accepted procurement receipt.');
  const tag=required(b.assetTag,'Asset tag',100),serial=String(b.serialNumber||'').trim()||null,duplicate=await db.query('SELECT 1 FROM assets WHERE lower(asset_tag)=lower($1) OR ($2::text IS NOT NULL AND lower(serial_number)=lower($2))',[tag,serial]);if(duplicate.rowCount)throw fail('Asset tag or serial number is already registered.',409);
  const usefulMonths=b.usefulLifeMonths?numeric(b.usefulLifeMonths,1,1200):null;if(usefulMonths!==null&&!Number.isInteger(usefulMonths))throw fail('Useful life must be a whole number of months.');
  await db.query('INSERT INTO assets(id,asset_tag,description,category,purchase_cost_minor,currency,org_unit_id,source_reference,location,acquisition_type,make,model,serial_number,purchase_date,funding_source,project_code,donor,warranty_expires_on,useful_life_months) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)',[id,tag,required(b.description,'Description'),required(b.category…21905 tokens truncated…uery("UPDATE hr_performance_reviews SET status='REVIEWED',manager_assessment=$2,rating=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1",[r.id,required(req.body.assessment,'Manager review, goals and development actions'),rating,req.auth.userId]);await audit(db,req,'hr.performance.reviewed','performance_review',r.id,{rating});return {id:r.id};
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
 // Standard cases stay with scoped HR/MD reviewers. Complaints implicating HR
 // leadership or the Managing Director are routed only to designated ethics staff.
 const grievanceRoles=[...disciplineRoles,'ETHICS_OFFICER'];
 get('/api/hr/grievances/handlers',grievanceRoles,async(req,res)=>{
  const independent=String(req.query.route)==='INDEPENDENT';
  const ethics=req.departmentAuth.roles.some(r=>r.role==='ETHICS_OFFICER');
  if(independent!==ethics)throw fail('This handler directory is not available for your grievance route.',403);
  const wanted=independent?'ETHICS_OFFICER':String(req.query.role||'HR_DIRECTOR');
  if(!['ETHICS_OFFICER','HR_DIRECTOR','MANAGING_DIRECTOR'].includes(wanted)||independent&&wanted!=='ETHICS_OFFICER'||!independent&&!disciplineRoles.includes(wanted))throw fail('Select an eligible case-handler role.');
  const units=await scopedUnits(req.departmentAuth);
  res.json((await pool.query(`SELECT DISTINCT u.id,u.full_name,r.role FROM users u JOIN user_roles r ON r.user_id=u.id
   WHERE u.disabled_at IS NULL AND r.role=$1 AND ($2::uuid[] IS NULL OR r.org_unit_id=ANY($2::uuid[]) OR r.org_unit_id IS NULL)
   AND (NOT $3::boolean OR r.org_unit_id IS NULL) ORDER BY u.full_name`,[wanted,units,independent])).rows);
 });
 get('/api/hr/grievances',grievanceRoles,async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth),ethics=req.departmentAuth.roles.some(r=>r.role==='ETHICS_OFFICER');
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||25)),offset=Math.max(0,Number(req.query.offset)||0),q=String(req.query.q||'').slice(0,200);
  const routeName=ethics?'INDEPENDENT':'STANDARD',actor=req.auth.userId;
  const where=`escalation_route=$1 AND ($2::uuid[] IS NULL OR org_unit_id=ANY($2::uuid[]))
   AND ($3::boolean=false OR case_assignee_id IS NULL OR case_assignee_id=$4)
   AND (case_reference ILIKE $5 OR subject ILIKE $5 OR status ILIKE $5 OR category ILIKE $5)`;
  const params=[routeName,units,ethics,actor,`%${q}%`];
  const total=await pool.query(`SELECT count(*) FROM hr_grievance_directory WHERE ${where}`,params);
  const rows=await pool.query(`SELECT id,case_reference,
   CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN NULL ELSE reporter_employee_id END AS reporter_employee_id,
   CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN NULL ELSE reporter_user_id END AS reporter_user_id,
   org_unit_id,CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN NULL ELSE staff_number END AS staff_number,
   CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN NULL ELSE employee_name END AS employee_name,
   CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN NULL ELSE office_name END AS office_name,
   CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN NULL ELSE category END AS category,
   CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN 'Unassigned independent case' ELSE subject END AS subject,
   CASE WHEN $8::boolean AND case_assignee_id IS DISTINCT FROM $9::uuid THEN NULL ELSE details END AS details,
   restricted_to_md,escalation_route,implicated_role,case_assignee_id,assigned_by,
   (SELECT cc.result FROM hr_grievance_conflict_checks cc WHERE cc.grievance_id=hr_grievance_directory.id AND cc.handler_id=$9) AS current_conflict_result,
   acknowledgement_due_at,resolution_due_at,status,last_action_by,last_action_note,created_at,updated_at,resolved_at
   FROM hr_grievance_directory WHERE ${where} ORDER BY created_at DESC LIMIT $6 OFFSET $7`,[...params,limit,offset,ethics,actor]);
  res.json({rows:rows.rows,total:Number(total.rows[0].count),limit,offset});
 });
 app.get('/api/hr/grievances/my',loadAuth,route(async(req,res)=>res.json((await pool.query(`SELECT g.id,g.case_reference,g.category,g.subject,g.details,g.escalation_route,g.implicated_role,g.status,g.last_action_note,g.acknowledgement_due_at,g.resolution_due_at,g.created_at,g.updated_at,g.resolved_at,
  coalesce((SELECT json_agg(json_build_object('eventType',ev.event_type,'note',ev.note,'createdAt',ev.created_at) ORDER BY ev.created_at) FROM hr_grievance_events ev WHERE ev.grievance_id=g.id AND ev.visible_to_reporter=true),'[]'::json) AS updates
  FROM hr_grievances g WHERE g.reporter_user_id=$1 ORDER BY g.created_at DESC LIMIT 100`,[req.auth.userId])).rows)));
 app.post('/api/hr/grievances',loadAuth,csrfRequired,route(async(req,res)=>{
  const result=await transaction(async db=>{
   const e=await db.query('SELECT * FROM hr_employees WHERE user_id=$1 FOR UPDATE',[req.auth.userId]);
   if(!e.rowCount||e.rows[0].status!=='ACTIVE')throw fail('An active linked employee record is required to submit a grievance.',403);
   const employee=e.rows[0],category=req.body.category,implicatedRole=req.body.implicatedRole||(req.body.restrictedToMd?'MANAGING_DIRECTOR':'OTHER');
   if(!['HARASSMENT','DISCRIMINATION','RETALIATION','SAFEGUARDING','WORKPLACE_CONFLICT','OTHER'].includes(category))throw fail('Select a grievance category.');
   if(!['HR_DIRECTOR','MANAGING_DIRECTOR','OTHER'].includes(implicatedRole))throw fail('Select whom the concern involves.');
   const escalationRoute=implicatedRole==='OTHER'?'STANDARD':'INDEPENDENT';
   const sla=await db.query("SELECT acknowledgement_days,resolution_days FROM hr_grievance_sla_settings WHERE status='ACTIVE'");
   const ackDays=sla.rows[0]?.acknowledgement_days,resDays=sla.rows[0]?.resolution_days;
   const id=randomUUID(),caseReference=`FDA-GRV-${new Date().getUTCFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`;
   await db.query(`INSERT INTO hr_grievances(id,case_reference,reporter_employee_id,reporter_user_id,org_unit_id,category,subject,details,restricted_to_md,escalation_route,implicated_role,acknowledgement_due_at,resolution_due_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,CASE WHEN $11::int IS NULL THEN NULL ELSE now()+make_interval(days=>$11) END,CASE WHEN $12::int IS NULL THEN NULL ELSE now()+make_interval(days=>$12) END)`,[id,caseReference,employee.id,req.auth.userId,employee.org_unit_id,category,required(req.body.subject,'Brief subject',200),required(req.body.details,'Grievance details'),escalationRoute,implicatedRole,ackDays??null,resDays??null]);
   await writeAudit(db,req.auth,'hr.grievance.submitted','hr_grievance',id,{orgUnitId:employee.org_unit_id,category,escalationRoute,implicatedRole});return {id,caseReference,escalationRoute,deadlinesConfigured:!!sla.rowCount};
  });res.status(201).json(result);
 }));
 // FDA configures service deadlines; these are internal targets, not statutory time limits.
 get('/api/hr/grievances/sla',disciplineRoles,async(_req,res)=>{
  const result=await pool.query("SELECT id,acknowledgement_days,resolution_days,status,configured_at,approved_by,created_by FROM hr_grievance_sla_settings ORDER BY configured_at DESC LIMIT 1");
  res.json({rows:result.rows,total:result.rowCount,limit:1,offset:0});
 });
 post('/api/hr/grievances/sla',disciplineRoles,async(db,req)=>{
  const ack=numeric(req.body.acknowledgementDays,1,30),resolution=numeric(req.body.resolutionDays,1,180);
  const id=randomUUID();await db.query('INSERT INTO hr_grievance_sla_settings(id,acknowledgement_days,resolution_days,created_by) VALUES($1,$2,$3,$4)',[id,ack,resolution,req.auth.userId]);
  await audit(db,req,'hr.grievance.sla_drafted','hr_grievance_sla',id,{acknowledgementDays:ack,resolutionDays:resolution});return {id};
 });
 post('/api/hr/grievances/sla/:id/approve',disciplineRoles,async(db,req)=>{
  const setting=await row(db,'hr_grievance_sla_settings',req.params.id);checker(req,setting.created_by);
  if(setting.status!=='PENDING')throw fail('Only pending service targets can be approved.',409);
  await db.query("UPDATE hr_grievance_sla_settings SET status='SUPERSEDED' WHERE status='ACTIVE'");
  await db.query("UPDATE hr_grievance_sla_settings SET status='ACTIVE',approved_by=$2,configured_at=now() WHERE id=$1",[setting.id,req.auth.userId]);
  await audit(db,req,'hr.grievance.sla_activated','hr_grievance_sla',setting.id);return {id:setting.id};
 });
 post('/api/hr/grievances/:id/assign',grievanceRoles,async(db,req)=>{
  const g=await row(db,'hr_grievances',req.params.id);await scope(req,g.org_unit_id);
  const ethics=req.departmentAuth.roles.some(r=>r.role==='ETHICS_OFFICER');
  if((g.escalation_route==='INDEPENDENT')!==ethics)throw fail('Only the authorized handler group can assign this grievance.',403);
  const target=await db.query(`SELECT u.id,u.disabled_at,r.role,r.org_unit_id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1`,[idValue(req.body.handlerId)]);
  if(!target.rowCount||target.rows.some(x=>x.disabled_at))throw fail('Select an active grievance handler.');
  const roles=target.rows.map(x=>x.role);
  if(g.escalation_route==='INDEPENDENT'&&!roles.includes('ETHICS_OFFICER'))throw fail('Independent cases may only be assigned to a designated ethics officer.');
  if(g.escalation_route==='STANDARD'&&!roles.some(r=>disciplineRoles.includes(r)))throw fail('Standard cases may only be assigned to HR or MD reviewers.');
  if(g.implicated_role!=='OTHER'&&roles.includes(g.implicated_role))throw fail('A reviewer from the implicated leadership role cannot handle this case.');
  await assertOrgAccess({userId:target.rows[0].id,roles:target.rows.map(x=>({role:x.role,orgUnitId:x.org_unit_id}))},g.org_unit_id,db);
  const conflict=await db.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CONFLICT'",[g.id,target.rows[0].id]);if(conflict.rowCount)throw fail('This handler already disclosed a conflict and cannot be re-assigned to the case.',409);
  const sla=await db.query("SELECT acknowledgement_days,resolution_days FROM hr_grievance_sla_settings WHERE status='ACTIVE'");
  const ackDays=sla.rows[0]?.acknowledgement_days,resDays=sla.rows[0]?.resolution_days;
  await db.query(`UPDATE hr_grievances SET case_assignee_id=$2,assigned_by=$3,
   acknowledgement_due_at=coalesce(acknowledgement_due_at,CASE WHEN $4::int IS NULL THEN NULL ELSE now()+make_interval(days=>$4) END),
   resolution_due_at=coalesce(resolution_due_at,CASE WHEN $5::int IS NULL THEN NULL ELSE now()+make_interval(days=>$5) END),updated_at=now() WHERE id=$1`,[g.id,target.rows[0].id,req.auth.userId,ackDays??null,resDays??null]);
  await db.query('INSERT INTO hr_grievance_events(id,grievance_id,event_type,note,actor_id,visible_to_reporter) VALUES($1,$2,\'ASSIGNED\',$3,$4,true)',[randomUUID(),g.id,'Case assigned to an authorized handler. Deadlines follow the currently approved FDA service targets if configured.',req.auth.userId]);
  await writeAudit(db,req.auth,'hr.grievance.assigned','hr_grievance',g.id,{route:g.escalation_route,assigneeId:target.rows[0].id});return {id:g.id};
 });
 post('/api/hr/grievances/:id/claim',['ETHICS_OFFICER'],async(db,req)=>{
  const g=await row(db,'hr_grievances',req.params.id);if(g.escalation_route!=='INDEPENDENT')throw fail('Only independently routed grievances can be claimed.',403);
  if(g.case_assignee_id)throw fail('This grievance has already been assigned.',409);
  if(g.reporter_user_id===req.auth.userId)throw fail('The reporting employee cannot handle their own case.',403);
  const assignment=await db.query("SELECT 1 FROM user_roles WHERE user_id=$1 AND role='ETHICS_OFFICER' AND org_unit_id IS NULL",[req.auth.userId]);if(!assignment.rowCount)throw fail('An organization-wide ethics officer assignment is required.');
  const conflict=await db.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CONFLICT'",[g.id,req.auth.userId]);if(conflict.rowCount)throw fail('You previously declared a conflict on this case.',409);
  const sla=await db.query("SELECT acknowledgement_days,resolution_days FROM hr_grievance_sla_settings WHERE status='ACTIVE'");
  await db.query(`UPDATE hr_grievances SET case_assignee_id=$2,assigned_by=$2,
   acknowledgement_due_at=coalesce(acknowledgement_due_at,CASE WHEN $3::int IS NULL THEN NULL ELSE now()+make_interval(days=>$3) END),
   resolution_due_at=coalesce(resolution_due_at,CASE WHEN $4::int IS NULL THEN NULL ELSE now()+make_interval(days=>$4) END),updated_at=now() WHERE id=$1`,[g.id,req.auth.userId,sla.rows[0]?.acknowledgement_days??null,sla.rows[0]?.resolution_days??null]);
  await db.query('INSERT INTO hr_grievance_events(id,grievance_id,event_type,note,actor_id,visible_to_reporter) VALUES($1,$2,\'ASSIGNED\',$3,$4,true)',[randomUUID(),g.id,'Independent case assigned to designated ethics officer.',req.auth.userId]);
  await writeAudit(db,req.auth,'hr.grievance.claimed','hr_grievance',g.id,{route:'INDEPENDENT',assigneeId:req.auth.userId});return {id:g.id};
 });
 post('/api/hr/grievances/:id/conflict-check',grievanceRoles,async(db,req)=>{
  const g=await row(db,'hr_grievances',req.params.id);await scope(req,g.org_unit_id);
  if(g.case_assignee_id!==req.auth.userId)throw fail('Only the assigned case handler can declare a conflict.',403);
  const result=req.body.result;if(!['CLEAR','CONFLICT'].includes(result))throw fail('Select CLEAR or CONFLICT.');
  const note=required(req.body.reason,'Conflict-of-interest declaration and basis');
  await db.query(`INSERT INTO hr_grievance_conflict_checks(id,grievance_id,handler_id,result,note) VALUES($1,$2,$3,$4,$5)
   ON CONFLICT(grievance_id,handler_id) DO UPDATE SET result=$4,note=$5,checked_at=now()`,[randomUUID(),g.id,req.auth.userId,result,note]);
  if(result==='CONFLICT')await db.query('UPDATE hr_grievances SET case_assignee_id=NULL,assigned_by=NULL,last_conflict_check_at=now(),updated_at=now() WHERE id=$1',[g.id]);
  else await db.query('UPDATE hr_grievances SET last_conflict_check_at=now(),updated_at=now() WHERE id=$1',[g.id]);
  await db.query('INSERT INTO hr_grievance_events(id,grievance_id,event_type,note,actor_id,visible_to_reporter) VALUES($1,$2,\'CONFLICT_CHECKED\',$3,$4,false)',[randomUUID(),g.id,result==='CLEAR'?'Assigned handler declared no conflict.':'Assigned handler disclosed a conflict and was removed.',req.auth.userId]);
  await writeAudit(db,req.auth,`hr.grievance.conflict_${result.toLowerCase()}`,'hr_grievance',g.id,{handlerId:req.auth.userId});return {id:g.id,result};
 });
 post('/api/hr/grievances/:id/events',grievanceRoles,async(db,req)=>{
  const g=await row(db,'hr_grievances',req.params.id);await scope(req,g.org_unit_id);
  if(g.case_assignee_id!==req.auth.userId)throw fail('Only the conflict-cleared assigned handler may document case work.',403);
  const clear=await db.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CLEAR'",[g.id,req.auth.userId]);if(!clear.rowCount)throw fail('Complete a clear conflict check before recording investigation work.',409);
  const eventType=req.body.eventType;if(!['INVESTIGATION_NOTE','EVIDENCE_REVIEWED','RESOLUTION_RECOMMENDED'].includes(eventType))throw fail('Select an allowed investigation record type.');
  const note=required(req.body.note,'Investigation record');const visible=Boolean(req.body.visibleToReporter);
  const id=randomUUID();await db.query('INSERT INTO hr_grievance_events(id,grievance_id,event_type,note,actor_id,visible_to_reporter) VALUES($1,$2,$3,$4,$5,$6)',[id,g.id,eventType,note,req.auth.userId,visible]);
  await writeAudit(db,req.auth,'hr.grievance.investigation_recorded','hr_grievance',g.id,{eventType,visibleToReporter:visible});return {id};
 });
 get('/api/hr/grievances/:id/events',grievanceRoles,async(req,res)=>{
  const g=await row(pool,'hr_grievances',req.params.id,false);await scope(req,g.org_unit_id);
  const ethics=req.departmentAuth.roles.some(r=>r.role==='ETHICS_OFFICER');
  if((g.escalation_route==='INDEPENDENT')!==ethics||g.case_assignee_id!==req.auth.userId)throw fail('Only the assigned handler may read this case work log.',403);
  const clear=await pool.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CLEAR'",[g.id,req.auth.userId]);if(!clear.rowCount)throw fail('Conflict clearance is required before reading the investigation log.',403);
  res.json((await pool.query('SELECT id,event_type,note,actor_id,visible_to_reporter,created_at FROM hr_grievance_events WHERE grievance_id=$1 ORDER BY created_at',[g.id])).rows);
 });
 post('/api/hr/grievances/:id/advance',grievanceRoles,async(db,req)=>{
  const g=await row(db,'hr_grievances',req.params.id);await scope(req,g.org_unit_id);
  const ethics=req.departmentAuth.roles.some(r=>r.role==='ETHICS_OFFICER');
  if((g.escalation_route==='INDEPENDENT')!==ethics||g.case_assignee_id!==req.auth.userId)throw fail('Only the assigned handler on the correct case route may advance this grievance.',403);
  const clear=await db.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CLEAR'",[g.id,req.auth.userId]);if(!clear.rowCount)throw fail('Complete a clear conflict check before case action.',409);
  const allowed={SUBMITTED:['ACKNOWLEDGED'],ACKNOWLEDGED:['UNDER_REVIEW'],UNDER_REVIEW:['RESOLVED'],APPEALED:['UNDER_REVIEW']}[g.status]||[];
  if(!allowed.includes(req.body.status))throw fail('This grievance cannot move to the selected stage.',409);
  const note=required(req.body.reason,'Procedural action note');
  await db.query('UPDATE hr_grievances SET status=$2,last_action_by=$3,last_action_note=$4,updated_at=now(),resolved_at=CASE WHEN $2=\'RESOLVED\' THEN now() WHEN $2=\'UNDER_REVIEW\' THEN NULL ELSE resolved_at END WHERE id=$1',[g.id,req.body.status,req.auth.userId,note]);
  await db.query('INSERT INTO hr_grievance_events(id,grievance_id,event_type,note,actor_id,visible_to_reporter) VALUES($1,$2,\'INVESTIGATION_NOTE\',$3,$4,true)',[randomUUID(),g.id,note,req.auth.userId]);
  await writeAudit(db,req.auth,`hr.grievance.${req.body.status.toLowerCase()}`,'hr_grievance',g.id,{previousStatus:g.status});return {id:g.id};
 });
 app.post('/api/hr/grievances/:id/appeal',loadAuth,csrfRequired,route(async(req,res)=>{
  const result=await transaction(async db=>{
   const g=await row(db,'hr_grievances',req.params.id);if(g.reporter_user_id!==req.auth.userId)throw fail('Only the employee who submitted this grievance may appeal it.',403);
   if(g.status!=='RESOLVED')throw fail('Only a resolved grievance may be appealed.',409);
   const appealId=randomUUID(),reasonText=required(req.body.reason,'Appeal reason');
   await db.query("INSERT INTO hr_grievance_appeals(id,grievance_id,submitted_by,original_decision_by,reason) VALUES($1,$2,$3,$4,$5)",[appealId,g.id,req.auth.userId,g.last_action_by,reasonText]);
   await db.query("UPDATE hr_grievances SET status='APPEALED',last_action_by=$2,last_action_note='Appeal submitted for independent review.',updated_at=now() WHERE id=$1",[g.id,req.auth.userId]);
   await writeAudit(db,req.auth,'hr.grievance.appealed','hr_grievance',g.id,{orgUnitId:g.org_unit_id});return {id:appealId};
  });res.status(201).json(result);
 }));
 get('/api/hr/grievance-appeals',['ETHICS_OFFICER'],async(req,res)=>{
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||25)),offset=Math.max(0,Number(req.query.offset)||0),q=String(req.query.q||'').slice(0,200),actor=req.auth.userId;
  const where=`(assigned_to IS NULL OR assigned_to=$1) AND (status ILIKE $2 OR (assigned_to=$1 AND reason ILIKE $2))`;
  const params=[actor,`%${q}%`];
  const total=await pool.query(`SELECT count(*) FROM hr_grievance_appeals WHERE ${where}`,params);
  const rows=await pool.query(`SELECT a.id,a.grievance_id,
    CASE WHEN a.assigned_to=$1 THEN a.reason ELSE 'Unassigned appeal' END AS reason,
    a.status,a.assigned_to,a.due_at,
    CASE WHEN a.assigned_to=$1 THEN a.decision_note ELSE NULL END AS decision_note,
    a.submitted_at,g.case_reference,g.acknowledgement_due_at AS grievance_acknowledgement_due_at,
    g.resolution_due_at AS grievance_resolution_due_at
    FROM hr_grievance_appeals a JOIN hr_grievances g ON g.id=a.grievance_id
    WHERE (a.assigned_to IS NULL OR a.assigned_to=$1) AND (a.status ILIKE $2 OR (a.assigned_to=$1 AND a.reason ILIKE $2))
    ORDER BY a.submitted_at DESC LIMIT $3 OFFSET $4`,[...params,limit,offset]);
  res.json({rows:rows.rows,total:Number(total.rows[0].count),limit,offset});
 });
 post('/api/hr/grievance-appeals/:id/assign',['ETHICS_OFFICER'],async(db,req)=>{
  const a=await row(db,'hr_grievance_appeals',req.params.id),g=await row(db,'hr_grievances',a.grievance_id);
  if(a.status!=='SUBMITTED')throw fail('Only a submitted appeal can be assigned.',409);
  const target=await db.query("SELECT 1 FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND r.role='ETHICS_OFFICER' AND r.org_unit_id IS NULL AND u.disabled_at IS NULL",[idValue(req.body.handlerId)]);if(!target.rowCount)throw fail('Select an active organization-wide ethics officer.');
  if(req.body.handlerId===a.submitted_by||req.body.handlerId===a.original_decision_by||req.body.handlerId===req.auth.userId)throw fail('The appellant, original decision-maker, or assigning officer cannot review this appeal.',403);
  if(req.body.handlerId===g.case_assignee_id)throw fail('The original grievance handler cannot review its appeal.',403);
  if((await db.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CONFLICT'",[g.id,req.body.handlerId])).rowCount)throw fail('This reviewer previously disclosed a conflict and cannot be assigned.',409);
  const due=await db.query("SELECT resolution_days FROM hr_grievance_sla_settings WHERE status='ACTIVE'");
  await db.query("UPDATE hr_grievance_appeals SET assigned_to=$2,assigned_by=$3,due_at=CASE WHEN $4::int IS NULL THEN NULL ELSE now()+make_interval(days=>$4) END,status='UNDER_REVIEW' WHERE id=$1",[a.id,req.body.handlerId,req.auth.userId,due.rows[0]?.resolution_days??null]);
  await writeAudit(db,req.auth,'hr.grievance.appeal_assigned','hr_grievance',g.id,{appealId:a.id,assigneeId:req.body.handlerId});
  return {id:a.id};
 });
 post('/api/hr/grievance-appeals/:id/conflict-check',['ETHICS_OFFICER'],async(db,req)=>{
  const a=await row(db,'hr_grievance_appeals',req.params.id),g=await row(db,'hr_grievances',a.grievance_id);
  if(a.assigned_to!==req.auth.userId)throw fail('Only the assigned appeal reviewer can declare a conflict.',403);
  if(!['CLEAR','CONFLICT'].includes(req.body.result))throw fail('Select CLEAR or CONFLICT.');
  await db.query(`INSERT INTO hr_grievance_conflict_checks(id,grievance_id,handler_id,result,note) VALUES($1,$2,$3,$4,$5)
   ON CONFLICT(grievance_id,handler_id) DO UPDATE SET result=$4,note=$5,checked_at=now()`,[randomUUID(),g.id,req.auth.userId,req.body.result,required(req.body.reason,'Appeal conflict declaration')]);
  if(req.body.result==='CONFLICT')await db.query("UPDATE hr_grievance_appeals SET assigned_to=NULL,assigned_by=NULL,status='SUBMITTED' WHERE id=$1",[a.id]);
  await writeAudit(db,req.auth,`hr.grievance.appeal_conflict_${req.body.result.toLowerCase()}`,'hr_grievance',g.id,{handlerId:req.auth.userId});return {id:a.id,result:req.body.result};
 });
 post('/api/hr/grievance-appeals/:id/decide',['ETHICS_OFFICER'],async(db,req)=>{
  const a=await row(db,'hr_grievance_appeals',req.params.id),g=await row(db,'hr_grievances',a.grievance_id);if(a.status!=='UNDER_REVIEW'||a.assigned_to!==req.auth.userId)throw fail('Only the assigned appeal reviewer may decide this appeal.',403);
  checker(req,a.submitted_by);if(a.original_decision_by)checker(req,a.original_decision_by);
  if(!(await db.query("SELECT 1 FROM hr_grievance_conflict_checks WHERE grievance_id=$1 AND handler_id=$2 AND result='CLEAR'",[g.id,req.auth.userId])).rowCount)throw fail('Complete a clear appeal conflict check before deciding.',409);
  if(!['UPHELD','VARIED','REMANDED'].includes(req.body.status))throw fail('Select an appeal outcome.');
  const note=required(req.body.reason,'Appeal decision and grounds');
  await db.query('UPDATE hr_grievance_appeals SET status=$2,decision_note=$3,decided_by=$4,decided_at=now() WHERE id=$1',[a.id,req.body.status,note,req.auth.userId]);
  const next=req.body.status==='REMANDED'?'APPEALED':'CLOSED';
  await db.query('UPDATE hr_grievances SET status=$2,last_action_by=$3,last_action_note=$4,updated_at=now() WHERE id=$1',[g.id,next,req.auth.userId,'Independent appeal outcome recorded.']);
  await db.query('INSERT INTO hr_grievance_events(id,grievance_id,event_type,note,actor_id,visible_to_reporter) VALUES($1,$2,\'APPEAL_DECIDED\',$3,$4,true)',[randomUUID(),g.id,note,req.auth.userId]);
  await writeAudit(db,req.auth,'hr.grievance.appeal_decided','hr_grievance',g.id,{outcome:req.body.status});return {id:a.id};
 });

 // Succession planning is restricted to leadership and records readiness actions,
 // not a promise or automatic appointment.
 get('/api/hr/succession/plans',disciplineRoles,(req,res)=>list(req,res,'hr_succession_plan_directory',['reference','position_code','position_title','office_name','criticality','continuity_risk','status']));
 post('/api/hr/succession/plans',disciplineRoles,async(db,req)=>{
  const b=req.body,p=await row(db,'hr_positions',b.positionId);await office(db,req,p.org_unit_id);
  if(!['LOW','MEDIUM','HIGH','CRITICAL'].includes(b.criticality))throw fail('Select a succession risk level.');
  const id=randomUUID();await db.query('INSERT INTO hr_succession_plans(id,position_id,org_unit_id,reference,criticality,continuity_risk,required_competencies,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,p.id,p.org_unit_id,required(b.reference,'Plan reference',100),b.criticality,required(b.continuityRisk,'Continuity risk'),required(b.requiredCompetencies,'Required competencies'),req.auth.userId]);
  await audit(db,req,'hr.succession.plan_created','succession_plan',id,{positionId:p.id,criticality:b.criticality});return {id};
 });
 post('/api/hr/succession/plans/:id/decide',disciplineRoles,async(db,req)=>{
  const p=await row(db,'hr_succession_plans',req.params.id);await scope(req,p.org_unit_id);checker(req,p.created_by);
  const allowed={DRAFT:['ACTIVE','CLOSED'],ACTIVE:['CLOSED']}[p.status]||[];if(!allowed.includes(req.body.status))throw fail('This succession plan cannot move to the selected stage.',409);
  await db.query('UPDATE hr_succession_plans SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[p.id,req.body.status,req.auth.userId,required(req.body.reason,'Independent plan decision')]);
  await audit(db,req,`hr.succession.plan_${req.body.status.toLowerCase()}`,'succession_plan',p.id);return {id:p.id};
 });
 get('/api/hr/succession/candidates',disciplineRoles,(req,res)=>list(req,res,'hr_succession_candidate_directory',['plan_reference','position_title','staff_number','employee_name','readiness','competency_gap','development_actions','office_name']));
 post('/api/hr/succession/candidates',disciplineRoles,async(db,req)=>{
  const b=req.body,p=await row(db,'hr_succession_plans',b.planId),e=await row(db,'hr_employees',b.employeeId);await scope(req,p.org_unit_id);await scope(req,e.org_unit_id);
  if(p.status==='CLOSED'||e.status!=='ACTIVE'||p.org_unit_id!==e.org_unit_id)throw fail('Select an active employee in the position office and a non-closed plan.');
  if(e.position_id===p.position_id)throw fail('The incumbent cannot be nominated as successor to the same position.');
  if(!['READY_NOW','WITHIN_1_2_YEARS','WITHIN_3_5_YEARS','DEVELOPMENT_REQUIRED'].includes(b.readiness))throw fail('Select a readiness horizon.');
  const id=randomUUID();await db.query('INSERT INTO hr_succession_candidates(id,plan_id,employee_id,org_unit_id,readiness,competency_gap,development_actions,nominated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,p.id,e.id,e.org_unit_id,b.readiness,required(b.competencyGap,'Competency gap'),required(b.developmentActions,'Development actions'),req.auth.userId]);
  await audit(db,req,'hr.succession.candidate_nominated','succession_candidate',id,{planId:p.id,employeeId:e.id,readiness:b.readiness});return {id};
 });

 // Training needs originate in documented performance, supervision, workforce or policy gaps.
 get('/api/hr/training/needs',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_training_needs_directory',['staff_number','employee_name','competency','competency_code','assessment_source','priority','status','program_title','office_name']));
 post('/api/hr/training/needs',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,e=await row(db,'hr_employees',b.employeeId);await scope(req,e.org_unit_id);if(e.status!=='ACTIVE')throw fail('Training needs can only be created for active employees.');
  const competency=b.competencyId?await row(db,'hr_competencies',b.competencyId,false):null;if(competency&&competency.status!=='ACTIVE')throw fail('Select an active competency.');
  if(!['PERFORMANCE_REVIEW','SUPERVISOR_ASSESSMENT','WORKFORCE_PLAN','COMPLIANCE_REQUIREMENT','EMPLOYEE_REQUEST','OTHER'].includes(b.assessmentSource)||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(b.priority))throw fail('Select a valid assessment source and priority.');
  const id=randomUUID();await db.query('INSERT INTO hr_training_needs(id,employee_id,org_unit_id,competency,competency_id,current_level,required_level,assessment_source,priority,rationale,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,e.id,e.org_unit_id,competency?.name||required(b.competency,'Competency',160),competency?.id||null,required(b.currentLevel,'Current skill level',300),required(b.requiredLevel,'Required skill level',300),b.assessmentSource,b.priority,required(b.rationale,'Evidence and rationale'),req.auth.userId]);
  await audit(db,req,'hr.training_need.identified','training_need',id,{employeeId:e.id,priority:b.priority,source:b.assessmentSource});return {id};
 });
 post('/api/hr/training/needs/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const n=await row(db,'hr_training_needs',req.params.id);await scope(req,n.org_unit_id);checker(req,n.created_by);
  const allowed={IDENTIFIED:['APPROVED','DECLINED'],APPROVED:['SCHEDULED','CLOSED'],SCHEDULED:['CLOSED']}[n.status]||[];if(!allowed.includes(req.body.status))throw fail('This training need cannot move to the selected stage.',409);
  let enrollmentId=null;
  if(req.body.status==='SCHEDULED'){
   const en=await row(db,'hr_training_enrollments',req.body.enrollmentId,false);if(en.employee_id!==n.employee_id||en.status==='REJECTED'||en.status==='WITHDRAWN')throw fail('Link a valid training enrollment for the same employee.',409);enrollmentId=en.id;
  }
  const note=required(req.body.reason,'Independent training-need decision');
  await db.query('UPDATE hr_training_needs SET status=$2,enrollment_id=coalesce($3,enrollment_id),reviewed_by=$4,decision_note=$5,updated_at=now() WHERE id=$1',[n.id,req.body.status,enrollmentId,req.auth.userId,note]);
  await audit(db,req,`hr.training_need.${req.body.status.toLowerCase()}`,'training_need',n.id,{enrollmentId});return {id:n.id};
 });
 get('/api/hr/training/impact',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_training_impact_directory',['program_code','program_title','staff_number','employee_name','measure','outcome','evaluation_method','office_name']));
 post('/api/hr/training/impact',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,e=await row(db,'hr_training_enrollments',b.enrollmentId);await scope(req,e.org_unit_id);
  if(e.status!=='COMPLETED')throw fail('Training impact can only be assessed after completion is independently verified.',409);
  checker(req,e.completed_by);if(!['IMPROVED','PARTIAL_IMPROVEMENT','NO_MEASURED_CHANGE','NOT_ASSESSED'].includes(b.outcome))throw fail('Select a valid measured outcome.');
  if((await db.query('SELECT 1 FROM hr_training_impact_assessments WHERE enrollment_id=$1',[e.id])).rowCount)throw fail('A training impact assessment already exists for this enrollment.',409);
  const id=randomUUID();await db.query('INSERT INTO hr_training_impact_assessments(id,enrollment_id,employee_id,org_unit_id,measure,baseline,observed_result,outcome,evaluation_method,evidence_reference,assessed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,e.id,e.employee_id,e.org_unit_id,required(b.measure,'Workplace performance measure'),required(b.baseline,'Baseline before training'),required(b.observedResult,'Observed result after training'),b.outcome,required(b.evaluationMethod,'Evaluation method'),required(b.evidenceReference,'Evidence reference'),req.auth.userId]);
  await audit(db,req,'hr.training.impact_assessed','training_impact',id,{enrollmentId:e.id,outcome:b.outcome});return {id};
 });

 // Configurable compliance records only express requirements approved and entered by FDA.
 get('/api/hr/policies',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_employment_policies',['policy_code','title','category','authority_reference','status'],'',''));
 post('/api/hr/policies',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,version=numeric(b.version,1,100);if(!Number.isInteger(version))throw fail('Policy version must be a whole number.');
  if(!['RECRUITMENT','EMPLOYMENT_TERMS','LEAVE','ATTENDANCE','PAYROLL','SAFEGUARDING','EQUALITY','DATA_PROTECTION','PERFORMANCE','TRAINING','OTHER'].includes(b.category))throw fail('Select a policy category.');
  const prior=await db.query('SELECT max(version)::integer AS version FROM hr_employment_policies WHERE policy_code=$1',[required(b.policyCode,'Policy code',80)]);
  if(Number(prior.rows[0].version||0)+1!==version)throw fail('Create the next sequential policy version; existing versions are retained.');
  const start=dateValue(b.effectiveFrom),review=dateValue(b.reviewDate);if(review<start)throw fail('Policy review date must be on or after its effective date.');
  const id=randomUUID();await db.query('INSERT INTO hr_employment_policies(id,policy_code,version,title,category,authority_reference,requirements_summary,effective_from,review_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,b.policyCode,version,required(b.title,'Policy title',200),b.category,required(b.authorityReference,'Approved law, regulation or FDA policy reference'),required(b.requirementsSummary,'Requirements summary'),start,review,req.auth.userId]);
  await audit(db,req,'hr.policy.version_created','employment_policy',id,{policyCode:b.policyCode,version});return {id};
 });
 post('/api/hr/policies/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const p=await row(db,'hr_employment_policies',req.params.id);checker(req,p.approved_by||p.created_by);
  const allowed={DRAFT:['ACTIVE'],ACTIVE:['RETIRED']}[p.status]||[];if(!allowed.includes(req.body.status))throw fail('This policy version cannot move to the selected stage.',409);
  if(req.body.status==='ACTIVE'){
   const now=new Date().toISOString().slice(0,10);if(dbDate(p.review_date)<now)throw fail('The policy review date has passed; create and approve a new reviewed version.');
   await db.query("UPDATE hr_employment_policies SET status='RETIRED' WHERE policy_code=$1 AND status='ACTIVE'",[p.policy_code]);
  }
  await db.query('UPDATE hr_employment_policies SET status=$2,approved_by=$3,approved_at=now() WHERE id=$1',[p.id,req.body.status,req.auth.userId]);
  await audit(db,req,`hr.policy.${req.body.status.toLowerCase()}`,'employment_policy',p.id,{policyCode:p.policy_code,version:p.version,reason:required(req.body.reason,'Policy approval / retirement basis')});return {id:p.id};
 });
 get('/api/hr/policy-compliance',DEPARTMENT_ROLES.hr,(req,res)=>list(req,res,'hr_policy_compliance_directory',['policy_code','policy_title','staff_number','employee_name','status','evidence_reference','office_name']));
 post('/api/hr/policy-compliance',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const b=req.body,p=await row(db,'hr_employment_policies',b.policyId,false),e=await row(db,'hr_employees',b.employeeId);await scope(req,e.org_unit_id);
  const today=new Date().toISOString().slice(0,10);if(p.status!=='ACTIVE'||dbDate(p.effective_from)>today||dbDate(p.review_date)<today)throw fail('Assign only a currently effective, approved policy version.',409);
  const dueDate=dateValue(b.dueDate);if(dueDate<today)throw fail('Compliance due date must not be in the past.');
  const id=randomUUID();await db.query('INSERT INTO hr_policy_compliance(id,policy_id,employee_id,org_unit_id,due_date,assigned_by) VALUES($1,$2,$3,$4,$5,$6)',[id,p.id,e.id,e.org_unit_id,dueDate,req.auth.userId]);
  await audit(db,req,'hr.policy_compliance.assigned','policy_compliance',id,{policyId:p.id,employeeId:e.id});return {id};
 });
 post('/api/hr/policy-compliance/:id/decide',DEPARTMENT_ROLES.hr,async(db,req)=>{
  const c=await row(db,'hr_policy_compliance',req.params.id);await scope(req,c.org_unit_id);checker(req,c.assigned_by);
  if(c.status!=='PENDING'||!['COMPLIANT','NON_COMPLIANT','EXEMPT'].includes(req.body.status))throw fail('Only pending checks can be independently reviewed.',409);
  const evidence=req.body.status==='EXEMPT'?null:required(req.body.evidenceReference,'Evidence reference');
  await db.query('UPDATE hr_policy_compliance SET status=$2,evidence_reference=$3,review_note=$4,assessed_by=$5,assessed_at=now() WHERE id=$1',[c.id,req.body.status,evidence,required(req.body.reason,'Compliance review note'),req.auth.userId]);
  await audit(db,req,`hr.policy_compliance.${req.body.status.toLowerCase()}`,'policy_compliance',c.id,{policyId:c.policy_id,employeeId:c.employee_id});return {id:c.id};
 });

 const histories={procurement_contract:['procurement_contracts',DEPARTMENT_ROLES.procurement],employee:['hr_employees',DEPARTMENT_ROLES.hr],employment_contract:['hr_employment_contracts',DEPARTMENT_ROLES.hr],leave:['hr_leave_requests',DEPARTMENT_ROLES.hr],vacancy:['hr_vacancies',DEPARTMENT_ROLES.hr],application:['hr_application_directory',DEPARTMENT_ROLES.hr],onboarding:['hr_onboarding_tasks',DEPARTMENT_ROLES.hr],training_program:['hr_training_programs',DEPARTMENT_ROLES.hr],training_enrollment:['hr_training_enrollments',DEPARTMENT_ROLES.hr],performance_cycle:['hr_performance_cycles',DEPARTMENT_ROLES.hr],performance_review:['hr_performance_review_directory',DEPARTMENT_ROLES.hr],attendance:['hr_attendance',DEPARTMENT_ROLES.hr],disciplinary_case:['hr_disciplinary_cases',['HR_DIRECTOR','MANAGING_DIRECTOR']],grievance:['hr_grievances',['HR_DIRECTOR','MANAGING_DIRECTOR']],succession_plan:['hr_succession_plans',['HR_DIRECTOR','MANAGING_DIRECTOR']],succession_candidate:['hr_succession_candidates',DEPARTMENT_ROLES.hr],training_need:['hr_training_needs',DEPARTMENT_ROLES.hr],training_impact:['hr_training_impact_assessments',DEPARTMENT_ROLES.hr],policy_compliance:['hr_policy_compliance',DEPARTMENT_ROLES.hr],hr_position:['hr_positions',DEPARTMENT_ROLES.hr],competency:['hr_competencies',DEPARTMENT_ROLES.hr,true],competency_assessment:['hr_employee_competency_assessments',DEPARTMENT_ROLES.hr],succession_milestone:['hr_succession_development_milestones',DEPARTMENT_ROLES.hr],training_budget:['hr_training_budgets',DEPARTMENT_ROLES.hr],hr_grievance_sla:['hr_grievance_sla_settings',DEPARTMENT_ROLES.hr,true],employment_policy:['hr_employment_policies',DEPARTMENT_ROLES.hr,true],journal:['gl_journals',DEPARTMENT_ROLES.finance],finance_budget_revision:['finance_budget_revisions',DEPARTMENT_ROLES.finance],procurement_plan:['procurement_plans',DEPARTMENT_ROLES.procurement],asset:['assets',DEPARTMENT_ROLES.assets],fleet_vehicle:['fleet_vehicles',DEPARTMENT_ROLES.assets],facility:['asset_facilities',DEPARTMENT_ROLES.assets],insurance_policy:['asset_insurance_policies',DEPARTMENT_ROLES.assets],insurance_claim:['asset_insurance_claims',DEPARTMENT_ROLES.assets],asset_incident:['asset_incidents',['MANAGING_DIRECTOR','ASSET_OFFICER','INTERNAL_AUDITOR']],asset_accounting_policy:['asset_accounting_policies',DEPARTMENT_ROLES.finance,true],field_device_acceptance:['field_device_acceptance',DEPARTMENT_ROLES.assets]};
 app.get('/api/departments/:type/:id/history',loadAuth,route(async(req,res)=>{
  const config=histories[req.params.type];if(!config)throw fail('Unknown record type.',404);
  req.departmentAuth=departmentAuth(req.auth,config[1]);const r=await row(pool,config[0],req.params.id,false);if(!config[2])await scope(req,r.org_unit_id);
  if(req.params.type==='grievance'&&r.restricted_to_md&&!req.departmentAuth.roles.some(x=>x.role==='MANAGING_DIRECTOR'))throw fail('This grievance is restricted to the Managing Director.',403);
  res.json((await pool.query('SELECT action,actor_role,event_data,created_at,event_hash FROM audit_events WHERE entity_type=$1 AND entity_id=$2 ORDER BY sequence DESC LIMIT 100',[req.params.type,r.id])).rows);
 }));
 return {createJournal};
}
