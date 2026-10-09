# Validation — 2026-09-17

Feature: complete request-scoped production-auth migration across protected API routes.

Validation target: Node 22 CI. The route migration adds a static regression test that fails if any protected route calls the local-only authorization overload. Full CI must pass type checking, source-policy lint, all tests, optimized Next.js build, packaging, and artifact upload before this increment is considered complete.

Live Supabase/PostgreSQL identity and cross-tenant validation remains credential-dependent and is not represented as complete.
