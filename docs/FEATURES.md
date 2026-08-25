# Feature Inventory

## MVP priority 1 — Assessment setup

User can create a workspace, name an assessment, choose one focus area, specify one primary entity, describe the business concern, and accept assessment limits.

Status: in progress — implemented in the local/demo adapter; durable authenticated persistence remains open.

## MVP priority 2 — Guided upload

User can select up to 10 supported files, receive server-side type/size/duplicate/page validation, receive probable-secret and prohibited-data warnings, remove or replace files, and see whether the artifact set is ready for parsing.

Status: in progress — complete demo/local upload-readiness workflow is implemented. Uploaded bytes are inspected transiently and are not persisted. Confidential uploads still require authentication, tenant authorization, private object storage, malware scanning, and production security validation.

## MVP priority 3 — Artifact parsing and evidence

User can see processing status, inspect parsed content and source coordinates, see extracted-object provenance, and inspect parsing failures.

Status: in progress — text/Markdown, JSON/YAML/OpenAPI, CSV, SQL DDL, and bounded direct-text PDF parsing produce source-addressable segments with stable locators and hashes. Production-grade PDF coverage, retry/quarantine, authenticated storage, and persistence remain open.

## MVP priority 4 — Extraction review

User can review extracted systems, entities, identifiers, integrations, capabilities, and owners; rename/reject/merge/confirm objects; inspect evidence; and approve extraction for analysis.

Status: implemented for the local/demo workflow — evidence-linked candidate inventory, explicit rename/reject/merge/confirm actions, same-kind merge guardrails, evidence drill-down, and approval gating are available. Explicit `system of record`, `source of truth`, and `authoritative system` statements are retained as evidence-backed `authorityFor` attributes on system objects. Explicit matching/entity-resolution statements are retained as `matchingFor`, `matchingClaim`, and optional `matchingMethod` attributes. Explicit statements that a named system provides, implements, offers, or hosts a named platform capability are retained as direct system capability claims. Explicit synchronous-call language is retained on integration objects as `interactionMode=synchronous` and `syncClaim=explicit`; ordinary topology is not upgraded to synchronous behavior. Approval is blocked until every candidate is resolved. OpenAI activation and durable tenant-scoped persistence remain open.

## MVP priority 5 — Entity and ID map

User can see the focused primary entity, confirmed entity/identifier/system nodes, direct system integration relationships when explicitly extracted, accepted-finding overlays, and evidence drill-down.

Status: implemented for the current local/demo workflow — the graph projection is gated on completed non-stale finding review, uses confirmed extraction objects, and decorates downstream output with accepted findings only. Identifier-to-focus relationships are visibly marked derived. Creator/consumer and authority relationship visualization is still planned; relationships are not inferred without explicit extraction evidence.

## MVP priority 6 — Diagnostic findings

User can run analysis; inspect impact and evidence; inspect isolated AI-assisted candidate findings; and accept, edit, or reject final findings.

Status: implemented for the current local/demo rule set — deterministic diagnostics run only after extraction approval. Fragmented-identifier, competing-authority, duplicate-matching-logic, duplicate-platform-capability, ownership-gap, direct-database-coupling, and long-synchronous-chain rules emit evidence-backed derived findings. Direct database coupling fires only when an approved explicit integration edge targets something named as a database/DB or recognized database engine. Long synchronous chain detection requires at least three consecutive approved integration edges that are each explicitly documented as synchronous; ordinary arrows, asynchronous/event edges, and inferred topology do not qualify. Evidence coverage is revalidated against the exact approved extraction boundary before review.

AI-assisted candidate findings are now implemented behind a provider boundary. The working demo uses a deterministic local adapter after deterministic rules, produces bounded-confidence derived candidates, and rejects any candidate that references an object or evidence segment outside the approved extraction boundary. An OpenAI Responses adapter boundary uses strict structured output, `store: false`, and untrusted-input instructions, but is not activated in the browser/demo path because privileged keys and production privacy/tenancy controls are unavailable. AI candidates remain isolated suggestions and cannot enter maturity, recommendations, maps, or reports automatically; explicit promotion into the normal finding-review set remains future work.

## MVP priority 7 — Maturity and recommendations

User can see a focused maturity summary, scoring rationale, prioritized recommendations, and finding traceability.

Status: implemented for the current local/demo reviewed-finding flow — completed non-stale finding review is required; only accepted findings contribute to the focused 1–5 risk-adjusted signal and prioritized recommendations. Zero accepted findings produce an explicit not-scored result rather than a perfect score. Recommendation priority is deterministic by severity, confidence, and title, and every recommendation preserves finding, affected-object, and direct evidence traceability. This signal is explicitly not an enterprise maturity certification.

## MVP priority 8 — Executive report

User can generate a report from accepted findings, preview executive and technical sections, save explicit report versions, export a structured report snapshot, print, and see report version and scope.

Status: implemented for the current local/demo reviewed-finding flow — the report preview consumes the assessment scope, artifact metadata, focused maturity, prioritized recommendations, and only accepted findings from a completed non-stale review. It includes an executive summary, scope/artifact inventory, top accepted findings with evidence drill-down, deterministic 0–30/31–60/61–90 day sequencing, recommendations, limitations, and browser print preview. Users can explicitly save immutable browser-local snapshots with monotonic v1/v2/... numbering and download a metadata-only JSON export that retains diagnostic provenance. Durable tenant-scoped report persistence, authorization, server-backed version history, and formal styled PDF export remain open.

## Secondary demo feature — Acme HealthTech

User can open a preloaded assessment and navigate the same output surfaces used by real assessments.

Status: planned

## Future features

GitHub/Jira/Confluence/service-catalog connectors, continuous drift detection, assessment comparison, collaboration, enterprise SSO, and customer-managed deployment.
