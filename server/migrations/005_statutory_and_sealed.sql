-- Additive only; no statutory policy or business records are seeded.
CREATE TABLE payroll_policies (
 id uuid PRIMARY KEY, org_unit_id uuid NOT NULL REFERENCES org_units(id), reference text NOT NULL UNIQUE,
 effective_from date NOT NULL, effective_to date NOT NULL CHECK(effective_to>=effective_from),
 bands jsonb NOT NULL, employee_bps integer NOT NULL CHECK(employee_bps BETWEEN 0 AND 10000),
 employer_bps integer NOT NULL CHECK(employer_bps BETWEEN 0 AND 10000), injury_bps integer NOT NULL CHECK(injury_bps BETWEEN 0 AND 10000), non_cash_exemption_lrd_minor bigint NOT NULL DEFAULT 0 CHECK(non_cash_exemption_lrd_minor>=0),
 basis text NOT NULL, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','REJECTED')),
 created_by uuid NOT NULL REFERENCES users(id), approved_by uuid REFERENCES users(id), decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(approved_by IS NULL OR approved_by<>created_by)
);
ALTER TABLE payroll_lines ADD COLUMN policy_id uuid REFERENCES payroll_policies(id);
ALTER TABLE payroll_lines ADD COLUMN calculation jsonb;
ALTER TABLE payroll_lines ADD COLUMN employer_minor bigint NOT NULL DEFAULT 0 CHECK(employer_minor>=0);
CREATE TABLE sealed_tenders (
 id uuid PRIMARY KEY REFERENCES public_tender_notices(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 reference text NOT NULL UNIQUE, deadline timestamptz NOT NULL, key_id text NOT NULL, public_key text NOT NULL,
 status text NOT NULL DEFAULT 'ACCEPTING' CHECK(status IN ('ACCEPTING','OPENED')),
 created_by uuid NOT NULL REFERENCES users(id), opened_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sealed_openers (
 tender_id uuid NOT NULL REFERENCES sealed_tenders(id), user_id uuid NOT NULL REFERENCES users(id),
 consent_at timestamptz, PRIMARY KEY(tender_id,user_id)
);
CREATE TABLE sealed_invitations (
 id uuid PRIMARY KEY, tender_id uuid NOT NULL REFERENCES sealed_tenders(id), vendor_id uuid NOT NULL REFERENCES vendors(id),
 token_hash text NOT NULL UNIQUE, identity_reference text NOT NULL, created_by uuid NOT NULL REFERENCES users(id),
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sealed_active_invitation ON sealed_invitations(tender_id,vendor_id) WHERE revoked_at IS NULL;
CREATE TABLE sealed_submissions (
 id uuid PRIMARY KEY, tender_id uuid NOT NULL REFERENCES sealed_tenders(id), invitation_id uuid NOT NULL REFERENCES sealed_invitations(id),
 vendor_id uuid NOT NULL REFERENCES vendors(id), envelope jsonb NOT NULL, digest text NOT NULL, receipt text NOT NULL UNIQUE,
 withdrawn_at timestamptz, submitted_at timestamptz NOT NULL DEFAULT now(),
 opened_bid_id uuid UNIQUE REFERENCES evaluated_bids(id)
);
CREATE UNIQUE INDEX sealed_active_bid ON sealed_submissions(tender_id,vendor_id) WHERE withdrawn_at IS NULL;
CREATE INDEX payroll_policies_scope ON payroll_policies(org_unit_id,status);

ALTER TABLE evaluated_bids ADD COLUMN technical_response text NOT NULL DEFAULT '';
