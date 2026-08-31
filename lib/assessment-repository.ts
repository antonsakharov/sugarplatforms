import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { assessmentDraftSchema, type AssessmentDraft } from "./assessment.ts";

export const LOCAL_DEMO_WORKSPACE_ID = "local-demo";

export type AssessmentRepository = {
  create(workspaceId: string, assessment: AssessmentDraft): AssessmentDraft;
  findById(workspaceId: string, assessmentId: string): AssessmentDraft | null;
  listActive(workspaceId: string): AssessmentDraft[];
};

export class ActiveAssessmentLimitError extends Error {
  constructor() {
    super("This workspace already has an active focused assessment.");
    this.name = "ActiveAssessmentLimitError";
  }
}

export class SqliteAssessmentRepository implements AssessmentRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS assessments (
        workspace_id TEXT NOT NULL,
        id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft')),
        created_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );
      CREATE INDEX IF NOT EXISTS assessments_workspace_status_idx
        ON assessments (workspace_id, status, created_at);
    `);
  }

  create(workspaceId: string, assessment: AssessmentDraft): AssessmentDraft {
    const validated = assessmentDraftSchema.parse(assessment);
    const transaction = this.db.prepare("BEGIN IMMEDIATE");
    const commit = this.db.prepare("COMMIT");
    const rollback = this.db.prepare("ROLLBACK");
    transaction.run();
    try {
      const active = this.db.prepare(
        "SELECT COUNT(*) AS count FROM assessments WHERE workspace_id = ? AND status = 'draft'"
      ).get(workspaceId) as { count: number };
      if (Number(active.count) >= 1) throw new ActiveAssessmentLimitError();
      this.db.prepare(
        "INSERT INTO assessments (workspace_id, id, status, created_at, payload_json) VALUES (?, ?, ?, ?, ?)"
      ).run(workspaceId, validated.id, validated.status, validated.createdAt, JSON.stringify(validated));
      commit.run();
      return validated;
    } catch (error) {
      rollback.run();
      throw error;
    }
  }

  findById(workspaceId: string, assessmentId: string): AssessmentDraft | null {
    const row = this.db.prepare(
      "SELECT payload_json FROM assessments WHERE workspace_id = ? AND id = ?"
    ).get(workspaceId, assessmentId) as { payload_json: string } | undefined;
    return row ? assessmentDraftSchema.parse(JSON.parse(row.payload_json)) : null;
  }

  listActive(workspaceId: string): AssessmentDraft[] {
    const rows = this.db.prepare(
      "SELECT payload_json FROM assessments WHERE workspace_id = ? AND status = 'draft' ORDER BY created_at DESC"
    ).all(workspaceId) as Array<{ payload_json: string }>;
    return rows.map((row) => assessmentDraftSchema.parse(JSON.parse(row.payload_json)));
  }
}
