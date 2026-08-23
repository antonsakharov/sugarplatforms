# Validation status

## 2026-08-23 direct database coupling increment

Validation expectations and results for the published branch:

- direct database coupling is evaluated only after extraction approval;
- the rule consumes explicit integration objects and requires a database-like target name (`DB`, `database`, PostgreSQL, MySQL, Oracle, or SQL Server);
- ordinary service-to-service integration edges do not emit the finding;
- SQL DDL/entity extraction alone does not imply direct database coupling;
- emitted findings use the `integration_risk` category and retain direct source evidence, rule/version provenance, impact, recommendation, and validation questions;
- maturity/recommendation projection supports the new integration-risk category without changing accepted-findings-only gating;
- the diagnostic JSON schema includes `integration_risk`;
- GitHub Actions validation run 32648190793 passed on Node 22.23.2 with TypeScript, source-policy lint, 70/70 tests, and the optimized Next.js 15.4.10 production build green;
- the repository snapshot packaged successfully in CI.

## Prior validation

The 2026-08-22 duplicate-platform-capability increment passed GitHub Actions with explicit system responsibility and direct-evidence capability boundaries intact. The 2026-08-21 duplicate-matching increment passed GitHub Actions with explicit matching/entity-resolution extraction and diagnostic evidence boundaries intact. The 2026-08-20 competing-authority increment passed GitHub Actions with direct-claim authority extraction and diagnostic evidence boundaries intact.

## Local/demo boundary

Direct database coupling recognition is deterministic and intentionally conservative. The current rule treats an explicit integration edge to something named as a database/DB or recognized database engine as a reviewable coupling signal, but it does not claim that database credentials or drivers are definitely used until a reviewer validates that fact. Diagnostic and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, and formal PDF export remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
