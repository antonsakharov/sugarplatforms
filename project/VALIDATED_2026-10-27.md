# Validation — 2026-10-27

Feature: PAR-005b14, bounded PDF 1.5 xref stream validation (Decision 091).

- `node --experimental-strip-types --import ./scripts/register-test-loader.mjs --test tests/pdf-xref-stream.test.mjs tests/pdf-object-streams.test.mjs tests/parser.test.mjs tests/pdf-page-tree.test.mjs`: 66/66 passed locally.
- `npm run lint`: passed.
- `npm run baseline:check`: passed (11 required files).
- `npm test`: 292 passed / 24 failed before this documentation update, due to unavailable local npm packages/native modules; not a release pass.
- `npm ci --offline --ignore-scripts`: blocked by uncached `zod@4.0.17`; full local typecheck/build cannot be certified.
- Live authenticated two-tenant PostgreSQL, private storage, and malware scanner isolation: not executed; infrastructure unavailable.
- PDF stream integrity tests cover direct offsets, compressed indexes, malformed W/Index/Size/Root, unsupported filters, multiple revisions, and compatibility with minimal demo PDFs.

Networked GitHub CI must pass after publication before treating the increment as dependency-backed validated. The PR must remain draft and unmerged; no production deployment.
