# DECISION 068 — Decode only provable, bounded PDF filter paths

Date: 2026-10-06
Status: Accepted

## Decision

The credential-free PDF adapter may decode a page content stream only when the page explicitly references that content object and the stream uses either no filter or exactly one `/FlateDecode` filter. `/FlateDecode` is decoded with the Node runtime `zlib` implementation. Unsupported filter chains and decoding failures are not guessed or partially interpreted.

## Rationale

Evidence coordinates are part of the product contract. Supporting the common Flate-compressed case materially expands useful PDF coverage without weakening provenance, while attempting arbitrary PDF decoding in the bounded adapter would risk silently incorrect text-to-page attribution.

## Consequences

- Exact `pdf-page` locators remain available for provable unfiltered and single-filter Flate streams.
- Unsupported or undecodable filtered streams are skipped when other page evidence is available and explicitly warned about.
- If no reliable text can be recovered, parsing fails closed and directs the artifact to the production PDF adapter.
- Complex font encodings, filter chains, OCR, and layout reconstruction remain future production-adapter work.
