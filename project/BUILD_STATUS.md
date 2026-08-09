# Build Status

## 2026-08-09

### Implemented in this increment

- [-] UPL-005 SHA-256 duplicate detection within the submitted artifact set
- [-] UPL-006 PDF/text page estimation and server-enforced 150-page measurable limit
- [-] UPL-007 probable-secret and prohibited-data warning scan with redacted messages
- [-] UPL-008 remove, individual replace, and replace-set workflow
- [-] UPL-009 explicit ready / review-required summary
- [-] UPL-010 behavioral content-policy tests plus upload contract tests

These remain in progress until dependency-backed TypeScript and Next.js production build validation passes and production upload security is implemented.

### User flow now enabled

`create assessment -> choose focus -> define primary entity -> acknowledge limits -> choose artifact set -> server validate count/size/type -> inspect bytes transiently -> SHA-256 duplicate check -> page-limit check -> best-effort sensitive-content warning scan -> remove/replace flagged artifacts -> ready-for-parsing summary`

### Validation completed locally

- 13/13 Node behavioral and contract tests pass;
- source-policy lint passes after fixing its pre-existing self-match bug;
- all 4 JSON schemas parse successfully;
- no uploaded bytes are written to local disk, object storage, or browser persistence;
- only safe artifact metadata, checksums, page estimates, risk categories/messages, and readiness state are persisted in the demo browser adapter.

### Known limitations

- full TypeScript/Next.js production validation requires dependency installation unavailable in this runtime;
- PDF page counting uses PDF page-object inspection and can be unmeasurable for unusual encodings;
- PDF sensitive-content scanning is best-effort against raw bytes and may miss compressed/encrypted content;
- content-risk scanning cannot guarantee detection and does not make the product safe for regulated/customer records;
- authentication, tenant authorization, private object storage, malware scanning, deletion, and audit controls are still required before confidential enterprise upload.

### Exact next feature

Begin parsing and evidence inventory with `PAR-001` text/Markdown parser, `PAR-002` JSON/YAML/OpenAPI parser, and `PAR-006` source-addressable segment model, delivered as one local/demo vertical slice from a readiness-approved artifact set to inspectable source segments.
