# FDA Integrated Management Information System

This repository contains the single full-stack FDA application deployed at `https://fda.totag.network`. It is not a demonstration environment and it does not ship seeded business records. The public page contains institutional information only; staff workflows read and write records through the authenticated API and PostgreSQL.

## Current implementation status

The current operational workflow covers authentication and session management, organization and user administration, budgets, vendors, requisitions, approvals, purchase orders, goods receipt and inspection, asset registration from accepted capital deliveries, invoice matching, and payment authorization/recording. HR workflows now include establishment, employee transfers and exits, leave, scoped vacancy publishing, applicant selection, hiring into the employee register, onboarding task tracking, training nominations and outcomes, and performance reviews. Those workflows require a configured PostgreSQL database and are unavailable if the database is not configured.

HR attendance, confidential disciplinary workflows and final payroll/payment controls; full AP/AR and advances; contract amendments and partial receipt/invoice matching; full inventory/consumables; verified FDA integrations; independent audit export; and proven backup recovery are not complete. Do not enter real operational data until the readiness gates in [Production readiness](docs/PRODUCTION_READINESS.md) have been passed.

## Run locally

Use Node.js 22 or newer. The API service requires a PostgreSQL database; startup fails when `DATABASE_URL` is missing.

```sh
npm ci
npm test
npm run build
```

To run the full service locally, set `DATABASE_URL`, `PORT`, and `UPLOADS_DIR`, then run `npm start`. The service applies database migrations on startup and serves the web app and API together.

## Deployment

The root Dockerfile builds and runs the existing app as one service. Deployment and Hostinger/Coolify configuration are documented in [Production operations](docs/PRODUCTION_OPERATIONS.md). Never commit credentials, database URLs, personnel data, or uploaded documents.
