# Validation record — 2026-10-15

## Increment

FND-LOCK-GATE: dependency-free canonical baseline/lockfile parity checker, seven negative/positive regression cases, CI `npm ci` enforcement, and a non-blocking warning in the manual draft recovery publisher. Root `package-lock.json` engine metadata was reconciled to `package.json` (`>=20.20.2`); no npm integrity data was invented.

## Results (local working backup)

| Check | Result |
| --- | --- |
| `node --test tests/check-baseline.test.mjs` | **7 passed / 7** |
| Parser/CMap/upload/graph + baseline focused suite | **99 passed / 99** |
| `npm test` | **200 passed / 24 failed / 224** |
| `npm run lint` | Passed |
| JSON schema syntax | 19/19 valid |
| `node scripts/check-baseline.mjs --json` | **Blocked**: `better-sqlite3@12.10.1` absent from root lockfile dependency table |
| `npm ci --offline --ignore-scripts --no-audit --no-fund` | Blocked: `ENOTCACHED` for `better-sqlite3` |
| `npm run typecheck` | Failed: dependencies absent (`zod`, React/Next types) plus unverified downstream errors |
| `npm run build` | Failed: `next` command unavailable |
| Static tenant/security tests | Partial: 2 passed / 2 failed (module resolution); no live two-tenant checks |

The broader 24 failures include unavailable `zod`/`better-sqlite3` and unresolved TypeScript aliases/extensionless imports in Node's native runner. They must not be described as all caused solely by missing dependencies.

## GitHub

Canonical `main` is still design-only. A new branch `agent/canonical-baseline-gate-2026-10-15` was created from the October 14 recovery branch. ADR-077 and a **smaller** baseline-check script were published, but connector write-safety blocked publishing the complete local checker and CI/package updates. Draft PR creation was attempted and blocked. The remote branch is **not** the complete local increment and is **not** merge-ready. No production deployment.

## Next release gates

1. Reconcile the complete latest backup into one reviewable GitHub draft PR without overwriting newer canonical changes.
2. Regenerate `package-lock.json` using real npm registry metadata and verify `npm ci`.
3. Run full typecheck, lint, tests, optimized build, and live tenant/database/private-storage isolation checks.
4. Keep unsupported PDF font/OCR/layout cases fail-closed and source-addressable.
