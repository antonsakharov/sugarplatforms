# Feature Inventory

## MVP priority 1 — Assessment setup

User can create a workspace, name an assessment, choose one focus area, specify one primary entity, describe the business concern, and accept assessment limits.

Status: implemented — assessment creation is server-persisted through a repository boundary using the credential-free SQLite local/single-instance adapter. The setup UI visibly presents and requires acknowledgement of the one-assessment, one-primary-entity, 10-file, 25-MB-per-file, 150-page, architecture-metadata-only MVP boundary; SQLite and managed PostgreSQL both enforce the one-active-assessment invariant at the data layer. Explicit organization and workspace identities are persisted and every assessment repository operation is scoped by both IDs; browser localStorage remains only a compatibility cache. Authentication and PostgreSQL/RLS foundations exist, and report history is durable in the local/single-instance path.

## MVP priority 2 — Guided upload

User can select up to 10 supported files, receive server-side type/size/duplicate/page validation, receive probable-secret and prohibited-data warnings, remove or replace files, and see whether the artifact set is ready for parsing.

Status: in progress — the complete upload-readiness workflow is implemented. Duplicate filenames are rejected case-insensitively before byte inspection to keep artifact bytes, parser output, and persisted metadata unambiguous. Artifact bytes are persisted only after readiness checks pass, using server-derived random tenant-scoped storage keys. The storage boundary supports both a private local filesystem adapter and a production-oriented Supabase private-bucket adapter. A pre-persistence malware quarantine gate now scans every file before storage or parsing; infected or indeterminate sets fail closed. Live production bucket isolation, scanner operations, production identity, and retention/backup validation remain open.

## MVP priority 3 — Artifact parsing and evidence

User can see processing status, inspect parsed content and source coordinates, see extracted-object provenance, and inspect parsing failures.

Status: in progress — text/Markdown, JSON/YAML/OpenAPI, CSV, SQL DDL, and bounded PDF parsing produce source-addressable segments with stable locators and hashes. The bounded PDF adapter now assigns physical page numbers only after verifying a unique `/Catalog -> /Pages -> /Kids -> /Page` traversal, parent links, count consistency, and directly addressable `/Contents` references. Ambiguous trees fail closed; PDFs without a provable catalog emit only fragment locators. The local/demo PDF adapter supports bounded Flate/ASCIIHex/ASCII85 filter chains, selected-font one- and two-byte ToUnicode maps (including prefix-unambiguous mixed-width intervals), character ranges, inherited page font resources, and filtered CMaps. Unknown glyphs and unproven page references fail closed. Prefix-ambiguous/complex encodings, non-Flate and revisioned object streams, OCR, and layout reconstruction remain reserved for a production-grade PDF integration. A bounded PDF 1.5 `/ObjStm` adapter now expands strictly indexed Flate-compressed generation-zero dictionary objects before verified page-tree traversal; malformed or unproven object streams fail closed (Decision 090). Validated artifact metadata, normalized source segments, parser warnings, and the current extraction snapshot are transactionally persisted under organization/workspace/assessment scope and can be resumed through an authenticated no-store API. Managed PostgreSQL/RLS persistence covers this processing boundary at the code/migration level; live two-tenant validation remains open.

## MVP priority 4 — Extraction review

User can review extracted systems, entities, identifiers, integrations, capabilities, and owners; rename/reject/merge/confirm objects; inspect evidence; and approve extraction for analysis.

Status: implemented for the real local/single-instance workflow and the managed PostgreSQL/RLS code/migration boundary. Evidence-linked candidate inventory, explicit rename/reject/merge/confirm actions, same-kind merge guardrails, evidence drill-down, and approval gating are available. Managed saves use the verified end-user JWT, forced RLS, editor/admin authorization, and a SECURITY INVOKER RPC that rejects stale extraction state. Live two-tenant Supabase validation remains open.

## MVP priority 5 — Entity and ID map

User can see the focused primary entity, confirmed entity/identifier/system nodes, direct system integration relationships, directly stated creator/consumer/authority relationships, accepted-finding overlays, evidence drill-down, graph filters, and static export.

Status: implemented for the current workflow with server-reviewed downstream state — the graph projection hydrates authenticated reviewed state and fails closed on stale/incomplete review state. Filters and SVG/JSON exports never create new facts or add raw artifact content.

## MVP priority 6 — Diagnostic findings

User can run analysis; inspect impact and evidence; inspect isolated AI-assisted candidate findings; and accept, edit, or reject final findings.

Status: implemented for local/single-instance and managed PostgreSQL/RLS persistence. Deterministic rules cover fragmented identifiers, competing authority, duplicate matching logic, duplicate platform capabilities, ownership gaps, direct database coupling, and long synchronous chains. Finding review is authenticated, tenant-scoped, bound to canonical diagnostics, and materializes accepted findings only after explicit completion. Managed writes use the verified end-user JWT and atomically bind review state to the approved extraction boundary. Live two-tenant validation remains open.

## MVP priority 7 — Maturity and recommendations

User can see a focused maturity summary, scoring rationale, prioritized recommendations, and finding traceability.

Status: implemented with server-authoritative accepted findings. Only materialized accepted findings contribute to maturity and recommendations; zero accepted findings produce a not-scored result rather than a perfect score. Recommendation priority is deterministic and preserves finding/object/evidence traceability.

## MVP priority 8 — Executive report

User can generate a report from accepted findings, preview executive and technical sections, save explicit report versions, export a structured report snapshot, produce a formally styled print view, and download a product-managed PDF from a saved immutable version.

Status: implemented with authenticated immutable report history for both the local/single-instance and managed PostgreSQL/RLS paths. Managed report generation reads the selected persistence provider end to end, report saves require the current completed finding-review provenance, version allocation is atomic in PostgreSQL, and PDF export re-authorizes and resolves the persisted snapshot through the selected provider. Generated-report private object storage and live two-tenant Supabase validation remain open.

## Secondary demo feature — Acme HealthTech

User can open a preloaded assessment and navigate the same output surfaces used by real assessments.

Status: implemented for the local/single-instance demo workflow — `/sample` initializes a deterministic Acme HealthTech Patient-identity assessment using four architecture-metadata-only fixtures, then uses the real extraction review, deterministic diagnostics, completed finding review, accepted findings, map, maturity, recommendations, and immutable report surfaces.

## Production-readiness feature — Managed private artifact storage

Use the same tenant-safe artifact-storage boundary with either local private filesystem storage or a managed Supabase private bucket.

Status: implemented at the code/provider-contract level. `ARTIFACT_STORAGE_PROVIDER=supabase` requires server-only project URL/secret configuration, preserves random tenant-scoped keys, validates SHA-256 before upload, uses authenticated private reads, deletes through the Storage API, and issues signed read URLs with a 60–3600 second TTL. Live private-bucket/RLS isolation testing is still required before confidential production use.

## Production-readiness feature — Malware scanning and quarantine

Treat uploaded bytes as quarantined until the configured scanner reports every artifact clean. Infected or indeterminate scans must not reach object storage, parsing, extraction, or evidence persistence.

Status: implemented at the local/demo and production integration-boundary level. The credential-free local scanner exercises EICAR and executable-signature rejection; the production boundary supports ClamAV INSTREAM with bounded timeout and fail-closed behavior. Live scanner infrastructure, signature-update monitoring, throughput validation, and production object-storage integration testing remain open.

## Production-readiness feature — Audit and deletion

Delete an assessment only through a server-authorized administrator action. The workflow deletes private artifact objects, transactionally removes processing/extraction/review/finding/report state plus the assessment row, and retains minimal tenant-scoped audit receipts.

Status: implemented for the credential-free local/single-instance workflow with durable reconciliation controls. Managed PostgreSQL/RLS audit/job reads and the provider-neutral deletion state contract are implemented. Managed PostgreSQL/RLS mutation and executor activation are implemented, including atomic prepare/audit planning, private-object checkpoints, relational finalization, and request/reconciliation route selection. Scheduler/worker activation, backup/retention deletion guarantees, and live production-storage validation remain open.

## Future features

GitHub/Jira/Confluence/service-catalog connectors, continuous drift detection, assessment comparison, collaboration, enterprise SSO, and customer-managed deployment.

### 2026-10-06 PDF compressed-stream evidence
The bounded PDF parser now supports directly referenced single-filter `/FlateDecode` content streams and retains exact page locators when the `/Page` to `/Contents` relationship is provable. Unsupported filter chains, undecodable streams, complex font encodings, OCR, and layout reconstruction remain outside the bounded adapter and fail closed or require the production PDF adapter rather than fabricating evidence precision.

### 2026-10-07 PDF bounded filter-chain evidence
The bounded PDF parser now supports `/ASCIIHexDecode` (including the `AHx` abbreviation and odd final-nibble padding) and ordered `/ASCIIHexDecode` -> `/FlateDecode` filter chains for directly referenced page streams. Page provenance is retained only when the `/Page` -> `/Contents` relationship is provable. Unsupported filters still fail closed rather than being treated as evidence.

### 2026-10-08 — Bounded PDF text-string decoding

The local/demo PDF adapter now tokenizes literal and hex text operands (including `TJ` arrays), handles PDF octal escapes and explicit UTF-16BE BOM text, and preserves proven `/Page` to `/Contents` evidence coordinates. Unknown high-bit glyph bytes, malformed hex operands, and streams exceeding the 4 MiB decoded-stream cap fail closed. This is a bounded metadata-evidence adapter, **not** full PDF font/CMap, OCR, layout, or tagged-PDF support; parsing remains in progress until those production requirements and full validation are certified.

### 2026-10-09 PDF page-tree provenance hardening
The parser no longer equates PDF object declaration order with physical page order. Nested/reordered page trees are traversed in `/Kids` order, with parent/count/duplicate/cycle/missing-reference checks and a 150-page cap. Incremental object revisions and invalid page graphs fail closed; catalog-less demo fragments never claim page numbers. See `project/DECISION_071.md` and `project/VALIDATED_2026-10-09.md`.

### 2026-10-10 — Bounded PDF ToUnicode font mapping

The local/demo PDF adapter can now decode explicit single-byte `bfchar` mappings from a directly referenced, unfiltered `/ToUnicode` CMap when the page declares the font and a `Tf` operator selects it. A mapped ASCII byte uses its actual CMap value, not a guessed identity encoding. Unmapped glyphs, unsupported `bfrange`/multibyte or inherited mappings, malformed counts, and absent font selection fail closed. The page-tree provenance requirement remains unchanged. This **does not** certify production PDF font coverage or OCR. See ADR-072 and `project/VALIDATED_2026-10-10.md`.

### 2026-10-11 — Bounded ToUnicode character ranges

The local/demo PDF adapter now supports explicitly declared single-byte `bfrange` entries, both consecutive BMP scalar values and explicit UTF-16BE arrays, alongside `bfchar`. It preserves verified page-tree locators and rejects partial/overlapping/invalid mappings rather than inventing evidence. Six additional integrated parser regressions and eight standalone CMap tests cover valid and invalid ranges. The parsing epic remains **in progress**: inherited resources, multibyte CMaps, filtered font maps, OCR, and full production PDF support are not certified. The complete working package remains ahead of canonical `main`; dependency-backed build/type/full tests and live tenant isolation are not certified.

### 2026-10-12 — Inherited PDF page-font resources
The bounded PDF parser resolves directly or indirectly declared `/Resources` and `/Font` dictionaries from the nearest page or ancestor `/Pages` node, using a previously validated page tree. Nearest explicit resources override ancestors; malformed overrides, unknown selected fonts and incomplete ToUnicode mappings fail closed rather than generating guessed evidence. The adapter remains limited to unfiltered single-byte ToUnicode maps, with no OCR, multibyte CMaps or full layout support. This increment is locally tested; production certification and full GitHub synchronization remain open.

### 2026-10-13 — Bounded two-byte ToUnicode decoding
The local/demo PDF adapter now accepts a directly referenced, unfiltered ToUnicode CMap with exactly one fixed-width one- or two-byte codespace. Two-byte `bfchar` and `bfrange` glyph codes are read in big-endian order from literal, hex, and `TJ` text operands. Missing glyphs, odd byte counts, mixed-width codespaces, overlapping mappings, and unsupported inheritance fail closed. Mapping/output budgets bound memory growth. Verified page-tree provenance remains mandatory for `pdf-page` locators. Parsing is still **in progress**, not production PDF/OCR support. Canonical `main` remains behind the approved package, and full npm/dependency-backed validation and live tenant-isolation remain release blockers.

### 2026-10-14 — Filtered ToUnicode streams and byte-faithful PDF decoding
The local/demo parser now shares a bounded filter decoder across page content and directly referenced font CMaps. It accepts unfiltered, ASCIIHex, Flate, and supported ordered filter chains, while preserving exact binary bytes and verified physical-page provenance. Malformed/unknown filters, predictors, decompression bombs, incomplete glyph mappings, and ambiguous page references fail closed. The parsing epic remains **in progress**: complex CMaps, OCR, layout, and dependency-backed production certification are not complete. The canonical GitHub recovery branch still trails the complete local package.

### 2026-10-15 — Canonical recovery preflight
A dependency-free, read-only baseline checker verifies required design/product/security/decision documents and exact direct-dependency lockfile parity before a recovery PR can be release-certified. CI now uses `npm ci` rather than `npm install`, and the manual recovery publisher reports incomplete baseline state without preventing a draft PR. The latest approved local backup intentionally reports one remaining lockfile blocker (missing `better-sqlite3` root dependency); Node engine metadata was reconciled; this is an implemented delivery-integrity gate, **not** a completed application release or PDF parser feature.

### 2026-10-16 — Canonical recovery snapshot and branch-parity gate

Status: implemented and locally tested for recovery packaging, not production-certified. A dependency-free source inventory records SHA-256 and Git blob IDs for each approved source file, refuses symlinks/unexpected file types and excludes local secrets/build state. The deterministic ZIP builder verifies this inventory before packaging and rehashes every included file. A GitHub recursive-tree comparison fails closed on missing/extra/mismatched paths or a truncated response; this is the required check before calling a recovery branch synchronized. No changes to the user-facing diagnostic journey or MVP upload limits. Canonical source publication, npm lockfile repair, full dependency-backed validation and live tenant isolation remain blocked.

### 2026-10-17 — Atomic GitHub recovery publication tooling

Status: **implemented and locally testable, not remotely published or release-certified**. `scripts/publish-recovery-api.py` can publish all verified source files and the recovery manifest in one Git commit via bounded Git Data API tree batches, only to a new `agent/*` branch, then verify the complete remote tree and open a draft PR. It defaults to a no-write dry run. This is a delivery-integrity slice, not a new diagnostic UI feature. The existing local assessment → upload → extraction review → evidence-backed findings → map → executive report path is unchanged; its MVP limits remain enforced by the application. Authentic npm lockfile repair, full dependency-backed validation, complete GitHub publication and live tenant isolation remain outstanding.

### 2026-10-18 — Disjoint fixed-width ToUnicode codespaces
The local PDF parser now accepts up to 16 disjoint same-width one- or two-byte codespace ranges, enabling selected-font text extraction across separated character-code intervals. Out-of-codespace glyphs, mapping ranges crossing a codespace gap, overlaps, malformed counts and mixed-width encodings are rejected rather than guessed. Proven physical-page locators remain unchanged. This is a bounded parser increment, not full PDF or release certification; see Decision 080.

### 2026-10-19 — Bounded ASCII85 PDF evidence streams

Status: **implemented and locally regression-tested; production PDF and release certification incomplete**. The shared PDF stream adapter now decodes `/ASCII85Decode` (`/A85`) page content and directly referenced ToUnicode CMaps, including correctly ordered ASCII85-to-Flate filter chains. It rejects invalid groups, unterminated streams, unsupported parameters, and over-budget data rather than fabricating evidence. Physical-page locators still require a verified page tree. The broader user flow, one-assessment/one-entity/10-file/25-MB/150-page limits, and architecture-metadata-only boundary are unchanged. See Decision 081.

### 2026-10-21 — RunLength PDF page and CMap evidence

Status: **implemented and locally regression-tested; release certification incomplete**. The bounded local/demo PDF adapter now decodes `/RunLengthDecode` (`/RL`) streams and correctly ordered RunLength/Flate chains for page content and directly referenced ToUnicode maps. The decoder requires an EOD marker, rejects truncated runs and trailing garbage, and enforces the existing 4 MiB page/64 KiB CMap budgets before expansion. Verified physical-page evidence is preserved; no synthetic pages or unknown glyphs are emitted. This does not change the one-assessment/one-entity/10-file/25-MB/150-page limits or permit customer data, secrets, or live production access. See Decision 083. Full PDF/OCR, canonical GitHub parity, authentic npm lockfile metadata, full build/typecheck and live two-tenant security certification remain open.

### 2026-10-22 — Bounded PDF LZW page and font-map streams

Status: **implemented and locally regression-tested; production parsing and release certification incomplete**. The local/demo parser accepts strict `/LZWDecode` (`/LZW`) default-EarlyChange page-content and selected-font ToUnicode streams, including bounded LZW-to-Flate chains. It validates clear/EOD, 9–12-bit dictionary transitions, zero padding and decompression budgets, and preserves only proven page evidence. Explicit `/DecodeParms` (including `EarlyChange 0`), predictors, OCR, object streams and general PDF layout remain unsupported and fail closed. The upload/privacy/tenancy MVP limits are unchanged. See Decision 084.

### 2026-10-23 — Bounded Flate PNG Predictor 15 PDF streams

Status: implemented and locally regression-tested, **not release-certified**. The shared local/demo PDF adapter reverses PNG Predictor 15 for direct Flate page-content and selected-font CMap streams, including None/Sub/Up/Average/Paeth row filters. It rejects unsupported predictor configurations, invalid row boundaries and excessive decompression while preserving only proven physical-page evidence. Production-grade PDF/OCR, complete canonical GitHub synchronization, authentic npm lockfile metadata, dependency-backed validation and live tenant isolation remain open.

### 2026-10-24 — TIFF Predictor 2 local/demo PDF coverage

Status: **implemented and locally tested; not release-certified**. Direct single-filter Flate streams with Predictor 2, 8-bit single-channel rows and bounded columns are decoded for architecture page content and selected-font CMaps. Incomplete rows, invalid parameters, over-budget streams, unsupported chains and unproven page references fail closed. Full PDF/OCR, canonical source synchronization, npm dependency certification and live two-tenant isolation remain open. See Decision 086.

### 2026-10-25 — Reproducible dependency recovery
The `better-sqlite3@12.10.1` dependency and its required transitive package metadata are now present in the npm v3 lockfile, with published SHA-512 integrity values sourced from a versioned public npm lockfile. The baseline gate verifies registry URL allowlisting, integrity syntax and required dependency closure. `npm ci --offline --ignore-scripts --dry-run` confirms npm lock consistency without downloading packages. This **does not** certify actual installation, native-module compatibility, full build/tests, GitHub parity or production tenant isolation. No assessment or upload limits were changed.

### 2026-10-25 — Complete GitHub recovery candidate
The full 368-file approved source snapshot plus manifest was published to the dedicated agent branch and draft PR #56 with exact recursive Git blob parity. This closes the source-publication gap **on the review branch**, not on canonical `main`. The PR must remain a draft until dependency-backed CI, actual native SQLite installation, full application validation, and live two-tenant security certification pass. No merge or deployment occurred.

### 2026-10-25 — CI test harness correction
GitHub Actions now reaches dependency-backed validation after a successful `npm ci`; a test-only Node ESM alias loader resolves `@/lib/*` without affecting production bundling or security. Full suite and build certification remain subject to a fresh CI run, and the draft recovery PR must not merge before all gates pass.

### 2026-10-25 — Networked CI green
GitHub Actions on the complete canonical recovery draft PR passed real `npm ci`, TypeScript, lint, **366/366 tests**, and Next.js build. Source parity is verified on the review branch. This is **not production security certification**: live authenticated tenant isolation, managed storage and malware scanning integration remain open, and the bounded local PDF parser does not cover arbitrary PDFs. PR #56 remains draft; no merge/deploy.

### 2026-10-27 — PAR-005b14: PDF xref stream validation
Status: **implemented for bounded local/demo parsing; production PDF parsing remains in progress**. A complete, single Flate PDF 1.5 xref stream is checked against direct object offsets and compressed `/ObjStm` indexes before physical-page evidence is accepted. Invalid or revisioned xrefs fail closed. The existing assessment → upload → extraction review → diagnostics → evidence → map → report journey and MVP limits are unchanged. See Decision 091.

### 2026-10-28 — PAR-005b15: bounded classic PDF xref table validation

Status: **implemented and regression-tested in the local/demo adapter; production PDF certification remains in progress**. Single complete classic `xref` tables with exact `startxref` physical offsets, fixed-width records, contiguous full coverage, and a direct Root Catalog are now validated before extracting physical-page evidence. Invalid offsets, orphaned objects, nonzero live generations, hybrid/incremental revisions, and unsupported trailer fields fail closed. Existing xref-stream support and xref-free legacy demo fixtures remain functional. No MVP scope, upload/privacy, tenancy, or evidence-policy expansion. See Decision 092.
