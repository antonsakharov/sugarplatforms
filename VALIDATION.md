# Validation status

## 2026-08-20 competing authority increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- explicit `system of record`, `source of truth`, and `authoritative system` statements enrich system objects with direct-evidence `authorityFor` attributes;
- authority extraction preserves source evidence and does not introduce an unsupported object kind;
- the competing-authority rule emits only when two or more confirmed systems explicitly claim authority for the same normalized entity;
- a single authority claim does not emit a competing-authority finding;
- rejected extraction objects remain excluded from diagnostics;
- every emitted authority finding has direct evidence, rule/version provenance, affected systems, impact, recommendation, and validation questions;
- the rule does not infer authority from topology, naming, integration direction, identifiers, or ownership;
- all schemas continue to parse successfully;
- TypeScript, source-policy lint, full tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior validation

The 2026-08-19 report-versioning and structured-export increment passed GitHub Actions with accepted-findings-only reporting and immutable browser-local snapshot boundaries intact.

## Local/demo boundary

Authority extraction is deterministic and intentionally narrow. It recognizes explicit architecture-language claims and does not attempt semantic inference across arbitrary prose. Diagnostic and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, and formal PDF export remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
