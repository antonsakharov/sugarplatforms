# ADR-046 — Cross-store deletion uses a durable bounded-retry job

**Status:** Accepted

Assessment deletion spans private object storage and relational state, which cannot participate in one distributed transaction. Therefore deletion persists a tenant-scoped operation record, removes server-derived private objects idempotently while checkpointing progress, and removes relational assessment state only after object deletion succeeds.

A job has a bounded retry budget, exponential backoff, and a short execution lease so interrupted workers can be reclaimed. Exhausted jobs remain visible for administrator intervention rather than retrying forever. Reconciliation is tenant-scoped and administrator-authorized; clients cannot submit tenant IDs, storage keys, or arbitrary job payloads.

If relational deletion completes but the process exits before the job receipt is marked complete, reconciliation recovers completion from the durable `assessment.deletion.completed` audit event instead of repeating a completed relational purge.

The local/single-instance implementation provides the contract without external credentials. Production must move jobs and audit receipts behind PostgreSQL/RLS and run reconciliation from an authenticated internal scheduler/worker against the production private-storage adapter.
