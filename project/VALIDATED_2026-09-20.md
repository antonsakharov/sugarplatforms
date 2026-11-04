# Validation — 2026-09-20

Increment: managed PostgreSQL/RLS extraction-review persistence.

The authoritative gate is GitHub Actions `npm run validate` on Node 22 after publishing the branch. Feature-specific checks cover tenant-filtered JWT reads, atomic RPC writes, stale-fingerprint rejection before network I/O, forced RLS, editor/admin write policy, and database-side exact-extraction staleness enforcement.

Live Supabase two-tenant integration validation remains blocked on real isolated credentials/infrastructure and is not simulated.
