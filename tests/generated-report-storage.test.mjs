import assert from "node:assert/strict";
import test from "node:test";
import { GeneratedReportStorageService } from "../lib/generated-report-storage.ts";

const scope = { organizationId: "org-a", workspaceId: "workspace-a" };
function snapshot() { return { id: "report-1", assessmentId: "assessment-1", version: 1, versionLabel: "v1", createdAt: "2026-09-23T00:00:00.000Z", generatedFromDiagnosticAt: "2026-09-23T00:00:00.000Z", report: { assessmentId: "assessment-1" } }; }
function pdf() { return { filename: "report-v1.pdf", mediaType: "application/pdf", sha256: "a".repeat(64), pageCount: 2, generatedFromDiagnosticAt: "2026-09-23T00:00:00.000Z", bytes: new Uint8Array([1,2,3]) }; }

test("persists one immutable generated object and reuses it", async () => {
  let puts = 0; let saved = null;
  const objects = { async put(_s, assessmentId, input) { puts++; return { id:"x", assessmentId, organizationId:"org-a", workspaceId:"workspace-a", originalName:input.originalName, mediaType:input.mediaType, size:3, checksumSha256:input.checksumSha256, storageKey:"org-a/workspace-a/assessment-1/object", createdAt:"2026-09-23T00:00:00.000Z" }; }, async get(){return new Uint8Array()}, async delete(){}, async createSignedReadUrl(){ return { url:"https://example.test/signed", expiresAt:"2026-09-23T00:05:00.000Z" }; } };
  const metadata = { async find(){ return saved; }, async save(_s, value){ saved=value; return value; } };
  const service = new GeneratedReportStorageService(objects, metadata);
  const first = await service.persist(scope, snapshot(), pdf()); const second = await service.persist(scope, snapshot(), pdf());
  assert.equal(puts, 1); assert.deepEqual(second, first); assert.equal(first.reportId, "report-1"); assert.equal(first.version, 1);
});

test("fails closed when PDF provenance differs from immutable snapshot", async () => {
  const objects = { async put(){ throw new Error("must not store"); }, async get(){return new Uint8Array()}, async delete(){}, async createSignedReadUrl(){return null;} };
  const metadata = { async find(){return null;}, async save(){throw new Error("must not save");} };
  const service = new GeneratedReportStorageService(objects, metadata); const changed = pdf(); changed.generatedFromDiagnosticAt = "2026-09-22T00:00:00.000Z";
  await assert.rejects(() => service.persist(scope, snapshot(), changed), /provenance/);
});

test("rejects checksum drift for an already materialized immutable report", async () => {
  const existing = { reportId:"report-1", assessmentId:"assessment-1", version:1, storageKey:"org-a/workspace-a/assessment-1/object", checksumSha256:"b".repeat(64), mediaType:"application/pdf", size:3, pageCount:2, createdAt:"2026-09-23T00:00:00.000Z" };
  const service = new GeneratedReportStorageService({ async put(){throw new Error("must not store");}, async get(){return new Uint8Array()}, async delete(){}, async createSignedReadUrl(){return null;} }, { async find(){return existing;}, async save(){return existing;} });
  await assert.rejects(() => service.persist(scope, snapshot(), pdf()), /metadata mismatch/);
});
