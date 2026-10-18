# FDA Integrated Management Information System

This repository contains the single full-stack FDA application deployed at `https://fda.totag.network`. It is not a demonstration environment and it does not ship seeded business records. The public page contains institutional information only; staff workflows read and write records through the authenticated API and PostgreSQL.

## Current implementation status

The existing application includes authenticated HR, finance, procurement and asset workflows backed by PostgreSQL. Procurement covers planned sourcing, supplier qualification records, requisitions, approvals, purchase orders, contracts, delivery inspection, bid evaluation and sealed submissions. Finance includes budgets, general-ledger journals and posting, invoice matching/correction, staged payment recording, bank-statement reconciliation, depreciation and payroll accrual calculations. Goods receipts can be staged against one purchase order; invoices are matched against cumulatively accepted value; payments update reservations as they are recorded. Consumable stock has office-scoped item, movement and receipt records, and low-stock requests can enter the standard budgeted requisition workflow. HR includes establishment, employee transfers and exits, leave, vacancy publishing, applicant selection, hiring, onboarding, training and performance reviews. These records persist in PostgreSQL; no sample business records are seeded.

Attendance uses server timestamps and independently reviewed corrections; it is not biometric verification. The confidential case register provides restricted procedural tracking, not an FDA-approved disciplinary policy. Payroll calculation rules are configurable but require legal/HR review and do not file returns or initiate salary payments. Recorded bank payment references are manual evidence: the app does not initiate transfers or verify settlement. Inventory replenishment creates an ordinary procurement requisition; it does not automatically place orders. FDA-specific biometric/attendance policies, disciplinary procedures, AP/AR and advance subledgers, contract amendments, external IFMIS/CSA/e-GP/bank integrations, independently retained audit exports, backup restoration and production monitoring still need approved specifications or live operational verification. Do not enter real operational data until the readiness gates in [Production readiness](docs/PRODUCTION_READINESS.md) have been passed.

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
