# Managed Report History

When `PERSISTENCE_PROVIDER=supabase-postgres`, report history uses Supabase PostgreSQL/PostgREST with the verified end-user JWT. The local SQLite repository remains the credential-free demo adapter.

## Security and provenance

All report reads include organization, workspace, assessment, and where applicable report ID filters. PostgreSQL RLS independently requires workspace membership. Writes require editor/admin membership and execute through the `SECURITY INVOKER` `save_report_snapshot` RPC; no service-role bypass is used.

The RPC requires a completed finding review for the same tenant and assessment, verifies the report `generatedFromDiagnosticAt` against the currently persisted diagnostic generation timestamp, and allocates the next immutable version under a transaction advisory lock. This prevents stale report publication and concurrent duplicate versions.

PDF export resolves the immutable snapshot through the same selected persistence provider before rendering. Generated PDF bytes remain request-scoped in this increment; private generated-report object storage is not yet activated.

## Production gate

Apply migrations through `006_report_history_rls.sql` in order. Before confidential production use, run live two-tenant tests with authenticated non-`BYPASSRLS` users proving cross-tenant list/read/write/PDF lookup denial. Those tests require isolated Supabase credentials and are not simulated by the local build.
