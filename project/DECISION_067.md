# DECISION 067 — PDF page locators require provable object provenance

Date: 2026-10-05
Status: accepted

## Decision

The bounded PDF parser may emit a `pdf-page` locator only when it can directly establish a PDF `/Page` object to `/Contents` object reference and extract text from that uncompressed content stream. If the page/content relationship cannot be established, the parser must emit `pdf-text-fragment` locators instead of estimating or synthesizing a page number. Filtered/compressed streams, OCR, complex font encodings, and layout reconstruction remain unsupported by this bounded adapter and must be handled by a production-grade PDF integration.

## Why

Evidence-backed findings depend on locators being defensible. A less precise fragment locator is preferable to a precise-looking but unverified page citation. This extends the no-fabricated-provenance invariant introduced in DECISION 066 while allowing exact page citations for the subset of PDFs where provenance is directly provable.

## Security and scope

The change does not broaden accepted file types or MVP limits, does not access external systems, and does not process customer records. Encrypted PDFs continue to fail closed.
