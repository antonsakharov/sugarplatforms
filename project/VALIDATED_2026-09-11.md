# Validated increment — 2026-09-11

## Feature

Operational deletion reconciliation and job controls.

## Implementation validation

- Branch: `agent/deletion-job-controls-2026-09-11`
- Implementation head: `980f71d280e6445a726191bd27816c0233707b00`
- GitHub Actions run: `34616187518`
- Runtime: Node `22.23.2`
- Framework build: Next.js `15.4.10`

## Validation results

- TypeScript: passed (`tsc --noEmit`).
- Source-policy lint: passed.
- Tests: **150/150 passed**.
- Optimized Next.js production build: passed.
- New admin routes `/api/admin/deletion-jobs` and `/api/admin/deletion-jobs/reconcile` were included in the production route manifest.
- Repository packaging: passed.
- CI artifact upload: passed.
- New focused coverage validates bounded retry state, tenant-isolated job visibility, idempotent completed-operation recovery, and expired-lease reconciliation eligibility.

## Security and product checks

- Deletion job tenant scope comes only from authenticated server context.
- Clients cannot submit organization/workspace scope or private storage keys.
- Administrator status responses expose counts and bounded error text, not storage keys or artifact content.
- Private object deletion remains idempotent and successful object work is checkpointed before later retries.
- Relational assessment state is deleted only after all private object operations succeed.
- Retries are bounded to three attempts by default with exponential backoff; running jobs use a five-minute recovery lease.
- A crash after relational completion but before job completion is repaired from the durable completion audit receipt instead of replaying relational deletion.
- MVP limits remain unchanged: one focused assessment, one primary entity, maximum 10 files, 25 MB per file, 150 measurable pages total, architecture metadata only, and no customer records, regulated personal records, credentials, secrets, raw production exports, or live production access.

## Remaining production gaps

Production still requires PostgreSQL/RLS-backed deletion jobs and audit receipts, an authenticated scheduler/worker, production private object storage and deletion validation, backup/retention deletion semantics, verified production identity, malware scanning/quarantine, and live database/storage tenant-isolation tests using non-bypass credentials.

## Next feature

Acme HealthTech sample fixtures and guided walkthrough using the same server-backed map/findings/report surfaces. Production database/storage integration remains credential-dependent and must not be represented as validated until live non-bypass infrastructure is available.
