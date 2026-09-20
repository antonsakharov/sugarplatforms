# Feature Inventory

## MVP priority 1 — Assessment setup

User can create a workspace, name an assessment, choose one focus area, specify one primary entity, describe the business concern, and accept assessment limits.

Status: in progress — assessment creation is server-persisted through a repository boundary using the credential-free SQLite local/single-instance adapter. Explicit organization and workspace identities are persisted and every assessment repository operation is scoped by both IDs; browser localStorage remains only a compatibility cache. Authentication and PostgreSQL/RLS foundations exist, and report history is durable in the local/single-instance path.

## MVP priority 2 — Guided upload

User can select up to 10 supported files, receive server-side type/size/duplicate/page validation, receive probable-secret and prohibited-data warnings, remove or replace files, and see whether the artifact set is ready for parsing.

Status: in progress — the complete upload-readiness workflow is implemented. Artifact bytes are persisted only after readiness checks pass, using server-derived random tenant-scoped storage keys. The storage boundary supports both a private local filesystem adapter and a production-oriented Supabase private-bucket adapter. A pre-persistence malware quarantine gate now scans every file before storage or parsing; infected or indeterminate sets fail closed. Live production bucket isolation, scanner operations, production identity, and retention/backup validation remain open.

## MVP priority 3 — Artifact parsing and evidence

User can see processing status, inspect parsed content and source coordinates, see extracted-object provenance, and inspect parsing failures.

Status: in progress — text/Markdown, JSON/YAML/OpenAPI, CSV, SQL DDL, and bounded direct-text PDF parsing produce source-addressable segments with stable locators and hashes. Validated artifact metadata, normalized source segments, parser warnings, and the current extraction snapshot are transactionally persisted under organization/workspace/assessment scope and can be resumed through an authenticated no-store API. Managed PostgreSQL/RLS persistence now covers this processing boundary at the code/migration level; live two-tenant validation remains open.

## MVP priority 4 — Extraction review

User can review extracted systems, entities, identifiers, integrations, capabilities, and owners; rename/reject/merge/confirm objects; inspect evidence; and approve extraction for analysis.

Status: implemented for the real local/single-instance workflow with durable review state, and now implemented at the managed PostgreSQL/RLS code/migration boundary. Evidence-linked candidate inventory, explicit rename/reject/merge/confirm actions, same-kind merge guardrails, evidence drill-down, and approval gating are available. Review decisions are authenticated and tenant-scoped. Managed saves use the verified end-user JWT, forced RLS, editor/admin authorization, and a SECURITY INVOKER RPC that atomically compares the exact reviewed extraction JSONB with the current persisted extraction before writing review state. Processing changes therefore invalidate in-flight approval. Live two-tenant Supabase validation remains open.

## MVP priority 5 — Entity and ID map

User can see the focused primary entity, confirmed entity/identifier/system nodes, direct system integration relationships, directly stated creator/consumer/authority relationships, accepted-finding overlays, evidence drill-down, graph filters, and static export.

Status: implemented for the current workflow with server-reviewed downstream state — the graph projection hydrates the authenticated current assessment, extraction approval, diagnostics, finding review, and materialized accepted findings from no-store server APIs and fails closed on stale/incomplete review state. Filters and SVG/JSON exports never create new facts or add raw artifact content.

## MVP priority 6 — Diagnostic findings

User can run analysis; inspect impact and evidence; inspect isolated AI-assisted candidate findings; and accept, edit, or reject final findings.

Status: implemented for the local/single-instance workflow with durable deterministic finding review. Deterministic rules cover fragmented identifiers, competing authority, duplicate matching logic, duplicate platform capabilities, ownership gaps, direct database coupling, and long synchronous chains. Finding review is authenticated, tenant-scoped, bound to canonical diagnostics, and materializes accepted findings only after explicit completion. AI-assisted candidate findings remain behind a provider boundary and require explicit server-authorized promotion into normal review. Managed PostgreSQL/RLS finding-review persistence remains open.

## MVP priority 7 — Maturity and recommendations

User can see a focused maturity summary, scoring rationale, prioritized recommendations, and finding traceability.

Status: implemented with server-authoritative accepted findings. Only materialized accepted findings contribute to maturity and recommendations; zero accepted findings produce a not-scored result rather than a perfect score. Recommendation priority is deterministic and preserves finding/object/evidence traceability.

## MVP priority 8 — Executive report

User can generate a report from accepted findings, preview executive and technical sections, save explicit report versions, export a structured report snapshot, produce a formally styled print view, and download a product-managed PDF from a saved immutable version.

Status: implemented with authenticated server-backed report history for the local/single-instance workflow. Reports are regenerated server-side from reviewed state, saved as immutable monotonically versioned snapshots, and PDF export re-authorizes and resolves the persisted report by ID. Production PostgreSQL/RLS-backed report persistence and private generated-report object storage remain open.

## Secondary demo feature — Acme HealthTech

User can open a preloaded assessment and navigate the same output surfaces used by real assessments.

Status: implemented for the local/single-instance demo workflow — `/sample` initializes a deterministic Acme HealthTech Patient-identity assessment using four architecture-metadata-only fixtures, then uses the real extraction review, deterministic diagnostics, completed finding review, accepted findings, map, maturity, recommendations, and immutable report surfaces.

## Production-readiness feature — Managed private artifact storage

Use the same tenant-safe artifact-storage boundary with either local private filesystem storage or a managed Supabase private bucket.

Status: implemented at the code/provider-contract level. `ARTIFACT_STORAGE_PROVIDER=supabase` requires server-only project URL/secret configuration, preserves random tenant-scoped keys, validates SHA-256 before upload, uses authenticated private reads, deletes through the Storage API, and issues signed read URLs with a 60–3600 second TTL (300 seconds by default). Mocked provider tests cover upload/read/delete/sign behavior, checksum drift, and cross-tenant rejection. Live private-bucket/RLS isolation testing is still required before confidential production use.

## Production-readiness feature — Malware scanning and quarantine

Treat uploaded bytes as quarantined until the configured scanner reports every artifact clean. Infected or indeterminate scans must not reach object storage, parsing, extraction, or evidence persistence.

Status: implemented at the local/demo and production integration-boundary level. The credential-free local scanner exercises EICAR and executable-signature rejection; the production boundary supports ClamAV INSTREAM with bounded timeout and fail-closed behavior. Checksums are revalidated before scanning, and the entire artifact set remains unpersisted if any scan is infected or unavailable. Live scanner infrastructure, signature-update monitoring, throughput validation, and production object-storage integration testing remain open.

## Production-readiness feature — Audit and deletion

Delete an assessment only through a server-authorized administrator action. The workflow deletes private artifact objects, transactionally removes processing/extraction/review/finding/report state plus the assessment row, and retains minimal tenant-scoped audit receipts.

Status: implemented for the credential-free local/single-instance workflow with durable reconciliation controls. Cross-tenant deletion fails closed and audit/job reads are admin-only. Each deletion has tenant-scoped progress checkpoints, bounded retry/backoff, and crash recovery. The provider-neutral deletion contract also applies to Supabase storage. Production PostgreSQL/RLS job/audit persistence, scheduler/worker activation, backup/retention deletion guarantees, and live production-storage validation remain open.

## Future features

GitHub/Jira/Confluence/service-catalog connectors, continuous drift detection, assessment comparison, collaboration, enterprise SSO, and customer-managed deployment.
