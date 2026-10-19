ALTER TABLE attachments
  ADD COLUMN document_category text NOT NULL DEFAULT 'OTHER'
    CHECK (document_category IN ('CONTRACT','IDENTITY','QUALIFICATION','TRAINING','PERFORMANCE','LEAVE','POLICY_ACKNOWLEDGEMENT','OTHER')),
  ADD COLUMN document_date date,
  ADD COLUMN expires_on date,
  ADD COLUMN document_note text CHECK (document_note IS NULL OR length(document_note) <= 1000);

CREATE INDEX attachments_employee_vault_idx
  ON attachments (record_id, created_at DESC)
  WHERE record_type = 'EMPLOYEE';
