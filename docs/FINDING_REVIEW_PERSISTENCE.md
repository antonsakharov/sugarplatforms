# Finding Review Persistence

## Purpose

Finding-review decisions and the accepted-finding set are server-backed so an assessment can resume after diagnostics without trusting browser-local state.

## Boundary

The API resolves the authenticated user, organization, workspace, assessment, current processing snapshot, and approved extraction on the server. Clients cannot choose tenant scope.

A save request contains the deterministic diagnostic envelope plus review decisions. The server:

1. revalidates diagnostic evidence against the current approved extraction;
2. reruns the deterministic diagnostic engine for the current extraction;
3. rejects submitted diagnostics that differ from canonical engine output, ignoring only `generatedAt`;
4. validates exactly one review decision per finding and rejects unknown/duplicate finding IDs;
5. bounds editable presentation fields and reviewer notes;
6. persists the diagnostic fingerprint, diagnostics, review decisions, and materialized accepted findings transactionally under organization/workspace/assessment scope.

Accepted findings are materialized only after every finding is explicitly accepted or rejected and the review is completed. Pending, rejected, forged, or stale findings cannot enter the persisted accepted-finding set.

## API

- `GET /api/assessments/:id/finding-review` returns the tenant-scoped persisted diagnostic/review snapshot with `Cache-Control: no-store`.
- `PUT /api/assessments/:id/finding-review` validates and persists the current diagnostic/review state.

`viewer` memberships may read. `editor` and `admin` memberships may write.

## Staleness

The persisted review is bound to a SHA-256 fingerprint of the full diagnostic envelope and to the extraction approval timestamp used to produce diagnostics. If the approved extraction changes, the API reports the persisted finding review as stale and the UI requires diagnostics to be rerun.

## Local adapter and production limitation

The credential-free implementation uses the existing tenant-scoped Node SQLite database. This is suitable for local/single-instance development but is not the target enterprise persistence layer. Production activation still requires PostgreSQL/RLS persistence for this repository, verified production identity, live cross-tenant isolation tests, audit/deletion controls, and private production object storage.

Browser `localStorage` remains only a compatibility cache after successful server reads/writes; it is not authoritative for finding review decisions.
