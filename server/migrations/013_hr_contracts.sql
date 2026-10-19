-- Employment contract register. Signed files remain in protected employee evidence.
CREATE TABLE hr_employment_contracts (
 id uuid PRIMARY KEY,
 employee_id uuid NOT NULL REFERENCES hr_employees(id),
 org_unit_id uuid NOT NULL REFERENCES org_units(id),
 contract_reference text NOT NULL UNIQUE,
 contract_type text NOT NULL CHECK(contract_type IN ('PERMANENT','FIXED_TERM','PROBATION','SECONDMENT')),
 start_date date NOT NULL,
 end_date date,
 signed_document_reference text NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ENDED')),
 ended_by uuid REFERENCES users(id),
 ended_at timestamptz,
 end_reason text,
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(end_date IS NULL OR end_date>=start_date),
 CHECK((status='ACTIVE' AND ended_at IS NULL AND ended_by IS NULL) OR (status='ENDED' AND ended_at IS NOT NULL AND ended_by IS NOT NULL))
);
CREATE INDEX hr_contracts_scope_expiry ON hr_employment_contracts(org_unit_id,status,end_date);
CREATE VIEW hr_employment_contract_directory AS
 SELECT c.*,e.staff_number,e.full_name AS employee_name,e.status AS employee_status,o.name AS office_name
 FROM hr_employment_contracts c JOIN hr_employees e ON e.id=c.employee_id JOIN org_units o ON o.id=c.org_unit_id;
