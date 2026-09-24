# ADR-056 — Persist accepted findings atomically with managed finding review

**Status:** Accepted

## Decision

Managed finding-review writes use the verified end-user JWT and a `SECURITY INVOKER` PostgreSQL RPC. The RPC requires editor/admin membership, compares the exact persisted extraction-review boundary, verifies the extraction approval timestamp carried by diagnostics, and atomically stores diagnostic JSON, review JSON, diagnostic fingerprint, and materialized accepted findings.

## Why

Map, maturity, recommendations, and reports consume accepted findings as a trust boundary. Storing accepted materialization separately from the review transaction could expose downstream consumers to stale or partially updated state.

## Consequence

Production finding review now has a PostgreSQL/RLS persistence path without service-role bypass. Live two-tenant validation is still required before confidential production use.
