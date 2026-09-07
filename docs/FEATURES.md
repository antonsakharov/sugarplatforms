# Feature Inventory

## MVP priority 1 — Assessment setup

User can create a workspace, name an assessment, choose one focus area, specify one primary entity, describe the business concern, and accept assessment limits.

Status: in progress — assessment creation is server-persisted through a repository boundary using the credential-free SQLite local/single-instance adapter. Explicit organization and workspace identities are persisted and every assessment repository operation is scoped by both IDs; browser localStorage remains only a compatibility cache. Authentication and PostgreSQL/RLS foundations exist, while durable report history remains open.

## MVP priority 2 — Guided upload

User can select up to 10 supported files, receive server-side type/size/duplicate/page validation, receive probable-secret and prohibited-data warnings, remove or replace files, and see whether the artifact set is ready for parsing.

Status: in progress — the complete local upload-readiness workflow is implemented. Artifact bytes are persisted privately only after readiness checks pass, using server-derived tenant-scoped random storage keys. Durable tenant-scoped artifact metadata is stored alongside processing provenance. Confidential enterprise uploads still require production identity, production private storage, malware scanning, deletion/audit controls, and live isolation validation.

## MVP priority 3 — Artifact parsing and evidence

User can see processing status, inspect parsed content and source coordinates, see extracted-object provenance, and inspect parsing failures.

Status: in progress — text/Markdown, JSON/YAML/OpenAPI, CSV, SQL DDL, and bounded direct-text PDF parsing produce source-addressable segments with stable locators and hashes. Validated artifact metadata, normalized source segments, parser warnings, and the current extraction snapshot are transactionally persisted under organization/workspace/assessment scope and can be resumed through an authenticated no-store API. Production-grade PDF coverage, malware/quarantine, production PostgreSQL/RLS activation, and durable report history remain open.

## MVP priority 4 — Extraction review

User can review extracted systems, entities, identifiers, integrations, capabilities, and owners; rename/reject/merge/confirm objects; inspect evidence; and approve extraction for analysis.

Status: implemented for the real local/single-instance workflow with durable review state — evidence-linked candidate inventory, explicit rename/reject/merge/confirm actions, same-kind merge guardrails, evidence drill-down, and approval gating are available. Review decisions and approval are authenticated, tenant-scoped, server-persisted, and SHA-256-bound to the exact persisted extraction snapshot. Any processing change that alters extraction identity/evidence makes the prior review stale and forces a fresh review; client payloads cannot introduce unknown objects or preserve approval across extraction versions. Browser localStorage is only a compatibility cache after successful server reads/writes. OpenAI activation and production PostgreSQL/RLS-backed review persistence remain open.

## MVP priority 5 — Entity and ID map

User can see the focused primary entity, confirmed entity/identifier/system nodes, direct system integration relationships, directly stated creator/consumer/authority relationships, accepted-finding overlays, evidence drill-down, graph filters, and static export.

Status: implemented for the current local/demo workflow — the graph projection is gated on completed non-stale finding review, uses confirmed extraction objects, and decorates downstream output with accepted findings only. Identifier-to-focus relationships are visibly marked derived. Creator, consumer, and authority edges are shown only when strict uploaded architecture language explicitly states the role, both endpoint objects are confirmed, and exact supporting source evidence is available. Users can filter by search text, node type, relationship type, and direct/derived status; optionally hide isolated nodes; and download the currently visible projection as self-contained SVG or structured JSON. Filters and exports never create new facts, and exports do not add raw uploaded artifact content.

## MVP priority 6 — Diagnostic findings

User can run analysis; inspect impact and evidence; inspect isolated AI-assisted candidate findings; and accept, edit, or reject final findings.

Status: implemented for the local/single-instance workflow with durable deterministic finding review — deterministic diagnostics run only after extraction approval. Fragmented-identifier, competing-authority, duplicate-matching-logic, duplicate-platform-capability, ownership-gap, direct-database-coupling, and long-synchronous-chain rules emit evidence-backed derived findings. Evidence coverage is revalidated against the exact approved extraction boundary before review. Finding decisions and permitted edits are now authenticated, tenant-scoped, and server-persisted; the server re-runs the deterministic engine to reject forged diagnostics, binds the review to a diagnostic fingerprint, marks prior state stale when the extraction approval changes, and materializes accepted findings only after every finding is explicitly decided and the review is completed. Browser localStorage is only a compatibility cache after successful server persistence.

AI-assisted candidate findings are implemented behind a provider boundary. The working demo uses a deterministic local adapter after deterministic rules, produces bounded-confidence derived candidates, and rejects any candidate that references an object or evidence segment outside the approved extraction boundary. An OpenAI Responses adapter boundary uses strict structured output, `store: false`, and untrusted-input instructions, but is not activated in the browser/demo path because privileged keys and production privacy/tenancy controls are unavailable. AI candidates remain isolated suggestions until an explicit promotion action revalidates the approved extraction boundary and exact deterministic diagnostic version. Promotion creates a pending normal finding, preserves AI provider/prompt provenance in the promotion record, resets finding review, and still requires explicit accept/reject review before the promoted item can influence maturity, recommendations, maps, or reports.

## MVP priority 7 — Maturity and recommendations

User can see a focused maturity summary, scoring rationale, prioritized recommendations, and finding traceability.

Status: implemented for the current reviewed-finding flow — completed non-stale finding review is required; only accepted findings contribute to the focused 1–5 risk-adjusted signal and prioritized recommendations. Zero accepted findings produce an explicit not-scored result rather than a perfect score. Recommendation priority is deterministic by severity, confidence, and title, and every recommendation preserves finding, affected-object, and direct evidence traceability. This signal is explicitly not an enterprise maturity certification. Downstream pages still need to switch fully from compatibility cache reads to the newly durable accepted-finding API state.

## MVP priority 8 — Executive report

User can generate a report from accepted findings, preview executive and technical sections, save explicit report versions, export a structured report snapshot, produce a formally styled print view, and download a product-managed PDF from a saved immutable version.

Status: implemented for the current reviewed-finding flow through formal PDF export — the report preview consumes the assessment scope, artifact metadata, focused maturity, prioritized recommendations, and only accepted findings from a completed non-stale review. It includes an executive summary, scope/artifact inventory, top accepted findings with evidence drill-down, deterministic 0–30/31–60/61–90 day sequencing, recommendations, limitations, and report version history. Users can explicitly save immutable browser-local snapshots with monotonic v1/v2/... numbering and download a metadata-only JSON export that retains diagnostic provenance. REP-006 provides route-scoped A4 print styling. REP-007 adds a bounded server-side deterministic PDF adapter and `POST /api/reports/pdf`; formal PDF generation is allowed only from a saved snapshot that passes report-version/provenance validation, carries page-count/checksum/provenance response metadata, and does not add raw uploaded artifact content. Durable tenant-scoped report persistence, authorization, digital signing, and server-backed version history remain open.

## Secondary demo feature — Acme HealthTech

User can open a preloaded assessment and navigate the same output surfaces used by real assessments.

Status: planned

## Future features

GitHub/Jira/Confluence/service-catalog connectors, continuous drift detection, assessment comparison, collaboration, enterprise SSO, and customer-managed deployment.
