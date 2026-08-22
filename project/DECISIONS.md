# Architecture Decision Log

## ADR-001 — Modular monolith
**Status:** Accepted
Use a modular monolith for the initial product.

## ADR-002 — Evidence graph is the product core
**Status:** Accepted
Keep traceable links from source artifacts to extracted objects, findings, and recommendations.

## ADR-003 — Limited upload diagnostic is the MVP
**Status:** Accepted
Build a real limited assessment from uploaded architecture metadata; keep the fictional sample secondary.

## ADR-004 — Acme sample is secondary
**Status:** Accepted
Use the same product surfaces for sample and real assessments.

## ADR-005 — Explicit MVP limits
**Status:** Accepted
One focused assessment, one primary entity, up to 10 files, 25 MB per file, and 150 pages where measurable.

## ADR-006 — Architecture metadata scope
**Status:** Accepted
The MVP analyzes architecture documentation and metadata rather than live production systems.

## ADR-007 — Upload before connectors
**Status:** Accepted
Read-only external connectors are future work.

## ADR-008 — Human review before publication
**Status:** Accepted
Extraction and findings remain reviewable; user decisions govern downstream outputs.

## ADR-009 — Deterministic rules before AI interpretation
**Status:** Accepted
Use repeatable rules first and AI-assisted interpretation second.

## ADR-010 — Demo/local adapters permitted
**Status:** Accepted
Use working local adapters when production services are not configured, without changing domain boundaries.

## ADR-011 — Metadata-only first upload increment
**Status:** Superseded by ADR-012
The earliest upload slice validated metadata before content inspection was introduced.

## ADR-012 — Transient demo inspection
**Status:** Accepted
Demo uploads may be inspected in bounded request memory for validation and deterministic parsing; raw bytes are not persisted by the demo adapter.

## ADR-013 — Conservative upload readiness
**Status:** Accepted
Blocking violations stop processing; uncertain conditions remain visibly reviewable rather than silently bypassed.

## ADR-014 — Source-addressable evidence segments
**Status:** Accepted
Every parser emits stable source locators and hashes; unsupported formats fail visibly rather than fabricating evidence.

## ADR-015 — PDF demo parser fails closed
**Status:** Accepted
Only directly addressable PDF text is accepted by the demo parser; unsupported PDF structures remain visible failures.

## ADR-016 — Evidence-first extraction
**Status:** Accepted
Every extracted architecture object requires direct source evidence. Exact normalized duplicates may reconcile only while retaining all source references. Ambiguous records are not silently merged.

## ADR-017 — Extraction approval gates diagnostics
**Status:** Accepted
Every extracted candidate must be explicitly confirmed, rejected, or merged before approval. Renaming preserves identity and evidence, merges are restricted to the same object kind, and any review change clears prior approval. Production persistence and authorization remain separate readiness work.

## ADR-018 — Approved extraction is the deterministic diagnostic boundary
**Status:** Accepted
Deterministic rules consume only confirmed objects from an explicitly approved extraction review. Rejected and merged-away candidates are excluded. Every finding is a versioned derived signal with direct source evidence, impact, recommendation, validation questions, and pending human review status. Absence-based rules must state their epistemic limitation rather than claiming undocumented facts are definitively absent.

## ADR-019 — Finding review cannot rewrite evidence provenance
**Status:** Accepted
Before finding review begins, diagnostic evidence and affected-object references must validate against the exact approved extraction version. Reviewers may edit title, severity, description, impact, recommendation, and notes, but may not mutate rule identity, confidence, affected objects, source evidence, or provenance. Editing returns a finding to pending status, every finding requires an explicit accept/reject decision, and only accepted findings from a completed non-stale review may feed maturity, visualization, recommendations, or reports.

## ADR-020 — Visualization is a projection, not a new inference engine
**Status:** Accepted
The entity/ID map consumes confirmed extraction objects and accepted findings from a completed, non-stale finding review. Direct relationships must retain source evidence; scope-derived relationships must be labeled derived. The map must not invent creator/consumer, authority, or identifier-mapping semantics when those relationships are absent from extraction evidence.

## ADR-021 — Maturity and recommendations are reviewed-finding projections
**Status:** Accepted
Focused maturity and prioritized recommendations consume only accepted findings from a completed, non-stale finding review. The maturity result is a transparent 1–5 risk-adjusted signal, not an enterprise maturity certification. When no findings are accepted, the product returns not-scored rather than inferring perfect maturity. Recommendation ordering is deterministic and every recommendation retains finding, affected-object, and evidence traceability.

## ADR-022 — Reports are deterministic projections of reviewed outputs
**Status:** Accepted
The 90-day plan and executive report preview consume only a completed, non-stale finding review plus downstream maturity/recommendation projections from the same diagnostic version. Rejected or pending findings cannot enter report conclusions. The action plan sequences accepted recommendations deterministically by existing priority and must state that effort, budget, staffing, and dependency duration require human validation. Report artifact inventory is metadata-only; raw uploaded content is not reproduced. Browser print preview is allowed in demo mode, while durable versioning and formal PDF export remain separate production work.

## ADR-023 — Local report versions are explicit immutable snapshots
**Status:** Accepted
Demo-mode report versioning occurs only when the user explicitly saves a snapshot. Snapshots receive monotonically increasing v1/v2/... identifiers, retain the diagnostic timestamp that produced the report, and are validated as single-assessment history before use. Structured JSON export wraps one immutable snapshot and may contain report output plus artifact metadata only; it must not add raw uploaded artifact content. Browser-local history is a working demo adapter, not durable tenant-scoped persistence or a formal signed report archive.

## ADR-024 — Competing authority requires direct claims
**Status:** Accepted
A competing-authority finding may be generated only when two or more confirmed system objects contain directly extracted authority claims for the same normalized entity. The local extractor may preserve explicit `system of record`, `source of truth`, and `authoritative system` statements as `authorityFor` system attributes while retaining source evidence. The diagnostic engine must not infer authority from topology, naming, ownership, integration direction, or identifier presence.

## ADR-025 — Duplicate matching logic requires explicit matching responsibility
**Status:** Accepted
A duplicate-matching-logic finding may be generated only when two or more confirmed system objects contain directly extracted matching or entity-resolution responsibility for the same normalized entity. The local extractor may preserve explicit statements such as `<system> matches <entity> using <method>` or `matching logic for <entity> in <system>: <method>` as `matchingFor`, `matchingClaim=explicit`, and optional `matchingMethod` attributes. The diagnostic engine must not infer matching responsibility from system names, identifier presence, API paths, integration topology, or generic capability labels.

## ADR-026 — Duplicate capability requires explicit system responsibility
**Status:** Accepted
A duplicate-platform-capability finding may be generated only when two or more confirmed system objects contain directly extracted responsibility for the same normalized capability. The local extractor may preserve explicit statements such as `<system> provides capability <capability>` or `capability <capability> is provided by <system>` as `capabilityClaim=explicit` plus a `capability:<normalized name>` attribute on the system while retaining source evidence. Generic capability objects, name similarity, APIs, and topology are insufficient to infer duplication.
