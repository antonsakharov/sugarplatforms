# Feature Inventory

## MVP priority 1 — Assessment setup

User can create a workspace, name an assessment, choose one focus area, specify one primary entity, describe the business concern, and accept assessment limits.

Status: in progress — implemented; dependency-backed production build validation remains pending.

## MVP priority 2 — Guided upload

User can select up to 10 supported files, receive server-side type/size/duplicate/page validation, receive probable-secret and prohibited-data warnings, remove or replace files, and see whether the artifact set is ready for parsing.

Status: in progress — the complete demo/local upload-readiness workflow is implemented. The server reads bytes only transiently to calculate SHA-256 checksums, estimate page counts, and perform best-effort content-risk scanning; uploaded bytes are not persisted. Real confidential uploads still require authentication, tenant authorization, private object storage, malware scanning, and production security validation.

## MVP priority 3 — Artifact parsing and evidence

User can see processing status, inspect parsed content and source coordinates, see extracted-object provenance, and inspect parsing failures.

Status: planned — next priority.

## MVP priority 4 — Extraction review

User can review extracted systems, entities, identifiers, integrations, capabilities, and owners; rename/reject/merge/confirm objects; inspect evidence; and approve extraction for analysis.

Status: planned

## MVP priority 5 — Entity and ID map

User can see identifiers associated with the primary entity, creator/consumer systems, authority claims, mappings, and evidence.

Status: planned

## MVP priority 6 — Diagnostic findings

User can run analysis; filter findings; inspect impact and evidence; and accept, edit, or reject findings.

Status: planned

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
