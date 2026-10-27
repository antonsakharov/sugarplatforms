# Validation — 2026-09-25

Feature: managed PostgreSQL/RLS audit and deletion-job persistence foundation.

Feature-specific checks cover end-user JWT propagation, explicit tenant filters, bounded job listing, forced RLS, admin-only policies, and fail-closed missing-JWT behavior. The full GitHub Actions npm run validate gate remains authoritative. Live two-tenant Supabase database/storage certification remains blocked on isolated infrastructure credentials.
