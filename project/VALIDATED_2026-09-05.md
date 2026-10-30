# Validation record — 2026-09-05

## Increment

Durable tenant-scoped artifact metadata, normalized source/evidence segments, parser provenance, and extraction snapshot persistence.

## Required checks

- TypeScript type checking
- source-policy lint
- full behavioral tests
- upload validation tests
- processing persistence round-trip tests
- organization/workspace isolation tests
- production Next.js build
- JSON schema parsing
- repository packaging

## Security recheck

- Existing MVP file/count/page/content gates remain unchanged.
- Raw upload bytes are not stored in the application database.
- Normalized segment content is treated as confidential tenant data.
- Processing reads require authenticated `artifact:read` permission.
- Processing writes remain behind authenticated `artifact:create` plus server-resolved tenant scope.
- Storage paths are not returned by the processing API.
- No production deployment is performed.

Final GitHub Actions run and package digest are recorded in the pull-request handoff after the final branch head is validated.