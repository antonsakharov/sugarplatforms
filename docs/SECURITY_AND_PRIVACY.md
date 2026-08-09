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
- no external tool execution based on uploaded content.

### Logging and secrets

- no raw artifact content in routine logs;
- no credentials in source control;
- server-only secrets;
- separate development/production credentials;
- redaction of likely sensitive values.

### Deletion

Delete original objects, normalized text, source segments, extracted objects, evidence, findings, reports, and provider indexes where applicable.

## Production readiness

Before accepting confidential enterprise materials, tenant isolation, malware scanning, backup/restore, incident response, provider retention, deletion, data-processing terms, and log redaction must be verified.
