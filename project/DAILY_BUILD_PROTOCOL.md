# Daily Build Protocol

## Goal

Advance Sugar Platform Diagnostic by one coherent, testable vertical feature increment each day.

## Required sequence

1. Review the complete feature and backlog list.
2. Mark planned, completed, in-progress, blocked, and future work accurately.
3. Select the next highest-priority incomplete item whose dependencies are complete.
4. Re-read the relevant product scope, system design, security, delivery plan, and architecture decisions.
5. Identify exact user actions, UI components, domain interfaces, schemas, jobs, adapters, tests, configuration, and documentation.
6. Implement production-quality code and supporting files.
7. Enforce MVP limits and upload safety requirements.
8. Run build, type checking, linting, tests, schema validation, feature-specific checks, and tenant-isolation checks where applicable.
9. Fix failures before completion.
10. Recheck against design, security, decisions, and definition of done.
11. Update backlog, features, decisions, setup, and testing notes.
12. Package the full repository as `sugar-platform-diagnostic-YYYY-MM-DD.zip`.
13. Provide a handoff covering feature, user flow, changes, tests, limitations, status, next feature, PR, and ZIP.

## Product priority

Always prefer the shortest path to:

`create assessment -> upload -> validate -> extract -> review -> diagnose -> inspect evidence -> map -> report`

The Acme sample remains functional, but sample-only polish must not displace the real upload workflow.

## Constraints

- No microservices.
- No live production connections in MVP.
- No unsupported finding without evidence.
- No privileged key in browser code.
- No silent merge of ambiguous architecture objects.
- No completion claim when validation fails.
- No production deployment from the daily task.
