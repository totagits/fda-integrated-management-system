# Enterprise workflow increment — 18 October 2026

This release adds working operations to the existing FDA application. There is no new app, no seeded business data and no hosting change. The additive `004_enterprise_workflows.sql` migration is applied by normal server startup. Migration execution now takes a PostgreSQL transaction advisory lock to prevent simultaneous application instances from applying the same migration.

## Finance control center and budget revisions — 19 October 2026

The secure Finance Control Center reads live database records and is server-authorized for the FDA-wide finance and audit roles. It presents budget allocation, commitments, spending and availability by currency; office-level budget execution; posted general-ledger balances by account class; purchase-linked invoice/payable status; pending requisition, invoice, payroll and journal actions; and bank reconciliation counts. It includes CSV export for the visible budget report and reports the database timestamp and access scope. USD and LRD amounts remain separate. The page explicitly identifies cash position and forecasting as unavailable when there is no verified feed or approved forecast basis; it does not imply that a manual payment reference is a bank transaction.

Budget allocation amendments are recorded as proposals containing the captured prior allocation/version and a justification. A different authorized finance officer or Managing Director must decide. Approval rejects stale proposals and cannot lower the allocation below commitments plus posted expenditure. The approved amendment updates the budget account transactionally and is included in the append-only audit history. This is a configurable control workflow, not FDA approval of the chart of accounts, budget rules or delegated limits.

No receivables/grant ledger, advances-and-expenses retirement, automated FX revaluation, bank-feed/payment API, or verified IFMIS/CSA/e-GP integration is introduced by this increment. Those require FDA policy and system-owner specifications. The dashboard’s financial values are operational summaries, not signed statutory financial statements or a cash forecast.

## Payroll — statutory calculation and accrual

Finance can create an effective-dated statutory rule set. The editor starts with an **unapproved, editable template** derived from current published Liberia Revenue Authority PAYE guidance and NASSCORP scheme descriptions. It is not inserted into the database and cannot be used until a different finance officer approves it. Effective dates, employee coverage, exchange-rate source, exemptions and any FDA-specific treatment must be checked and documented before approval.

For each employee in a full calendar-month run, HR records cash gross, taxable base, non-cash benefits, pensionable earnings, other approved deductions and the applicable LRD-per-pay-currency rate. The server uses exact integer minor units, progressive annual LRD PIT bands on annualized monthly earnings, the configured annual non-cash-benefit exemption, employee NPS, employer NPS and employer EIS, retaining the rule ID, calculation trace and audit event. The net amount and employer contributions feed separately identified salary, tax, pension and employer-liability accounts in the balanced journal. A different finance officer approves payroll and the journal remains subject to independent posting. Employee statements appear only after posting and state that accrual does not prove payment.

Source references used for the editable template: [Liberia Revenue Authority PIT bands, annual income and non-cash-benefit rule](https://revenue.lra.gov.lr/domestic-tax/tax-education/); [LRA PIT calculator, including LRD inputs](https://revenue.lra.gov.lr/eservices/tax-tools/pit-calculation/); [NASSCORP NPS employee and employer contributions](https://www.nasscorp.org.lr/faq/); [NASSCORP Employment Injury Scheme employer contribution](https://www.nasscorp.org.lr/employment-injury-scheme/). These public guidance pages do not verify FDA employee coverage, current exchange rates, prior-employer/year-to-date earnings, tax residence, unusual benefits, proration, deductions, reporting submissions or FDA-specific approvals. Those controls and a signed payroll/legal acceptance remain prerequisites to production payroll use.

## Sealed electronic bidding

The existing public portal now has an invited supplier submission page at `/sealed-bid`. Procurement configures a sealed opportunity against a published notice and uses a supplier-generated RSA public key of at least 3072 bits. Before invitations can be issued, the matching private key must be present in the server secret `SEALED_BID_PRIVATE_KEYS_JSON` under that key ID; the API verifies the pair at setup. Private material is not stored in PostgreSQL. Configure it through the hosting secret manager; never commit it or put it in a browser field.

An authorized officer issues an invitation to an active supplier and records the identity/contact verification reference. A 256-bit one-time token is returned once for secure out-of-band delivery. The supplier’s browser encrypts the technical offer and up to 10 supporting PDF/PNG/JPEG/TXT files (combined 400 KB) with AES-256-GCM and wraps the AES key using RSA-OAEP/SHA-256. The server stores the encrypted packet, hashes it, and returns a receipt. A supplier can withdraw it before deadline and submit a replacement; a live bid cannot be edited or replaced.

After the deadline, at least two distinct assigned, scoped officers must consent. Only after quorum and key availability does the service decrypt, validate and link bid price, technical response and protected attachments into the existing evaluation register. The opening roster and actions enter the hash-linked audit trail. Evaluation scoring still requires a non-conflicted panel and separate approval.

This is an implemented application-level confidentiality control, not a claim of HSM-backed key custody, bidder legal identity verification, trusted timestamping, client/device attestation, independent cryptographic signing, or protection from a compromised application host. Production opening keys require a separately approved secure key-management and recovery procedure. Formal acceptance against FDA/PPCC rules and an external security review are required before a live procurement.

## Bid evaluation

An evaluation references a published procurement notice whose deadline has passed. Staff register already-opened bids with signed opening-minutes/document references and the published technical weighting and pass mark. The panel is explicitly assigned from named accounts. Each member submits a one-time conflict declaration; conflicted members cannot score. Scoring requires at least two non-conflicted evaluators and complete scores on every bid. Panel and bid-register changes are blocked after scoring starts.

Eligibility requires all evaluators to mark a bid responsive and the average technical score to meet the pass mark. Ranking uses weighted average technical score plus inverse-price scoring in one documented evaluation currency. A highest-ranked eligible bid can be recommended, including an explicit tie justification. Submission freezes scoring; a separate MD approver who is not on the panel approves or returns the assessment. Approval is an evaluation decision, not a contract award or external PPCC approval.

Sealed supplier submission and controlled opening now feed this evaluation workflow. This release still does not claim a specific statutory procurement scoring methodology. The scoring model must match the published solicitation; multi-criterion score templates, alternate methods, bidder challenges and award-to-contract automation remain open.

## Bank reconciliation

Finance imports statement lines in a constrained paste format: `YYYY-MM-DD, reference, signed amount`, one per line, without a header or embedded commas. Positive amounts are inflows; negative amounts are outflows. Opening plus imported activity must equal closing balance. Duplicate references and overlapping active statements are blocked.

Matching requires exact signed amounts, the selected bank account, office, currency, statement date range, and a posted ledger entry. One ledger line cannot be matched twice. A different reviewer, who neither imported nor matched the statement, approves reconciliation only after all statement and ledger entries match and both opening and closing balances agree. Posted entries cannot later be backdated into the reconciled balance. Incorrect unapproved imports can be voided with audit evidence; reconciled statements cannot be voided.

Actual bank payment initiation, verified settlement callbacks, bank-feed integration, automatic many-to-many matching, sophisticated CSV mapping, outstanding-check/deposit schedules and reconciliation adjustments remain open. The existing “Record external payment reference” action is manual bookkeeping after the transfer happens outside this app; it neither sends funds nor verifies settlement. Do not treat it as an integrated bank payment. The bank ledger account is an administrator-selected ASSET account; the system does not independently verify the external bank account.

## Stocktaking

A stocktake snapshots active office assets, tags, locations, conditions and register versions. Staff record each tag as present or missing, with observations; keyboard-wedge scanners may enter tag text into the same field. Every snapshot item must be counted before submission. An MD who neither created nor counted the session approves or returns it. Reports preserve expected versus observed values and flag changes to the register since the snapshot. Approval does not silently change asset ownership, location or condition.

Count-sheet/report export and protected evidence are available. QR/barcode label generation, offline scanner applications, unregistered-found assets and automated write-offs remain open.

## Depreciation

Finance explicitly configures in-service date, residual value, useful life in months and the approved policy reference. Policies cannot be overwritten after use in a non-rejected run. The implemented convention is full-month straight-line, including the in-service month. Cumulative charges are calculated using integer minor units, capped at cost minus residual, with catch-up for earlier unposted months. Earlier runs must be posted before further runs; duplicate or out-of-order months are rejected. The asset snapshot is rechecked at approval and journal preparation.

A different officer approves the calculation. Finance then prepares the expense / accumulated-depreciation journal, which still requires independent posting. This release does not claim depreciation compliance with an unprovided FDA accounting policy. Alternate methods, revaluation, impairment, mid-month proration and disposal gain/loss accounting remain open.

## Integrations: implemented versus verified

The Integration Status workspace reports actual audit-outbox counts, pending/retrying events and the most recent HTTP acknowledgement. The HMAC sender validates HTTPS targets, disallows embedded credentials and redirects, preserves a stable event timestamp and idempotency key across retries, and has a request timeout. Automated tests verify signing, stable payloads, configuration rejection and failure handling using an isolated test transport.

**No FDA external business integration is verified.** The repository does not contain usable IFMIS, CSA/payroll, bank or PPCC API contracts and sandbox access. A successful generic webhook HTTP response is not evidence of business processing or durable independent audit storage. See `INTEGRATION_ACCEPTANCE.md` for concrete external requirements.

## Procurement settlement and consumable replenishment

Goods purchase orders can receive sequential inspected deliveries until the full approved value is accepted. A second receipt cannot be opened while the prior inspection is pending or after the order is fully received. Accepted goods invoices are matched against the total accepted delivery value less invoices already matched, authorized or paid. An over-value invoice remains an exception and can be corrected with a reason, then rechecked against later accepted deliveries. Duplicate supplier invoice numbers and billing beyond the purchase-order ceiling are rejected. Payments can be recorded in installments; each payment transaction reduces the reserved budget, increases expenditure, updates the linked purchase-order total and completes the requisition only when fully paid. Capital assets still require full-value acceptance before capitalization.

Consumable items are office-scoped, use quantities precise to three decimal places, and have a movement ledger for opening balances, inspected receipts and issues. Receipt posting requires a selected accepted goods delivery from the same office and checks that stock value does not exceed that delivery's accepted value. Issue quantities cannot exceed available stock. When quantity on hand reaches the reorder point, an authorized stock officer can open one active replenishment request. Procurement converts it into a draft goods requisition only after confirming a matching office/currency budget with sufficient uncommitted balance. It then uses the normal sourcing, supplier, approval, purchase order, receipt and invoice workflow. Automatic buying, purchase suggestions based on forecast models, lot/expiry tracking and valuation methods beyond the configured unit estimate are not implemented.

## Verification and remaining assurance

- Production frontend build and 59 automated tests pass.
- Full application-route tests use named logins, real session cookies and CSRF, isolated PostgreSQL-compatible PGlite databases and real attachment files in a disposable test directory.
- New tests exercise statutory arithmetic and approval, encrypted sealed-bid submission, receipt and two-officer opening with protected evidence, stocktake completeness, depreciation calculation/posting/duplicate prevention, reconciliation/matching/backdating controls, panel declarations/scoring/ranking/approval and truthful integration status.
- The integrated goods test exercises two staged accepted deliveries, an invoice exception/correction, two installments, stock receipt and issue, a low-stock request and conversion into a budgeted requisition. Existing capital procurement, accounting, HR and asset tests also pass.
- No production records or external business systems are used by these tests.
- Browser visual acceptance, real PostgreSQL concurrency/load testing, independent security review, restore drills and FDA process acceptance remain outstanding.

## HR recruitment and onboarding — 19 October 2026

Migration `006_hr_recruitment_onboarding.sql` adds scoped vacancies, applicant intake, hiring decisions and onboarding tasks without inserting sample records. A vacancy is tied to an approved establishment position; the API checks the approved position capacity both when drafting and publishing. A different HR officer must publish a vacancy. Applicant PII is only available through HR-authorized, office-scoped routes and record evidence is stored through the existing protected attachment service.

Applications progress through documented screening, interview, recommendation and offer stages. Skipped stages, closed records and appointments without an issued offer are rejected. Hiring creates the employee record and changes the application to hired in one transaction; position limits and optional login-account office assignment are checked again at appointment. Onboarding tasks can be assigned to an employee account; the employee or named owner can complete them from self-service, while HR can record evidence or independently waive a task. All state changes create append-only audit entries.

The integration test covers office isolation, independent vacancy publication, valid stage order, hire-to-employee creation, duplicate hire prevention, task assignment, employee self-service completion, and record history. It runs against an isolated PostgreSQL-compatible database and does not use production data.

Migration `007_hr_training_performance.sql` adds training program publication, capacity-controlled nominations, independent nomination decisions, employee progress/completion submissions and independent certificate verification. Performance cycles create scoped review records for active office employees, including staff whose accounts have not yet been linked. Employees submit self-assessments and acknowledge reviewed results through self-service; HR captures documented discussions for unlinked employees, and a different reviewer must provide the rating and manager assessment. Cycles close only when linked employees acknowledge their reviews and unlinked employees have a completed manager review. Restricted evidence uses the existing private attachment service.

Migration `008_attendance_disciplinary.sql` adds employee clock-in/out using server timestamps, a scoped HR attendance register, and reasoned time corrections that require a different HR approver. Attendance is not biometric verification and has no configured FDA calendar, shift, overtime or payroll rules. The same migration adds a confidential case register with a restricted HR Director/Managing Director API and evidence scope, audited procedural stage changes, and separation between consecutive stage actors. This provides case tracking controls only; FDA must approve due-process, adjudication, retention and appeal policies before the workflow can represent final disciplinary decisions. No personal data or demonstration records are seeded.

Final payroll/payment controls remain open HR scope. Full AP/AR, advances, contract amendments and partial matching, consumables and stock replenishment, verified FDA integrations and operational assurance also remain incomplete. No full production-readiness certification is implied.
