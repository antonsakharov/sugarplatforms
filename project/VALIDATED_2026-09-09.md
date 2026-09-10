# Validated Increment — 2026-09-09

## Feature

Server-backed report-version history and authorization.

## User flow enabled

After a user completes finding review, the executive-report preview continues to regenerate from authenticated server-reviewed state. Saving a report version now crosses an authorized server boundary with no client-supplied report body. The server reloads the current assessment, validated artifact metadata, approved extraction, completed finding review, maturity, recommendations, and 90-day plan; regenerates the canonical report; and persists an immutable monotonically versioned snapshot under organization/workspace/assessment scope. Saved report history is resumable. Formal PDF export now accepts only assessment/report IDs and resolves the persisted snapshot server-side before rendering.

## Security and evidence checks

- organization/workspace scope remains server-resolved from authenticated membership;
- viewers may read saved report history; editors/admins may create report versions;
- report creation accepts no client report payload and regenerates the report from current server-reviewed state;
- stale or incomplete extraction/finding review fails closed before a report version can be created;
- accepted-finding materialization is checked against the completed finding review;
- artifact inventory remains metadata-only and raw uploaded bytes are not added to snapshots;
- report versions are immutable and monotonic per tenant-scoped assessment;
- cross-tenant report reads return no snapshot;
- formal PDF export re-authorizes `report:read` and resolves a persisted snapshot by ID instead of trusting client-supplied report content;
- responses containing report history or exports remain `no-store`.

## MVP limits

No product limits changed: one focused assessment, one primary entity, up to 10 files, up to 25 MB per file, up to 150 measurable pages total, architecture metadata only, with customer/regulated records, credentials, secrets, and live production access prohibited.

## Validation

Implementation head `6662eee998aea6f999920a4f104292952860bbdd` passed GitHub Actions validate run `34371200722` on Node `22.23.2`:

- TypeScript: passed;
- source-policy lint: passed;
- Node tests: 143/143 passed, 0 failed;
- three new report-persistence tests passed (monotonic immutable versions, tenant isolation, persisted-copy immutability);
- optimized Next.js 15.4.10 production build: passed;
- `/api/assessments/[id]/reports` and the authorized `/api/reports/pdf` route were included in the successful production build;
- repository snapshot packaging and artifact upload passed.

This documentation commit must pass the same validation workflow before handoff.

## Key files

- `lib/report-persistence.ts`
- `lib/server-report-store.ts`
- `lib/server-report-state.ts`
- `app/api/assessments/[id]/reports/route.ts`
- `app/api/reports/pdf/route.ts`
- `app/assessment/[id]/report/page.tsx`
- `lib/auth.ts`
- `tests/report-persistence.test.mjs`
- `docs/REPORT_HISTORY.md`
- `project/DECISION_044.md`
- `docs/FEATURES.md`
- `project/BACKLOG.md`

## Configuration

No new credentials, packages, environment variables, or external services are required. The local/single-instance adapter uses the existing authenticated local membership and private SQLite persistence boundary.

## Remaining limitations

The local persistence adapter is SQLite rather than activated production PostgreSQL/RLS. Production identity verification, live non-superuser/non-`BYPASSRLS` database and object-storage isolation tests, production S3/Supabase private object storage with signed access, malware/quarantine, audit/deletion, backup/restore verification, and operational controls remain required before confidential enterprise use. Generated PDF bytes are returned on demand rather than durably stored in production private object storage or digitally signed.

## Exact next feature

Server-backed audit and deletion workflow. This is the highest-priority unblocked security slice while live database/storage integration and production object-storage activation remain dependent on external infrastructure credentials.
