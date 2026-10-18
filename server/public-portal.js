import rateLimit from 'express-rate-limit';

const fail = (message, status = 422) => Object.assign(new Error(message), { status, code: 'PUBLIC_PORTAL_ERROR' });
const required = (value, label, max = 240) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw fail(`${label} is required (maximum ${max} characters).`);
  return value.trim();
};
const emailAddress = (value) => {
  const email = required(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Enter a valid email address.');
  return email;
};
const safeUrl = (value) => {
  if (!value) return '';
  let url;
  try { url = new URL(value); } catch { throw fail('Document URL must be a valid HTTPS address.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw fail('Document URL must use HTTPS without embedded credentials.');
  return url.href;
};

export function validateNotice(body) {
  const deadline = new Date(body.submissionDeadline);
  if (!body.submissionDeadline || !Number.isFinite(deadline.getTime()) || deadline <= new Date()) throw fail('Set a future submission deadline.');
  if (!['CONSULTING_SERVICES','GOODS','WORKS','NON_CONSULTING'].includes(body.procurementCategory)) throw fail('Select a procurement category.');
  const requirements = required(body.requirements, 'Submission requirements', 12000).split('\n').map(s => s.trim()).filter(Boolean);
  const budget = body.estimatedBudgetUSD === '' || body.estimatedBudgetUSD == null ? null : Number(body.estimatedBudgetUSD);
  if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 1e12)) throw fail('Enter a valid estimated budget or leave it blank.');
  return {
    tenderRef: required(body.tenderRef, 'Tender reference', 100), title: required(body.title, 'Title', 500),
    procurementCategory: body.procurementCategory, submissionDeadline: deadline.toISOString(),
    managingDirector: required(body.managingDirector, 'Submission addressee'),
    submissionAddress: required(body.submissionAddress, 'Submission address', 1000),
    primaryEmail: emailAddress(body.primaryEmail), clarificationEmail: emailAddress(body.clarificationEmail || body.primaryEmail),
    telephones: required(body.telephones, 'Contact telephone', 240).split(',').map(s => s.trim()).filter(Boolean),
    estimatedBudgetUSD: budget, keyRequirements: requirements, documentsDownloadUrl: safeUrl(body.documentsDownloadUrl),
  };
}

export function registerPublicPortal(app, deps) {
  const { pool, transaction, writeAudit, uuid, route, ensureDb, loadAuth, csrfRequired, guard, assertOrgAccess, scopedUnits, actorFor } = deps;
  const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
  const serialize = row => ({ ...row.details, id: row.id, publishedDate: row.published_at,
    status: new Date(row.deadline) > new Date() ? 'OPEN_FOR_EXPRESSIONS' : 'CLOSED',
    publicationStatus: row.publication_status });
  const scoped = async req => scopedUnits(req.auth);
  const getNotice = async (client, id) => {
    if (!/^[0-9a-f-]{36}$/i.test(id || '')) throw fail('Notice not found.', 404);
    const result = await client.query('SELECT * FROM public_tender_notices WHERE id=$1 FOR UPDATE', [id]);
    if (!result.rowCount) throw fail('Notice not found.', 404);
    return result.rows[0];
  };

  app.get('/api/public/tenders', route(async (_req, res) => {
    ensureDb();
    const rows = await pool.query("SELECT id,details,deadline,published_at,publication_status FROM public_tender_notices WHERE publication_status='PUBLISHED' ORDER BY published_at DESC");
    res.json(rows.rows.map(serialize));
  }));
  app.get('/api/public/clarifications', route(async (_req, res) => {
    ensureDb();
    // Never return the submitter's identity, contact details, or unreviewed question publicly.
    const rows = await pool.query(`SELECT q.id,t.tender_ref AS "tenderRef",q.public_question AS question,
      q.official_response AS "officialResponse",q.response_date AS "responseDate",'ANSWERED' AS status,
      'Procurement Directorate' AS "respondedBy"
      FROM bidder_clarifications q JOIN public_tender_notices t ON t.id=q.tender_id
      WHERE t.publication_status='PUBLISHED' AND q.response_date IS NOT NULL ORDER BY q.response_date DESC`);
    res.json(rows.rows);
  }));
  app.post('/api/public/clarifications', publicLimiter, route(async (req, res) => {
    ensureDb();
    const body = req.body || {};
    const details = { company: required(body.companyName, 'Company'), contact: required(body.contactPerson, 'Contact person'),
      email: emailAddress(body.email), phone: required(body.phone, 'Telephone', 80), question: required(body.question, 'Question', 6000) };
    const id = uuid();
    await transaction(async client => {
      const notice = await getNotice(client, body.tenderId);
      if (notice.publication_status !== 'PUBLISHED' || new Date(notice.deadline) <= new Date()) throw fail('This notice is not open for questions.', 409);
      await client.query(`INSERT INTO bidder_clarifications(id,tender_id,company_name,contact_person,email,phone,question) VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id,notice.id,details.company,details.contact,details.email,details.phone,details.question]);
      await writeAudit(client, null, 'BIDDER_QUERY_RECEIVED', 'bidder_clarification', id, { tenderId: notice.id });
    });
    res.status(201).json({ id, status: 'PENDING_RESPONSE' });
  }));

  app.get('/api/procurement/notices', loadAuth, guard('notice.manage'), route(async (req, res) => {
    const scope = await scoped(req);
    const rows = await pool.query('SELECT * FROM public_tender_notices WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) ORDER BY created_at DESC', [scope]);
    res.json(rows.rows.map(serialize));
  }));
  app.post('/api/procurement/notices', loadAuth, csrfRequired, guard('notice.manage'), route(async (req, res) => {
    const details = validateNotice(req.body || {});
    const unitId = req.body.orgUnitId;
    await assertOrgAccess(req.auth, unitId);
    const id = uuid();
    await transaction(async client => {
      await client.query(`INSERT INTO public_tender_notices(id,tender_ref,org_unit_id,details,deadline,created_by) VALUES($1,$2,$3,$4,$5,$6)`,
        [id,details.tenderRef,unitId,details,details.submissionDeadline,req.auth.userId]);
      await writeAudit(client, actorFor(req), 'NOTICE_DRAFTED', 'public_tender_notice', id, { tenderRef: details.tenderRef });
    });
    res.status(201).json({ id });
  }));
  for (const action of ['publish','withdraw']) {
    app.post(`/api/procurement/notices/:id/${action}`, loadAuth, csrfRequired, guard('notice.manage'), route(async (req, res) => {
      await transaction(async client => {
        const notice = await getNotice(client, req.params.id);
        await assertOrgAccess(req.auth, notice.org_unit_id);
        const expected = action === 'publish' ? 'DRAFT' : 'PUBLISHED';
        if (notice.publication_status !== expected) throw fail(`Only ${expected.toLowerCase()} notices can be ${action === 'publish' ? 'published' : 'withdrawn'}.`, 409);
        if (action === 'publish' && new Date(notice.deadline) <= new Date()) throw fail('The deadline has passed; create a corrected notice.', 409);
        await client.query(`UPDATE public_tender_notices SET publication_status=$2,published_by=$3,published_at=CASE WHEN $2='PUBLISHED' THEN now() ELSE published_at END WHERE id=$1`,
          [notice.id,action === 'publish' ? 'PUBLISHED' : 'WITHDRAWN',req.auth.userId]);
        await writeAudit(client, actorFor(req), action === 'publish' ? 'NOTICE_PUBLISHED' : 'NOTICE_WITHDRAWN', 'public_tender_notice', notice.id);
      });
      res.json({ saved: true });
    }));
  }
  app.get('/api/procurement/clarifications', loadAuth, guard('notice.manage'), route(async (req, res) => {
    const rows = await pool.query(`SELECT q.*,t.tender_ref FROM bidder_clarifications q JOIN public_tender_notices t ON t.id=q.tender_id
      WHERE ($1::uuid[] IS NULL OR t.org_unit_id=ANY($1::uuid[])) ORDER BY q.created_at DESC`, [await scoped(req)]);
    res.json(rows.rows);
  }));
  app.post('/api/procurement/clarifications/:id/respond', loadAuth, csrfRequired, guard('notice.manage'), route(async (req, res) => {
    const publicQuestion = required(req.body.publicQuestion, 'Reviewed public question', 6000);
    const response = required(req.body.response, 'Official response', 12000);
    if (req.body.confirmPublication !== true) throw fail('Confirm that the reviewed question and response may be published.');
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw fail('Question not found.', 404);
    await transaction(async client => {
      const result = await client.query(`SELECT q.*,t.org_unit_id,t.publication_status FROM bidder_clarifications q JOIN public_tender_notices t ON t.id=q.tender_id WHERE q.id=$1 FOR UPDATE OF q,t`, [req.params.id]);
      const query = result.rows[0];
      if (!query) throw fail('Question not found.', 404);
      await assertOrgAccess(req.auth, query.org_unit_id);
      if (query.response_date) throw fail('This response is already published.', 409);
      if (query.publication_status !== 'PUBLISHED') throw fail('The related notice is not published.', 409);
      await client.query('UPDATE bidder_clarifications SET public_question=$2,official_response=$3,responded_by=$4,response_date=now() WHERE id=$1', [query.id,publicQuestion,response,req.auth.userId]);
      await writeAudit(client, actorFor(req), 'CLARIFICATION_PUBLISHED', 'bidder_clarification', query.id, { publicQuestion, response });
    });
    res.json({ saved: true });
  }));
}
