# TOTAG FDA Integrated Management Demonstration

[Open the demonstration](https://totagits.github.io/fda-integrated-management-system/)

An interactive proposal demonstration for FDA's HR, finance, procurement, assets and forestry operations scope. This is **not an official FDA service or production ERP**. Sample records persist in the current browser; no government or bank systems are connected. Do not enter real personnel, banking, biometric or procurement data.

## Demonstration modules
- Executive dashboard and county overview
- Personnel, leave, sample payroll and local identifier checks
- Vote book, budget ceiling checks and ordered voucher approvals
- Procurement requisitions, purchase orders and evidence-flag matching
- Asset registers, depreciation and depot transfers
- Field operations scenarios
- Interoperability sandbox: JSON validation, duplicate/replay detection, control-total reconciliation, staging history and commitment exports
- Local audit history and requirements demonstration matrix
- Built-in seven-step presenter guide and reset control

## Run and build
Use Node.js 22 or newer.

```sh
npm ci
npm test
npm run build
npm run dev
```

The build produces `dist/` with relative asset paths for GitHub Pages. The `gh-pages` branch serves the compiled demo. Source code is maintained on `main`.

## Evidence and limitations
The persona selector demonstrates workflow permissions; it is not authentication or server-enforced authorization. Browser-local records and audit logs can be modified by the browser owner. Audit checks examine record completeness, not cryptographic integrity. Existing payroll rates, exchange rates, procurement thresholds, identifiers and status examples are illustrative assumptions, not verified statutory rules. National interfaces require approved schemas, access agreements, authentication and external reconciliation. Security architecture screens describe proposed target capabilities, not deployed production infrastructure.

Before operational use, implement server-side identity and access controls, a transactional database, validated policy configuration, secure document storage, independently tested audit controls, approved integrations, backup/restore and disaster-recovery evidence, accessibility and performance testing, and FDA-signed UAT. See [production roadmap](docs/PRODUCTION_READINESS.md) and [presentation guide](docs/DEMO_GUIDE.md).
