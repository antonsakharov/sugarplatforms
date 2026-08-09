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

`npm run validate` runs TypeScript checks, source-policy lint, Node tests, and a production Next.js build. The Node tests include behavioral tests for the dependency-free artifact content policy using Node 22 type stripping.

## Current routes

- `/` — product entry page
- `/assessment/new` — guided assessment setup
- `/assessment/[id]` — local/demo assessment workspace
- `/assessment/[id]/upload` — upload readiness workflow
- `/api/assessments` — assessment validation/creation API
- `/api/assessments/[id]/artifacts` — transient artifact inspection API
- `/sample` — Acme sample entry route
- `/api/health` — health endpoint

## Current upload behavior

The demo adapter does not persist file bytes. After metadata checks pass, the server reads each file transiently to compute SHA-256, estimate pages, and perform best-effort probable-secret/prohibited-data scanning. It returns safe inspection metadata and a readiness state. Do not use the demo for confidential customer material.
