# Validation record — 2026-10-09

## Delivered local increment

Physical PDF page-tree provenance is now derived from a verified unique `/Catalog` root, recursively ordered `/Pages /Kids`, consistent `/Parent` links and `/Count` values. Missing, cyclic, duplicate, or inconsistent objects fail closed. Catalog-less PDFs can only emit fragment locators. The parser refuses duplicate object IDs and enforces the 150-page MVP bound at the tree boundary. It does not infer page numbers from object declaration order.

## Commands and results

- `node --experimental-strip-types --test tests/parser.test.mjs`: **28/28 passed** (20 existing + 8 new).
- `node --experimental-strip-types --test tests/parser.test.mjs tests/upload.test.mjs tests/graph.test.mjs`: **35/35 passed**.
- `npm run lint`: **passed** (source-policy lint, not ESLint).
- `tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck lib/pdf-page-tree.ts`: **passed** (isolated new module only).
- JSON parse validation of `schemas/*.json`: **19/19 valid** (syntax only).
- `node --experimental-strip-types --test tests/*.test.mjs`: **140 passed / 24 failed, 164 discovered**. Failures include missing `zod`, `better-sqlite3`, and Node's inability to resolve TS aliases/extensionless imports in some tests. Do not call these tests passing or classify all failures as solely missing packages.
- `npm run typecheck`: **failed** due to missing installed application dependencies and type declarations.
- `npm run build`: **failed**, `next: not found`.
- `npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund`: **failed**, `better-sqlite3` metadata is not cached. Lockfile remained unchanged and unsynchronized with `package.json`.
- Live PostgreSQL/RLS two-tenant, private-bucket, scanner and scheduler integration: **not executed**; external infrastructure/credentials not available.

## Security and release gates

No new external service calls or production access. Existing one-assessment, one-entity, 10-file, 25 MB/file, 150-page, architecture-metadata-only restrictions remain unchanged. No raw customer records, secrets, or production connectors introduced. Evidence page coordinates are now stricter. Full definition of done remains open pending clean dependency install, full tests, build, typecheck and live isolation certification.

## Canonical GitHub synchronization

`main` remains design-only. A dedicated branch `agent/recover-baseline-pdf-page-tree-2026-10-09` now contains the **last published** application baseline plus page-tree hardening and regression tests. That GitHub branch is **not yet identical** to this complete local ZIP (it lacks some recent local application increments). GitHub's PR-creation action was blocked by write-safety checks, so no new PR was opened. Do not merge until full ZIP-to-branch reconciliation and release-gate completion.
