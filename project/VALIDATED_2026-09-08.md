# Validated Increment — 2026-09-08

## Feature

Server-backed accepted-findings consumption across maturity, Entity/ID visualization, recommendations, AI-candidate promotion handoff, and executive-report generation.

## User flow enabled

After the user completes finding review, downstream product surfaces reload the current authenticated server assessment/review boundary instead of trusting browser finding state. Maturity and recommendations are recomputed from the current server diagnostic/review pair; the Entity/ID map is projected from the same reviewed extraction and findings; and the executive report reloads validated artifact metadata plus reviewed findings before regenerating maturity, recommendations, and the 90-day plan.

AI-assisted candidate generation also begins from current server diagnostic/extraction state. Explicit promotion now crosses an authenticated server endpoint, revalidates the candidate against the approved extraction and exact persisted diagnostic version, persists the promoted candidate as a pending normal finding, and resets normal finding review before the item can affect downstream outputs.

## Security and evidence checks

- organization/workspace scope remains server-resolved from authenticated membership;
- all downstream reviewed-state reads use authenticated no-store endpoints;
- assessment IDs are checked across assessment, processing, extraction-review, diagnostics, and finding-review payloads;
- stale extraction or finding-review state fails closed;
- downstream accepted-finding projections require explicit review completion and no pending decisions;
- materialized accepted findings are checked against accepted review decisions;
- browser localStorage is refreshed only after successful server hydration and is not a fallback authority;
- AI promotion revalidates current extraction and diagnostic provenance on the server;
- subsequent review saves accept only fresh deterministic output or the exact current server-persisted promoted diagnostic envelope;
- arbitrary client-modified diagnostic sets remain invalid;
- raw uploaded content is not added to downstream report/map exports.

## MVP limits

No limits changed. The product remains one focused assessment, one primary entity, up to 10 files, up to 25 MB per file, up to 150 total measurable pages, architecture metadata only, with customer records, regulated production records, credentials, secrets, and live production-system access prohibited.

## Validation

Implementation head `2031cbef4709620e816a3aa8e8b59bb69568dd0f` passed GitHub Actions validate run `34248670282` on Node `22.23.2`:

- TypeScript: passed;
- source-policy lint: passed;
- Node tests: 140/140 passed, 0 failed;
- optimized Next.js 15.4.10 production build: passed;
- new `/api/assessments/[id]/ai-promotions` route was included in the successful production build;
- repository snapshot packaging and artifact upload: passed.

The final documentation commit must pass the same workflow before handoff; no completion claim should be made if that final run fails.

## Files and interfaces

Key additions/changes include:

- `lib/client-reviewed-state.ts`;
- `app/assessment/[id]/map/page.tsx`;
- `app/assessment/[id]/maturity/page.tsx`;
- `app/assessment/[id]/report/page.tsx`;
- `app/assessment/[id]/ai-findings/page.tsx`;
- `app/api/assessments/[id]/ai-promotions/route.ts`;
- `app/api/assessments/[id]/finding-review/route.ts`;
- `tests/client-reviewed-state.test.mjs`;
- `docs/DOWNSTREAM_REVIEWED_STATE.md`;
- `project/DECISION_043.md`;
- `docs/FEATURES.md`, `project/BACKLOG.md`, and `DEVELOPMENT.md`.

## Configuration

No new credentials, packages, environment variables, or external services are required. The feature uses the existing local-dev authenticated membership, tenant-scoped SQLite repositories, private local artifact-storage adapter, and deterministic local AI-candidate provider.

## Remaining limitations

The local/single-instance persistence path still uses SQLite rather than production PostgreSQL/RLS activation. Production identity verification, live non-superuser/non-`BYPASSRLS` database isolation tests, production private object storage and signed access, malware/quarantine, audit/deletion, backup/restore verification, and operational controls remain open. Explicit executive-report version history is still browser-local, and AI promotion has no separate durable audit history beyond the persisted finding envelope.

## Exact next feature

Server-backed report-version history and authorization. This is the next unblocked local/single-instance persistence slice; production database/storage integration tests and the production S3/Supabase adapter remain dependent on external infrastructure credentials.
