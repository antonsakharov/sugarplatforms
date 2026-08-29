# Development

## 2026-08-29 formal report print styling

REP-006 adds a route-scoped presentation layout for `/assessment/[id]/report`. No additional package, environment variable, credential, or external service is required. The report keeps the same accepted-findings-only data model and provenance; the new CSS only changes presentation. Browser print uses A4 page geometry, print-safe typography, compact metrics, page-break controls, expanded evidence details, and hides site navigation plus interactive form actions. Browser save-to-PDF is available through the print dialog, but product-managed PDF generation remains REP-007.

Relevant files: `app/assessment/[id]/report/layout.tsx`, `app/assessment/[id]/report/report-print.css`, `tests/report-print.test.mjs`, and `docs/REPORT_PRINT.md`.

## 2026-08-26 AI candidate promotion

The local/demo AI-candidate surface supports explicit promotion into normal finding review. Candidate envelopes carry `diagnosticGeneratedAt` so promotion can fail closed when deterministic diagnostics were re-run. The promotion path revalidates the approved extraction/evidence boundary, creates a pending derived finding, preserves provider/prompt provenance in a promotion record, replaces the browser-local diagnostic review set, and initializes a fresh finding review. One candidate set is bound to one deterministic diagnostic version; after a promotion changes the review set, regenerate candidates before promoting another item. No external model credentials are required for the demo adapter.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

No print-specific setup is required. Open `/assessment/<id>/report` after completing finding review and maturity/recommendations, then use **Print preview** and the browser print dialog.

## Validation

```bash
npm run validate
```

`npm run validate` runs TypeScript checks, source-policy lint, Node tests, and a production Next.js build. The Node tests cover assessment limits, upload safety, deterministic parsing, evidence provenance, extraction contracts, deterministic diagnostics, AI-assisted candidate boundaries and promotion, evidence-boundary validation, finding review, entity/ID graph projection/export, reviewed maturity/recommendation projection, accepted-findings-only reporting, report snapshot/version export behavior, and the formal print presentation contract.

## Current routes

- `/` — product entry page
- `/assessment/new` — guided assessment setup
- `/assessment/[id]` — local/demo assessment workspace
- `/assessment/[id]/upload` — upload, readiness, parsing, evidence, and candidate extraction workflow
- `/assessment/[id]/review` — extraction review and approval
- `/assessment/[id]/diagnostics` — deterministic diagnostics, evidence validation, and finding review
- `/assessment/[id]/ai-findings` — isolated AI-assisted candidate findings, with explicit promotion into normal finding review
- `/assessment/[id]/map` — reviewed entity/ID projection, evidence drill-down, filters, and static export
- `/assessment/[id]/maturity` — focused maturity signal, scoring rationale, prioritized recommendations, and traceability
- `/assessment/[id]/report` — accepted-findings-only executive preview, deterministic 90-day action plan, browser-local version history, JSON snapshot export, and formal print presentation
- `/api/assessments` — assessment validation/creation API
- `/api/assessments/[id]/artifacts` — transient validation, parsing, and local extraction API
- `/sample` — Acme sample entry route
- `/api/health` — health endpoint

## Current upload and extraction behavior

The demo adapter does not persist file bytes. After metadata checks pass, the server reads each file transiently to compute SHA-256, estimate pages, perform best-effort probable-secret/prohibited-data scanning, and generate source-addressable parse segments. A deterministic local extraction provider then emits only architecture candidates directly supported by those segments; each candidate carries direct evidence references.

The repository also contains OpenAI Responses provider boundaries, but the demo upload route does not activate them or send uploaded artifact content to an external provider. External model activation requires server-only credentials and production privacy/tenancy controls.

Do not use the current demo path for confidential customer material. Authentication, tenant authorization, private object storage, malware scanning, durable persistence, deletion, audit controls, and tenant-isolation verification remain production prerequisites.

## Diagnostics and finding review

After validating/parsing/extracting artifacts, resolve every extraction candidate and approve the extraction set. Open `/assessment/<id>/diagnostics` to run the local deterministic engine. The diagnostics screen validates every finding's evidence and affected-object references against the exact approved extraction version before review begins.

Reviewers can edit presentation fields and severity, add a reviewer note, and explicitly accept or reject each finding. Rule identity, confidence, affected objects, and source evidence are immutable. Only accepted findings from a completed, non-stale review are eligible for downstream maturity, visualization, recommendations, and reports.

The deterministic engine currently includes fragmented identifiers, competing authority, duplicate matching logic, duplicate platform capabilities, ownership gaps, direct database coupling, and long synchronous integration chains. No additional environment variable or external service is required for these local/demo rules.

## AI-assisted candidate findings

After deterministic diagnostics exist, open `/assessment/<id>/ai-findings`. The working demo uses a local deterministic provider to exercise the provider contract without external credentials. AI candidates are stored separately and cannot affect finding review, maturity, recommendations, maps, or reports automatically. Explicit promotion revalidates current extraction and diagnostic versions, creates a pending normal finding, resets finding review, and still requires explicit accept/reject review before downstream use.

## Entity/ID map

After finding review is completed, open `/assessment/<id>/map`. The map is projected in-browser from the approved extraction plus accepted findings. It retains direct evidence for source-backed relationships, marks scope-derived relationships as derived, and supports projection-only filters plus static SVG/JSON export without adding raw uploaded artifact content.

## Focused maturity and recommendations

After finding review is completed, open `/assessment/<id>/maturity`. The page calculates a transparent 1–5 risk-adjusted signal from accepted findings only. If no findings were accepted, the result is `not_scored`; the product does not infer perfect maturity from missing evidence. Recommendations retain finding, affected-object, and source-evidence traceability.

## Executive report versions, export, and print

The local/demo report is available at `/assessment/<id>/report` after finding review and maturity/recommendations are complete. It produces a deterministic 90-day action plan plus an accepted-findings-only executive preview. Artifact inventory is metadata-only and raw uploaded content is not reproduced.

Use **Save report version** to create a browser-local immutable snapshot and **Download JSON** for a structured report export. Use **Print preview** for the REP-006 formal presentation. The route-specific stylesheet applies A4 margins, print typography, compact summary metrics, page-break behavior, and expands closed evidence details so locators remain visible on paper. Site navigation, footer, buttons, and form actions are omitted from printed output.

Browser print/save-to-PDF is a demo handoff capability, not a signed archive or product-managed PDF. REP-007 remains responsible for formal PDF export. Server-backed history, report authorization, and durable tenant-scoped report persistence remain production work.
