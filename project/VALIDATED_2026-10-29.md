# Validation — 2026-10-29

Feature: PAR-005b16, bounded classic PDF trailer `/Info` and `/ID` compatibility (Decision 093).

## Feature checks

- Classic xref trailer tests: 16/16 passed, including six new positive/adversarial cases.
- Valid `/Info` and `/ID` preserve physical-page evidence and do not enter source segments.
- Missing, free, wrong-generation, catalog, page/stream and unsupported metadata references fail closed.
- Invalid/duplicate/oversized IDs, unknown/duplicate keys, hybrid, encrypted and incremental revisions fail closed.
- Existing xref-stream and xref-free demo compatibility are retained.

## Release gates

Local focused parser, upload/security, full-suite, baseline, lint, typecheck, build, schema, manifest, and ZIP results are recorded in the daily handoff. A local dependency-limited run is not a full release certification. Networked GitHub CI must pass before considering the draft PR code-validated. Live non-bypass two-tenant managed PostgreSQL, private storage and malware scanner certification remain NOT RUN without provisioned services. No production deployment or automatic merge.
