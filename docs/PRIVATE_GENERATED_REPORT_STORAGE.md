# Private generated-report storage

Saved immutable report snapshots remain the source of truth. On authorized PDF export, Sugar deterministically renders the selected snapshot, verifies diagnostic provenance, and materializes the PDF through the existing tenant-scoped private object-storage boundary.

Generated objects use random keys under `<organization>/<workspace>/<assessment>/...`; filenames never become object keys. SHA-256, size, page count, report ID, version, and creation time are persisted separately. Repeated export of the same immutable report reuses the materialized object and fails closed if the deterministic checksum changes.

The local/demo path stores object metadata in SQLite and PDF bytes in the configured private local filesystem. When Supabase object storage is selected, bytes use the private Supabase bucket and the response may expose a bounded signed URL capability in a no-store response header. Signed URLs must never be logged or persisted.

Assessment deletion now includes generated-report storage keys and metadata rows so generated outputs participate in the same fail-closed deletion lifecycle as uploaded artifacts.

## Production limitation

Migration `007_generated_report_objects_rls.sql` defines the managed PostgreSQL/RLS metadata table, but request-token-backed activation of that metadata store is intentionally not claimed complete in this slice. Until that adapter is activated and live two-tenant tests pass, generated-report metadata uses the local/single-instance store even when the object-storage provider is Supabase. Confidential production deployment must not enable this mixed mode.
