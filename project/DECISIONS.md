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

## ADR-027 — Direct database coupling requires an explicit database-target integration edge
**Status:** Accepted
A direct-database-coupling finding may be generated only from a confirmed integration object with direct source evidence whose target is explicitly named as a database/DB or recognized database engine. The current local/demo rule treats an explicit architecture edge such as `Order Service -> Customer DB` as a reviewable coupling signal. SQL DDL presence, entity/table extraction, service-to-service edges, naming similarity, or inferred physical connectivity are insufficient. The finding remains derived and asks the reviewer to validate whether database credentials/drivers are actually used before remediation is accepted.

## ADR-028 — Long synchronous chains require explicit synchronous edges
**Status:** Accepted
A long-synchronous-chain finding may be generated only from confirmed integration objects whose source evidence explicitly identifies synchronous behavior. The local extractor may retain phrases such as `<system> synchronously calls <system>`, `<system> calls <system> synchronously`, `<system> makes a synchronous call to <system>`, or an explicitly annotated `[sync]` architecture edge as `interactionMode=synchronous` and `syncClaim=explicit`. A finding requires at least three consecutive explicit synchronous hops. Ordinary arrows, OpenAPI paths, service naming, asynchronous/event relationships, inferred topology, and rejected extraction objects cannot establish synchronous behavior. The finding is a derived latency/availability-coupling signal and must ask reviewers to validate the runtime critical path before remediation.

## ADR-029 — AI findings remain isolated candidates until explicitly promoted
**Status:** Accepted
AI-assisted interpretation runs only after deterministic diagnostics and consumes only confirmed objects from the approved extraction boundary. Provider output must use strict structured data, cite only approved object IDs and direct evidence segment IDs, remain derived, use bounded confidence, and be rejected when provenance falls outside the approved boundary. Uploaded names and attributes are treated as untrusted data and cannot issue instructions or trigger tools. The demo uses a deterministic local provider to exercise the contract without external credentials. The OpenAI Responses adapter disables provider-side storage and requires a server-only key; it is not activated in the browser/demo path. AI candidates remain isolated from accepted findings, maturity, recommendations, maps, and reports until a separate explicit promotion step routes them through normal human finding review.

## ADR-030 — AI candidate promotion is version-bound and re-enters normal finding review
**Status:** Accepted
An AI-assisted candidate may enter the normal finding set only through an explicit user promotion action. Promotion must revalidate the candidate against the current approved extraction boundary and require the candidate envelope to be bound to the exact deterministic diagnostic `generatedAt` value that produced it. Any extraction re-approval or deterministic diagnostic rerun makes older candidates stale and non-promotable. Promotion preserves the candidate's direct evidence, affected-object references, confidence, provider, and prompt provenance; creates a pending derived finding; and resets normal finding review. A promoted candidate cannot influence maturity, recommendations, maps, or reports until the normal review is completed and that finding is explicitly accepted. The local/demo adapter stores promotion records in browser-local state; durable tenant-scoped audit persistence remains production-readiness work.

## ADR-031 — Entity role relationships require explicit source language
**Status:** Accepted
Creator, consumer, and authority relationships in the Entity/ID map may be projected only from strict, directly supported architecture statements such as `<system> creates <entity> records`, `<system> consumes <entity> records`, or `<system> is the system of record for <entity>`. Relationship extraction is sentence-bounded so neighboring prose cannot bleed into system or entity names. Each claim stores the exact direct source-segment evidence, remains reviewable through the normal extraction workflow, and appears as a direct graph edge only when both endpoint objects are confirmed. Ordinary topology, OpenAPI paths, identifier presence, naming similarity, accepted findings, or missing contrary evidence cannot establish these roles.

## ADR-032 — Graph filters and static exports are projection-only
**Status:** Accepted
Entity/ID map filters may hide nodes or relationships by search text, node kind, relationship kind, or direct/derived status, but filtering may not synthesize or alter graph facts. A visible relationship must already exist in the reviewed graph and both visible endpoints must remain in the filtered projection. Static SVG and JSON exports contain only the currently visible reviewed projection, preserve direct-versus-derived semantics and diagnostic provenance, and must not add raw uploaded artifact content. SVG export is a deterministic presentation artifact rather than a new evidence source or signed production record.

## ADR-033 — Formal print styling is presentation-only
**Status:** Accepted
The executive report may use a route-scoped stylesheet to provide A4 page geometry, print-safe typography, page-break controls, hidden interactive application controls, and expanded evidence details. Print styling must not add, remove, reinterpret, or synthesize report facts, findings, recommendations, artifact content, or evidence provenance. Browser print/save-to-PDF remains a user-agent presentation capability; formal product-managed PDF generation, signed artifacts, and durable server-backed report storage remain separate work.

## ADR-034 — Formal PDF export consumes only immutable reviewed snapshots
**Status:** Accepted
Product-managed PDF generation is permitted only for an explicitly saved immutable report snapshot that passes report-history, assessment, and diagnostic-provenance validation. The PDF adapter must be deterministic for the same snapshot, bounded in request/render size, metadata-only for artifact inventory, and incapable of adding raw uploaded content or new findings. The server response uses `application/pdf`, `Cache-Control: no-store`, and exposes page-count, SHA-256, and diagnostic-provenance metadata. The current dependency-free adapter is a local/server implementation, not a digitally signed or durably stored enterprise report; authenticated tenant authorization, server-backed report history, private storage, audit/deletion, and optional signing remain production-readiness work.

## ADR-035 — Server persistence begins behind a repository boundary
**Status:** Accepted
Newly created assessments must be durably persisted by the server before the create API reports success. The credential-free local/single-instance adapter uses Node SQLite with a workspace-scoped primary key and transactional enforcement of the MVP one-active-assessment limit. Browser localStorage is a compatibility cache only, not the source of truth for newly created assessments. The fixed `local-demo` workspace is not a production tenancy model. Production multi-tenant deployment must replace the SQLite adapter with PostgreSQL/Supabase, authenticated organization/workspace identity, row-level security, tenant-isolation tests, and non-ephemeral storage without changing the assessment repository contract. Uploaded artifact content and downstream reviewed state are intentionally not persisted by this slice.

## ADR-036 — Tenant scope is explicit and server-owned before authentication
**Status:** Accepted
The persistence boundary must model organization and workspace identity before confidential state is migrated. The local/single-instance adapter persists organizations and workspaces, enforces that a workspace belongs to exactly one organization, and requires both IDs for assessment reads and writes. The active local tenant is resolved only from server configuration; API clients cannot supply or switch tenant IDs. This provides deterministic tenant scoping and isolation tests but is explicitly not authentication or authorization. Production access still requires authenticated organization membership, role checks, PostgreSQL row-level security, and tenant-isolation validation at the database/storage layers.
