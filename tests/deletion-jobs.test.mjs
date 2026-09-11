import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SqliteAssessmentRepository } from "../lib/assessment-repository.ts";
import { SqliteProcessingRepository } from "../lib/processing-repository.ts";
import { SqliteAssessmentLifecycleRepository } from "../lib/assessment-lifecycle.ts";
import { SqliteDeletionJobRepository, requestAssessmentDeletion, retryDeletionJob } from "../lib/deletion-jobs.ts";

const scope = { organizationId: "org_a", workspaceId: "ws_a" };
const otherScope = { organizationId: "org_b", workspaceId: "ws_b" };
const assessmentId = "11111111-1111-4111-8111-111111111111";
const createdAt = "2026-09-11T15:00:00.000Z";

function seed(databasePath) {
  const assessments = new SqliteAssessmentRepository(databasePath);
  assessments.ensureTenant({ organization: { id: "org_a", name: "Org A", createdAt }, workspace: { id: "ws_a", organizationId: "org_a", name: "Workspace A", createdAt } });
  assessments.create(scope, { id: assessmentId, companyName: "Example", assessmentTitle: "Recover", industry: "Technology", focusArea: "entity-identifier-fragmentation", primaryEntity: "Customer", knownSystems: "CRM", businessConcern: "Fragmentation", reportAudience: "CTO", limitsAcknowledged: true, status: "draft", createdAt });
  new SqliteProcessingRepository(databasePath);
  return assessments;
}

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "sugar-job-"));
  try { await run(join(root, "state.sqlite")); } finally { await rm(root, { recursive: true, force: true }); }
}

test("job failure is persisted with bounded retry state and tenant isolation", async () => {
  await fixture(async (databasePath) => {
    seed(databasePath);
    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const jobs = new SqliteDeletionJobRepository(databasePath);
    const plan = lifecycle.prepareDeletion(scope, assessmentId, "admin_user");
    jobs.createFromPlan(scope, "admin_user", plan, 2);
    jobs.startAttempt(scope, plan.operationId);
    const failed = jobs.scheduleFailure(scope, plan.operationId, new Error("temporary outage"));
    assert.equal(failed.status, "retry_scheduled");
    assert.equal(failed.attemptCount, 1);
    assert.equal(failed.maxAttempts, 2);
    assert.match(failed.lastError, /temporary outage/);
    assert.notEqual(failed.nextAttemptAt, null);
    assert.equal(jobs.list(otherScope).length, 0);
    assert.equal(jobs.get(otherScope, plan.operationId), null);
  });
});

test("completed recovery is idempotent and preserves terminal receipt", async () => {
  await fixture(async (databasePath) => {
    const assessments = seed(databasePath);
    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const jobs = new SqliteDeletionJobRepository(databasePath);
    let deleteCalls = 0;
    const storage = { put: async () => { throw new Error("unused"); }, get: async () => new Uint8Array(), delete: async () => { deleteCalls += 1; } };
    const receipt = await requestAssessmentDeletion({ jobs, lifecycle, storage, scope, assessmentId, actorUserId: "admin_user" });
    assert.equal(assessments.findById(scope, assessmentId), null);
    const [job] = jobs.list(scope);
    assert.equal(job.status, "completed");
    assert.equal(job.receipt.assessmentId, assessmentId);
    assert.equal(receipt.operationId, job.operationId);
    const replayed = await retryDeletionJob({ jobs, lifecycle, storage, scope, operationId: job.operationId, actorUserId: "admin_user" });
    assert.equal(replayed.auditEventId, receipt.auditEventId);
    assert.equal(deleteCalls, 0);
    assert.equal(lifecycle.listAudit(scope, assessmentId).filter((event) => event.eventType === "assessment.deletion.completed").length, 1);
  });
});

test("expired running lease becomes due for reconciliation", async () => {
  await fixture(async (databasePath) => {
    seed(databasePath);
    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const jobs = new SqliteDeletionJobRepository(databasePath);
    const plan = lifecycle.prepareDeletion(scope, assessmentId, "admin_user");
    jobs.createFromPlan(scope, "admin_user", plan);
    const running = jobs.startAttempt(scope, plan.operationId);
    assert.equal(jobs.listDue(scope, new Date().toISOString()).length, 0);
    const db = new DatabaseSync(databasePath);
    db.prepare("UPDATE assessment_deletion_jobs SET lease_expires_at = ? WHERE operation_id = ?").run("2000-01-01T00:00:00.000Z", running.operationId);
    db.close();
    assert.equal(jobs.listDue(scope, new Date().toISOString()).length, 1);
  });
});
