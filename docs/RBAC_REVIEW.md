# RBAC review — 15 October 2026

## Findings addressed
The County Officer screenshot showed an executive dashboard, national finance totals and approval queues, HR/payroll administration, RTM and system architecture. The sidebar alone was not sufficient: the shared executive dashboard rendered other departments' records and the context exposed unfiltered datasets. Most mutations lacked role checks.

## Revised resource matrix
All seven roles retain Dashboard and My Account/self-service.

| Role | Additional resources |
|---|---|
| Managing Director | Institutional oversight across modules, audit, requirements, architecture and integrations |
| Finance Director | Finance, revenue, grants and financial interoperability |
| HR Director | HRMIS and payroll administration |
| Procurement Officer | Procurement |
| Asset Officer | Assets and inventory |
| County Officer | Assigned-county assets, operations, enforcement, communities and biodiversity |
| Internal Auditor | Read-only institutional records, audit and requirements; no connector or architecture administration |

## Implementation
Separate role dashboards replace the executive screen for all non-executive users. Personal HR records remain in My Account. Provider selectors filter departmental and county data, including notification destinations. The County Officer is assigned Nimba in the sample persona. Assets and transfers use conservative location-text matching because the current model lacks county IDs; unmatched records are hidden. County mutations check destination/record county. Institutional mutation functions enforce role policies; Internal Auditor cannot execute them. Personal profile updates are limited to permitted fields and the current employee. The header hides unauthorized RTM navigation.

## Remaining production requirements
This is browser-side demonstration RBAC, not a confidentiality boundary: bundled seed data and browser storage remain accessible to the browser owner. A backend must enforce authenticated identity, row-level policies, immutable authorization logs and atomic transactions. Replace name-based persona-to-employee lookup and free-text geographic matching with validated immutable IDs. The role matrix is a proposed default for FDA approval; no system-administrator persona is currently defined. Existing forms may still display an action that the provider rejects; refine module-specific affordances during UI acceptance. Automated policy tests and TypeScript build passed; interactive browser QA was unavailable.
