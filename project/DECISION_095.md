# Decision 095 — Bounded PDF xref-stream document metadata

**Date:** 2026-10-31  
**Status:** Accepted for the local/demo PDF adapter; not production PDF certification.

## Context

The PDF 1.5 cross-reference stream integrity gate (Decision 091) already verifies direct offsets, compressed-object indexes, a single revision, and a Catalog root, but ordinary generator-supplied `/Info` and `/ID` trailer fields were not explicitly validated. Those fields are not architecture facts and must never become diagnostic evidence.

## Decision

Parse a bounded, flat, order-independent xref-stream dictionary with unique required `/Type /XRef`, `/Size`, `/Root`, `/W`, `/Length`, `/Filter /FlateDecode` fields and optional `/Index`, `/Info`, and `/ID`. Reject unknown, duplicate, malformed, encrypted, hybrid, or incremental fields, nested values, and dictionaries above 4 KiB. `/Info` must resolve to an indexed, live, generation-zero **direct** metadata dictionary; it cannot point to a compressed object, free entry, Catalog, Page, Pages, stream, xref, or object stream. `/ID` must contain exactly two hexadecimal strings of 16–64 bytes each. Never persist or promote `/Info` or `/ID` values into source segments, extracted architecture objects, findings, or reports.

The existing complete 4,096-object/64-KiB xref stream bounds, direct byte-offset verification, compressed-object index parity, and independently proven Catalog → Pages → Page → Contents physical-page evidence are unchanged. Unsupported PDFs fail closed; no guessed page provenance is allowed.

## Scope and interfaces

No new API, database schema, UI, background job, external credentials, or live production access. The existing assessment/upload/extraction/review/diagnostic/map/report flow and server-enforced limits (one focused assessment, one primary entity, 10 files, 25 MB/file, 150 measurable pages, architecture metadata only) remain unchanged.

## Release constraints

This is a narrow credential-free parser improvement, not a general-purpose PDF engine, OCR, or production security certification. Managed authenticated non-`BYPASSRLS` two-tenant PostgreSQL/RLS, private object storage, and malware-scanner isolation still require live certification. See `project/VALIDATED_2026-10-31.md`.
