# Validation status

## 2026-08-21 duplicate matching logic increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- duplicate matching considers only confirmed capability objects whose reviewed names explicitly contain matching, deduplication, entity-resolution, or record-linkage language;
- two distinct matching capabilities with the same explicit subject prefix produce one evidence-backed derived finding;
- matching capabilities with different explicit subject prefixes are not collapsed into one duplicate signal;
- non-matching capabilities do not trigger the rule;
- the finding explicitly states that multiple capabilities are a signal, not proof of functionally identical implementations;
- rejected extraction objects remain excluded from diagnostics;
- every emitted matching finding has direct evidence, rule/version provenance, affected capabilities, impact, recommendation, and validation questions;
- no probabilistic record matching, production-record inspection, or matching inference from identifiers, integrations, or system names is introduced;
- all existing schemas continue to parse successfully because DIA-004 uses the existing `entity_identity` finding category and diagnostic envelope contract;
- TypeScript, source-policy lint, full tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior validation

The 2026-08-20 competing-authority increment passed GitHub Actions with direct authority evidence and no topology-based authority inference.

## Local/demo boundary

Duplicate matching is intentionally conservative and uses reviewed architecture capability names only. It does not compare customer records or attempt record linkage. Diagnostic and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, and formal PDF export remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
