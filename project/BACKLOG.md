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
- [-] DIA-011 Finding review workflow
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
- [x] REP-005 Report versioning and structured JSON export — server-backed history now replaces the original browser-local adapter
- [x] REP-006 Print stylesheet and formal report styling
- [x] REP-007 Formal PDF export — now authorized from persisted server report snapshots

## Production-readiness work

- [-] Durable database persistence — SQLite remains the local/single-instance adapter. Managed Supabase PostgreSQL/RLS now covers workspace membership, assessment create/read, artifact metadata, source-addressable evidence segments, and extraction snapshots. Extraction/finding review, reports, audit/deletion, and jobs still require managed migration.
- [x] Organization and workspace tenancy
- [x] Authentication and authorization foundation
- [x] Request-scoped production auth activation
- [x] PostgreSQL row-level security foundation
- [x] Managed PostgreSQL assessment/membership adapter
- [x] Managed PostgreSQL artifact metadata/source-segment/extraction-snapshot adapter with atomic RLS-authorized replacement
- [x] Private object storage foundation
- [x] Server-backed artifact metadata and source/evidence persistence
- [x] Server-backed extraction-review decisions and approved extraction persistence
- [x] Server-backed finding-review decisions and accepted findings persistence
- [x] Server-backed accepted-findings consumption
- [x] Server-backed report version history and authorization
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
