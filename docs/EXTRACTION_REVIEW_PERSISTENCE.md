# Extraction Review Persistence

## Purpose

Extraction review is now durable server-side state for the real assessment path. The browser may cache the last successful review, but it is no longer authoritative.

## Security and evidence boundary

Every review read/write is scoped by server-resolved organization and workspace membership. `viewer` may read; `editor` and `admin` may write. Client payloads cannot select tenant scope.

A review is bound to a SHA-256 fingerprint of the exact persisted extraction envelope. The fingerprint covers extraction schema/provider/prompt/status plus object identity, name, kind, and direct evidence references. If artifact processing changes the extraction, the prior persisted review becomes stale and cannot be reused as approval.

The server validates that review records:

- contain exactly one decision per current extracted object;
- cannot introduce unknown object IDs;
- preserve source object kind and original name;
- use normalized reviewed names up to 120 characters;
- merge only into a current same-kind non-rejected/non-merged target;
- cannot claim approval while any object remains pending;
- cannot retain `approvedAt` when approval has been reset.

## API

`GET /api/assessments/:id/extraction-review`

Returns the current persisted extraction, its fingerprint, and either the current non-stale review or a fresh pending review when no valid persisted review exists. Responses are `Cache-Control: no-store`.

`PUT /api/assessments/:id/extraction-review`

Requires `extraction-review:write` and accepts only `{ extractionFingerprint, review }`. A stale fingerprint fails with HTTP 409. Review validation failures fail closed with HTTP 400.

## Local adapter

The credential-free local/single-instance path stores extraction review snapshots in the same SQLite database configured by `SUGAR_ASSESSMENT_DB_PATH`. This adapter exercises the intended authorization/versioning boundary without requiring external credentials.

## Remaining production work

- persist the same review model through PostgreSQL/RLS;
- persist finding-review decisions and accepted findings;
- add audit/deletion controls;
- activate production identity and object storage;
- run live cross-tenant integration tests with a non-superuser/non-`BYPASSRLS` role.
