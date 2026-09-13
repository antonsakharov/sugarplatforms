import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  assertTenantStorageKey,
  storedArtifactSchema,
  tenantStoragePrefix,
  type ArtifactStorage,
  type SignedArtifactAccess,
  type StoredArtifact
} from "./artifact-storage";
import type { TenantScope } from "./tenancy";

const configSchema = z.object({
  projectUrl: z.string().url(),
  secretKey: z.string().min(20),
  bucket: z.string().min(2).max(100).regex(/^[a-z0-9][a-z0-9._-]*$/i),
  signedUrlTtlSeconds: z.number().int().min(60).max(3600).default(300)
});

export type SupabaseArtifactStorageConfig = z.infer<typeof configSchema>;

type FetchLike = typeof fetch;

function encodeObjectPath(storageKey: string) {
  return storageKey.split("/").map(encodeURIComponent).join("/");
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

async function errorMessage(response: Response) {
  const text = await response.text().catch(() => "");
  return text.slice(0, 500) || `${response.status} ${response.statusText}`;
}

export class SupabasePrivateArtifactStorage implements ArtifactStorage {
  private readonly config: SupabaseArtifactStorageConfig;
  private readonly fetchImpl: FetchLike;

  constructor(config: SupabaseArtifactStorageConfig, fetchImpl: FetchLike = fetch) {
    this.config = configSchema.parse(config);
    this.fetchImpl = fetchImpl;
  }

  private headers(extra?: HeadersInit) {
    return {
      apikey: this.config.secretKey,
      Authorization: `Bearer ${this.config.secretKey}`,
      ...extra
    };
  }

  private objectUrl(kind: "object" | "authenticated" | "sign", storageKey?: string) {
    const base = `${trimTrailingSlash(this.config.projectUrl)}/storage/v1/object`;
    const bucket = encodeURIComponent(this.config.bucket);
    if (!storageKey) return `${base}/${bucket}`;
    const path = encodeObjectPath(storageKey);
    if (kind === "authenticated") return `${base}/authenticated/${bucket}/${path}`;
    if (kind === "sign") return `${base}/sign/${bucket}/${path}`;
    return `${base}/${bucket}/${path}`;
  }

  async put(
    scope: TenantScope,
    assessmentId: string,
    input: { originalName: string; mediaType: string; bytes: Uint8Array; checksumSha256: string }
  ): Promise<StoredArtifact> {
    const computed = createHash("sha256").update(input.bytes).digest("hex");
    if (computed !== input.checksumSha256) throw new Error("Artifact checksum changed before private persistence.");

    const id = randomUUID();
    const storageKey = `${tenantStoragePrefix(scope, assessmentId)}/${id}`;
    const body = input.bytes.buffer.slice(input.bytes.byteOffset, input.bytes.byteOffset + input.bytes.byteLength) as ArrayBuffer;
    const response = await this.fetchImpl(this.objectUrl("object", storageKey), {
      method: "POST",
      headers: this.headers({
        "Content-Type": input.mediaType || "application/octet-stream",
        "x-upsert": "false",
        "cache-control": "no-store"
      }),
      body
    });
    if (!response.ok) throw new Error(`Private artifact upload failed: ${await errorMessage(response)}`);

    return storedArtifactSchema.parse({
      id,
      assessmentId,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      originalName: input.originalName,
      mediaType: input.mediaType || "application/octet-stream",
      size: input.bytes.byteLength,
      checksumSha256: computed,
      storageKey,
      createdAt: new Date().toISOString()
    });
  }

  async get(scope: TenantScope, storageKey: string): Promise<Uint8Array> {
    assertTenantStorageKey(scope, storageKey);
    const response = await this.fetchImpl(this.objectUrl("authenticated", storageKey), {
      method: "GET",
      headers: this.headers({ "cache-control": "no-store" })
    });
    if (!response.ok) throw new Error(`Private artifact download failed: ${await errorMessage(response)}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async delete(scope: TenantScope, storageKey: string): Promise<void> {
    assertTenantStorageKey(scope, storageKey);
    const response = await this.fetchImpl(this.objectUrl("object"), {
      method: "DELETE",
      headers: this.headers({ "Content-Type": "application/json", "cache-control": "no-store" }),
      body: JSON.stringify({ prefixes: [storageKey] })
    });
    if (!response.ok) throw new Error(`Private artifact deletion failed: ${await errorMessage(response)}`);
  }

  async createSignedReadUrl(scope: TenantScope, storageKey: string): Promise<SignedArtifactAccess> {
    assertTenantStorageKey(scope, storageKey);
    const response = await this.fetchImpl(this.objectUrl("sign", storageKey), {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json", "cache-control": "no-store" }),
      body: JSON.stringify({ expiresIn: this.config.signedUrlTtlSeconds })
    });
    if (!response.ok) throw new Error(`Private artifact signing failed: ${await errorMessage(response)}`);
    const payload = z.object({ signedURL: z.string().optional(), signedUrl: z.string().optional() }).parse(await response.json());
    const signedPath = payload.signedURL ?? payload.signedUrl;
    if (!signedPath) throw new Error("Private artifact signing response did not include a signed URL.");
    return {
      url: new URL(signedPath, `${trimTrailingSlash(this.config.projectUrl)}/`).toString(),
      expiresAt: new Date(Date.now() + this.config.signedUrlTtlSeconds * 1000).toISOString()
    };
  }
}
