# Build validation — 2026-10-08

## Scope

PDF text operand decoding and bounded stream decompression in the credential-free local/demo parser, preserving source-addressable evidence. Latest approved local package is based on the 2026-10-07 backup; canonical GitHub `main` is still design-only. The 2026-10-08 agent branch was created from the latest discoverable full GitHub application branch (2026-09-28), but not all subsequent local changes are published there.

## Results

- `node --experimental-strip-types --test tests/parser.test.mjs`: **20/20 pass**.
- `node --experimental-strip-types --test tests/parser.test.mjs tests/upload.test.mjs tests/entity-id-graph.test.mjs`: **31/31 pass**.
- `npm test`: **132 pass / 24 fail / 156 total**; failures originate from unavailable `zod` and `better-sqlite3` dependencies in this runtime.
- `npm run lint`: **pass** (source policy checks).
- JSON schema syntax: **19/19 parse successfully**.
- `npm run typecheck`: **blocked/fail** because Node/React/Next and zod types are unavailable without installed dependencies.
- `npm run build`: **blocked/fail** (`next: not found`).
- `npm ci --offline --ignore-scripts --include=dev`: **blocked** (`ENOTCACHED` for `better-sqlite3`).
- Live Supabase RLS/storage two-tenant tests: **not run**, external isolated identities/infrastructure unavailable.

## Limitations

The bounded PDF parser supports only directly addressable page streams, ASCII or explicit UTF-16BE BOM strings, limited ASCIIHex/Flate filter combinations, and honest fragment fallback. It does not implement arbitrary font CMaps, OCR, layout reconstruction, signatures, or complete PDF syntax. Its 4 MiB per-stream expansion limit is intentionally conservative.

## Release gate

**NOT certified for production.** Restore the complete latest application tree and synchronized lockfile on the canonical branch, install dependencies, pass all tests/typecheck/build, and validate real two-tenant isolation before considering a merge or confidential-data deployment.
