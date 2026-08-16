# Validation status

## 2026-08-16 entity/ID map increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- entity/ID graph generation is blocked until finding review is completed;
- stale finding review is rejected before projection;
- graph nodes are limited to the primary entity plus confirmed entity, identifier, and system objects;
- accepted findings only may decorate downstream graph output;
- direct integration edges require confirmed source/target systems and preserve direct evidence;
- focused identifier relationships are labeled derived rather than presented as direct source facts;
- creator/consumer, authority, and mapping semantics are not inferred when unsupported;
- the entity/ID graph JSON schema parses successfully;
- TypeScript, source-policy lint, tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior validation

The 2026-08-15 finding-review increment passed its GitHub Actions validation, including TypeScript, lint, behavioral/contract tests, schemas, and optimized Next.js production build. Only accepted findings from a completed non-stale review are exposed to downstream consumers.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review persistence, review authorization, deletion, audit events, log redaction, backup/restore, and tenant-isolation tests remain mandatory before confidential enterprise artifacts can be accepted.
