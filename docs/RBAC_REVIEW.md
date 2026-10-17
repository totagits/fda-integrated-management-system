# Authorization implementation notes

The active staff portal obtains identity and role assignments from the API. The server checks capabilities and office scope on protected routes; browser UI visibility is not an authorization boundary. Business records are loaded from PostgreSQL. The application does not include role impersonation, browser-local persistence, or seeded operational records.

The current role/capability policy is in `server/domain.js`; route enforcement and organization scoping are in `server/index.js`. Any policy change must be reviewed against least privilege, separation of duties, direct-object reference access, and headquarters/region/county boundaries. FDA must approve the final role matrix and delegated authority before operational use.

This document describes implemented code paths, not an independent security certification. Complete the security and acceptance gates listed in `PRODUCTION_READINESS.md` before entering real FDA data.
