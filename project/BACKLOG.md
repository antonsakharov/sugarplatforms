# Ordered Build Backlog

Statuses: `[ ] planned`, `[-] in progress`, `[x] complete`, `[!] blocked`.

## Current journey

- [x] Foundation and assessment setup
- [-] Guided upload and validation
- [-] Parsing and source-addressable evidence
- [-] Evidence-linked architecture extraction
- [-] EXT-008 Extraction review screen
- [-] EXT-009 Rename, reject, merge, confirm, and approve extraction
- [-] EXT-010 Extraction boundary validation tests
- [-] DIA-001 Deterministic diagnostic rule framework
- [-] DIA-002 Fragmented identifier rule
- [x] DIA-003 Competing authority rule
- [x] DIA-004 Duplicate matching logic rule
- [x] DIA-005 Duplicate capability rule
- [-] DIA-006 Ownership-gap rule
- [x] DIA-007 Direct database coupling rule
- [x] DIA-008 Long synchronous chain rule
- [x] DIA-009 AI-assisted candidate findings
- [-] DIA-010 Evidence coverage validation
- [-] DIA-011 Finding review workflow — local and managed persistence implemented; live tenant validation pending
- [x] DIA-012 Focused maturity summary
- [x] DIA-013 Explicit promotion of approved AI candidates into normal finding review
- [x] VIS-001 Entity/ID graph projection
- [x] VIS-002 Entity/ID graph UI and evidence drill-down
- [x] VIS-003 Creator/consumer and authority relationships when directly extracted
- [x] VIS-004 Graph filters and static export
- [x] REP-001 Prioritized recommendations
- [x] REP-002 90-day action plan
- [x] REP-003 Executive report preview
- [x] REP-004 Accepted-findings-only report generation
- [x] REP-005 Report versioning and structured JSON export — local and managed PostgreSQL/RLS immutable history implemented
- [x] REP-006 Print stylesheet and formal report styling
- [x] REP-007 Formal PDF export — authorized from persisted local or managed report snapshots
- [-] REP-008 Private generated-report object storage — tenant-scoped materialization, checksum/idempotency, signed access, and deletion lifecycle implemented; managed RLS metadata adapter activation pending

## Production-readiness work

- [-] Durable database persistence — SQLite remains the local/single-instance adapter. Managed Supabase PostgreSQL/RLS covers workspace membership, assessment create/read, processing/evidence, extraction review, finding review/accepted findings, and immutable report history. Generated-report metadata migration exists but its request-token-backed adapter, audit/deletion, and jobs still require managed activation.
- [x] Organization and workspace tenancy
- [x] Authentication and authorization foundation
- [x] Request-scoped production auth activation
- [x] PostgreSQL row-level security foundation
- [x] Managed PostgreSQL assessment/membership adapter
- [x] Managed PostgreSQL artifact metadata/source-segment/extraction-snapshot adapter with atomic RLS-authorized replacement
- [x] Managed PostgreSQL extraction-review persistence with database-side stale-extraction enforcement
- [x] Managed PostgreSQL finding-review persistence with atomic accepted-finding materialization and stale extraction-approval enforcement
- [x] Managed PostgreSQL immutable report-history persistence with atomic version allocation and current-finding-review provenance enforcement
- [x] Managed generated-report object metadata — verified end-user JWT adapter activated behind forced RLS
- [x] Private object storage foundation
- [x] Generated PDF private-object materialization and local metadata persistence
- [x] Generated-report deletion lifecycle integration
- [!] Live database/storage tenant-isolation integration tests against real authenticated non-`BYPASSRLS` identities — credentials/infrastructure unavailable in the build environment
- [x] Production Supabase private-storage adapter with bounded short-lived signed read URLs
- [x] Malware/quarantine upload gate
- [x] Audit and deletion workflow
- [x] Operational deletion job controls and runbook
- [x] Provider-neutral deletion executor — managed PostgreSQL prepare/finalize RPCs, private-object checkpoint execution, and request/reconciliation route activation implemented

## Secondary sample

- [x] Acme HealthTech fixtures, sample workspace, graph, report, and guided walkthrough

## Future

- [ ] Read-only engineering/documentation connectors
- [ ] Continuous architecture drift detection
- [ ] Enterprise identity lifecycle
- [ ] Customer-managed deployment

## Definition of done

A feature is complete only when the intended user action works, tests exist, build/type/lint pass, evidence links are preserved, documentation is current, and incomplete business logic is not represented as finished.

### 2026-09-28 managed deletion increment
- [x] Managed deletion job mutation adapter — JWT/RLS-bound due selection, lease, checkpoint, retry, and completion RPCs
- [x] Managed deletion lifecycle activation — atomic prepare/audit planning, checkpoint-gated relational purge, and provider-aware route activation implemented
- [!] Live two-tenant Supabase deletion certification — blocked on isolated authenticated infrastructure credentials

### 2026-10-01 managed deletion lifecycle activation
- [x] Added atomic managed prepare RPC with admin/JWT/RLS enforcement and complete private-object plan.
- [x] Added checkpoint-gated relational finalization and retained minimal audit receipt.
- [x] Activated managed DELETE and reconciliation paths without changing local/demo behavior.
- [!] Live two-tenant Supabase certification remains blocked on isolated authenticated infrastructure credentials.

### 2026-10-02 assessment setup completion
- [x] Displayed all MVP assessment limits before required acknowledgement.
- [x] Added a SQLite partial unique index so the one-active-assessment rule is enforced by the local data layer as well as application logic.
- [x] Added contract tests for visible scope limits and the database invariant.

### 2026-10-03 guided upload correctness
- [x] Reject duplicate artifact filenames case-insensitively before byte inspection so storage, parsing, and persistence cannot associate one filename with another file's bytes or metadata.
- [-] Guided upload remains in progress until full dependency-backed build/type/lint validation can be certified.

### 2026-10-04 parsing evidence correctness
- [x] Removed synthetic PDF page attribution from the bounded demo parser; direct-text evidence now uses honest fragment locators and explicitly reserves page-level provenance for the production PDF adapter.
- [-] Parsing/source-addressable evidence remains in progress until the production PDF adapter and full dependency-backed validation are certified.

### 2026-10-05 PDF page provenance increment
- [x] Preserve exact PDF page locators when `/Page` -> `/Contents` provenance is directly provable from uncompressed object streams.
- [x] Retain fail-safe fragment locators when page provenance cannot be proven; never synthesize page numbers.
- [-] Parsing/source-addressable evidence remains in progress until compressed/filtered PDF streams and OCR are supported and full dependency-backed validation is certified.

### 2026-10-06 PDF FlateDecode provenance increment
- [x] Decode directly referenced single-filter `/FlateDecode` page content streams using the Node runtime zlib implementation while preserving exact `/Page` -> `/Contents` provenance.
- [x] Fail closed for unsupported/multi-filter or undecodable streams rather than presenting incomplete bytes as evidence.
- [-] Parsing/source-addressable evidence remains in progress until broader production PDF encoding/OCR coverage and full dependency-backed validation are certified.

### 2026-10-07 PDF bounded filter-chain increment
- [x] Decode directly referenced `/ASCIIHexDecode` page streams, including odd-nibble padding defined by PDF semantics.
- [x] Decode ordered `/ASCIIHexDecode` -> `/FlateDecode` chains while retaining exact page provenance.
- [x] Preserve fail-closed behavior for unsupported filters and undecodable streams.
- [-] Parsing/source-addressable evidence remains in progress until production-grade font/encoding and OCR coverage plus full dependency-backed validation are certified.

### 2026-10-08 PDF text encoding and decompression safety
- [x] Tokenize PDF literal/hex text operands and `TJ` arrays, including nested parentheses, octal escapes, and explicit UTF-16BE BOM.
- [x] Preserve only proven page coordinates; reject unknown high-bit glyph encodings and malformed operands rather than inventing Unicode text.
- [x] Bound each decoded PDF content stream to 4 MiB and reject oversized Flate output.
- [-] Production PDF font/CMap/OCR coverage and dependency-backed build/type/lint certification remain incomplete.

## 2026-10-09 parsing increment
- [x] PAR-005a Resolve physical PDF pages from Catalog/Pages/Kids order (local working package; 28 parser tests pass).
- [-] PAR-005b Expand bounded font/CMap decoding and certify production-grade PDF adapter.
- [!] FND-RECOVER Restore the latest complete application baseline to canonical main through review. A recovery PR branch exists, but its published app baseline predates the latest ZIP and must be reconciled before merge.
- [!] FND-LOCK Synchronize `package-lock.json` with `better-sqlite3@12.10.1` and complete clean install/build/typecheck/full-suite gates.

## 2026-10-10 PDF bounded ToUnicode increment
- [x] PAR-005b1 Decode directly selected, single-byte `/ToUnicode` `bfchar` mappings without guessing glyphs; mapped ASCII bytes honor the CMap.
- [x] Reject unmapped bytes, unsupported `bfrange`/multibyte CMaps, malformed mapping counts, and absent font selection.
- [-] PAR-005b2 Broaden PDF font/resource/CMap coverage (inherited resources, bfrange, multibyte CIDs, filtered streams), then integrate production-grade PDF/OCR parsing.
- [!] FND-RECOVER Canonical `main` still contains the design-only baseline; recovery branch must be reconciled with the full 2026-10-10 package and reviewed before merge.
- [!] FND-LOCK Full dependency-backed build/typecheck/test and synchronized npm lockfile remain blocked in the offline runner.

### 2026-10-11 PDF ToUnicode bfrange increment
- [x] Add bounded one-byte `bfrange` scalar/array mapping with overlap, count, codespace, surrogate and overflow guards.
- [x] Preserve direct source page provenance; reject missing glyph mappings instead of guessing.
- [-] PAR-005/PAR-006 remain in progress: multibyte CMaps, inherited font resources, filtered CMaps, OCR, and complete PDF coverage remain open.
- [!] FND-SYNC Restore the full latest local package to canonical GitHub; `main` still has only the original design baseline. The new recovery branch has selected-font CMap range integration but still lacks full local filter-chain and application updates.
- [!] FND-LOCK Synchronize `package-lock.json`, install dependencies, and pass complete build/type/lint/tests and live tenant isolation before release certification.

### 2026-10-12 — PDF inherited resource resolution
- [x] PAR-005b3 Resolve nearest page/ancestor `/Pages` font resources, direct and indirect dictionaries, with strict override semantics and bounded traversal (local package).
- [x] Reject selected fonts absent from the resolved dictionary, malformed resources, missing font objects, duplicate resource keys, and cyclic inheritance.
- [-] PAR-005 remains in progress: multibyte/filtered CMaps, embedded font encoding, OCR and complete PDF layout remain outside the bounded parser.
- [!] FND-SYNC Canonical `main` remains design-only; the local approved package is newer than GitHub recovery branches. Review complete baseline restoration before merge.
- [!] FND-LOCK Dependency-backed build/typecheck/full-suite validation remains blocked by unavailable npm modules and the unsynchronized `better-sqlite3` lockfile entry.

### 2026-10-13 bounded PDF multibyte increment
- [x] PAR-005 sub-slice: decode explicit fixed-width two-byte `bfchar` and `bfrange` ToUnicode glyphs without guessing.
- [x] PAR-006 sub-slice: retain verified physical-page evidence coordinates for supported two-byte font streams.
- [x] Add malformed/odd-byte/mixed-width/unmapped CMap regressions and text-output budget.
- [-] PAR-005 remains in progress: production PDF adapter, complex/mixed codespaces, OCR, and layout reconstruction not implemented.
- [!] Canonical baseline synchronization and dependency-backed build/type/test certification remain blocked in this offline runtime.
- [!] Live two-tenant managed persistence/storage isolation certification requires test infrastructure and credentials.

### 2026-10-14 — PDF filtered CMap evidence increment
- [x] PAR-005b5 Shared byte-faithful bounded ASCIIHex/Flate decoder for directly referenced page streams and ToUnicode CMaps (local/demo package).
- [x] PAR-006b Filtered CMaps preserve verified physical-page evidence without synthetic coordinates; malformed/unsupported filters and predictors fail closed.
- [-] PAR-005 production PDF adapter remains in progress: CMap inheritance, mixed-width/complex encodings, OCR, layout and object streams remain unsupported.
- [!] FND-SYNC Canonical main remains design-only; older recovered branch lacks current parser and app changes. Publish and review full approved package before merging.
- [!] FND-LOCK `package-lock.json` is not synchronized with `better-sqlite3`; offline cache cannot supply it. Full dependency-backed build/type/tests and live tenant isolation remain blocked.

### 2026-10-15 — Canonical recovery integrity gate
- [x] FND-LOCK-GATE Implement a read-only baseline/lockfile parity preflight, regression tests, and `npm ci`-first CI validation (local approved package).
- [!] FND-SYNC Restore the entire October 15 approved working package to a reviewable GitHub draft PR; canonical `main` is still design-only and earlier recovery branches are incomplete.
- [!] FND-LOCK Repair root `engines` drift and missing `better-sqlite3@12.10.1` lockfile entry using authenticated npm metadata; then pass `npm ci`, typecheck, lint, full tests, build, and live two-tenant checks.
- [-] PAR-005/006 Bounded PDF parsing works for selected filters/CMaps but production-grade PDF/OCR and broader encodings remain incomplete.

### 2026-10-16 — Reproducible recovery source inventory

- [x] FND-SYNC-GATE Generate and verify a deterministic, source-only recovery manifest with SHA-256 and Git blob hashes; reject symlinks and exclude secrets/build artifacts.
- [x] FND-SYNC-PACKAGE Package only manifest-verified source files plus the manifest in a reproducible ZIP; remove destructive CI packaging steps.
- [x] FND-SYNC-COMPARE Compare the approved source inventory to a complete GitHub recursive tree, failing closed on missing, extra, changed, or unsafe entries.
- [!] FND-SYNC Publish the **complete** approved package to a dedicated review branch and draft PR; branch creation alone is not completion.
- [!] FND-LOCK Obtain authentic npm registry metadata for `better-sqlite3@12.10.1`, regenerate the lockfile, then pass `npm ci`, typecheck, lint, full tests and build.
- [!] SEC-LIVE Validate real two-tenant PostgreSQL/RLS, private storage, and malware scanning with production-like services before confidential use.
- [-] PAR-005/006 Continue bounded PDF evidence coverage after repository synchronization and dependency-backed validation.

### 2026-10-17 — Atomic complete-source GitHub publisher

- [x] FND-SYNC-API Implement dependency-free GitHub Git Data API recovery publisher with local manifest verification, bounded tree writes, complete blob parity, stale-main guard, agent-only branch, published-ref recheck and draft PR creation (local package).
- [x] FND-SYNC-API-TEST Add offline simulated API tests for atomicity, tree parity, branch safety, draft status and failure paths.
- [!] FND-SYNC-LIVE Publish the complete source and verify the draft PR against canonical GitHub; no usable GitHub REST token/network in this build environment, and connected write operations may be restricted.
- [!] FND-LOCK Repair missing authentic `better-sqlite3@12.10.1` lock metadata using npm registry; then run clean `npm ci`, typecheck, lint, full tests and build.
- [!] SEC-LIVE Run authenticated non-`BYPASSRLS` two-tenant PostgreSQL/storage/malware isolation certification before confidential use.
- [-] PAR-005/006 Bounded PDF evidence adapter remains incomplete for mixed-width CMaps, object streams, OCR and layout reconstruction.

### 2026-10-18 — PDF disjoint fixed-width codespace increment
- [x] PAR-005b6 Parse bounded disjoint same-width ToUnicode codespace intervals; reject overlapping, mixed-width, malformed or out-of-codespace mappings.
- [x] PAR-006 Preserve verified physical-page provenance for multi-interval selected-font PDF text; fail closed on gaps and unsupported CMap features.
- [!] FND-SYNC-LIVE Publish all approved source files and the manifest to a draft PR; canonical `main` remains design-only and GitHub recovery branches are incomplete.
- [!] FND-LOCK Rebuild authentic npm lock metadata for `better-sqlite3@12.10.1`; dependency-backed `npm ci`, build/typecheck/full-suite validation still blocked in the restricted runner.
- [!] SEC-LIVE Run real two-tenant non-`BYPASSRLS` PostgreSQL, private storage and malware scanner isolation before confidential use.
- [-] PAR-005 Production-grade PDF support remains in progress: mixed-width CMaps, CMap inheritance, object streams, OCR and layout reconstruction remain out of scope for this adapter.
- [x] FND-SYNC-PARTIAL Publish the October 18 PDF codespace module, its integrated ToUnicode decoder, standalone regression tests, and Decision 080 with verified Git blob hashes to a review branch.
- [!] FND-SYNC-PR Create a draft PR once GitHub PR writes are permitted; the published branch remains incomplete and must not be merged.

### 2026-10-19 — PDF ASCII85 stream decoding
- [x] PAR-005b7 Decode bounded `/ASCII85Decode` and `/A85` PDF page streams and selected-font ToUnicode maps, including ordered ASCII85/Flate chains.
- [x] PAR-006 Preserve proven physical-page evidence for ASCII85-decoded architecture text and reject malformed/oversized streams without invented facts.
- [x] PAR-005b7-TEST Add independent-encoder, malformed-group, overflow, output-budget, filter-order and integrated page/CMap regression tests.
- [!] FND-SYNC-LIVE Restore all approved source files and recovery manifest to a GitHub agent branch and draft PR; canonical `main` still has only four design files.
- [!] FND-LOCK Regenerate genuine npm lock metadata for `better-sqlite3@12.10.1` and pass `npm ci`, typecheck, lint, full tests and build in a networked environment.
- [!] SEC-LIVE Certify authenticated two-tenant non-`BYPASSRLS` PostgreSQL, private bucket and malware scanner isolation before confidential production use.
- [-] PAR-005 Production-grade PDF parsing still requires mixed-width/complex CMaps, object streams, OCR, and layout reconstruction.

### 2026-10-20 — Mixed-width PDF ToUnicode evidence
- [x] PAR-005b8 Decode prefix-unambiguous mixed one-/two-byte ToUnicode CMaps, explicit bfchar/bfrange mappings and literal/hex/TJ operands with fail-closed boundary checks.
- [x] PAR-006 Retain verified physical-page evidence for mixed-width PDF font maps; reject ambiguous prefixes, truncated glyphs, unmapped codes and cross-width ranges.
- [x] PAR-005b8-TEST Add codespace, Unicode mapping and end-to-end page provenance regressions.
- [!] FND-SYNC-LIVE Publish the **complete** source-only approved package to a GitHub review branch and verify full tree parity; main remains design-only.
- [!] FND-LOCK Obtain authentic `better-sqlite3@12.10.1` registry metadata, regenerate the npm lockfile, and certify `npm ci`, typecheck, full tests and build.
- [!] SEC-LIVE Certify real non-BYPASSRLS two-tenant PostgreSQL, private storage and malware scanning before confidential use.
- [-] PAR-005 Production-grade PDF parsing still needs object streams, CMap inheritance, OCR, layout reconstruction, and broader encodings.

### 2026-10-21 — Bounded PDF RunLengthDecode evidence
- [x] PAR-005b9 Decode strict `/RunLengthDecode` and `/RL` streams, including ordered RunLength/Flate chains, under the existing encoded/decoded byte limits.
- [x] PAR-006 Preserve verified physical-page provenance for RunLength-decoded page content and selected-font CMaps; reject truncated runs, missing EOD, overflow and malformed data.
- [x] PAR-005b9-TEST Add eight regression tests covering binary data, repeat/literal boundaries, fail-closed inputs, filter order, page evidence and font maps.
- [!] FND-SYNC-LIVE Publish the complete approved application to a reviewable GitHub agent branch, verify byte-level parity and open a draft PR; canonical `main` remains design-only.
- [!] FND-LOCK Obtain authentic `better-sqlite3@12.10.1` npm registry metadata and run clean `npm ci`, typecheck, full tests and build.
- [!] SEC-LIVE Certify real non-BYPASSRLS two-tenant PostgreSQL, private storage and malware scanning before confidential production use.
- [-] PAR-005 Production-grade PDF support still requires object streams, CMap inheritance, OCR, layout reconstruction and broader encodings.

### 2026-10-22 — PDF LZW evidence increment
- [x] PAR-005b10 Implement bounded `/LZWDecode` (`/LZW`) default-EarlyChange decoding for direct page and ToUnicode streams, including ordered LZW/Flate filter chains.
- [x] PAR-006b10 Preserve verified page evidence for supported LZW text/CMaps and fail closed on invalid codes, nonzero padding, malformed streams, unsupported parameters and output-budget violations.
- [-] PAR-005/006 remain in progress: full PDF object-stream/font/layout/OCR support and production adapter certification are outstanding.
- [!] FND-SYNC Canonical `main` is still missing the approved application baseline; publish the entire verified ZIP to a draft PR and prove recursive-tree hash parity before merging.
- [!] FND-LOCK The lockfile still lacks authentic `better-sqlite3@12.10.1` dependency metadata; offline registry access prevents `npm ci`, full typecheck and Next.js build certification.
- [!] SEC-LIVE Live authenticated non-`BYPASSRLS` two-tenant PostgreSQL/storage/malware isolation testing remains unavailable.

### 2026-10-23 — Bounded Flate PNG Predictor 15 evidence
- [x] PAR-005b11 Decode direct single-filter `/FlateDecode` PNG Predictor 15 page-content and selected-font CMap streams with bounded row reversal for tags 0–4.
- [x] PAR-006b11 Preserve verified physical-page provenance and fail closed on malformed rows, unsupported parameters/chains, unknown filter tags and output-budget violations.
- [x] PAR-005b11-TEST Add six dependency-free regression tests covering PNG filters, security guards, page evidence and CMap evidence.
- [-] PAR-005/006 remain in progress: full PDF object streams, font/layout/OCR support, broader predictor parameters and production PDF adapter certification are outstanding.
- [!] FND-SYNC Canonical `main` still has only four baseline source files; publish the complete manifest-verified package to an agent branch and draft PR, then prove recursive-tree parity before merge.
- [!] FND-LOCK Obtain authentic `better-sqlite3@12.10.1` registry metadata, regenerate the npm lockfile, and certify `npm ci`, typecheck, full tests and build.
- [!] SEC-LIVE Run authenticated non-`BYPASSRLS` two-tenant PostgreSQL, private-storage and malware-scanner isolation tests before confidential production use.

### 2026-10-24 — TIFF Predictor 2 PDF evidence

- [x] PAR-005b12 Add strict bounded TIFF Predictor 2 horizontal differencing for single-filter Flate page and selected-font CMap streams.
- [x] PAR-006b12 Preserve verified physical-page evidence and fail closed on partial rows, invalid parameters, unsupported chains and oversized data.
- [x] PAR-005b12-TEST Add independent-encoder regression tests for reconstruction, row reset, page/CMap provenance, and negative cases.
- [-] PAR-005/006 Remain in progress: full PDF object streams, complex font/layout/OCR support and production PDF certification are outstanding.
- [!] FND-SYNC Publish the complete manifest-verified approved source tree to a GitHub draft PR and prove recursive-tree parity. PR #54 is partial and must not be merged.
- [!] FND-LOCK Regenerate authentic `better-sqlite3@12.10.1` npm lock metadata and pass clean `npm ci`, typecheck, full tests and build.
- [!] SEC-LIVE Certify real authenticated non-BYPASSRLS two-tenant PostgreSQL, private storage and malware scanning before confidential use.

- [x] FND-SYNC-PARTIAL-20261024 Publish and Git-blob-verify the TIFF helper, integration module, six tests and Decision 086 to `agent/pdf-tiff-predictor-2026-10-24`; draft PR #55 opened.
- [!] FND-SYNC-FULL-20261024 Draft PR #55 has only 295/366 approved source files and missing dependencies; **DO NOT MERGE** until complete recursive-tree parity and release gates pass.

### 2026-10-25 — Canonical recovery and dependency integrity
- [x] FND-LOCK-METADATA Restore authentic published `better-sqlite3@12.10.1` tarball SRI and 36 missing transitive lock records, with compatible pinned root dependencies retained.
- [x] FND-LOCK-GATE Extend dependency-free baseline preflight to verify registry URL allowlist, SHA-512 integrity syntax, pinned versions, and required transitive closure; add regression tests.
- [x] FND-LOCK-DRYRUN Verify npm lock consistency using `npm ci --offline --ignore-scripts --dry-run` (does not fetch packages).
- [!] FND-LOCK-INSTALL Run a real clean `npm ci` with registry access, then full typecheck, build and all tests in CI; offline runner has no cached tarballs.
- [x] FND-SYNC-20261025 Publish and verify the complete 368-file source snapshot + manifest on `agent/canonical-recovery-lockfile-2026-10-25`, draft PR #56. Full Git blob parity confirmed; **DO NOT MERGE** until CI and security release gates pass.
- [!] SEC-LIVE Authenticated non-`BYPASSRLS` two-tenant PostgreSQL, private storage, and scanner isolation remain release blockers.
- [-] PAR-005 Full production-grade PDF parsing remains incomplete; bounded local/demo evidence decoding is not OCR or object-stream/layout coverage.

### 2026-10-25 — Networked CI follow-up
- [x] FND-CI-TYPES Resolve six `Buffer` generic assignment errors in the PDF stream filter chain; networked TypeScript validation passed after the fix.
- [x] FND-CI-ALIAS Add a test-only ESM loader for `@/lib/*` imports and traversal/passthrough regression tests, without changing the production Next.js runtime.
- [!] FND-CI-RECHECK Await fresh GitHub Actions `npm ci && npm run validate` results for the complete recovery PR; keep PR #56 draft and unmerged.
