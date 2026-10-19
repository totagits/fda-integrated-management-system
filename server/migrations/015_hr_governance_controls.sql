-- Independent grievance handling, conflicts, case deadlines and reviewable appeals.
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK(role IN (
 'MANAGING_DIRECTOR','IT_DIRECTOR','FINANCE_DIRECTOR','HR_DIRECTOR','PROCUREMENT_OFFICER',
 'ASSET_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR','EMPLOYEE','ETHICS_OFFICER'
));
ALTER TABLE hr_grievances
 ADD COLUMN escalation_route text NOT NULL DEFAULT 'STANDARD' CHECK(escalation_route IN ('STANDARD','INDEPENDENT')),
 ADD COLUMN implicated_role text NOT NULL DEFAULT 'OTHER' CHECK(implicated_role IN ('HR_DIRECTOR','MANAGING_DIRECTOR','OTHER')),
 ADD COLUMN case_assignee_id uuid REFERENCES users(id),
 ADD COLUMN assigned_by uuid REFERENCES users(id),
 ADD COLUMN acknowledgement_due_at timestamptz,
 ADD COLUMN resolution_due_at timestamptz,
 ADD COLUMN last_conflict_check_at timestamptz;
CREATE INDEX hr_grievances_assignee ON hr_grievances(case_assignee_id,status,updated_at DESC);
DROP VIEW hr_grievance_directory;
CREATE VIEW hr_grievance_directory AS
 SELECT g.*,e.staff_number,e.full_name AS employee_name,o.name AS office_name
 FROM hr_grievances g JOIN hr_employees e ON e.id=g.reporter_employee_id JOIN org_units o ON o.id=g.org_unit_id;
CREATE TABLE hr_grievance_sla_settings (
 id uuid PRIMARY KEY,
 acknowledgement_days integer NOT NULL CHECK(acknowledgement_days BETWEEN 1 AND 30),
 resolution_days integer NOT NULL CHECK(resolution_days BETWEEN 1 AND 180),
 created_by uuid NOT NULL REFERENCES users(id),
 approved_by uuid REFERENCES users(id),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','SUPERSEDED')),
 configured_at timestamptz NOT NULL DEFAULT now(),
 CHECK(approved_by IS NULL OR created_by<>approved_by)
);
CREATE UNIQUE INDEX hr_grievance_single_active_sla ON hr_grievance_sla_settings(status) WHERE status='ACTIVE';
CREATE TABLE hr_grievance_events (
 id uuid PRIMARY KEY,
 grievance_id uuid NOT NULL REFERENCES hr_grievances(id),
 event_type text NOT NULL CHECK(event_type IN ('ASSIGNED','CONFLICT_CHECKED','INVESTIGATION_NOTE','EVIDENCE_REVIEWED','DEADLINE_UPDATED','RESOLUTION_RECOMMENDED','APPEAL_DECIDED')),
 note text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),
 visible_to_reporter boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hr_grievance_events_timeline ON hr_grievance_events(grievance_id,created_at);
CREATE TABLE hr_grievance_conflict_checks (
 id uuid PRIMARY KEY,
 grievance_id uuid NOT NULL REFERENCES hr_grievances(id),
 handler_id uuid NOT NULL REFERENCES users(id),
 result text NOT NULL CHECK(result IN ('CLEAR','CONFLICT')),
 note text NOT NULL,
 checked_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(grievance_id,handler_id)
);
CREATE TABLE hr_grievance_appeals (
 id uuid PRIMARY KEY,
 grievance_id uuid NOT NULL UNIQUE REFERENCES hr_grievances(id),
 submitted_by uuid NOT NULL REFERENCES users(id),
 original_decision_by uuid REFERENCES users(id),
 reason text NOT NULL,
 assigned_to uuid REFERENCES users(id),
 assigned_by uuid REFERENCES users(id),
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','UNDER_REVIEW','UPHELD','VARIED','REMANDED')),
 decision_note text,
 decided_by uuid REFERENCES users(id),
 due_at timestamptz,
 submitted_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 CHECK(decided_by IS NULL OR decided_by<>submitted_by)
);

-- Governed competency catalogue, position requirements and independently reviewed assessments.
CREATE TABLE hr_competencies (
 id uuid PRIMARY KEY,
 code text NOT NULL UNIQUE,
 name text NOT NULL,
 competency_group text NOT NULL,
 description text NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','RETIRED')),
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hr_position_competencies (
 position_id uuid NOT NULL REFERENCES hr_positions(id),
 competency_id uuid NOT NULL REFERENCES hr_competencies(id),
 required_level integer NOT NULL CHECK(required_level BETWEEN 1 AND 5),
 rationale text NOT NULL,
 set_by uuid NOT NULL REFERENCES users(id),
 set_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(position_id,competency_id)
);
CREATE TABLE hr_employee_competency_assessments (
 id uuid PRIMARY KEY,
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 competency_id uuid NOT NULL REFERENCES hr_competencies(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 assessed_level integer NOT NULL CHECK(assessed_level BETWEEN 1 AND 5),
 evidence_reference text NOT NULL,
 assessed_by uuid NOT NULL REFERENCES users(id),
 reviewed_by uuid REFERENCES users(id),
 review_note text,
 assessed_at timestamptz NOT NULL DEFAULT now(),
 valid_until date,
 CHECK(reviewed_by IS NULL OR reviewed_by<>assessed_by)
);
CREATE INDEX hr_competency_assessment_scope ON hr_employee_competency_assessments(org_unit_id,competency_id,assessed_at DESC);
CREATE VIEW hr_competency_assessment_directory AS
 SELECT a.*,e.staff_number,e.full_name AS employee_name,e.position_id,p.title AS position_title,
   o.name AS office_name,c.code AS competency_code,c.name AS competency_name,c.competency_group,
   pc.required_level,CASE WHEN a.assessed_level<pc.required_level THEN 'GAP' ELSE 'MEETS' END AS gap_status
 FROM hr_employee_competency_assessments a
 JOIN hr_employees e ON e.id=a.employee_id
 JOIN hr_positions p ON p.id=e.position_id
 JOIN org_units o ON o.id=a.org_unit_id
 JOIN hr_competencies c ON c.id=a.competency_id
 LEFT JOIN hr_position_competencies pc ON pc.position_id=e.position_id AND pc.competency_id=a.competency_id;
CREATE VIEW hr_competency_gap_directory AS
 SELECT e.id AS employee_id,e.staff_number,e.full_name AS employee_name,e.position_id,e.org_unit_id,o.name AS office_name,
  c.id AS competency_id,c.code AS competency_code,c.name AS competency_name,c.competency_group,
  pc.required_level,latest.assessed_level,latest.evidence_reference,latest.assessed_at,latest.valid_until,
  CASE WHEN latest.assessed_level IS NULL OR (latest.valid_until IS NOT NULL AND latest.valid_until<current_date) THEN 'UNASSESSED'
       WHEN latest.assessed_level<pc.required_level THEN 'GAP' ELSE 'MEETS' END AS gap_status
 FROM hr_employees e JOIN hr_positions p ON p.id=e.position_id
 JOIN hr_position_competencies pc ON pc.position_id=p.id
 JOIN hr_competencies c ON c.id=pc.competency_id AND c.status='ACTIVE'
 JOIN org_units o ON o.id=e.org_unit_id
 LEFT JOIN LATERAL (SELECT a.assessed_level,a.evidence_reference,a.assessed_at,a.valid_until
   FROM hr_employee_competency_assessments a WHERE a.employee_id=e.id AND a.competency_id=c.id AND a.reviewed_by IS NOT NULL
   ORDER BY a.assessed_at DESC LIMIT 1) latest ON true
 WHERE e.status='ACTIVE';

ALTER TABLE hr_training_needs
 ADD COLUMN competency_id uuid REFERENCES hr_competencies(id),
 ADD COLUMN source_assessment_id uuid UNIQUE REFERENCES hr_employee_competency_assessments(id);
DROP VIEW hr_training_needs_directory;
CREATE VIEW hr_training_needs_directory AS
 SELECT n.*,e.staff_number,e.full_name AS employee_name,o.name AS office_name,
   te.program_code,te.program_title,c.code AS competency_code,c.competency_group
 FROM hr_training_needs n JOIN hr_employees e ON e.id=n.employee_id JOIN org_units o ON o.id=n.org_unit_id
 LEFT JOIN hr_training_enrollment_directory te ON te.id=n.enrollment_id
 LEFT JOIN hr_competencies c ON c.id=n.competency_id;
ALTER TABLE hr_succession_candidates
 ADD COLUMN readiness_reviewed_by uuid REFERENCES users(id),
 ADD COLUMN readiness_assessment_note text,
 ADD COLUMN readiness_reviewed_at timestamptz,
 ADD COLUMN next_review_date date;
CREATE TABLE hr_succession_development_milestones (
 id uuid PRIMARY KEY,
 candidate_id uuid NOT NULL REFERENCES hr_succession_candidates(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 title text NOT NULL,
 measurable_outcome text NOT NULL,
 assigned_to uuid NOT NULL REFERENCES users(id),
 target_date date NOT NULL,
 status text NOT NULL DEFAULT 'PLANNED' CHECK(status IN ('PLANNED','IN_PROGRESS','SUBMITTED','VERIFIED','DEFERRED','CANCELLED')),
 evidence_reference text,
 completion_note text,
 verified_by uuid REFERENCES users(id),
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(verified_by IS NULL OR verified_by<>assigned_to)
);
CREATE INDEX hr_succession_milestone_due ON hr_succession_development_milestones(org_unit_id,status,target_date);
CREATE VIEW hr_succession_milestone_directory AS
 SELECT m.*,c.employee_id,e.staff_number,e.full_name AS candidate_name,p.reference AS plan_reference,
   o.name AS office_name,u.full_name AS assignee_name,v.full_name AS verifier_name
 FROM hr_succession_development_milestones m
 JOIN hr_succession_candidates c ON c.id=m.candidate_id
 JOIN hr_succession_plans p ON p.id=c.plan_id
 JOIN hr_employees e ON e.id=c.employee_id
 JOIN org_units o ON o.id=m.org_unit_id
 JOIN users u ON u.id=m.assigned_to
 LEFT JOIN users v ON v.id=m.verified_by;

-- Approved annual training allocation and recorded programme expenditure.
ALTER TABLE hr_training_programs ADD COLUMN estimated_cost_minor bigint NOT NULL DEFAULT 0 CHECK(estimated_cost_minor>=0),
 ADD COLUMN currency text NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD','LRD'));
CREATE TABLE hr_training_budgets (
 id uuid PRIMARY KEY,
 fiscal_year integer NOT NULL CHECK(fiscal_year BETWEEN 2000 AND 2200),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 allocated_minor bigint NOT NULL CHECK(allocated_minor>=0),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','CLOSED')),
 created_by uuid NOT NULL REFERENCES users(id),
 approved_by uuid REFERENCES users(id),
 decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(fiscal_year,org_unit_id,currency),
 CHECK(approved_by IS NULL OR approved_by<>created_by)
);
CREATE TABLE hr_training_budget_commitments (
 id uuid PRIMARY KEY,
 budget_id uuid NOT NULL REFERENCES hr_training_budgets(id),
 program_id uuid NOT NULL UNIQUE REFERENCES hr_training_programs(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 committed_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE VIEW hr_training_budget_directory AS
 SELECT b.*,o.name AS office_name,
   coalesce(sum(c.amount_minor),0)::bigint AS committed_minor,
   greatest(b.allocated_minor-coalesce(sum(c.amount_minor),0),0)::bigint AS remaining_minor
 FROM hr_training_budgets b JOIN org_units o ON o.id=b.org_unit_id
 LEFT JOIN hr_training_budget_commitments c ON c.budget_id=b.id
 GROUP BY b.id,o.name;
