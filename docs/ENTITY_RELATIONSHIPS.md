# Direct Entity Relationships

## Scope

VIS-003 extends the reviewed Entity/ID map with creator, consumer, and authority relationships only when uploaded architecture metadata states those roles explicitly.

## Supported local/demo evidence forms

The deterministic relationship adapter recognizes strict statements such as:

- `CRM creates Customer records.`
- `Customer records are created by CRM.`
- `Analytics consumes Customer records.`
- `Customer records are consumed by Analytics.`
- `CRM is the system of record for Customer.`
- `Source of truth for Customer: CRM.`

Each recognized statement creates or enriches reviewable system/entity candidates and records the exact supporting source segment ID. Both endpoint objects must be confirmed in extraction review before a graph edge can appear.

## Evidence and inference boundary

Direct graph relationship kinds are `creates_entity`, `consumes_entity`, and `authority_for`. Each direct edge must retain at least one exact direct evidence reference. Ordinary system-to-system arrows, OpenAPI paths, system names, identifier presence, accepted findings, or the absence of contrary documentation cannot create these relationships.

The focused identifier relationship remains derived because it represents assessment scope rather than a source-stated ownership fact.

## Security and privacy

This feature does not add a connector or external model call. Relationship extraction runs on the same transient parsed architecture metadata already permitted by the local/demo upload path. It does not change the existing limits of one primary entity, 10 files, 25 MB per file, 150 measurable pages, architecture metadata only, and no customer records or secrets.

## Setup

No new environment variables, credentials, services, packages, or deployment configuration are required. Use the existing Node 22 development setup:

```bash
npm install
npm run dev
```

## Validation

Run the full validation gate:

```bash
npm run validate
```

Feature-specific coverage is in `tests/entity-relationships.test.mjs` and checks explicit relationship extraction, negative topology-only behavior, exact evidence projection, and suppression when an endpoint is not confirmed. `schemas/entity-id-graph.schema.json` defines the new relationship kinds and direct-relationship count.

## Production limitation

Relationship review and map state remain browser-local. Durable tenant-scoped persistence, authentication/authorization, row-level security, private object storage, audit/deletion controls, malware scanning, and tenant-isolation tests remain production-readiness work.
