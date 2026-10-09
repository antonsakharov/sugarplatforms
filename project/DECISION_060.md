# ADR-060 — Managed deletion operations remain end-user authorized

Date: 2026-09-25

Managed audit receipts and deletion reconciliation jobs use PostgreSQL tables with forced row-level security. Reads and writes remain bound to the verified end-user identity and exact admin workspace membership. Operational state is bounded and contains no artifact/evidence/report bodies.

The SQLite executor remains the local/demo implementation until provider-neutral managed writes and live storage deletion certification are complete.
