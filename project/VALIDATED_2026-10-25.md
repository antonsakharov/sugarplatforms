# Validation — 2026-10-25 — Native npm lock recovery

## Scope

Recovered the missing pinned `better-sqlite3@12.10.1` dependency closure using published npm v3 lockfile SHA-512 integrity metadata, strengthened the dependency-free baseline supply-chain gate, and added three regression tests. Source of pinned metadata: `oliverjessner/sqlite-hub`, commit `818a59e3b68fd377cda6f474b12dd1a44b64c6f2`, `package-lock.json`. See Decision 087.

## Validation performed

- `node scripts/check-baseline.mjs`: **PASS**, all 11 baseline files present; root lock parity, registry allowlist, SRI format and required dependency closure pass.
- `node --test tests/check-baseline.test.mjs`: **10/10 PASS**, including malformed SRI, untrusted registry URL, missing transitive dependency and nested package coverage.
- `npm ci --offline --ignore-scripts --dry-run --no-audit --no-fund`: **PASS**, npm reports 94 packages in the dry-run plan. This is a lockfile consistency check, **not** an installation.
- `npm ci --offline --ignore-scripts --no-audit --no-fund`: **BLOCKED** (`ENOTCACHED`, missing tarballs such as `zod@4.0.17`). Network access is unavailable.
- `npm run lint`: **PASS**.
- `python3 -m unittest discover -s tests -p test_publish_recovery_api.py -v`: **10/10 PASS**.
- JSON syntax checks: **19/19 schemas valid**.
- `npm run typecheck`: **BLOCKED**, dependency type declarations and Next.js are not installed.
- `npm run build`: **BLOCKED**, Next.js binary is not installed.
- `npm test`: **264/288 passed; 24 failed**, all failures in dependency-backed modules with missing `node_modules`. No new baseline-gate or publisher regressions.
- Live two-tenant PostgreSQL/storage/scanner isolation: **NOT EXECUTED**, no production credentials or services available.

## Canonical GitHub recovery publication

- Dedicated branch: `agent/canonical-recovery-lockfile-2026-10-25`.
- Draft PR: `https://github.com/antonsakharov/sugarplatforms/pull/56` (open, draft, not merged).
- Published candidate Git tree contained **369 blobs**: all 368 manifest-listed source files plus `recovery-manifest.json`. Recursive Git blob comparison: **368/368 matching**, zero missing, modified, or unexpected paths; the published branch commit's tree SHA was verified against the staged tree.
- `main` was not modified. The first networked CI run passed a real `npm ci` and baseline verification but exposed a TypeScript `Buffer<ArrayBuffer>` inference mismatch in the PDF filter chain; the decoder variable is now explicitly typed `Buffer` for cross-adapter assignments. The next CI run passed full TypeScript checking and source lint, but the Node native test runner could not resolve `@/lib/*` imports; a restricted test-only ESM alias loader (Decision 088) is now included. Networked GitHub CI then passed TypeScript and lint and **360/361 tests**; the remaining failure was an extensionless relative `./base-path` import inside `lib/client-reviewed-state.ts`. The test loader now handles such imports only inside `lib/`, with a traversal regression. Full CI rerun remains a release gate.

## Release assessment

Lockfile metadata consistency is repaired but release certification is **not complete**. Do not merge/deploy until complete GitHub source parity, networked `npm ci`, type checking, full tests, build, and live authenticated tenant isolation pass. No production deployment or customer-record ingestion occurred.
