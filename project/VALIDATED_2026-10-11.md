# Local validation — 2026-10-11

Feature: bounded one-byte ToUnicode CMap `bfrange` support.

| Check | Result |
| --- | --- |
| Parser regressions | 41/41 passed; standalone CMap 8/8 passed; parser/upload/graph/CMap 60/60 passed |
| Source-policy lint | Passed |
| JSON schema syntax | 19/19 valid |
| Complete test suite | 161/185 passed; 24 environment/module-resolution failures |
| TypeScript project check | Blocked by missing installed Next.js/dependency types |
| Production build | Blocked: `next` unavailable |
| Offline dependency install | Blocked: `better-sqlite3` absent from npm cache |
| Live tenant isolation | Not run; credentials unavailable |

## Boundaries

The feature is functional and tested in the local/demo parser. It does not imply full PDF font coverage, OCR, or production-ready handling of confidential data. `main` remains design-only. The new `agent/pdf-cmap-range-baseline-2026-10-11` recovery branch includes a bounded unfiltered selected-font integration and tests but still trails the full local filter-chain/parser package. GitHub draft PR creation was blocked by connector safety checks. Full working-tree publication remains pending.
