CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_units (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  level text NOT NULL CHECK (level IN ('HEADQUARTERS','REGION','COUNTY')),
  parent_id uuid REFERENCES org_units(id),
  county text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  full_name text NOT NULL,
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('MANAGING_DIRECTOR','FINANCE_DIRECTOR','HR_DIRECTOR','PROCUREMENT_OFFICER','ASSET_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR')),
  org_unit_id uuid REFERENCES org_units(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, org_unit_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS budget_accounts (
  id uuid PRIMARY KEY,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2200),
  vote_code text NOT NULL,
  title text NOT NULL,
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  currency text NOT NULL CHECK (currency IN ('USD','LRD')),
  allocated_minor bigint NOT NULL CHECK (allocated_minor >= 0),
  reserved_minor bigint NOT NULL DEFAULT 0 CHECK (reserved_minor >= 0),
  spent_minor bigint NOT NULL DEFAULT 0 CHECK (spent_minor >= 0),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, vote_code, org_unit_id, currency),
  CHECK (reserved_minor + spent_minor <= allocated_minor)
);

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY,
  legal_name text NOT NULL,
  registration_no text NOT NULL UNIQUE,
  tax_clearance_expires date,
  ppcc_registration_no text,
  status text NOT NULL CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','INACTIVE')) DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requisitions (
  id uuid PRIMARY KEY,
  requisition_no text NOT NULL UNIQUE,
  requester_id uuid NOT NULL REFERENCES users(id),
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  budget_account_id uuid NOT NULL REFERENCES budget_accounts(id),
  title text NOT NULL,
  description text NOT NULL,
  procurement_method text NOT NULL CHECK (procurement_method IN ('RFQ','NATIONAL_COMPETITIVE_BIDDING','INTERNATIONAL_COMPETITIVE_BIDDING','SINGLE_SOURCE','FRAMEWORK')),
  spend_type text NOT NULL CHECK (spend_type IN ('CAPITAL','GOODS','SERVICES')),
  currency text NOT NULL CHECK (currency IN ('USD','LRD')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  status text NOT NULL CHECK (status IN ('DRAFT','SUBMITTED','RETURNED','APPROVED','REJECTED','PO_ISSUED','COMPLETE')) DEFAULT 'DRAFT',
  returned_reason text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  decided_at timestamptz,
  approved_by uuid REFERENCES users(id),
  CHECK (currency IN ('USD','LRD'))
);
CREATE INDEX IF NOT EXISTS requisitions_scope_idx ON requisitions(org_unit_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY,
  po_number text NOT NULL UNIQUE,
  requisition_id uuid NOT NULL UNIQUE REFERENCES requisitions(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  created_by uuid NOT NULL REFERENCES users(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('USD','LRD')),
  expected_delivery date,
  status text NOT NULL CHECK (status IN ('ISSUED','RECEIVED','CLOSED','CANCELLED')) DEFAULT 'ISSUED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY,
  receipt_no text NOT NULL UNIQUE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  received_by uuid NOT NULL REFERENCES users(id),
  inspected_by uuid REFERENCES users(id),
  accepted_amount_minor bigint NOT NULL CHECK (accepted_amount_minor >= 0),
  condition_notes text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING','ACCEPTED','REJECTED')) DEFAULT 'PENDING',
  received_at timestamptz NOT NULL DEFAULT now(),
  inspected_at timestamptz
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY,
  invoice_no text NOT NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  submitted_by uuid NOT NULL REFERENCES users(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('USD','LRD')),
  status text NOT NULL CHECK (status IN ('MATCHED','EXCEPTION','AUTHORIZED','PAID')) DEFAULT 'MATCHED',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, invoice_no)
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY,
  asset_tag text NOT NULL UNIQUE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  receipt_id uuid NOT NULL REFERENCES goods_receipts(id),
  description text NOT NULL,
  category text NOT NULL,
  purchase_cost_minor bigint NOT NULL CHECK (purchase_cost_minor > 0),
  currency text NOT NULL CHECK (currency IN ('USD','LRD')),
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  custodian text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY,
  payment_ref text NOT NULL UNIQUE,
  invoice_id uuid NOT NULL UNIQUE REFERENCES invoices(id),
  authorized_by uuid REFERENCES users(id),
  paid_by uuid REFERENCES users(id),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency IN ('USD','LRD')),
  status text NOT NULL CHECK (status IN ('AUTHORIZED','PAID')) DEFAULT 'AUTHORIZED',
  authorized_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY,
  record_type text NOT NULL CHECK (record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET')),
  record_id uuid NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  original_name text NOT NULL,
  storage_name text NOT NULL UNIQUE,
  media_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attachments_record_idx ON attachments(record_type, record_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  sequence bigserial UNIQUE NOT NULL,
  actor_id uuid REFERENCES users(id),
  actor_role text,
  org_unit_id uuid REFERENCES org_units(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  request_id text,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash text,
  event_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_chain_head (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  event_hash text NOT NULL DEFAULT repeat('0',64),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO audit_chain_head(singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS integration_outbox (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_outbox_pending_idx ON integration_outbox(next_attempt_at) WHERE delivered_at IS NULL;

CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events;
CREATE TRIGGER audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
