import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { SqliteAssessmentRepository } from "../lib/assessment-repository.ts";
import { SqliteProcessingRepository } from "../lib/processing-repository.ts";
import { SqliteExtractionReviewRepository } from "../lib/review-persistence.ts";
import { SqliteFindingReviewRepository } from "../lib/finding-review-persistence.ts";
import { SqliteReportRepository } from "../lib/report-persistence.ts";
import { LocalPrivateArtifactStorage } from "../lib/artifact-storage.ts";
import { AssessmentDeletionNotFoundError, SqliteAssessmentLifecycleRepository, deleteAssessmentWithAudit } from "../lib/assessment-lifecycle.ts";

const scope = { organizationId: "org_a", workspaceId: "ws_a" };
const otherScope = { organizationId: "org_b", workspaceId: "ws_b" };
const createdAt = "2026-09-10T15:00:00.000Z";

function seedAssessment(databasePath) {
  const assessments = new SqliteAssessmentRepository(databasePath);
  assessments.ensureTenant({ organization: { id: "org_a", name: "Org A", createdAt }, workspace: { id: "ws_a", organizationId: "org_a", name: "Workspace A", createdAt } });
  assessments.create(scope, { id: "assessment_a", companyName: "Example", assessmentTitle: "Delete me", industry: "Technology", focusArea: "entity-and-identifier-fragmentation", primaryEntity: "Customer", knownSystems: [], businessConcern: "Fragmentation", reportAudience: "CTO", status: "draft", createdAt });
  new SqliteProcessingRepository(databasePath);
  new SqliteExtractionReviewRepository(databasePath);
  new SqliteFindingReviewRepository(databasePath);
  new SqliteReportRepository(databasePath);
  return assessments;
}

async function withFixture(run) {
  const root = await mkdtemp(join(tmpdir(), "sugar-lifecycle-"));
  const databasePath = join(root, "state.sqlite");
  try { await run({ root, databasePath }); } finally { await rm(root, { recursive: true, force: true }); }
}

test("admin deletion removes private objects and all assessment-scoped state but retains audit receipts", async () => {
  await withFixture(async ({ root, databasePath }) => {
    const assessments = seedAssessment(databasePath);
    const storage = new LocalPrivateArtifactStorage(join(root, "private"));
    const bytes = new TextEncoder().encode("architecture metadata only");
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    const stored = await storage.put(scope, "assessment_a", { originalName: "architecture.md", mediaType: "text/markdown", bytes, checksumSha256 });
    const db = new DatabaseSync(databasePath);
    db.prepare(`INSERT INTO artifact_metadata (organization_id, workspace_id, assessment_id, storage_artifact_id, parser_artifact_id, original_name, media_type, size_bytes, checksum_sha256, parser, warnings_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("org_a", "ws_a", "assessment_a", stored.id, "parser-a", "architecture.md", "text/markdown", bytes.length, checksumSha256, "text", "[]", createdAt);
    db.prepare(`INSERT INTO extraction_snapshots (organization_id, workspace_id, assessment_id, schema_version, provider, prompt_version, status, payload_json, persisted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("org_a", "ws_a", "assessment_a", "1.0", "local", "v1", "complete", "{}", createdAt);
    db.prepare(`INSERT INTO extraction_reviews (organization_id, workspace_id, assessment_id, extraction_fingerprint, review_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run("org_a", "ws_a", "assessment_a", "a".repeat(64), "{}", createdAt);
    db.prepare(`INSERT INTO finding_reviews (organization_id, workspace_id, assessment_id, diagnostic_fingerprint, diagnostics_json, review_json, accepted_findings_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("org_a", "ws_a", "assessment_a", "b".repeat(64), "{}", "{}", "[]", createdAt);
    db.prepare(`INSERT INTO report_snapshots (organization_id, workspace_id, assessment_id, report_id, version, diagnostic_generated_at, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("org_a", "ws_a", "assessment_a", "report-a", 1, createdAt, "{}", createdAt);
    db.close();

    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const receipt = await deleteAssessmentWithAudit({ repository: lifecycle, storage, scope, assessmentId: "assessment_a", actorUserId: "admin_user" });
    assert.equal(receipt.deletedArtifactObjects, 1);
    assert.equal(receipt.deletedRows.assessments, 1);
    assert.equal(receipt.deletedRows.artifact_metadata, 1);
    assert.equal(receipt.deletedRows.extraction_snapshots, 1);
    assert.equal(receipt.deletedRows.extraction_reviews, 1);
    assert.equal(receipt.deletedRows.finding_reviews, 1);
    assert.equal(receipt.deletedRows.report_snapshots, 1);
    assert.equal(assessments.findById(scope, "assessment_a"), null);
    await assert.rejects(() => storage.get(scope, stored.storageKey));
    const events = lifecycle.listAudit(scope, "assessment_a");
    assert.deepEqual(events.map((event) => event.eventType), ["assessment.deletion.requested", "assessment.deletion.completed"]);
    assert.equal(events[1].outcome, "success");
    assert.equal(lifecycle.listAudit(otherScope, "assessment_a").length, 0);
  });
});

test("cross-tenant deletion fails closed", async () => {
  await withFixture(async ({ root, databasePath }) => {
    seedAssessment(databasePath);
    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const storage = new LocalPrivateArtifactStorage(join(root, "private"));
    await assert.rejects(() => deleteAssessmentWithAudit({ repository: lifecycle, storage, scope: otherScope, assessmentId: "assessment_a", actorUserId: "admin_user" }), AssessmentDeletionNotFoundError);
    assert.equal(lifecycle.listAudit(scope, "assessment_a").length, 0);
  });
});

test("storage failure records a failure receipt and leaves database assessment state intact", async () => {
  await withFixture(async ({ databasePath }) => {
    const assessments = seedAssessment(databasePath);
    const db = new DatabaseSync(databasePath);
    db.prepare(`INSERT INTO artifact_metadata (organization_id, workspace_id, assessment_id, storage_artifact_id, parser_artifact_id, original_name, media_type, size_bytes, checksum_sha256, parser, warnings_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("org_a", "ws_a", "assessment_a", "artifact-a", "parser-a", "a.md", "text/markdown", 4, "0".repeat(64), "text", "[]", createdAt);
    db.close();
    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const storage = { put: async () => { throw new Error("unused"); }, get: async () => new Uint8Array(), delete: async () => { throw new Error("object store unavailable"); } };
    await assert.rejects(() => deleteAssessmentWithAudit({ repository: lifecycle, storage, scope, assessmentId: "assessment_a", actorUserId: "admin_user" }), /object store unavailable/);
    assert.notEqual(assessments.findById(scope, "assessment_a"), null);
    const events = lifecycle.listAudit(scope, "assessment_a");
    assert.deepEqual(events.map((event) => event.outcome), ["pending", "failure"]);
  });
});
