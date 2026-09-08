# Development

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The credential-free local/single-instance path uses the existing server-owned local tenant, local-dev authenticated membership, SQLite persistence adapters, and private filesystem artifact storage. No external identity provider, PostgreSQL service, object-storage account, AI provider, or PDF provider is required to exercise the current end-to-end workflow locally.

Do not use the local adapter for confidential enterprise material. Production readiness still requires verified production identity, PostgreSQL/RLS activation with live non-bypass tenant-isolation tests, production private object storage, malware/quarantine controls, audit/deletion, backup/restore verification, and log/incident controls.

## Validation

```bash
npm run validate
```

`npm run validate` runs TypeScript checks, source-policy lint, all Node tests, and an optimized Next.js production build. GitHub Actions also packages the validated source tree as a repository-snapshot artifact after each run.

Current tests cover assessment limits and persistence, authentication/authorization, organization/workspace isolation, PostgreSQL RLS policy boundaries, upload safety, private artifact storage, deterministic parsing, source-addressable evidence persistence, extraction/review persistence and staleness, deterministic diagnostics, finding-review persistence/materialized accepted findings, AI candidate boundaries and promotion, entity/ID graph projection/export, maturity/recommendation projection, accepted-findings-only reporting, report snapshot/version export, formal print presentation, and deterministic PDF generation/provenance behavior.

## Current routes

- `/` — product entry page
- `/assessment/new` — guided assessment setup
- `/assessment/[id]` — assessment workspace
- `/assessment/[id]/upload` — upload, readiness, parsing, evidence, and extraction workflow
- `/assessment/[id]/review` — server-backed extraction review and approval
- `/assessment/[id]/diagnostics` — deterministic diagnostics and server-backed finding review
- `/assessment/[id]/ai-findings` — isolated candidate findings and explicit server-authorized promotion into normal finding review
- `/assessment/[id]/map` — server-reviewed entity/ID projection, evidence drill-down, filters, and static export
- `/assessment/[id]/maturity` — server-reviewed maturity signal and prioritized recommendations
- `/assessment/[id]/report` — server-reviewed executive preview plus browser-local immutable report snapshots, JSON export, print, and formal PDF export
- `/api/assessments` — authenticated assessment validation/creation
- `/api/assessments/[id]` — authenticated assessment read
- `/api/assessments/[id]/artifacts` — authenticated validation, private storage, parsing, extraction, and processing persistence
- `/api/assessments/[id]/processing` — authenticated no-store processing snapshot
- `/api/assessments/[id]/extraction-review` — authenticated extraction-review read/write
- `/api/assessments/[id]/finding-review` — authenticated finding-review read/write and accepted-finding materialization
- `/api/assessments/[id]/ai-promotions` — authenticated explicit AI-candidate promotion into a pending server-persisted finding set
- `/api/auth/session` — current server-resolved local authenticated context
- `/api/tenancy` — current server-resolved tenant context
- `/api/reports/pdf` — bounded deterministic PDF export from one validated saved report snapshot
- `/api/health` — health endpoint

## Assessment and upload limits

The MVP remains deliberately bounded:

- one active focused assessment per workspace;
- one primary business entity;
- up to 10 files;
- up to 25 MB per file;
- up to 150 total measurable pages;
- architecture metadata only;
- no customer/patient/payment records;
- no passwords, tokens, API keys, private keys, credentials, or other secrets;
- no raw production database exports or live production-system access.

Validated artifact bytes are persisted only after upload-readiness checks pass, under server-derived random tenant-scoped private storage keys. Validated artifact metadata, parser/source segments, extraction snapshots, extraction review, finding review, and materialized accepted findings are server-persisted in the current local/single-instance adapter.

## Reviewed-state authority

The browser is no longer authoritative for reviewed findings downstream. `lib/client-reviewed-state.ts` hydrates the current assessment, processing snapshot, extraction approval, diagnostic envelope, finding review, and materialized accepted findings through authenticated `Cache-Control: no-store` APIs. It verifies assessment scope, approved extraction, stale state, completed review, and accepted-finding materialization before maturity, map, recommendations, or report projections run.

Only after successful server hydration does the client refresh the legacy `localStorage` keys used as compatibility caches. A stale, missing, unauthorized, or incomplete server review fails closed; downstream surfaces do not fall back to old browser findings.

## Diagnostics and finding review

Resolve every extraction candidate and approve the current extraction set before diagnostics. The deterministic engine validates all finding evidence and affected-object references against that approved extraction boundary. Reviewers may edit presentation fields and severity, add reviewer notes, and explicitly accept/reject findings, but rule identity, confidence, affected objects, and source evidence remain immutable.

Finding-review state is tenant-scoped and server-persisted. Accepted findings are materialized only after explicit review completion with no pending decisions. Those accepted findings are the sole finding authority for maturity, visualization, recommendations, and reports.

## AI-assisted candidate findings and promotion

The current candidate generator is a deterministic local provider that exercises the AI-provider/evidence contract without external credentials. `/assessment/<id>/ai-findings` first hydrates the current server diagnostic and extraction-review state. Candidate envelopes are browser-local suggestions and are bound to that exact diagnostic timestamp and extraction approval.

Promotion is no longer a browser-authoritative handoff. `POST /api/assessments/<id>/ai-promotions` revalidates the candidate envelope against the current approved extraction and exact server-persisted diagnostic set, converts the selected candidate into a pending normal finding, resets finding review, and persists the new diagnostic/review envelope. The old candidate set is discarded client-side because promotion changes the diagnostic version.

Subsequent finding-review writes may use only either fresh deterministic engine output or the exact current server-persisted promoted diagnostic envelope. This prevents an arbitrary client-edited diagnostic set from entering reviewed state. Durable promotion audit history beyond the persisted finding envelope remains future audit work.

## Entity/ID map, maturity, recommendations, and report

After finding review is explicitly completed, `/map`, `/maturity`, and `/report` hydrate server-reviewed state directly. The map remains a projection rather than an inference engine; source-backed relationships retain evidence and derived relationships remain labeled. Maturity remains a focused 1–5 risk-adjusted signal rather than an enterprise certification; zero accepted findings return `not_scored`. Recommendations preserve finding/object/evidence traceability.

The executive report preview reloads server-reviewed state and persisted validated artifact metadata, then regenerates maturity, recommendations, and the 90-day plan from the same diagnostic version. Raw uploaded artifact content is not reproduced in the report.

## Report snapshots, JSON, print, and PDF

Explicit report-version history remains a browser-local adapter. Use **Save report version** to create an immutable versioned snapshot, **Download JSON** for structured export, **Print preview** for browser print/save-to-PDF, and **Download formal PDF** for the product-managed server PDF adapter. PDF generation is allowed only from a saved immutable snapshot that passes report/provenance validation.

Durable tenant-scoped report history and authorization are the next unblocked persistence slice. Private durable report storage, optional signing, audit/deletion, and production isolation validation remain open.
