# Managed extraction-review persistence

When `PERSISTENCE_PROVIDER=supabase-postgres`, extraction-review reads and writes use the verified end-user Supabase JWT through PostgREST. The application never uses a service-role credential for tenant-bearing review state.

Migration `004_extraction_review_rls.sql` adds the tenant-scoped `extraction_reviews` table, forced RLS, member reads, editor/admin writes, and the `save_extraction_review` `SECURITY INVOKER` RPC. The RPC compares the current persisted extraction JSONB with the exact extraction boundary reviewed by the user before committing review state. A processing change therefore makes an in-flight review save fail closed rather than approving a newer extraction accidentally.

The application also retains the SHA-256 extraction fingerprint used by the existing review contract. The JSONB equality check is the database-side race guard; the fingerprint remains the stable application/version identifier and stale-state signal.

Local/demo mode continues to use SQLite. Live Supabase two-tenant validation remains required before confidential production use.
