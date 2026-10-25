# Validation — 2026-10-17 atomic GitHub recovery publisher

## Scope

Restored the latest approved 2026-10-16 source backup (337 files plus recovery manifest), read the canonical GitHub `main` metadata and nine required baseline paths, and implemented a no-write-by-default, Git Data API complete-source recovery publisher. No diagnostic runtime/UI flow was changed. One assessment, one primary entity, 10 files, 25 MB/file, 150 measurable pages, architecture-metadata-only and no production access remain the application MVP limits.

## Results

- Offline Python GitHub publication contracts: **10/10 passed**. They cover multi-batch tree staging, full tree parity, stale-main abort, branch restrictions, chunk bounds, duplicate/truncated remote trees and draft PR state.
- New Node integration wrapper: **1/1 passed**.
- Focused parser, PDF font/CMap/filter, upload, graph, baseline, snapshot/ZIP, publisher tests: **106/106 passed**.
- Full `npm test`: **211 passed, 24 failed, 235 total**. Failures remain in dependency-backed persistence/auth/storage tests due to missing `zod`/`better-sqlite3` and Node native TypeScript path/alias resolution. Do not count as a passing suite.
- `npm run lint`: **passed** (source-policy lint).
- `npm run baseline:check`: **blocked** — root lockfile is missing pinned `better-sqlite3@12.10.1` parity.
- `npm ci --offline --ignore-scripts`: **blocked** — `ENOTCACHED` for `better-sqlite3`.
- `npm run typecheck`: **failed** — missing dependencies/types and cascading diagnostics.
- `npm run build`: **failed** — `next` unavailable.
- All **19** `schemas/*.json` files parse as valid JSON (not a full semantic schema conformance check).
- Recovery manifest generation and verification: **passed**.
- Publisher dry run: **passed**, with no remote writes.
- Network: npm registry DNS lookup failed (`EAI_AGAIN`); git clone DNS lookup for GitHub failed. No GitHub REST token available in the container.
- Connected GitHub: created `agent/atomic-recovery-publisher-2026-10-17` from the October 16 recovery branch; source/ADR write and draft PR creation were blocked by integration safety checks. **The branch does not contain this increment; no draft PR exists.**
- Live two-tenant PostgreSQL/RLS, private storage, malware scanner isolation: **not executed** (credentials/infrastructure unavailable).
- Production deployment: **none**.

## Release status

The publisher is implemented and validated in the complete local backup but not remotely published or release-certified. Canonical `main` remains the original four-file design baseline; the October 16 recovery branch contains 285 source blobs and is incomplete relative to the current approved package. Do not merge incomplete branches. Next: publish complete source and verify GitHub tree parity, regenerate the lockfile from authentic npm metadata, pass full dependency-backed CI, and run live two-tenant isolation tests.
