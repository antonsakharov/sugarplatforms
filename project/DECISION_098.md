# Decision 098 — Bounded sparse PDF cross-reference stream `/Index` ranges

**Date:** 2026-11-03  
**Status:** Accepted for the credential-free local/demo parser; not production PDF certification.

## Context

Decision 097 verifies complete PDF 1.5 Flate xref streams and PDF-defined zero-width `/W` defaults. PDF `/Index` can also list disjoint ranges rather than `[0 Size]`. Requiring full coverage rejects otherwise verifiable architecture documents, while trusting absent entries risks fabricated page evidence.

## Decision

Permit up to 128 strictly ascending, non-overlapping, nonempty `[first, count]` pairs inside a bounded flat `/Index` array. Require the first range to include object zero, explicitly marked free. Each range must fit within `/Size` (at most 4,096). If `/Index` is absent, retain `[0 Size]`. The decoded xref entry count is the sum of range lengths, and the existing nonzero bounded `/W` stride applies. Match each entry to its actual object ID, not its ordinal position. Every parsed direct object and expanded compressed object must be indexed exactly once with exact physical offset or compressed index. Omitted IDs are implicitly free; never infer objects, pages, claims or findings from them.

Reject descending, overlapping, empty, malformed, oversized, out-of-range or missing-zero ranges, mismatched decoded length, unindexed live objects, invalid generations, duplicate compressed indexes, and unsupported revisions or encryption. Preserve `/Info` and `/ID` metadata isolation, original stream bytes, source locators, and physical page evidence.

## Interfaces, limits and validation

Update only the local/demo xref validator, its regression fixture/tests, and design/build documentation. No new UI, API, schema, migration, job, external service or permission is needed. The existing server-side limits remain one focused assessment, one primary entity, up to 10 files, 25 MB each and 150 measurable pages; architecture metadata only, no customer records, credentials or live production access. Nine regression tests cover positive and adversarial cases.

The bounded parser is not a general PDF revision resolver, OCR engine or production-grade PDF service. Live authenticated non-`BYPASSRLS` two-tenant PostgreSQL/RLS, private object storage and malware-scanner certification remain independent release gates.

See `project/VALIDATED_2026-11-03.md`.
