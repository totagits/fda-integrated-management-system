# Secure service deployment and operations

## Keep the current public demo while preparing the secure service

The root `Dockerfile` remains the current static demo. `Dockerfile.api` builds the separate Node API plus the same React client. Do not switch the live hostname until the checks below pass. For a parallel trial, assign the API a temporary hostname such as `secure-demo.fda.totag.network`; the API serves both the frontend and `/api` on that same origin.

## Coolify application settings

Create a new application from `totagits/fda-integrated-management-system`, branch `main`, with Dockerfile path `/Dockerfile.api`. Expose container port `8080` and mount a persistent private volume at `/data/uploads`. Do not publish PostgreSQL to the public internet. Attach the application and database to a private network and use the database's internal hostname.

Configure these secrets/settings in Coolify:

- `NODE_ENV=production`
- `PORT=8080`
- `DATABASE_URL=postgresql://<service-user>:<secret>@<private-db-host>:5432/<database>`
- `DB_POOL_SIZE=10` (adjust only after load testing)
- `SESSION_HOURS=10`
- `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` for the first deployment only. Use a unique random password with at least 16 characters. After the first successful start, remove all three bootstrap variables and redeploy. The administrator must change the one-time password immediately.
- `UPLOADS_DIR=/data/uploads`
- Optional only after FDA approves a receiving endpoint: `INTEGRATION_WEBHOOK_URL=https://...` and `INTEGRATION_WEBHOOK_SECRET` (at least 32 random characters). Restrict outbound network access to the approved endpoint. The receiver must verify `X-FDA-Signature` as HMAC-SHA256 over the exact request body and deduplicate `Idempotency-Key`.

Use PostgreSQL TLS where supported (`DATABASE_SSL=true`); the application enforces certificate verification. Keep secrets out of GitHub, source files, browser storage and screenshots.

## First deployment checks

1. Confirm Coolify reports the container healthy. `GET /api/health/live` should return `{"status":"live"}` and `GET /api/health/ready` should return HTTP 200 only after migrations and database connectivity succeed.
2. Sign in as the initial administrator, change the one-time password, then remove the bootstrap variables and redeploy.
3. Configure the approved office hierarchy, named users, role scopes, budget accounts and qualified vendors. Do not load live data until FDA confirms the data model and approval policies.
4. Exercise a sample requisition through return/correction, approval, PO, rejected and accepted delivery, invoice exception/correction, authorization and payment record. Confirm budget balances and audit events after each transition.
5. Test that a different role and an out-of-scope office cannot read or mutate the same records or attachments.
6. Test attachment upload and download; confirm the mounted volume persists across a redeploy and files are not available from the public web root.
7. Check `/api/audit-events` with an authorized auditor role and run `node server/verify-audit.js` against the database. Configure an independently administered audit receiver before treating external audit preservation as complete.

## Backups and recovery

Install `pg_dump`, `age`, and `rclone` in a restricted backup runner with private network access to PostgreSQL and read access to the upload volume. Configure an age public recipient and an encrypted, versioned offsite rclone destination. Run `ops/backup-encrypted.sh` daily and alert on nonzero exit status or a missing remote object. Keep the private age identity offline in an access-controlled recovery location; never store it beside backups.

Set an FDA-approved retention schedule and RPO/RTO before production. At least quarterly, download a backup to a clean staging environment and run `ops/restore-staging.sh` with `RESTORE_TARGET_LABEL=staging`, a staging-only database URL, an empty uploads directory, and the age identity. Confirm record counts, linked workflow balances, attachment hashes, and audit-chain verification. A backup without a completed restore drill is not a verified recovery plan.

## Monitoring

Configure Coolify alerts for container unhealthy/restarts, CPU/memory/disk pressure, database availability and backup failures. Route application logs to a restricted log destination and retain request IDs for support. Alert on repeated `integration_delivery_failed` events and outbox backlog. The readiness endpoint confirms the DB and schema are reachable; it does not prove the webhook, backup, monitoring alerts, integrations or recovery path are working.
