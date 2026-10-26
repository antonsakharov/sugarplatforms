# Validation — 2026-09-22

Feature: managed PostgreSQL/RLS immutable report history.

Validated on GitHub Actions run 35749489529 with Node 22.23.2. `npm run validate` passed: TypeScript typecheck, source-policy lint, 195/195 tests, and the optimized Next.js 15.4.10 production build. Packaging and artifact upload also passed.

Feature-specific coverage verifies JWT-authenticated tenant-filtered report reads, assessment/report-scoped lookup, atomic database-side version allocation, forced RLS, editor/admin write authorization, SECURITY INVOKER execution, current completed-finding-review provenance binding, and absence of service-role bypass.

Live two-tenant Supabase validation remains blocked on isolated authenticated non-BYPASSRLS credentials. Generated PDF bytes remain request-scoped; managed private generated-report object storage is the next report-production slice.
