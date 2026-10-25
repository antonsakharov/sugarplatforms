# 2026-10-13 build validation — fixed-width two-byte ToUnicode

## Scope

Restored the latest approved 2026-10-12 working package locally because canonical `main` still lacks the application/package baseline and multiple required documents. Implemented bounded two-byte ToUnicode CMap decoding in the local/demo PDF pipeline, preserving verified page evidence and fail-closed behavior. No deployment.

## Validation

| Check | Result |
| --- | --- |
| Focused parser, CMap, font-resources, upload, graph | **85/85 passed** |
| Complete suite, run with `--test-concurrency=2` | **186 passed / 24 failed / 210 total** |
| Targeted tenancy/content-policy/malware/upload | **17 passed / 1 failed**; tenancy test blocked by module resolution |
| Source-policy lint | **Passed** |
| JSON schema syntax | **19/19 parsed** |
| TypeScript focused check | Earlier source revision passed; final revision timed out and is **not certified** |
| Full TypeScript check | **Not certified**; missing dependency types and timeout |
| Production build | **Failed**: `next: not found` |
| Offline npm install | **Failed**: `better-sqlite3` not cached (`ENOTCACHED`) |
| Live tenant isolation / storage / scanner | **Not run**; no managed credentials or infrastructure |

The 24 suite failures are consistent with missing `zod`, `better-sqlite3`, and Node-native TypeScript path/module-resolution issues; they are not presented as passing. `package-lock.json` is not synchronized with `package.json`: the pinned native `better-sqlite3` entry is absent. Do not fabricate integrity hashes; repair the lockfile in a networked environment before full CI.

## Evidence and security checks

- Two-byte source codes are big-endian and only interpreted with an explicit selected-font ToUnicode CMap.
- `bfchar`, bounded BMP `bfrange`, exact-length arrays, literal operands and `TJ` arrays are tested.
- Odd-length text bytes, unknown glyphs, mixed-width CMaps, invalid ranges, CMap inheritance, and oversized Unicode mappings fail closed.
- Page evidence still requires verified `/Catalog → /Pages → /Kids → /Page → /Contents` provenance.
- MVP limits remain one focused assessment, one primary entity, 10 files, 25 MiB each, 150 measurable pages, architecture metadata only; no customer data, credentials, secrets or live production access.

## GitHub status

Canonical `main` was read first and remains design-only/incomplete. Created `agent/pdf-two-byte-cmap-2026-10-13` from the existing recovery branch. GitHub file publication was blocked by connected integration safety checks, so the new branch does **not** contain today's implementation and no draft PR was opened. The full reviewed local working package is the dated ZIP backup, not a published GitHub increment. Use the included `scripts/publish-recovery.sh` dry-run-first workflow from a networked, authenticated workstation to restore the complete package to a dedicated branch and open a draft PR. Do not merge until CI and security gates pass.

## Next

1. Restore the full approved package to a dedicated GitHub branch and open a draft PR without merging.
2. Regenerate `package-lock.json` with network access; install pinned dependencies and certify full build/type/lint/test suite.
3. Continue production PDF adapter coverage with filtered ToUnicode CMaps or mixed-width codespaces while preserving provenance, then certify live two-tenant isolation before confidential inputs.
