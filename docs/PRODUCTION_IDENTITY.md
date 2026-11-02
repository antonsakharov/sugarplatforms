# Production identity and workspace authorization

Sugar now has a provider-neutral production session boundary with a Supabase Auth verifier. The verifier sends the bearer access token to the server-side Supabase `/auth/v1/user` endpoint with `cache: no-store`; only a successful, schema-valid user response becomes an application identity.

Identity alone never grants workspace access. After verification, the application must resolve a persisted membership for the exact organization/workspace and verified user ID. Missing membership fails closed. A membership from another workspace or organization is rejected by the authenticated-context schema. Roles remain `viewer`, `editor`, and `admin`, and existing permission checks remain authoritative.

The existing `local-dev` adapter remains available for credential-free demos and is explicitly `productionReady: false`. A verified Supabase identity plus matching persisted membership produces `authMethod: supabase` and `productionReady: true`.

## Activation boundary

This increment intentionally does not switch existing route handlers to production sessions because there are no live Supabase Auth credentials or production membership store available in CI. Production activation requires: (1) configure a Supabase project and publishable key server-side; (2) establish browser session/cookie handling; (3) resolve the active tenant from server-authorized membership rather than client input; (4) migrate membership persistence to PostgreSQL/RLS; and (5) replace route-level local auth resolution with the async production session resolver.

Until those steps are completed and live cross-tenant tests pass, confidential enterprise use remains prohibited. The local/demo workflow remains the supported executable path.

## Security properties

Access tokens are not persisted or logged by this adapter. Provider responses are fetched without cache. Invalid, expired, malformed, timed-out, or unavailable identity responses fail closed. Role claims are not accepted from Supabase user metadata or from the client; authorization comes only from the persisted application membership.
