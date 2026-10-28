# Validation — 2026-10-28

Feature: PAR-005b15, bounded classic PDF xref-table integrity (Decision 092).

## Local results

- `npm run baseline:check`: PASS (11 required baseline files).
- `npm run lint`: PASS.
- Focused PDF tests (`pdf-xref-table`, `pdf-xref-stream`, `pdf-object-streams`, `parser`, `pdf-page-tree`): **76/76 PASS**.
- New classic xref-table regression tests: **10/10 PASS** (LF/CRLF, split subsections, direct offsets, free entries, generations, trailer, hybrid/revisions, unproven page tree).
- Full `npm test`: **302 passed, 24 failed** of 326 due to unavailable `better-sqlite3` and `zod` modules in the isolated local environment. Not a full-suite pass.
- Focused upload, malware gate, tenancy and xref tests: **19 passed, 1 failed** (tenancy import requires uncached `zod`).
- `npm ci --offline --ignore-scripts`: BLOCKED (`zod@4.0.17` tarball not cached).
- `npm run typecheck`: BLOCKED by missing npm dependency/type packages.
- `npm run build`: BLOCKED (`next` unavailable locally).
- JSON schema syntax: **19/19 valid**.
- Live authenticated two-tenant PostgreSQL/RLS, private bucket, malware scanner: NOT RUN; isolated credentials and services unavailable.

## Evidence and security review

The new validator does not invent page coordinates: only an independently verified Catalog/Page-tree/Contents chain can emit `pdf-page` locators. Invalid xref offsets, orphaned objects, hybrid/revisioned tables, and unsupported trailer metadata fail closed. Existing assessment/upload limits, malware quarantine, architecture-metadata-only policy, authorization and accepted-findings-only reporting remain unchanged.

## Release gate

GitHub Actions dependency-backed `npm ci`, typecheck, lint, all tests, and Next.js build must pass on the published review branch before marking CI green. Draft PR must remain unmerged; production security certification is still a separate blocker. No production deployment.
