# Security and Privacy

## MVP posture

Sugar Platform Diagnostic accepts architecture metadata only. It must not request or intentionally process production customer records, regulated personal records, credentials, secrets, or raw production datasets.

## User-facing guidance

Before upload, display:

> Upload architecture metadata only. Do not upload customer records, patient records, production data, passwords, API keys, access tokens, private keys, or other secrets.

## Required controls

### Upload controls

- maximum 10 files;
- maximum 25 MB per file;
- maximum 150 pages total where measurable;
- allowlisted file types;
- random private storage keys;
- duplicate detection;
- executable rejection;
- probable-secret scanning;
- clear warning that detection is not perfect;
- user acknowledgement of upload rules.

### Authentication and authorization

- authenticated access for real assessments;
- organization-scoped roles;
- server-side authorization;
- row-level security;
- private buckets;
- short-lived signed URLs.

### AI controls

- source text treated as untrusted data;
- prompt injection cannot override system instructions;
- structured extraction output;
- evidence required;
- direct/derived/inferred distinction;
- human review before publication;
- no external tool execution based on uploaded content;
- demo extraction remains local and deterministic;
- activation of an external model requires explicit server-side configuration and production privacy controls;
- external Responses requests disable provider-side storage where supported and require strict structured output.

### Logging and secrets

- no raw artifact content in routine logs;
- no credentials in source control;
- server-only secrets;
- separate development/production credentials;
- redaction of likely sensitive values.

### Deletion and audit

Full assessment deletion is a server-authorized administrator action. Tenant scope is resolved from the authenticated membership; callers cannot provide organization/workspace scope or arbitrary storage keys.

The local/single-instance workflow records a minimal `assessment.deletion.requested` event, removes server-derived private artifact objects, then transactionally deletes normalized/source evidence, extraction state, extraction review, finding review/materialized findings, saved report snapshots, artifact metadata, and the assessment record. A successful or failed operation keeps a minimal tenant-scoped audit receipt containing identifiers, actor, timestamps, outcome, and bounded deletion counts/error text, but no artifact content, evidence, findings, or report bodies.

If private object deletion fails, relational assessment state is retained and failure is recorded rather than reporting successful deletion. Because filesystem/object storage and SQLite/PostgreSQL cannot share a distributed transaction, production must use idempotent object deletion plus durable retry/reconciliation state.

Provider indexes and any future derived object-storage outputs must also participate in the same lifecycle once introduced.

## Production readiness

Before accepting confidential enterprise materials, tenant isolation, malware scanning, backup/restore, incident response, provider retention, PostgreSQL/RLS-backed audit/deletion, production object-storage deletion/reconciliation, data-processing terms, and log redaction must be verified.
