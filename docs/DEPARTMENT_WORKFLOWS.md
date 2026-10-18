# Department workflow release — 18 October 2026

This is the earlier departmental increment. See [ENTERPRISE_WORKFLOWS.md](ENTERPRISE_WORKFLOWS.md) for subsequent payroll, evaluation, reconciliation, stocktake and depreciation work and the updated remaining scope.

This release extends the existing application and existing PostgreSQL database. It does not replace the public portal, create another application, seed business records, or change hosting configuration. The existing GitHub webhook remains the deployment mechanism.

## Implemented workflows

| Workspace | Working operations | Controls |
| --- | --- | --- |
| HR establishment | Create positions, approved capacity, occupied-position count | HR/MD roles and office scope; occupancy checked when appointing or transferring |
| Employee directory | Create and link employees to named accounts, transfer/promote into approved positions, record exits | Version conflict detection; capacity; destination scope; pending-leave checks; audit history; protected evidence |
| Annual leave | Set yearly entitlement; employee/HR submission; approve/reject; cancel pending requests | Half-day validation, same-year dates, overlap checks, balance including pending leave, independent approval, employee-only self-service |
| General ledger | Account setup, balanced journals, independent posting, void drafts, linked reversals | Exact integer minor-unit arithmetic; open-period validation; immutable posted entries through API; no self-posting |
| Fiscal periods and reports | Non-overlapping periods, controlled closing, trial balance, CSV page exports | No close with draft journals; closed periods reject postings; currency-separated balances |
| Payment posting | Prepare balanced journals from recorded payments, independent posting | Links the original payment, prevents duplicate payment journals, uses the original amount/currency; explicit debit/credit accounts |
| Procurement planning | Submit plans against budget votes, approve/reject, convert to requisition | Independent approval; date in budget year; one conversion only; no reservation until requisition submission |
| Suppliers | Register, qualify, suspend, deactivate | Separate qualification for new registrations; expiry/registration checks; documented decision and evidence reference |
| Contracts | Record scope, effective dates and supplier for an approved requisition; approve/reject; close | Independent approval; PO must match the approved contract if one exists; completion required before contract closure |
| Asset register | Procurement receipts create assets; register existing assets; update condition/location | Source reference for opening assets; version checks; no edits after disposal; protected evidence |
| Custody | Propose assignment, employee accept/decline | Staff account must belong to the office; previous custody remains until acceptance |
| Transfers | Request, receiving-office accept/reject | Two-person control, destination scope, no simultaneous pending disposal/transfer; no movement during open maintenance; custody reset on acceptance |
| Maintenance | Schedule, complete, record cost and notes | No disposal/transfer with open maintenance; duplicate completion blocked |
| Disposal | Submit justification, independently approve/reject | MD approval, no self-approval, original asset retained and marked disposed |

All new mutations use the existing serializable transaction wrapper and audit/outbox writer. New list screens provide search, pagination, refresh, real empty/error states, authorized action forms, history where relevant, and CSV page exports. Attachment content uses private server storage and authenticated downloads.

### Connected purchasing sequence

Plan → draft requisition → submission/budget reservation → requisition approval → supplier qualification → optional contract approval → PO → one or more inspected goods receipts → capital asset registration or consumable stock posting → invoice match/correction against accepted value → independent payment authorization → installment payment recording → linked draft journal → independent posting → trial balance. Low-stock consumable requests can also create budgeted draft requisitions and return to the same flow.

A contract is not required for every purchase. Where a contract has been entered, the PO route enforces its approval, supplier, amount and effective dates. Goods deliveries and invoices can be processed in stages and payment installments update budget balances transactionally. Capital-asset receipts still require complete-value acceptance. Contract amendments remain to be implemented.

A supplier's `ACTIVE` status records an internal qualification decision. This is not external verification with PPCC or a tax authority. Evidence references must correspond to records checked by authorized staff.

HR transfers change the personnel establishment record. They do not silently alter security role assignments; the administrator must review login scopes separately.

## Verification performed

- Production frontend build passes.
- 42 automated tests pass across 7 test files.
- PostgreSQL-compatible PGlite tests exercise all three SQL migrations in isolated databases.
- A full application-route test uses scrypt login, session cookies and CSRF, seven separate staff identities, the purchasing sequence through ledger posting, and private evidence upload/download.
- Negative tests include anonymous/wrong-role access, office scope, CSRF, position capacity, leave overuse/overlap, self-approval, stale edits, unbalanced entries, closed periods, duplicate conversion/posting, pending transfers, and audit immutability.
- Fixed two existing defects found by those tests: missing currency alias when registering assets from inspection, and an out-of-scope `type` variable during attachment upload.
- Browser visual testing was attempted but the available browser binary download failed. Desktop/mobile visual acceptance is still outstanding; no visual pass is claimed.
- These checks do not replace real PostgreSQL concurrency/load testing, FDA user acceptance or production security assessment.

## Requirements still open

The requested full enterprise scope is **not complete**. Remaining work is tracked explicitly rather than represented by fake dashboards or inactive buttons.

| Area | Remaining implementation / verification |
| --- | --- |
| HR | Recruitment/applicant lifecycle, onboarding task plans, attendance and biometric interfaces, performance cycles, training, confidential disciplinary cases, payroll calculations and reconciliation, payslips and approved payroll-to-ledger posting; other leave types and FDA calendar/policy configuration |
| Finance | AP/AR subledgers, external bank settlement, advances/retirement, full financial statements, payroll filing/payments, budget revisions and delegated approval thresholds; accountant-approved chart and reporting structure |
| Procurement | FDA/PPCC-approved sourcing rules, externally verified e-GP workflow, formal award publication, contract amendments and supplier performance |
| Assets | Barcode/QR labels, loss/damage cases, disposal execution/proceeds, demand forecasting and inventory valuation policy |
| Operations | Full role-specific work queues, reporting across all modules, controlled offline synchronization, concurrency and load assurance |
| Production assurance | External independent audit storage, offsite backup/restore drill, alert delivery, recovery rehearsal, MFA/identity-provider and account recovery, security/accessibility assessment, verified FDA integrations |

No external-system integration, legal compliance certification, uptime/recovery guarantee, or full production-readiness claim is made by this release.
