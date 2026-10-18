# Upgrade the existing FDA app

This is one FDA application, one Coolify app and one public address: `https://fda.totag.network`. Do not create another FDA app or add a second hostname. The repository root `Dockerfile` builds the React site and secure API into the same service. The upgrade keeps the current hostname; the existing Coolify app must route to container port `8080`.

## Get to the existing Coolify instance

1. Sign in to Hostinger hPanel and open **VPS → Manage** for the active VPS.
2. Open the Coolify link/details shown for that VPS or its installed application. Do not assume the old IP or port `6001` is current; the address used earlier refused a connection.
3. If the Coolify page does not load, use Hostinger's VPS access/help to recover the existing Coolify service before changing DNS or reinstalling anything. Keep the `fda.totag.network` DNS record as it is.

Hostinger's Coolify VPS guide: [How to use the Coolify VPS template](https://support.hostinger.com/en/articles/9615197-how-to-use-the-coolify-vps-template).

## Add PostgreSQL to the same Coolify project

1. In Coolify, open the existing FDA project and production environment.
2. Select **New Resource → Database → PostgreSQL**. This creates a database resource inside Coolify; there is no separate database account or domain to purchase. Choose the same VPS and private Docker network as the existing FDA app.
3. Start it and wait for its health status to turn healthy. In its connection details, copy the **Internal URL** for the FDA app's `DATABASE_URL`. Keep the database private; do not enable public TCP access or open port `5432` in the firewall.

Coolify creates a private connection URL and persistent database storage for the PostgreSQL resource. Persistent storage is not a backup, so backups must also be configured and restored in a test. See [Coolify PostgreSQL](https://coolify.io/docs/databases/postgresql) and [database persistent storage](https://coolify.io/docs/databases/configuration/persistent-storage).

## Configure the existing FDA app

Open the **existing** FDA app, not a new one.

1. In its networking/general settings, change **Ports Exposes** (or the app's internal container port) to `8080`. Keep `fda.totag.network` assigned to this same app. Coolify will continue to serve it publicly over HTTPS.
2. Under **Persistent Storage**, add a volume mounted at exactly `/data/uploads`. That keeps uploaded documents when the container is replaced. It is separate from PostgreSQL's storage. See [Coolify application persistent storage](https://coolify.io/docs/applications/configuration/persistent-storage).
3. Under **Environment Variables**, add these values to the existing app:

   - `NODE_ENV` = `production`
   - `PORT` = `8080`
   - `UPLOADS_DIR` = `/data/uploads`
   - `DATABASE_URL` = PostgreSQL's private **Internal URL**
   - `DB_POOL_SIZE` = `10`
   - `SESSION_HOURS` = `10`
   - `INITIAL_ADMIN_NAME` = the FDA-approved first administrator's name
   - `INITIAL_ADMIN_EMAIL` = the approved administrator's work email
   - `INITIAL_ADMIN_PASSWORD` = a unique, one-time password with at least 16 characters

   Mark the database URL and initial password as secret in Coolify. Do not put passwords or connection URLs in GitHub or ChatGPT. Coolify's [environment variable guide](https://coolify.io/docs/applications/configuration/environment-variables) explains its secret setting.

4. Save. The app applies database migrations at startup. Once the first administrator has signed in and changed their password, remove all three `INITIAL_ADMIN_*` variables and redeploy the same app.

## Deploy and check the existing address

When PostgreSQL is healthy and the volume and app settings are saved, deploy the latest `main` revision from the existing FDA app. It uses the repository root Dockerfile. Do not create another app or change DNS.

Check these URLs after deployment:

- `https://fda.totag.network/` — existing FDA site
- `https://fda.totag.network/api/health/live` — should return `{"status":"live"}`
- `https://fda.totag.network/api/health/ready` — should return `{"status":"ready"}` when PostgreSQL and the schema are ready
- `https://fda.totag.network/secure` — named-user sign-in

Do not enter real FDA records until FDA approves the user roles, approval controls, privacy rules and retention policy.

## Backups, recovery and integrations

Configure scheduled PostgreSQL backups in Coolify and send copies to an offsite destination. The repository's encrypted database-and-attachment scripts in `ops/` require a restricted backup runner, `pg_dump`, `age`, and `rclone`. Run `ops/restore-staging.sh` only against an empty staging database and empty staging uploads directory. Verify recovery with a staging restore before production use.

Before production, agree on retention and recovery objectives; configure alerts for failed deployments, resource pressure and missed backups; verify the independent audit chain with `node server/verify-audit.js`; and complete a restore drill. The optional signed webhook is a generic adapter, not a verified IFMIS, CSA, e-GP, bank, payroll or tax integration. Do not enable it until FDA approves its endpoint and credentials and the integration has been tested.


## Sealed e-bidding secret

Before creating a sealed tender in the staff workspace, provision the matching private RSA key in the application environment secret `SEALED_BID_PRIVATE_KEYS_JSON` as a JSON object keyed by the public key ID (for example, `{"key-v1":"-----BEGIN PRIVATE KEY-----\n..."}`). Never commit, log, or enter the private key into the public portal. The setup API refuses tender activation if the server secret is absent or does not cryptographically match the bidder-facing public key. Establish a separately approved escrow/recovery and custody procedure; a server environment secret is not an HSM.
