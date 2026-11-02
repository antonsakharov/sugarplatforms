# Decision 081 — Bounded PDF ASCII85 stream decoding

Date: 2026-10-19  
Status: Accepted for the credential-free local/demo PDF adapter; production PDF certification remains open.

## Context

PDF architecture documents commonly encode page content and ToUnicode font maps with `/ASCII85Decode` or `/A85`, sometimes followed by `/FlateDecode`. Treating those streams as raw text discards valid evidence; attempting to guess decoding would violate the source-provenance contract.

## Decision

1. Extend the existing byte-faithful `decodePdfStream` filter boundary, shared by page streams and directly referenced ToUnicode maps, to accept `ASCII85Decode` and `A85`, including ordered ASCII85-to-Flate chains. A filter name may contain digits; matching must consume the complete name rather than silently truncating `ASCII85Decode` to `ASCII`.
2. Require the PDF `~>` end-of-data marker, allow PDF whitespace, accept `z` only at a five-digit group boundary, and decode 2–4-character final groups with PDF `u` padding. Reject one-character tails, malformed terminators, invalid alphabet bytes, 32-bit group overflow, and non-whitespace trailing bytes. Do not accept Adobe's separate `<~` wrapper in PDF streams.
3. Enforce the existing encoded-input and per-filter-stage decoded-byte budgets (4 MiB for page streams; 64 KiB for CMaps) **during** decoding, including zero-run expansion. Unsupported `/DecodeParms`, predictors, unknown filters, and ambiguous stream dictionaries still fail closed.
4. Preserve verified `/Catalog` page-tree provenance and existing human extraction/finding review gates. This adds no new access to customer records, credentials, production services, or external systems; it does not imply OCR, object-stream, arbitrary font, or layout support.

## Verification

`tests/pdf-ascii85.test.mjs` covers independent BigInt-encoded round trips, partial groups, zero runs, invalid groups/terminators, filter ordering, stage budgets, filtered ToUnicode page evidence, filtered page-content evidence, and fail-closed malformed CMaps. Existing PDF filter and parser suites remain authoritative. Dependency-backed build/typecheck, live two-tenant security checks, and complete GitHub publication are separate release gates.
