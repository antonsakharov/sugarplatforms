import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { ArtifactStorage } from "./artifact-storage.ts";
import { tenantStoragePrefix } from "./artifact-storage.ts";
import type { TenantScope } from "./tenancy.ts";

const idSchema = z.string().min(2).max(100).regex(/^[a-z0-9_-]+$/i);

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  operationId: z.string().uuid(),
  organizationId: idSchema,
  workspaceId: idSchema,
  assessmentId: idSchema,
  actorUserId: idSchema,
  eventType: z.enum(["assessment.deletion.requested", "assessment.deletion.completed", "assessment.deletion.failed"]),
  outcome: z.enum(["pending", "success", "failure"]),
  detail: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime()
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export type AssessmentDeletionPlan = {
  operationId: string;
  assessmentId: string;
  storageKeys: string[];
  requestedAt: string;
};

export type AssessmentDeletionReceipt = {
  operationId: string;
  assessmentId: string;
  deletedArtifactObjects: number;
  deletedRows: Record<string, number>;
  completedAt: string;
  auditEventId: string;
};

export class AssessmentDeletionNotFoundError extends Error {
  constructor() { super("Assessment not found in the active tenant scope."); this.name = "AssessmentDeletionNotFoundError"; }
}

export class SqliteAssessmentLifecycleRepository {
  private readonly db: DatabaseSync;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        operation_id TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        actor_user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        outcome TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS audit_events_scope_idx
        ON audit_events (organization_id, workspace_id, assessment_id, created_at);
    `);
  }

  private tableExists(table: string) {
    return Boolean(this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
  }

  private assertAssessment(scope: TenantScope, assessmentId: string) {
    idSchema.parse(scope.organizationId); idSchema.parse(scope.workspaceId); idSchema.parse(assessmentId);
    const row = this.db.prepare(`
      SELECT a.id FROM assessments a
      JOIN workspaces w ON w.id = a.workspace_id
      WHERE a.id = ? AND a.workspace_id = ? AND w.organization_id = ?
    `).get(assessmentId, scope.workspaceId, scope.organizationId);
    if (!row) throw new AssessmentDeletionNotFoundError();
  }

  private appendEvent(input: Omit<AuditEvent, "id" | "createdAt"> & { createdAt?: string }) {
    const event = auditEventSchema.parse({ ...input, id: randomUUID(), createdAt: input.createdAt ?? new Date().toISOString() });
    this.db.prepare(`INSERT INTO audit_events (id, operation_id, organization_id, workspace_id, assessment_id, actor_user_id, event_type, outcome, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(event.id, event.operationId, event.organizationId, event.workspaceId, event.assessmentId, event.actorUserId, event.eventType, event.outcome, JSON.stringify(event.detail), event.createdAt);
    return event;
  }

  prepareDeletion(scope: TenantScope, assessmentId: string, actorUserId: string): AssessmentDeletionPlan {
    this.assertAssessment(scope, assessmentId);
    idSchema.parse(actorUserId);
    const artifacts = this.tableExists("artifact_metadata")
      ? this.db.prepare(`SELECT storage_artifact_id FROM artifact_metadata WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ? ORDER BY created_at ASC`)
          .all(scope.organizationId, scope.workspaceId, assessmentId) as Array<{ storage_artifact_id: string }>
      : [];
    const operationId = randomUUID();
    const requestedAt = new Date().toISOString();
    const storageKeys = artifacts.map((row) => `${tenantStoragePrefix(scope, assessmentId)}/${row.storage_artifact_id}`);
    this.appendEvent({ operationId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, assessmentId, actorUserId, eventType: "assessment.deletion.requested", outcome: "pending", detail: { artifactObjectCount: storageKeys.length }, createdAt: requestedAt });
    return { operationId, assessmentId, storageKeys, requestedAt };
  }

  completeDeletion(scope: TenantScope, assessmentId: string, actorUserId: string, operationId: string, deletedArtifactObjects: number): AssessmentDeletionReceipt {
    this.assertAssessment(scope, assessmentId);
    const tables = ["report_snapshots", "finding_reviews", "extraction_reviews", "source_segments", "artifact_metadata", "extraction_snapshots"] as const;
    const deletedRows: Record<string, number> = {};
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const table of tables) {
        if (!this.tableExists(table)) { deletedRows[table] = 0; continue; }
        const result = this.db.prepare(`DELETE FROM ${table} WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ?`)
          .run(scope.organizationId, scope.workspaceId, assessmentId);
        deletedRows[table] = Number(result.changes);
      }
      const assessmentResult = this.db.prepare(`DELETE FROM assessments WHERE workspace_id = ? AND id = ?`).run(scope.workspaceId, assessmentId);
      if (Number(assessmentResult.changes) !== 1) throw new AssessmentDeletionNotFoundError();
      deletedRows.assessments = 1;
      const completedAt = new Date().toISOString();
      const event = this.appendEvent({ operationId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, assessmentId, actorUserId, eventType: "assessment.deletion.completed", outcome: "success", detail: { deletedArtifactObjects, deletedRows }, createdAt: completedAt });
      this.db.exec("COMMIT");
      return { operationId, assessmentId, deletedArtifactObjects, deletedRows, completedAt, auditEventId: event.id };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  recordFailure(scope: TenantScope, assessmentId: string, actorUserId: string, operationId: string, error: unknown) {
    return this.appendEvent({ operationId, organizationId: scope.organizationId, workspaceId: scope.workspaceId, assessmentId, actorUserId, eventType: "assessment.deletion.failed", outcome: "failure", detail: { message: error instanceof Error ? error.message : "Deletion failed." } });
  }

  listAudit(scope: TenantScope, assessmentId: string): AuditEvent[] {
    idSchema.parse(scope.organizationId); idSchema.parse(scope.workspaceId); idSchema.parse(assessmentId);
    const rows = this.db.prepare(`SELECT * FROM audit_events WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ? ORDER BY created_at ASC, id ASC`)
      .all(scope.organizationId, scope.workspaceId, assessmentId) as Array<Record<string, string>>;
    return rows.map((row) => auditEventSchema.parse({
      id: row.id, operationId: row.operation_id, organizationId: row.organization_id, workspaceId: row.workspace_id,
      assessmentId: row.assessment_id, actorUserId: row.actor_user_id, eventType: row.event_type, outcome: row.outcome,
      detail: JSON.parse(row.detail_json), createdAt: row.created_at
    }));
  }
}

export async function deleteAssessmentWithAudit(input: {
  repository: SqliteAssessmentLifecycleRepository;
  storage: ArtifactStorage;
  scope: TenantScope;
  assessmentId: string;
  actorUserId: string;
}) {
  const plan = input.repository.prepareDeletion(input.scope, input.assessmentId, input.actorUserId);
  let deletedArtifactObjects = 0;
  try {
    for (const storageKey of plan.storageKeys) {
      await input.storage.delete(input.scope, storageKey);
      deletedArtifactObjects += 1;
    }
    return input.repository.completeDeletion(input.scope, input.assessmentId, input.actorUserId, plan.operationId, deletedArtifactObjects);
  } catch (error) {
    input.repository.recordFailure(input.scope, input.assessmentId, input.actorUserId, plan.operationId, error);
    throw error;
  }
}
