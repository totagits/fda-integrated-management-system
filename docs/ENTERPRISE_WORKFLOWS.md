# Enterprise workflow increment — 18 October 2026

This release adds working operations to the existing FDA application. There is no new app, no seeded business data and no hosting change. The additive `004_enterprise_workflows.sql` migration is applied by normal server startup. Migration execution now takes a PostgreSQL transaction advisory lock to prevent simultaneous application instances from applying the same migration.

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

## Verification and remaining assurance

- Production frontend build and 54 automated tests pass.
- Full application-route tests use named logins, real session cookies and CSRF, isolated PostgreSQL-compatible PGlite databases and real attachment files in a disposable test directory.
- New tests exercise statutory arithmetic and approval, encrypted sealed-bid submission, receipt and two-officer opening with protected evidence, stocktake completeness, depreciation calculation/posting/duplicate prevention, reconciliation/matching/backdating controls, panel declarations/scoring/ranking/approval and truthful integration status.
- Existing procure-to-pay, accounting, HR and asset tests continue to pass.
- No production records or external business systems are used by these tests.
- Browser visual acceptance, real PostgreSQL concurrency/load testing, independent security review, restore drills and FDA process acceptance remain outstanding.

The full enterprise requirement set remains larger than this increment. Recruitment, onboarding, attendance, training/performance/disciplinary workflows, full AP/AR, advances, sophisticated procurement sourcing, inventory/consumables, verified integrations and operational assurance still require implementation or validation. No full production-readiness certification is implied.
