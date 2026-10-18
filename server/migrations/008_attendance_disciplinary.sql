-- Attendance records and strictly restricted case management. No seed data.
CREATE TABLE hr_attendance (
 id uuid PRIMARY KEY,
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 work_date date NOT NULL,
 clocked_in_at timestamptz NOT NULL,
 clocked_out_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(employee_id,work_date),
 CHECK(clocked_out_at IS NULL OR clocked_out_at>=clocked_in_at)
);
CREATE INDEX hr_attendance_scope_date ON hr_attendance(org_unit_id,work_date DESC);
CREATE VIEW hr_attendance_directory AS
 SELECT a.*,e.staff_number,e.full_name AS employee_name,o.name AS office_name
 FROM hr_attendance a JOIN hr_employees e ON e.id=a.employee_id JOIN org_units o ON o.id=a.org_unit_id;
CREATE TABLE hr_attendance_corrections (
 id uuid PRIMARY KEY,
 attendance_id uuid NOT NULL REFERENCES hr_attendance(id),
 requested_clock_in timestamptz NOT NULL,
 requested_clock_out timestamptz,
 reason text NOT NULL,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED')),
 requested_by uuid NOT NULL REFERENCES users(id),
 decided_by uuid REFERENCES users(id),
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(requested_clock_out IS NULL OR requested_clock_out>=requested_clock_in),
 CHECK(decided_by IS NULL OR decided_by<>requested_by)
);
CREATE UNIQUE INDEX hr_attendance_one_pending_correction ON hr_attendance_corrections(attendance_id) WHERE status='SUBMITTED';
CREATE TABLE hr_disciplinary_cases (
 id uuid PRIMARY KEY,
 case_reference text NOT NULL UNIQUE,
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 allegation_summary text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','OPEN','UNDER_REVIEW','HEARING','DECIDED','CLOSED','CANCELLED')),
 created_by uuid NOT NULL REFERENCES users(id),
 last_action_by uuid REFERENCES users(id),
 last_action_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(last_action_by IS NULL OR last_action_by<>created_by)
);
CREATE INDEX hr_disciplinary_scope_status ON hr_disciplinary_cases(org_unit_id,status);
CREATE VIEW hr_disciplinary_case_directory AS
 SELECT c.*,e.staff_number,e.full_name AS employee_name,o.name AS office_name
 FROM hr_disciplinary_cases c JOIN hr_employees e ON e.id=c.employee_id JOIN org_units o ON o.id=c.org_unit_id;
ALTER TABLE attachments DROP CONSTRAINT attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check
 CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN','PROCUREMENT_CONTRACT','PAYROLL','STOCKTAKE','DEPRECIATION','BANK_STATEMENT','EVALUATION','VACANCY','APPLICATION','ONBOARDING','TRAINING','PERFORMANCE','DISCIPLINARY'));
