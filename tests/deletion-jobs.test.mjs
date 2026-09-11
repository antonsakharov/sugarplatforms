import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteAssessmentRepository } from "../lib/assessment-repository.ts";
import { SqliteProcessingRepository } from "../lib/processing-repository.ts";
import { SqliteAssessmentLifecycleRepository } from "../lib/assessment-lifecycle.ts";
import { SqliteDeletionJobRepository, requestAssessmentDeletion, retryDeletionJob } from "../lib/deletion-jobs.ts";

const scope = { organizationId: "org_a", workspaceId: "ws_a" };
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

test("job failure is persisted with bounded retry state", async () => {
  await fixture(async (databasePath) => {
    seed(databasePath);
    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const jobs = new SqliteDeletionJobRepository(databasePath);
    const storage = { put: async () => { throw new Error("unused"); }, get: async () => new Uint8Array(), delete: async () => { throw new Error("temporary outage"); } };
    const plan = lifecycle.prepareDeletion(scope, assessmentId, "admin_user");
    jobs.createFromPlan(scope, "admin_user", plan, 2);
    jobs.startAttempt(scope, plan.operationId);
    const failed = jobs.scheduleFailure(scope, plan.operationId, new Error("temporary outage"));
    assert.equal(failed.status, "retry_scheduled");
    assert.equal(failed.attemptCount, 1);
    assert.equal(failed.maxAttempts, 2);
    assert.match(failed.lastError, /temporary outage/);
    assert.notEqual(failed.nextAttemptAt, null);
    void storage;
  });
});

test("completed recovery job removes assessment and preserves terminal receipt", async () => {
  await fixture(async (databasePath) => {
    const assessments = seed(databasePath);
    const lifecycle = new SqliteAssessmentLifecycleRepository(databasePath);
    const jobs = new SqliteDeletionJobRepository(databasePath);
    const storage = { put: async () => { throw new Error("unused"); }, get: async () => new Uint8Array(), delete: async () => {} };
    const receipt = await requestAssessmentDeletion({ jobs, lifecycle, storage, scope, assessmentId, actorUserId: "admin_user" });
    assert.equal(assessments.findById(scope, assessmentId), null);
    const [job] = jobs.list(scope);
    assert.equal(job.status, "completed");
    assert.equal(job.receipt.assessmentId, assessmentId);
    assert.equal(receipt.operationId, job.operationId);
    await assert.rejects(() => retryDeletionJob({ jobs, lifecycle, storage, scope, operationId: job.operationId, actorUserId: "admin_user" }));
  });
});
