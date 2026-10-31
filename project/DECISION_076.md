# ADR-076 — Bounded, byte-faithful filtered ToUnicode streams

**Date:** 2026-10-14  
**Status:** Accepted for local/demo parser; production PDF certification remains open.

## Context

The bounded parser supported filtered page `/Contents` streams, but rejected all filtered `/ToUnicode` streams. The content-stream path decoded raw PDF bytes through `TextDecoder("latin1")`, whose WHATWG Windows-1252 mapping can change compressed byte values 0x80–0x9F and corrupt zlib payloads. The font and page paths also maintained inconsistent filter handling.

## Decision

Use one bounded, fail-closed stream decoder for directly referenced PDF page content and font CMaps. Convert PDF bytes with Node Buffer's one-to-one `latin1` representation before parsing objects. Support unfiltered streams, ASCIIHexDecode/AHx, FlateDecode/Fl, and at most three ordered filters. Enforce 4 MiB maximum for decoded page content and 64 KiB for decoded CMaps, including every intermediate stage. Reject malformed ASCIIHex EOD/trailing data, unknown filters, duplicate filter declarations, nontrivial `/DecodeParms`/predictors, invalid streams, and decompression over budget.

Only map text when the selected font and CMap unambiguously identify every glyph; only emit `pdf-page` when the verified page tree and `/Contents` relationship establish the page. Unsupported cases must not be presented as fully parsed. The adapter does not support OCR, layout reconstruction, arbitrary PDF object streams, CMap inheritance, or mixed-width codespaces.

## Consequences

Filtered CMaps can now yield directly supported architecture text and exact page evidence without external services. A shared byte-level decoder reduces drift and closes a binary-corruption path. The application still requires production PDF integration, canonical GitHub synchronization, a synchronized npm lockfile, dependency-backed build/type/full-suite validation, and live tenant-isolation checks before release.
