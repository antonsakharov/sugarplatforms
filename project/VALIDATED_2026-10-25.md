# Validation — 2026-10-25 — Native npm lock recovery

## Scope

Recovered the missing pinned `better-sqlite3@12.10.1` dependency closure using published npm v3 lockfile SHA-512 integrity metadata, strengthened the dependency-free baseline supply-chain gate, and added three regression tests. Source of pinned metadata: `oliverjessner/sqlite-hub`, commit `818a59e3b68fd377cda6f474b12dd1a44b64c6f2`, `package-lock.json`. See Decision 087.

## Validation performed

- `node scripts/check-baseline.mjs`: **PASS**, all 11 baseline files present; root lock parity, registry allowlist, SRI format and required dependency closure pass.
- `node --test tests/check-baseline.test.mjs`: **10/10 PASS**, including malformed SRI, untrusted registry URL, missing transitive dependency and nested package coverage.
- `npm ci --offline --ignore-scripts --dry-run --no-audit --no-fund`: **PASS**, npm reports 94 packages in the dry-run plan. This is a lockfile consistency check, **not** an installation.
- `npm ci --offline --ignore-scripts --no-audit --no-fund`: **BLOCKED locally** (`ENOTCACHED`); **PASS in GitHub Actions** with authenticated registry tarballs and SRI verification.
- `npm run lint`: **PASS**.
- `python3 -m unittest discover -s tests -p test_publish_recovery_api.py -v`: **10/10 PASS**.
- JSON syntax checks: **19/19 schemas valid**.
- `npm run typecheck`: **BLOCKED locally** (dependencies unavailable); **PASS in GitHub Actions** after clean `npm ci`.
- `npm run build`: **BLOCKED locally** (Next.js unavailable); **PASS in GitHub Actions**, compiled successfully and generated 13 static pages.
- `npm test`: **264/288 passed locally; 24 failed** from missing native dependencies. **365/365 PASS in GitHub Actions** with dependencies installed and the Node test-only alias loader.
- Live two-tenant PostgreSQL/storage/scanner isolation: **NOT EXECUTED**, no production credentials or services available.

## Canonical GitHub recovery publication

- Dedicated branch: `agent/canonical-recovery-lockfile-2026-10-25`.
- Draft PR: `https://github.com/antonsakharov/sugarplatforms/pull/56` (open, draft, not merged).
- Published candidate Git tree contained **369 blobs**: all 368 manifest-listed source files plus `recovery-manifest.json`. Recursive Git blob comparison: **368/368 matching**, zero missing, modified, or unexpected paths; the published branch commit's tree SHA was verified against the staged tree.
- `main` was not modified. The first networked CI run passed a real `npm ci` and baseline verification but exposed a TypeScript `Buffer<ArrayBuffer>` inference mismatch in the PDF filter chain; the decoder variable is now explicitly typed `Buffer` for cross-adapter assignments. The next CI run passed full TypeScript checking and source lint, but the Node native test runner could not resolve `@/lib/*` imports; a restricted test-only ESM alias loader (Decision 088) is now included. Networked GitHub CI then passed TypeScript and lint and **360/361 tests**; the remaining failure was an extensionless relative `./base-path` import inside `lib/client-reviewed-state.ts`. The test loader now handles such imports only inside `lib/`, with a traversal regression. Final GitHub Actions run **passed**: authentic `npm ci`, full TypeScript check, lint, **365/365 tests**, and Next.js production build; both push and PR workflows succeeded on commit `c56bdfc79a4b9e9d1e20c26197bfe443703e55e3`. A subsequent documentation-only CI rerun exposed a nondeterministic SQLite audit ordering test: equal-millisecond request/failure events were sorted by random UUID. Decision 089 now uses SQLite insertion `rowid` as the timestamp tie-breaker with an explicit regression; the final networked GitHub Actions run **passed 366/366 tests**, typecheck, lint, real `npm ci` and Next.js build on commit `fbdbe17806f93b0dc3cca4c91ccc4b57b354e560` (both push and PR workflows green). Live production security certification remains a separate release gate.

## Release assessment

Lockfile consistency, complete GitHub source parity, real `npm ci`, type checking, lint, all tests and production build are **verified**. Release certification is **not complete** because live authenticated non-`BYPASSRLS` tenant isolation, private storage and malware scanner integration remain untested. Do not merge/deploy until those security gates pass. No production deployment or customer-record ingestion occurred.

## Final CI confirmation

- Commit: `fbdbe17806f93b0dc3cca4c91ccc4b57b354e560`.
- GitHub Actions push run `40206654810`: **SUCCESS**.
- GitHub Actions draft PR run `40206657702`: **SUCCESS**.
- Real `npm ci`: **PASS**; TypeScript: **PASS**; lint: **PASS**; tests: **366/366 PASS**; Next.js build: **PASS**, 13 static pages generated.
- Draft PR #56 remains open, unmerged, undeployed. Live production tenant/storage/scanner security certification remains outstanding.
