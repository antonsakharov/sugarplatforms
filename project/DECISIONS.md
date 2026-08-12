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

## ADR-011 — Demo uploads initially validate metadata without persistence
**Status:** Superseded by ADR-012

The first guided-upload increment validated multipart metadata only and did not read artifact bytes. This conservative starting point established count, size, and type controls before content inspection was introduced.

## ADR-012 — Transient in-memory inspection is permitted in demo mode
**Status:** Accepted

After metadata validation succeeds, the demo upload endpoint may read each selected artifact into bounded request memory solely to compute SHA-256, estimate pages, run best-effort prohibited-content checks, and perform deterministic parsing. Raw bytes must not be persisted, logged, echoed, or sent to an external model/provider. Only safe inspection and parsed evidence metadata may be returned and stored in the local browser adapter.

## ADR-013 — Upload readiness is conservative and reviewable
**Status:** Accepted

Duplicate content and measurable page-limit violations block the artifact set. Probable-secret/prohibited-data signals and unmeasurable page counts produce `review_required`; the demo does not provide a bypass control. Detection is explicitly best-effort and never represented as a guarantee that uploaded content is safe.

## ADR-014 — Evidence segments preserve deterministic source locators
**Status:** Accepted

All deterministic parsers emit bounded source segments with stable artifact/segment IDs, per-segment SHA-256, and a locator that can be resolved back to the submitted artifact. Text, Markdown, and YAML use line ranges; JSON/OpenAPI JSON use JSON Pointer. Unsupported parser formats fail or remain partial rather than fabricating evidence. These segment contracts become the provenance boundary for later AI extraction and findings.

## ADR-015 — PDF parsing remains fail-closed in demo mode
**Status:** Accepted

The demo may extract directly addressable PDF text operators with page-level locators. Encrypted, scanned, compressed, or otherwise unsupported PDFs must produce a visible parsing failure instead of inferred or fabricated evidence. A production PDF adapter with complete text/layout handling is required before claiming general PDF coverage.

## ADR-016 — Extraction is evidence-first and local by default
**Status:** Accepted

The demo extraction path uses a deterministic local provider. Every emitted architecture object must include at least one direct source-segment reference; unsupported or missing facts are not invented. Exact duplicate claims may reconcile by normalized object kind and name only when all supporting evidence references are retained. Ambiguous objects are not silently merged.

A production OpenAI Responses adapter is implemented behind the same provider interface with schema-constrained output, explicit prompt versioning, bounded output, prompt-injection isolation, `store: false`, and a server-only API key. It is not activated by the demo upload route. External model activation remains gated on production privacy, tenant-isolation, retention, deletion, and audit controls.
