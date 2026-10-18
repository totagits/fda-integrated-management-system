# FDA external integration acceptance requirements

Status: no national-system or bank business connection has been verified. This document is an implementation/acceptance guide, not test evidence.

For each counterpart (IFMIS, CSA/payroll, bank, PPCC/e-GP or independent audit archive), obtain:

1. The approved system owner and authorized technical contact.
2. API specification/version, sandbox base URL, permitted endpoints and sample schemas.
3. Authentication method, scopes and test credentials provided through deployment secrets, not source control or chat.
4. Approved field mapping, identifiers, currencies, timestamps, code lists and validation rules.
5. Idempotency/replay rules, limits, maintenance windows, retry policies and reconciliation/status-query procedures.
6. Test accounts and harmless test records authorized by the counterpart.
7. Acceptance scenarios and sign-off owners for both FDA and the receiving system.

Verification requires evidence of all applicable stages:

- Authentication succeeds with the intended identity and rejects an unauthorized identity.
- A known test transaction is accepted and its returned counterpart ID is persisted.
- A follow-up query or counterpart report confirms business processing, not merely HTTP acceptance.
- Invalid input is rejected without partial balances or orphaned records.
- Replaying an idempotency key does not duplicate business activity.
- Timeout/retry/recovery and revocation behave as agreed.
- Source and counterpart totals reconcile by office, period and currency.
- Audit exports are demonstrably retained outside the primary application with agreed immutability, retention and recovery controls.
- Both system owners sign off the tested interface version and environment.

A sandbox pass does not certify production credentials, production mappings or operational monitoring. Those require a separate approved production acceptance. The UI must continue to report 'not connected / not verified' until corresponding evidence exists; generic webhook receipts must never be relabeled as IFMIS, CSA, banking or PPCC verification.
