# Validation — 2026-10-22

## Scope

ADR-084: bounded default-EarlyChange PDF `/LZWDecode` (`/LZW`) page and selected-font ToUnicode decoding through the shared PDF stream filter pipeline. No deployment, new external services, upload-policy changes, or production customer-data access.

## Executed checks

| Check | Result |
| --- | --- |
| New LZW regression suite | **8/8 pass** |
| Focused parser/stream/upload/graph suite | **76/76 pass** |
| Assessment/upload/malware/graph/parser/LZW journey suite | **75/75 pass** |
| Full `npm test` suite | **249 pass, 24 fail** (273 total; missing external dependencies/module resolution) |
| Source-policy `npm run lint` | **Pass** |
| JSON schema file syntax | **19/19 valid** |
| Focused TypeScript for LZW/RunLength/shared filter with temporary Node type shim | **Pass** (temporary shim removed; not a full typecheck) |
| `npm run baseline:check` | **Blocked**: `package-lock.json` lacks root `better-sqlite3@12.10.1` dependency entry |
| Full `npm run typecheck` | **Blocked**: unavailable `@types/node`, Next.js, Zod, and other dependencies |
| `npm run build` | **Blocked**: `next` executable unavailable |
| npm registry access | **Blocked**: DNS `EAI_AGAIN` for `registry.npmjs.org` |
| Live authenticated two-tenant PostgreSQL/RLS, private storage, scanner checks | **Not run**: infrastructure/credentials unavailable |
| Canonical GitHub source parity | **Blocked**: default `main` contains 4 design files, local approved package contains more than 350 source files |

## Feature-specific assertions

- Standard clear/EOD, 9–12-bit MSB-first codes, dictionary growth/reset and the next-code special case.
- Binary payloads, empty streams, LZW/Flate chains, page content and selected-font ToUnicode maps.
- Fail-closed behavior for unsupported `/DecodeParms`, missing clear/EOD, truncated/undefined codes, nonzero trailing padding and over-budget decompression.
- Proven physical-page locators retained; malformed CMaps produce no synthetic evidence.
- Existing MVP one-assessment/one-entity/10-file/25-MB/150-page architecture-metadata-only boundaries are unchanged.

## Release status

**Not release-certified.** Complete canonical GitHub synchronization and draft recovery PR, authentic npm lockfile repair, dependency-backed build/typecheck/full suite, production PDF/OCR integration and live two-tenant security certification remain outstanding. This validation record does not assert those gates passed.

## GitHub publication attempt

The connected GitHub repository reports default branch `main` with only four baseline files. The agent branch `agent/pdf-lzw-evidence-2026-10-22` was created from the previous recovery branch, but a write attempt for `lib/pdf-lzw.ts` was blocked by the connected integration's safety checks. The remote branch remains at the parent tree (289 files), lacks the LZW implementation, and must **not** be considered synchronized or merge-ready. No draft PR was opened and no merge or deployment was performed. The verified ZIP is the complete current working-copy recovery artifact.
