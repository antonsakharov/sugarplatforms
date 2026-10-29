# Validation — 2026-10-20

## Scope

Decision 082: bounded prefix-unambiguous mixed-width PDF ToUnicode source codes, width-matched `bfchar`/`bfrange`, and page-backed evidence with fail-closed unknown glyphs.

## Executed checks

- Mixed-width PDF codespace, ToUnicode and parser tests: **73/73 passed**.
- Extended PDF/parser/upload/malware/content-policy/graph/auth-migration tests: **133/133 passed**.
- Assessment, extraction, deterministic diagnostics, review, reporting and versioning tests: **37/37 passed**.
- Source-policy lint: **passed**.
- Focused TypeScript check on the three modified PDF modules: **passed** with a temporary `Buffer` ambient declaration because project `@types/node` is unavailable. This is not full type certification.
- JSON syntax of 19 schema files: **valid** (syntax only, not full schema semantic validation).
- Full TypeScript: **blocked** by unavailable Next.js and Node dependency types.
- Production build: **blocked** because `next` is unavailable.
- Baseline check: **blocked** because `package-lock.json` lacks genuine `better-sqlite3@12.10.1` metadata.
- `npm view better-sqlite3@12.10.1`: **blocked** by DNS failure (`EAI_AGAIN`). No lockfile metadata was invented.
- Live two-tenant PostgreSQL/RLS, private storage and scanner isolation: **not executed**; no production credentials/services.
- GitHub: `main` remains a design-only baseline with required files missing. A new branch `agent/pdf-mixed-width-cmap-2026-10-20` was created from the previous recovery branch, but connected GitHub safety checks blocked source publication. No draft PR was opened, no merge/deploy performed. The complete increment is included in the ZIP backup.

## Full-suite and package results

Full suite after regenerating the recovery manifest: **233/257 passed, 24 failed**. The remaining failures are test files requiring unavailable npm dependencies/module resolution (`zod`, `better-sqlite3`, and related modules); no new PDF or recovery-publisher failures. Recovery manifest: **350 source files**, verified locally. Re-run packaging and manifest verification after any additional documentation edits.
