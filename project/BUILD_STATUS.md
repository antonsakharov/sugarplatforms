# Build Status

## 2026-08-12

### Implemented in this increment

- [-] EXT-001 AI extraction provider interface
- [-] EXT-002 OpenAI Responses adapter boundary with structured output and `store: false`; not activated in demo mode
- [-] EXT-003 extraction schema plus runtime evidence validation
- [-] EXT-004 explicit `platform-extraction-v1` prompt version
- [-] EXT-005 bounded extraction object count and OpenAI output-token ceiling; full cost accounting remains open
- [-] EXT-006 deterministic extraction of directly supported systems, entities, identifiers, integrations, capabilities, and owners
- [-] EXT-007 evidence-linked candidate objects returned to and retained by the local browser adapter; durable database persistence remains open
- extraction inventory added to the upload experience with object kind, confidence, extraction method, and direct source evidence

These items remain in progress until durable persistence and the full human review/approval workflow are implemented.

### User flow now enabled

`create assessment -> upload -> validate -> parse -> inspect evidence -> extract architecture candidates -> inspect direct evidence for each candidate`

### Validation completed locally

- 28/28 Node behavioral and contract tests pass;
- source-policy lint passes;
- all JSON schemas parse successfully;
- extraction tests cover direct evidence linkage, normalized duplicate reconciliation with evidence retention, SQL DDL extraction, fail-closed evidence validation, and object-count limits.

Dependency-backed TypeScript and Next.js production validation is delegated to GitHub Actions for the published branch.

### Security posture

- uploaded bytes remain transient request-memory-only;
- the demo route uses the deterministic local extraction adapter and sends no artifact content to an external provider;
- the OpenAI adapter treats source text as untrusted data, requests JSON-schema structured output, sets `store: false`, and requires a server-only API key;
- no extracted object can validate without direct source evidence;
- no automatic publication or silent ambiguous merge occurs.

### Known limitations

- candidate objects are not yet durable database records;
- rename/reject/merge/confirm and extraction approval are not yet implemented;
- the deterministic adapter intentionally recognizes only explicit architecture facts and may return an empty candidate set;
- OpenAI extraction is implemented but not enabled or credential-tested in the demo route;
- confidential enterprise use still requires authentication, tenant authorization, private storage, malware scanning, deletion, audit controls, and tenant-isolation validation.

### Exact next feature

Build the extraction review vertical slice: `EXT-008` review screen and `EXT-009` rename/reject/merge/confirm actions, including explicit approval of the reviewed extraction set before diagnostics can run. Add malformed-output and prompt-injection tests (`EXT-010`) at that boundary.
