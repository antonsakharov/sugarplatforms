# Sugar Platform Diagnostic

Sugar Platform Diagnostic is a limited, real, upload-based platform assessment product for CTOs, platform leaders, architects, and technology organizations.

A user creates a focused assessment, uploads a controlled set of architecture artifacts, reviews extracted systems/entities/identifiers, runs evidence-backed diagnostics, and receives a platform map plus an executive report.

A preloaded **Acme HealthTech** assessment remains available as a secondary sample path so prospects can see the result before uploading their own material.

## Primary product flow

1. Create an assessment.
2. Select one diagnostic focus.
3. Name one primary business entity.
4. Upload up to 10 supported architecture artifacts.
5. Validate and parse the files.
6. Review extracted systems, entities, identifiers, integrations, capabilities, and owners.
7. Run deterministic and AI-assisted diagnostic analysis.
8. Review evidence-backed findings.
9. Explore the entity/ID map.
10. Generate an executive report.

## MVP limits

- One focused assessment per workspace
- One primary business entity
- Up to 10 files
- Up to 25 MB per file
- Up to 150 pages total where measurable
- Architecture metadata only
- No customer records
- No secrets, credentials, or access tokens
- No live production-system access
- Supported formats only

## Supported initial artifact types

- PDF architecture documents
- Markdown and plain text
- OpenAPI JSON or YAML
- JSON Schema
- CSV system inventories
- CSV ownership matrices
- CSV integration inventories
- CSV data dictionaries
- SQL DDL

## Product promise

> Upload a focused set of architecture artifacts and receive an evidence-backed diagnostic of fragmented entities, duplicated capabilities, brittle integrations, ownership gaps, and recommended next steps.

## Repository contents

- `docs/PRODUCT_SCOPE.md`
- `docs/SYSTEM_DESIGN.md`
- `docs/USER_JOURNEY.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/DELIVERY_PLAN.md`
- `docs/DEMO_SCENARIO.md`
- `docs/FEATURES.md`
- `architecture/*.mmd`
- `schemas/*.json`
- `prompts/*.md`
- `project/BACKLOG.md`
- `project/DAILY_BUILD_PROTOCOL.md`
- `project/DECISIONS.md`
- `.env.example`

## Recommended stack

- Next.js App Router with TypeScript
- PostgreSQL/Supabase for managed database, authentication, and object storage
- OpenAI Responses API behind an internal AI Gateway
- Database-backed background jobs initially
- Mermaid first, React Flow later
- Docker-compatible deployment with Vercel as the easiest first path

## First production milestone

A CTO can upload a limited artifact set and receive:

- validated artifact inventory;
- extracted system and entity catalog;
- entity/identifier map;
- evidence-backed findings;
- maturity summary;
- prioritized recommendations;
- executive report.

## Status

Product direction and system design: updated for limited platform diagnostics  
Application code: next phase
