ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN (
  'MANAGING_DIRECTOR','FINANCE_DIRECTOR','HR_DIRECTOR','PROCUREMENT_OFFICER',
  'ASSET_OFFICER','COUNTY_OFFICER','INTERNAL_AUDITOR','EMPLOYEE'
));

CREATE TABLE identity_invitations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email=lower(email)),
  token_hash text NOT NULL UNIQUE,
  invitation_type text NOT NULL CHECK (invitation_type IN ('MD_ROLE_ACCOUNT','HR_EMPLOYEE_ONBOARDING')),
  requested_by uuid NOT NULL REFERENCES users(id),
  org_unit_id uuid REFERENCES org_units(id),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX identity_invitations_user_idx ON identity_invitations(user_id,created_at DESC);
CREATE INDEX identity_invitations_pending_idx ON identity_invitations(expires_at) WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE VIEW hr_employee_access_directory AS
SELECT e.id,e.staff_number,e.full_name,e.email,e.org_unit_id,e.position_id,e.start_date,e.status,
       p.title AS position_title,o.name AS office_name,
       CASE WHEN e.user_id IS NULL THEN 'NOT_CREATED'
            WHEN u.disabled_at IS NOT NULL THEN 'DISABLED'
            WHEN u.must_change_password THEN 'INVITATION_PENDING'
            ELSE 'ACTIVE' END AS login_status,
       (SELECT i.sent_at FROM identity_invitations i WHERE i.user_id=e.user_id ORDER BY i.created_at DESC LIMIT 1) AS last_invitation_sent_at
FROM hr_employees e
JOIN hr_positions p ON p.id=e.position_id
JOIN org_units o ON o.id=e.org_unit_id
LEFT JOIN users u ON u.id=e.user_id;
