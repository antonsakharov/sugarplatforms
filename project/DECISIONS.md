# Architecture Decision Log

## ADR-001 — Modular monolith
**Status:** Accepted

Use a modular monolith for the initial product.

## ADR-002 — Evidence graph is the product core
**Status:** Accepted

Persist structured evidence linking source artifacts to systems, entities, identifiers, integrations, findings, and recommendations.

## ADR-003 — Limited upload-based diagnostic is the MVP
**Status:** Accepted

The primary MVP is a real, limited assessment built from customer-uploaded architecture metadata. A fictional demo alone is insufficient product validation.

## ADR-004 — Acme sample is secondary
**Status:** Accepted

Retain Acme HealthTech as a preloaded sample assessment using the same screens and models as real assessments.

## ADR-005 — Explicit limits
**Status:** Accepted

MVP defaults are one focused assessment, one primary entity, up to 10 files, 25 MB per file, and 150 pages total where measurable.

## ADR-006 — Architecture metadata only
**Status:** Accepted

Do not request production business records, credentials, secrets, or live production-system access.

## ADR-007 — Upload-first before connectors
**Status:** Accepted

GitHub, Jira, Confluence, service catalog, and cloud connectors are future features.

## ADR-008 — Human review before publication
**Status:** Accepted

Extraction and findings remain reviewable. Reports use accepted or edited findings only.

## ADR-009 — Deterministic rules before AI interpretation
**Status:** Accepted

Use explicit rules for repeatable platform diagnostics and AI for cross-document interpretation and communication.

## ADR-010 — Demo/local adapters permitted
**Status:** Accepted

When credentials are unavailable, use working local adapters without changing domain interfaces.

## ADR-011 — Demo uploads validate without persistence
**Status:** Accepted

Until authenticated tenant-scoped private object storage is available, the demo upload route validates multipart file metadata server-side and returns only safe metadata. It does not read or persist artifact bytes. This allows the upload UX and policy controls to be exercised without implying production-grade confidential-file handling.
