# Delivery Plan

## Product strategy

Build the real limited diagnostic first. Keep the sample assessment as a parallel demonstration path, not as the core product.

## Phase 0 — Product redesign

Status: complete

- limited upload-based product definition;
- assessment limits;
- updated system design;
- revised feature inventory;
- revised daily build automation;
- security boundary;
- sample assessment retained.

## Phase 1 — Deployable product shell

Deliver:

- public landing page;
- Analyze My Platform action;
- View Sample Diagnostic action;
- application layout;
- assessment setup form;
- Acme sample workspace;
- Docker/Vercel deployment configuration.

## Phase 2 — Guided upload and validation

Deliver:

- private upload flow;
- supported type validation;
- count/size/page limits;
- duplicate detection;
- potential secret warnings;
- artifact readiness summary;
- remove/replace behavior.

## Phase 3 — Parsing and evidence inventory

Deliver parsers for text, Markdown, JSON, YAML, CSV, SQL DDL, and PDF; source-addressable segments; artifact status; evidence inventory; and parsing failure UX.

## Phase 4 — Structured extraction and review

Deliver the AI Gateway, schema-validated extraction, evidence-linked systems/entities/IDs/integrations/capabilities/owners, and review actions.

## Phase 5 — Diagnostic engine

Deliver deterministic rules, AI-assisted findings, evidence validation, and finding review.

## Phase 6 — Entity/ID visualization

Deliver the primary-entity graph, identifier/system relationships, authority claims, evidence drill-down, and static export.

## Phase 7 — Maturity, recommendations, and report

Deliver maturity summary, prioritized recommendations, 90-day plan, executive report, print/PDF export, and report versioning.

## Release gates

Do not mark a phase complete unless the user-visible workflow works end to end, build/type/lint/tests pass, limits are enforced server-side, evidence requirements are preserved, documentation is updated, and demo fixtures still work.

## Production-readiness continuation

After the local/demo end-to-end journey reached formal PDF export, production readiness proceeds incrementally behind stable domain interfaces. The first persistence slice stores validated assessment metadata server-side through an explicit repository boundary and retains a credential-free SQLite adapter for local/single-instance operation. Subsequent slices added explicit tenancy, authentication/authorization boundaries, PostgreSQL/RLS policy foundations, private artifact storage, durable processing/review/finding state, accepted-findings downstream consumption, and authorized immutable report history.

The local/single-instance path now includes admin-authorized end-to-end assessment deletion, retained minimal audit receipts, and durable deletion jobs with per-object checkpoints, bounded retry/backoff, crash-recovery leases, redacted administrator visibility, and bounded reconciliation. Production activation still requires PostgreSQL/RLS-backed job/audit persistence, an authenticated scheduler/worker, production private storage with validated deletion semantics, retention/backup handling, verified production identity, malware/quarantine, and live database/storage isolation tests before confidential enterprise inputs.

## Demo readiness — Acme HealthTech

The guided Acme HealthTech sample is implemented as a deterministic server-persisted fixture on the real reviewed-state pipeline. It is intended for controlled product demonstrations and contains architecture metadata only. Production confidential-data readiness remains gated on production identity, PostgreSQL/RLS activation and live isolation tests, managed private object storage, malware/quarantine controls, and production operational infrastructure.

### 2026-10-12 parsing slice
Inherited page-font resource lookup and fail-closed selected-font validation are implemented in the local bounded PDF adapter. This does not close Phase 3: full PDF coverage, dependency-backed CI, live tenant isolation, and GitHub canonical baseline recovery remain release gates.

### 2026-10-13 parsing slice
Direct, unfiltered fixed-width two-byte `/ToUnicode` decoding is implemented in the bounded local/demo PDF adapter with verified page provenance, output caps, and fail-closed unknown glyphs. Phase 3 remains in progress; mixed-width/filtered CMaps, OCR, full production PDF support, synchronized GitHub baseline, dependency-backed CI, and live tenant isolation remain open gates.

### 2026-10-15 release-integrity gate
The canonical `main` branch remains behind the approved local application package. A dependency-free baseline checker and regression suite are implemented locally; CI in the working package now runs the checker and uses `npm ci`. Root Node engine metadata was reconciled, but `better-sqlite3@12.10.1` remains absent from the npm lockfile and cannot be synthesized offline. Release gates remain red until the complete source is reviewed on a draft PR, authentic lockfile metadata is generated, and full build/type/test and live two-tenant security validation pass.

### 2026-10-16 — Canonical source recovery gate

The local approved package now includes deterministic, source-only inventory/ZIP tooling and an offline GitHub tree-parity checker. CI packaging no longer deletes checkout or dependency directories. This is a recovery-integrity increment, not a user-visible diagnostic feature and not release certification. `main` still contains only the original four design files; full-source publication, authentic native dependency lockfile repair, and dependency-backed CI/live isolation remain required before merging a recovery PR.

### 2026-10-17 — Atomic recovery publication path

A complete, verified local source snapshot can now be prepared for GitHub Git Data API publication without local git clone/push. The publisher stages a candidate tree, checks all blob hashes against the source manifest, guards against a moving `main`, creates only a new `agent/*` branch, re-verifies it, and opens a draft PR. It does not change production runtime, user-facing flow or scope limits. Publication and release certification remain separate gates; draft PR creation must not be mistaken for merge readiness.

### 2026-10-18 — Bounded PDF multi-interval font decoding
Phase 3 now supports disjoint fixed-width ToUnicode codespaces with explicit source-backed glyph mappings and no inferred characters or pages. This increment does not unblock release: canonical GitHub recovery, authentic npm lock metadata, full build/type/lint/tests, production PDF integration and live tenant isolation remain required.

### 2026-10-19 — ASCII85 PDF evidence adapter increment

Phase 3 local/demo parsing now supports strict, bounded ASCII85-decoded page content and selected-font CMaps, including ASCII85/Flate chains. It does not close Phase 3 or alter the primary user journey: complete PDF/OCR integration, complete canonical GitHub source recovery, authentic npm lock metadata, dependency-backed build/type/tests, and live tenant-isolation certification remain mandatory release gates.

### 2026-10-20 — Prefix-unambiguous mixed-width PDF CMaps

The bounded local/demo PDF parser now accepts explicit one-/two-byte ToUnicode maps when the first byte proves the glyph boundary, with end-to-end page evidence tests. Phase 3 remains in progress; canonical GitHub source recovery, genuine npm lock metadata, dependency-backed CI, live tenant isolation and production-grade PDF/OCR integration remain required.

### 2026-10-21 — RunLength PDF stream coverage

Phase 3 local/demo parsing now accepts strictly bounded RunLength page and ToUnicode streams, including ordered RunLength/Flate filter chains, without weakening provenance or upload limits. This is not Phase 3 completion. Canonical GitHub restoration, authentic `better-sqlite3` lockfile metadata, dependency-backed validation, full PDF/OCR integration, and live tenant-isolation certification remain required before release.

### 2026-10-22 — LZW PDF evidence coverage

Phase 3 local/demo parsing now supports strictly bounded default-EarlyChange PDF LZW streams for page content and ToUnicode font maps. This is a parser-coverage increment, not completion of production PDF/OCR integration. Canonical GitHub recovery, authentic npm lockfile metadata, dependency-backed CI and live two-tenant security certification remain release gates.

### 2026-10-23 — PNG Predictor 15 PDF evidence increment

The local/demo PDF parser can now reverse single-filter Flate PNG Predictor 15 row filters for supported architecture page streams and directly selected-font CMaps, retaining only verified physical-page evidence. The feature is intentionally limited to direct 8-bit, one-color rows and rejects unsupported parameters and filter chains. This does not complete Phase 3: canonical GitHub recovery, genuine npm lockfile metadata, dependency-backed CI, production PDF/OCR integration, and live two-tenant isolation remain mandatory gates.

### 2026-10-24 — Bounded TIFF Predictor 2 evidence increment

Phase 3 local/demo parsing now reverses strict Flate TIFF Predictor 2 horizontal differencing for architecture page content and selected-font CMaps while preserving verified page provenance. The same assessment/upload/diagnostics/report journey and server-side MVP limits apply. This does not close Phase 3 or release gates: complete canonical GitHub synchronization, authentic npm lockfile metadata, dependency-backed build/type/tests, production PDF/OCR and live tenant isolation remain outstanding.

### 2026-10-25 — Dependency recovery increment
The native SQLite lockfile gap is resolved at the pinned metadata level using published npm integrity records. A dependency-free transitive closure and SRI-format preflight now gates CI. Offline npm dry-run succeeds, but real npm package downloads are unavailable in this build runner; clean `npm ci`, full type checking, tests, Next.js build and live two-tenant security checks remain required before release. The canonical `main` branch must be recovered through a complete, hash-verified draft PR, never an automatic merge.

### 2026-10-25 — Canonical recovery and dependency CI milestone
A complete hash-verified source snapshot is published on draft PR #56, and networked GitHub Actions passed clean `npm ci`, TypeScript, lint, all **365 tests**, and Next.js production build. This resolves the canonical publication and dependency-backed CI blockers. Production deployment and merging remain prohibited until real authenticated non-`BYPASSRLS` two-tenant PostgreSQL/private storage/malware isolation and operational controls are certified. PDF production adapter coverage remains a separate feature gap.
