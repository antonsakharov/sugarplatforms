# Ordered Build Backlog

Statuses: `[ ] planned`, `[-] in progress`, `[x] complete`, `[!] blocked`.

## Current journey

- [-] Foundation and assessment setup
- [-] Guided upload and validation
- [-] Parsing and source-addressable evidence
- [-] Evidence-linked architecture extraction
- [-] EXT-008 Extraction review screen
- [-] EXT-009 Rename, reject, merge, confirm, and approve extraction
- [-] EXT-010 Extraction boundary validation tests
- [-] DIA-001 Deterministic diagnostic rule framework
- [-] DIA-002 Fragmented identifier rule
- [x] DIA-003 Competing authority rule
- [x] DIA-004 Duplicate matching logic rule
- [x] DIA-005 Duplicate capability rule
- [-] DIA-006 Ownership-gap rule
- [x] DIA-007 Direct database coupling rule
- [x] DIA-008 Long synchronous chain rule
- [x] DIA-009 AI-assisted candidate findings
- [-] DIA-010 Evidence coverage validation
- [-] DIA-011 Finding review workflow — local and managed persistence implemented; live tenant validation pending
- [x] DIA-012 Focused maturity summary
- [x] DIA-013 Explicit promotion of approved AI candidates into normal finding review
- [x] VIS-001 Entity/ID graph projection
- [x] VIS-002 Entity/ID graph UI and evidence drill-down
- [x] VIS-003 Creator/consumer and authority relationships when directly extracted
- [x] VIS-004 Graph filters and static export
- [x] REP-001 Prioritized recommendations
- [x] REP-002 90-day action plan
- [x] REP-003 Executive report preview
- [x] REP-004 Accepted-findings-only report generation
- [x] REP-005 Report versioning and structured JSON export — local and managed PostgreSQL/RLS immutable history implemented
- [x] REP-006 Print stylesheet and formal report styling
- [x] REP-007 Formal PDF export — authorized from persisted local or managed report snapshots
- [-] REP-008 Private generated-report object storage — tenant-scoped materialization, checksum/idempotency, signed access, and deletion lifecycle implemented; managed RLS metadata adapter activation pending

## Production-readiness work

- [-] Durable database persistence — SQLite remains the local/single-instance adapter. Managed Supabase PostgreSQL/RLS covers workspace membership, assessment create/read, processing/evidence, extraction review, finding review/accepted findings, and immutable report history. Generated-report metadata migration exists but its request-token-backed adapter, audit/deletion, and jobs still require managed activation.
- [x] Organization and workspace tenancy
- [x] Authentication and authorization foundation
- [x] Request-scoped production auth activation
- [x] PostgreSQL row-level security foundation
- [x] Managed PostgreSQL assessment/membership adapter
- [x] Managed PostgreSQL artifact metadata/source-segment/extraction-snapshot adapter with atomic RLS-authorized replacement
- [x] Managed PostgreSQL extraction-review persistence with database-side stale-extraction enforcement
- [x] Managed PostgreSQL finding-review persistence with atomic accepted-finding materialization and stale extraction-approval enforcement
- [x] Managed PostgreSQL immutable report-history persistence with atomic version allocation and current-finding-review provenance enforcement
- [-] Managed generated-report object metadata — RLS migration added; verified end-user JWT adapter activation pending
- [x] Private object storage foundation
- [x] Generated PDF private-object materialization and local metadata persistence
- [x] Generated-report deletion lifecycle integration
- [!] Live database/storage tenant-isolation integration tests against real authenticated non-`BYPASSRLS` identities — credentials/infrastructure unavailable in the build environment
- [x] Production Supabase private-storage adapter with bounded short-lived signed read URLs
- [x] Malware/quarantine upload gate
- [x] Audit and deletion workflow
- [x] Operational deletion job controls and runbook

## Secondary sample

- [x] Acme HealthTech fixtures, sample workspace, graph, report, and guided walkthrough

## Future

- [ ] Read-only engineering/documentation connectors
- [ ] Continuous architecture drift detection
- [ ] Enterprise identity lifecycle
- [ ] Customer-managed deployment

## Definition of done

A feature is complete only when the intended user action works, tests exist, build/type/lint pass, evidence links are preserved, documentation is current, and incomplete business logic is not represented as finished.
