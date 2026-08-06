# System Design

## 1. Product architecture goal

Build a limited, upload-based platform diagnostic that can safely analyze architecture metadata and produce evidence-backed outputs without requiring production-system access.

## 2. Architectural style

Use a modular monolith.

The initial product is operated by one founder and has evolving boundaries. Microservices would add operational complexity without improving the first customer outcome.

## 3. Core user flow

`create assessment -> select focus -> upload limited artifacts -> validate -> parse -> extract -> review -> analyze -> review findings -> map -> report`

## 4. Runtime containers

### Web application

- Next.js App Router
- TypeScript
- server-rendered product UI
- route handlers
- authorization middleware
- demo adapter for Acme fixture data

### PostgreSQL

Stores:

- organizations and memberships;
- assessments and limits;
- artifact metadata;
- source segments;
- extracted objects;
- evidence;
- review decisions;
- findings;
- recommendations;
- reports;
- job state;
- audit events.

### Private object storage

Stores:

- original uploads;
- normalized parse output;
- generated reports.

### AI Gateway

Single application boundary for:

- model selection;
- prompt versioning;
- structured output;
- cost controls;
- retry/timeout behavior;
- schema validation;
- redaction hooks;
- usage tracking.

### Job runner

Processes:

- validation;
- parsing;
- extraction;
- reconciliation;
- diagnostics;
- report generation.

Initial implementation may use a database-backed job table and secured scheduled endpoint.

## 5. Functional modules

### Assessment module

- assessment creation;
- focus-area selection;
- primary-entity definition;
- limit enforcement;
- lifecycle and versioning.

### Upload and validation module

- file count limit;
- size limit;
- supported type allowlist;
- checksum/duplicate detection;
- total page estimate;
- potential secret scanning;
- prohibited-data warnings;
- readiness state.

### Parsing module

Adapters for:

- PDF;
- Markdown/text;
- JSON/YAML;
- OpenAPI;
- CSV;
- SQL DDL.

Each parser must preserve source coordinates.

### Extraction module

Produces structured:

- systems;
- services;
- entities;
- identifiers;
- integrations;
- capabilities;
- owners;
- authority claims;
- evidence.

### Review module

Allows users to:

- rename;
- reject;
- merge;
- keep ambiguous records separate;
- confirm evidence;
- approve the extraction set.

### Diagnostic module

Runs deterministic rules first, followed by AI-assisted analysis.

Initial rules:

- fragmented identifiers;
- competing authority claims;
- duplicate matching logic;
- duplicate platform capabilities;
- ownership gaps;
- direct database coupling;
- long synchronous chains;
- conflicting contract definitions;
- manual reconciliation.

### Visualization module

MVP:

- entity and ID graph;
- evidence drill-down.

Later:

- system dependency graph;
- capability matrix;
- ownership map.

### Reporting module

Generates from accepted findings only:

- executive summary;
- scope and artifact inventory;
- top findings;
- entity/ID analysis;
- maturity summary;
- recommendations;
- 90-day plan;
- evidence appendix.

## 6. Assessment limits

Default MVP policy:

- `max_files = 10`
- `max_file_bytes = 26214400`
- `max_total_pages = 150`
- `max_primary_entities = 1`
- `max_active_assessments_per_workspace = 1`

Limits must be enforced server-side.

## 7. Supported and prohibited content

### Supported

Architecture metadata, contracts, schemas, inventories, ownership matrices, integration documentation, and related technical evidence.

### Prohibited

Customer records, patient records, payment data, credentials, API keys, access tokens, private keys, passwords, executable files, and raw production datasets.

Validation can warn on likely secrets but must not claim perfect detection.

## 8. Evidence model

Every extracted claim stores:

- artifact ID/version;
- locator;
- excerpt or normalized supporting representation;
- evidence type;
- confidence;
- extraction method;
- prompt/rule version;
- review status.

Evidence types:

- direct;
- derived;
- inferred;
- confirmed;
- rejected.

## 9. Finding model

Each finding includes:

- category;
- severity;
- confidence;
- fact status;
- title and description;
- business impact;
- technical impact;
- affected systems/entities;
- evidence IDs;
- recommendation;
- validation questions;
- review status.

No accepted finding may exist without evidence.

## 10. Processing pipeline

1. Create assessment and enforce scope.
2. Upload object privately.
3. Validate type, size, count, duplication, and total-page estimate.
4. Scan for likely secrets/prohibited patterns.
5. Parse content into source-addressable segments.
6. Run structured extraction.
7. Validate model response against schema.
8. Reconcile likely duplicates without silent merge.
9. Present extraction review.
10. Run deterministic diagnostic rules.
11. Run AI-assisted cross-source analysis.
12. Validate evidence coverage.
13. Present findings for review.
14. Calculate focused maturity summary.
15. Generate recommendations and 90-day plan.
16. Generate versioned report.

## 11. Multi-tenancy

- organization ID on all tenant records;
- row-level security;
- server-side authorization;
- tenant-scoped storage paths;
- no shared semantic index across tenants;
- tenant-isolation tests.

## 12. Security

- private storage;
- signed URLs;
- server-only privileged keys;
- allowlisted upload types;
- bounded upload sizes;
- prompt-injection isolation;
- structured output;
- log redaction;
- deletion workflow;
- audit events;
- bounded AI cost;
- no live production access in MVP.

## 13. Reliability

- idempotent jobs;
- operation keys;
- bounded retries;
- dead-letter state;
- partial-result visibility;
- resumable assessment;
- transactional status changes;
- schema validation before persistence.

## 14. Deployment

Preferred:

- Vercel
- Supabase
- OpenAI Responses API

Portable:

- Dockerized Next.js
- PostgreSQL
- S3-compatible storage
- external scheduler
- AI Gateway adapter

## 15. Demo mode

The Acme HealthTech sample uses the same domain objects and UI surfaces as real assessments. It runs from fixture data without database or model credentials.

## 16. Success criteria

The MVP is complete when a user can:

1. create a focused assessment;
2. upload a compliant artifact set;
3. review structured extraction;
4. run diagnostics;
5. inspect evidence-backed findings;
6. view an entity/ID map;
7. generate an executive report.
