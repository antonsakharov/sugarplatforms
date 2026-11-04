# Extraction Review Persistence

## Purpose

Extraction review is now durable server-side state for the real assessment path. The browser may cache the last successful review, but it is no longer authoritative.

## Security and evidence boundary

Every review read/write is scoped by server-resolved organization and workspace membership. `viewer` may read; `editor` and `admin` may write. Client payloads cannot select tenant scope.

A review is bound to a SHA-256 fingerprint of the exact serialized persisted extraction envelope, including provider/prompt/status, extracted objects, attributes, confidence, direct evidence references, warnings, and extraction statistics. If artifact processing changes that envelope, the prior persisted review becomes stale and cannot be reused as approval.

The server validates that review records:

- contain exactly one decision per current extracted object;
- cannot introduce unknown object IDs;
- preserve source object kind and original name;
- use normalized reviewed names up to 120 characters;
- merge only into a current same-kind non-rejected/non-merged target;
- cannot claim approval while any object remains pending;
- cannot retain `approvedAt` when approval has been reset.

Diagnostics now load the current extraction/review boundary through the authenticated server API before running, so a stale browser cache cannot independently authorize analysis.

## API

`GET /api/assessments/:id/extraction-review`

Returns the current persisted extraction, its fingerprint, and either the current non-stale review or a fresh pending review when no valid persisted review exists. Responses are `Cache-Control: no-store`.

`PUT /api/assessments/:id/extraction-review`

Requires `extraction-review:write` and accepts only `{ extractionFingerprint, review }`. A stale fingerprint fails with HTTP 409. Review validation failures fail closed with HTTP 400.

## Local setup

No new credential or service is required for the local/single-instance adapter. Use the existing local authentication/tenancy configuration and set `SUGAR_ASSESSMENT_DB_PATH` when a custom SQLite location is desired. Review state is stored in the same private application database as assessment and processing metadata.

Typical validation remains:

```bash
npm install
npm run validate
```

The local development identity must have an `editor` or `admin` membership to modify review decisions; `viewer` remains read-only.

## Remaining production work

- persist the same review model through PostgreSQL/RLS;
- persist finding-review decisions and accepted findings;
- add audit/deletion controls;
- activate production identity and object storage;
- run live cross-tenant integration tests with a non-superuser/non-`BYPASSRLS` role.
