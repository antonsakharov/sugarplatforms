# Feature Inventory

## End-to-end MVP
- Assessment setup — in progress; local/server persistence and managed foundations exist.
- Guided upload — in progress; limits/readiness/private-storage/malware boundaries implemented, live production validation pending.
- Parsing and evidence — in progress; supported parsers and source-addressable evidence implemented, live managed validation pending.
- Extraction review — implemented for local and managed code boundaries; live two-tenant validation pending.
- Entity/ID map — implemented with reviewed-state projection, evidence drill-down, filters, and static export.
- Diagnostic findings — implemented with deterministic rules, isolated AI candidates, evidence coverage, and finding review.
- Maturity and recommendations — implemented from accepted findings only.
- Executive report — implemented with immutable history, print/PDF, and accepted-findings-only generation.
- Acme HealthTech sample — implemented on the same reviewed-state journey.

## Production readiness
Tenancy, authentication/authorization, PostgreSQL/RLS foundations, private storage, malware quarantine, audit/deletion, managed review/report persistence, and generated-report metadata are implemented at code/migration level. Managed deletion lifecycle activation is implemented on the 2026-10-01 agent branch. Live two-tenant Supabase certification, scheduler/worker operations, and backup/retention guarantees remain open.

## Future
Read-only engineering/documentation connectors, continuous architecture drift detection, assessment comparison, collaboration, enterprise identity lifecycle, and customer-managed deployment.