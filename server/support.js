import { randomUUID } from 'node:crypto';

const modules=['ACCOUNT','HR','FINANCE','PROCUREMENT','ASSETS','INTEGRATIONS','OTHER'];
const priorities=['LOW','NORMAL','HIGH','URGENT'];
const states=['OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED'];
const fail=(message,status=422,code='INVALID_INPUT')=>Object.assign(new Error(message),{status,code});
const trim=(value,name,max,min=1)=>{const v=typeof value==='string'?value.trim():'';if(v.length<min||v.length>max)throw fail(`${name} must be between ${min} and ${max} characters.`);return v;};
const isIT=auth=>auth.roles?.some(item=>item.role==='IT_DIRECTOR')||auth.role==='IT_DIRECTOR';
const actor=req=>({userId:req.auth.userId,role:req.auth.role,orgUnitId:req.auth.orgUnitId||null,requestId:req.requestId});

export function registerSupport(app,{pool,transaction,writeAudit,route,loadAuth,csrfRequired,uuid=randomUUID}){
  const ensureParticipant=async(req,id,db=pool,lock=false)=>{
    const ticket=(await db.query(`SELECT * FROM support_tickets WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0];
    if(!ticket)throw fail('Support ticket not found.',404,'NOT_FOUND');
    if(!isIT(req.auth)&&ticket.requester_id!==req.auth.userId)throw fail('You can view only tickets you submitted.',403,'FORBIDDEN');
    return ticket;
  };

  app.get('/api/support/tickets',loadAuth,route(async(req,res)=>{
    const {status,module,q}=req.query;
    if(status&&!states.includes(status))throw fail('Select a supported ticket status.');
    if(module&&!modules.includes(module))throw fail('Select a supported module.');
    const params=[isIT(req.auth)?null:req.auth.userId,status||null,module||null,q?`%${String(q).trim().slice(0,100)}%`:null];
    const rows=await pool.query(`SELECT t.id,t.ticket_number,t.requester_id,u.full_name AS requester_name,u.email AS requester_email,
        t.requester_role,t.org_unit_id,o.name AS office_name,t.module,t.subject,t.priority,t.status,
        t.assigned_to,a.full_name AS assigned_to_name,t.created_at,t.updated_at,t.resolved_at,
        (SELECT count(*)::int FROM support_ticket_messages m WHERE m.ticket_id=t.id) AS message_count
      FROM support_tickets t JOIN users u ON u.id=t.requester_id LEFT JOIN org_units o ON o.id=t.org_unit_id
      LEFT JOIN users a ON a.id=t.assigned_to
      WHERE ($1::uuid IS NULL OR t.requester_id=$1) AND ($2::text IS NULL OR t.status=$2)
        AND ($3::text IS NULL OR t.module=$3) AND ($4::text IS NULL OR t.ticket_number ILIKE $4 OR t.subject ILIKE $4)
      ORDER BY CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END,t.updated_at DESC LIMIT 300`,params);
    res.json({tickets:rows.rows,view:isIT(req.auth)?'IT_QUEUE':'MY_TICKETS'});
  }));

  app.post('/api/support/tickets',loadAuth,csrfRequired,route(async(req,res)=>{
    const body=req.body||{},module=String(body.module||'');
    if(!modules.includes(module))throw fail('Select which ERP area is affected.');
    const priority=body.priority||'NORMAL';if(!priorities.includes(priority))throw fail('Select a supported priority.');
    const subject=trim(body.subject,'Subject',180,4),description=trim(body.description,'Issue description',5000,10);
    const id=uuid(),ticketNumber=`FDA-IT-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,6).toUpperCase()}`;
    await transaction(async db=>{
      await db.query(`INSERT INTO support_tickets(id,ticket_number,requester_id,requester_role,org_unit_id,module,subject,description,priority)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,ticketNumber,req.auth.userId,req.auth.role,req.auth.orgUnitId||null,module,subject,description,priority]);
      await db.query('INSERT INTO support_ticket_messages(id,ticket_id,author_id,body) VALUES($1,$2,$3,$4)',[uuid(),id,req.auth.userId,description]);
      await writeAudit(db,actor(req),'support.ticket_created','support_ticket',id,{ticketNumber,module,priority});
    });
    res.status(201).json({id,ticketNumber,status:'OPEN'});
  }));

  app.get('/api/support/tickets/:id/messages',loadAuth,route(async(req,res)=>{
    const ticket=await ensureParticipant(req,req.params.id);
    const messages=await pool.query(`SELECT m.id,m.ticket_id,m.author_id,u.full_name AS author_name,m.body,m.created_at,
        (m.author_id=$2) AS authored_by_me FROM support_ticket_messages m JOIN users u ON u.id=m.author_id
      WHERE m.ticket_id=$1 ORDER BY m.created_at,m.id`,[ticket.id,req.auth.userId]);
    res.json({ticket,messages:messages.rows});
  }));

  app.post('/api/support/tickets/:id/messages',loadAuth,csrfRequired,route(async(req,res)=>{
    const id=req.params.id,body=req.body||{},message=trim(body.message,'Message',5000);
    const nextStatus=body.status;
    if(nextStatus&&!isIT(req.auth))throw fail('Only IT support can update a ticket status.',403,'FORBIDDEN');
    if(nextStatus&&!states.includes(nextStatus))throw fail('Select a supported ticket status.');
    const result=await transaction(async db=>{
      const ticket=await ensureParticipant(req,id,db,true);
      if(ticket.status==='CLOSED')throw fail('This ticket is closed. Submit a new ticket if the issue continues.',409,'TICKET_CLOSED');
      if(nextStatus){
        const transitions={OPEN:['IN_PROGRESS','WAITING_USER','RESOLVED'],IN_PROGRESS:['OPEN','WAITING_USER','RESOLVED'],WAITING_USER:['OPEN','IN_PROGRESS','RESOLVED'],RESOLVED:['IN_PROGRESS','CLOSED'],CLOSED:[]};
        if(!transitions[ticket.status]?.includes(nextStatus))throw fail(`A ticket cannot move from ${ticket.status} to ${nextStatus}.`,409,'INVALID_TICKET_TRANSITION');
      }
      await db.query('INSERT INTO support_ticket_messages(id,ticket_id,author_id,body) VALUES($1,$2,$3,$4)',[uuid(),id,req.auth.userId,message]);
      const status=nextStatus||(ticket.status==='RESOLVED'&&!isIT(req.auth)?'OPEN':ticket.status),assignedTo=isIT(req.auth)?(ticket.assigned_to||req.auth.userId):ticket.assigned_to;
      await db.query(`UPDATE support_tickets SET status=$2,assigned_to=$3,updated_at=now(),
        resolved_at=CASE WHEN $2='RESOLVED' THEN COALESCE(resolved_at,now()) WHEN $2='IN_PROGRESS' THEN NULL ELSE resolved_at END,
        closed_at=CASE WHEN $2='CLOSED' THEN now() ELSE closed_at END WHERE id=$1`,[id,status,assignedTo]);
      await writeAudit(db,actor(req),'support.ticket_message_added','support_ticket',id,{ticketNumber:ticket.ticket_number,status,changedStatus:Boolean(nextStatus)});
      return {ticketNumber:ticket.ticket_number,status};
    });
    res.json(result);
  }));
}
