# Validation record — 2026-10-12

Increment: nearest-first inherited PDF page font resources, with direct/indirect `/Resources` and `/Font` dictionaries and fail-closed selected-font validation.

- Focused parser, CMap, inherited-font, upload and graph tests: **71/71 passed**.
- Complete `npm run test`: **200 tests, 176 passed, 24 failed**. Existing dependency/module-resolution failures (`zod`, `better-sqlite3`, related imports) remain; no release certification.
- `npm run lint`: **passed**.
- JSON syntax checks: **19/19 schema files valid**.
- `npm run typecheck`: **failed**, dependency and Node type declarations unavailable.
- `npm run build`: **failed**, `next` not installed.
- Live tenant-isolation tests: **not executed**; no configured managed infrastructure.
- The lockfile still lacks `better-sqlite3@12.10.1`; offline cache cannot supply the missing native package. Do not synthesize lockfile integrity data.
- MVP upload limits and architecture-only rules unchanged. No live production access or deployment.
- GitHub `main` was read before implementation and still lacks the application and required baseline documents. A new agent branch `agent/pdf-inherited-font-resources-2026-10-12` was created from the latest recovery branch, but connected write-safety checks blocked both code/document publication and draft-PR creation. **The new branch does not contain this increment** and must not be merged. The dated full backup and the opt-in manual recovery script preserve the complete implementation.
