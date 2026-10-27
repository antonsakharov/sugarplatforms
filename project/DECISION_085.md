# ADR-085 — Bounded Flate PNG Predictor 15 evidence decoding

**Date:** 2026-10-23  
**Status:** Accepted for the local/demo PDF adapter; not production PDF certification.

## Context

Some PDF architecture page streams and selected-font `/ToUnicode` maps apply PNG row predictors after `/FlateDecode`. Previously any `/DecodeParms` failed closed, even when the row transformation could be reversed without guessing glyphs or page provenance. The canonical GitHub `main` is still design-only; the approved complete application remains in the source-only recovery package.

## Decision

- Support a single direct `/FlateDecode` (`/Fl`) stream with `/DecodeParms << /Predictor 15 ... >>`. Allow only `Colors=1`, `BitsPerComponent=8`, and `Columns` from 1 through 4096 (PDF defaults are used when omitted). A filter array/chain with DecodeParms, `/DP` alias, indirect parameters, duplicate keys, unknown keys, and other predictors fail closed.
- Decode the Flate stage under the caller's existing hard byte limit, then reverse PNG per-row filter tags 0–4 (None, Sub, Up, Average, Paeth). Require exact row boundaries, validate filter tags, and enforce the byte limit on encoded, inflated, and reconstructed stages.
- Apply this same shared decoder to directly referenced page-content and selected-font CMap streams. Preserve only previously verified physical-page locators; unsupported streams never become invented extraction evidence.
- Keep the MVP limits unchanged: one focused assessment, one primary entity, 10 files, 25 MiB/file, 150 pages, architecture metadata only, no customer records, secrets or production access.

## Alternatives and remaining work

Broader PNG/TIFF predictor values, color/bits-per-component combinations, predictor arrays for multi-filter streams, object streams, arbitrary font/layout/OCR support and production PDF integration remain unsupported. Do not claim a complete PDF parser. This local/demo increment cannot certify confidential enterprise use.

## Validation

`tests/pdf-png-predictor.test.mjs` independently encodes all five PNG filter types, exercises page/CMap evidence integration, and verifies malformed rows, unsupported parameters, aliases, filter chains and output budgets fail closed. Full dependency-backed CI, exact GitHub source parity and live authenticated two-tenant isolation remain release blockers.
