# Decision 090 — Bounded Flate PDF object-stream expansion

**Date:** 2026-10-26  
**Status:** Accepted for the credential-free local/demo PDF adapter; not a production PDF certification.

## Context

PDF 1.5 permits `/ObjStm` objects to hold the page tree, font dictionaries, and other non-stream objects. The existing parser recognized only physically declared `obj ... endobj` objects, so a valid Flate-packed Catalog/Pages/Page tree could not establish source-page provenance. Inventing page numbers or extracting compressed bytes as text would violate the evidence contract.

## Decision

Before page-tree and font-resource resolution, expand only direct-length, single-Flate `/Type /ObjStm` streams with a complete, strictly increasing `N`/`First` index. Support up to 16 streams, 128 generation-zero dictionary objects per stream, 1 MiB encoded/decoded per stream, and 1,024 expanded objects. Validate declared encoded length, index pair count, offsets, duplicate IDs, and object boundaries. Reject nested streams, encryption markers, nested object streams, unsupported filters/DecodeParms, malformed indexes, duplicate or ambiguous IDs, and absent provable page trees. Do not parse customer records or call external services.

Use the existing bounded stream decoder and verified Catalog → Pages → Kids → Page → Contents traversal. Only those verified pages receive `pdf-page` evidence locators; unknown or unsupported PDFs fail closed to the production PDF adapter. The existing direct-stream and ToUnicode paths remain unchanged.

## Alternatives and limitations

A full xref-stream parser or third-party PDF engine is deferred until a security-reviewed production PDF integration. The local adapter does not resolve cross-reference revisions, arbitrary stream filters, generation-numbered compressed objects, object-stream extensions, OCR, font/layout reconstruction, or encrypted documents. It is deliberately strict and may reject otherwise valid PDFs. This increment does not change upload limits, storage, tenancy, report acceptance, or production deployment.

## Validation

See `project/VALIDATED_2026-10-26.md`. The focused parser tests pass locally. Full dependency-backed build/typecheck and live non-BYPASSRLS tenant-isolation certification remain separate release gates.
