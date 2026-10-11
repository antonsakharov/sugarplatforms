# Validation — 2026-10-11

- Local full working backup: PDF parser 41/41 passed, PDF CMap module 8/8 passed, parser/upload/graph 52/52 passed.
- Source-policy lint passed; 19 JSON schemas parse.
- Full test suite before standalone tests: 153/177 passed; 24 dependency or native-module-resolution failures. Standalone tests add 8 passing cases.
- Typecheck blocked by missing dependencies; build blocked (`next` unavailable); offline npm install fails because `better-sqlite3` is not cached.
- Live Supabase tenant isolation not executed. No production deployment.
- This GitHub branch includes bounded unfiltered selected-font CMap integration and two parser regressions, but still lacks the full newer local PDF filter-chain implementation and test suite. It is not merge-ready.
