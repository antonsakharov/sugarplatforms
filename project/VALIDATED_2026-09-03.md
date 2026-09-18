# Validation record — 2026-09-03

## Increment

PostgreSQL row-level security and database tenant-isolation foundation.

## Scope

- PostgreSQL relational tenant schema and forced RLS policies
- membership-gated reads and editor/admin assessment inserts
- transaction-local user/organization/workspace session binding
- database-level one-active-assessment invariant
- driver-neutral assessment adapter plus credential-free SQLite fallback
- policy/session behavioral tests and documentation

## Validation

Local source-policy lint and JSON schema parsing passed. The extracted CI snapshot lost complete dependencies after an offline `npm ci` attempt, so local TypeScript/full-suite validation could not be authoritative. GitHub Actions on the published draft PR is the authoritative Node 22 typecheck, lint, full behavioral test, production build, and package gate.

## Security boundary

This slice defines and tests the RLS contract but does not claim a live PostgreSQL integration test. Production activation still requires a concrete PostgreSQL driver/pool, verified production identity/session provider, a non-superuser/non-`BYPASSRLS` runtime role, cross-tenant integration tests, and matching private-storage isolation.

## Deployment

No production deployment was performed.
