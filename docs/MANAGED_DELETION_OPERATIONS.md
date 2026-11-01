# Managed deletion operations

This increment implements the PostgreSQL/RLS state-transition adapter behind the provider-neutral deletion-operations contract.

## Implemented

- verified end-user JWT on every managed operation;
- explicit organization/workspace scope on every read/RPC;
- bounded due-job selection (maximum 20);
- five-minute execution leases;
- attempt-budget enforcement;
- idempotent per-object deletion checkpoints;
- bounded exponential retry metadata;
- terminal job completion with durable receipt metadata;
- SECURITY INVOKER RPCs so forced RLS remains authoritative.

## Not yet activated

Assessment DELETE and reconciliation routes remain on the local executor until the managed lifecycle can atomically prepare the storage-key plan, append audit events, purge all tenant-scoped relational state, and produce the deletion receipt. This prevents a mixed local/managed deletion path from being presented as production-safe.

Live two-tenant Supabase validation with authenticated non-BYPASSRLS identities is still required before confidential production use.
