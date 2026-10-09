# Managed generated-report metadata

When `PERSISTENCE_PROVIDER=supabase-postgres`, generated PDF object metadata is persisted in `public.generated_report_objects` through PostgREST using the verified end-user Supabase JWT and the publishable key. The application does not use a service-role credential for this path.

Reads always include organization, workspace, assessment, and report identifiers. PostgreSQL RLS independently requires `auth.uid()` membership in the exact workspace. Inserts require editor/admin membership and the metadata row must reference an immutable `report_snapshots` row in the same tenant and assessment.

The PDF export route derives organization/workspace from the authenticated server context, resolves the immutable report through the selected report-history provider, renders deterministic bytes, stores those bytes through private tenant-scoped object storage, and then records checksum, size, page count, storage key, and report version. If metadata persistence fails, the newly written object is deleted best-effort to avoid an untracked object.

Local/demo mode continues to use SQLite metadata and private local object storage. Live confidential production use still requires two-tenant Supabase database/storage isolation validation with authenticated non-`BYPASSRLS` identities.
