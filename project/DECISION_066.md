# Decision 066 — Do not fabricate PDF page provenance

Date: 2026-10-04

## Decision

The bounded local/demo PDF parser must never infer a page number by evenly distributing extracted text operators across the PDF page count. When the parser cannot reliably map text to a page object, it emits a stable `pdf-text-fragment` locator instead.

## Rationale

Sugar Platform Diagnostic promises evidence-backed findings. A plausible-looking but synthetic page number weakens that promise and can send a reviewer to the wrong source location. Honest fragment-level provenance is preferable to false precision.

## Consequences

- Direct-text demo PDFs remain reviewable and source-addressable.
- UI and downstream evidence consumers receive an explicit fragment locator.
- Exact page-level provenance requires the production PDF adapter.
- Existing page locators remain a supported locator type for production adapters that can establish them reliably.
