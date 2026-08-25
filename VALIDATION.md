# Validation status

## 2026-08-25 AI-assisted candidate finding increment

Validation expectations for this branch:

- AI-assisted interpretation runs only after extraction approval and after deterministic diagnostics exist;
- the working demo uses a local deterministic provider and requires no external credentials;
- the provider receives only confirmed structured architecture objects plus deterministic finding summaries;
- candidates are limited to 20, remain `derived`, stay `pending`/`candidate`, and are capped at confidence 0.8;
- every affected object ID and evidence segment must resolve inside the exact approved extraction boundary;
- rejected extraction objects cannot contribute to AI candidates;
- instruction-like strings in uploaded object attributes are treated as data and cannot trigger tools or override the candidate contract;
- the OpenAI Responses provider boundary uses strict structured output and `store: false`, but is not activated in the browser/demo path;
- AI candidates remain isolated from normal accepted findings and therefore cannot affect maturity, recommendations, maps, or reports automatically;
- focused behavioral coverage is provided in `tests/ai-findings.test.mjs` in addition to the complete existing test suite;
- `schemas/ai-finding-candidate.schema.json` validates the candidate envelope and lifecycle/provenance fields;
- final GitHub Actions results are recorded after the branch validation run completes.

## 2026-08-24 long synchronous chain increment

Validation expectations and results for this branch:

- synchronous mode is retained only from directly supported language such as `A synchronously calls B`, `A calls B synchronously`, `A makes a synchronous call to B`, or an explicitly annotated `[sync]` edge;
- ordinary integration arrows and asynchronous wording are not labeled synchronous;
- DIA-008 runs only after extraction approval and consumes confirmed integration objects;
- a long-synchronous-chain finding requires at least three consecutive explicit synchronous hops;
- a non-synchronous, missing, rejected, or inferred middle edge breaks the chain;
- findings use the existing `integration_risk` category and retain direct evidence, rule/version provenance, affected integration IDs, impact, recommendation, and runtime-validation questions;
- no schema shape change is required because integration attributes are already string-valued and the diagnostic schema already supports `integration_risk` plus versioned rule identifiers;
- focused behavioral coverage is provided in `tests/synchronous-chain.test.mjs` in addition to the complete existing test suite;
- GitHub Actions validation run 32747601170 passed on Node 22.23.2 with TypeScript, source-policy lint, 76/76 tests, and the optimized Next.js 15.4.10 production build green;
- the repository snapshot packaged successfully in CI.

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

AI-assisted candidate generation is intentionally separated from accepted findings. The local provider exists to exercise the provider, evidence, schema, and UI boundaries without external credentials; it must not be described as a production model result. External model activation remains server-side production work. Diagnostic, candidate, and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, formal PDF export, and server-side external-model privacy/retention controls remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
