# Validation status

## 2026-08-30 formal PDF export increment

Validation expectations for REP-007:

- formal PDF export is available only for an explicitly saved immutable report snapshot; an unsaved live preview cannot enter the product-managed export path;
- the server reuses report snapshot validation and fails closed on assessment or diagnostic-provenance mismatch;
- `POST /api/reports/pdf` accepts at most 1 MB of structured snapshot JSON and does not accept uploaded artifact bytes or parsed source content;
- the deterministic PDF contains reviewed report facts, artifact metadata, accepted finding evidence coordinates, recommendations, action-plan items, limitations, snapshot version, and diagnostic provenance without adding new conclusions;
- repeated generation from the same snapshot produces identical PDF bytes and SHA-256;
- responses use `application/pdf`, `Cache-Control: no-store`, and expose page-count, SHA-256, and diagnostic-generation headers;
- `schemas/report-pdf-export.schema.json` defines the export-manifest metadata contract;
- `tests/report-pdf.test.mjs` covers PDF signature/EOF, deterministic bytes/checksum, safe versioned filename, visible evidence coordinates, absence of a raw-content field, and fail-closed provenance mismatch;
- the dependency-free PDF adapter intentionally uses built-in Type 1 fonts and printable fallback for unsupported non-ASCII glyphs; full Unicode embedding is deferred production polish;
- the full `npm run validate` GitHub Actions gate remains authoritative and includes TypeScript, source-policy lint, all behavioral tests, schema parsing, and the optimized Next.js production build;
- tenant-isolation checks remain not applicable to this browser-local report-history adapter because authenticated organization persistence/RLS has not yet been implemented.

## 2026-08-28 graph filters and static export increment

Validation expectations for VIS-004:

- filtering operates only on the already reviewed Entity/ID graph and cannot synthesize nodes, relationships, evidence, or accepted findings;
- node-type filters remove any relationship whose endpoint is no longer visible;
- relationship-type and direct/derived filters preserve the original fact status and source evidence;
- text search is bounded to 120 characters and matches visible node labels, relationship labels/types, and accepted finding identifiers without changing source data;
- optional hide-isolated behavior removes nodes only after relationship filtering;
- the filtered graph recomputes visible counts from the visible projection rather than retaining misleading full-graph counts;
- SVG export is self-contained, escapes untrusted labels before XML rendering, and visually distinguishes direct edges from derived edges;
- JSON export contains only the filtered graph, active filter definition, export timestamp, and existing metadata/evidence references; it does not add raw uploaded artifact content;
- `schemas/entity-id-graph-export.schema.json` defines the structured export envelope;
- feature-specific coverage in `tests/entity-id-graph-view.test.mjs` checks direct/derived filtering, endpoint pruning, search/hide-isolated behavior, SVG escaping/styling, and empty-filter fail-closed behavior;
- the full `npm run validate` GitHub Actions gate remains authoritative and includes TypeScript, source-policy lint, all behavioral tests, schema parsing, and the optimized Next.js production build;
- tenant-isolation checks remain not applicable to this browser-local adapter because authenticated organization persistence/RLS has not yet been implemented.

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

AI-assisted candidate generation and promotion remain human-gated. The local provider exists to exercise provider, evidence, schema, candidate, promotion, and review boundaries without external credentials; it must not be described as a production model result. External model activation remains server-side production work. Diagnostic, candidate, promotion, review, report-version, and PDF-export source state remains browser-local demo state, not durable tenant-scoped persistence.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable graph/findings/review/maturity/recommendation/report persistence, server-backed report authorization/version history, deletion, audit events, log redaction, backup/restore, tenant-isolation tests, digitally signed/private report storage where required, and server-side external-model privacy/retention controls remain mandatory before confidential enterprise artifacts can be accepted or reports can be treated as production records.

## 2026-09-28 — Managed deletion job transitions

Added the provider-neutral managed deletion job mutation adapter and SECURITY INVOKER RPC migration. Static review confirms explicit tenant scope, verified-user JWT propagation, maximum reconciliation batch 20, five-minute leases, bounded retries, and storage-key membership checks before checkpointing. Focused Node test execution is blocked in this runtime because the packaged backup does not include installed `zod` dependencies; full build/type/lint/test validation is therefore pending CI after publication. No live Supabase credentials were available, so two-tenant RLS/storage isolation remains unverified.

## Validation run 2026-09-30

- `npm test`: 141 tests discovered; 116 passed, 25 failed because dependencies were not installed in the build sandbox (`zod`, `better-sqlite3`).
- `npm install --package-lock-only --ignore-scripts --include=dev`: timed out; lockfile remains a known deployment blocker and is not represented as fixed.
- No production deployment performed.

## 2026-10-08 bounded PDF encoding increment

Focused parser regression suite adds literal octal/nested escapes, explicit UTF-16BE BOM, mixed `TJ` arrays, unmapped high-bit glyph rejection, malformed hex rejection, and bounded Flate output. See `project/DECISION_070.md`. This does not certify production-grade PDF font/CMap/OCR parsing or live tenant isolation. Full validation results are recorded in the 2026-10-08 handoff.

## 2026-10-09 — Verified PDF page-tree provenance

The bounded parser now walks Catalog/Pages/Kids in physical order, validates Parent/Count/cycles/duplicate objects and refuses fabricated page numbers. Focused parser 28/28; parser+upload+graph 35/35; source-policy lint and isolated helper typecheck pass; 19 JSON schemas parse. Full suite 139/163, with 24 dependency/module-resolution failures; Next.js build and project typecheck remain blocked by missing installed packages. `package-lock.json` remains out of sync with `package.json`. See `project/VALIDATED_2026-10-09.md` and `project/GITHUB_SYNC_2026-10-09.md`.

## 2026-10-11 — PDF CMap character-range increment

- Local parser suite: **41/41 passed; standalone CMap 8/8 passed; parser/upload/graph/CMap 60/60 passed**; includes six new parser bfrange cases, eight standalone CMap tests, plus updated prior cases to reflect newly supported valid ranges.
- `npm run lint`: **passed** (source policy).
- All 19 `schemas/*.json` files parse as JSON.
- Full `npm test`: **161 passed, 24 failed of 185**. The failures are dependency or Node native TypeScript/module-resolution failures (`zod`, `better-sqlite3`, extensionless relative imports, and `@/lib` aliases). They are not represented as passing.
- `npm run typecheck`: **failed** because Next.js and other installed type dependencies are missing.
- `npm run build`: **failed** (`next: not found`).
- `npm ci --offline --ignore-scripts --include=dev`: **failed** (`ENOTCACHED` for `better-sqlite3`); package lock remains unsynchronized.
- Live PostgreSQL/RLS, private-bucket isolation, and scanner infrastructure: **not executed** (credentials/services unavailable).
- No production deployment. See `project/DECISION_073.md`.

## 2026-10-14 PDF filtered CMap increment

See `project/VALIDATED_2026-10-14.md`: 97/97 focused tests passed; 193/217 full-suite tests passed (24 dependency-related failures); source-policy lint passed; 19 JSON schemas parsed; full typecheck/build blocked by missing dependencies and unsynchronized lockfile. No production deployment or live tenant-isolation certification.

## 2026-10-16 — Recovery snapshot integrity

Added source-only SHA-256/Git-blob inventory, byte-for-byte manifest verification, GitHub recursive-tree parity comparison, deterministic ZIP packaging and regression tests. See `project/DECISION_078.md` and `project/VALIDATED_2026-10-16.md` for current execution results. The recovery tooling does not fix the known missing native npm dependency metadata or certify production readiness.

## 2026-10-17 — Git Data API recovery publication

Added an explicit no-write-by-default, dependency-free GitHub Git Data API publisher and offline mock-API regression suite. Local tests prove branch restrictions, pre-ref candidate tree parity, stale-main refusal, draft-only PR intent, and verified-source inclusion; they do **not** prove remote publication. The build runner cannot resolve GitHub or npm registry hosts and has no GitHub REST token, so complete-source publication and native npm lockfile regeneration remain blocked. Full Next.js/typecheck and live two-tenant security certification remain open. See `project/DECISION_079.md` and `project/VALIDATED_2026-10-17.md`.

### 2026-10-18 — Bounded ToUnicode multi-interval evidence
- Feature: up to 16 disjoint fixed-width codespace ranges with gap/overlap/mixed-width guards and verified page-backed PDF extraction.
- Focused PDF parser/CMap tests: 64/64 passed (prior 59 + 5 new tests).
- Full test suite in the restricted runner: 215 passed, 25 failed before manifest regeneration; 24 failures are missing dependency/module resolution and one publisher manifest test fails until today's manifest is regenerated.
- Source lint: passed. JSON schema syntax: 19/19 valid.
- Full TypeScript: blocked by absent Next.js and other dependencies. Production build: blocked (`next` not installed). `npm ci`: blocked by incomplete `better-sqlite3@12.10.1` lock metadata and unavailable npm registry.
- Live two-tenant PostgreSQL/RLS, private object storage, and scanner integration: not executed; no production deployment.

### 2026-10-18 final certification/handoff correction
- Final focused parser, PDF CMap, upload, content-policy, graph, and route-auth migration tests: **108/108 passed**.
- New standalone codespace tests: **3/3 passed**; complete CMap/PDF parser set: **67/67 passed**.
- Full suite before final manifest regeneration: **218 passed, 25 failed**; the extra failure was the recovery publisher's intentional stale-manifest guard. Rebuilding the manifest is required before the final full-suite rerun.
- Focused TypeScript check for `lib/pdf-codespaces.ts` and `lib/pdf-to-unicode.ts`: passed using the installed global TypeScript and Node types. Full application typecheck and build remain blocked by unavailable dependencies.
- GitHub: published exact blob hashes for `lib/pdf-codespaces.ts`, `lib/pdf-to-unicode.ts`, `tests/pdf-codespaces.test.mjs`, and `project/DECISION_080.md` on `agent/pdf-codespace-review-2026-10-18`. The recovery branch still lacks many local files; GitHub draft-PR creation was blocked. No merge or deployment.
- **Final post-manifest run:** 243 total tests; **219 passed, 24 failed**. The 24 failing test files require unavailable `better-sqlite3`, `zod`, and other dependency/module-resolution support; no new parser or recovery test failure. Manifest verification, publisher dry run, source lint, 19 JSON schema syntax checks, focused TypeScript, and ZIP integrity/reproducibility passed. Full typecheck/build and live tenant isolation remain unverified.

### 2026-10-19 — ASCII85 PDF evidence stream increment

- Added strict, bounded ASCII85Decode/A85 stream support for page content and ToUnicode font maps, with filter-name parsing corrected for digit-bearing names and explicit fail-closed handling of malformed/over-budget streams.
- Focused parser/CMap/stream tests and complete test suite are rerun after manifest regeneration; see `project/VALIDATED_2026-10-19.md` for final counts and limitations.
- `npm run lint` and all 19 JSON schema syntax checks pass. Full dependency-backed typecheck/build and live tenant isolation remain uncertified in the offline runner; no production deployment.

**Final October 19 results:** 8/8 new ASCII85 tests, 82/82 PDF focused tests, 139/139 extended parser/upload/security/recovery tests passed. Full suite 227/251 (24 dependency/module-resolution failures). Focused PDF TypeScript, source-policy lint, 19 JSON schema syntax checks, recovery manifest verification passed. Baseline lockfile parity, full typecheck/build and live tenant isolation remain blocked. Branch created but implementation writes and draft PR blocked by connected GitHub safety checks; no deployment. See `project/VALIDATED_2026-10-19.md`.

## 2026-10-20 — Mixed-width PDF ToUnicode local increment

- Scope: prefix-unambiguous one-/two-byte CMap codespaces, explicit glyph mapping, fail-closed operand decoding, and proven PDF page evidence. Decision 082.
- Focused tests: `node --experimental-strip-types --test tests/pdf-codespaces.test.mjs tests/pdf-to-unicode.test.mjs tests/parser.test.mjs`.
- Full suite: `npm test` (known dependency/module-resolution failures must not be hidden).
- Other gates: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run baseline:check`, JSON syntax validation, and recovery-manifest verification.
- Canonical `main` lacks required baseline documents; the 2026-10-19 approved source backup is the local restoration source pending review. No production deployment or live tenant test was performed.

**October 20 focused checks:** mixed-width parser 73/73, extended PDF/upload/malware/content-policy/graph/auth 133/133, core assessment-to-report 37/37; source lint passed. Focused TypeScript passed with temporary Node `Buffer` ambient declaration only. GitHub branch created but source writes were blocked by connected safety checks; no PR/merge/deploy. Authentic `better-sqlite3` lock metadata and dependency-backed build/typecheck remain blocked by DNS and unavailable dependencies.

**October 20 final full-suite after manifest refresh:** 233/257 passed; 24 test-file failures from missing dependency/module resolution. No new PDF/CMap or recovery-publisher failures. The approved local snapshot contains 350 source files before the final validation-record update.

### 2026-10-22 — Strict PDF LZW evidence decoding

Decision 084 introduces a bounded default-EarlyChange `/LZWDecode` adapter for directly referenced PDF page and ToUnicode streams. New tests: 8/8 pass; focused parser/stream/upload/graph: 76/76 pass; assessment/upload/malware/graph/parser journey: 75/75 pass; full suite: 249 pass, 24 fail (missing dependencies). Source-policy lint and 19 JSON schema syntax checks pass. Focused TypeScript passes with a temporary external Node type shim; full typecheck/build remain blocked by offline missing dependencies. Baseline gate remains blocked by the missing authentic `better-sqlite3` lockfile entry; canonical GitHub parity and live tenant isolation are not certified. See `project/VALIDATED_2026-10-22.md`.

### 2026-10-23 — Flate PNG Predictor 15 evidence slice

See `project/VALIDATED_2026-10-23.md` for command-level test results, dependency and GitHub synchronization limitations. No production deployment or confidential customer ingestion is certified.

### 2026-10-24 — TIFF Predictor 2 local/demo evidence increment

See `project/VALIDATED_2026-10-24.md` for command-level results. The decoder adds no external service dependency and does not alter the upload/privacy/tenant limits. Canonical GitHub source parity, npm lockfile metadata, full build/type/test and live production isolation remain outstanding.

### 2026-10-25 — Authentic npm lock metadata recovery
`better-sqlite3@12.10.1` and 36 missing transitive pinned package records were restored from a versioned public npm v3 lockfile with published SHA-512 SRI values (Decision 087). Baseline preflight now rejects non-registry tarball URLs, invalid integrity strings, malformed installed package paths and missing required transitive dependencies. Offline `npm ci --ignore-scripts --dry-run` succeeds but real `npm ci` fails with `ENOTCACHED` because the runner has no package tarballs. Full typecheck/build and live tenant isolation remain uncertified. See `project/VALIDATED_2026-10-25.md`.

**Networked CI follow-up (2026-10-25):** GitHub Actions verified the repaired lockfile and completed a real `npm ci`. Initial `npm run validate` stopped at six TypeScript `Buffer` generic-assignment errors in `lib/pdf-stream-filters.ts`. The shared decoded-stream variable now uses an explicit `Buffer` type; the next CI run must prove the fix before this PR is merge-ready.

**Green networked CI (2026-10-25):** After adding the bounded test-only Node ESM alias loader and resolving extensionless relative imports inside `lib/`, GitHub Actions completed a real `npm ci`, full TypeScript checking, source-policy lint, **365/365 tests**, and Next.js production build (13 static pages). Both push and draft-PR workflows succeeded on commit `c56bdfc79a4b9e9d1e20c26197bfe443703e55e3`. Local offline `npm ci` still cannot fetch tarballs. Live non-BYPASSRLS two-tenant PostgreSQL/private storage/malware isolation remains untested; PR #56 stays draft, unmerged and undeployed.

**Audit tie-breaker follow-up (2026-10-25):** One networked CI rerun found a flaky SQLite deletion audit ordering assertion when request and failure receipts shared the same millisecond. `lib/assessment-lifecycle.ts` now orders equal-timestamp receipts by insertion `rowid`, with a regression forcing reverse UUID order. This is a deterministic local audit fix; the final networked CI rerun must verify it. Production live tenant-isolation remains outstanding.
