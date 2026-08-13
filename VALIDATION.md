# Validation status

## 2026-08-12 evidence extraction increment

Completed in this run before publication:

- 28/28 Node behavioral and contract tests pass;
- source-policy lint passes;
- every JSON schema in `schemas/` parses successfully;
- deterministic extraction tests cover directly supported systems/entities/identifiers/owners/integrations, normalized duplicate reconciliation with evidence retention, SQL DDL entity extraction, fail-closed evidence validation, and object-count limits;
- upload contract tests verify the extraction boundary is wired into the same transient validation/parsing request and that the client surfaces evidence-linked candidates;
- each valid extracted object requires at least one direct source-segment evidence reference;
- uploaded bytes remain transient and are not persisted by the demo route.

The local runtime does not contain the project's installed Next.js/TypeScript dependency tree, so full dependency-backed type checking and the optimized Next.js build are delegated to the GitHub Actions `validate` workflow on the published branch. A feature is not considered fully validated if that workflow fails.

## Provider boundary

The demo route uses `local-deterministic-v1` and sends no uploaded artifact content to an external provider. The OpenAI Responses adapter is implemented behind the provider interface for future server-side activation, with schema-constrained output, bounded output tokens, explicit prompt versioning, source-as-untrusted-data instructions, and `store: false`. It is not credential-tested or activated in this demo increment.

## Remaining production validation

Authentication, organization authorization, row-level security, private object storage, malware scanning, durable extracted-object/evidence persistence, deletion, audit events, log redaction, external-provider retention/deletion verification, and tenant-isolation tests remain mandatory before confidential enterprise artifacts can be accepted.
