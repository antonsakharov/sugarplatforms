# Validation — 2026-09-18

Feature: Supabase PostgreSQL/RLS assessment persistence and membership-resolution adapter.

Validation gate: GitHub Actions on Node 22 runs type checking, source-policy lint, complete test suite, optimized Next.js build, repository packaging, and artifact upload. Focused tests cover JWT-authenticated managed assessment reads/writes, explicit tenant filters, exact membership resolution, fail-closed provider behavior, and Supabase JWT RLS policy content.

Live Supabase/PostgreSQL tenant-isolation execution is not available because project credentials and isolated test tenants are unavailable in the build environment. The live gate remains explicitly blocked rather than simulated.
