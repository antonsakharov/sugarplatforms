# ADR-052 — Protected routes authorize from the incoming request

**Status:** Accepted

Every protected API handler must pass its incoming `Request` to the server authorization boundary. In Supabase mode, bearer/cookie session extraction, identity verification, exact persisted workspace membership, and role permission checks occur before tenant-scoped state access. Invalid or expired provider sessions normalize to authentication-required behavior; verified users without membership/permission remain authorization failures. The local-only compatibility overload remains internal for non-route/demo code and fails closed whenever Supabase mode is selected.
