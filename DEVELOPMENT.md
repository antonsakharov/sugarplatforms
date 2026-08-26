# Development

## 2026-08-26 AI candidate promotion

The local/demo AI-candidate surface now supports explicit promotion into normal finding review. Candidate envelopes carry `diagnosticGeneratedAt` so promotion can fail closed when deterministic diagnostics were re-run. The promotion path revalidates the approved extraction/evidence boundary, creates a pending derived finding, preserves provider/prompt provenance in a promotion record, replaces the browser-local diagnostic review set, and initializes a fresh finding review. One candidate set is bound to one deterministic diagnostic version; after a promotion changes the review set, regenerate candidates before promoting another item. No external model credentials are required for the demo adapter.

Relevant files: `lib/ai-finding-promotion.ts`, `app/assessment/[id]/ai-findings/page.tsx`, `tests/ai-finding-promotion.test.mjs`, `schemas/ai-candidate-promotion.schema.json`, and the updated AI-candidate schema.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Validation

```bash
npm run validate
```

`npm run validate` runs TypeScript checks, source-policy lint, Node tests, and a production Next.js build. The Node tests include behavioral tests for assessment limits, upload safety, deterministic parsing, evidence provenance, extraction contracts, deterministic diagnostics, explicit synchronous-integration extraction and long-chain detection, AI-assisted candidate provider boundaries, AI candidate promotion/version gating, evidence-boundary validation, finding review, entity/ID graph projection, reviewed maturity/recommendation projection, accepted-findings-only reporting, and report snapshot/version export behavior.

## Current routes

- `/` — product entry page
- `/assessment/new` — guided assessment setup
- `/assessment/[id]` — local/demo assessment workspace
- `/assessment/[id]/upload` — upload, readiness, parsing, evidence, and candidate extraction workflow
- `/assessment/[id]/review` — extraction review and approval
- `/assessment/[id]/diagnostics` — deterministic diagnostics, evidence validation, and finding review
- `/assessment/[id]/ai-findings` — isolated AI-assisted candidate findings over approved structured evidence, with explicit promotion into normal finding review
- `/assessment/[id]/map` — reviewed entity/ID projection and evidence drill-down
- `/assessment/[id]/maturity` — focused maturity signal, scoring rationale, prioritized recommendations, and traceability
- `/assessment/[id]/report` — accepted-findings-only executive preview, deterministic 90-day action plan, browser-local version history, and JSON snapshot export
- `/api/assessments` — assessment validation/creation API
- `/api/assessments/[id]/artifacts` — transient validation, parsing, and local extraction API
- `/sample` — Acme sample entry route
- `/api/health` — health endpoint

## Current upload and extraction behavior

The demo adapter does not persist file bytes. After metadata checks pass, the server reads each file transiently to compute SHA-256, estimate pages, perform best-effort probable-secret/prohibited-data scanning, and generate source-addressable parse segments. A deterministic local extraction provider then emits only architecture candidates directly supported by those segments; each candidate carries direct evidence references.

The local extractor preserves explicitly documented synchronous integration mode on integration objects when source text uses supported direct forms such as `Gateway synchronously calls Profile API`, `Profile API calls Identity Service synchronously`, `Identity Service makes a synchronous call to Consent Service`, or an explicitly annotated `[sync]` edge. These objects receive `interactionMode=synchronous` and `syncClaim=explicit`. Ordinary integration arrows and asynchronous wording are not promoted to synchronous behavior.

The repository also contains an OpenAI Responses extraction adapter behind the same provider interface, but the demo upload route does not activate it or send uploaded artifact content to an external provider. External model activation requires a server-only API key and production privacy/tenancy controls.

Do not use the current demo path for confidential customer material. Authentication, tenant authorization, private object storage, malware scanning, durable persistence, deletion, audit controls, and tenant-isolation verification remain production prerequisites.

## Diagnostics and finding review

After validating/parsing/extracting artifacts, resolve every extraction candidate and approve the extraction set. Open `/assessment/<id>/diagnostics` to run the local deterministic engine. The diagnostics screen validates every finding's evidence and affected-object references against the exact approved extraction version before review begins.

Reviewers can edit presentation fields and severity, add a reviewer note, and explicitly accept or reject each finding. Rule identity, confidence, affected objects, and source evidence are immutable. Editing returns the finding to `pending`; review cannot complete until every finding is accepted or rejected. Only accepted findings from a completed, non-stale review are eligible for downstream maturity, visualization, recommendations, and reports.

The deterministic engine currently includes fragmented identifiers, competing authority, duplicate matching logic, duplicate platform capabilities, ownership gaps, direct database coupling, and long synchronous integration chains. Long synchronous chain detection requires at least three consecutive confirmed integration objects where every edge carries a direct explicit synchronous claim. A non-synchronous, asynchronous, missing, rejected, or merely inferred edge breaks the chain. The rule does not infer runtime behavior from ordinary topology and asks reviewers to validate the real production critical path before accepting remediation.

No additional environment variable or external service is required for these local/demo deterministic rules.

## AI-assisted candidate findings

After deterministic diagnostics exist, open `/assessment/<id>/ai-findings`. The current working path uses `LocalDemoAiFindingProvider`, which evaluates only confirmed structured architecture objects and produces bounded-confidence `derived` candidates with direct evidence references. This adapter intentionally does not call a model; it exercises the production provider contract and candidate-review UI when credentials and production privacy controls are unavailable.

`OpenAIResponsesFindingProvider` implements the external-model boundary with strict JSON-schema output, `store: false`, prompt-version metadata, a maximum of 20 candidates, and instructions that treat every object name/attribute as untrusted data. Provider output is rejected if it references an object or evidence segment outside the approved extraction boundary, lacks provenance, exceeds confidence 0.8, or attempts to leave the candidate lifecycle state.

The browser/demo path never embeds an OpenAI key and does not activate the external provider. AI candidates are deliberately stored separately under `sugar:ai-candidates:<assessmentId>` and cannot affect finding review, maturity, recommendations, maps, or reports automatically. A candidate enters the normal finding set only through the explicit promotion action. Promotion revalidates the current extraction approval and exact deterministic diagnostic version, creates a pending normal finding, resets finding review, and still requires explicit accept/reject review before downstream use.

## Entity/ID map

After finding review is completed, open `/assessment/<id>/map`. The map is projected in-browser from the approved extraction plus accepted findings. It includes the assessment primary entity, confirmed entity/identifier/system objects, direct integration edges when extraction provides both endpoints, and accepted-finding overlays. Identifier-to-primary-entity edges are explicitly labeled `derived` because they represent the one-primary-entity assessment scope rather than a newly asserted source fact.

The map deliberately does not infer creator/consumer systems, authority claims, or identifier mappings when those relationships were not extracted directly. Every direct graph edge keeps source evidence references and the UI exposes artifact/locator drill-down.

## Focused maturity and recommendations

After finding review is completed, open `/assessment/<id>/maturity` directly or from the Entity/ID map. The page calculates a transparent 1–5 risk-adjusted signal from accepted findings only and displays the formula rationale and rule-coverage limitations. If no findings were accepted, the result is `not_scored`; the product does not infer perfect maturity from missing or rejected evidence.

Recommendations are projected deterministically from accepted findings and ordered by severity, confidence, then title. Each recommendation preserves the source finding ID, affected object IDs, evidence segments, artifact names, and source locators. The executive report deterministically sequences these recommendations into 0–30, 31–60, and 61–90 day phases. That sequencing does not estimate implementation cost, staffing, organizational dependencies, or delivery duration and must be reviewed by a human owner.

Demo diagnostic/review/map/maturity state is browser-local. It is not durable tenant-scoped production persistence.

## Executive report versions and export

The local/demo report is available at `/assessment/<id>/report` after finding review and maturity/recommendations are complete. It reads only browser-local assessment state and produces a deterministic 90-day action plan plus an accepted-findings-only executive preview. The preview never reproduces raw artifact content; artifact inventory is metadata-only.

Use **Save report version** to create an explicit browser-local immutable snapshot. Snapshot history is stored under `sugar:report-snapshots:<assessmentId>` and is validated as a single-assessment, monotonically increasing version sequence. Saving again creates `v2`, `v3`, and so on without rewriting earlier snapshots. Each version preserves the diagnostic-generation timestamp that produced its report.

Use **Download JSON** on a saved version to export a `sugar-platform-diagnostic-report-json` envelope. The export contains the structured report and artifact metadata only; it does not add raw uploaded content. JSON export is suitable for demo handoff and machine-readable inspection, but is not a signed archive, durable tenant record, or formal PDF deliverable. Browser print remains available for preview. Server-backed history, authorization, styled print/PDF output, and formal PDF generation remain production work.
