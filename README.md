# Sugar Platform Diagnostic

Sugar Platform Diagnostic is a limited, real, upload-based platform assessment product for CTOs, platform leaders, architects, and technology organizations.

A user creates a focused assessment, uploads a controlled set of architecture artifacts, reviews extracted systems/entities/identifiers, runs evidence-backed diagnostics, and receives a platform map plus an executive report.

A guided **Acme HealthTech** Patient-identity assessment is available as a secondary sample path. It seeds the same server-backed reviewed-state pipeline as a real uploaded assessment so prospects can inspect evidence, findings, the Entity/ID map, maturity, recommendations, and an immutable executive report before uploading their own material.

## Primary product flow

1. Create an assessment.
2. Select one diagnostic focus.
3. Name one primary business entity.
4. Upload up to 10 supported architecture artifacts.
5. Validate and parse the files.
6. Review extracted systems, entities, identifiers, integrations, capabilities, and owners.
7. Run deterministic and AI-assisted diagnostic analysis.
8. Review evidence-backed findings.
9. Explore the entity/ID map.
10. Generate an executive report.

## MVP limits

- One focused assessment per workspace
- One primary business entity
- Up to 10 files
- Up to 25 MB per file
- Up to 150 pages total where measurable
- Architecture metadata only
- No customer records
- No secrets, credentials, or access tokens
- No live production-system access
- Supported formats only

## Supported initial artifact types

- PDF architecture documents
- Markdown and plain text
- OpenAPI JSON or YAML
- JSON Schema
- CSV system inventories
- CSV ownership matrices
- CSV integration inventories
- CSV data dictionaries
- SQL DDL

## Product promise

> Upload a focused set of architecture artifacts and receive an evidence-backed diagnostic of fragmented entities, duplicated capabilities, brittle integrations, ownership gaps, and recommended next steps.

## Repository contents

- `docs/PRODUCT_SCOPE.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/USER_JOURNEY.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/DELIVERY_PLAN.md`
- `docs/DEMO_SCENARIO.md`
- `docs/FEATURES.md`
- `architecture/*.mmd`
- `schemas/*.json`
- `prompts/*.md`
- `project/BACKLOG.md`
- `project/DAILY_BUILD_PROTOCOL.md`
- `project/DECISIONS.md`
- `.env.example`

## Recommended stack

- Next.js App Router with TypeScript
- PostgreSQL/Supabase for managed database, authentication, and object storage
- OpenAI Responses API behind an internal AI Gateway
- Database-backed background jobs initially
- Mermaid first, React Flow later
- Docker-compatible deployment with Vercel as the easiest first path

## First production milestone

A CTO can upload a limited artifact set and receive:

- validated artifact inventory;
- extracted system and entity catalog;
- entity/identifier map;
- evidence-backed findings;
- maturity summary;
- prioritized recommendations;
- executive report.

## Status

The local/single-instance application journey is implemented through guided upload, evidence-backed extraction/review, deterministic findings, Entity/ID map, maturity/recommendations, immutable report history, formal PDF export, audited deletion controls, and the Acme HealthTech guided sample. Production confidential-data readiness still requires production identity, PostgreSQL/RLS activation with live isolation tests, managed private object storage, malware/quarantine controls, and production operational infrastructure.

## Latest local PDF parsing increment (2026-10-08)

The bounded PDF evidence adapter recognizes literal/hex text strings, octal escapes, explicit UTF-16BE BOM, and `TJ` arrays, with a 4 MiB decoded-stream limit. It rejects unsupported glyph mappings rather than guessing and preserves page locators only when `/Page` -> `/Contents` provenance is provable. See `project/DECISION_070.md` and `project/VALIDATED_2026-10-08.md` for scope and incomplete release gates.

## PDF evidence provenance (2026-10-09)

The bounded PDF adapter now resolves physical page numbers from a verified Catalog/Pages/Kids tree instead of object declaration order. Missing, cyclic, duplicated, or inconsistent page references fail closed; a catalog-less demo PDF can only emit fragment locators. See `project/DECISION_071.md`. This is not a general PDF/OCR parser.

## PDF ToUnicode provenance (2026-10-10)

Direct page-font `/ToUnicode` one-byte `bfchar` maps now decode selected glyphs without inventing characters; unsupported/missing mappings still fail closed. See `project/DECISION_072.md` and `project/VALIDATED_2026-10-10.md`. The canonical GitHub default branch still needs reviewed recovery from the complete local package; the local package is not a production release.

### Current build note (2026-10-11)

The approved local/demo package adds bounded PDF single-byte ToUnicode `bfrange` decoding with verified page provenance and fail-closed unknown glyph handling. Full npm dependency-backed validation and live tenant-isolation certification remain outstanding. The canonical `main` branch is still behind the local working package; `agent/pdf-cmap-range-baseline-2026-10-11` stages bounded unfiltered range decoding but not the full current parser; see `project/VALIDATED_2026-10-11.md` before considering any recovery branch for merge.

### 2026-10-12 bounded PDF parsing update
The local demo adapter now resolves inherited page font resources and fails closed on missing/ambiguous font mappings. The full application is in the dated backup; GitHub default-branch synchronization and full dependency-backed release validation are still required before merge or deployment.

### 2026-10-13 PDF font decoding increment
The bounded local/demo PDF adapter now supports direct, unfiltered fixed-width two-byte ToUnicode glyph mappings with verified page coordinates and fail-closed unsupported encodings. See `project/DECISION_075.md` and `project/VALIDATED_2026-10-13.md`. The complete approved package remains ahead of canonical `main`; full npm build/type certification and production tenant-isolation tests remain open.

### Latest local parser increment (2026-10-14)

The bounded PDF adapter decodes directly referenced, filtered ToUnicode CMaps using the same byte-faithful ASCIIHex/Flate stream decoder as page content. It does not infer missing glyphs or page numbers; unsupported PDF features fail closed. This is **not** a production-certified PDF/OCR integration. See `project/DECISION_076.md` and `project/VALIDATED_2026-10-14.md`. Canonical GitHub main remains behind this local working package.

### Repository recovery gate (2026-10-15)

The full application lives in the latest approved backup pending reconciliation with canonical GitHub. Run `npm run baseline:check` to verify required baseline documents and npm lockfile parity before dependency installation. CI now requires this preflight and `npm ci`; current lockfile drift is intentionally a blocking failure. See `project/DECISION_077.md` and `DEVELOPMENT.md`.

## Recovery status (2026-10-16)

The approved working application is preserved as a reproducible, source-only ZIP with a SHA-256/Git-blob manifest. See `DEVELOPMENT.md` for `npm run recovery:manifest`, `npm run recovery:verify`, GitHub tree comparison and draft-PR publication. This package does **not** establish that canonical `main` has been restored. The npm lockfile, full dependency-backed validation, and live tenant isolation remain release blockers; no production deployment is authorized.

## Complete-source recovery (2026-10-17)

The approved working application is backed up separately while canonical `main` is still design-only. `scripts/publish-recovery-api.py` is a dependency-free, dry-run-first GitHub Git Data API publisher that verifies the full source manifest, stages a byte-matched candidate tree, publishes only a new `agent/*` branch, and opens a draft PR. See `DEVELOPMENT.md` and `project/DECISION_079.md`. Do not merge until the npm lockfile, CI and live tenant-isolation gates pass.

### October 18, 2026 parsing update
The local/demo PDF adapter now decodes explicitly mapped glyphs from disjoint same-width ToUnicode codespace ranges (one or two bytes), while rejecting gaps and ambiguous encodings. This does not constitute full PDF support or production certification. See `project/DECISION_080.md` and `docs/FEATURES.md`.

### 2026-10-19 local parser increment

The credential-free PDF evidence adapter now supports bounded `/ASCII85Decode` (`/A85`) and ordered ASCII85/Flate page/font-map streams, with strict termination and decompression/output limits. It preserves proven page coordinates and rejects unsupported/ambiguous input. Run `node --experimental-strip-types --test tests/pdf-ascii85.test.mjs tests/pdf-stream-filters.test.mjs tests/parser.test.mjs` for focused checks. This is not full PDF/OCR coverage or production certification. The canonical `main` branch still needs complete source recovery, an authentic `better-sqlite3` lockfile, and dependency-backed release gates before merge or deployment.

### 2026-10-20 local parser increment

The bounded PDF adapter now decodes explicitly mapped mixed one-/two-byte ToUnicode codespaces when character boundaries are prefix-unambiguous. Unknown glyphs and unproven page coordinates fail closed. This is not production PDF/OCR certification; the complete source still requires a reviewed GitHub recovery PR and dependency-backed build/security validation.

### Bounded PDF RunLength support (2026-10-21)

The local/demo PDF parser can now decode strict `/RunLengthDecode` (`/RL`) page-content and selected-font ToUnicode streams, preserving proven page evidence and enforcing existing byte limits. See `project/DECISION_083.md`. This is not production PDF/OCR certification; canonical repository recovery and dependency-backed release gates remain open.

### PDF evidence parser update — 2026-10-22

The bounded local/demo PDF adapter now decodes default-EarlyChange LZW-compressed page content and selected-font ToUnicode streams, with strict evidence provenance and decompression caps. Run `node --experimental-strip-types --test tests/pdf-lzw.test.mjs` to validate this slice. Unsupported LZW parameters, production PDF/OCR, canonical GitHub synchronization, dependency-backed build and live tenant isolation remain open gates.

### Local PDF evidence adapter (2026-10-23)

The bounded demo parser supports single-filter Flate PNG Predictor 15 decoding for supported architecture page text and selected-font CMaps with verified page provenance. It is not a production PDF/OCR parser; unsupported parameters fail closed. See `project/DECISION_085.md`. Full release remains blocked by GitHub baseline synchronization, an authentic `better-sqlite3` npm lockfile, dependency-backed CI and live tenant isolation.

### 2026-10-24 — TIFF Predictor 2 PDF evidence

The local/demo PDF parser now supports bounded single-filter Flate TIFF Predictor 2 horizontal differencing for architecture page text and selected-font CMaps. It requires 8-bit single-channel complete rows, rejects unsupported parameters and preserves only verified page locators. See `project/DECISION_086.md`. This does not certify full PDF/OCR, canonical GitHub parity, dependency-backed CI, or live production tenant isolation.

### Dependency integrity recovery (2026-10-25)
The previously missing `better-sqlite3@12.10.1` npm lock metadata is restored from published integrity records. `npm run baseline:check` now checks the full required transitive closure, registry URL allowlist and SHA-512 SRI format. The offline `npm ci --ignore-scripts --dry-run` succeeds but **does not install packages**. Full `npm ci`, type checking, build, tests, and production security certification remain required in a networked environment. See `project/DECISION_087.md`.

### Canonical recovery review (2026-10-25)
The complete approved application source is available for review on `agent/canonical-recovery-lockfile-2026-10-25` in draft PR #56. The branch contains every source file in the verified recovery manifest plus the manifest itself. `main` remains the canonical design baseline until a human-reviewed merge after release gates pass. No production deployment was performed.

**CI status (2026-10-25):** The complete draft recovery branch passed networked `npm ci`, TypeScript, lint, **366/366 tests**, and Next.js build. Live production tenant/storage/scanner security certification is still required; PR #56 remains draft and unmerged.

### PDF parser increment — 2026-10-26
The bounded local/demo PDF adapter now supports strictly indexed Flate PDF 1.5 object streams containing generation-zero dictionaries, preserving verified physical-page evidence for supported architecture documents. Complex PDF/xref revisions and OCR still require a production parser; see Decision 090. This is not production security certification.

### 2026-10-27 — Bounded PDF cross-reference stream validation
The local/demo parser verifies single, complete PDF 1.5 Flate xref streams against direct byte offsets and indexed compressed objects before trusting page evidence. Hybrid/incremental revisions, classic tables, arbitrary PDFs and OCR still require a production PDF adapter. See Decision 091; MVP upload and privacy limits are unchanged.

## Latest development increment (2026-10-28)

PAR-005b15 adds bounded classic PDF cross-reference table integrity checks to the local/demo evidence parser. It verifies complete direct-object offsets and a Root Catalog before physical-page extraction, while preserving the existing PDF 1.5 xref-stream gate and rejecting ambiguous revisions (Decision 092). The full assessment-to-report flow remains available in the credential-free local adapter. Production PDF/OCR, live managed tenant/storage/scanner isolation, and confidential-data readiness remain open; no deployment is authorized by this increment.

### 2026-10-30 — Classic PDF trailer lexical compatibility
The bounded local/demo PDF parser accepts PDF whitespace and `%` line comments around classic xref trailer fields and terminal `startxref`, preserving raw object offsets and verified page evidence. Metadata and comments are not architecture evidence; ambiguous revisions and invalid fields fail closed. See Decision 094. Production-grade PDF/OCR, live tenant/storage/scanner certification and a human-reviewed merge remain outstanding.
