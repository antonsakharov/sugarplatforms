import type { AssessmentDeletionReceipt } from "./assessment-lifecycle";
import type { DeletionJob } from "./deletion-jobs";
import type { TenantScope } from "./tenancy";

export interface DeletionOperations {
  findActive(scope: TenantScope, assessmentId: string): Promise<DeletionJob | null>;
  listDue(scope: TenantScope, now: string, limit: number): Promise<DeletionJob[]>;
  prepare(scope: TenantScope, assessmentId: string, actorUserId: string, maxAttempts: number): Promise<DeletionJob>;
  startAttempt(scope: TenantScope, operationId: string): Promise<DeletionJob>;
  checkpointObject(scope: TenantScope, operationId: string, storageKey: string): Promise<DeletionJob>;
  recordFailure(scope: TenantScope, operationId: string, errorMessage: string): Promise<DeletionJob>;
  finalize(scope: TenantScope, operationId: string, deletedObjectCount: number): Promise<AssessmentDeletionReceipt>;
  complete(scope: TenantScope, operationId: string, receipt: AssessmentDeletionReceipt): Promise<DeletionJob>;
}

export function isDeletionJobDue(job: DeletionJob, nowIso: string) {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) throw new Error("A valid reconciliation timestamp is required.");
  if (job.status === "queued") return job.nextAttemptAt === null || Date.parse(job.nextAttemptAt) <= now;
  if (job.status === "retry_scheduled") return job.nextAttemptAt !== null && Date.parse(job.nextAttemptAt) <= now;
  if (job.status === "running") return job.leaseExpiresAt !== null && Date.parse(job.leaseExpiresAt) <= now;
  return false;
}

export function boundDeletionBatchLimit(limit: number) {
  if (!Number.isFinite(limit)) return 1;
  return Math.max(1, Math.min(20, Math.trunc(limit)));
}
