# Decision 094 — Bounded PDF classic trailer whitespace and comments

**Date:** 2026-10-30  
**Status:** Accepted for the credential-free local/demo PDF parser; not production PDF certification.

## Context

Decision 093 accepts a strict single-revision classic PDF trailer with `/Size`, `/Root`, optional `/Info`, and `/ID`, but rejects legal PDF lexical whitespace and comments around these fields. Architecture documents with harmless generator comments can therefore be rejected despite having independently verifiable object offsets and page evidence.

## Decision

Normalize only the bounded trailer and final `startxref` lexical region, treating PDF whitespace (NUL, horizontal tab, line feed, form feed, carriage return, space) and `%` line comments as token separators. Keep hexadecimal `/ID` values intact: a comment marker inside a hex string is not normalized into valid data. Reject non-PDF whitespace and binary trailer tokens. Preserve raw xref rows, direct-object bytes, and physical offsets exactly; do not normalize the PDF body or evidence content. Require exactly one line-anchored classic xref table, one `startxref`, and one terminal `%%EOF`. Cap the xref section at 96 KiB, its entries at 4,096, and the terminal `startxref` region at 4 KiB. Do not accept trailing content after `%%EOF`.

The allowed trailer field set remains `/Size`, `/Root`, optional `/Info` and `/ID`. Duplicate/unknown keys, malformed metadata, `/Prev`, `/XRefStm`, `/Encrypt`, hybrid/incremental revisions, object streams under a classic table, and unsupported generations fail closed. Comments are never promoted to architecture objects or evidence. Verified physical-page evidence still requires a separately proven Catalog → Pages → Page → Contents chain.

## Scope and interfaces

No new API, schema, UI, job, external provider, or production access. Existing server-enforced one-assessment, one-primary-entity, 10-file, 25-MB-per-file, 150-page and architecture-metadata-only limits remain unchanged. Upload malware quarantine, prohibited-content screening, review, tenant authorization, and report evidence rules remain mandatory.

## Limitations

This is a deliberately narrow classic-trailer lexical subset, not general PDF parsing, arbitrary revision resolution, OCR, layout reconstruction, or confidential production readiness. Live authenticated non-`BYPASSRLS` two-tenant PostgreSQL, private storage, and malware-scanner isolation still require external certification.

See `project/VALIDATED_2026-10-30.md`.
