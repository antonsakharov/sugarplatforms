# Feature Inventory

## MVP priority 1 — Assessment setup

User can create a workspace, name an assessment, choose one focus area, specify one primary entity, describe the business concern, and accept assessment limits.

Status: in progress — assessment creation is server-persisted through a repository boundary using the credential-free SQLite local/single-instance adapter. Explicit organization and workspace identities are persisted and every assessment repository operation is scoped by both IDs; browser localStorage remains only a compatibility cache. Authentication and PostgreSQL/RLS foundations exist, and report history is now also durable in the local/single-instance path.

## MVP priority 2 — Guided upload

User can select up to 10 supported files, receive server-side type/size/duplicate/page validation, receive probable-secret and prohibited-data warnings, remove or replace files, and see whether the artifact set is ready for parsing.

Status: in progress — the complete local upload-readiness workflow is implemented. Artifact bytes are persisted privately only after readiness checks pass, using server-derived tenant-scoped random storage keys. Durable tenant-scoped artifact metadata is stored alongside processing provenance. Confidential enterprise uploads still require production identity, production private storage, malware scanning, deletion/audit controls, and live isolation validation.

## MVP priority 3 — Artifact parsing and evidence

User can see processing status, inspect parsed content and source coordinates, see extracted-object provenance, and inspect parsing failures.

Status: in progress — text/Markdown, JSON/YAML/OpenAPI, CSV, SQL DDL, and bounded direct-text PDF parsing produce source-addressable segments with stable locators and hashes. Validated artifact metadata, normalized source segments, parser warnings, and the current extraction snapshot are transactionally persisted under organization/workspace/assessment scope and can be resumed through an authenticated no-store API. Production-grade PDF coverage, malware/quarantine, and production PostgreSQL/RLS activation remain open.

## MVP priority 4 — Extraction review

User can review extracted systems, entities, identifiers, integrations, capabilities, and owners; rename/reject/merge/confirm objects; inspect evidence; and approve extraction for analysis.

Status: implemented for the real local/single-instance workflow with durable review state — evidence-linked candidate inventory, explicit rename/reject/merge/confirm actions, same-kind merge guardrails, evidence drill-down, and approval gating are available. Review decisions and approval are authenticated, tenant-scoped, server-persisted, and SHA-256-bound to the exact persisted extraction snapshot. Any processing change that alters extraction identity/evidence makes the prior review stale and forces a fresh review; client payloads cannot introduce unknown objects or preserve approval across extraction versions. Browser localStorage is only a compatibility cache after successful server reads/writes. OpenAI activation and production PostgreSQL/RLS-backed review persistence remain open.

## MVP priority 5 — Entity and ID map

User can see the focused primary entity, confirmed entity/identifier/system nodes, direct system integration relationships, directly stated creator/consumer/authority relationships, accepted-finding overlays, evidence drill-down, graph filters, and static export.

Status: implemented for the current local/single-instance workflow with server-reviewed downstream state — the graph projection hydrates the authenticated current assessment, extraction approval, diagnostics, finding review, and materialized accepted findings from no-store server APIs. It fails closed on stale or incomplete review state and uses browser localStorage only as a compatibility cache after successful server hydration. Identifier-to-focus relationships remain visibly derived; creator, consumer, and authority edges remain direct-only when strict source evidence supports them. Filters and SVG/JSON exports never create new facts or add raw artifact content.

## MVP priority 6 — Diagnostic findings

User can run analysis; inspect impact and evidence; inspect isolated AI-assisted candidate findings; and accept, edit, or reject final findings.

Status: implemented for the local/single-instance workflow with durable deterministic finding review — deterministic diagnostics run only after extraction approval. Fragmented-identifier, competing-authority, duplicate-matching-logic, duplicate-platform-capability, ownership-gap, direct-database-coupling, and long-synchronous-chain rules emit evidence-backed derived findings. Evidence coverage is revalidated against the exact approved extraction boundary before review. Finding decisions and permitted edits are authenticated, tenant-scoped, and server-persisted; the server re-runs the deterministic engine to reject forged diagnostics, binds the review to a diagnostic fingerprint, marks prior state stale when the extraction approval changes, and materializes accepted findings only after every finding is explicitly decided and the review is completed.

AI-assisted candidate findings remain behind a provider boundary. The working demo uses a deterministic local adapter after server-hydrating the current diagnostic/extraction boundary, produces bounded-confidence derived candidates, and rejects candidates outside approved objects/evidence. Explicit promotion posts the candidate envelope and candidate ID to a server-authorized endpoint; the server revalidates the candidate against the current approved extraction and exact persisted diagnostic version, persists the promoted finding as pending, resets normal finding review, and discards the now-stale candidate set client-side. Subsequent finding-review writes accept only fresh deterministic output or the exact server-persisted promoted envelope, preventing arbitrary client diagnostics from entering reviewed state.

## MVP priority 7 — Maturity and recommendations

User can see a focused maturity summary, scoring rationale, prioritized recommendations, and finding traceability.

Status: implemented with server-authoritative accepted findings — maturity and recommendations hydrate the authenticated completed finding review from the server and fail closed on stale/incomplete state. Only materialized accepted findings contribute to the focused 1–5 risk-adjusted signal and prioritized recommendations. Zero accepted findings produce an explicit not-scored result rather than a perfect score. Recommendation priority is deterministic by severity, confidence, and title, and every recommendation preserves finding, affected-object, and direct evidence traceability. Browser state is compatibility cache only for these inputs.

## MVP priority 8 — Executive report

User can generate a report from accepted findings, preview executive and technical sections, save explicit report versions, export a structured report snapshot, produce a formally styled print view, and download a product-managed PDF from a saved immutable version.

Status: implemented with authenticated server-backed report history for the local/single-instance workflow — report preview reloads the current authenticated reviewed state and deterministically regenerates maturity, recommendations, and the 90-day plan. Saving a version sends no client report body: the server regenerates the canonical report from current reviewed state and persists an immutable monotonically versioned snapshot under organization/workspace/assessment scope. Viewers may read history while editors/admins may create versions. Formal PDF export accepts only assessment/report IDs, re-authorizes the request, and resolves the persisted snapshot server-side. JSON export wraps an already persisted immutable snapshot. Production PostgreSQL/RLS-backed report persistence, private generated-report object storage, signing, audit/deletion, and signed download URLs remain open.

## Secondary demo feature — Acme HealthTech

User can open a preloaded assessment and navigate the same output surfaces used by real assessments.

Status: planned

## Future features

GitHub/Jira/Confluence/service-catalog connectors, continuous drift detection, assessment comparison, collaboration, enterprise SSO, and customer-managed deployment.
