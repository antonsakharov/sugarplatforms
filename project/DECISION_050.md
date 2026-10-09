# ADR-050 — Verify provider identity, authorize from persisted membership

Status: accepted — 2026-09-15

## Decision

Production authentication will verify a Supabase access token server-side against the provider user endpoint. Provider identity is necessary but not sufficient for access. Organization/workspace authorization and viewer/editor/admin role are resolved only from Sugar's persisted membership store for the verified user ID and exact tenant scope.

The application must never trust organization ID, workspace ID, role, or permission claims supplied by browser payloads or editable user metadata. Invalid/expired sessions, provider outages, missing memberships, and scope mismatches fail closed.

The local development adapter remains separate and explicitly non-production-ready.

## Consequences

Route activation becomes asynchronous and requires a production session/cookie integration plus PostgreSQL/RLS membership persistence. This is intentionally deferred until live credentials/infrastructure exist; the provider verifier and authorization composition are independently testable now.
