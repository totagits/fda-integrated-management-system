ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN','PROCUREMENT_CONTRACT','PAYROLL','STOCKTAKE','DEPRECIATION','BANK_STATEMENT','EVALUATION','VACANCY','APPLICATION','ONBOARDING','TRAINING','PERFORMANCE','DISCIPLINARY','GRIEVANCE','FLEET_VEHICLE','FACILITY','INSURANCE','ASSET_INCIDENT','ASSET_ACCOUNTING_POLICY','FIELD_DEVICE_ACCEPTANCE','ASSET_INSURANCE_CLAIM','FINANCE_GRANT','FINANCE_RECEIVABLE','FINANCE_ADVANCE'));

CREATE TABLE finance_grants (
  id uuid PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  funder text NOT NULL,
  project_code text NOT NULL,
  title text NOT NULL,
  currency text NOT NULL CHECK(currency IN ('USD','LRD')),
  award_minor bigint NOT NULL CHECK(award_minor > 0),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK(end_date >= start_date),
  restricted_purpose text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','CLOSED','REJECTED')),
  created_by uuid NOT NULL REFERENCES users(id),
  decided_by uuid REFERENCES users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_grants_scope ON finance_grants(org_unit_id,status,end_date);

CREATE TABLE finance_receivables (
  id uuid PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  grant_id uuid REFERENCES finance_grants(id),
  payer text NOT NULL,
  description text NOT NULL,
  currency text NOT NULL CHECK(currency IN ('USD','LRD')),
  amount_minor bigint NOT NULL CHECK(amount_minor > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','PARTIAL','SETTLED','VOID','REJECTED')),
  created_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_receivables_scope_due ON finance_receivables(org_unit_id,due_date,status);

CREATE TABLE finance_receivable_receipts (
  id uuid PRIMARY KEY,
  receivable_id uuid NOT NULL REFERENCES finance_receivables(id),
  reference text NOT NULL UNIQUE,
  amount_minor bigint NOT NULL CHECK(amount_minor > 0),
  received_date date NOT NULL,
  evidence_reference text NOT NULL,
  status text NOT NULL DEFAULT 'RECORDED' CHECK(status IN ('RECORDED','VERIFIED','REJECTED')),
  recorded_by uuid NOT NULL REFERENCES users(id),
  verified_by uuid REFERENCES users(id),
  verification_note text,
  bank_statement_line_id uuid UNIQUE REFERENCES bank_statement_lines(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_receipts_receivable ON finance_receivable_receipts(receivable_id,status);
CREATE VIEW finance_receivable_register AS
 SELECT r.*,g.reference AS grant_reference,g.project_code,
  coalesce(sum(x.amount_minor) FILTER(WHERE x.status='VERIFIED'),0)::text AS verified_receipts_minor,
  greatest(r.amount_minor-coalesce(sum(x.amount_minor) FILTER(WHERE x.status='VERIFIED'),0),0)::text AS outstanding_minor
 FROM finance_receivables r LEFT JOIN finance_grants g ON g.id=r.grant_id
 LEFT JOIN finance_receivable_receipts x ON x.receivable_id=r.id
 GROUP BY r.id,g.reference,g.project_code;

CREATE TABLE finance_staff_advances (
  id uuid PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  requester_id uuid NOT NULL REFERENCES users(id),
  purpose text NOT NULL,
  currency text NOT NULL CHECK(currency IN ('USD','LRD')),
  amount_minor bigint NOT NULL CHECK(amount_minor > 0),
  needed_by date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','DISBURSEMENT_RECORDED','RETIREMENT_SUBMITTED','RETIRED','EXCEPTION')),
  approved_by uuid REFERENCES users(id),
  disbursed_by uuid REFERENCES users(id),
  disbursement_reference text,
  decision_note text,
  retirement_note text,
  retired_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_advances_scope_status ON finance_staff_advances(org_unit_id,status,needed_by);
ALTER TABLE finance_staff_advances ADD COLUMN return_reference text;
CREATE TABLE finance_advance_expenses (
  id uuid PRIMARY KEY,
  advance_id uuid NOT NULL REFERENCES finance_staff_advances(id),
  expense_date date NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  amount_minor bigint NOT NULL CHECK(amount_minor > 0),
  evidence_reference text NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_advance_expenses_advance ON finance_advance_expenses(advance_id);

CREATE TABLE finance_policy_versions (
  id uuid PRIMARY KEY,
  policy_key text NOT NULL,
  version integer NOT NULL CHECK(version > 0),
  title text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  configuration jsonb NOT NULL,
  evidence_reference text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','SUPERSEDED')),
  created_by uuid NOT NULL REFERENCES users(id),
  decided_by uuid REFERENCES users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(policy_key,version),
  CHECK(effective_to IS NULL OR effective_to>=effective_from)
);
CREATE UNIQUE INDEX finance_policy_one_approved ON finance_policy_versions(policy_key) WHERE status='APPROVED';

CREATE TABLE finance_fx_rates (
  id uuid PRIMARY KEY,
  effective_date date NOT NULL,
  lrd_per_usd numeric(18,6) NOT NULL CHECK(lrd_per_usd > 0),
  source_name text NOT NULL,
  source_reference text NOT NULL,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED')),
  created_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(effective_date,source_name)
);
CREATE INDEX finance_fx_rates_effective ON finance_fx_rates(effective_date DESC,status);

CREATE TABLE finance_statement_packages (
  id uuid PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  fiscal_period_id uuid NOT NULL REFERENCES fiscal_periods(id),
  statement_type text NOT NULL CHECK(statement_type IN ('TRIAL_BALANCE','BALANCE_SHEET','INCOME_EXPENDITURE')),
  currency text NOT NULL CHECK(currency IN ('USD','LRD')),
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED')),
  created_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  evidence_reference text NOT NULL,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_statement_scope ON finance_statement_packages(org_unit_id,fiscal_period_id,status);
