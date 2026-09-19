# Validation — 2026-09-19

Feature: managed PostgreSQL/RLS persistence for artifact metadata, source segments, and extraction snapshots.

The automation runtime cannot install repository dependencies, so GitHub Actions on Node 22 is the authoritative validation gate. The branch adds managed-processing contract/RLS tests and must pass typecheck, source-policy lint, the complete test suite, optimized Next.js build, packaging, and artifact upload before this increment is marked complete.
