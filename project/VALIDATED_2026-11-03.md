# Validation — 2026-11-03 — PAR-005b21

## Feature and scope

Bounded sparse PDF xref-stream `/Index` range support for the credential-free local/demo adapter (Decision 098). No new upload permissions, external services, tenant privileges or production deployment.

## Test plan

- Focused xref-stream tests: positive direct/compressed page evidence, optional Info/ID, lexical comments, malformed and overlapping ranges, omitted live objects, invalid offsets/indexes, object-zero free state, decoded length and prior zero-width behavior.
- Parser/page-tree/object-stream/upload/graph regression suites, source lint, baseline, schema syntax, source-manifest verification.
- Full dependency-backed `npm ci && npm run validate` in GitHub Actions when available.
- Live authenticated non-bypass PostgreSQL/RLS, private-storage and malware-scanner two-tenant checks remain blocked without provisioned services; do not represent local tests as live certification.

## Results

- Focused PDF xref/object-stream/parser/page-tree tests: **98/98 passed**.
- Upload/malware/graph regression tests: **24/24 passed**.
- Source lint and baseline: **passed**; JSON schema syntax: **19/19 valid**.
- Local full suite: **348 passed / 24 failed** (native SQLite, Next and Zod dependencies unavailable in isolated runtime; failures are not treated as feature passes).
- Local typecheck/build: **blocked** by unavailable npm dependencies; `npm ci --offline` reports `ENOTCACHED` for pinned `zod@4.0.17`.
- GitHub dependency-backed CI: **pending review-branch publication and run**.
- Live authenticated non-bypass two-tenant database/private-storage/malware tests: **not certified**.

