# Validation — 2026-09-24

Feature: managed PostgreSQL/RLS generated-report object metadata.

Validation target:
- managed metadata reads are JWT-authenticated and explicitly tenant/assessment/report filtered;
- managed inserts derive tenant scope from authenticated server context;
- missing JWT fails closed;
- migration forces RLS and limits writes to editor/admin memberships;
- no service-role bypass is introduced;
- local/demo metadata remains available;
- full repository validation is executed by CI for the branch/PR.

Live two-tenant Supabase database/storage validation remains blocked until isolated infrastructure credentials are available.
