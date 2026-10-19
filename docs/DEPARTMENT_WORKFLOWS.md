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
| Internal logistics and distribution | Office request, central stock allocation/reservation, carrier and dispatch details, waybill tracking, destination acknowledgement, variance record and inventory receipt | Requester, allocator, dispatcher and receiver separation; source scope; reserved quantities are excluded from ordinary issues; transactional source/destination movements; append-only audit; destination stock changes only on receipt |
| Maintenance | Schedule, complete, record cost and notes | No disposal/transfer with open maintenance; duplicate completion blocked |
| Disposal | Submit justification, independently approve/reject | MD approval, no self-approval, original asset retained and marked disposed |

All new mutations use the existing serializable transaction wrapper and audit/outbox writer. New list screens provide search, pagination, refresh, real empty/error states, authorized action forms, history where relevant, and CSV page exports. Attachment content uses private server storage and authenticated downloads.

### Connected purchasing sequence

Plan → draft requisition → submission/budget reservation → requisition approval → supplier qualification → optional contract approval → PO → one or more inspected goods receipts → capital asset registration or consumable stock posting → invoice match/correction against accepted value → independent payment authorization → installment payment recording → linked draft journal → independent posting → trial balance. Low-stock consumable requests can also create budgeted draft requisitions and return to the same flow.

Internal stock distribution uses a separate operational path: destination request → source allocation and stock reservation → dispatch / carrier handover → transit tracking → destination count and acknowledgement → source transfer-out and destination transfer-in ledger entries. Short receipt requires a discrepancy report and is retained as a variance status. New destination inventory records carry a separately supplied reorder point. Fixed assets continue through the custody transfer workflow and are not treated as consumable inventory.

A contract is not required for every purchase. Where a contract has been entered, the PO route enforces its approval, supplier, amount and effective dates. Goods deliveries and invoices can be processed in stages and payment installments update budget balances transactionally. Capital-asset receipts still require complete-value acceptance. Contract amendments remain to be implemented.

A supplier's `ACTIVE` status records an internal qualification decision. This is not external verification with PPCC or a tax authority. Evidence references must correspond to records checked by authorized staff.

HR transfers change the personnel establishment record. They do not silently alter security role assignments; the administrator must review login scopes separately.

## Verification performed

- Production frontend build passes.
- 76 automated tests pass across 10 test files.
- PostgreSQL-compatible PGlite tests exercise the database migrations in isolated databases.
- A full application-route test uses scrypt login, session cookies and CSRF, seven separate staff identities, the purchasing sequence through ledger posting, and private evidence upload/download.
- Negative tests include anonymous/wrong-role access, office scope, CSRF, position capacity, leave overuse/overlap, self-approval, stale edits, unbalanced entries, closed periods, duplicate conversion/posting, pending transfers, and audit immutability.
- Fixed two existing defects found by those tests: missing currency alias when registering assets from inspection, and an out-of-scope `type` variable during attachment upload.
- Browser visual testing was attempted but the available browser binary download failed. Desktop/mobile visual acceptance is still outstanding; no visual pass is claimed.
- These checks do not replace real PostgreSQL concurrency/load testing, FDA user acceptance or production security assessment.

## Fixed-asset lifecycle and field controls

Migration `019_asset_lifecycle_controls.sql` adds the following database-backed controls:

- The asset directory includes make/model/serial, purchase date, funding/project/donor, warranty, useful life, office, condition, acquisition cost, purchase order, accepted goods receipt, invoice/payment references, posted accumulated depreciation and net book value.
- A purchased asset must reference an accepted goods receipt belonging to the same purchase order. Procurement receipt inspection creates the linked asset; manual registration is limited to donated, transferred-in, opening-balance and found assets.
- Inter-office transfers move through requested, independently approved, dispatched/in-transit, and destination receipt. Dispatch records carrier/vehicle, tracking reference, waybill, dates, condition and handover evidence. Receipt updates the office/custody state; condition variance or failed delivery remains an explicit exception. An append-only event trail records each stage.
- Stocktakes can record unregistered items found in the field. An independent asset officer or Managing Director must review each finding; unresolved findings block stocktake certification. A finding can be registered with valuation evidence or closed with an investigation reason.
- Field users can scan supported QR/barcodes with a device camera, print Code 39 asset labels, and capture counts offline. Offline counts are stored on that browser/device and are clearly marked pending until they sync to the server; they are not official count records while offline.

These workflows are covered by isolated route tests. The offline queue and camera scanning still require device/browser acceptance testing with FDA field hardware, and label printing requires a trial with FDA-selected label stock and scanners. The new field-device acceptance screen is ready to record that work, but no live device acceptance has been performed by this code change.

## Fleet, facilities and asset governance increment — 19 October 2026

Migration `020_asset_governance_extensions.sql` adds:

- Office-scoped fleet and facilities registers, optionally linked to the fixed-asset register. Fleet records track registration/VIN, driver or custodian, odometer, fuel type, roadworthiness date, and service history. Service work must be independently closed. Facility records track tenure, lease/title reference, condition, inspections and next review date.
- Insurance policies for a fixed asset, vehicle or facility, with date-based expiry/overdue queries. The register stores evidence references; it does not verify coverage with insurers or an external authority.
- Linked insurance-claim workflow records submission, independent internal review, insurer settlement advice/evidence and case closure. It verifies policy/item/incident links and the covered date range. It does not contact the insurer or verify that claimed funds reached a bank account.
- Restricted loss/theft/damage cases with one affected record, office scope, independent investigator assignment, conflict declaration, due date, findings, resolution, claim reference and separate management closure. Case evidence can be uploaded to protected storage with role and office checks. The narrative is limited to management, asset investigators and internal audit.
- Disposal proceeds recording and a balanced general-ledger draft that removes asset cost and posted accumulated depreciation, debits proceeds/receivable, and recognizes gain or loss against carrying value. The asset remains active until the journal is posted and a separate finance completion step closes it. This records accounting; it does not initiate or verify a bank payment or sale proceeds receipt.
- Versioned accounting-policy proposals with effective dates, capitalization threshold, useful-life default and written residual, impairment, revaluation and disposal treatments. Finance or the Managing Director must independently approve. Straight-line depreciation is the only executable method today; the text fields do not implement revaluation or impairment accounting. A workflow decision does not prove that FDA has supplied or approved the underlying policy.
- A field-device acceptance register for identified phones, tablets and scanners. Testers record OS/browser/application build, network profile, evidence and eight checks (QR, barcode, offline capture, reconnection sync, office permissions, protected evidence, session control and audit event); a different authorized officer accepts or rejects the result. This is a supervised test-recording workflow, not a device certification. The tests below use simulated records, not FDA field hardware.

Assets, fleet, facilities, insurance, claim, case, policy and device records retain audit history. Protected evidence type access is enforced by server route and office scope. Automated tests include office-scope denial for a confidential case attachment, incident investigation and insurance-claim stages, fleet service closeout, insurance expiry alert query, independent policy decision, device acceptance review, and disposal gain calculation and posting.

## Requirements still open

The requested full enterprise scope is **not complete**. Remaining work is tracked explicitly rather than represented by fake dashboards or inactive buttons.

| Area | Remaining implementation / verification |
| --- | --- |
| HR | Recruitment/applicant lifecycle, onboarding task plans, attendance and biometric interfaces, performance cycles, training, confidential disciplinary cases, payroll calculations and reconciliation, payslips and approved payroll-to-ledger posting; other leave types and FDA calendar/policy configuration |
| Finance | AP/AR subledgers, external bank settlement, advances/retirement, full financial statements, payroll filing/payments, budget revisions and delegated approval thresholds; accountant-approved chart and reporting structure |
| Procurement | FDA/PPCC-approved sourcing rules, externally verified e-GP workflow, formal award publication, contract amendments and supplier performance |
| Assets | Live validation using FDA fleet/property/insurance registers; external insurer verification; verified proceeds receipts and bank settlement; FDA-approved accounting-policy content; impairment/revaluation methods and journals; write-off/disposal committee rules; fleet fuel/driver operations; replacement planning and inventory valuation policy |
| Operations | Full role-specific work queues, reporting across all modules, controlled offline synchronization, concurrency and load assurance |
| Production assurance | External independent audit storage, offsite backup/restore drill, alert delivery, recovery rehearsal, MFA/identity-provider and account recovery, security/accessibility assessment, verified FDA integrations |

No external-system integration, legal compliance certification, uptime/recovery guarantee, or full production-readiness claim is made by this release. Live migration status, role access across actual FDA offices, protected asset evidence downloads, live stocktake, backup restore, and monitoring/alert delivery still require supervised operational verification.
