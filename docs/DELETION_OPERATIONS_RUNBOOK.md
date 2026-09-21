# Deletion Operations Runbook

Assessment deletion crosses private artifact storage and the application database, so recovery is modeled as a durable tenant-scoped job rather than an unbounded retry loop.

Each administrator deletion operation records only operational metadata: operation/tenant/assessment/actor IDs, server-derived storage keys, per-object progress, attempt budget, retry timing, lease state, bounded error text, and final receipt. It never stores artifact bytes, normalized evidence, findings, or report bodies.

Statuses are `queued`, `running`, `retry_scheduled`, `completed`, and `exhausted`. The default retry budget is three attempts. Backoff begins at 30 seconds and doubles per failed attempt, capped at 15 minutes. A running attempt receives a five-minute lease so a crashed worker can later be reclaimed.

Private object deletion must remain idempotent. The local storage adapter already uses forced removal. Successfully removed keys are checkpointed, so normal retries skip them; if a process crashes after storage deletion but before checkpoint persistence, deleting that object again is still safe.

Relational assessment state is removed only after all private object operations succeed. If storage fails, assessment metadata, evidence, review state, findings, and reports remain intact.

## Operator endpoints

Both endpoints are server-authorized and tenant-scoped.

- `GET /api/admin/deletion-jobs` returns recent job status, counts, retry timing, bounded error text, and receipts. Raw storage keys are not returned.
- `POST /api/admin/deletion-jobs/reconcile` processes at most 20 due jobs. Queued jobs, due retries, and expired execution leases are eligible. The caller cannot provide organization/workspace IDs, assessment IDs, storage keys, or arbitrary job payloads.

## Reconciliation procedure

1. Inspect the deletion-jobs endpoint and the assessment audit receipt endpoint.
2. For `retry_scheduled`, confirm the storage outage has recovered and invoke reconciliation after the backoff is due.
3. For an expired `running` job, invoke reconciliation; the expired lease makes it reclaimable.
4. For `exhausted`, investigate the storage error before creating a new administrator deletion request. The prior job and audit history remain retained.
5. Confirm a terminal `completed` job has a receipt and the audit trail contains `assessment.deletion.completed`.
6. Do not manually remove relational rows to unstick a job; that can orphan private objects and destroy recovery evidence.

A production scheduler may call reconciliation through an authenticated internal control plane. The MVP does not expose a public cron secret or deploy a scheduler automatically.

Before production activation, move deletion jobs and audit records to PostgreSQL/RLS, use a non-superuser/non-`BYPASSRLS` runtime role, activate the production private-storage adapter, validate live cross-tenant isolation, define backup/retention deletion semantics, and connect reconciliation to a controlled scheduler/worker.
