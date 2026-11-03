# Validation — 2026-10-14

## Scope

Bounded PDF stream decoder, compressed/ASCIIHex-filtered ToUnicode CMaps, and byte-faithful compressed page content. No production deployment or live external services.

## Results

- Focused parser/CMap/upload/entity-map suites: **97 passed, 0 failed**.
- New filtered-stream regressions: **7 passed, 0 failed**.
- Complete suite: **217 tests, 193 passed, 24 failed**. Existing failures require unavailable `zod`/`better-sqlite3` or other dependencies and are not considered a release pass.
- Source-policy lint: **passed**.
- JSON schema syntax: **19 valid**.
- Full TypeScript: **blocked** by unavailable Next.js and Node type dependencies.
- Production build: **blocked** (`next: not found`).
- Offline lockfile repair: **blocked** (`better-sqlite3@12.10.1` not in npm cache). Existing package-lock remains out of sync and must not be used as a certified reproducible lockfile.
- Live managed tenancy/storage/scanner isolation: **not executed** (no isolated service credentials).

## GitHub state

Canonical `main` was re-read before feature work and remains design-only, missing the application and baseline docs. The previously published `agent/pdf-cmap-range-baseline-2026-10-11` branch contains an older recovered application, not the complete 2026-10-14 package. A new recovery branch was created, but connected GitHub safety checks blocked source publication and draft-PR creation. This local package is the complete approved working snapshot; it has not been published as a complete GitHub increment.

## Manual reproduction

With Node 22 and dependencies installed: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. To exercise the bounded parser without external services: `node --experimental-strip-types --test tests/pdf-stream-filters.test.mjs tests/parser.test.mjs tests/pdf-font-resources.test.mjs`.
