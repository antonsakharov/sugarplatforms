# Entity/ID map filtering and export

The reviewed Entity/ID map supports client-side filtering and static export without changing the underlying reviewed graph.

## Usage

1. Complete extraction review and approve the extraction set.
2. Run diagnostics and complete finding review.
3. Open `/assessment/<id>/map`.
4. Filter by free-text search, node type, relationship type, and direct/derived fact status.
5. Optionally hide isolated nodes after relationship filtering.
6. Download the current visible projection as SVG for a static visual or JSON for structured inspection.

## Projection boundary

Filtering is presentation-only. It may hide reviewed nodes and edges but may not create, mutate, infer, or promote architecture facts. Relationships remain visible only when both endpoints survive the node filter. Direct and derived statuses are preserved from the source graph.

## Export boundary

SVG export is a self-contained deterministic visual of the visible graph. Direct edges are solid and derived edges are dashed. Labels are XML-escaped before rendering.

JSON export contains the active filter, export timestamp, filtered graph, existing evidence references, and diagnostic provenance. It does not add raw uploaded artifact content and is not a signed or durable production record.

## Setup

No additional environment variable, package, external service, or credential is required. The feature runs in the existing browser-local demo adapter and is covered by the normal `npm run validate` gate.
