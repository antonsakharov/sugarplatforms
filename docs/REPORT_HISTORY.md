# Server-backed report history

Saved executive-report versions are now an authenticated, tenant-scoped server resource for the local/single-instance workflow.

## Boundary

- `GET /api/assessments/:id/reports` requires `report:read` and returns only snapshots in the active server-resolved organization/workspace scope.
- `POST /api/assessments/:id/reports` requires `report:write` and accepts no report body. The server regenerates the executive report from the current assessment, validated artifact metadata, approved extraction, completed finding review, maturity, recommendations, and 90-day plan before saving a snapshot.
- Versions are immutable and monotonically numbered per assessment.
- `POST /api/reports/pdf` accepts only `assessmentId` and `reportId`, requires `report:read`, reloads the persisted snapshot in tenant scope, and never trusts a client-supplied report snapshot.
- JSON export is a client download of an already persisted immutable snapshot; it does not create or mutate report history.

## Local adapter

The credential-free adapter stores snapshots in the same private SQLite database as current assessment state. This is appropriate for local/single-instance development and preserves the repository boundary required for a PostgreSQL/RLS implementation.

## Security and evidence rules

Saved reports can be created only from a completed, non-stale finding review whose evidence validates against the current approved extraction. Artifact inventory remains metadata-only. Raw uploaded content is not added to report snapshots or PDF export requests.

## Remaining production work

Production identity verification, PostgreSQL/RLS-backed report persistence, private generated-report object storage, signed download URLs, audit/deletion, malware/quarantine, backup/restore verification, and live cross-tenant integration tests remain required before confidential enterprise operation.
