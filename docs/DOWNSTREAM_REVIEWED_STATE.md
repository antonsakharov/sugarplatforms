# Server-Reviewed Downstream State

## Purpose

Maturity, recommendations, the Entity/ID map, AI-candidate handoff, and executive-report preview must use the current authenticated server-reviewed state rather than treating browser compatibility caches as authoritative.

## Hydration boundary

`lib/client-reviewed-state.ts` loads these no-store server resources in parallel:

1. assessment metadata;
2. persisted processing/artifact metadata and extraction snapshot;
3. current extraction review;
4. current finding review plus materialized accepted findings.

The loader verifies that every payload belongs to the requested assessment, the extraction review is current and approved, finding review is not stale, and diagnostics belong to the same assessment. Downstream accepted-finding consumers additionally require explicit finding-review completion, no pending decisions, diagnostic timestamp consistency, and accepted-finding materialization matching the accepted review decisions.

Only after all server checks succeed are existing browser keys refreshed as compatibility caches.

## Downstream consumers

### Entity/ID map

The map projects confirmed extraction objects and the current completed server-reviewed finding set. Stale or incomplete server state fails closed. Filtering and export remain projection-only.

### Maturity and recommendations

The focused maturity signal and recommendation set are recomputed from the current server diagnostic/review pair on every page hydration. Derived browser copies are convenience caches only.

### Executive report

The report reloads server assessment metadata, persisted validated artifact metadata, diagnostics, and completed finding review, then regenerates maturity, recommendations, and the 90-day plan from that same diagnostic version. Explicit report snapshot history remains browser-local until the next report-persistence slice.

### AI candidate handoff

The AI-candidate page loads the current server diagnostic/extraction boundary before generating local credential-free candidates. Explicit promotion calls `POST /api/assessments/[id]/ai-promotions`; the server revalidates candidate provenance, converts the selected candidate into a pending normal finding, resets review, and persists the changed diagnostic envelope.

After server promotion, the client discards the candidate set because its diagnostic timestamp is stale. Subsequent finding-review writes accept only fresh deterministic engine output or the exact server-persisted promoted envelope. Arbitrary client-edited diagnostics fail closed.

## Security and evidence properties

- organization/workspace scope is server-resolved from authenticated membership;
- client payloads cannot select tenant scope;
- reviewed downstream pages do not fall back to browser finding state;
- stale extraction/finding review fails closed;
- only completed accepted findings may affect maturity, maps, recommendations, or reports;
- AI promotion preserves approved object/evidence boundaries and re-enters normal human review;
- raw artifact content is not added to downstream report/map exports by this feature;
- existing MVP file/page/entity/content limits are unchanged.

## Local/demo behavior

No new credentials or external services are required. The feature works with the existing local-dev identity, SQLite persistence, private filesystem storage, and deterministic local AI-candidate adapter.

## Remaining production limitations

- production IdP/session verification remains open;
- live PostgreSQL RLS and object-storage isolation tests require production-like credentials;
- production S3/Supabase storage and signed URLs remain open;
- report-version history is still browser-local;
- promotion audit history beyond the persisted finding envelope is not yet durable;
- audit/deletion, malware/quarantine, backup/restore verification, and operational controls remain open.
