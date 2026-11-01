# ADR-062 — Provider-neutral deletion state contract

**Status:** Accepted

Deletion orchestration must depend on a provider-neutral durable-state contract rather than SQLite classes. The contract covers active-job lookup, due-job selection, preparation, lease/start, per-object checkpoints, bounded failure transitions, and completion receipts. Local SQLite remains the demo adapter; managed PostgreSQL/RLS must implement the same state machine with the verified end-user identity and administrator authorization. Private object deletion remains outside the relational transaction and is therefore checkpointed before relational completion.
