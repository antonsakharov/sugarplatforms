# Validated Increment — 2026-09-07

## Feature

Server-backed finding-review decisions and accepted-findings persistence.

## User flow enabled

A user can run deterministic diagnostics from the current server-persisted approved extraction, review/edit/accept/reject every finding, explicitly complete review, leave the page, and resume the tenant-scoped finding-review state from the server. Completed reviews materialize the accepted-findings set for downstream projections.

## Security and evidence checks

- organization/workspace scope is resolved from authenticated membership on the server;
- viewer can read, editor/admin can write;
- diagnostics are revalidated against the current approved extraction evidence boundary;
- submitted deterministic diagnostics are compared with fresh server engine output before persistence;
- persisted review is SHA-256-bound to its diagnostic envelope;
- extraction approval changes make prior review state stale;
- review payloads cannot add, omit, or duplicate diagnostic findings;
- editable text is bounded and provenance/evidence fields remain immutable;
- accepted findings are materialized only after explicit completion with no pending decisions.

## MVP limits

No MVP limits changed. The assessment remains one focused assessment, one primary entity, at most 10 files, at most 25 MB per file, at most 150 measurable pages, architecture metadata only, with customer records, secrets/credentials, and live production access prohibited.

## Validation

GitHub Actions validates TypeScript, source-policy lint, the complete Node test suite, and the optimized Next.js production build. The first implementation head passed all gates with 136/136 tests; the final documentation/backlog head must also pass the PR validation workflow before handoff.

## Configuration

No new credentials, environment variables, external services, or production deployment are required. The local/single-instance adapter reuses the existing assessment SQLite database path. Browser localStorage remains a compatibility cache only after successful server reads/writes.

## Remaining limitations

Finding review persistence is still backed by SQLite rather than production PostgreSQL/RLS. Production identity verification, live database/storage tenant-isolation testing, malware scanning/quarantine, signed production object access, audit/deletion controls, and production private storage remain open. Downstream maturity/map/recommendation/report pages still need to hydrate accepted findings directly from this authenticated server state instead of relying on browser compatibility cache.

## Exact next feature

Server-backed accepted-findings consumption across maturity, entity/ID map, recommendations, AI-promotion handoff, and executive report surfaces.
