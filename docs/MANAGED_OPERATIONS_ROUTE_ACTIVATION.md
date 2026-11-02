# Managed operations route activation

This increment activates managed PostgreSQL/RLS reads for administrator audit receipts and deletion-job visibility while preserving the local demo adapter. Managed requests forward verified request identity and repeat server-derived tenant scope; forced RLS remains authoritative. The deletion mutation/executor path remains local until provider-neutral mutation contracts are complete.
