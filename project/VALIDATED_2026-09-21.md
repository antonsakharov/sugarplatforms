# Validation — 2026-09-21

Increment: managed PostgreSQL/RLS finding-review persistence and accepted-finding materialization.

The branch validation target is the repository `npm run validate` CI gate. Focused provider/migration tests added in this increment cover JWT propagation, explicit tenant filters, stale diagnostic fingerprints, extraction-review staleness, forced RLS, editor/admin write authorization, SECURITY INVOKER behavior, and atomic accepted-finding persistence.

Live Supabase two-tenant isolation remains blocked on isolated credentials and is not represented as complete.
