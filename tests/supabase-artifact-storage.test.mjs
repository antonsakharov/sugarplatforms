import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { SupabasePrivateArtifactStorage } from "../lib/supabase-artifact-storage.ts";

const scopeA = { organizationId: "org-a", workspaceId: "ws-a" };
const scopeB = { organizationId: "org-b", workspaceId: "ws-b" };
const config = {
  projectUrl: "https://demo.supabase.co",
  secretKey: "test-secret-key-with-sufficient-length",
  bucket: "architecture-artifacts",
  signedUrlTtlSeconds: 300
};

function mockFetch(respond) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return respond(calls.length - 1, String(url), init);
  };
  return { calls, fetchImpl };
}

test("Supabase storage uploads to a random tenant-scoped private key", async () => {
  const mock = mockFetch(() => new Response(JSON.stringify({ Key: "ok" }), { status: 200, headers: { "content-type": "application/json" } }));
  const storage = new SupabasePrivateArtifactStorage(config, mock.fetchImpl);
  const bytes = new TextEncoder().encode("architecture metadata only");
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");

  const stored = await storage.put(scopeA, "assessment-1", {
    originalName: "architecture.md",
    mediaType: "text/markdown",
    bytes,
    checksumSha256
  });

  assert.match(stored.storageKey, /^org-a\/ws-a\/assessment-1\/[0-9a-f-]{36}$/);
  assert.equal(mock.calls.length, 1);
  assert.match(mock.calls[0].url, /\/storage\/v1\/object\/architecture-artifacts\/org-a\/ws-a\/assessment-1\//);
  assert.equal(mock.calls[0].init.method, "POST");
  assert.equal(mock.calls[0].init.headers["x-upsert"], "false");
  assert.equal(mock.calls[0].init.headers.Authorization.startsWith("Bearer "), true);
});

test("Supabase storage downloads only tenant-scoped keys", async () => {
  const bytes = new TextEncoder().encode("safe metadata");
  const mock = mockFetch(() => new Response(bytes, { status: 200 }));
  const storage = new SupabasePrivateArtifactStorage(config, mock.fetchImpl);
  const key = "org-a/ws-a/assessment-1/11111111-1111-4111-8111-111111111111";

  assert.deepEqual(await storage.get(scopeA, key), bytes);
  assert.match(mock.calls[0].url, /\/object\/authenticated\/architecture-artifacts\/org-a\/ws-a\/assessment-1\//);
  await assert.rejects(() => storage.get(scopeB, key), /outside the active tenant scope/);
  assert.equal(mock.calls.length, 1);
});

test("Supabase storage deletes through the Storage API and never accepts cross-tenant paths", async () => {
  const mock = mockFetch(() => new Response(JSON.stringify([]), { status: 200 }));
  const storage = new SupabasePrivateArtifactStorage(config, mock.fetchImpl);
  const key = "org-a/ws-a/assessment-1/11111111-1111-4111-8111-111111111111";

  await storage.delete(scopeA, key);
  assert.equal(mock.calls[0].init.method, "DELETE");
  assert.deepEqual(JSON.parse(mock.calls[0].init.body), { prefixes: [key] });
  await assert.rejects(() => storage.delete(scopeB, key), /outside the active tenant scope/);
});

test("Supabase storage creates bounded short-lived signed read URLs", async () => {
  const mock = mockFetch(() => new Response(JSON.stringify({ signedURL: "/storage/v1/object/sign/architecture-artifacts/org-a/ws-a/assessment-1/object?token=test" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  }));
  const storage = new SupabasePrivateArtifactStorage(config, mock.fetchImpl);
  const key = "org-a/ws-a/assessment-1/11111111-1111-4111-8111-111111111111";
  const before = Date.now();
  const signed = await storage.createSignedReadUrl(scopeA, key);

  assert.equal(signed.url, "https://demo.supabase.co/storage/v1/object/sign/architecture-artifacts/org-a/ws-a/assessment-1/object?token=test");
  assert.deepEqual(JSON.parse(mock.calls[0].init.body), { expiresIn: 300 });
  const expires = new Date(signed.expiresAt).getTime();
  assert.equal(expires >= before + 299_000 && expires <= Date.now() + 301_000, true);
});

test("Supabase storage rejects checksum drift before any network request", async () => {
  const mock = mockFetch(() => new Response(null, { status: 200 }));
  const storage = new SupabasePrivateArtifactStorage(config, mock.fetchImpl);
  const bytes = new TextEncoder().encode("metadata");
  await assert.rejects(() => storage.put(scopeA, "assessment-1", {
    originalName: "a.txt",
    mediaType: "text/plain",
    bytes,
    checksumSha256: "0".repeat(64)
  }), /checksum changed/);
  assert.equal(mock.calls.length, 0);
});
