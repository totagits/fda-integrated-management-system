-- Additive HR lifecycle tables. No personnel or applicant records are seeded.
CREATE TABLE hr_vacancies (
 id uuid PRIMARY KEY,
 reference text NOT NULL UNIQUE,
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 position_id uuid NOT NULL REFERENCES hr_positions(id),
 title text NOT NULL,
 description text NOT NULL,
 opens_on date NOT NULL,
 closes_on date NOT NULL CHECK(closes_on>=opens_on),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','CLOSED','CANCELLED')),
 created_by uuid NOT NULL REFERENCES users(id),
 approved_by uuid REFERENCES users(id),
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE INDEX hr_vacancies_scope ON hr_vacancies(org_unit_id,status,closes_on);

CREATE TABLE hr_applications (
 id uuid PRIMARY KEY,
 vacancy_id uuid NOT NULL REFERENCES hr_vacancies(id),
 reference text NOT NULL,
 applicant_name text NOT NULL,
 email text NOT NULL,
 contact text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','SCREENING','INTERVIEW','RECOMMENDED','OFFERED','HIRED','REJECTED','WITHDRAWN')),
 decision_note text,
 employee_id uuid UNIQUE REFERENCES hr_employees(id),
 created_by uuid NOT NULL REFERENCES users(id),
 updated_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(vacancy_id,reference)
);
CREATE INDEX hr_applications_status ON hr_applications(vacancy_id,status,created_at);

CREATE VIEW hr_vacancy_directory AS
 SELECT v.*,p.code AS position_code,p.grade,p.capacity,
   (SELECT count(*)::integer FROM hr_applications a WHERE a.vacancy_id=v.id) AS application_count,
   o.name AS office_name
 FROM hr_vacancies v JOIN hr_positions p ON p.id=v.position_id JOIN org_units o ON o.id=v.org_unit_id;
CREATE VIEW hr_application_directory AS
 SELECT a.*,v.reference AS vacancy_reference,v.title AS vacancy_title,v.org_unit_id,
   o.name AS office_name
 FROM hr_applications a JOIN hr_vacancies v ON v.id=a.vacancy_id JOIN org_units o ON o.id=v.org_unit_id;

CREATE TABLE hr_onboarding_tasks (
 id uuid PRIMARY KEY,
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 task_code text NOT NULL,
 title text NOT NULL,
 description text NOT NULL,
 assigned_to uuid REFERENCES users(id),
 due_date date,
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','COMPLETE','WAIVED')),
 completion_note text,
 completed_by uuid REFERENCES users(id),
 completed_at timestamptz,
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(employee_id,task_code),
 CHECK((status='OPEN' AND completed_at IS NULL) OR (status<>'OPEN' AND completed_at IS NOT NULL))
);
CREATE INDEX hr_onboarding_employee ON hr_onboarding_tasks(employee_id,status,due_date);
CREATE VIEW hr_onboarding_directory AS
 SELECT t.*,e.staff_number,e.full_name AS employee_name,e.user_id AS employee_user_id,o.name AS office_name
 FROM hr_onboarding_tasks t JOIN hr_employees e ON e.id=t.employee_id JOIN org_units o ON o.id=t.org_unit_id;

ALTER TABLE attachments DROP CONSTRAINT attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check
 CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN','PROCUREMENT_CONTRACT','PAYROLL','STOCKTAKE','DEPRECIATION','BANK_STATEMENT','EVALUATION','VACANCY','APPLICATION','ONBOARDING'));
