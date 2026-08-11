# Build Status

## 2026-08-11

### Implemented in this increment

- [-] PAR-003 deterministic CSV parser with quoted-field handling and row-range locators
- [-] PAR-004 SQL DDL parser with CREATE statement segmentation and line provenance
- [-] PAR-005 bounded direct-text PDF adapter with page locators and fail-closed unsupported cases
- [-] PAR-007 per-artifact parsing status: parsed, failed, or withheld
- [-] PAR-008 expandable artifact/evidence inventory with source locator and evidence preview
- source-segment schema expanded for CSV, SQL DDL, PDF, row ranges, and PDF pages
- stale upload contract corrected to the current transient validation-and-parsing mode

These remain in progress until dependency-backed TypeScript and Next.js production validation passes in GitHub Actions.

### User flow now enabled

`create assessment -> upload -> readiness validation -> parse supported artifacts -> see per-file processing status -> inspect every source-addressable evidence segment`

### Validation completed in this run

- 23/23 Node behavioral and contract tests pass;
- source-policy lint passes;
- source-segment JSON schema parses successfully;
- CSV quoted-field, SQL DDL provenance, direct-text PDF provenance, PDF fail-closed behavior, and prior upload/assessment cases are covered.

### Known limitations

- this runtime cannot install dependencies from npm, so dependency-backed typecheck and Next.js production build are delegated to GitHub Actions;
- PDF demo parsing covers only directly addressable text operators and intentionally rejects scanned/compressed/encrypted cases;
- raw uploaded bytes remain transient demo-only request data and are not persisted;
- authentication, tenant authorization, private object storage, malware scanning, deletion, audit controls, and tenant-isolation validation remain required before confidential enterprise use.

### Exact next feature

Begin the AI extraction boundary: `EXT-001` provider interface, `EXT-002` OpenAI Responses adapter, `EXT-003` structured-output schema validation, then extract evidence-linked systems/entities/IDs/integrations/capabilities/owners (`EXT-006` and `EXT-007`) using a deterministic local/demo adapter when API credentials are unavailable.
