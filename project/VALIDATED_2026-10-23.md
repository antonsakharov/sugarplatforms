# Validation — 2026-10-23

## Increment

Bounded direct `/FlateDecode` PNG Predictor 15 decoding for architecture PDF page streams and selected-font ToUnicode maps, with verified page evidence. This is a **local/demo PDF parser** improvement; it is not production PDF/OCR or release certification. Source baseline was restored from the 2026-10-22 approved recovery ZIP because canonical GitHub `main` has only four source files.

## Checks and results

- `node --experimental-strip-types --test tests/pdf-png-predictor.test.mjs tests/pdf-stream-filters.test.mjs tests/pdf-to-unicode.test.mjs tests/pdf-lzw.test.mjs tests/parser.test.mjs tests/upload.test.mjs tests/graph-projection.test.mjs`: **96/96 passed**.
- Focused journey tests (PNG parser, parser, upload, graph, Acme sample): **58/58 passed**.
- `npm test` after regenerating the source manifest: **255 passed, 24 failed** out of 279. Remaining failures are missing `zod`/`better-sqlite3`, TypeScript path/module resolution under the raw Node runner, and other pre-existing dependency-dependent tests; they are not certified.
- `python3 -m unittest discover -s tests -p test_publish_recovery_api.py -v`: **10/10 passed** after manifest regeneration.
- `npm run lint`: **passed**.
- `tsc --noEmit --strict --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions lib/pdf-png-predictor.ts lib/pdf-stream-filters.ts lib/pdf-runlength.ts lib/pdf-lzw.ts <temporary Node Buffer/zlib declaration shim>`: **passed**. This focused check is not the full project typecheck.
- `node --experimental-strip-types --check` on both changed PDF modules: **passed**.
- JSON parsing of all 19 `schemas/**/*.json` files: **passed**.
- `npm run baseline:check`: **blocked** — `package-lock.json` is missing the authentic `better-sqlite3@12.10.1` root dependency entry.
- `npm run typecheck`: **failed** — dependencies and types are not installed; this is not a release pass.
- `npm run build`: **blocked** — `next` executable is unavailable.
- npm registry fetch: **failed** (`EAI_AGAIN` DNS/network); no integrity metadata was invented.
- Live authenticated two-tenant PostgreSQL/RLS, private storage and malware scanner checks: **not executed** (infrastructure/credentials unavailable).

## GitHub publication

Canonical repository: `antonsakharov/sugarplatforms`, default branch `main`, only four source files at start of run. Created `agent/pdf-png-predictor-2026-10-23` from the prior incomplete recovery branch. Published `project/DECISION_085.md` and `lib/pdf-png-predictor.ts`; both Git blob hashes match the local files. Opened draft PR #54 against `main` explicitly marked **DO NOT MERGE**. This branch contains **291 source files**, not the complete approved source. The updated stream decoder, regression tests, remaining documents, and other missing application files are in the full ZIP only. The draft PR is **not merge-ready**.

## MVP/security regression

The parser does not introduce upload types, customer records, credentials, secrets or production connections. It retains one assessment, one primary entity, 10 files, 25 MiB per file and 150 measurable pages, existing scanner/quarantine, tenant-scoped persistence, accepted-finding evidence rules, and only verified page locators. Unsupported predictor parameters and malformed rows fail closed.

## Next required action

Restore the complete manifest-verified source to the review branch and verify recursive-tree Git blob parity. Regenerate `package-lock.json` using authentic npm registry metadata; run `npm ci && npm run validate` and live two-tenant security certification before any merge or production use. The next parser feature after these blockers is support for additional safely bounded PDF predictor configurations or a production PDF adapter.
