CREATE TABLE hr_positions (
 id uuid PRIMARY KEY, org_unit_id uuid NOT NULL REFERENCES org_units(id), code text NOT NULL UNIQUE,
 title text NOT NULL, grade text NOT NULL, capacity integer NOT NULL CHECK(capacity>0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hr_employees (
 id uuid PRIMARY KEY, staff_number text NOT NULL UNIQUE, full_name text NOT NULL, email text,
 user_id uuid UNIQUE REFERENCES users(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 position_id uuid NOT NULL REFERENCES hr_positions(id), start_date date NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','EXITED')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_employees_scope ON hr_employees(org_unit_id,status);
CREATE TABLE hr_leave_entitlements (
 employee_id uuid NOT NULL REFERENCES hr_employees(id), leave_year integer NOT NULL CHECK(leave_year BETWEEN 2000 AND 2200),
 days numeric(5,1) NOT NULL CHECK(days>=0 AND days<=366), PRIMARY KEY(employee_id,leave_year)
);
CREATE TABLE hr_leave_requests (
 id uuid PRIMARY KEY, employee_id uuid NOT NULL REFERENCES hr_employees(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>=start_date), days numeric(5,1) NOT NULL CHECK(days>0),
 reason text NOT NULL, status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED','CANCELLED')),
 requested_by uuid NOT NULL REFERENCES users(id), decided_by uuid REFERENCES users(id), decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(extract(year FROM start_date)=extract(year FROM end_date))
);
CREATE INDEX hr_leave_employee ON hr_leave_requests(employee_id,status,start_date);
CREATE TABLE gl_accounts (
 id uuid PRIMARY KEY, code text NOT NULL UNIQUE, name text NOT NULL,
 account_type text NOT NULL CHECK(account_type IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE fiscal_periods (
 id uuid PRIMARY KEY, name text NOT NULL UNIQUE, start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>=start_date),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','CLOSED')), closed_by uuid REFERENCES users(id), closed_at timestamptz
);
CREATE TABLE gl_journals (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, org_unit_id uuid NOT NULL REFERENCES org_units(id),
 period_id uuid NOT NULL REFERENCES fiscal_periods(id), entry_date date NOT NULL, currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 description text NOT NULL, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','VOID')),
 created_by uuid NOT NULL REFERENCES users(id), posted_by uuid REFERENCES users(id), posted_at timestamptz,
 reverses_id uuid UNIQUE REFERENCES gl_journals(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gl_journal_lines (
 id uuid PRIMARY KEY, journal_id uuid NOT NULL REFERENCES gl_journals(id), account_id uuid NOT NULL REFERENCES gl_accounts(id),
 debit_minor bigint NOT NULL DEFAULT 0, credit_minor bigint NOT NULL DEFAULT 0,
 CHECK((debit_minor>0 AND credit_minor=0) OR (credit_minor>0 AND debit_minor=0))
);
CREATE INDEX gl_lines_journal ON gl_journal_lines(journal_id);
CREATE TABLE procurement_plans (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, org_unit_id uuid NOT NULL REFERENCES org_units(id),
 budget_account_id uuid NOT NULL REFERENCES budget_accounts(id), title text NOT NULL, description text NOT NULL,
 estimated_minor bigint NOT NULL CHECK(estimated_minor>0), currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 procurement_method text NOT NULL CHECK(procurement_method IN ('RFQ','NATIONAL_COMPETITIVE_BIDDING','INTERNATIONAL_COMPETITIVE_BIDDING','SINGLE_SOURCE','FRAMEWORK')),
 spend_type text NOT NULL CHECK(spend_type IN ('GOODS','CAPITAL','SERVICES')), target_date date NOT NULL,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED','REQUISITIONED')),
 created_by uuid NOT NULL REFERENCES users(id), decided_by uuid REFERENCES users(id), decision_note text,
 requisition_id uuid UNIQUE REFERENCES requisitions(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE assets ALTER COLUMN purchase_order_id DROP NOT NULL;
ALTER TABLE assets ALTER COLUMN receipt_id DROP NOT NULL;
ALTER TABLE assets ADD COLUMN source_reference text;
ALTER TABLE assets ADD COLUMN condition text NOT NULL DEFAULT 'GOOD' CHECK(condition IN ('GOOD','FAIR','POOR','UNSERVICEABLE'));
ALTER TABLE assets ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'ACTIVE' CHECK(lifecycle_status IN ('ACTIVE','DISPOSED'));
ALTER TABLE assets ADD COLUMN custodian_user_id uuid REFERENCES users(id);
ALTER TABLE assets ADD COLUMN proposed_custodian_id uuid REFERENCES users(id);
ALTER TABLE assets ADD COLUMN location text NOT NULL DEFAULT '';
ALTER TABLE assets ADD COLUMN version integer NOT NULL DEFAULT 1;
CREATE TABLE asset_transfers (
 id uuid PRIMARY KEY, asset_id uuid NOT NULL REFERENCES assets(id), from_org_unit_id uuid NOT NULL REFERENCES org_units(id),
 to_org_unit_id uuid NOT NULL REFERENCES org_units(id), requested_by uuid NOT NULL REFERENCES users(id),
 accepted_by uuid REFERENCES users(id), reason text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(from_org_unit_id<>to_org_unit_id)
);
CREATE UNIQUE INDEX asset_pending_transfer ON asset_transfers(asset_id) WHERE status='PENDING';
CREATE TABLE asset_maintenance (
 id uuid PRIMARY KEY, asset_id uuid NOT NULL REFERENCES assets(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 description text NOT NULL, due_date date NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','COMPLETE')),
 completion_note text, cost_minor bigint NOT NULL DEFAULT 0 CHECK(cost_minor>=0), completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE asset_disposals (
 id uuid PRIMARY KEY, asset_id uuid NOT NULL REFERENCES assets(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 reason text NOT NULL, requested_by uuid NOT NULL REFERENCES users(id), decided_by uuid REFERENCES users(id), decision_note text,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asset_pending_disposal ON asset_disposals(asset_id) WHERE status='SUBMITTED';
ALTER TABLE attachments DROP CONSTRAINT attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN'));
CREATE VIEW hr_position_directory AS SELECT p.*,(SELECT count(*)::integer FROM hr_employees e WHERE e.position_id=p.id AND e.status='ACTIVE') AS filled FROM hr_positions p;
CREATE VIEW hr_employee_directory AS SELECT e.*,p.title AS position_title,o.name AS office_name FROM hr_employees e JOIN hr_positions p ON p.id=e.position_id JOIN org_units o ON o.id=e.org_unit_id;
CREATE VIEW hr_leave_directory AS SELECT l.*,e.full_name AS employee_name,e.staff_number FROM hr_leave_requests l JOIN hr_employees e ON e.id=l.employee_id;
CREATE VIEW asset_transfer_directory AS SELECT t.*,a.asset_tag,src.name AS source_office,dst.name AS destination_office FROM asset_transfers t JOIN assets a ON a.id=t.asset_id JOIN org_units src ON src.id=t.from_org_unit_id JOIN org_units dst ON dst.id=t.to_org_unit_id;
CREATE VIEW asset_maintenance_directory AS SELECT m.*,a.asset_tag,a.currency FROM asset_maintenance m JOIN assets a ON a.id=m.asset_id;
CREATE VIEW asset_disposal_directory AS SELECT d.*,a.asset_tag FROM asset_disposals d JOIN assets a ON a.id=d.asset_id;
ALTER TABLE gl_journals ADD COLUMN source_payment_id uuid UNIQUE REFERENCES payments(id);
CREATE VIEW finance_payment_posting_queue AS SELECT p.*,r.org_unit_id,r.title,r.spend_type,po.po_number,v.legal_name AS vendor_name FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN purchase_orders po ON po.id=i.purchase_order_id JOIN requisitions r ON r.id=po.requisition_id JOIN vendors v ON v.id=po.vendor_id WHERE p.status='PAID' AND NOT EXISTS(SELECT 1 FROM gl_journals j WHERE j.source_payment_id=p.id AND j.status<>'VOID');
CREATE TABLE procurement_contracts (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, requisition_id uuid NOT NULL UNIQUE REFERENCES requisitions(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id), vendor_id uuid NOT NULL REFERENCES vendors(id),
 description text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>=start_date),
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED','CLOSED')),
 created_by uuid NOT NULL REFERENCES users(id), decided_by uuid REFERENCES users(id), decision_note text,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE purchase_orders ADD COLUMN contract_id uuid REFERENCES procurement_contracts(id);
CREATE VIEW procurement_contract_directory AS SELECT c.*,r.requisition_no,v.legal_name AS vendor_name FROM procurement_contracts c JOIN requisitions r ON r.id=c.requisition_id JOIN vendors v ON v.id=c.vendor_id;
ALTER TABLE vendors ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE vendors ADD COLUMN qualified_by uuid REFERENCES users(id);
ALTER TABLE vendors ADD COLUMN qualification_note text;
