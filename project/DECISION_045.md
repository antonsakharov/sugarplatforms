# ADR-045 — Full assessment deletion is admin-only and preserves minimal audit receipts

**Status:** Accepted  
**Date:** 2026-09-10

Full deletion of a real assessment requires the server-resolved `assessment:delete` permission and is restricted to administrators. The browser cannot select organization/workspace scope and cannot nominate arbitrary storage keys. The server derives private object keys from persisted artifact IDs plus the authenticated tenant/assessment prefix.

Deletion persists a request receipt before destructive work, deletes private artifact objects before removing database state, then transactionally purges assessment-scoped reports, finding review, extraction review, normalized source segments, artifact metadata, extraction snapshots, and the assessment record. A successful completion receipt survives deletion and contains only tenant/assessment/actor identifiers, operation metadata, timestamps, and bounded deletion counts. It must not retain uploaded content, extracted evidence, findings, report bodies, or secrets.

If object deletion fails, database assessment state is retained and a durable failure event is recorded. The local filesystem + SQLite adapter cannot provide a distributed transaction across object and relational storage, so production must use idempotent object deletion, retry/reconciliation job state, PostgreSQL/RLS-backed audit records, retention/backup deletion semantics, and live isolation tests before confidential enterprise use.
