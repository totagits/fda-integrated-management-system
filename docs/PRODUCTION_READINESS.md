# Production readiness status

## Latest enterprise increment

See [ENTERPRISE_WORKFLOWS.md](ENTERPRISE_WORKFLOWS.md) for effective-dated payroll rules, sealed e-bidding, bid evaluation, bank reconciliation, stocktaking, depreciation, integration diagnostics, inventory replenishment and HR workflows. The current frontend build and 59 automated tests pass, including staged goods settlement and replenishment into the procurement requisition process. External business integrations are not verified; the concrete prerequisites are in [INTEGRATION_ACCEPTANCE.md](INTEGRATION_ACCEPTANCE.md). Automated bank payment initiation and settlement verification remain unavailable. Payroll rules require formal FDA approval and year-to-date, eligibility and filing controls remain incomplete. Full production readiness is not claimed.

## Earlier departmental release — 18 October 2026

The current departmental workflow scope and test evidence are recorded in [DEPARTMENT_WORKFLOWS.md](DEPARTMENT_WORKFLOWS.md). The release retains the existing public portal and authenticated staff application, adds persistent HR, accounting, procurement planning/contracts and asset lifecycle operations, and does not seed business data. Hostinger deployment is handled by the existing GitHub webhook; this development task does not reconfigure hosting.

The production frontend build and 42 automated tests pass, including isolated PostgreSQL-compatible integration tests and a real-session application-route test from procurement planning through payment, asset registration and ledger posting. Browser visual verification, real PostgreSQL concurrency/load testing, restore drill, independent security review and actual FDA integrations remain outstanding. These tests do not establish full production readiness.

## Implemented in this repository

The prepared release upgrades the existing FDA application in place. The root `Dockerfile` builds one full-stack service that serves the React site and secure API together. It keeps the single public hostname `fda.totag.network`; no second application or hostname is part of this design. The existing Coolify app must route to container port `8080` and mount `/data/uploads` before deploying the release. Deployment completion is not asserted by this source-code release.

The API foundation includes:

- PostgreSQL migrations for named users, server-side sessions, role assignments, headquarters/region/county hierarchy, budget accounts, procurement records, assets, protected attachment metadata, audit events, and an integration outbox.
- Password hashing with scrypt, one-time administrator bootstrap, forced password change, HttpOnly session cookies, CSRF checks, login rate limits, and server-side role and office-scope authorization.
- A connected workflow: requisition → budget reservation → approval → purchase order → inspected receipt → capital asset registration → invoice match/correction → payment authorization/recording. Changes to records, budget reservations, payment balances, audit events, and outbox events are committed in database transactions.
- Segregation-of-duties checks on requisition approval, receipt inspection, invoice authorization, and payment recording.
- Protected attachment upload/download with scoped authorization, type and signature checks, size limits, private storage and content hashes.
- Append-only database audit records with a hash chain, plus signed webhook delivery with idempotency keys, retry backoff and delivery leases when an approved webhook is configured.
- Liveness/readiness endpoints, container health check, encrypted database-and-attachment backup script, staging-only restore script, and audit-chain verification script.

The API has unit checks and isolated PostgreSQL-compatible integration tests; see the current release evidence above. No clean whole-repository lint result, container validation, restore drill, independent security review or load-test result is claimed.

## Not yet production-ready

These implementation pieces do not by themselves authorize production use. This repository change has not established successful production deployment. The existing GitHub webhook controls Hostinger deployment. Before any real FDA records are entered, FDA/TOTAG must provide and approve:

1. A managed PostgreSQL service or secured PostgreSQL instance, encrypted connection settings, database credentials and retention policy.
2. Coolify environment secrets, a persistent private `/data/uploads` volume, TLS hostname/routing, firewall rules, SMTP or approved identity provider, monitoring alert destination, backup recipient key and offsite backup destination.
3. FDA-approved role assignments, least-privilege scopes, approval thresholds, financial controls, procurement rules, payroll legal basis and employee coverage, records retention and personal-data handling. The RSA private-key secret for sealed e-bidding must be independently provisioned, protected and recoverable through an approved key-custody process.
4. The actual FDA integration specifications and sandbox credentials. The webhook mechanism is generic; it is **not** a verified IFMIS, CSA, e-GP, bank, payroll, tax or other national-system integration. A bank API contract and callback verification scheme are needed before real transfers can be initiated from the application.
5. A successful encrypted backup, offsite copy, staging restore, audit-chain check, database concurrency test, upload/download access test, vulnerability review, performance test, accessibility review, and FDA user acceptance.

No certification, legal compliance, production service level, recovery time objective, recovery point objective or successful external-system integration is claimed until these are agreed, configured and tested.
