# Decision 069 — Bounded PDF filter-chain decoding

Date: 2026-10-07
Status: Accepted

## Context
Evidence citations must not imply page provenance unless the parser can prove the PDF page-to-content relationship. Many otherwise simple architecture PDFs encode page content with ASCIIHex and/or Flate filters.

## Decision
The credential-free bounded PDF adapter may decode deterministic byte filters in declared PDF order when their semantics can be implemented and tested locally. It now supports ASCIIHexDecode/AHx and FlateDecode/Fl, including ASCIIHex odd-nibble padding. Unknown filters, malformed encodings, complex font mappings, OCR, and layout reconstruction remain unsupported and fail closed or require the production adapter.

## Consequence
More ordinary architecture PDFs can produce page-addressable evidence without weakening the no-fabricated-provenance invariant. Coverage remains intentionally narrower than a production PDF engine.
