# Production readiness and implementation gates

## Implemented demonstration
React/TypeScript static client; browser persistence; demo role navigation; voucher amount, role and transition validation; local integration reconciliation; exports; presentation guide. GitHub Pages hosts only the static application.

## Target architecture (not deployed)
Web client → authenticated application API → transactional relational database and object storage. An integration worker uses an outbox, idempotency keys, retries and dead-letter queues to exchange approved records with IFMIS, CSA, e-GP, banking and forestry systems. Server-side authorization must check each mutation and row scope. Never expose integration credentials to the browser.

## Acceptance gates
1. FDA-approved requirements, process maps, role matrix, national system boundaries and privacy assessment.
2. Server-side SSO/MFA, authorization, segregation of duties and transaction concurrency tests.
3. Versioned schema migrations, encrypted storage, retention, immutable external audit sink and tested restore procedures.
4. Approved national API specifications and sandbox contract tests; signed reconciliation evidence before any production exchange.
5. Validated payroll/tax/exchange-rate and procurement configuration; no reliance on demo constants.
6. Verified migration counts/balances, exception ownership, rollback and user acceptance.
7. Independent security review, load tests, accessibility review, training, support runbooks and signed go-live readiness.

The current release does not satisfy these production gates. No production SLA, RTO/RPO, legal compliance or certification is asserted.
