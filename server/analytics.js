const roleSets = {
  executive: ['MANAGING_DIRECTOR'],
  hr: ['MANAGING_DIRECTOR', 'HR_DIRECTOR'],
  finance: ['MANAGING_DIRECTOR', 'FINANCE_DIRECTOR', 'INTERNAL_AUDITOR'],
  procurement: ['MANAGING_DIRECTOR', 'PROCUREMENT_OFFICER', 'FINANCE_DIRECTOR', 'COUNTY_OFFICER', 'INTERNAL_AUDITOR'],
  assets: ['MANAGING_DIRECTOR', 'ASSET_OFFICER', 'COUNTY_OFFICER', 'PROCUREMENT_OFFICER', 'FINANCE_DIRECTOR', 'INTERNAL_AUDITOR'],
  it: ['MANAGING_DIRECTOR', 'IT_DIRECTOR'],
  audit: ['MANAGING_DIRECTOR', 'INTERNAL_AUDITOR'],
};

const has = (roles, ...allowed) => roles.some(role => allowed.includes(role));
const section = (key, title, description, metrics) => ({ key, title, description, metrics });
const metric = (label, value, note) => ({ label, value: value == null ? null : (typeof value === 'number' ? value : String(value)), note });
const majorUnits = minor => {
  const value = BigInt(minor || 0);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};
const countByStatus = async (pool, table, units, statusColumn = 'status', where = '') => {
  const result = await pool.query(
    `SELECT ${statusColumn} AS status,count(*)::integer AS total FROM ${table}
     WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) ${where}
     GROUP BY ${statusColumn} ORDER BY ${statusColumn}`,
    [units],
  );
  return Object.fromEntries(result.rows.map(row => [row.status, Number(row.total)]));
};
const sumByCurrency = async (pool, units) => {
  const result = await pool.query(`SELECT currency,
    coalesce(sum(allocated_minor),0)::text AS allocated,
    coalesce(sum(reserved_minor),0)::text AS committed,
    coalesce(sum(spent_minor),0)::text AS spent,
    count(*)::integer AS accounts
    FROM budget_accounts WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) GROUP BY currency ORDER BY currency`, [units]);
  return result.rows;
};

export function registerAnalytics(app, { pool, route, loadAuth, scopedUnits }) {
  app.get('/api/finance/overview', loadAuth, route(async (req, res) => {
    const roles = (req.auth.roles || []).map(item => item.role);
    if (!has(roles, ...roleSets.finance)) return res.status(403).json({ error: 'Finance analytics access is not assigned to this account.' });
    const units = await scopedUnits(req.auth);
    const [freshness, budgets, offices, ledger, payables, approvals, banks, revisions] = await Promise.all([
      pool.query('SELECT now() AS as_of'),
      pool.query(`SELECT currency,count(*)::integer AS accounts,
        coalesce(sum(allocated_minor),0)::text AS allocated,
        coalesce(sum(reserved_minor),0)::text AS committed,
        coalesce(sum(spent_minor),0)::text AS spent,
        coalesce(sum(allocated_minor-reserved_minor-spent_minor),0)::text AS available
        FROM budget_accounts WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))
        GROUP BY currency ORDER BY currency`, [units]),
      pool.query(`SELECT o.id,o.code,o.name,b.currency,count(b.id)::integer AS accounts,
        coalesce(sum(b.allocated_minor),0)::text AS allocated,
        coalesce(sum(b.reserved_minor),0)::text AS committed,
        coalesce(sum(b.spent_minor),0)::text AS spent,
        coalesce(sum(b.allocated_minor-b.reserved_minor-b.spent_minor),0)::text AS available
        FROM budget_accounts b JOIN org_units o ON o.id=b.org_unit_id
        WHERE ($1::uuid[] IS NULL OR b.org_unit_id=ANY($1::uuid[]))
        GROUP BY o.id,o.code,o.name,b.currency ORDER BY o.name,b.currency LIMIT 200`, [units]),
      pool.query(`SELECT j.currency,a.account_type,
        coalesce(sum(l.debit_minor),0)::text AS debits,
        coalesce(sum(l.credit_minor),0)::text AS credits,
        coalesce(sum(CASE WHEN a.account_type IN ('ASSET','EXPENSE') THEN l.debit_minor-l.credit_minor ELSE l.credit_minor-l.debit_minor END),0)::text AS balance
        FROM gl_journal_lines l JOIN gl_journals j ON j.id=l.journal_id JOIN gl_accounts a ON a.id=l.account_id
        WHERE j.status='POSTED' AND ($1::uuid[] IS NULL OR j.org_unit_id=ANY($1::uuid[]))
        GROUP BY j.currency,a.account_type ORDER BY j.currency,a.account_type`, [units]),
      pool.query(`SELECT i.currency,
        count(*) FILTER(WHERE i.status IN ('MATCHED','AUTHORIZED'))::integer AS awaiting_payment_count,
        coalesce(sum(i.amount_minor-COALESCE(p.paid_minor,0)) FILTER(WHERE i.status IN ('MATCHED','AUTHORIZED')),0)::text AS awaiting_payment,
        count(*) FILTER(WHERE i.status='EXCEPTION')::integer AS match_exceptions,
        coalesce(sum(i.amount_minor-COALESCE(p.paid_minor,0)) FILTER(WHERE i.status='EXCEPTION'),0)::text AS exception_value,
        count(*) FILTER(WHERE i.status='PAID')::integer AS fully_paid_count
        FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id
        LEFT JOIN LATERAL (SELECT sum(amount_minor)::bigint AS paid_minor FROM payments WHERE invoice_id=i.id AND status='PAID') p ON true
        WHERE ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[]))
        GROUP BY i.currency ORDER BY i.currency`, [units]),
      pool.query(`SELECT
        (SELECT count(*)::integer FROM requisitions WHERE status='SUBMITTED' AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))) AS requisitions,
        (SELECT count(*)::integer FROM invoices i JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id WHERE i.status='MATCHED' AND ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[]))) AS invoices,
        (SELECT count(*)::integer FROM payroll_runs WHERE status='SUBMITTED' AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))) AS payroll,
        (SELECT count(*)::integer FROM gl_journals WHERE status='DRAFT' AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))) AS journals`, [units]),
      pool.query(`SELECT count(*) FILTER(WHERE status='OPEN')::integer AS open,
        count(*) FILTER(WHERE status='RECONCILED')::integer AS reconciled,
        count(*)::integer AS total
        FROM bank_statements WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
      pool.query(`SELECT count(*) FILTER(WHERE status='PENDING')::integer AS pending
        FROM finance_budget_revisions v JOIN budget_accounts b ON b.id=v.budget_account_id
        WHERE ($1::uuid[] IS NULL OR b.org_unit_id=ANY($1::uuid[]))`, [units]),
    ]);
    res.json({
      asOf: freshness.rows[0].as_of,
      scope: 'FDA-wide (authorized finance / audit roles)',
      currencyTotals: budgets.rows,
      officeBudgets: offices.rows,
      ledgerByType: ledger.rows,
      accountsPayable: payables.rows,
      pendingApprovals: approvals.rows[0],
      bankReconciliation: banks.rows[0],
      pendingBudgetRevisions: revisions.rows[0].pending,
      limitations: {
        cashPosition: 'Not calculated: no verified live bank balance feed is configured.',
        forecast: 'Not calculated: approved forecast assumptions and schedule data are not configured.',
        integrations: 'IFMIS, bank, payroll and e-procurement connections are not verified.',
      },
    });
  }));

  app.get('/api/analytics/summary', loadAuth, route(async (req, res) => {
    const roles = (req.auth.roles || []).map(item => item.role);
    if (!roles.length) return res.status(403).json({ error: 'No analytics access is assigned to this account.' });
    const units = has(roles, 'IT_DIRECTOR') ? null : await scopedUnits(req.auth);
    const freshness = await pool.query('SELECT now() AS as_of');
    const sections = [];

    if (has(roles, ...roleSets.hr)) {
      const [workforce, vacancies, leave, attendance, performance, training] = await Promise.all([
        pool.query(`SELECT count(*) FILTER(WHERE status='ACTIVE')::integer AS active,
          count(*) FILTER(WHERE status='EXITED')::integer AS exited FROM hr_employees
          WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*) FILTER(WHERE status='PUBLISHED')::integer AS published,
          count(*) FILTER(WHERE status IN ('DRAFT','SUBMITTED'))::integer AS awaiting_action
          FROM hr_vacancies WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*) FILTER(WHERE status='SUBMITTED')::integer AS pending FROM hr_leave_requests
          WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*)::integer AS total FROM hr_attendance
          WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))
          AND work_date>=date_trunc('month',now() AT TIME ZONE 'UTC')::date`, [units]),
        pool.query(`SELECT count(*) FILTER(WHERE status='OPEN')::integer AS open_cycles,
          count(*) FILTER(WHERE status='CLOSED')::integer AS closed_cycles
          FROM hr_performance_cycles WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*) FILTER(WHERE status NOT IN ('COMPLETED','FAILED','WITHDRAWN','REJECTED'))::integer AS active,
          count(*) FILTER(WHERE status='COMPLETED')::integer AS completed
          FROM hr_training_enrollments WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
      ]);
      sections.push(section('hr', 'Human resources', 'Workforce and service delivery indicators for your authorized offices.', [
        metric('Active employees', workforce.rows[0].active), metric('Former employees', workforce.rows[0].exited),
        metric('Published vacancies', vacancies.rows[0].published), metric('Vacancies awaiting action', vacancies.rows[0].awaiting_action),
        metric('Leave requests awaiting decision', leave.rows[0].pending), metric('Attendance records this month', attendance.rows[0].total),
        metric('Open performance cycles', performance.rows[0].open_cycles), metric('Closed performance cycles', performance.rows[0].closed_cycles),
        metric('Active training enrollments', training.rows[0].active), metric('Verified training completions', training.rows[0].completed),
      ]));
    }

    if (has(roles, ...roleSets.finance)) {
      const [budgets, paymentQueue, bank] = await Promise.all([
        sumByCurrency(pool, units),
        pool.query(`SELECT count(*)::integer AS total FROM finance_payment_posting_queue
          WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*) FILTER(WHERE status='OPEN')::integer AS unreconciled,
          count(*)::integer AS statements FROM bank_statements
          WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
      ]);
      const currencyMetrics = budgets.flatMap(row => [
        metric(`${row.currency} allocated`, `${row.currency} ${majorUnits(row.allocated)}`),
        metric(`${row.currency} committed`, `${row.currency} ${majorUnits(row.committed)}`, 'Commitments are not combined across currencies.'),
        metric(`${row.currency} spent`, `${row.currency} ${majorUnits(row.spent)}`, 'Expenditure is not combined across currencies.'),
      ]);
      if (!budgets.length) currencyMetrics.push(metric('Budget totals', null, 'No budget accounts are available in this reporting scope, so allocation, commitments and spending cannot be calculated.'));
      sections.push(section('finance', 'Financial management', 'Budget execution, payment posting and bank reconciliation. Currency totals remain separate.', [
        ...currencyMetrics,
        metric('Payment posting queue', paymentQueue.rows[0].total),
        metric('Unreconciled bank statements', bank.rows[0].unreconciled),
        metric('Bank statements on record', bank.rows[0].statements),
      ]));
    }

    if (has(roles, ...roleSets.procurement)) {
      const [plans, requisitions, evaluations, receipts, invoices] = await Promise.all([
        countByStatus(pool, 'procurement_plans', units),
        countByStatus(pool, 'requisitions', units),
        countByStatus(pool, 'bid_evaluations', units),
        pool.query(`SELECT count(*)::integer AS total FROM goods_receipts g
          JOIN purchase_orders p ON p.id=g.purchase_order_id JOIN requisitions r ON r.id=p.requisition_id
          WHERE g.status='PENDING' AND ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*)::integer AS total FROM invoices i JOIN purchase_orders p ON p.id=i.purchase_order_id
          JOIN requisitions r ON r.id=p.requisition_id WHERE i.status='EXCEPTION'
          AND ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[]))`, [units]),
      ]);
      const metrics = [
        ...Object.entries(plans).map(([status, value]) => metric(`Procurement plans · ${status.replaceAll('_',' ').toLowerCase()}`, value)),
        ...Object.entries(requisitions).map(([status, value]) => metric(`Requisitions · ${status.replaceAll('_',' ').toLowerCase()}`, value)),
        ...Object.entries(evaluations).map(([status, value]) => metric(`Bid evaluations · ${status.replaceAll('_',' ').toLowerCase()}`, value)),
        metric('Deliveries awaiting inspection', receipts.rows[0].total),
        metric('Invoice match exceptions', invoices.rows[0].total),
      ];
      sections.push(section('procurement', 'Procurement', 'Plan execution, sourcing stages, delivery inspections and invoice matching.', metrics));
    }

    if (has(roles, ...roleSets.assets)) {
      const [assetStates, lowStock, replenishments, missing, stocktakes] = await Promise.all([
        pool.query(`SELECT lifecycle_status,condition,count(*)::integer AS total FROM assets
          WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[])) GROUP BY lifecycle_status,condition ORDER BY lifecycle_status,condition`, [units]),
        pool.query(`SELECT count(*)::integer AS total FROM inventory_items
          WHERE active AND quantity_on_hand<=reorder_point AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*)::integer AS total FROM inventory_replenishments r JOIN inventory_items i ON i.id=r.item_id
          WHERE r.status='SUBMITTED' AND ($1::uuid[] IS NULL OR i.org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*)::integer AS total FROM stocktake_lines l JOIN stocktakes s ON s.id=l.stocktake_id
          WHERE l.result='MISSING' AND ($1::uuid[] IS NULL OR s.org_unit_id=ANY($1::uuid[]))`, [units]),
        countByStatus(pool, 'stocktakes', units),
      ]);
      const metrics = assetStates.rows.map(row => metric(`Assets · ${row.lifecycle_status.toLowerCase()} · ${row.condition.toLowerCase()}`, row.total));
      metrics.push(metric('Items at or below reorder point', lowStock.rows[0].total), metric('Replenishment requests submitted', replenishments.rows[0].total), metric('Stocktake discrepancies · missing', missing.rows[0].total));
      for (const [status, value] of Object.entries(stocktakes)) metrics.push(metric(`Stocktakes · ${status.toLowerCase()}`, value));
      sections.push(section('assets', 'Assets and inventory', 'Asset condition, stock levels, replenishment and stocktaking outcomes.', metrics));
    }

    if (has(roles, ...roleSets.it)) {
      const [tickets, invites, outbox] = await Promise.all([
        pool.query(`SELECT count(*) FILTER(WHERE status IN ('OPEN','IN_PROGRESS','WAITING_USER'))::integer AS open,
          count(*) FILTER(WHERE status IN ('OPEN','IN_PROGRESS') AND created_at<now()-interval '3 days')::integer AS older_three_days
          FROM support_tickets WHERE ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*)::integer AS pending FROM identity_invitations
          WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()
          AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))`, [units]),
        pool.query(`SELECT count(*) FILTER(WHERE delivered_at IS NULL)::integer AS pending,
          count(*) FILTER(WHERE delivered_at IS NULL AND attempts>0)::integer AS retrying
          FROM integration_outbox`),
      ]);
      sections.push(section('it', 'IT operations', 'Support queue, account setup invitations and integration delivery status.', [
        metric('Open support requests', tickets.rows[0].open), metric('Open requests older than 3 days', tickets.rows[0].older_three_days, 'Operational aging indicator; not a configured service-level agreement.'),
        metric('Pending account invitations', invites.rows[0].pending), metric('Webhook delivery backlog', outbox.rows[0].pending),
        metric('Webhook deliveries retrying', outbox.rows[0].retrying),
        metric('Outbound webhook configuration', process.env.INTEGRATION_WEBHOOK_URL && process.env.INTEGRATION_WEBHOOK_SECRET ? 1 : 0, '1 = configured; 0 = not configured. This does not confirm a successful external delivery.'),
      ]));
    }

    if (has(roles, ...roleSets.audit)) {
      const [coverage, exceptions] = await Promise.all([
        pool.query(`SELECT count(*) FILTER(WHERE created_at>=now()-interval '30 days')::integer AS last_30_days,
          count(*)::integer AS total FROM audit_events WHERE created_at>=now()-interval '365 days'`),
        pool.query(`SELECT
          (SELECT count(*)::integer FROM bank_statements WHERE status='OPEN' AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))) AS unreconciled_banks,
          (SELECT count(*)::integer FROM invoices i JOIN purchase_orders p ON p.id=i.purchase_order_id JOIN requisitions r ON r.id=p.requisition_id
             WHERE i.status='EXCEPTION' AND ($1::uuid[] IS NULL OR r.org_unit_id=ANY($1::uuid[]))) AS invoice_exceptions,
          (SELECT count(*)::integer FROM inventory_items WHERE active AND quantity_on_hand<=reorder_point AND ($1::uuid[] IS NULL OR org_unit_id=ANY($1::uuid[]))) AS low_stock`, [units]),
      ]);
      sections.push(section('audit', 'Internal audit', 'Read-only audit coverage and open operational control indicators; these are not adjudicated audit findings.', [
        metric('Audit events · last 30 days', coverage.rows[0].last_30_days), metric('Audit events · last 12 months', coverage.rows[0].total),
        metric('Unreconciled bank statements', exceptions.rows[0].unreconciled_banks), metric('Invoice match exceptions', exceptions.rows[0].invoice_exceptions),
        metric('Inventory items at or below reorder point', exceptions.rows[0].low_stock),
      ]));
    }

    if (!sections.length) {
      sections.push(section('personal', 'My work', 'Personal tasks and service indicators. No broad department analytics are assigned to this role.', [
        metric('Assigned office scope', units === null ? 'Organization-wide' : units.length ? units.length : 0),
      ]));
    }
    res.json({ asOf: new Date(freshness.rows[0].as_of).toISOString(), scope: units === null ? 'Organization-wide' : units.length ? 'Assigned offices' : 'No office scope assigned', sections });
  }));
}
