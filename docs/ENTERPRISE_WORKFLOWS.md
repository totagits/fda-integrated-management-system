# Enterprise workflow increment — 18 October 2026

This release adds working operations to the existing FDA application. There is no new app, no seeded business data and no hosting change. The additive `004_enterprise_workflows.sql` migration is applied by normal server startup. Migration execution now takes a PostgreSQL transaction advisory lock to prevent simultaneous application instances from applying the same migration.

## Payroll

HR creates an office/currency payroll period and enters employee gross pay and approved total deductions with the salary/deduction schedule reference. Draft lines can be replaced or removed with history. Overlapping office runs and employee participation in overlapping runs of the same currency are blocked. Employees must be active and have started by the end of the period.

A different authorized finance officer reviews the submitted run; a line preparer cannot approve it. Approved payroll prepares a balanced accrual journal: debit salary expense; credit net salary payable and deduction liabilities. The existing independent journal-posting control still applies. Employees see only their own statements after posting.

This is **controlled payroll preparation and accrual**, not a statutory payroll engine or payment service. No tax/pension rates are assumed. Deduction components, statutory filing, attendance/overtime calculation, proration, payroll bank files and payment reconciliation remain to be implemented against approved FDA rules. A posted payroll statement does not claim that the employee was paid.

## Bid evaluation

An evaluation references a published procurement notice whose deadline has passed. Staff register already-opened bids with signed opening-minutes/document references and the published technical weighting and pass mark. The panel is explicitly assigned from named accounts. Each member submits a one-time conflict declaration; conflicted members cannot score. Scoring requires at least two non-conflicted evaluators and complete scores on every bid. Panel and bid-register changes are blocked after scoring starts.

Eligibility requires all evaluators to mark a bid responsive and the average technical score to meet the pass mark. Ranking uses weighted average technical score plus inverse-price scoring in one documented evaluation currency. A highest-ranked eligible bid can be recommended, including an explicit tie justification. Submission freezes scoring; a separate MD approver who is not on the panel approves or returns the assessment. Approval is an evaluation decision, not a contract award or external PPCC approval.

This release does **not** implement sealed online bid submission or claim a specific statutory procurement scoring methodology. The scoring model must match the published solicitation; multi-criterion score templates, alternate methods, bidder challenges and award-to-contract automation remain open.

## Bank reconciliation

Finance imports statement lines in a constrained paste format: `YYYY-MM-DD, reference, signed amount`, one per line, without a header or embedded commas. Positive amounts are inflows; negative amounts are outflows. Opening plus imported activity must equal closing balance. Duplicate references and overlapping active statements are blocked.

Matching requires exact signed amounts, the selected bank account, office, currency, statement date range, and a posted ledger entry. One ledger line cannot be matched twice. A different reviewer, who neither imported nor matched the statement, approves reconciliation only after all statement and ledger entries match and both opening and closing balances agree. Posted entries cannot later be backdated into the reconciled balance. Incorrect unapproved imports can be voided with audit evidence; reconciled statements cannot be voided.

Bank-feed integration, automatic many-to-many matching, sophisticated CSV mapping, outstanding-check/deposit schedules and reconciliation adjustments remain open. The bank ledger account is an administrator-selected ASSET account; the system does not independently verify the external bank account.

## Stocktaking

A stocktake snapshots active office assets, tags, locations, conditions and register versions. Staff record each tag as present or missing, with observations; keyboard-wedge scanners may enter tag text into the same field. Every snapshot item must be counted before submission. An MD who neither created nor counted the session approves or returns it. Reports preserve expected versus observed values and flag changes to the register since the snapshot. Approval does not silently change asset ownership, location or condition.

Count-sheet/report export and protected evidence are available. QR/barcode label generation, offline scanner applications, unregistered-found assets and automated write-offs remain open.

## Depreciation

Finance explicitly configures in-service date, residual value, useful life in months and the approved policy reference. Policies cannot be overwritten after use in a non-rejected run. The implemented convention is full-month straight-line, including the in-service month. Cumulative charges are calculated using integer minor units, capped at cost minus residual, with catch-up for earlier unposted months. Earlier runs must be posted before further runs; duplicate or out-of-order months are rejected. The asset snapshot is rechecked at approval and journal preparation.

A different officer approves the calculation. Finance then prepares the expense / accumulated-depreciation journal, which still requires independent posting. This release does not claim depreciation compliance with an unprovided FDA accounting policy. Alternate methods, revaluation, impairment, mid-month proration and disposal gain/loss accounting remain open.

## Integrations: implemented versus verified

The Integration Status workspace reports actual audit-outbox counts, pending/retrying events and the most recent HTTP acknowledgement. The HMAC sender validates HTTPS targets, disallows embedded credentials and redirects, preserves a stable event timestamp and idempotency key across retries, and has a request timeout. Automated tests verify signing, stable payloads, configuration rejection and failure handling using an isolated test transport.

**No FDA external business integration is verified.** The repository does not contain usable IFMIS, CSA/payroll, bank or PPCC API contracts and sandbox access. A successful generic webhook HTTP response is not evidence of business processing or durable independent audit storage. See `INTEGRATION_ACCEPTANCE.md` for concrete external requirements.

## Verification and remaining assurance

- Production frontend build and 50 automated tests pass.
- Full application-route tests use named logins, real session cookies and CSRF, isolated PostgreSQL-compatible PGlite databases and real attachment files in a disposable test directory.
- New tests exercise payroll privacy and approval, stocktake completeness, depreciation calculation/posting/duplicate prevention, reconciliation/matching/backdating controls, panel declarations/scoring/ranking/approval and truthful integration status.
- Existing procure-to-pay, accounting, HR and asset tests continue to pass.
- No production records or external business systems are used by these tests.
- Browser visual acceptance, real PostgreSQL concurrency/load testing, independent security review, restore drills and FDA process acceptance remain outstanding.

The full enterprise requirement set remains larger than this increment. Recruitment, onboarding, attendance, training/performance/disciplinary workflows, full AP/AR, advances, sophisticated procurement sourcing, inventory/consumables, verified integrations and operational assurance still require implementation or validation. No full production-readiness certification is implied.
