# Managed Finding Review Persistence

When `PERSISTENCE_PROVIDER=supabase-postgres`, finding-review state uses the verified Supabase end-user JWT rather than a privileged service-role credential.

## Security boundary

Reads are explicitly filtered by organization, workspace, and assessment and are also protected by forced PostgreSQL RLS. Writes call `save_finding_review`, a `SECURITY INVOKER` RPC available only to authenticated users. The RPC independently requires editor/admin membership and compares the exact extraction-review JSON seen by the application with the current persisted extraction review before changing finding state.

The write also verifies that the diagnostic envelope references the assessment and the current extraction approval timestamp. A stale extraction approval therefore fails closed.

## Atomic accepted findings

The application validates review decisions against the diagnostic envelope and materializes accepted findings before the RPC. Review JSON, diagnostic JSON, diagnostic fingerprint, and accepted-finding JSON are then written atomically in one database transaction. Downstream consumers never need to reconstruct accepted findings from a partially saved review.

## Deployment

Apply migrations through `005_finding_review_rls.sql` in order after the existing assessment, processing, and extraction-review migrations. Configure `AUTH_PROVIDER=supabase`, `PERSISTENCE_PROVIDER=supabase-postgres`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`.

Do not use a service-role key for application finding-review traffic. Live deployment requires two-tenant tests using authenticated identities that do not have `BYPASSRLS`.

## Current limitation

Automated tests validate the provider contract, tenant filters, JWT propagation, staleness checks, accepted-finding materialization, and migration policy text. Live Supabase isolation remains blocked until isolated test credentials are available.
