# Decision 093 — Bounded classic PDF trailer metadata

**Date:** 2026-10-29  
**Status:** Accepted for the local/demo PDF parser, not production PDF certification.

## Context

Decision 092 validates complete classic cross-reference tables but rejects ordinary single-revision PDF trailers carrying optional `/Info` and `/ID`. Those fields do not establish architecture facts, yet rejecting every such file unnecessarily limits metadata-only architecture document extraction.

## Decision

Parse an explicit, unique, order-independent trailer field subset: required `/Size` and `/Root`, optional `/Info` and `/ID`. `/Info` must point to a live indexed generation-zero direct dictionary, not a Catalog, Page, Pages, xref/object stream, or free object. `/ID` must be an array of exactly two 16–64-byte hexadecimal byte strings. The validator checks structure only: it must not expose document metadata or identifiers as evidence, extraction candidates, diagnostics, or report content. Reject unknown/duplicate keys, malformed values, ambiguous or revisioned tables, `/Prev`, `/XRefStm`, encryption, and unsupported object generations.

The same independently verified Catalog → Pages → Page → Contents chain is required for physical-page evidence. No UI, schema, persistence, jobs, network service, or permissions change. Existing one-assessment, one-entity, 10-file, 25-MB-per-file, 150-page, architecture-metadata-only and prohibited-content policies remain in force.

## Limitations

This deliberately small local/demo grammar does not handle arbitrary PDF trailer comments, literal-string IDs, incremental updates, encrypted documents, OCR, complex layout, or all PDF spec variants. Live authenticated non-bypass two-tenant PostgreSQL, private storage and malware-scanner certification remain mandatory before confidential production use.

See `project/VALIDATED_2026-10-29.md`.
