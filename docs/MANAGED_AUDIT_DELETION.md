# Managed audit and deletion persistence

This increment adds PostgreSQL/RLS tables and a verified-end-user-JWT read adapter for deletion audit receipts and durable reconciliation jobs.

Both tables force row-level security. Reads require exact admin workspace membership and application queries repeat organization/workspace scope explicitly. Audit inserts and job inserts/updates require the actor to match the authenticated user plus admin membership. The tables retain operational metadata only; they do not contain artifact content, evidence text, findings, or report bodies.

The existing SQLite deletion executor remains the working local/demo adapter. Managed execution is intentionally not activated until the deletion orchestrator is converted to provider-neutral write interfaces and real private-bucket deletion/reconciliation is certified with two isolated Supabase tenants. This prevents a mixed managed/local deletion path from being represented as production-ready.
