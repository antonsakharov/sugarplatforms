import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { LocalPrivateArtifactStorage, assertTenantStorageKey, tenantStoragePrefix } from "../lib/artifact-storage.ts";

const scopeA = { organizationId: "org-a", workspaceId: "ws-a" };
const scopeB = { organizationId: "org-b", workspaceId: "ws-b" };

async function withStorage(run) {
  const root = await mkdtemp(join(tmpdir(), "sugar-private-storage-"));
  try { await run(new LocalPrivateArtifactStorage(root)); } finally { await rm(root, { recursive: true, force: true }); }
}

test("tenant storage prefix includes organization workspace and assessment", () => {
  assert.equal(tenantStoragePrefix(scopeA, "assessment-1"), "org-a/ws-a/assessment-1");
});

test("private local storage round-trips bytes only for the same tenant", async () => {
  await withStorage(async (storage) => {
    const bytes = new TextEncoder().encode("architecture metadata only");
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    const stored = await storage.put(scopeA, "assessment-1", { originalName: "architecture.md", mediaType: "text/markdown", bytes, checksumSha256 });
    assert.equal(stored.storageKey.startsWith("org-a/ws-a/assessment-1/"), true);
    assert.deepEqual(await storage.get(scopeA, stored.storageKey), bytes);
    await assert.rejects(() => storage.get(scopeB, stored.storageKey), /outside the active tenant scope/);
  });
});

test("storage rejects checksum drift before persistence", async () => {
  await withStorage(async (storage) => {
    const bytes = new TextEncoder().encode("safe architecture metadata");
    await assert.rejects(() => storage.put(scopeA, "assessment-1", { originalName: "a.txt", mediaType: "text/plain", bytes, checksumSha256: "0".repeat(64) }), /checksum changed/);
  });
});

test("storage rejects traversal and cross-tenant keys", () => {
  assert.throws(() => assertTenantStorageKey(scopeA, "org-a/ws-a/../secret"), /outside the active tenant scope/);
  assert.throws(() => assertTenantStorageKey(scopeA, "org-b/ws-b/x"), /outside the active tenant scope/);
});
