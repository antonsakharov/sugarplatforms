# Validation — 2026-10-26

## Feature

PAR-005b13 / PAR-006 — bounded Flate PDF object-stream expansion and verified physical-page evidence (Decision 090).

## Local validation

- `node --experimental-strip-types --import ./scripts/register-test-loader.mjs --test tests/pdf-object-streams.test.mjs`: **11/11 passed**.
- Focused PDF object-stream, page-tree, stream-filter, font-resource and parser suites: **78/78 passed**.
- `npm run baseline:check`: **passed** (11 required baseline files).
- `npm run lint`: **passed**.
- `schemas/*.json` syntax: **19/19 valid**.
- `npm test`: **282 passed, 24 failed** because npm dependencies are unavailable in this isolated runtime (test-file imports cannot resolve). This is not a product regression certification.
- `npm ci --offline --ignore-scripts`: **blocked** (`ENOTCACHED`, zod tarball unavailable).
- `npm run typecheck`: **blocked** (missing Next.js/other dependency types).
- `npm run build`: **blocked** (`next: not found`).
- Live authenticated two-tenant PostgreSQL, private storage, and malware-scanner isolation: **not run**; external infrastructure unavailable.

## Evidence/security assertions

- Verified Catalog/Pages/Kids order controls physical page numbering even when page objects are compressed or packed out of page order.
- Malformed `N`, `First`, declared length, index, offsets, duplicate IDs, excessive expansion, nested/unsupported/encrypted objects, unsupported filters, and unprovable page trees fail closed.
- Existing server-side assessment/upload limits, architecture-metadata-only scope, and accepted-findings-only reporting are unchanged.
- No production data, external service, deployment, or merge was used.

## Publication

New dedicated GitHub agent branch and draft PR are requested. Branch publication and parity are tracked separately from local verification; no completion claim is made until remote source hashes and CI are confirmed.
