# Production readiness status

## Implemented in this repository

The existing public evaluation demo remains available. A separate secure application target is now included as `Dockerfile.api`, so it can be prepared without changing the existing static container configuration.

The API foundation includes:

- PostgreSQL migrations for named users, server-side sessions, role assignments, headquarters/region/county hierarchy, budget accounts, procurement records, assets, protected attachment metadata, audit events, and an integration outbox.
- Password hashing with scrypt, one-time administrator bootstrap, forced password change, HttpOnly session cookies, CSRF checks, login rate limits, and server-side role and office-scope authorization.
- A connected workflow: requisition → budget reservation → approval → purchase order → inspected receipt → capital asset registration → invoice match/correction → payment authorization/recording. Changes to records, budget reservations, payment balances, audit events, and outbox events are committed in database transactions.
- Segregation-of-duties checks on requisition approval, receipt inspection, invoice authorization, and payment recording.
- Protected attachment upload/download with scoped authorization, type and signature checks, size limits, private storage and content hashes.
- Append-only database audit records with a hash chain, plus signed webhook delivery with idempotency keys, retry backoff and delivery leases when an approved webhook is configured.
- Liveness/readiness endpoints, container health check, encrypted database-and-attachment backup script, staging-only restore script, and audit-chain verification script.

The API has unit-level checks for amount validation, workflow transitions, authorization policy and password hashing. The frontend build, lint, and available tests pass. A PostgreSQL-backed end-to-end test, container build, restore drill, independent security review and load test have not been run in this environment.

## Not yet production-ready

These implementation pieces do not by themselves authorize production use. The live domain still serves the existing demonstration until the secure service is deployed and configured. Before any real FDA records are entered, FDA/TOTAG must provide and approve:

1. A managed PostgreSQL service or secured PostgreSQL instance, encrypted connection settings, database credentials and retention policy.
2. Coolify environment secrets, a persistent private `/data/uploads` volume, TLS hostname/routing, firewall rules, SMTP or approved identity provider, monitoring alert destination, backup recipient key and offsite backup destination.
3. FDA-approved role assignments, least-privilege scopes, approval thresholds, financial controls, procurement rules, records retention and personal-data handling.
4. The actual FDA integration specifications and sandbox credentials. The webhook mechanism is generic; it is **not** a verified IFMIS, CSA, e-GP, bank, payroll, tax or other national-system integration.
5. A successful encrypted backup, offsite copy, staging restore, audit-chain check, database concurrency test, upload/download access test, vulnerability review, performance test, accessibility review, and FDA user acceptance.

No certification, legal compliance, production service level, recovery time objective, recovery point objective or successful external-system integration is claimed until these are agreed, configured and tested.
