# Validation record — 2026-10-16

## Implemented local increment

Source-only canonical recovery manifest, byte-for-byte GitHub tree comparison, deterministic ZIP packaging, and manifest-gated manual publish script. The primary user-facing assessment → upload → extraction → diagnostics → map → report flow is unchanged. Decision: `project/DECISION_078.md`.

## Results (Node 22.16.0, Python 3, offline runner)

- Recovery manifest/package tests: **10/10 passed** (8 inventory/compare, 2 ZIP/security).
- Focused recovery + parser + PDF font/filter + upload + graph tests: **98/98 passed**.
- Full `npm test`: **210/234 passed, 24 failed** (missing installed dependencies and Node module resolution; not a green suite).
- `npm run lint`: **passed**.
- JSON schema syntax: **19/19 valid** (not full runtime schema validation).
- `bash -n scripts/publish-recovery.sh`: **passed**.
- `npm run baseline:check`: **blocked** — `package-lock.json` root dependency list lacks `better-sqlite3@12.10.1`.
- `npm ci --offline --ignore-scripts --include=dev`: **blocked** — no cached native dependency metadata.
- `npm run typecheck`: **failed** — missing installed Next.js, Zod and related dependencies.
- `npm run build`: **failed** — `next` unavailable.
- Tenant isolation: mocked code-level coverage exists; direct `tests/tenancy.test.mjs` could not load dependencies. **Live two-tenant PostgreSQL/RLS, private-bucket and scanner validation not executed**.
- Canonical `main` read via connected GitHub API: **four design-only files**, so full application recovery is not complete.

## Security/release boundaries

The snapshot includes source files only, rejects symlinks and unexpected types, excludes local `.env` secrets and generated state, and does not access customer records or production systems. The application retains its server-side MVP upload limits. No production deployment, merge, or release certification was performed.

## Next gates

1. Publish and verify every approved source file on a dedicated GitHub branch; open a draft PR and compare the branch's recursive Git tree to the manifest.
2. Obtain authentic npm registry metadata, regenerate the lockfile, and run `npm ci` and full build/type/lint/tests in a networked Node 22 runner.
3. Run live tenant-isolation, private storage and scanner tests before accepting confidential inputs.

## Canonical parity and publication attempt

- `main` recursive tree (GitHub API, 2026-10-16): 4 blobs; approved local source tree: 337 files. The offline parity comparison reports **333 missing remote files and 3 changed remote files**. The fourth remote file is byte-identical. This is a failed canonical-sync gate, not a release candidate.
- Created `agent/recovery-manifest-2026-10-16` from the October 15 recovery branch. GitHub connector write-safety checks blocked source-file creation (including the ZIP builder and decision document) and draft-PR creation. The branch therefore **does not contain this increment**, and no draft PR exists.
- The complete tested increment is preserved in the local ZIP; manual manifest-gated publication remains available from an authenticated networked environment.
