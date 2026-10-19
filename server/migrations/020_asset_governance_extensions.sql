-- Additional controlled registers for fleet, facilities, insurance and asset governance.
ALTER TABLE attachments DROP CONSTRAINT attachments_record_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_record_type_check CHECK(record_type IN ('REQUISITION','PURCHASE_ORDER','RECEIPT','INVOICE','ASSET','EMPLOYEE','LEAVE','JOURNAL','PROCUREMENT_PLAN','PROCUREMENT_CONTRACT','PAYROLL','STOCKTAKE','DEPRECIATION','BANK_STATEMENT','EVALUATION','VACANCY','APPLICATION','ONBOARDING','TRAINING','PERFORMANCE','DISCIPLINARY','GRIEVANCE','FLEET_VEHICLE','FACILITY','INSURANCE','ASSET_INCIDENT','ASSET_ACCOUNTING_POLICY','FIELD_DEVICE_ACCEPTANCE','ASSET_INSURANCE_CLAIM'));
CREATE TABLE fleet_vehicles (
 id uuid PRIMARY KEY, org_unit_id uuid NOT NULL REFERENCES org_units(id), vehicle_code text NOT NULL UNIQUE,
 registration_number text NOT NULL UNIQUE, vin text UNIQUE, make text NOT NULL, model text NOT NULL, model_year integer CHECK(model_year BETWEEN 1900 AND 2200),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','IN_MAINTENANCE','OUT_OF_SERVICE','DISPOSED')),
 condition text NOT NULL DEFAULT 'GOOD' CHECK(condition IN ('GOOD','FAIR','POOR','UNSERVICEABLE')),
 location text NOT NULL, custodian_user_id uuid REFERENCES users(id), odometer_km integer CHECK(odometer_km>=0), fuel_type text,
 purchase_date date, purchase_cost_minor bigint CHECK(purchase_cost_minor>=0), currency text CHECK(currency IN ('USD','LRD')),
 next_roadworthiness_on date, notes text, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fleet_vehicles_office_status ON fleet_vehicles(org_unit_id,status);
ALTER TABLE fleet_vehicles ADD COLUMN asset_id uuid UNIQUE REFERENCES assets(id);
CREATE TABLE asset_facilities (
 id uuid PRIMARY KEY, org_unit_id uuid NOT NULL REFERENCES org_units(id), facility_code text NOT NULL UNIQUE,
 facility_type text NOT NULL CHECK(facility_type IN ('BUILDING','LAND','LEASED_OFFICE','WAREHOUSE','OTHER')),
 name text NOT NULL, address text NOT NULL, status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','UNDER_MAINTENANCE','VACANT','DISPOSED')),
 tenure text NOT NULL CHECK(tenure IN ('OWNED','LEASED','OCCUPIED','OTHER')), reference_number text,
 area_sqm numeric(12,2) CHECK(area_sqm IS NULL OR area_sqm>=0), condition text NOT NULL DEFAULT 'GOOD' CHECK(condition IN ('GOOD','FAIR','POOR','UNSERVICEABLE')),
 lease_expires_on date, next_inspection_on date, annual_cost_minor bigint CHECK(annual_cost_minor>=0), currency text CHECK(currency IN ('USD','LRD')),
 evidence_reference text, notes text, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_facilities_office_status ON asset_facilities(org_unit_id,status);
ALTER TABLE asset_facilities ADD COLUMN asset_id uuid UNIQUE REFERENCES assets(id);
CREATE TABLE fleet_service_events (
 id uuid PRIMARY KEY, vehicle_id uuid NOT NULL REFERENCES fleet_vehicles(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 service_type text NOT NULL CHECK(service_type IN ('PREVENTIVE','REPAIR','INSPECTION','ACCIDENT_REPAIR','OTHER')),
 description text NOT NULL, provider text, odometer_km integer CHECK(odometer_km>=0), cost_minor bigint NOT NULL DEFAULT 0 CHECK(cost_minor>=0), currency text CHECK(currency IN ('USD','LRD')),
 completed_on date, next_service_on date, evidence_reference text, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','COMPLETE','CANCELLED')),
 created_by uuid NOT NULL REFERENCES users(id), completed_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fleet_service_due ON fleet_service_events(status,next_service_on);
CREATE TABLE facility_inspections (
 id uuid PRIMARY KEY, facility_id uuid NOT NULL REFERENCES asset_facilities(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 inspection_date date NOT NULL, condition text NOT NULL CHECK(condition IN ('GOOD','FAIR','POOR','UNSERVICEABLE')),
 findings text NOT NULL, actions_required text, next_inspection_on date, evidence_reference text,
 inspected_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE asset_insurance_policies (
 id uuid PRIMARY KEY, org_unit_id uuid NOT NULL REFERENCES org_units(id), asset_id uuid REFERENCES assets(id), vehicle_id uuid REFERENCES fleet_vehicles(id), facility_id uuid REFERENCES asset_facilities(id),
 insurer text NOT NULL, policy_number text NOT NULL, coverage_type text NOT NULL, insured_value_minor bigint NOT NULL CHECK(insured_value_minor>=0), currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 starts_on date NOT NULL, expires_on date NOT NULL CHECK(expires_on>=starts_on), evidence_reference text NOT NULL,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','EXPIRED','CANCELLED','CLAIM_OPEN')),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(asset_id,vehicle_id,facility_id)=1), UNIQUE(insurer,policy_number)
);
CREATE INDEX asset_insurance_expiry ON asset_insurance_policies(expires_on,status);
CREATE TABLE asset_incidents (
 id uuid PRIMARY KEY, org_unit_id uuid NOT NULL REFERENCES org_units(id), asset_id uuid REFERENCES assets(id), vehicle_id uuid REFERENCES fleet_vehicles(id), facility_id uuid REFERENCES asset_facilities(id),
 case_reference text NOT NULL UNIQUE, incident_type text NOT NULL CHECK(incident_type IN ('LOSS','THEFT','DAMAGE','ACCIDENT','FRAUD_SUSPECTED','OTHER')),
 occurred_on date NOT NULL, reported_on date NOT NULL DEFAULT CURRENT_DATE, severity text NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
 narrative text NOT NULL, reported_by uuid NOT NULL REFERENCES users(id), investigator_id uuid REFERENCES users(id), conflict_check text CHECK(conflict_check IN ('CLEAR','CONFLICT')),
 conflict_note text, investigation_findings text, resolution text, claim_reference text,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','ASSIGNED','INVESTIGATING','AWAITING_EVIDENCE','RESOLVED','CLOSED')),
 due_on date, closed_by uuid REFERENCES users(id), closed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(asset_id,vehicle_id,facility_id)=1)
);
CREATE INDEX asset_incidents_scope_status ON asset_incidents(org_unit_id,status,occurred_on);
CREATE TABLE asset_insurance_claims (
 id uuid PRIMARY KEY, policy_id uuid NOT NULL REFERENCES asset_insurance_policies(id), incident_id uuid REFERENCES asset_incidents(id), org_unit_id uuid NOT NULL REFERENCES org_units(id),
 claim_reference text NOT NULL UNIQUE, claim_amount_minor bigint NOT NULL CHECK(claim_amount_minor>0), currency text NOT NULL CHECK(currency IN ('USD','LRD')),
 claim_summary text NOT NULL, evidence_reference text NOT NULL, status text NOT NULL DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED','APPROVED','REJECTED','SETTLED','CLOSED')),
 submitted_by uuid NOT NULL REFERENCES users(id), decided_by uuid REFERENCES users(id), decision_note text,
 settlement_minor bigint CHECK(settlement_minor IS NULL OR settlement_minor>=0), settlement_reference text, settlement_evidence_reference text,
 created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz, settled_at timestamptz,
 UNIQUE(policy_id,incident_id)
);

CREATE TABLE asset_accounting_policies (
 id uuid PRIMARY KEY, policy_code text NOT NULL, version integer NOT NULL CHECK(version>0), title text NOT NULL,
 effective_from date NOT NULL, effective_to date NOT NULL CHECK(effective_to>=effective_from),
 depreciation_method text NOT NULL CHECK(depreciation_method IN ('STRAIGHT_LINE')),
 capitalization_threshold_minor bigint NOT NULL CHECK(capitalization_threshold_minor>=0), default_useful_months integer NOT NULL CHECK(default_useful_months BETWEEN 1 AND 1200),
 residual_value_basis text NOT NULL, impairment_treatment text NOT NULL, revaluation_treatment text NOT NULL, disposal_treatment text NOT NULL,
 authority_reference text NOT NULL, evidence_reference text NOT NULL, status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','REJECTED','SUPERSEDED')),
 created_by uuid NOT NULL REFERENCES users(id), approved_by uuid REFERENCES users(id), decision_note text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(policy_code,version), CHECK(created_by IS NULL OR approved_by IS NULL OR created_by<>approved_by)
);
CREATE INDEX asset_accounting_policy_effective ON asset_accounting_policies(status,effective_from,effective_to);
CREATE TABLE field_device_acceptance (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, org_unit_id uuid NOT NULL REFERENCES org_units(id),
 device_type text NOT NULL CHECK(device_type IN ('ANDROID_PHONE','ANDROID_TABLET','IOS_PHONE','IOS_TABLET','BARCODE_SCANNER','OTHER')),
 device_make_model text NOT NULL, device_identifier text NOT NULL, os_version text NOT NULL, browser_version text NOT NULL,
 application_version text NOT NULL, network_profile text NOT NULL, checks jsonb NOT NULL,
 outcome text NOT NULL DEFAULT 'DRAFT' CHECK(outcome IN ('DRAFT','SUBMITTED','ACCEPTED','REJECTED')),
 tester_id uuid NOT NULL REFERENCES users(id), reviewer_id uuid REFERENCES users(id), review_note text, evidence_reference text,
 tested_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK(tester_id IS NULL OR reviewer_id IS NULL OR tester_id<>reviewer_id)
);
ALTER TABLE asset_disposals
  ADD COLUMN method text CHECK(method IN ('SALE','AUCTION','DONATION','RECYCLING','WRITE_OFF','SCRAP')),
  ADD COLUMN proceeds_minor bigint CHECK(proceeds_minor>=0),
  ADD COLUMN disposal_date date,
  ADD COLUMN counterparty text,
  ADD COLUMN evidence_reference text,
  ADD COLUMN carrying_minor bigint CHECK(carrying_minor>=0),
  ADD COLUMN gain_loss_minor bigint,
  ADD COLUMN journal_id uuid UNIQUE REFERENCES gl_journals(id);
ALTER TABLE asset_disposals DROP CONSTRAINT IF EXISTS asset_disposals_status_check;
ALTER TABLE asset_disposals ADD CONSTRAINT asset_disposals_status_check CHECK(status IN ('SUBMITTED','APPROVED','REJECTED','JOURNAL_PENDING','COMPLETE'));
DROP VIEW asset_disposal_directory;
CREATE VIEW asset_disposal_directory AS
 SELECT d.*,a.asset_tag,a.description AS asset_description,a.currency,a.purchase_cost_minor,
   coalesce((SELECT sum(dl.amount_minor) FROM depreciation_lines dl JOIN depreciation_runs dr ON dr.id=dl.run_id JOIN gl_journals gj ON gj.id=dr.journal_id WHERE dl.asset_id=a.id AND dr.status='JOURNALED' AND gj.status='POSTED'),0)::bigint AS accumulated_depreciation_minor
 FROM asset_disposals d JOIN assets a ON a.id=d.asset_id;
CREATE OR REPLACE VIEW fleet_vehicle_directory AS SELECT v.*,o.name AS office_name,u.full_name AS custodian_name,a.asset_tag FROM fleet_vehicles v JOIN org_units o ON o.id=v.org_unit_id LEFT JOIN users u ON u.id=v.custodian_user_id LEFT JOIN assets a ON a.id=v.asset_id;
CREATE OR REPLACE VIEW asset_facility_directory AS SELECT f.*,o.name AS office_name,a.asset_tag FROM asset_facilities f JOIN org_units o ON o.id=f.org_unit_id LEFT JOIN assets a ON a.id=f.asset_id;
CREATE OR REPLACE VIEW asset_insurance_directory AS SELECT p.*,o.name AS office_name,a.asset_tag,v.registration_number,f.facility_code,CASE WHEN p.status='ACTIVE' AND p.expires_on<CURRENT_DATE THEN 'EXPIRED' ELSE p.status END AS effective_status FROM asset_insurance_policies p JOIN org_units o ON o.id=p.org_unit_id LEFT JOIN assets a ON a.id=p.asset_id LEFT JOIN fleet_vehicles v ON v.id=p.vehicle_id LEFT JOIN asset_facilities f ON f.id=p.facility_id;
CREATE VIEW asset_insurance_claim_directory AS SELECT c.*,p.policy_number,p.insurer,p.coverage_type,p.expires_on AS policy_expires_on,i.case_reference AS incident_reference,o.name AS office_name FROM asset_insurance_claims c JOIN asset_insurance_policies p ON p.id=c.policy_id JOIN org_units o ON o.id=c.org_unit_id LEFT JOIN asset_incidents i ON i.id=c.incident_id;
