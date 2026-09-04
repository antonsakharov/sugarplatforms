import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { z } from "zod";
import type { TenantScope } from "./tenancy";

const idPart = z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/i);

export const storedArtifactSchema = z.object({
  id: z.string().uuid(),
  assessmentId: idPart,
  organizationId: idPart,
  workspaceId: idPart,
  originalName: z.string().min(1).max(255),
  mediaType: z.string().min(1).max(160),
  size: z.number().int().nonnegative(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  storageKey: z.string().min(1).max(500),
  createdAt: z.string().datetime()
});
export type StoredArtifact = z.infer<typeof storedArtifactSchema>;

export type ArtifactStorage = {
  put(scope: TenantScope, assessmentId: string, input: { originalName: string; mediaType: string; bytes: Uint8Array; checksumSha256: string }): Promise<StoredArtifact>;
  get(scope: TenantScope, storageKey: string): Promise<Uint8Array>;
  delete(scope: TenantScope, storageKey: string): Promise<void>;
};

export function tenantStoragePrefix(scope: TenantScope, assessmentId: string) {
  idPart.parse(scope.organizationId); idPart.parse(scope.workspaceId); idPart.parse(assessmentId);
  return `${scope.organizationId}/${scope.workspaceId}/${assessmentId}`;
}

export function assertTenantStorageKey(scope: TenantScope, storageKey: string) {
  const expected = `${scope.organizationId}/${scope.workspaceId}/`;
  if (!storageKey.startsWith(expected) || storageKey.includes("..") || storageKey.startsWith("/")) {
    throw new Error("Artifact storage key is outside the active tenant scope.");
  }
  return storageKey;
}

export class LocalPrivateArtifactStorage implements ArtifactStorage {
  constructor(private readonly root: string) {}

  private pathFor(scope: TenantScope, storageKey: string) {
    assertTenantStorageKey(scope, storageKey);
    const root = resolve(this.root);
    const target = resolve(root, storageKey);
    if (target !== root && !target.startsWith(root + sep)) throw new Error("Artifact storage path escapes the configured private root.");
    return target;
  }

  async put(scope: TenantScope, assessmentId: string, input: { originalName: string; mediaType: string; bytes: Uint8Array; checksumSha256: string }) {
    const computed = createHash("sha256").update(input.bytes).digest("hex");
    if (computed !== input.checksumSha256) throw new Error("Artifact checksum changed before private persistence.");
    const id = randomUUID();
    const storageKey = `${tenantStoragePrefix(scope, assessmentId)}/${id}`;
    const path = this.pathFor(scope, storageKey);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, input.bytes, { mode: 0o600, flag: "wx" });
    return storedArtifactSchema.parse({ id, assessmentId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, originalName: input.originalName, mediaType: input.mediaType || "application/octet-stream", size: input.bytes.byteLength, checksumSha256: computed, storageKey, createdAt: new Date().toISOString() });
  }

  async get(scope: TenantScope, storageKey: string) {
    return new Uint8Array(await readFile(this.pathFor(scope, storageKey)));
  }

  async delete(scope: TenantScope, storageKey: string) {
    await rm(this.pathFor(scope, storageKey), { force: true });
  }
}
