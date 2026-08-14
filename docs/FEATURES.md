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

Status: implemented for the local/demo workflow — evidence-linked candidate inventory, explicit rename/reject/merge/confirm actions, same-kind merge guardrails, evidence drill-down, and approval gating are available. Approval is blocked until every candidate is resolved. OpenAI activation and durable tenant-scoped persistence remain open.

## MVP priority 5 — Entity and ID map

User can see identifiers associated with the primary entity, creator/consumer systems, authority claims, mappings, and evidence.

Status: planned

## MVP priority 6 — Diagnostic findings

User can run analysis; filter findings; inspect impact and evidence; and accept, edit, or reject findings.

Status: in progress — deterministic diagnostics can now run only after extraction approval. The local/demo engine executes versioned fragmented-identifier and ownership-gap rules, emits derived findings with business/technical impact, recommendations, validation questions, and direct evidence links, and exposes a diagnostics inspection screen. Additional deterministic rules, AI-assisted candidate findings, evidence-coverage validation, and accept/edit/reject finding review remain open.

## MVP priority 7 — Maturity and recommendations

User can see a focused maturity summary, scoring rationale, prioritized recommendations, and finding traceability.

Status: planned

## MVP priority 8 — Executive report

User can generate a report from accepted findings, preview executive and technical sections, print/export, and see report version and scope.

Status: planned

## Secondary demo feature — Acme HealthTech

User can open a preloaded assessment and navigate the same output surfaces used by real assessments.

Status: planned

## Future features

GitHub/Jira/Confluence/service-catalog connectors, continuous drift detection, assessment comparison, collaboration, enterprise SSO, and customer-managed deployment.
