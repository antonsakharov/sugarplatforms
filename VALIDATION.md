# Validation status

## 2026-08-19 report versioning and structured export increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- report snapshot creation is an explicit user action and does not silently version on page load;
- snapshot versions increase monotonically as `v1`, `v2`, and so on without rewriting prior snapshots;
- snapshot history rejects duplicate versions/IDs and cross-assessment records;
- each snapshot preserves the diagnostic-generation timestamp that produced its report;
- JSON export wraps one validated snapshot and preserves report provenance;
- exported artifact inventory remains metadata-only and raw uploaded artifact content is not introduced;
- safe export filenames carry the report version;
- `schemas/report-snapshot.schema.json` and all existing schemas parse successfully;
- TypeScript, source-policy lint, full tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior validation

The 2026-08-18 90-day action-plan and executive-report increment passed GitHub Actions with the accepted-findings-only reporting boundary intact.

## Local/demo boundary

Report versions are browser-local demo snapshots, not durable tenant-scoped records. The JSON export is a structured handoff format, not a signed archive or formal PDF. Existing report generation still requires completed non-stale finding review and matching downstream maturity/recommendation/diagnostic versions.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, and formal PDF export remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
