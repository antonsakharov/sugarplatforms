# Decision 065 — Reject duplicate artifact filenames

Date: 2026-10-03

## Decision

Reject an upload set when two selected artifacts have the same filename after trimming and case-folding. The check runs after metadata policy validation and before reading artifact bytes.

## Rationale

The upload pipeline correlates inspected bytes, parser results, private-object metadata, and processing records with the original artifact name. Allowing duplicate names makes those associations ambiguous and can cause one file to be parsed or persisted with another file’s bytes. Requiring unique names is a bounded MVP constraint that preserves evidence provenance without inventing silent renaming behavior.

## Consequences

Users must rename or remove duplicate filenames before validation continues. Content-level duplicate detection remains separate and continues to reject identical bytes even when filenames differ.
