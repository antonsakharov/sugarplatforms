# Validation status

## 2026-08-24 long synchronous chain increment

Validation expectations for this branch:

- synchronous mode is retained only from directly supported language such as `A synchronously calls B`, `A calls B synchronously`, `A makes a synchronous call to B`, or an explicitly annotated `[sync]` edge;
- ordinary integration arrows and asynchronous wording are not labeled synchronous;
- DIA-008 runs only after extraction approval and consumes confirmed integration objects;
- a long-synchronous-chain finding requires at least three consecutive explicit synchronous hops;
- a non-synchronous, missing, rejected, or inferred middle edge breaks the chain;
- findings use the existing `integration_risk` category and retain direct evidence, rule/version provenance, affected integration IDs, impact, recommendation, and runtime-validation questions;
- no schema shape change is required because integration attributes are already string-valued and the diagnostic schema already supports `integration_risk` plus versioned rule identifiers;
- focused behavioral coverage is provided in `tests/synchronous-chain.test.mjs` in addition to the complete existing test suite;
- GitHub Actions is the authoritative dependency-backed validation path for TypeScript, source-policy lint, tests, optimized Next.js production build, and repository packaging.

Final GitHub Actions run details are recorded after the branch head passes the complete workflow.

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

Long synchronous chain recognition is deterministic and intentionally conservative. It does not claim ordinary service topology is synchronous, and a generated finding remains a reviewable latency/availability-coupling signal until a human confirms the real runtime critical path, latency budgets, retry policies, and transactional requirements. Diagnostic and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, and formal PDF export remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
