# Validation status

## 2026-08-21 duplicate matching logic increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- explicit matching/entity-resolution statements enrich system objects with direct-evidence `matchingFor`, `matchingClaim`, and optional `matchingMethod` attributes;
- matching extraction preserves source evidence and does not introduce an unsupported object kind;
- the duplicate-matching-logic rule emits only when two or more confirmed systems explicitly perform matching/entity-resolution for the same normalized entity;
- a single matching implementation does not emit the finding;
- matching hints without `matchingClaim=explicit` do not emit the finding;
- rejected extraction objects remain excluded from diagnostics;
- every emitted matching finding has direct evidence, rule/version provenance, affected systems, impact, recommendation, and validation questions;
- the rule does not infer matching responsibility from system names, identifiers, APIs, integration topology, or generic capability labels;
- all schemas continue to parse successfully;
- TypeScript, source-policy lint, full tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior validation

The 2026-08-20 competing-authority increment passed GitHub Actions with direct-claim authority extraction and diagnostic evidence boundaries intact.

## Local/demo boundary

Matching extraction is deterministic and intentionally narrow. It recognizes explicit architecture-language statements and does not attempt semantic inference across arbitrary prose. Diagnostic and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, and formal PDF export remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
