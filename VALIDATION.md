# Validation status

## 2026-08-22 duplicate platform capability increment

Expected validation for the published branch:

- all prior behavioral and contract tests remain green;
- explicit system-to-capability statements enrich named system objects with direct-evidence `capabilityClaim=explicit` and `capability:<normalized capability>` attributes;
- multiple explicit capability claims on the same system remain independently addressable as attributes;
- the duplicate-platform-capability rule emits only when two or more confirmed systems explicitly provide, implement, offer, or host the same normalized capability;
- generic capability objects and non-explicit capability hints do not emit the finding;
- rejected extraction objects remain excluded from diagnostics;
- every emitted duplicate-capability finding has direct evidence, rule/version provenance, affected systems, impact, recommendation, and validation questions;
- the rule does not infer capability duplication from names, APIs, topology, or generic similarity;
- the diagnostic schema accepts the `platform_capability` category;
- all schemas continue to parse successfully;
- TypeScript, source-policy lint, full tests, and optimized Next.js production build must pass in GitHub Actions.

## Prior validation

The 2026-08-21 duplicate-matching increment passed GitHub Actions with explicit matching/entity-resolution extraction and diagnostic evidence boundaries intact. The 2026-08-20 competing-authority increment passed GitHub Actions with direct-claim authority extraction and diagnostic evidence boundaries intact.

## Local/demo boundary

Capability extraction is deterministic and intentionally narrow. It recognizes explicit architecture-language responsibility statements and does not attempt semantic inference across arbitrary prose. Diagnostic and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, and formal PDF export remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
