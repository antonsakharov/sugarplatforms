# Validation — 2026-09-11

Feature: operational deletion reconciliation and job controls.

The final branch must pass the repository GitHub Actions `validate` workflow on Node 22: TypeScript, source-policy lint, complete tests including deletion-job recovery/isolation coverage, optimized Next.js build, repository packaging, and artifact upload. All JSON schemas are also parsed independently before handoff.

MVP limits remain unchanged: one focused assessment, one primary entity, maximum 10 files, maximum 25 MB per file, maximum 150 measurable pages, architecture metadata only, and no customer records, credentials, secrets, or live production access.
