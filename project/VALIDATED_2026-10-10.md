# Local validation — 2026-10-10

## Increment

Bounded PDF one-byte `/ToUnicode` `bfchar` decoding for directly declared page fonts selected by `Tf`, preserving provable physical page coordinates and failing closed for unmapped/unsupported glyphs.

## Executed checks

- PDF parser suite: **35/35 passed**, including seven new CMap regression cases.
- Parser + upload + entity/ID graph suites: **46/46 passed**.
- Complete behavioral suite: **171 discovered, 147 passed, 24 failed**. The failures are pre-existing missing-dependency/module-resolution cases (`zod`, `better-sqlite3`). Not certified.
- Source-policy lint: **passed**.
- JSON Schema Draft 2020-12 meta-schema checks: **19/19 passed**.
- Focused TypeScript check of `lib/artifact-parser.ts`, `lib/pdf-text-operand-decoder.ts`, `lib/pdf-to-unicode.ts`, and `lib/pdf-page-tree.ts` using installed global Node type declarations: **passed**.
- Full TypeScript check: **failed** (missing Next/React/Node dependencies in this runner).
- Next.js production build: **not runnable** (`next: not found`).
- Live authenticated two-tenant PostgreSQL/RLS and private-storage checks: **not run** (no configured test infrastructure/credentials).

## Open release gates

Synchronize the npm lockfile with `package.json`, install all dependencies in a networked CI runner, execute `npm run validate`, run authenticated two-tenant isolation and private-bucket checks, and reconcile the complete application with canonical `main` through a reviewed draft PR. No production deployment was attempted.
