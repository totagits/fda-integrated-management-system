-- Confidential employee grievances. Case narrative is excluded from general audit feeds.
CREATE TABLE hr_grievances (
 id uuid PRIMARY KEY,
 case_reference text NOT NULL UNIQUE,
 reporter_employee_id uuid NOT NULL REFERENCES hr_employees(id),
 reporter_user_id uuid NOT NULL REFERENCES users(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 category text NOT NULL CHECK(category IN ('HARASSMENT','DISCRIMINATION','RETALIATION','SAFEGUARDING','WORKPLACE_CONFLICT','OTHER')),
 subject text NOT NULL,
 details text NOT NULL,
 restricted_to_md boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','ACKNOWLEDGED','UNDER_REVIEW','RESOLVED','APPEALED','CLOSED')),
 last_action_by uuid REFERENCES users(id),
 last_action_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE INDEX hr_grievances_scope_status ON hr_grievances(org_unit_id,status,created_at DESC);
CREATE VIEW hr_grievance_directory AS
 SELECT g.*,e.staff_number,e.full_name AS employee_name,o.name AS office_name
 FROM hr_grievances g JOIN hr_employees e ON e.id=g.reporter_employee_id JOIN org_units o ON o.id=g.org_unit_id;
ALTER TABLE attachments DROP CONSTRAINT attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN','PROCUREMENT_CONTRACT','PAYROLL','STOCKTAKE','DEPRECIATION','BANK_STATEMENT','EVALUATION','VACANCY','APPLICATION','ONBOARDING','TRAINING','PERFORMANCE','DISCIPLINARY','GRIEVANCE'));

-- Critical position succession plans and restricted candidate readiness records.
CREATE TABLE hr_succession_plans (
 id uuid PRIMARY KEY,
 position_id uuid NOT NULL REFERENCES hr_positions(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 reference text NOT NULL UNIQUE,
 criticality text NOT NULL CHECK(criticality IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 continuity_risk text NOT NULL,
 required_competencies text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','CLOSED')),
 created_by uuid NOT NULL REFERENCES users(id),
 approved_by uuid REFERENCES users(id),
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE TABLE hr_succession_candidates (
 id uuid PRIMARY KEY,
 plan_id uuid NOT NULL REFERENCES hr_succession_plans(id),
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 readiness text NOT NULL CHECK(readiness IN ('READY_NOW','WITHIN_1_2_YEARS','WITHIN_3_5_YEARS','DEVELOPMENT_REQUIRED')),
 competency_gap text NOT NULL,
 development_actions text NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','WITHDRAWN')),
 nominated_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(plan_id,employee_id)
);
CREATE INDEX hr_succession_scope ON hr_succession_plans(org_unit_id,status);
CREATE VIEW hr_succession_plan_directory AS
 SELECT p.*,pos.code AS position_code,pos.title AS position_title,pos.grade,o.name AS office_name,
   (SELECT count(*)::integer FROM hr_succession_candidates c WHERE c.plan_id=p.id AND c.status='ACTIVE') AS candidates
 FROM hr_succession_plans p JOIN hr_positions pos ON pos.id=p.position_id JOIN org_units o ON o.id=p.org_unit_id;
CREATE VIEW hr_succession_candidate_directory AS
 SELECT c.*,p.reference AS plan_reference,pos.title AS position_title,e.staff_number,e.full_name AS employee_name,o.name AS office_name
 FROM hr_succession_candidates c JOIN hr_succession_plans p ON p.id=c.plan_id
 JOIN hr_positions pos ON pos.id=p.position_id JOIN hr_employees e ON e.id=c.employee_id JOIN org_units o ON o.id=c.org_unit_id;

-- Skills-gap inventory and independently reviewed training impact evidence.
CREATE TABLE hr_training_needs (
 id uuid PRIMARY KEY,
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 competency text NOT NULL,
 current_level text NOT NULL,
 required_level text NOT NULL,
 assessment_source text NOT NULL CHECK(assessment_source IN ('PERFORMANCE_REVIEW','SUPERVISOR_ASSESSMENT','WORKFORCE_PLAN','COMPLIANCE_REQUIREMENT','EMPLOYEE_REQUEST','OTHER')),
 priority text NOT NULL CHECK(priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 status text NOT NULL DEFAULT 'IDENTIFIED' CHECK(status IN ('IDENTIFIED','APPROVED','SCHEDULED','CLOSED','DECLINED')),
 enrollment_id uuid REFERENCES hr_training_enrollments(id),
 rationale text NOT NULL,
 created_by uuid NOT NULL REFERENCES users(id),
 reviewed_by uuid REFERENCES users(id),
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_training_needs_scope ON hr_training_needs(org_unit_id,status,priority);
CREATE VIEW hr_training_needs_directory AS
 SELECT n.*,e.staff_number,e.full_name AS employee_name,o.name AS office_name,
   te.program_code,te.program_title
 FROM hr_training_needs n JOIN hr_employees e ON e.id=n.employee_id JOIN org_units o ON o.id=n.org_unit_id
 LEFT JOIN hr_training_enrollment_directory te ON te.id=n.enrollment_id;
CREATE TABLE hr_training_impact_assessments (
 id uuid PRIMARY KEY,
 enrollment_id uuid NOT NULL UNIQUE REFERENCES hr_training_enrollments(id),
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 measure text NOT NULL,
 baseline text NOT NULL,
 observed_result text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('IMPROVED','PARTIAL_IMPROVEMENT','NO_MEASURED_CHANGE','NOT_ASSESSED')),
 evaluation_method text NOT NULL,
 evidence_reference text NOT NULL,
 assessed_by uuid NOT NULL REFERENCES users(id),
 assessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE VIEW hr_training_impact_directory AS
 SELECT i.*,e.staff_number,e.full_name AS employee_name,t.program_code,t.program_title,o.name AS office_name
 FROM hr_training_impact_assessments i JOIN hr_employees e ON e.id=i.employee_id
 JOIN hr_training_enrollment_directory t ON t.id=i.enrollment_id JOIN org_units o ON o.id=i.org_unit_id;

-- Versioned, configurable policy register and per-employee evidence checks.
CREATE TABLE hr_employment_policies (
 id uuid PRIMARY KEY,
 policy_code text NOT NULL,
 version integer NOT NULL CHECK(version>0),
 title text NOT NULL,
 category text NOT NULL CHECK(category IN ('RECRUITMENT','EMPLOYMENT_TERMS','LEAVE','ATTENDANCE','PAYROLL','SAFEGUARDING','EQUALITY','DATA_PROTECTION','PERFORMANCE','TRAINING','OTHER')),
 authority_reference text NOT NULL,
 requirements_summary text NOT NULL,
 effective_from date NOT NULL,
 review_date date NOT NULL CHECK(review_date>=effective_from),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','RETIRED')),
 created_by uuid NOT NULL REFERENCES users(id),
 approved_by uuid REFERENCES users(id),
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(policy_code,version),
 CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE INDEX hr_policy_register_status ON hr_employment_policies(status,review_date);
CREATE TABLE hr_policy_compliance (
 id uuid PRIMARY KEY,
 policy_id uuid NOT NULL REFERENCES hr_employment_policies(id),
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 due_date date NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLIANT','NON_COMPLIANT','EXEMPT')),
 evidence_reference text,
 review_note text,
 assigned_by uuid NOT NULL REFERENCES users(id),
 assessed_by uuid REFERENCES users(id),
 assessed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(policy_id,employee_id),
 CHECK(assessed_by IS NULL OR assessed_by<>assigned_by)
);
CREATE INDEX hr_policy_compliance_scope ON hr_policy_compliance(org_unit_id,status,due_date);
CREATE VIEW hr_policy_compliance_directory AS
 SELECT c.*,p.policy_code,p.version,p.title AS policy_title,p.category,p.authority_reference,
   e.staff_number,e.full_name AS employee_name,o.name AS office_name
 FROM hr_policy_compliance c JOIN hr_employment_policies p ON p.id=c.policy_id
 JOIN hr_employees e ON e.id=c.employee_id JOIN org_units o ON o.id=c.org_unit_id;
