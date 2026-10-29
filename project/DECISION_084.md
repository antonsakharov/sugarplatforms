# ADR-084 — Strict bounded PDF LZW evidence decoding

**Date:** 2026-10-22  
**Status:** Accepted for the local/demo PDF adapter; not production PDF certification.

## Context

Some architecture PDFs use `/LZWDecode` or its `/LZW` alias for page content or selected-font `/ToUnicode` streams. Previously these streams failed closed. Evidence must never be manufactured from undecodable bytes or assigned to unverified pages.

## Decision

- Accept only standard PDF LZW streams with **implicit `/EarlyChange 1`** (the PDF default). Any `/DecodeParms` or `/DP` declaration is rejected, including an explicit EarlyChange value; predictor handling is not implemented.
- Decode MSB-first variable-width 9–12-bit codes, clear code 256, EOD 257, and the special next-dictionary-code case. Enforce a clear code before data and require EOD with zero-only final bit padding.
- Use fixed-size prefix/suffix code tables and a bounded reconstruction stack rather than retaining decompressed dictionary strings. Reject undefined codes, malformed chains, truncated codes, trailing bytes, and decompression beyond the caller's byte budget.
- Keep the existing 4 MiB page-content and 64 KiB ToUnicode CMap caps, including per-stage bounds for ordered filter chains. Preserve verified physical-page locators only through the established page-tree and content-reference checks.
- Do not introduce any new user-upload type, production connector, customer-record ingestion, or change to the one-assessment/one-entity/10-file/25-MB/150-page MVP limits.

## Alternatives

An external PDF engine is appropriate for production-grade font/layout/OCR coverage but is not available in this credential-free build environment. Silently accepting unsupported LZW parameters or inferring characters would violate the evidence policy.

## Verification and remaining work

`tests/pdf-lzw.test.mjs` covers binary streams, dictionary width growth/reset, the special code case, malformed input, output caps, filter ordering, selected-font CMaps and physical-page provenance. Full dependency-backed CI, canonical GitHub parity, production PDF/OCR integration, and live two-tenant security certification remain mandatory release gates.
