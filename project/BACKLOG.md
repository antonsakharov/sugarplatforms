# Ordered Build Backlog

Statuses: `[ ] planned`, `[-] in progress`, `[x] complete`.

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
- [x] REP-005 Browser-local report versioning and structured JSON export
- [x] REP-006 Print stylesheet and formal report styling
- [x] REP-007 Formal PDF export

## Production-readiness work

- [-] Durable database persistence — assessment metadata is server-persisted via the SQLite local/single-instance adapter; artifact metadata, evidence, review state, findings, and reports remain to migrate
- [x] Organization and workspace tenancy — persisted organization/workspace identity, server-owned local tenant context, tenant-scoped assessment operations, and focused isolation tests are implemented; authentication/RLS remain separate
- [x] Authentication and authorization foundation — server-resolved user/workspace membership, viewer/editor/admin permissions, 401/403 fail-closed API guards, and local-dev identity adapter are implemented; production IdP/session verification remains open
- [x] PostgreSQL row-level security foundation — relational tenant keys, forced RLS policies, membership-gated reads, editor/admin assessment inserts, transaction-local tenant context, and database one-active-assessment enforcement are implemented
- [ ] Live database/storage tenant-isolation integration tests against a real non-superuser/non-`BYPASSRLS` PostgreSQL role and private object storage
- [ ] Private object storage
- [ ] Server-backed report version history and authorization
- [ ] Audit and deletion workflow
- [ ] Operational job controls and runbook

## Secondary sample

- [ ] Acme HealthTech fixtures, sample workspace, graph, report, and guided walkthrough

## Future

- [ ] Read-only engineering/documentation connectors
- [ ] Continuous architecture drift detection
- [ ] Enterprise identity lifecycle
- [ ] Customer-managed deployment

## Definition of done

A feature is complete only when the intended user action works, tests exist, build/type/lint pass, evidence links are preserved, documentation is current, and incomplete business logic is not represented as finished.
