import { randomUUID } from 'node:crypto';
import { departmentAuth, DEPARTMENT_ROLES as R, fail, required, idValue, dateValue } from './departments.js';

const readRoles=R.assets;
const requestRoles=['MANAGING_DIRECTOR','ASSET_OFFICER','COUNTY_OFFICER'];
const centralRoles=['MANAGING_DIRECTOR','ASSET_OFFICER'];
const qty=(v,{allowZero=false}={})=>{
 const s=String(v??'').trim();
 if(!/^\d{1,11}(\.\d{1,3})?$/.test(s))throw fail('Enter a quantity with no more than three decimal places.');
 const [whole,frac='']=s.split('.');const milli=BigInt(whole)*1000n+BigInt((frac+'000').slice(0,3));
 if(!allowZero&&milli<=0n)throw fail('Quantity must be greater than zero.');
 return {milli,value:`${whole}.${(frac+'000').slice(0,3)}`};
};
const moneyValue=(milli,unitCost)=>((milli*BigInt(unitCost)+500n)/1000n).toString();
const optionalDate=(v,label)=>v?dateValue(v):null;

export function registerSupplyChain(app,deps){
 const {pool,transaction,writeAudit,route,loadAuth,csrfRequired,scopedUnits,assertOrgAccess}=deps;
 const guard=allowed=>(req,_res,next)=>{try{req.departmentAuth=departmentAuth(req.auth,allowed);next();}catch(e){next(e);}};
 const get=(path,roles,fn)=>app.get(path,loadAuth,guard(roles),route(fn));
 const post=(path,roles,fn)=>app.post(path,loadAuth,csrfRequired,guard(roles),route(async(req,res)=>res.json(await transaction(db=>fn(db,req)))));
 const audit=(db,req,action,id,data={})=>writeAudit(db,req.departmentAuth,action,'distribution_request',id,data);
 const row=async(db,table,id,lock=true)=>{const r=await db.query(`SELECT * FROM ${table} WHERE id=$1${lock?' FOR UPDATE':''}`,[idValue(id)]);if(!r.rowCount)throw fail('Record not found.',404);return r.rows[0];};
 const scope=(req,id,db)=>assertOrgAccess(req.departmentAuth,id,db);
 const central=req=>req.departmentAuth.roles.some(r=>centralRoles.includes(r.role));

 get('/api/supply-chain/distribution',readRoles,async(req,res)=>{
  const units=await scopedUnits(req.departmentAuth),q=`%${String(req.query.q||'').slice(0,160)}%`;
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||25)),offset=Math.max(0,Number(req.query.offset)||0);
  if(!Number.isInteger(offset)||offset>1000000)throw fail('Invalid page.');
  // Central store officers need to see submitted destination requests before a source is selected.
  // County users and other scoped staff see only requests belonging to their assigned locations.
  const scopeSql=central(req)||units===null?'true':`(destination_org_unit_id=ANY($1::uuid[]) OR source_org_unit_id=ANY($1::uuid[]))`;
  const params=central(req)||units===null?[q]:[units,q];
  const search=`(reference ILIKE $${params.length} OR sku ILIKE $${params.length} OR item_name ILIKE $${params.length} OR reason ILIKE $${params.length} OR coalesce(source_office,'') ILIKE $${params.length} OR destination_office ILIKE $${params.length} OR status ILIKE $${params.length})`;
  const where=`${scopeSql} AND ${search}`;
  const total=await pool.query(`SELECT count(*)::integer AS total FROM distribution_request_directory WHERE ${where}`,params);
  const rows=await pool.query(`SELECT * FROM distribution_request_directory WHERE ${where} ORDER BY created_at DESC,id LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,limit,offset]);
  res.json({rows:rows.rows,total:Number(total.rows[0].total),limit,offset,asOf:new Date().toISOString(),scope:central(req)||units===null?'central supply-chain operations':'assigned offices'});
 });
 get('/api/supply-chain/distribution/:id/history',readRoles,async(req,res)=>{
  const request=await row(pool,'distribution_requests',req.params.id,false),units=await scopedUnits(req.departmentAuth);
  if(!central(req)&&units!==null&&!units.includes(request.destination_org_unit_id)&&(!request.source_org_unit_id||!units.includes(request.source_org_unit_id)))throw fail('Record not found.',404);
  const events=await pool.query("SELECT id,actor_role,action,event_data,created_at,event_hash FROM audit_events WHERE entity_type='distribution_request' AND entity_id=$1 ORDER BY created_at,id",[request.id]);
  res.json(events.rows);
 });

 post('/api/supply-chain/distribution',requestRoles,async(db,req)=>{
  const b=req.body,destination=idValue(b.destinationOrgUnitId,'Destination office');
  await scope(req,destination,db);
  const sku=required(b.sku,'Stock keeping unit',80).toUpperCase();
  const itemName=required(b.itemName,'Item description',200),uom=required(b.unitOfMeasure,'Unit of measure',40);
  const quantity=qty(b.quantity),reorder=qty(b.destinationReorderPoint||'0',{allowZero:true}),neededBy=optionalDate(b.neededBy,'Needed-by date');
  const reference=`DIST-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,8).toUpperCase()}`;
  const id=randomUUID();
  await db.query('INSERT INTO distribution_requests(id,reference,destination_org_unit_id,sku,item_name,unit_of_measure,quantity,destination_reorder_point,reason,needed_by,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,reference,destination,sku,itemName,uom,quantity.value,reorder.value,required(b.reason,'Operational need / allocation justification'),neededBy,req.auth.userId]);
  await audit(db,req,'supply_chain.distribution_requested',id,{reference,destinationOrgUnitId:destination,sku,quantity:quantity.value,destinationReorderPoint:reorder.value});
  return {id,reference};
 });

 post('/api/supply-chain/distribution/:id/allocate',centralRoles,async(db,req)=>{
  const request=await row(db,'distribution_requests',req.params.id);
  if(request.status!=='SUBMITTED')throw fail('Only submitted requests can be allocated.',409);
  if(request.requested_by===req.auth.userId)throw fail('A different authorized officer must allocate this request.',403);
  const source=await row(db,'inventory_items',idValue(req.body.sourceItemId,'Source stock item'));
  await scope(req,source.org_unit_id,db);
  if(!source.active||source.org_unit_id===request.destination_org_unit_id)throw fail('Choose active source stock held at a different office.');
  if(source.sku.toLowerCase()!==request.sku.toLowerCase()||source.unit_of_measure.toLowerCase()!==request.unit_of_measure.toLowerCase())throw fail('Source SKU and unit must match the request exactly.');
  const requested=qty(request.quantity).milli,onHand=qty(source.quantity_on_hand,{allowZero:true}).milli,reserved=qty(source.reserved_quantity||'0',{allowZero:true}).milli;
  if(requested>onHand-reserved)throw fail('Available stock is below the requested amount after existing reservations.',409);
  await db.query('UPDATE inventory_items SET reserved_quantity=reserved_quantity+$2::numeric,updated_at=now() WHERE id=$1',[source.id,request.quantity]);
  await db.query("UPDATE distribution_requests SET status='ALLOCATED',source_item_id=$2,source_org_unit_id=$3,allocated_by=$4,allocated_at=now(),updated_at=now() WHERE id=$1",[request.id,source.id,source.org_unit_id,req.auth.userId]);
  await audit(db,req,'supply_chain.stock_reserved',request.id,{sourceItemId:source.id,sourceOrgUnitId:source.org_unit_id,quantity:request.quantity});
  return {id:request.id};
 });

 post('/api/supply-chain/distribution/:id/reject',centralRoles,async(db,req)=>{
  const request=await row(db,'distribution_requests',req.params.id);
  if(request.status!=='SUBMITTED')throw fail('Only submitted requests can be rejected.',409);
  if(request.requested_by===req.auth.userId)throw fail('A different authorized officer must review this request.',403);
  const note=required(req.body.reason,'Rejection reason');
  await db.query("UPDATE distribution_requests SET status='REJECTED',updated_at=now() WHERE id=$1",[request.id]);
  await audit(db,req,'supply_chain.distribution_rejected',request.id,{reason:note});
  return {id:request.id};
 });

 post('/api/supply-chain/distribution/:id/dispatch',centralRoles,async(db,req)=>{
  const request=await row(db,'distribution_requests',req.params.id);
  if(request.status!=='ALLOCATED')throw fail('Only allocated requests can be dispatched.',409);
  if(request.requested_by===req.auth.userId||request.allocated_by===req.auth.userId)throw fail('Dispatch must be recorded by an officer other than the requester and allocator.',403);
  const source=await row(db,'inventory_items',request.source_item_id);
  await scope(req,source.org_unit_id,db);
  const shipped=qty(request.quantity).milli,onHand=qty(source.quantity_on_hand,{allowZero:true}).milli,reserved=qty(source.reserved_quantity||'0',{allowZero:true}).milli;
  if(reserved<shipped||onHand<shipped)throw fail('The reserved source stock is no longer available.',409);
  const carrier=required(req.body.carrier,'Carrier / responsible driver',160),vehicle=required(req.body.vehicleReference,'Vehicle or dispatch reference',120),tracking=required(req.body.trackingReference,'Waybill / tracking reference',160);
  const planned=optionalDate(req.body.plannedDispatchDate,'Planned dispatch date'),expected=optionalDate(req.body.expectedDeliveryDate,'Expected delivery date');
  if(planned&&expected&&expected<planned)throw fail('Expected delivery cannot precede dispatch.');
  await db.query('UPDATE inventory_items SET quantity_on_hand=quantity_on_hand-$2::numeric,reserved_quantity=reserved_quantity-$2::numeric,updated_at=now() WHERE id=$1',[source.id,request.quantity]);
  const movementId=randomUUID();
  await db.query("INSERT INTO inventory_movements(id,item_id,movement,quantity,value_minor,distribution_request_id,reference,reason,created_by) VALUES($1,$2,'TRANSFER_OUT',$3,$4,$5,$6,$7,$8)",[movementId,source.id,request.quantity,moneyValue(shipped,source.estimated_unit_cost_minor),request.id,tracking,`Dispatch to ${request.destination_org_unit_id}. ${required(req.body.note,'Dispatch contents and handover note')}`,req.auth.userId]);
  await db.query("UPDATE distribution_requests SET status='IN_TRANSIT',dispatch_carrier=$2,vehicle_reference=$3,tracking_reference=$4,planned_dispatch_date=$5,expected_delivery_date=$6,dispatched_by=$7,dispatched_at=now(),updated_at=now() WHERE id=$1",[request.id,carrier,vehicle,tracking,planned,expected,req.auth.userId]);
  await audit(db,req,'supply_chain.distribution_dispatched',request.id,{movementId,quantity:request.quantity,carrier,vehicleReference:vehicle,trackingReference:tracking,expectedDeliveryDate:expected});
  return {id:request.id,movementId};
 });

 post('/api/supply-chain/distribution/:id/receive',requestRoles,async(db,req)=>{
  const request=await row(db,'distribution_requests',req.params.id);
  if(request.status!=='IN_TRANSIT')throw fail('Only dispatched requests can be acknowledged.',409);
  await scope(req,request.destination_org_unit_id,db);
  if([request.requested_by,request.allocated_by,request.dispatched_by].includes(req.auth.userId))throw fail('Receipt acknowledgement must be recorded by a destination officer other than the requester, allocator and dispatcher.',403);
  const received=qty(req.body.receivedQuantity,{allowZero:true}),shipped=qty(request.quantity).milli;
  if(received.milli>shipped)throw fail('Received quantity cannot exceed the dispatched quantity.');
  const discrepancy=received.milli<shipped?required(req.body.discrepancyNote,'Shortage / damage discrepancy report'):null;
  const source=await row(db,'inventory_items',request.source_item_id,false);
  const destinationResult=await db.query('SELECT * FROM inventory_items WHERE org_unit_id=$1 AND lower(sku)=lower($2) FOR UPDATE',[request.destination_org_unit_id,request.sku]);
  let destination;
  if(destinationResult.rowCount){
   destination=destinationResult.rows[0];
   if(!destination.active||destination.unit_of_measure.toLowerCase()!==request.unit_of_measure.toLowerCase()||destination.currency!==source.currency)throw fail('The destination SKU has incompatible unit or currency settings. Resolve the destination item master first.',409);
  }else{
   destination={id:randomUUID(),quantity_on_hand:'0',estimated_unit_cost_minor:source.estimated_unit_cost_minor};
   await db.query('INSERT INTO inventory_items(id,org_unit_id,sku,name,unit_of_measure,quantity_on_hand,reorder_point,estimated_unit_cost_minor,currency,created_by) VALUES($1,$2,$3,$4,$5,0,$6,$7,$8,$9)',[destination.id,request.destination_org_unit_id,request.sku,request.item_name,request.unit_of_measure,request.destination_reorder_point,source.estimated_unit_cost_minor,source.currency,req.auth.userId]);
  }
  if(received.milli>0n){
   const oldQty=qty(destination.quantity_on_hand,{allowZero:true}).milli,oldCost=BigInt(destination.estimated_unit_cost_minor),incomingCost=BigInt(source.estimated_unit_cost_minor);
   const weightedCost=(oldQty+received.milli)>0n?(oldQty*oldCost+received.milli*incomingCost+(oldQty+received.milli)/2n)/(oldQty+received.milli):incomingCost;
   await db.query('UPDATE inventory_items SET quantity_on_hand=quantity_on_hand+$2::numeric,estimated_unit_cost_minor=$3,updated_at=now() WHERE id=$1',[destination.id,received.value,weightedCost.toString()]);
   const movementId=randomUUID();
   await db.query("INSERT INTO inventory_movements(id,item_id,movement,quantity,value_minor,distribution_request_id,reference,reason,created_by) VALUES($1,$2,'TRANSFER_IN',$3,$4,$5,$6,$7,$8)",[movementId,destination.id,received.value,moneyValue(received.milli,source.estimated_unit_cost_minor),request.id,request.tracking_reference,`Receipt from ${request.source_org_unit_id}. ${discrepancy||'Destination quantity checked and acknowledged.'}`,req.auth.userId]);
  }
  const status=discrepancy?'RECEIVED_WITH_VARIANCE':'RECEIVED';
  await db.query('UPDATE distribution_requests SET status=$2,received_quantity=$3,discrepancy_note=$4,received_by=$5,received_at=now(),updated_at=now() WHERE id=$1',[request.id,status,received.value,discrepancy,req.auth.userId]);
  await audit(db,req,discrepancy?'supply_chain.distribution_received_with_variance':'supply_chain.distribution_received',request.id,{quantityDispatched:request.quantity,quantityReceived:received.value,discrepancy,inventoryItemId:destination.id});
  return {id:request.id,status,inventoryItemId:destination.id};
 });
}
