import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { ArtifactStorage } from "./artifact-storage.ts";
import type { AssessmentDeletionPlan, AssessmentDeletionReceipt, SqliteAssessmentLifecycleRepository } from "./assessment-lifecycle.ts";
import type { TenantScope } from "./tenancy.ts";

const idSchema = z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/i);

export const deletionJobSchema = z.object({
  operationId: z.string().uuid(),
  organizationId: idSchema,
  workspaceId: idSchema,
  assessmentId: idSchema,
  actorUserId: idSchema,
  status: z.enum(["queued", "running", "retry_scheduled", "completed", "exhausted"]),
  storageKeys: z.array(z.string().min(1).max(500)),
  deletedStorageKeys: z.array(z.string().min(1).max(500)),
  attemptCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().min(1).max(10),
  nextAttemptAt: z.string().datetime().nullable(),
  leaseExpiresAt: z.string().datetime().nullable(),
  lastError: z.string().max(500).nullable(),
  receipt: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type DeletionJob = z.infer<typeof deletionJobSchema>;

export class DeletionJobStateError extends Error {
  constructor(message: string) { super(message); this.name = "DeletionJobStateError"; }
}

export class SqliteDeletionJobRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS assessment_deletion_jobs (
        operation_id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        actor_user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        storage_keys_json TEXT NOT NULL,
        deleted_storage_keys_json TEXT NOT NULL,
        attempt_count INTEGER NOT NULL,
        max_attempts INTEGER NOT NULL,
        next_attempt_at TEXT,
        lease_expires_at TEXT,
        last_error TEXT,
        receipt_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS assessment_deletion_jobs_scope_status_idx
        ON assessment_deletion_jobs (organization_id, workspace_id, status, next_attempt_at, created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS assessment_deletion_jobs_active_assessment_idx
        ON assessment_deletion_jobs (organization_id, workspace_id, assessment_id)
        WHERE status IN ('queued', 'running', 'retry_scheduled');
    `);
  }

  private rowToJob(row: Record<string, string | number | null>): DeletionJob {
    return deletionJobSchema.parse({
      operationId: row.operation_id,
      organizationId: row.organization_id,
      workspaceId: row.workspace_id,
      assessmentId: row.assessment_id,
      actorUserId: row.actor_user_id,
      status: row.status,
      storageKeys: JSON.parse(String(row.storage_keys_json)),
      deletedStorageKeys: JSON.parse(String(row.deleted_storage_keys_json)),
      attemptCount: Number(row.attempt_count),
      maxAttempts: Number(row.max_attempts),
      nextAttemptAt: row.next_attempt_at,
      leaseExpiresAt: row.lease_expires_at,
      lastError: row.last_error,
      receipt: row.receipt_json ? JSON.parse(String(row.receipt_json)) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  findActiveForAssessment(scope: TenantScope, assessmentId: string): DeletionJob | null {
    const row = this.db.prepare(`SELECT * FROM assessment_deletion_jobs WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ? AND status IN ('queued','running','retry_scheduled') ORDER BY created_at DESC LIMIT 1`)
      .get(scope.organizationId, scope.workspaceId, assessmentId) as Record<string, string | number | null> | undefined;
    return row ? this.rowToJob(row) : null;
  }

  createFromPlan(scope: TenantScope, actorUserId: string, plan: AssessmentDeletionPlan, maxAttempts = 3): DeletionJob {
    idSchema.parse(scope.organizationId); idSchema.parse(scope.workspaceId); idSchema.parse(actorUserId);
    const createdAt = plan.requestedAt;
    this.db.prepare(`INSERT INTO assessment_deletion_jobs (operation_id, organization_id, workspace_id, assessment_id, actor_user_id, status, storage_keys_json, deleted_storage_keys_json, attempt_count, max_attempts, next_attempt_at, lease_expires_at, last_error, receipt_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'queued', ?, '[]', 0, ?, ?, NULL, NULL, NULL, ?, ?)`)
      .run(plan.operationId, scope.organizationId, scope.workspaceId, plan.assessmentId, actorUserId, JSON.stringify(plan.storageKeys), maxAttempts, createdAt, createdAt, createdAt);
    return this.get(scope, plan.operationId)!;
  }

  get(scope: TenantScope, operationId: string): DeletionJob | null {
    const row = this.db.prepare(`SELECT * FROM assessment_deletion_jobs WHERE operation_id = ? AND organization_id = ? AND workspace_id = ?`)
      .get(operationId, scope.organizationId, scope.workspaceId) as Record<string, string | number | null> | undefined;
    return row ? this.rowToJob(row) : null;
  }

  list(scope: TenantScope, limit = 50): DeletionJob[] {
    const bounded = Math.max(1, Math.min(100, Math.trunc(limit)));
    const rows = this.db.prepare(`SELECT * FROM assessment_deletion_jobs WHERE organization_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(scope.organizationId, scope.workspaceId, bounded) as Array<Record<string, string | number | null>>;
    return rows.map((row) => this.rowToJob(row));
  }

  listDue(scope: TenantScope, now = new Date().toISOString(), limit = 20): DeletionJob[] {
    const bounded = Math.max(1, Math.min(20, Math.trunc(limit)));
    const rows = this.db.prepare(`SELECT * FROM assessment_deletion_jobs WHERE organization_id = ? AND workspace_id = ? AND ((status IN ('queued','retry_scheduled') AND (next_attempt_at IS NULL OR next_attempt_at <= ?)) OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)) ORDER BY created_at ASC LIMIT ?`)
      .all(scope.organizationId, scope.workspaceId, now, now, bounded) as Array<Record<string, string | number | null>>;
    return rows.map((row) => this.rowToJob(row));
  }

  startAttempt(scope: TenantScope, operationId: string): DeletionJob {
    const job = this.get(scope, operationId);
    if (!job) throw new DeletionJobStateError("Deletion job not found in the active tenant scope.");
    if (job.status === "completed" || job.status === "exhausted") throw new DeletionJobStateError(`Deletion job is already ${job.status}.`);
    if (job.status === "running" && job.leaseExpiresAt && new Date(job.leaseExpiresAt).getTime() > Date.now()) throw new DeletionJobStateError("Deletion job is already running.");
    if (job.attemptCount >= job.maxAttempts) throw new DeletionJobStateError("Deletion job has no attempts remaining.");
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    this.db.prepare(`UPDATE assessment_deletion_jobs SET status = 'running', attempt_count = attempt_count + 1, next_attempt_at = NULL, lease_expires_at = ?, updated_at = ? WHERE operation_id = ? AND organization_id = ? AND workspace_id = ?`)
      .run(leaseExpiresAt, now.toISOString(), operationId, scope.organizationId, scope.workspaceId);
    return this.get(scope, operationId)!;
  }

  markObjectDeleted(scope: TenantScope, operationId: string, storageKey: string): DeletionJob {
    const job = this.get(scope, operationId);
    if (!job || job.status !== "running") throw new DeletionJobStateError("Deletion job is not running.");
    if (!job.storageKeys.includes(storageKey)) throw new DeletionJobStateError("Storage key is not part of this deletion job.");
    if (job.deletedStorageKeys.includes(storageKey)) return job;
    const deleted = [...job.deletedStorageKeys, storageKey];
    this.db.prepare(`UPDATE assessment_deletion_jobs SET deleted_storage_keys_json = ?, updated_at = ? WHERE operation_id = ? AND organization_id = ? AND workspace_id = ?`)
      .run(JSON.stringify(deleted), new Date().toISOString(), operationId, scope.organizationId, scope.workspaceId);
    return this.get(scope, operationId)!;
  }

  scheduleFailure(scope: TenantScope, operationId: string, error: unknown): DeletionJob {
    const job = this.get(scope, operationId);
    if (!job) throw new DeletionJobStateError("Deletion job not found in the active tenant scope.");
    const exhausted = job.attemptCount >= job.maxAttempts;
    const delaySeconds = Math.min(900, 30 * (2 ** Math.max(0, job.attemptCount - 1)));
    const nextAttemptAt = exhausted ? null : new Date(Date.now() + delaySeconds * 1000).toISOString();
    const message = (error instanceof Error ? error.message : "Deletion failed.").slice(0, 500);
    this.db.prepare(`UPDATE assessment_deletion_jobs SET status = ?, next_attempt_at = ?, lease_expires_at = NULL, last_error = ?, updated_at = ? WHERE operation_id = ? AND organization_id = ? AND workspace_id = ?`)
      .run(exhausted ? "exhausted" : "retry_scheduled", nextAttemptAt, message, new Date().toISOString(), operationId, scope.organizationId, scope.workspaceId);
    return this.get(scope, operationId)!;
  }

  markCompleted(scope: TenantScope, operationId: string, receipt: AssessmentDeletionReceipt): DeletionJob {
    const now = new Date().toISOString();
    this.db.prepare(`UPDATE assessment_deletion_jobs SET status = 'completed', next_attempt_at = NULL, lease_expires_at = NULL, last_error = NULL, receipt_json = ?, updated_at = ? WHERE operation_id = ? AND organization_id = ? AND workspace_id = ?`)
      .run(JSON.stringify(receipt), now, operationId, scope.organizationId, scope.workspaceId);
    const job = this.get(scope, operationId);
    if (!job) throw new DeletionJobStateError("Completed deletion job could not be reloaded.");
    return job;
  }
}

function receiptFromAudit(lifecycle: SqliteAssessmentLifecycleRepository, scope: TenantScope, job: DeletionJob): AssessmentDeletionReceipt | null {
  const event = lifecycle.listAudit(scope, job.assessmentId).find((candidate) => candidate.operationId === job.operationId && candidate.eventType === "assessment.deletion.completed");
  if (!event) return null;
  const deletedArtifactObjects = Number(event.detail.deletedArtifactObjects ?? job.deletedStorageKeys.length);
  const deletedRows = typeof event.detail.deletedRows === "object" && event.detail.deletedRows ? event.detail.deletedRows as Record<string, number> : {};
  return { operationId: job.operationId, assessmentId: job.assessmentId, deletedArtifactObjects, deletedRows, completedAt: event.createdAt, auditEventId: event.id };
}

async function executeJob(input: {
  jobs: SqliteDeletionJobRepository;
  lifecycle: SqliteAssessmentLifecycleRepository;
  storage: ArtifactStorage;
  scope: TenantScope;
  operationId: string;
  actorUserId: string;
}) {
  const existing = input.jobs.get(input.scope, input.operationId);
  if (!existing) throw new DeletionJobStateError("Deletion job not found in the active tenant scope.");
  const recovered = receiptFromAudit(input.lifecycle, input.scope, existing);
  if (recovered) {
    input.jobs.markCompleted(input.scope, existing.operationId, recovered);
    return recovered;
  }

  const job = input.jobs.startAttempt(input.scope, input.operationId);
  try {
    const alreadyDeleted = new Set(job.deletedStorageKeys);
    for (const storageKey of job.storageKeys) {
      if (alreadyDeleted.has(storageKey)) continue;
      await input.storage.delete(input.scope, storageKey);
      input.jobs.markObjectDeleted(input.scope, job.operationId, storageKey);
    }
  } catch (error) {
    input.lifecycle.recordFailure(input.scope, job.assessmentId, input.actorUserId, job.operationId, error);
    input.jobs.scheduleFailure(input.scope, job.operationId, error);
    throw error;
  }

  const current = input.jobs.get(input.scope, job.operationId)!;
  let receipt: AssessmentDeletionReceipt;
  try {
    receipt = input.lifecycle.completeDeletion(input.scope, job.assessmentId, input.actorUserId, job.operationId, current.deletedStorageKeys.length);
  } catch (error) {
    input.lifecycle.recordFailure(input.scope, job.assessmentId, input.actorUserId, job.operationId, error);
    input.jobs.scheduleFailure(input.scope, job.operationId, error);
    throw error;
  }

  input.jobs.markCompleted(input.scope, job.operationId, receipt);
  return receipt;
}

export async function requestAssessmentDeletion(input: {
  jobs: SqliteDeletionJobRepository;
  lifecycle: SqliteAssessmentLifecycleRepository;
  storage: ArtifactStorage;
  scope: TenantScope;
  assessmentId: string;
  actorUserId: string;
  maxAttempts?: number;
}) {
  let job = input.jobs.findActiveForAssessment(input.scope, input.assessmentId);
  if (!job) {
    const plan = input.lifecycle.prepareDeletion(input.scope, input.assessmentId, input.actorUserId);
    job = input.jobs.createFromPlan(input.scope, input.actorUserId, plan, input.maxAttempts ?? 3);
  }
  return executeJob({ ...input, operationId: job.operationId });
}

export async function retryDeletionJob(input: {
  jobs: SqliteDeletionJobRepository;
  lifecycle: SqliteAssessmentLifecycleRepository;
  storage: ArtifactStorage;
  scope: TenantScope;
  operationId: string;
  actorUserId: string;
}) {
  return executeJob(input);
}

export async function reconcileDueDeletionJobs(input: {
  jobs: SqliteDeletionJobRepository;
  lifecycle: SqliteAssessmentLifecycleRepository;
  storage: ArtifactStorage;
  scope: TenantScope;
  actorUserId: string;
  limit?: number;
  now?: string;
}) {
  const due = input.jobs.listDue(input.scope, input.now ?? new Date().toISOString(), input.limit ?? 20);
  const results: Array<{ operationId: string; status: "completed" | "retry_scheduled" | "exhausted"; error?: string }> = [];
  for (const job of due) {
    try {
      await retryDeletionJob({ ...input, operationId: job.operationId });
      results.push({ operationId: job.operationId, status: "completed" });
    } catch (error) {
      const updated = input.jobs.get(input.scope, job.operationId)!;
      results.push({ operationId: job.operationId, status: updated.status === "exhausted" ? "exhausted" : "retry_scheduled", error: error instanceof Error ? error.message : "Deletion failed." });
    }
  }
  return { processed: results.length, results };
}
