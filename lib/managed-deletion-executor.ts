import type { ArtifactStorage } from "./artifact-storage.ts";
import type { AssessmentDeletionReceipt } from "./assessment-lifecycle.ts";
import type { DeletionJob } from "./deletion-jobs.ts";
import type { DeletionOperations } from "./deletion-operations.ts";
import type { TenantScope } from "./tenancy.ts";

async function execute(input: { operations: DeletionOperations; storage: ArtifactStorage; scope: TenantScope; job: DeletionJob }) {
  const running = await input.operations.startAttempt(input.scope, input.job.operationId);
  try {
    const deleted = new Set(running.deletedStorageKeys);
    for (const storageKey of running.storageKeys) {
      if (deleted.has(storageKey)) continue;
      await input.storage.delete(input.scope, storageKey);
      await input.operations.checkpointObject(input.scope, running.operationId, storageKey);
      deleted.add(storageKey);
    }
    const receipt = await input.operations.finalize(input.scope, running.operationId, deleted.size);
    await input.operations.complete(input.scope, running.operationId, receipt);
    return receipt;
  } catch (error) {
    await input.operations.recordFailure(input.scope, running.operationId, error instanceof Error ? error.message : "Deletion failed.");
    throw error;
  }
}

export async function requestManagedAssessmentDeletion(input: { operations: DeletionOperations; storage: ArtifactStorage; scope: TenantScope; assessmentId: string; actorUserId: string; maxAttempts?: number }): Promise<AssessmentDeletionReceipt> {
  const active = await input.operations.findActive(input.scope, input.assessmentId);
  const job = active ?? await input.operations.prepare(input.scope, input.assessmentId, input.actorUserId, input.maxAttempts ?? 3);
  return execute({ ...input, job });
}

export async function reconcileManagedDeletionJobs(input: { operations: DeletionOperations; storage: ArtifactStorage; scope: TenantScope; now?: string; limit?: number }) {
  const due = await input.operations.listDue(input.scope, input.now ?? new Date().toISOString(), input.limit ?? 20);
  const results: Array<{ operationId: string; status: "completed" | "retry_scheduled"; error?: string }> = [];
  for (const job of due) {
    try { await execute({ ...input, job }); results.push({ operationId: job.operationId, status: "completed" }); }
    catch (error) { results.push({ operationId: job.operationId, status: "retry_scheduled", error: error instanceof Error ? error.message : "Deletion failed." }); }
  }
  return { processed: results.length, results };
}
