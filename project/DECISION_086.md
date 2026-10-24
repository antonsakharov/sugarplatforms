# Decision 086 — Bounded TIFF Predictor 2 PDF evidence decoding

**Date:** 2026-10-24  
**Status:** Accepted for local/demo adapter only

## Context

Some Flate-compressed PDF architecture documents and selected-font ToUnicode streams use `/DecodeParms << /Predictor 2 ... >>` (TIFF horizontal differencing). The bounded PDF adapter already handles Predictor 15 but rejects Predictor 2, preventing otherwise directly addressable architecture evidence from being extracted.

## Decision

Support TIFF Predictor 2 only for a **single direct** `/FlateDecode` (`/Fl`) filter with a **direct** `/DecodeParms` dictionary, `Colors=1`, `BitsPerComponent=8`, and `Columns` in 1–4096. Columns default to 1 when omitted. Reset the horizontal predictor at every complete row. Reconstruct bytes with modulo-256 addition and enforce the existing per-stage byte budget: 4 MiB page content or 64 KiB font CMaps. Reject incomplete rows, malformed parameters, filter chains, aliases, and unsupported color depths without guessing.

All page locators continue to require a verified Catalog/Pages/Page traversal and direct content reference. Unknown glyphs and unsupported PDF structures still fail closed. No upload, tenancy, privacy, AI, report or production-access policy changes.

## Consequences

The local/demo PDF parser can now extract supported TIFF-predicted architecture text and ToUnicode mappings while retaining source-backed page evidence. This does **not** provide general PDF object-stream, OCR, image, font or layout support, nor production certification. Canonical GitHub source recovery, authentic npm lockfile metadata, dependency-backed CI and live two-tenant storage/RLS/malware validation remain release blockers.
