# Validation status

## 2026-08-27 explicit entity relationship increment

Validation expectations for VIS-003:

- creator, consumer, and authority claims are extracted only from strict explicit source language;
- sentence-bounded parsing prevents neighboring statements from being absorbed into system or entity names;
- every relationship retains the exact direct source segment used to support it;
- creator/consumer/authority graph edges are emitted only when both endpoint objects are confirmed in extraction review;
- ordinary topology, identifiers, names, OpenAPI paths, accepted findings, or missing contrary evidence cannot establish entity roles;
- the focused identifier relationship remains visibly derived rather than being presented as a source fact;
- feature-specific coverage in `tests/entity-relationships.test.mjs` checks positive extraction, topology-only negative behavior, exact-evidence graph projection, and suppression of unconfirmed endpoints;
- `schemas/entity-id-graph.schema.json` covers the new relationship edge kinds and `directRelationshipCount`;
- the full `npm run validate` gate remains authoritative and includes TypeScript, source-policy lint, all behavioral tests, and the optimized Next.js production build;
- tenant-isolation checks remain not applicable to this browser-local adapter because authenticated organization persistence/RLS has not yet been implemented.

## 2026-08-26 AI candidate promotion increment

Validation expectations and local results for this branch:

- explicit promotion is the only path from an AI-assisted candidate into the normal finding set;
- every candidate envelope is bound to the exact deterministic diagnostic `generatedAt` version that produced it;
- promotion revalidates the current approved extraction boundary, confirmed object IDs, direct evidence segment IDs, provider provenance, and prompt provenance;
- extraction re-approval or deterministic diagnostic rerun makes older candidate sets stale and non-promotable;
- promotion creates a pending derived normal finding and initializes a fresh normal finding review; the promoted finding cannot affect maturity, recommendations, maps, or reports until it is explicitly accepted in a completed non-stale review;
- browser-local promotion records preserve candidate, diagnostic, extraction-approval, provider, prompt, and promotion timestamps; durable tenant-scoped audit persistence remains production work;
- `schemas/ai-finding-candidate.schema.json` now requires `diagnosticGeneratedAt` and `schemas/ai-candidate-promotion.schema.json` validates promotion provenance;
- focused promotion tests cover successful promotion/provenance, stale diagnostic rejection, stale extraction rejection, and downstream normal-review gating;
- local Node 22.16.0 validation passed source-policy lint, all JSON schemas parsed, and the full behavioral suite passed 86/86 tests;
- dependency-backed TypeScript and optimized Next.js build validation is delegated to GitHub Actions because the downloaded CI source snapshot intentionally excludes `node_modules`; the authoritative CI result is recorded in the run handoff.

## 2026-08-25 AI-assisted candidate finding increment

Validation expectations and results for this branch:

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
- GitHub Actions run 32865166583 passed on Node 22.23.2 with TypeScript, source-policy lint, 82/82 tests, and the optimized Next.js 15.4.10 production build green, including `/assessment/[id]/ai-findings`;
- the validated repository snapshot packaged successfully in CI with artifact SHA-256 `7e3279d74f30712d8cf197e8e97928ebadc63838ed8dba4e65d9bf938c6df39b`.

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

AI-assisted candidate generation and promotion remain human-gated. The local provider exists to exercise provider, evidence, schema, candidate, promotion, and review boundaries without external credentials; it must not be described as a production model result. External model activation remains server-side production work. Diagnostic, candidate, promotion, and review state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, styled print output, formal PDF export, and server-side external-model privacy/retention controls remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.
