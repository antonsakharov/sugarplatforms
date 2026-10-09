import test from "node:test";
import assert from "node:assert/strict";
import { verifySupabaseAccessToken, InvalidSessionError } from "../lib/supabase-auth.ts";
import { authenticateProductionSession, MembershipRequiredError } from "../lib/production-auth.ts";

const config = { projectUrl: "https://example.supabase.co", publishableKey: "sb_publishable_test_key_123456", timeoutMs: 1000 };
const tenant = { organization: { id: "org-1", name: "Org One", createdAt: "2026-09-15T00:00:00.000Z" }, workspace: { id: "ws-1", organizationId: "org-1", name: "Workspace One", createdAt: "2026-09-15T00:00:00.000Z" } };
const envelope = { id: "123e4567-e89b-12d3-a456-426614174000", email: "cto@example.com", created_at: "2026-09-15T00:00:00.000Z", user_metadata: { full_name: "Demo CTO" } };
const okFetch = async (_url, init) => { assert.equal(init.cache, "no-store"); assert.match(init.headers.Authorization, /^Bearer /); return new Response(JSON.stringify(envelope), { status: 200, headers: { "content-type": "application/json" } }); };

test("verifies access token against Supabase user endpoint", async () => {
  const user = await verifySupabaseAccessToken("a".repeat(40), config, okFetch);
  assert.equal(user.id, envelope.id); assert.equal(user.displayName, "Demo CTO");
});

test("rejects invalid or expired provider sessions", async () => {
  await assert.rejects(() => verifySupabaseAccessToken("a".repeat(40), config, async () => new Response("{}", { status: 401 })), InvalidSessionError);
});

test("requires persisted workspace membership after identity verification", async () => {
  await assert.rejects(() => authenticateProductionSession({ accessToken: "a".repeat(40), tenant, supabase: config, fetchImpl: okFetch, resolveMembership: () => null }), MembershipRequiredError);
});

test("returns production-ready context only for matching persisted membership", async () => {
  const context = await authenticateProductionSession({ accessToken: "a".repeat(40), tenant, supabase: config, fetchImpl: okFetch, resolveMembership: ({ userId }) => ({ userId, organizationId: "org-1", workspaceId: "ws-1", role: "editor", createdAt: "2026-09-15T00:00:00.000Z" }) });
  assert.equal(context.authMethod, "supabase"); assert.equal(context.productionReady, true); assert.equal(context.membership.role, "editor");
});

test("rejects membership from another workspace", async () => {
  await assert.rejects(() => authenticateProductionSession({ accessToken: "a".repeat(40), tenant, supabase: config, fetchImpl: okFetch, resolveMembership: ({ userId }) => ({ userId, organizationId: "org-1", workspaceId: "ws-other", role: "admin", createdAt: "2026-09-15T00:00:00.000Z" }) }));
});
