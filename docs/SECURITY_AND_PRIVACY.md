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
- fail-closed malware scanning before persistence or parsing;
- clear warning that detection is not perfect;
- user acknowledgement of upload rules.

### Authentication and authorization

- authenticated access for real assessments;
- organization-scoped roles;
- server-side authorization;
- row-level security;
- private buckets;
- short-lived signed URLs.

### Private artifact storage

Artifact storage is server-only and provider-neutral. Keys are derived as `<organization>/<workspace>/<assessment>/<random-id>` and original filenames never become storage paths. Every read, signed-access request, and delete operation revalidates the active tenant prefix before provider I/O.

The credential-free demo adapter uses a private local filesystem. The managed adapter uses a private Supabase Storage bucket with a server-only secret, authenticated reads, Storage API deletion, and bounded signed-read URLs. Signed URLs default to five minutes and cannot be configured above one hour; they are transient capability URLs and must not be written to reports, assessment state, audit records, or logs. Selecting managed storage without required server-side credentials fails at configuration time.

Mocked provider tests verify checksum enforcement and cross-tenant rejection, but live bucket isolation has not yet been certified. Confidential production use still requires real-bucket tests proving anonymous access is denied and tenant A cannot read, sign, overwrite, or delete tenant B objects.

### Malware scanning and quarantine

Uploaded bytes remain in a pre-persistence quarantine boundary until every artifact receives an explicit clean malware-scan result. The gate executes before private object storage, parsing, extraction, or processing persistence. Any infected artifact rejects the complete focused artifact set; scanner timeout, outage, or unrecognized output also fails closed.

The local/demo provider detects only bounded EICAR and executable signatures and must not be represented as production antivirus coverage. Production mode supports a server-only ClamAV `INSTREAM` boundary with configured host, port, and timeout. Checksums are revalidated before scanner provider execution, scanner responses never authorize tenant storage paths, and routine logs must not echo artifact contents.

Live scanner-service hardening, signature freshness and health monitoring, worst-case throughput testing, and integrated production-storage isolation validation remain required before confidential production use.

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

Deletion recovery is also durable. Each operation has a tenant-scoped job that stores only operational metadata: server-derived object keys, per-object completion checkpoints, attempt count/budget, retry timing, a short execution lease, bounded error text, and the terminal receipt. The default budget is three attempts with exponential backoff beginning at 30 seconds and capped at 15 minutes; running attempts have a five-minute lease so interrupted work becomes reclaimable. Administrator job status is redacted and never returns storage keys. Reconciliation is server-authorized, tenant-scoped, and bounded to at most 20 due jobs per invocation.

If private object deletion fails, relational assessment state is retained and failure is recorded rather than reporting successful deletion. Object deletion is idempotent and completed object keys are checkpointed so retries skip successful work. If a process exits after the relational purge commits but before job completion is recorded, reconciliation repairs the job from the durable `assessment.deletion.completed` audit receipt instead of replaying the purge.

Provider indexes and any future derived object-storage outputs must also participate in the same lifecycle once introduced.

## Production readiness

Before accepting confidential enterprise materials, tenant isolation, live malware-scanner operations, backup/restore, incident response, provider retention, PostgreSQL/RLS-backed audit/deletion-job persistence, an authenticated scheduler/worker, live private-bucket deletion/reconciliation, data-processing terms, and log redaction must be verified.

### 2026-10-13 bounded PDF decoder limits
The local PDF ToUnicode decoder rejects mixed-width codespaces, unknown or partially mapped glyphs, unsupported CMap inheritance, and unproven physical page numbers. CMaps are capped at 64 KiB, mapped glyph entries at 1,024, UTF-16 units per glyph at 64, decoded PDF streams at 4 MiB, and decoded text per text block at 1 MiB. These safeguards do not make the local parser suitable for confidential production artifacts; production scanner, identity, storage isolation, and retention gates remain mandatory.

### 2026-10-19 — ASCII85 stream safety

The local/demo PDF adapter rejects malformed or unterminated ASCII85 data, invalid base-85 groups, group overflow, unsupported filter parameters, and excessive encoded or decoded stream bytes. Byte budgets are enforced on every filter stage (4 MiB for page content, 64 KiB for CMaps). It never infers missing glyphs, source pages, or authority claims. This decoder is not a malware scanner or a substitute for production-grade PDF/OCR processing, authenticated storage, or live two-tenant security validation.

### 2026-10-20 bounded PDF mixed-width decoding

The local/demo ToUnicode adapter accepts mixed one-/two-byte glyph codes only when no one-byte codespace intersects the first-byte prefix of a two-byte interval. Missing mappings, truncated codes, ambiguous prefixes, unsupported CMap inheritance, and malformed ranges fail closed rather than contributing unverified extraction evidence. This does not relax upload limits, content restrictions, tenant authorization, malware quarantine, or report acceptance gates; production PDF and live two-tenant certification remain required.

### 2026-10-21 — RunLength stream safety

The local/demo PDF decoder accepts `/RunLengthDecode` (`/RL`) only under the existing bounded shared filter boundary. Literal and repeat runs must be complete, an explicit EOD byte must be present, and only PDF whitespace may follow EOD. Every decoded stage is bounded before expansion (4 MiB page content, 64 KiB font maps). Malformed/unsupported streams fail closed, with no fabricated evidence or access to live systems. This does not replace malware scanning, prohibited-data checks, or live tenant-isolation certification.

### 2026-10-22 — LZW PDF decoding safety boundary

The local PDF stream adapter supports default-EarlyChange `/LZWDecode`/`/LZW` only. It rejects any DecodeParms/predictor declaration, missing clear/EOD, invalid or truncated codes, nonzero trailing padding and output-budget overruns. A bounded prefix/suffix table and reconstruction stack prevent unbounded dictionary growth. The existing 4 MiB page and 64 KiB font-map decoded-stream caps apply at each filter stage; unproven page coordinates are never emitted. This does not relax architecture-metadata-only input, prohibited-data screening, upload limits, or tenant authorization.

### 2026-10-23 — PNG predictor decoding boundary

The bounded local/demo PDF decoder accepts only direct `/FlateDecode` with explicit `/DecodeParms` PNG Predictor 15, 8-bit single-channel rows and 1–4096 columns. PNG row filters 0–4 are validated, rows must be complete, and the 4 MiB page/64 KiB font-map budget applies to encoded, inflated and reconstructed stages. Unsupported parameters, aliases, filter chains, truncated rows and unknown filter tags fail closed without synthetic evidence. This does not relax upload limits, prohibited-data scanning, authorization, private storage or production isolation requirements.

### 2026-10-24 — TIFF Predictor 2 decoding boundary

The bounded local/demo PDF stream decoder accepts only direct single-filter Flate with `/DecodeParms` Predictor 2, one 8-bit channel, and 1–4096 columns. Each complete row resets the horizontal predictor; encoded, inflated and reconstructed bytes remain under the existing 4 MiB page / 64 KiB font-map limits. Unsupported parameters, partial rows, chains, and unproven page/glyph evidence fail closed. This does not weaken upload limits, architecture-metadata-only input rules, malware quarantine, tenant authorization, or production security gates.

### 2026-10-25 — Dependency supply-chain validation
The source baseline gate rejects npm lock entries with untrusted tarball origins, malformed SHA-512 SRI, missing pinned versions or missing required transitive packages. The restored `better-sqlite3@12.10.1` SRI records are from a versioned public npm lockfile and are not treated as a substitute for actual npm registry integrity verification during `npm ci`. This gate does not relax upload content restrictions, secret scanning, malware quarantine, tenant authorization, private storage, deletion, or evidence requirements. No production deployment is authorized without full CI and live non-`BYPASSRLS` tenant-isolation testing.

### 2026-10-25 — Local audit ordering
SQLite deletion audit receipts now use `(created_at, rowid)` order, not UUID order, so request and outcome records sharing one millisecond are presented in insertion order. This is a local/single-instance determinism fix only; production PostgreSQL audit, non-`BYPASSRLS` tenant isolation and storage deletion guarantees still require live validation. See Decision 089.

### PDF object-stream handling (2026-10-26)
The local/demo parser expands only bounded, direct-length Flate `/ObjStm` dictionary objects with strict index/offset, duplicate-ID and aggregate caps; malformed, encrypted, nested, revisioned or unprovable structures fail closed. Verified page-tree references are required before emitting physical-page evidence. This does not replace a security-reviewed production PDF parser, malware scanning, tenant isolation, or upload restrictions. See Decision 090.

### 2026-10-27 — PDF cross-reference trust boundary
The local/demo PDF parser accepts only one bounded, complete, non-revisioned Flate xref stream. It verifies `startxref`, physical offsets, compressed object indexes, root Catalog, entry coverage, and byte budgets before attributing physical-page evidence. Unsupported classic/hybrid/incremental structures fail closed. This does not relax malware quarantine, tenant authorization, upload limits, prohibited-data scanning, or live production isolation requirements (Decision 091).

### 2026-10-28 — Classic PDF xref validation boundary

The local/demo parser validates a single complete classic xref table against direct object offsets, a direct Root Catalog, and strict generation-zero/size limits before page evidence. It rejects incremental/hybrid revisions, compressed objects under a classic table, malformed trailers and unindexed objects. This reduces ambiguous evidence attribution but does not make the parser suitable for confidential production PDFs or replace malware quarantine, secret screening, authorization, tenant-scoped private storage, or live two-tenant certification. Existing 10-file/25-MB/150-page and architecture-metadata-only limits remain unchanged (Decision 092).

### 2026-10-29 — PDF trailer metadata safety

The local PDF adapter checks classic `/Info` and `/ID` metadata only for structural validity. It does not copy titles, producers, document identifiers, or other trailer metadata into extracted objects, evidence, logs, findings, or reports. `/Info` must resolve to an indexed live direct dictionary, not a page, stream, or Catalog; `/ID` is two bounded hex strings, not a credential or identity token. Unknown keys, duplicate fields, malformed references, encryption, hybrid xrefs, and incremental revisions fail closed. Existing upload malware/secret scanning and MVP restrictions still apply; this is not production PDF/OCR or live tenant security certification.

### 2026-10-30 — Trailer comment trust boundary
PDF `%` comments are ignored only in the bounded classic trailer/startxref lexical grammar, never in evidence-bearing page streams or object offsets. The parser rejects non-PDF whitespace, comments embedded in hex IDs, duplicate/unknown keys, revisions, encryption, extra EOF markers and oversized terminal sections. Comments and `/Info`/`/ID` values are not diagnostic evidence. Existing malware quarantine, prohibited-content checks, private storage, tenant scoping, and 10-file/25-MB/150-page limits remain mandatory. This is not live production isolation certification (Decision 094).
