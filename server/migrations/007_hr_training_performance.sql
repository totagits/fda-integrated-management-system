-- Additive HR development and performance records; no sample employee data.
CREATE TABLE hr_training_programs (
 id uuid PRIMARY KEY,
 code text NOT NULL UNIQUE,
 title text NOT NULL,
 category text NOT NULL,
 provider text NOT NULL,
 description text NOT NULL,
 starts_on date NOT NULL,
 ends_on date NOT NULL CHECK(ends_on>=starts_on),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 10000),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','CLOSED','CANCELLED')),
 created_by uuid NOT NULL REFERENCES users(id),
 approved_by uuid REFERENCES users(id),
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE TABLE hr_training_enrollments (
 id uuid PRIMARY KEY,
 program_id uuid NOT NULL REFERENCES hr_training_programs(id),
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED','IN_PROGRESS','COMPLETION_SUBMITTED','COMPLETED','FAILED','WITHDRAWN')),
 learning_objective text NOT NULL,
 completion_note text,
 certificate_reference text,
 created_by uuid NOT NULL REFERENCES users(id),
 approved_by uuid REFERENCES users(id),
 completed_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(program_id,employee_id)
);
CREATE INDEX hr_training_enrollment_scope ON hr_training_enrollments(org_unit_id,status);
CREATE VIEW hr_training_program_directory AS
 SELECT p.*,(SELECT count(*)::integer FROM hr_training_enrollments e WHERE e.program_id=p.id AND e.status NOT IN ('REJECTED','WITHDRAWN')) AS enrolled
 FROM hr_training_programs p;
CREATE VIEW hr_training_enrollment_directory AS
 SELECT e.*,p.code AS program_code,p.title AS program_title,p.starts_on,p.ends_on,
   h.staff_number,h.full_name AS employee_name,o.name AS office_name,h.user_id AS employee_user_id
 FROM hr_training_enrollments e JOIN hr_training_programs p ON p.id=e.program_id
 JOIN hr_employees h ON h.id=e.employee_id JOIN org_units o ON o.id=e.org_unit_id;

CREATE TABLE hr_performance_cycles (
 id uuid PRIMARY KEY,
 reference text NOT NULL UNIQUE,
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 period_start date NOT NULL,
 period_end date NOT NULL CHECK(period_end>=period_start),
 reviewer_id uuid REFERENCES users(id),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','OPEN','CLOSED','CANCELLED')),
 created_by uuid NOT NULL REFERENCES users(id),
 opened_by uuid REFERENCES users(id),
 closed_by uuid REFERENCES users(id),
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(opened_by IS NULL OR opened_by<>created_by)
);
CREATE TABLE hr_performance_reviews (
 id uuid PRIMARY KEY,
 cycle_id uuid NOT NULL REFERENCES hr_performance_cycles(id),
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 reviewer_id uuid REFERENCES users(id),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SELF_SUBMITTED','REVIEWED','ACKNOWLEDGED')),
 self_assessment text,
 submitted_by uuid REFERENCES users(id),
 submitted_at timestamptz,
 manager_assessment text,
 rating integer CHECK(rating BETWEEN 1 AND 5),
 reviewed_by uuid REFERENCES users(id),
 reviewed_at timestamptz,
 acknowledged_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cycle_id,employee_id)
);
CREATE INDEX hr_performance_scope ON hr_performance_reviews(org_unit_id,status);
CREATE VIEW hr_performance_review_directory AS
 SELECT r.*,c.reference AS cycle_reference,c.period_start,c.period_end,
   e.staff_number,e.full_name AS employee_name,e.user_id AS employee_user_id,o.name AS office_name
 FROM hr_performance_reviews r JOIN hr_performance_cycles c ON c.id=r.cycle_id
 JOIN hr_employees e ON e.id=r.employee_id JOIN org_units o ON o.id=r.org_unit_id;

ALTER TABLE attachments DROP CONSTRAINT attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check
 CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN','PROCUREMENT_CONTRACT','PAYROLL','STOCKTAKE','DEPRECIATION','BANK_STATEMENT','EVALUATION','VACANCY','APPLICATION','ONBOARDING','TRAINING','PERFORMANCE'));
