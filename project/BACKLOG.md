# Ordered Build Backlog

Statuses: `[ ] planned`, `[-] in progress`, `[x] complete`, `[!] blocked`

The daily build selects the first unblocked item whose dependencies are complete.

## Epic 1 — Foundation

- [-] FND-001 Create Next.js TypeScript application
- [-] FND-002 Add lint, format, type-check, and test commands
- [-] FND-003 Add environment validation and feature flags
- [-] FND-004 Add product layout and navigation
- [-] FND-005 Add Dockerfile and Vercel configuration
- [-] FND-006 Add health endpoint and structured logging

## Epic 2 — Entry and assessment setup

- [-] ASM-001 Build landing page with Analyze My Platform and View Sample Diagnostic
- [-] ASM-002 Build assessment setup form
- [-] ASM-003 Add focus-area selection
- [-] ASM-004 Add primary-entity and business-concern inputs
- [-] ASM-005 Display and acknowledge MVP limits
- [-] ASM-006 Persist assessment draft in demo/local adapter
- [-] ASM-007 Add assessment schema validation tests

## Epic 3 — Sample assessment

- [ ] DEM-001 Create Acme HealthTech fixture artifacts
- [ ] DEM-002 Create fixture domain objects
- [ ] DEM-003 Create fixture findings and evidence
- [ ] DEM-004 Build sample workspace summary
- [ ] DEM-005 Build sample entity/ID map
- [ ] DEM-006 Build sample report preview
- [ ] DEM-007 Add guided walkthrough

## Epic 4 — Persistence and tenancy

- [ ] DAT-001 Create database migrations
- [ ] DAT-002 Implement organizations and memberships
- [ ] DAT-003 Implement workspaces and one active assessment
- [ ] DAT-004 Implement artifacts and source segments
- [ ] DAT-005 Implement extracted objects and evidence
- [ ] DAT-006 Implement findings, recommendations, and reports
- [ ] DAT-007 Add row-level security
- [ ] DAT-008 Add tenant-isolation tests
- [ ] DAT-009 Add fixture seed command

## Epic 5 — Guided upload and validation

- [-] UPL-001 Build private upload UI
- [-] UPL-002 Enforce maximum 10 files
- [-] UPL-003 Enforce 25 MB file limit
- [-] UPL-004 Add supported-type allowlist
- [ ] UPL-005 Add checksum duplicate detection
- [ ] UPL-006 Add page-count estimation and 150-page limit
- [ ] UPL-007 Add probable-secret and prohibited-data warnings
- [ ] UPL-008 Add remove/replace workflow
- [ ] UPL-009 Build readiness summary
- [-] UPL-010 Add validation tests

## Epic 6 — Parsing and evidence

- [ ] PAR-001 Implement text and Markdown parser
- [ ] PAR-002 Implement JSON/YAML/OpenAPI parser
- [ ] PAR-003 Implement CSV parser
- [ ] PAR-004 Implement SQL DDL parser
- [ ] PAR-005 Implement PDF parser
- [ ] PAR-006 Create source-addressable segments
- [ ] PAR-007 Build processing-status UI
- [ ] PAR-008 Build artifact/evidence inventory
- [ ] PAR-009 Add retry and quarantine states

## Epic 7 — AI extraction and review

- [ ] EXT-001 Implement AI provider interface
- [ ] EXT-002 Implement OpenAI Responses adapter
- [ ] EXT-003 Add structured-output schema validation
- [ ] EXT-004 Add prompt versioning
- [ ] EXT-005 Add token/cost limits
- [ ] EXT-006 Extract systems/entities/IDs/integrations/capabilities/owners
- [ ] EXT-007 Persist evidence-linked objects
- [ ] EXT-008 Build extraction review screen
- [ ] EXT-009 Add rename/reject/merge/confirm actions
- [ ] EXT-010 Add prompt-injection and malformed-output tests

## Epic 8 — Diagnostic engine

- [ ] DIA-001 Build deterministic rule framework
- [ ] DIA-002 Detect fragmented identifiers
- [ ] DIA-003 Detect competing authority claims
- [ ] DIA-004 Detect duplicate matching logic
- [ ] DIA-005 Detect duplicate capabilities
- [ ] DIA-006 Detect ownership gaps
- [ ] DIA-007 Detect direct database coupling
- [ ] DIA-008 Detect long synchronous chains
- [ ] DIA-009 Generate AI-assisted candidate findings
- [ ] DIA-010 Validate evidence coverage
- [ ] DIA-011 Build finding review workflow
- [ ] DIA-012 Calculate focused maturity summary

## Epic 9 — Entity/ID visualization

- [ ] VIS-001 Define graph projection API
- [ ] VIS-002 Build entity/ID graph
- [ ] VIS-003 Show creator/consumer systems
- [ ] VIS-004 Highlight authority conflicts
- [ ] VIS-005 Add evidence drill-down
- [ ] VIS-006 Add filters and static export

## Epic 10 — Recommendations and reporting

- [ ] REP-001 Generate prioritized recommendations
- [ ] REP-002 Generate 90-day action plan
- [ ] REP-003 Build executive report preview
- [ ] REP-004 Include accepted findings only
- [ ] REP-005 Add report versioning
- [ ] REP-006 Add print stylesheet
- [ ] REP-007 Add PDF export

## Epic 11 — Security and operations

- [ ] SEC-001 Add audit events
- [ ] SEC-002 Add deletion workflow
- [ ] SEC-003 Add log redaction
- [ ] SEC-004 Secure scheduled job endpoint
- [ ] SEC-005 Add rate and AI cost limits
- [ ] SEC-006 Add backup/restore documentation
- [ ] OPS-001 Add job dashboard
- [ ] OPS-002 Add dead-letter review
- [ ] OPS-003 Add operational runbook

## Future epics

- [ ] CON-001 GitHub read-only connector
- [ ] CON-002 Confluence read-only connector
- [ ] CON-003 Jira read-only connector
- [ ] MON-001 Continuous architecture drift detection
- [ ] ENT-001 Enterprise SSO and SCIM
- [ ] DEP-001 Customer-managed deployment

## Definition of done

A feature is complete only when the intended user action works; code/configuration and tests are present; build/type/lint pass; limits and authorization are server-enforced where applicable; evidence links are preserved; docs are updated; the sample remains functional; and no placeholder business logic is presented as complete.
