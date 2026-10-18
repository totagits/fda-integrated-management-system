CREATE TABLE payroll_runs (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, org_unit_id uuid NOT NULL REFERENCES org_units(id),
 start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>=start_date), currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','JOURNALED')),
 created_by uuid NOT NULL REFERENCES users(id), approved_by uuid REFERENCES users(id), decision_note text,
 journal_id uuid UNIQUE REFERENCES gl_journals(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payroll_lines (
 id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES payroll_runs(id), employee_id uuid NOT NULL REFERENCES hr_employees(id),
 gross_minor bigint NOT NULL CHECK(gross_minor>0), deduction_minor bigint NOT NULL CHECK(deduction_minor>=0 AND deduction_minor<gross_minor),
 basis text NOT NULL, UNIQUE(run_id,employee_id)
);
CREATE VIEW payroll_register AS SELECT r.*,coalesce((SELECT sum(gross_minor) FROM payroll_lines l WHERE l.run_id=r.id),0) AS gross_minor,coalesce((SELECT sum(deduction_minor) FROM payroll_lines l WHERE l.run_id=r.id),0) AS deduction_minor,coalesce((SELECT sum(gross_minor-deduction_minor) FROM payroll_lines l WHERE l.run_id=r.id),0) AS net_minor FROM payroll_runs r;
CREATE TABLE stocktakes (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, org_unit_id uuid NOT NULL REFERENCES org_units(id),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','SUBMITTED','APPROVED','RETURNED')),
 created_by uuid NOT NULL REFERENCES users(id), approved_by uuid REFERENCES users(id), decision_note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX stocktake_open_office ON stocktakes(org_unit_id) WHERE status IN ('OPEN','SUBMITTED','RETURNED');
CREATE TABLE stocktake_lines (
 id uuid PRIMARY KEY, stocktake_id uuid NOT NULL REFERENCES stocktakes(id), asset_id uuid NOT NULL REFERENCES assets(id),
 asset_tag text NOT NULL, expected_location text NOT NULL, expected_condition text NOT NULL, asset_version integer NOT NULL,
 result text CHECK(result IN ('PRESENT','MISSING')), actual_location text, actual_condition text, note text, counted_by uuid REFERENCES users(id), counted_at timestamptz,
 UNIQUE(stocktake_id,asset_id)
);
CREATE TABLE depreciation_policies (
 asset_id uuid PRIMARY KEY REFERENCES assets(id), in_service_date date NOT NULL, useful_months integer NOT NULL CHECK(useful_months BETWEEN 1 AND 1200),
 residual_minor bigint NOT NULL CHECK(residual_minor>=0), configured_by uuid NOT NULL REFERENCES users(id), basis text NOT NULL
);
CREATE TABLE depreciation_runs (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, org_unit_id uuid NOT NULL REFERENCES org_units(id), month date NOT NULL CHECK(extract(day FROM month)=1),
 currency text NOT NULL CHECK(currency IN ('USD','LRD')), status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','REJECTED','JOURNALED')),
 created_by uuid NOT NULL REFERENCES users(id), approved_by uuid REFERENCES users(id), decision_note text,
 journal_id uuid UNIQUE REFERENCES gl_journals(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE depreciation_lines (
 id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES depreciation_runs(id), asset_id uuid NOT NULL REFERENCES assets(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), asset_version integer NOT NULL, UNIQUE(run_id,asset_id)
);
CREATE VIEW depreciation_register AS SELECT r.*,coalesce((SELECT sum(amount_minor) FROM depreciation_lines l WHERE l.run_id=r.id),0) AS amount_minor FROM depreciation_runs r;
CREATE TABLE bank_statements (
 id uuid PRIMARY KEY, reference text NOT NULL, org_unit_id uuid NOT NULL REFERENCES org_units(id), account_id uuid NOT NULL REFERENCES gl_accounts(id),
 currency text NOT NULL CHECK(currency IN ('USD','LRD')), start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>=start_date),
 opening_minor bigint NOT NULL, closing_minor bigint NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RECONCILED')),
 created_by uuid NOT NULL REFERENCES users(id), reconciled_by uuid REFERENCES users(id), reconciled_at timestamptz, UNIQUE(account_id,reference)
);
CREATE TABLE bank_statement_lines (
 id uuid PRIMARY KEY, statement_id uuid NOT NULL REFERENCES bank_statements(id), entry_date date NOT NULL, reference text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor<>0), journal_line_id uuid UNIQUE REFERENCES gl_journal_lines(id), UNIQUE(statement_id,reference)
);
CREATE TABLE bid_evaluations (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, org_unit_id uuid NOT NULL REFERENCES org_units(id), tender_id uuid NOT NULL REFERENCES public_tender_notices(id),
 technical_weight integer NOT NULL CHECK(technical_weight BETWEEN 1 AND 99), pass_mark integer NOT NULL CHECK(pass_mark BETWEEN 0 AND 100),
 criteria text NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','SUBMITTED','APPROVED','RETURNED')),
 created_by uuid NOT NULL REFERENCES users(id), recommended_bid_id uuid, approved_by uuid REFERENCES users(id), decision_note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE evaluation_panel (
 id uuid PRIMARY KEY, evaluation_id uuid NOT NULL REFERENCES bid_evaluations(id), user_id uuid NOT NULL REFERENCES users(id),
 declaration text, conflict boolean, declared_at timestamptz, UNIQUE(evaluation_id,user_id)
);
CREATE TABLE evaluated_bids (
 id uuid PRIMARY KEY, evaluation_id uuid NOT NULL REFERENCES bid_evaluations(id), vendor_id uuid NOT NULL REFERENCES vendors(id),
 reference text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 evidence_reference text NOT NULL, UNIQUE(evaluation_id,vendor_id)
);
ALTER TABLE bid_evaluations ADD CONSTRAINT evaluation_recommended_bid_fk FOREIGN KEY(recommended_bid_id) REFERENCES evaluated_bids(id);
CREATE TABLE bid_scores (
 id uuid PRIMARY KEY, bid_id uuid NOT NULL REFERENCES evaluated_bids(id), evaluator_id uuid NOT NULL REFERENCES users(id),
 technical_score numeric(5,2) NOT NULL CHECK(technical_score BETWEEN 0 AND 100), responsive boolean NOT NULL, rationale text NOT NULL,
 UNIQUE(bid_id,evaluator_id)
);
ALTER TABLE payroll_lines ADD COLUMN prepared_by uuid NOT NULL REFERENCES users(id);
ALTER TABLE bank_statement_lines ADD COLUMN matched_by uuid REFERENCES users(id);
CREATE INDEX payroll_scope_status ON payroll_runs(org_unit_id,status);
CREATE INDEX stocktake_scope_status ON stocktakes(org_unit_id,status);
CREATE INDEX depreciation_scope_month ON depreciation_runs(org_unit_id,month);
CREATE INDEX bank_scope_dates ON bank_statements(org_unit_id,account_id,start_date,end_date);
CREATE INDEX evaluation_scope_status ON bid_evaluations(org_unit_id,status);
ALTER TABLE bank_statements DROP CONSTRAINT bank_statements_status_check;
ALTER TABLE bank_statements ADD CONSTRAINT bank_statements_status_check CHECK(status IN ('OPEN','RECONCILED','VOID'));
ALTER TABLE attachments DROP CONSTRAINT attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN','PAYROLL','STOCKTAKE','DEPRECIATION','BANK_STATEMENT','EVALUATION','PROCUREMENT_CONTRACT'));
