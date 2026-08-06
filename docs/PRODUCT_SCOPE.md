# Product Scope

## Product name

**Sugar Platform Diagnostic**

## Target buyer

- CTO
- CIO
- VP Engineering
- VP Platform
- Chief Architect
- Chief Data Officer
- Head of Enterprise Architecture

## Core problem

Technology organizations have fragmented systems, inconsistent entities and identifiers, duplicated capabilities, brittle integrations, and unclear ownership. Existing documentation is incomplete, contradictory, and difficult to turn into an actionable modernization plan.

## MVP product

A limited, self-service diagnostic in which a technology leader uploads a focused set of architecture artifacts and receives an evidence-backed analysis.

## Primary user outcome

The user should be able to answer:

- What systems and services are involved?
- What business entities and identifiers exist?
- Which systems claim authority?
- Where are capabilities duplicated?
- Which integrations create risk?
- Where is ownership unclear?
- What should we fix first?
- What evidence supports each conclusion?

## Assessment focus options

The user selects one:

1. Entity and identifier fragmentation
2. System and integration complexity
3. Duplicated platform capabilities
4. Ownership and governance gaps
5. API and data-contract inconsistency
6. General platform diagnostic

The first release should optimize for **Entity and identifier fragmentation**.

## Required assessment input

- Company or workspace name
- Assessment title
- Industry
- Selected focus area
- Primary business entity
- Known systems, optional
- Business concern or diagnostic question
- Report audience

## Upload limits

- Maximum 10 files
- Maximum 25 MB per file
- Maximum 150 pages total where measurable
- One primary entity
- One focused assessment
- Supported types only

## Supported initial inputs

- PDF
- Markdown
- plain text
- OpenAPI JSON/YAML
- JSON Schema
- CSV system inventory
- CSV integration inventory
- CSV ownership matrix
- CSV data dictionary
- SQL DDL

## Prohibited input

- Production customer records
- Patient records
- Payment data
- Authentication credentials
- API keys
- Private keys
- Access tokens
- Passwords
- Secrets
- Raw production database exports
- Executable files

## User-facing outputs

- Artifact validation summary
- Extracted object review
- System inventory
- Entity and ID map
- Integration inventory
- Capability map
- Ownership gaps
- Evidence-backed findings
- Maturity summary
- Prioritized recommendations
- 90-day action plan
- Executive report

## Secondary sample path

Users who are not ready to upload files can open the preloaded Acme HealthTech sample assessment and inspect the same output surfaces.

## Explicitly out of scope

- Live GitHub, Jira, Confluence, or cloud connectors
- Continuous architecture monitoring
- Full source-code analysis
- Production database connections
- Automated remediation
- Enterprise SSO/SCIM
- Large-scale ingestion
- Probabilistic matching of production records
- Automatic publication without human review

## Product principles

1. Evidence before opinion.
2. Focus before breadth.
3. Architecture metadata, not production records.
4. Human-reviewable AI output.
5. No finding without traceable support.
6. Facts, derived conclusions, and inferences are visibly distinct.
7. The user controls what enters the final report.
8. Limits are a product feature, not a temporary inconvenience.
