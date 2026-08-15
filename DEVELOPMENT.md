# Development

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

`npm run validate` runs TypeScript checks, source-policy lint, Node tests, and a production Next.js build. The Node tests include behavioral tests for assessment limits, upload safety, deterministic parsing, evidence provenance, extraction contracts, deterministic diagnostics, evidence-boundary validation, and finding review.

## Current routes

- `/` — product entry page
- `/assessment/new` — guided assessment setup
- `/assessment/[id]` — local/demo assessment workspace
- `/assessment/[id]/upload` — upload, readiness, parsing, evidence, and candidate extraction workflow
- `/assessment/[id]/review` — extraction review and approval
- `/assessment/[id]/diagnostics` — deterministic diagnostics, evidence validation, and finding review
- `/api/assessments` — assessment validation/creation API
- `/api/assessments/[id]/artifacts` — transient validation, parsing, and local extraction API
- `/sample` — Acme sample entry route
- `/api/health` — health endpoint

## Current upload and extraction behavior

The demo adapter does not persist file bytes. After metadata checks pass, the server reads each file transiently to compute SHA-256, estimate pages, perform best-effort probable-secret/prohibited-data scanning, and generate source-addressable parse segments. A deterministic local extraction provider then emits only architecture candidates directly supported by those segments; each candidate carries direct evidence references.

The repository also contains an OpenAI Responses extraction adapter behind the same provider interface, but the demo upload route does not activate it or send uploaded artifact content to an external provider. External model activation requires a server-only API key and production privacy/tenancy controls.

Do not use the current demo path for confidential customer material. Authentication, tenant authorization, private object storage, malware scanning, durable persistence, deletion, audit controls, and tenant-isolation verification remain production prerequisites.

## Diagnostics and finding review

After validating/parsing/extracting artifacts, resolve every extraction candidate and approve the extraction set. Open `/assessment/<id>/diagnostics` to run the local deterministic engine. The diagnostics screen validates every finding's evidence and affected-object references against the exact approved extraction version before review begins.

Reviewers can edit presentation fields and severity, add a reviewer note, and explicitly accept or reject each finding. Rule identity, confidence, affected objects, and source evidence are immutable. Editing returns the finding to `pending`; review cannot complete until every finding is accepted or rejected. Only accepted findings from a completed, non-stale review are eligible for downstream maturity, visualization, recommendations, and reports.

Demo diagnostic state is stored in browser local storage under `sugar:diagnostics:<assessmentId>` and finding-review state under `sugar:finding-review:<assessmentId>`. Neither is durable tenant-scoped production persistence.
