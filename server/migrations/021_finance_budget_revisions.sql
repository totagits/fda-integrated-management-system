CREATE TABLE finance_budget_revisions (
  id uuid PRIMARY KEY,
  budget_account_id uuid NOT NULL REFERENCES budget_accounts(id),
  org_unit_id uuid NOT NULL REFERENCES org_units(id),
  base_version integer NOT NULL CHECK(base_version > 0),
  previous_allocation_minor bigint NOT NULL CHECK(previous_allocation_minor >= 0),
  proposed_allocation_minor bigint NOT NULL CHECK(proposed_allocation_minor >= 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  created_by uuid NOT NULL REFERENCES users(id),
  decided_by uuid REFERENCES users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX finance_budget_revision_pending
  ON finance_budget_revisions(budget_account_id) WHERE status='PENDING';
CREATE INDEX finance_budget_revision_created
  ON finance_budget_revisions(created_at DESC);
