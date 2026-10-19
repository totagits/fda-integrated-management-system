import { randomUUID } from 'node:crypto';
import { departmentAuth, DEPARTMENT_ROLES as R, fail, required, idValue, dateValue } from './departments.js';
import { parseMinorUnits } from './domain.js';
import { parseBands, calculateStatutory } from './statutory-payroll.js';
const finance=R.financeWrite, payrollRead=[...R.hr,...R.finance];
const positive=v=>{const n=parseMinorUnits(v);if(n<=0n)throw fail('Amount must be positive.');return n;};
const decimal=v=>{const n=BigInt(v);return `${n/100n}.${String(n%100n).padStart(2,'0')}`;};
const currency=v=>{if(!['USD','LRD'].includes(v))throw fail('Select USD or LRD.');return v;};
const rateInput=v=>{const n=Number(v);if(!Number.isInteger(n)||n<0||n>10000)throw fail('Enter a statutory rate in basis points from 0 to 10000.');return n;};
const different=(req,id)=>{if(req.auth.userId===id)throw fail('A different authorized officer must approve.',403);};
const integer=(v,min,max)=>{const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)throw fail(`Enter a whole number between ${min} and ${max}.`);return n;};
const stockQuantity=(v,allowZero=false)=>{const s=String(v??'').trim();if(!/^\d{1,11}(\.\d{1,3})?$/.test(s))throw fail('Enter a quantity with no more than three decimal places.');const [whole,frac='']=s.split('.'),milli=BigInt(whole)*1000n+BigInt((frac+'000').slice(0,3));if(!allowZero&&milli<=0n)throw fail('Quantity must be greater than zero.');return {milli,value:`${whole}.${(frac+'000').slice(0,3)}`};};
const stockValue=(milli,unitCost)=>((milli*BigInt(unitCost)+500n)/1000n).toString();
export function registerEnterprise(app,deps){
 const {pool,transaction,writeAudit,route,loadAuth,csrfRequired,scopedUnits,assertOrgAccess,createJournal}=deps;
 const guard=roles=>(req,_res,next)=>{try{req.departmentAuth=departmentAuth(req.auth,roles);next();}catch(e){next(e);}};
 const row=async(db,table,id,lock=true)=>{const r=await db.query(`SELECT * FROM ${table} WHERE id=$1${lock?' FOR UPDATE':''}`,[idValue(id)]);if(!r.rowCount)throw fail('Record not found.',404);return r.rows[0];};
 const scope=(req,id,db=pool)=>assertOrgAccess(req.departmentAuth,id,db);
 const audit=(db,req,action,type,id,data={})=>writeAudit(db,req.departmentAuth,action,type,id,data);
 const get=(path,roles,fn)=>app.get(path,loadAuth,guard(roles),route(fn));
 const post=(path,roles,fn)=>app.post(path,loadAuth,csrfRequired,guard(roles),route(async(req,res)=>res.json(await transaction(db=>{req.departmentDb=db;return fn(db,req);}))));
 const list=(table,columns,roles,path)=>get(path,roles,async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth),offset=integer(req.query.offset||0,0,1000000),limit=integer(req.query.limit||25,1,100),q=`%${String(req.query.q||'').slice(0,200)}%`;
  const where=`($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) AND (${columns.map(c=>`${c}::text ILIKE $2`).join(' OR ')})`;
  const count=await pool.query(`SELECT count(*) FROM ${table} WHERE ${where}`,[units,q]);
  res.json({rows:(await pool.query(`SELECT * FROM ${table} WHERE ${where} ORDER BY id DESC LIMIT $3 OFFSET $4`,[units,q,limit,offset])).rows,total:Number(count.rows[0].count),limit,offset});
 });
 const parent=async(db,req,table)=>{const r=await row(db,table,req.params.id);await scope(req,r.org_unit_id,db);return r;};
 const account=async(db,id,type)=>{const a=await row(db,'gl_accounts',id,false);if(!a.active||a.account_type!==type)throw fail(`Select an active ${type.toLowerCase()} account.`);return a.id;};
 const journal=async(db,req,source,lines,description)=>createJournal(db,req,{...req.body,orgUnitId:source.org_unit_id,currency:source.currency,description,lines});

 list('payroll_policies',['reference','status'],finance,'/api/payroll/policies');
 post('/api/payroll/policies',finance,async(db,req)=>{
  const b=req.body,unit=idValue(b.orgUnitId),start=dateValue(b.effectiveFrom),end=dateValue(b.effectiveTo);await scope(req,unit,db);if(start>end)throw fail('Policy end date must follow its start date.');
  const overlap=await db.query("SELECT 1 FROM payroll_policies WHERE org_unit_id=$1 AND status='APPROVED' AND effective_from<=$3::date AND effective_to>=$2::date",[unit,start,end]);if(overlap.rowCount)throw fail('An approved policy overlaps these dates.',409);
  const bands=parseBands(b.bands);const id=randomUUID();await db.query('INSERT INTO payroll_policies(id,org_unit_id,reference,effective_from,effective_to,bands,employee_bps,employer_bps,injury_bps,non_cash_exemption_lrd_minor,basis,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[id,unit,required(b.reference,'Policy reference',100),start,end,bands,rateInput(b.employeeRateBps),rateInput(b.employerRateBps),rateInput(b.injuryRateBps),parseMinorUnits(b.nonCashExemptionLrd||'0').toString(),required(b.basis,'Official circular / law and effective-date basis',3000),req.auth.userId]);await audit(db,req,'payroll.policy_created','payroll_policy',id,{reference:b.reference,effectiveFrom:start,effectiveTo:end});return {id};
 });
 post('/api/payroll/policies/:id/decide',finance,async(db,req)=>{
  const p=await parent(db,req,'payroll_policies');different(req,p.created_by);if(p.status!=='DRAFT')throw fail('Only draft policies can be decided.',409);if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Select approve or reject.');
  if(req.body.status==='APPROVED'){const conflict=await db.query("SELECT 1 FROM payroll_policies WHERE org_unit_id=$1 AND status='APPROVED' AND id<>$2 AND effective_from<=$4::date AND effective_to>=$3::date",[p.org_unit_id,p.id,p.effective_from,p.effective_to]);if(conflict.rowCount)throw fail('Another approved policy overlaps these dates.',409);}
  await db.query('UPDATE payroll_policies SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[p.id,req.body.status,req.auth.userId,required(req.body.reason,'Independent rule review note')]);await audit(db,req,`payroll.policy_${req.body.status.toLowerCase()}`,'payroll_policy',p.id);return {id:p.id};
 });
 list('payroll_register',['reference','status'],payrollRead,'/api/payroll/runs');
 post('/api/payroll/runs',R.hr,async(db,req)=>{
  const b=req.body;await scope(req,idValue(b.orgUnitId),db);const start=dateValue(b.startDate),end=dateValue(b.endDate);if(start>end)throw fail('Payroll end must follow start.');
  const existing=await db.query("SELECT 1 FROM payroll_runs WHERE org_unit_id=$1 AND currency=$2 AND status<>'REJECTED' AND start_date<=$4::date AND end_date>=$3::date",[b.orgUnitId,currency(b.currency),start,end]);if(existing.rowCount)throw fail('An overlapping payroll run already exists.',409);
  const id=randomUUID();await db.query('INSERT INTO payroll_runs(id,reference,org_unit_id,start_date,end_date,currency,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,required(b.reference,'Payroll reference',100),b.orgUnitId,start,end,b.currency,req.auth.userId]);await audit(db,req,'payroll.created','payroll',id);return {id};
 });
 get('/api/payroll/runs/:id/lines',payrollRead,async(req,res)=>{
  const p=await parent(pool,req,'payroll_runs');res.json((await pool.query('SELECT l.*,e.staff_number,e.full_name,(gross_minor-deduction_minor) AS net_minor FROM payroll_lines l JOIN hr_employees e ON e.id=l.employee_id WHERE run_id=$1 ORDER BY e.staff_number',[p.id])).rows);
 });
 post('/api/payroll/runs/:id/line',R.hr,async(db,req)=>{
  const p=await parent(db,req,'payroll_runs');if(p.status!=='DRAFT')throw fail('Only draft payroll lines can be changed.',409);
  const e=await row(db,'hr_employees',req.body.employeeId);if(e.org_unit_id!==p.org_unit_id||e.status!=='ACTIVE')throw fail('Select an active employee in this office.');
  const employment=await db.query('SELECT 1 FROM hr_employees WHERE id=$1 AND start_date<=$2::date',[e.id,p.end_date]);if(!employment.rowCount)throw fail('Employee starts after the payroll period.');
  const duplicate=await db.query("SELECT 1 FROM payroll_lines l JOIN payroll_runs r ON r.id=l.run_id WHERE l.employee_id=$1 AND r.id<>$2 AND r.status<>'REJECTED' AND r.currency=$3 AND r.start_date<=$5::date AND r.end_date>=$4::date",[e.id,p.id,p.currency,p.start_date,p.end_date]);if(duplicate.rowCount)throw fail('Employee already appears in an overlapping payroll run.',409);
  const first=new Date(`${p.start_date.toISOString?.().slice(0,10)||p.start_date}T00:00:00Z`),last=new Date(`${p.end_date.toISOString?.().slice(0,10)||p.end_date}T00:00:00Z`);if(first.getUTCDate()!==1||first.getUTCFullYear()!==last.getUTCFullYear()||first.getUTCMonth()!==last.getUTCMonth()||last.getUTCDate()!==new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth()+1,0)).getUTCDate())throw fail('Statutory payroll requires one complete calendar month.');
  const policyResult=await db.query("SELECT * FROM payroll_policies WHERE org_unit_id=$1 AND status='APPROVED' AND effective_from<=$3::date AND effective_to>=$2::date ORDER BY effective_from DESC LIMIT 2",[p.org_unit_id,p.start_date,p.end_date]);if(policyResult.rowCount!==1)throw fail('Exactly one approved statutory policy must cover the complete payroll month.',409);const policy=policyResult.rows[0];
  const gross=positive(req.body.gross),nonCashBenefits=parseMinorUnits(req.body.nonCashBenefits||'0'),taxable=req.body.taxable?parseMinorUnits(req.body.taxable):gross+nonCashBenefits,pensionable=parseMinorUnits(req.body.pensionable||req.body.gross),other=parseMinorUnits(req.body.otherDeduction||req.body.deduction||'0');if(other<0n)throw fail('Other deductions cannot be negative.');if(taxable<gross+nonCashBenefits)throw fail('Taxable earnings must include all cash gross pay and the reported non-cash benefits before the legal exemption.');
  const calculation=calculateStatutory({bands:policy.bands,employee_bps:policy.employee_bps,employer_bps:policy.employer_bps,injury_bps:policy.injury_bps,non_cash_exemption_lrd_minor:policy.non_cash_exemption_lrd_minor},{gross:req.body.gross,taxable:decimal(taxable),pensionable:decimal(pensionable),nonCashBenefits:decimal(nonCashBenefits),other:req.body.otherDeduction||req.body.deduction||'0',currency:p.currency,fx:req.body.lrdPerUnit||'1'});
  const deduction=BigInt(calculation.deductions),employer=BigInt(calculation.employerPension)+BigInt(calculation.injury);const basis=required(req.body.basis,'Salary, earnings base and benefit valuation reference',3000);
  await db.query('INSERT INTO payroll_lines(id,run_id,employee_id,gross_minor,deduction_minor,basis,prepared_by,policy_id,calculation,employer_minor) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(run_id,employee_id) DO UPDATE SET gross_minor=EXCLUDED.gross_minor,deduction_minor=EXCLUDED.deduction_minor,basis=EXCLUDED.basis,prepared_by=EXCLUDED.prepared_by,policy_id=EXCLUDED.policy_id,calculation=EXCLUDED.calculation,employer_minor=EXCLUDED.employer_minor',[randomUUID(),p.id,e.id,gross.toString(),deduction.toString(),basis,req.auth.userId,policy.id,calculation,employer.toString()]);await audit(db,req,'payroll.statutory_line_calculated','payroll',p.id,{employeeId:e.id,policyId:policy.id,calculation});return {id:p.id,calculation};
 });
 post('/api/payroll/runs/:id/remove-line',R.hr,async(db,req)=>{
  const p=await parent(db,req,'payroll_runs');if(p.status!=='DRAFT')throw fail('Only draft payroll can be edited.',409);
  const removed=await db.query('DELETE FROM payroll_lines WHERE run_id=$1 AND employee_id=$2 RETURNING employee_id,gross_minor,deduction_minor',[p.id,idValue(req.body.employeeId)]);if(!removed.rowCount)throw fail('Employee is not in this run.',404);await audit(db,req,'payroll.draft_line_removed','payroll',p.id,{...removed.rows[0],reason:required(req.body.reason,'Removal reason')});return {id:p.id};
 });
 post('/api/payroll/runs/:id/submit',R.hr,async(db,req)=>{
  const p=await parent(db,req,'payroll_runs');if(p.status!=='DRAFT')throw fail('Only draft payroll can be submitted.',409);
  const lines=await db.query('SELECT * FROM payroll_lines WHERE run_id=$1',[p.id]);if(!lines.rowCount)throw fail('Add payroll lines first.');
  await db.query("UPDATE payroll_runs SET status='SUBMITTED' WHERE id=$1",[p.id]);await audit(db,req,'payroll.submitted','payroll',p.id);return {id:p.id};
 });
 post('/api/payroll/runs/:id/decide',finance,async(db,req)=>{
  const p=await parent(db,req,'payroll_runs');different(req,p.created_by);const prepared=await db.query('SELECT 1 FROM payroll_lines WHERE run_id=$1 AND prepared_by=$2',[p.id,req.auth.userId]);if(prepared.rowCount)throw fail('A payroll line preparer cannot approve the run.',403);if(p.status!=='SUBMITTED')throw fail('Payroll is not awaiting approval.',409);if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Select approve or reject.');
  await db.query('UPDATE payroll_runs SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[p.id,req.body.status,req.auth.userId,required(req.body.reason,'Decision note')]);await audit(db,req,`payroll.${req.body.status.toLowerCase()}`,'payroll',p.id);return {id:p.id};
 });
 post('/api/payroll/runs/:id/journal',finance,async(db,req)=>{
  const p=await parent(db,req,'payroll_runs');if(p.status==='JOURNALED'){const prior=await row(db,'gl_journals',p.journal_id);if(prior.status!=='VOID')throw fail('Payroll already has a journal.',409);}else if(p.status!=='APPROVED')throw fail('Payroll must be approved.',409);
  const t=(await db.query("SELECT sum(gross_minor)::text AS gross,sum(deduction_minor)::text AS deductions,coalesce(sum((calculation->>'paye')::bigint),0)::text AS paye,coalesce(sum((calculation->>'employee')::bigint),0)::text AS employee_pension,coalesce(sum((calculation->>'employerPension')::bigint),0)::text AS employer_pension,coalesce(sum((calculation->>'injury')::bigint),0)::text AS injury,coalesce(sum((calculation->>'other')::bigint),0)::text AS other FROM payroll_lines WHERE run_id=$1",[p.id])).rows[0];
  const expense=await account(db,req.body.expenseAccountId,'EXPENSE'),payable=await account(db,req.body.payableAccountId,'LIABILITY'),lines=[{accountId:expense,debit:decimal(t.gross)}],deductions=BigInt(t.deductions),net=BigInt(t.gross)-deductions;
  const optionalLiability=async(field,total)=>{const n=BigInt(total);if(n===0n)return;if(!req.body[field])throw fail(`Select an account for ${field}.`);const a=await account(db,req.body[field],'LIABILITY');if(a===payable)throw fail('Use separate net-pay and statutory liability accounts.');lines.push({accountId:a,credit:decimal(n)});};
  lines.push({accountId:payable,credit:decimal(net)});await optionalLiability('payeAccountId',t.paye);await optionalLiability('pensionAccountId',t.employee_pension);await optionalLiability('otherDeductionAccountId',t.other);
  const employerCost=BigInt(t.employer_pension)+BigInt(t.injury);if(employerCost>0n){const ee=await account(db,req.body.employerExpenseAccountId,'EXPENSE');if(ee===expense)lines[0].debit=decimal(BigInt(t.gross)+employerCost);else lines.push({accountId:ee,debit:decimal(employerCost)});await optionalLiability('employerLiabilityAccountId',employerCost);}
  const j=await journal(db,req,p,lines,`Payroll accrual ${p.reference}`);await db.query("UPDATE payroll_runs SET status='JOURNALED',journal_id=$2 WHERE id=$1",[p.id,j.id]);await audit(db,req,'payroll.journal_created','payroll',p.id,{journalId:j.id});return j;
 });
 app.get('/api/payroll/my-payslips',loadAuth,route(async(req,res)=>res.json((await pool.query("SELECT r.reference,r.start_date,r.end_date,r.currency,l.gross_minor,l.deduction_minor,(l.gross_minor-l.deduction_minor) AS net_minor,'ACCRUED_NOT_PAYMENT_CONFIRMATION' AS status FROM payroll_lines l JOIN payroll_runs r ON r.id=l.run_id JOIN hr_employees e ON e.id=l.employee_id JOIN gl_journals j ON j.id=r.journal_id WHERE e.user_id=$1 AND j.status='POSTED' ORDER BY r.end_date DESC LIMIT 100",[req.auth.userId])).rows)));
 list('inventory_register',['sku','name','unit_of_measure','office_name'],R.assets,'/api/inventory/items');
 post('/api/inventory/items',R.assetWrite,async(db,req)=>{
  const b=req.body,unit=idValue(b.orgUnitId);await scope(req,unit,db);const opening=stockQuantity(b.openingQuantity||'0',true),reorder=stockQuantity(b.reorderPoint,true),cost=positive(b.estimatedUnitCost);
  const id=randomUUID();await db.query('INSERT INTO inventory_items(id,org_unit_id,sku,name,unit_of_measure,quantity_on_hand,reorder_point,estimated_unit_cost_minor,currency,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,unit,required(b.sku,'Stock keeping unit',80),required(b.name,'Item name',200),required(b.unitOfMeasure,'Unit of measure',40),opening.value,reorder.value,cost.toString(),currency(b.currency),req.auth.userId]);
  if(opening.milli>0n)await db.query("INSERT INTO inventory_movements(id,item_id,movement,quantity,value_minor,reference,reason,created_by) VALUES($1,$2,'OPENING',$3,$4,$5,$6,$7)",[randomUUID(),id,opening.value,stockValue(opening.milli,cost),required(b.reference,'Opening balance evidence reference',200),required(b.reason,'Opening balance basis'),req.auth.userId]);
  await audit(db,req,'inventory.item_created','inventory_item',id,{sku:b.sku,openingQuantity:opening.value});return {id};
 });
 list('inventory_movement_directory',['sku','item_name','movement','reference','office_name'],R.assets,'/api/inventory/movements');
 list('inventory_receipt_directory',['sku','item_name','reference','office_name'],R.assets,'/api/inventory/receipts');
 list('accepted_goods_receipt_directory',['receipt_no','po_number','supplier_name','office_name'],R.assets,'/api/goods-receipts/accepted');
 post('/api/inventory/items/:id/issue',R.assetWrite,async(db,req)=>{
  const item=await row(db,'inventory_items',req.params.id);await scope(req,item.org_unit_id,db);if(!item.active)throw fail('This stock item is inactive.',409);
  const qty=stockQuantity(req.body.quantity),onHand=stockQuantity(item.quantity_on_hand,true),reserved=stockQuantity(item.reserved_quantity||'0',true);if(qty.milli>onHand.milli-reserved.milli)throw fail('Issue quantity exceeds available stock after reservations.',409);
  const ref=required(req.body.reference,'Issue voucher / receiving officer reference',160),why=required(req.body.reason,'Issue purpose and receiving party');
  await db.query('UPDATE inventory_items SET quantity_on_hand=quantity_on_hand-$2::numeric,updated_at=now() WHERE id=$1',[item.id,qty.value]);
  const id=randomUUID();await db.query("INSERT INTO inventory_movements(id,item_id,movement,quantity,value_minor,reference,reason,created_by) VALUES($1,$2,'ISSUE',$3,$4,$5,$6,$7)",[id,item.id,qty.value,stockValue(qty.milli,item.estimated_unit_cost_minor),ref,why,req.auth.userId]);
  await audit(db,req,'inventory.stock_issued','inventory_item',item.id,{movementId:id,quantity:qty.value,reference:ref});return {id};
 });
 post('/api/inventory/receipts',R.assetWrite,async(db,req)=>{
  const item=await row(db,'inventory_items',req.body.itemId);await scope(req,item.org_unit_id,db);if(!item.active)throw fail('This stock item is inactive.',409);
  const receipt=await db.query("SELECT gr.id,gr.receipt_no,gr.status,gr.accepted_amount_minor,r.org_unit_id,r.spend_type FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE gr.id=$1 FOR UPDATE OF gr,po,r",[idValue(req.body.receiptId,'Accepted goods receipt')]);
  if(!receipt.rowCount||receipt.rows[0].status!=='ACCEPTED'||receipt.rows[0].spend_type!=='GOODS')throw fail('Link stock receipts to an accepted goods delivery. Capital-asset receipts use the asset register.',409);
  if(receipt.rows[0].org_unit_id!==item.org_unit_id)throw fail('The stock item and accepted delivery must belong to the same office.',403);
  const qty=stockQuantity(req.body.quantity),value=BigInt(stockValue(qty.milli,item.estimated_unit_cost_minor));
  const previous=await db.query("SELECT coalesce(sum(value_minor),0)::text AS value FROM inventory_movements WHERE goods_receipt_id=$1",[receipt.rows[0].id]);
  if(BigInt(previous.rows[0].value)+value>BigInt(receipt.rows[0].accepted_amount_minor))throw fail('Stock value exceeds the accepted delivery value.',409);
  const id=randomUUID();await db.query("INSERT INTO inventory_movements(id,item_id,movement,quantity,value_minor,goods_receipt_id,reference,reason,created_by) VALUES($1,$2,'RECEIPT',$3,$4,$5,$6,$7,$8)",[id,item.id,qty.value,value.toString(),receipt.rows[0].id,receipt.rows[0].receipt_no,required(req.body.reason,'Stock count and storage-location evidence'),req.auth.userId]);
  await db.query('UPDATE inventory_items SET quantity_on_hand=quantity_on_hand+$2::numeric,updated_at=now() WHERE id=$1',[item.id,qty.value]);await audit(db,req,'inventory.goods_received','inventory_item',item.id,{movementId:id,goodsReceiptId:receipt.rows[0].id,quantity:qty.value});return {id};
 });
 list('inventory_replenishment_directory',['sku','item_name','office_name','status'],R.assets,'/api/inventory/replenishments');
 post('/api/inventory/items/:id/replenishments',R.assetWrite,async(db,req)=>{
  const item=await row(db,'inventory_items',req.params.id);await scope(req,item.org_unit_id,db);if(!item.active)throw fail('This stock item is inactive.',409);
  if(stockQuantity(item.quantity_on_hand,true).milli>stockQuantity(item.reorder_point,true).milli)throw fail('Stock is above its configured reorder point.',409);
  const qty=stockQuantity(req.body.quantity),reason=required(req.body.reason,'Replenishment justification');const id=randomUUID(),value=stockValue(qty.milli,item.estimated_unit_cost_minor);
  await db.query("INSERT INTO inventory_replenishments(id,item_id,quantity,estimated_amount_minor,currency,reason,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7)",[id,item.id,qty.value,value,item.currency,reason,req.auth.userId]);await audit(db,req,'inventory.replenishment_requested','inventory_replenishment',id,{itemId:item.id,quantity:qty.value,estimatedAmountMinor:value});return {id};
 });
 post('/api/inventory/replenishments/:id/requisition',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(db,req)=>{
  const r=await row(db,'inventory_replenishments',req.params.id),item=await row(db,'inventory_items',r.item_id);await scope(req,item.org_unit_id,db);different(req,r.requested_by);if(r.status!=='SUBMITTED')throw fail('This replenishment request has already been processed.',409);
  const budget=await row(db,'budget_accounts',req.body.budgetAccountId);await scope(req,budget.org_unit_id,db);
  if(budget.org_unit_id!==item.org_unit_id||budget.currency!==item.currency)throw fail('Choose an office and currency matching the stock item.');
  const available=BigInt(budget.allocated_minor)-BigInt(budget.reserved_minor)-BigInt(budget.spent_minor);if(available<BigInt(r.estimated_amount_minor))throw fail('Available budget does not cover this replenishment estimate.',409);
  const id=randomUUID(),reference=`REQ-${id.slice(0,8).toUpperCase()}`;
  await db.query("INSERT INTO requisitions(id,requisition_no,requester_id,org_unit_id,budget_account_id,title,description,procurement_method,spend_type,currency,amount_minor,status) VALUES($1,$2,$3,$4,$5,$6,$7,'RFQ','GOODS',$8,$9,'DRAFT')",[id,reference,req.auth.userId,item.org_unit_id,budget.id,`Replenish ${item.sku} — ${item.name}`,`${r.quantity} ${item.unit_of_measure}; ${r.reason}; replenishment record ${r.id}`,item.currency,r.estimated_amount_minor]);
  await db.query("UPDATE inventory_replenishments SET status='REQUISITIONED',requisition_id=$2 WHERE id=$1",[r.id,id]);await audit(db,req,'inventory.replenishment_requisition_created','inventory_replenishment',r.id,{requisitionId:id,budgetAccountId:budget.id});return {id,requisitionNo:reference};
 });
 list('stocktakes',['reference','status'],R.assets,'/api/stocktakes');
 post('/api/stocktakes',R.assetWrite,async(db,req)=>{
  const unit=idValue(req.body.orgUnitId);await scope(req,unit,db);const assets=await db.query("SELECT * FROM assets WHERE org_unit_id=$1 AND lifecycle_status='ACTIVE' ORDER BY id FOR UPDATE",[unit]);if(!assets.rowCount)throw fail('There are no active assets in this office.');
  const id=randomUUID();await db.query('INSERT INTO stocktakes(id,reference,org_unit_id,created_by) VALUES($1,$2,$3,$4)',[id,required(req.body.reference,'Stocktake reference',100),unit,req.auth.userId]);
  for(const a of assets.rows)await db.query('INSERT INTO stocktake_lines(id,stocktake_id,asset_id,asset_tag,expected_location,expected_condition,asset_version) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,a.id,a.asset_tag,a.location,a.condition,a.version]);await audit(db,req,'stocktake.started','stocktake',id,{assets:assets.rowCount});return {id};
 });
 get('/api/stocktakes/:id/lines',R.assets,async(req,res)=>{
  const s=await parent(pool,req,'stocktakes');res.json((await pool.query('SELECT l.*,a.org_unit_id AS current_office,(a.version<>l.asset_version) AS register_changed FROM stocktake_lines l JOIN assets a ON a.id=l.asset_id WHERE stocktake_id=$1 ORDER BY asset_tag',[s.id])).rows);
 });
 post('/api/stocktakes/:id/count',R.assetWrite,async(db,req)=>{
  const s=await parent(db,req,'stocktakes');if(!['OPEN','RETURNED'].includes(s.status))throw fail('Stocktake is not open for counting.',409);
  const b=req.body;if(!['PRESENT','MISSING'].includes(b.result))throw fail('Select present or missing.');
  if(b.result==='PRESENT'&&!['GOOD','FAIR','POOR','UNSERVICEABLE'].includes(b.condition))throw fail('Select condition.');
  const r=await db.query('UPDATE stocktake_lines SET result=$3,actual_location=$4,actual_condition=$5,note=$6,counted_by=$7,counted_at=now() WHERE stocktake_id=$1 AND asset_tag=$2 RETURNING id',[s.id,required(b.assetTag,'Asset tag',100),b.result,b.result==='PRESENT'?required(b.location,'Observed location',240):null,b.result==='PRESENT'?b.condition:null,required(b.note,'Count / discrepancy note'),req.auth.userId]);if(!r.rowCount)throw fail('This tag is not in the stocktake snapshot.',404);await audit(db,req,'stocktake.count_recorded','stocktake',s.id,{assetTag:b.assetTag,result:b.result});return {id:s.id};
 });
 post('/api/stocktakes/:id/submit',R.assetWrite,async(db,req)=>{
  const s=await parent(db,req,'stocktakes');if(!['OPEN','RETURNED'].includes(s.status))throw fail('Stocktake is not open.',409);const missing=await db.query('SELECT 1 FROM stocktake_lines WHERE stocktake_id=$1 AND result IS NULL',[s.id]);if(missing.rowCount)throw fail('Count every asset before submission.');await db.query("UPDATE stocktakes SET status='SUBMITTED' WHERE id=$1",[s.id]);await audit(db,req,'stocktake.submitted','stocktake',s.id);return {id:s.id};
 });
 post('/api/stocktakes/:id/decide',['MANAGING_DIRECTOR'],async(db,req)=>{
  const s=await parent(db,req,'stocktakes');different(req,s.created_by);if(s.status!=='SUBMITTED')throw fail('Stocktake is not submitted.',409);const counted=await db.query('SELECT 1 FROM stocktake_lines WHERE stocktake_id=$1 AND counted_by=$2',[s.id,req.auth.userId]);if(counted.rowCount)throw fail('A counter cannot approve the stocktake.',403);if(!['APPROVED','RETURNED'].includes(req.body.status))throw fail('Select approve or return.');await db.query('UPDATE stocktakes SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[s.id,req.body.status,req.auth.userId,required(req.body.reason,'Discrepancy review note')]);await audit(db,req,`stocktake.${req.body.status.toLowerCase()}`,'stocktake',s.id);return {id:s.id};
 });
 post('/api/assets/register/:id/depreciation-policy',finance,async(db,req)=>{
  const a=await parent(db,req,'assets');if(a.lifecycle_status!=='ACTIVE')throw fail('Asset is not active.',409);
  const used=await db.query("SELECT 1 FROM depreciation_lines l JOIN depreciation_runs r ON r.id=l.run_id WHERE l.asset_id=$1 AND r.status<>'REJECTED'",[a.id]);if(used.rowCount)throw fail('A depreciation schedule has already been used. Policy changes require a controlled adjustment.',409);
  const residual=parseMinorUnits(req.body.residual||'0');if(residual>=BigInt(a.purchase_cost_minor))throw fail('Residual value must be below cost.');
  await db.query('INSERT INTO depreciation_policies(asset_id,in_service_date,useful_months,residual_minor,configured_by,basis) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(asset_id) DO UPDATE SET in_service_date=EXCLUDED.in_service_date,useful_months=EXCLUDED.useful_months,residual_minor=EXCLUDED.residual_minor,configured_by=EXCLUDED.configured_by,basis=EXCLUDED.basis',[a.id,dateValue(req.body.inServiceDate),integer(req.body.usefulMonths,1,1200),residual.toString(),req.auth.userId,required(req.body.basis,'Approved accounting policy reference')]);await audit(db,req,'asset.depreciation_policy_set','asset',a.id);return {id:a.id};
 });
 list('depreciation_register',['reference','status'],R.finance,'/api/depreciation/runs');
 post('/api/depreciation/runs',finance,async(db,req)=>{
  const b=req.body,unit=idValue(b.orgUnitId),month=dateValue(b.month);await scope(req,unit,db);if(!month.endsWith('-01'))throw fail('Use the first day of the depreciation month.');
  const assets=await db.query(`SELECT a.*,p.residual_minor,p.useful_months,p.in_service_date,((extract(year FROM $2::date)-extract(year FROM p.in_service_date))*12+extract(month FROM $2::date)-extract(month FROM p.in_service_date)+1)::integer AS elapsed FROM assets a JOIN depreciation_policies p ON p.asset_id=a.id WHERE a.org_unit_id=$1 AND a.currency=$3 AND a.lifecycle_status='ACTIVE' AND p.in_service_date<($2::date+interval '1 month') ORDER BY a.id FOR UPDATE OF a`,[unit,month,currency(b.currency)]);
  const entries=[];
  for(const a of assets.rows){
   const prior=await db.query(`SELECT l.amount_minor,r.month,r.status,j.status AS journal_status FROM depreciation_lines l JOIN depreciation_runs r ON r.id=l.run_id LEFT JOIN gl_journals j ON j.id=r.journal_id WHERE l.asset_id=$1 AND r.status<>'REJECTED'`,[a.id]);
   if(prior.rows.some(r=>r.status!=='JOURNALED'||r.journal_status!=='POSTED'))throw fail('Post or reject all earlier depreciation drafts for these assets first.',409);
   const sameOrLater=await db.query("SELECT 1 FROM depreciation_lines l JOIN depreciation_runs r ON r.id=l.run_id WHERE l.asset_id=$1 AND r.status<>'REJECTED' AND r.month>=$2::date",[a.id,month]);if(sameOrLater.rowCount)throw fail('This month or a later month is already depreciated.',409);
   const base=BigInt(a.purchase_cost_minor)-BigInt(a.residual_minor),cumulative=base*BigInt(Math.min(a.elapsed,a.useful_months))/BigInt(a.useful_months),posted=prior.rows.reduce((n,r)=>n+BigInt(r.amount_minor),0n),charge=cumulative-posted;
   if(charge>0n)entries.push({id:a.id,version:a.version,charge});
  }
  if(!entries.length)throw fail('No depreciation is due for configured assets in this month.');
  const id=randomUUID();await db.query('INSERT INTO depreciation_runs(id,reference,org_unit_id,month,currency,created_by) VALUES($1,$2,$3,$4,$5,$6)',[id,required(b.reference,'Run reference',100),unit,month,b.currency,req.auth.userId]);
  for(const e of entries)await db.query('INSERT INTO depreciation_lines(id,run_id,asset_id,amount_minor,asset_version) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,e.id,e.charge.toString(),e.version]);await audit(db,req,'depreciation.calculated','depreciation',id,{assets:entries.length,convention:'FULL_MONTH_STRAIGHT_LINE_CATCH_UP'});return {id};
 });
 get('/api/depreciation/runs/:id/lines',R.finance,async(req,res)=>{const r=await parent(pool,req,'depreciation_runs');res.json((await pool.query('SELECT l.*,a.asset_tag,a.description FROM depreciation_lines l JOIN assets a ON a.id=l.asset_id WHERE run_id=$1',[r.id])).rows);});
 post('/api/depreciation/runs/:id/decide',finance,async(db,req)=>{
  const r=await parent(db,req,'depreciation_runs');different(req,r.created_by);if(r.status!=='DRAFT')throw fail('Only a draft can be decided.',409);if(!['APPROVED','REJECTED'].includes(req.body.status))throw fail('Select approve or reject.');
  const changed=await db.query('SELECT 1 FROM depreciation_lines l JOIN assets a ON a.id=l.asset_id WHERE l.run_id=$1 AND (a.version<>l.asset_version OR a.org_unit_id<>$2 OR a.lifecycle_status<>\'ACTIVE\')',[r.id,r.org_unit_id]);if(changed.rowCount&&req.body.status==='APPROVED')throw fail('Assets changed after calculation. Reject and regenerate this run.',409);
  await db.query('UPDATE depreciation_runs SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[r.id,req.body.status,req.auth.userId,required(req.body.reason,'Decision note')]);await audit(db,req,`depreciation.${req.body.status.toLowerCase()}`,'depreciation',r.id);return {id:r.id};
 });
 post('/api/depreciation/runs/:id/journal',finance,async(db,req)=>{
  const r=await parent(db,req,'depreciation_runs');if(r.status==='JOURNALED'){const prior=await row(db,'gl_journals',r.journal_id);if(prior.status!=='VOID')throw fail('Depreciation already has a journal.',409);}else if(r.status!=='APPROVED')throw fail('Run must be approved.',409);
  const changed=await db.query("SELECT 1 FROM depreciation_lines l JOIN assets a ON a.id=l.asset_id WHERE l.run_id=$1 AND (a.version<>l.asset_version OR a.lifecycle_status<>'ACTIVE' OR a.org_unit_id<>$2)",[r.id,r.org_unit_id]);if(changed.rowCount)throw fail('Asset register changed after approval; an accounting review is required.',409);
  const valid=await db.query("SELECT 1 FROM depreciation_runs WHERE id=$1 AND $2::date>=month AND $2::date<month+interval '1 month'",[r.id,dateValue(req.body.entryDate)]);if(!valid.rowCount)throw fail('Journal date must be within the depreciation month.');
  const sum=(await db.query('SELECT sum(amount_minor)::text AS total FROM depreciation_lines WHERE run_id=$1',[r.id])).rows[0].total;
  const debit=await account(db,req.body.expenseAccountId,'EXPENSE'),credit=await account(db,req.body.accumulatedAccountId,'ASSET');
  const j=await journal(db,req,r,[{accountId:debit,debit:decimal(sum)},{accountId:credit,credit:decimal(sum)}],`Depreciation ${r.reference}`);await db.query("UPDATE depreciation_runs SET status='JOURNALED',journal_id=$2 WHERE id=$1",[r.id,j.id]);await audit(db,req,'depreciation.journal_created','depreciation',r.id,{journalId:j.id});return j;
 });
 list('bank_statements',['reference','status'],R.finance,'/api/bank/statements');
 post('/api/bank/statements',finance,async(db,req)=>{
  const b=req.body;await scope(req,idValue(b.orgUnitId),db);await account(db,b.accountId,'ASSET');const start=dateValue(b.startDate),end=dateValue(b.endDate);if(start>end)throw fail('Statement end must follow start.');
  const signed=v=>{const s=String(v);return (s.startsWith('-')?-1n:1n)*parseMinorUnits(s.replace(/^[-+]/,''));};
  const opening=signed(b.opening),closing=signed(b.closing),lines=String(b.lines||'').trim().split(/\r?\n/);if(!lines[0]||lines.length>5000)throw fail('Paste 1 to 5,000 statement lines: date, reference, signed amount (no header).');
  const parsed=lines.map(line=>{const parts=line.split(',');if(parts.length!==3)throw fail('Each statement line must contain date, reference, signed amount; embedded commas are not accepted.');const date=dateValue(parts[0].trim()),reference=required(parts[1],'Transaction reference',200),value=signed(parts[2].trim());if(date<start||date>end||value===0n)throw fail('Statement dates must be in range and amounts nonzero.');return {date,reference,value};});
  if(opening+parsed.reduce((sum,l)=>sum+l.value,0n)!==closing)throw fail('Statement opening balance plus transactions does not equal closing balance.');
  const overlaps=await db.query("SELECT 1 FROM bank_statements WHERE status<>'VOID' AND account_id=$1 AND currency=$2 AND org_unit_id=$3 AND start_date<=$5::date AND end_date>=$4::date",[b.accountId,currency(b.currency),b.orgUnitId,start,end]);if(overlaps.rowCount)throw fail('An overlapping statement is already imported.',409);
  const id=randomUUID();await db.query('INSERT INTO bank_statements(id,reference,org_unit_id,account_id,currency,start_date,end_date,opening_minor,closing_minor,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,required(b.reference,'Statement reference',100),b.orgUnitId,b.accountId,b.currency,start,end,opening.toString(),closing.toString(),req.auth.userId]);
  for(const l of parsed)await db.query('INSERT INTO bank_statement_lines(id,statement_id,entry_date,reference,amount_minor) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,l.date,l.reference,l.value.toString()]);await audit(db,req,'bank.statement_imported','bank_statement',id,{lines:parsed.length});return {id};
 });
 get('/api/bank/statements/:id/lines',R.finance,async(req,res)=>{const s=await parent(pool,req,'bank_statements');res.json((await pool.query('SELECT * FROM bank_statement_lines WHERE statement_id=$1 ORDER BY entry_date,reference',[s.id])).rows);});
 get('/api/bank/statements/:id/candidates',R.finance,async(req,res)=>{
  const s=await parent(pool,req,'bank_statements');res.json((await pool.query(`SELECT l.id,j.reference,j.entry_date,(l.debit_minor-l.credit_minor) AS amount_minor FROM gl_journal_lines l JOIN gl_journals j ON j.id=l.journal_id WHERE j.status='POSTED' AND l.account_id=$1 AND j.org_unit_id=$2 AND j.currency=$3 AND j.entry_date BETWEEN $4 AND $5 AND NOT EXISTS(SELECT 1 FROM bank_statement_lines b WHERE b.journal_line_id=l.id) ORDER BY j.entry_date`,[s.account_id,s.org_unit_id,s.currency,s.start_date,s.end_date])).rows);
 });
 post('/api/bank/statements/:id/match',finance,async(db,req)=>{
  const s=await parent(db,req,'bank_statements');if(s.status!=='OPEN')throw fail('Statement is reconciled.',409);const l=await row(db,'bank_statement_lines',req.body.statementLineId);if(l.statement_id!==s.id)throw fail('Line belongs to a different statement.');
  const j=await db.query(`SELECT l.id,l.debit_minor-l.credit_minor AS amount_minor FROM gl_journal_lines l JOIN gl_journals j ON j.id=l.journal_id WHERE l.id=$1 AND j.status='POSTED' AND j.org_unit_id=$2 AND l.account_id=$3 AND j.currency=$4 AND j.entry_date BETWEEN $5 AND $6`,[idValue(req.body.journalLineId),s.org_unit_id,s.account_id,s.currency,s.start_date,s.end_date]);if(!j.rowCount||BigInt(j.rows[0].amount_minor)!==BigInt(l.amount_minor))throw fail('Choose a posted bank entry in this statement period with the exact signed amount.');
  await db.query('UPDATE bank_statement_lines SET journal_line_id=$2,matched_by=$3 WHERE id=$1',[l.id,j.rows[0].id,req.auth.userId]);await audit(db,req,'bank.line_matched','bank_statement',s.id,{statementLineId:l.id,journalLineId:j.rows[0].id});return {id:s.id};
 });
 post('/api/bank/statements/:id/unmatch',finance,async(db,req)=>{
  const s=await parent(db,req,'bank_statements');if(s.status!=='OPEN')throw fail('Statement is reconciled.',409);const l=await row(db,'bank_statement_lines',req.body.statementLineId);if(l.statement_id!==s.id)throw fail('Line belongs to another statement.');await db.query('UPDATE bank_statement_lines SET journal_line_id=NULL,matched_by=NULL WHERE id=$1',[l.id]);await audit(db,req,'bank.line_unmatched','bank_statement',s.id,{lineId:l.id});return {id:s.id};
 });
 post('/api/bank/statements/:id/void',finance,async(db,req)=>{
  const s=await parent(db,req,'bank_statements');if(s.status!=='OPEN')throw fail('Only an unreconciled statement can be voided.',409);
  const matches=(await db.query('SELECT id,journal_line_id FROM bank_statement_lines WHERE statement_id=$1 AND journal_line_id IS NOT NULL',[s.id])).rows;
  await db.query('UPDATE bank_statement_lines SET journal_line_id=NULL,matched_by=NULL WHERE statement_id=$1',[s.id]);await db.query("UPDATE bank_statements SET status='VOID' WHERE id=$1",[s.id]);await audit(db,req,'bank.statement_voided','bank_statement',s.id,{reason:required(req.body.reason,'Void reason'),releasedMatches:matches});return {id:s.id};
 });
 post('/api/bank/statements/:id/reconcile',finance,async(db,req)=>{
  const s=await parent(db,req,'bank_statements');different(req,s.created_by);const matched=await db.query('SELECT 1 FROM bank_statement_lines WHERE statement_id=$1 AND matched_by=$2',[s.id,req.auth.userId]);if(matched.rowCount)throw fail('A matching officer cannot approve the reconciliation.',403);if(s.status!=='OPEN')throw fail('Statement is already reconciled.',409);
  const unmatched=await db.query('SELECT 1 FROM bank_statement_lines WHERE statement_id=$1 AND journal_line_id IS NULL',[s.id]);if(unmatched.rowCount)throw fail('Match every statement entry before approval.',409);
  const ledger=await db.query(`SELECT coalesce(sum(CASE WHEN j.entry_date<$4 THEN l.debit_minor-l.credit_minor ELSE 0 END),0)::text AS opening,coalesce(sum(l.debit_minor-l.credit_minor),0)::text AS closing FROM gl_journal_lines l JOIN gl_journals j ON j.id=l.journal_id WHERE j.status='POSTED' AND l.account_id=$1 AND j.org_unit_id=$2 AND j.currency=$3 AND j.entry_date<=$5`,[s.account_id,s.org_unit_id,s.currency,s.start_date,s.end_date]);
  if(BigInt(ledger.rows[0].opening)!==BigInt(s.opening_minor)||BigInt(ledger.rows[0].closing)!==BigInt(s.closing_minor))throw fail('Posted ledger opening/closing balances do not agree with the bank statement.',409);
  const extra=await db.query(`SELECT 1 FROM gl_journal_lines l JOIN gl_journals j ON j.id=l.journal_id WHERE j.status='POSTED' AND l.account_id=$1 AND j.org_unit_id=$2 AND j.currency=$3 AND j.entry_date BETWEEN $4 AND $5 AND NOT EXISTS(SELECT 1 FROM bank_statement_lines b WHERE b.journal_line_id=l.id AND b.statement_id=$6)`,[s.account_id,s.org_unit_id,s.currency,s.start_date,s.end_date,s.id]);if(extra.rowCount)throw fail('Unmatched ledger bank entries remain in the period.',409);
  await db.query("UPDATE bank_statements SET status='RECONCILED',reconciled_by=$2,reconciled_at=now() WHERE id=$1",[s.id,req.auth.userId]);await audit(db,req,'bank.statement_reconciled','bank_statement',s.id,{note:required(req.body.reason,'Reconciliation approval note')});return {id:s.id};
 });
 const evaluationRead=R.procurement;
 list('bid_evaluations',['reference','status'],evaluationRead,'/api/evaluations');
 get('/api/evaluations/panel-candidates',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(_req,res)=>res.json((await pool.query("SELECT DISTINCT u.id,u.full_name FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.disabled_at IS NULL AND r.role IN ('PROCUREMENT_OFFICER','FINANCE_DIRECTOR','INTERNAL_AUDITOR') ORDER BY full_name")).rows));
 get('/api/evaluations/notices',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(req,res)=>{const units=await scopedUnits(req.departmentAuth);res.json((await pool.query("SELECT id,tender_ref AS reference,details->>'title' AS title FROM public_tender_notices WHERE deadline<=now() AND publication_status='PUBLISHED' AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))",[units])).rows);});
 post('/api/evaluations',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(db,req)=>{
  const b=req.body,t=await row(db,'public_tender_notices',b.tenderId);await scope(req,t.org_unit_id,db);
  const closed=await db.query("SELECT 1 FROM public_tender_notices WHERE id=$1 AND deadline<=now() AND publication_status='PUBLISHED'",[t.id]);if(!closed.rowCount)throw fail('Evaluate only a published notice whose submission deadline has passed.');
  const id=randomUUID();await db.query('INSERT INTO bid_evaluations(id,reference,org_unit_id,tender_id,technical_weight,pass_mark,criteria,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,required(b.reference,'Evaluation reference',100),t.org_unit_id,t.id,integer(b.technicalWeight,1,99),integer(b.passMark,0,100),required(b.criteria,'Published evaluation criteria and opening-minutes reference'),req.auth.userId]);await audit(db,req,'evaluation.opened','evaluation',id);return {id};
 });
 const editable=e=>{if(!['OPEN','RETURNED'].includes(e.status))throw fail('Evaluation is locked for approval.',409);};
 post('/api/evaluations/:id/panel',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(db,req)=>{
  const e=await parent(db,req,'bid_evaluations');editable(e);const scored=await db.query('SELECT 1 FROM bid_scores s JOIN evaluated_bids b ON b.id=s.bid_id WHERE b.evaluation_id=$1',[e.id]);if(scored.rowCount)throw fail('Panel is frozen once scoring starts.',409);
  const u=await db.query("SELECT 1 FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND u.disabled_at IS NULL AND r.role IN ('PROCUREMENT_OFFICER','FINANCE_DIRECTOR','INTERNAL_AUDITOR')",[idValue(req.body.userId)]);if(!u.rowCount)throw fail('Select an eligible evaluator account.');
  await db.query('INSERT INTO evaluation_panel(id,evaluation_id,user_id) VALUES($1,$2,$3)',[randomUUID(),e.id,req.body.userId]);await audit(db,req,'evaluation.panel_member_added','evaluation',e.id,{userId:req.body.userId});return {id:e.id};
 });
 get('/api/evaluations/:id/panel',evaluationRead,async(req,res)=>{const e=await parent(pool,req,'bid_evaluations');res.json((await pool.query('SELECT p.*,u.full_name FROM evaluation_panel p JOIN users u ON u.id=p.user_id WHERE evaluation_id=$1',[e.id])).rows);});
 post('/api/evaluations/:id/declare',evaluationRead,async(db,req)=>{
  const e=await parent(db,req,'bid_evaluations');editable(e);if(!['NONE','CONFLICT'].includes(req.body.conflict))throw fail('Declare conflict status.');
  const p=await db.query('UPDATE evaluation_panel SET declaration=$3,conflict=$4,declared_at=now() WHERE evaluation_id=$1 AND user_id=$2 AND declared_at IS NULL RETURNING id',[e.id,req.auth.userId,required(req.body.declaration,'Conflict declaration'),req.body.conflict==='CONFLICT']);if(!p.rowCount)throw fail('Only an assigned evaluator with no prior declaration may declare.',403);await audit(db,req,'evaluation.conflict_declared','evaluation',e.id,{conflict:req.body.conflict});return {id:e.id};
 });
 post('/api/evaluations/:id/bid',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(db,req)=>{
  const e=await parent(db,req,'bid_evaluations');editable(e);const scored=await db.query('SELECT 1 FROM bid_scores s JOIN evaluated_bids b ON b.id=s.bid_id WHERE b.evaluation_id=$1',[e.id]);if(scored.rowCount)throw fail('The bid register is frozen once scoring starts.',409);
  const v=await row(db,'vendors',req.body.vendorId,false);if(v.status!=='ACTIVE')throw fail('Select a qualified supplier.');
  const currencies=await db.query('SELECT currency FROM evaluated_bids WHERE evaluation_id=$1 LIMIT 1',[e.id]);const c=currency(req.body.currency);if(currencies.rowCount&&currencies.rows[0].currency!==c)throw fail('Use one evaluation currency with documented conversion before entry.');
  const id=randomUUID();await db.query('INSERT INTO evaluated_bids(id,evaluation_id,vendor_id,reference,amount_minor,currency,evidence_reference) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,e.id,v.id,required(req.body.reference,'Opened bid reference',100),positive(req.body.amount).toString(),c,required(req.body.evidenceReference,'Signed opening minutes and bid document reference')]);await audit(db,req,'evaluation.bid_registered','evaluation',e.id,{bidId:id});return {id};
 });
 get('/api/evaluations/:id/bids',evaluationRead,async(req,res)=>{const e=await parent(pool,req,'bid_evaluations');res.json((await pool.query('SELECT b.*,v.legal_name FROM evaluated_bids b JOIN vendors v ON v.id=b.vendor_id WHERE evaluation_id=$1',[e.id])).rows);});
 post('/api/evaluations/:id/score',evaluationRead,async(db,req)=>{
  const e=await parent(db,req,'bid_evaluations');editable(e);const panel=await db.query('SELECT 1 FROM evaluation_panel WHERE evaluation_id=$1 AND user_id=$2 AND conflict=false AND declared_at IS NOT NULL',[e.id,req.auth.userId]);if(!panel.rowCount)throw fail('Only an assigned evaluator with a no-conflict declaration may score.',403);
  const b=await row(db,'evaluated_bids',req.body.bidId);if(b.evaluation_id!==e.id)throw fail('Bid is not part of this evaluation.');
  const score=Number(req.body.technicalScore);if(!Number.isFinite(score)||score<0||score>100||!['YES','NO'].includes(req.body.responsive))throw fail('Enter a score from 0 to 100 and a responsiveness decision.');
  await db.query('INSERT INTO bid_scores(id,bid_id,evaluator_id,technical_score,responsive,rationale) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(bid_id,evaluator_id) DO UPDATE SET technical_score=EXCLUDED.technical_score,responsive=EXCLUDED.responsive,rationale=EXCLUDED.rationale',[randomUUID(),b.id,req.auth.userId,score,req.body.responsive==='YES',required(req.body.rationale,'Criteria-by-criteria scoring rationale')]);await audit(db,req,'evaluation.score_saved','evaluation',e.id,{bidId:b.id});return {id:e.id};
 });
 async function results(db,e){
  const panel=(await db.query('SELECT * FROM evaluation_panel WHERE evaluation_id=$1',[e.id])).rows;
  const active=panel.filter(p=>p.conflict===false&&p.declared_at);const ready=active.length>=2&&panel.every(p=>p.declared_at);
  const bids=(await db.query('SELECT b.*,v.legal_name FROM evaluated_bids b JOIN vendors v ON v.id=b.vendor_id WHERE evaluation_id=$1',[e.id])).rows;
  for(const b of bids){const scores=(await db.query('SELECT s.* FROM bid_scores s JOIN evaluation_panel p ON p.user_id=s.evaluator_id WHERE s.bid_id=$1 AND p.evaluation_id=$2 AND p.conflict=false',[b.id,e.id])).rows;b.complete=ready&&scores.length===active.length;b.technical=b.complete?scores.reduce((n,s)=>n+Number(s.technical_score),0)/scores.length:null;b.eligible=b.complete&&scores.every(s=>s.responsive)&&b.technical>=e.pass_mark;}
  const eligible=bids.filter(b=>b.eligible),min=eligible.length?Math.min(...eligible.map(b=>Number(b.amount_minor))):0;
  return bids.map(b=>({...b,total_score:b.eligible?Number((b.technical*e.technical_weight/100+(min/Number(b.amount_minor))*(100-e.technical_weight)).toFixed(4)):null})).sort((a,b)=>(b.total_score??-1)-(a.total_score??-1));
 }
 get('/api/evaluations/:id/results',evaluationRead,async(req,res)=>res.json(await results(pool,await parent(pool,req,'bid_evaluations'))));
 post('/api/evaluations/:id/submit',['MANAGING_DIRECTOR','PROCUREMENT_OFFICER'],async(db,req)=>{
  const e=await parent(db,req,'bid_evaluations');editable(e);const r=await results(db,e);if(!r.length||r.some(b=>!b.complete)||!r[0].eligible)throw fail('All bids need complete scoring by at least two non-conflicted evaluators; an eligible bidder is required.');
  const selected=r.find(b=>b.id===req.body.bidId);if(!selected||selected.total_score!==r[0].total_score)throw fail('Recommend a highest-ranked eligible bidder. Document any tie decision.');
  await db.query("UPDATE bid_evaluations SET status='SUBMITTED',recommended_bid_id=$2,decision_note=$3 WHERE id=$1",[e.id,selected.id,required(req.body.reason,'Recommendation / tie-break justification')]);await audit(db,req,'evaluation.submitted','evaluation',e.id,{bidId:selected.id});return {id:e.id};
 });
 post('/api/evaluations/:id/decide',['MANAGING_DIRECTOR'],async(db,req)=>{
  const e=await parent(db,req,'bid_evaluations');different(req,e.created_by);const member=await db.query('SELECT 1 FROM evaluation_panel WHERE evaluation_id=$1 AND user_id=$2',[e.id,req.auth.userId]);if(member.rowCount)throw fail('Panel members cannot approve their evaluation.',403);if(e.status!=='SUBMITTED')throw fail('Evaluation is not submitted.',409);if(!['APPROVED','RETURNED'].includes(req.body.status))throw fail('Select approve or return.');
  await db.query('UPDATE bid_evaluations SET status=$2,approved_by=$3,decision_note=$4 WHERE id=$1',[e.id,req.body.status,req.auth.userId,required(req.body.reason,'Approval / return reason')]);await audit(db,req,`evaluation.${req.body.status.toLowerCase()}`,'evaluation',e.id);return {id:e.id};
 });
  get('/api/integrations/diagnostics',['MANAGING_DIRECTOR','IT_DIRECTOR','INTERNAL_AUDITOR'],async(_req,res)=>{
  const counts=(await pool.query('SELECT count(*) FILTER(WHERE delivered_at IS NOT NULL)::integer AS delivered,count(*) FILTER(WHERE delivered_at IS NULL)::integer AS pending,count(*) FILTER(WHERE delivered_at IS NULL AND attempts>0)::integer AS retrying,max(delivered_at) AS last_delivery FROM integration_outbox')).rows[0];
  res.json([{id:'audit-webhook',name:'Audit webhook transport',configured:Boolean(process.env.INTEGRATION_WEBHOOK_URL&&process.env.INTEGRATION_WEBHOOK_SECRET),...counts,verification:'Transport receipts only; external audit durability not verified'},...['IFMIS','CSA / payroll','Bank payment gateway','PPCC / e-GP'].map(name=>({id:name,name,configured:false,verification:'Not connected or verified; approved API specification and sandbox access required'}))]);
 });
 const history={payroll:['payroll_runs',payrollRead],stocktake:['stocktakes',R.assets],depreciation:['depreciation_runs',R.finance],bank_statement:['bank_statements',R.finance],evaluation:['bid_evaluations',evaluationRead]};
 app.get('/api/enterprise/:type/:id/history',loadAuth,route(async(req,res)=>{const h=history[req.params.type];if(!h)throw fail('Unknown record type.',404);req.departmentAuth=departmentAuth(req.auth,h[1]);await parent(pool,req,h[0]);res.json((await pool.query('SELECT action,actor_role,event_data,created_at FROM audit_events WHERE entity_type=$1 AND entity_id=$2 ORDER BY sequence DESC LIMIT 100',[req.params.type,req.params.id])).rows);}));
}
