# Build Status

## 2026-08-13

### Implemented in this increment

- [-] EXT-008 extraction review screen
- [-] EXT-009 rename, reject, same-kind merge, confirm, evidence drill-down, and explicit extraction approval
- [-] EXT-010 untrusted-instruction and malformed-output boundary tests
- workspace progress now routes from extracted candidates into review and shows approval state
- review decisions remain local/demo state and preserve the original evidence-linked extraction object IDs

### User flow now enabled

`create assessment -> upload -> validate -> parse -> inspect evidence -> extract architecture candidates -> review each candidate -> rename/reject/merge/confirm -> approve extraction for diagnostics`

### Validation state

Feature code and focused tests are committed. Dependency-backed TypeScript, lint, test, and optimized Next.js build validation must pass in GitHub Actions before these items are marked complete.

### Security and evidence posture

- extraction approval is blocked while any candidate remains pending;
- merge is explicit and allowed only between objects of the same kind;
- rejected and merged-away objects remain represented in review history;
- renaming does not rewrite source evidence or extraction identity;
- malformed extraction objects without evidence fail closed;
- untrusted source instructions do not cause the deterministic adapter to emit unsupported architecture facts;
- demo review state is browser-local and is not suitable for confidential multi-user use.

### Known limitations

- review decisions are not yet durable tenant-scoped records;
- authentication, RLS, private object storage, malware controls, audit/deletion, and tenant-isolation testing remain required for confidential enterprise use;
- OpenAI extraction remains an inactive adapter boundary in demo mode;
- diagnostics, findings review, entity/ID visualization, recommendations, and reporting are not yet implemented.

### Exact next feature

After validation, begin `DIA-001` with a deterministic diagnostic rule framework consuming only an approved extraction review. The first evidence-backed rule should detect ownership gaps or fragmented identifiers without introducing unsupported inference.
