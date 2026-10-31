# Validation record — 2026-10-31

## Feature

PAR-005b18: bounded PDF 1.5 cross-reference stream `/Info` and `/ID` compatibility (Decision 095).

## Implemented

- Strict flat xref-stream dictionary grammar, duplicate/unknown field rejection, 4-KiB header bound, and explicit required/optional keys.
- Optional direct, live, generation-zero `/Info` metadata dictionary verification after xref entry integrity checks.
- Optional two-element 16–64-byte hexadecimal `/ID` array validation without metadata-to-evidence promotion.
- Existing direct-offset, compressed-index, single-revision, Root Catalog and physical-page provenance gates remain enforced.
- Seven new regression tests covering valid metadata, compressed page-tree compatibility, invalid references, duplicate/malformed fields, revisions, object offsets, and oversized dictionaries.

## Validation results (local)

- New and existing xref-stream tests: **17/17 passed**.
- Focused PDF/parser/upload/graph tests: **147/147 passed**.
- Source lint: **passed**.
- Full local test suite: **323 passed, 24 failed**; missing installed dependencies and module-resolution in the offline environment, not feature-specific failures.
- `npm ci`: timed out with unavailable registry network; local dependency-backed typecheck and Next.js build could not be certified.
- JSON schema syntax and recovery-manifest verification: run after documentation update.
- Live authenticated two-tenant managed PostgreSQL/RLS, private storage and malware-scanner checks: **not run** (no provisioned services or credentials).

## Publication/release gates

Publish a full hash-verified source snapshot on a dedicated agent branch and open a **draft** PR to `main`. CI must be observed after publication; do not infer green CI from previous branches. Never merge or deploy automatically. Live production security certification remains mandatory.
