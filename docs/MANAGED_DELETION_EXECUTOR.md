# Managed deletion executor

## Increment

This increment extracts the durable deletion state machine behind a provider-neutral `DeletionOperations` contract. It defines deterministic due-job semantics and a hard reconciliation batch bound of 20 so the existing SQLite executor can be migrated without changing its retry, lease, checkpoint, or receipt behavior.

## Security boundary

The contract carries an explicit organization/workspace scope on every operation. Managed implementations must additionally enforce administrator membership with the verified end-user JWT and forced PostgreSQL RLS. No service-role or `BYPASSRLS` execution path is permitted. Operational state contains object keys, status, redacted errors, and receipts only; artifact/evidence/report contents are excluded.

## Completion rule

A managed executor is not production-complete until private artifact and generated-report objects are durably checkpointed as deleted before the relational assessment deletion and success audit receipt are committed. Failed or expired leases remain eligible for bounded reconciliation.

## Current limitation

The provider-neutral contract and deterministic scheduling rules are implemented and tested. The managed PostgreSQL mutation adapter and route switch are still pending because repository write publication for destructive lifecycle code was unavailable in this run. Local/demo behavior is unchanged.
