import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { storedGeneratedReportSchema, type GeneratedReportMetadataStore, type StoredGeneratedReport } from "./generated-report-storage.ts";
import type { TenantScope } from "./tenancy.ts";

export class SqliteGeneratedReportMetadataStore implements GeneratedReportMetadataStore {
  private readonly db: DatabaseSync;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`CREATE TABLE IF NOT EXISTS generated_report_objects (
      organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, assessment_id TEXT NOT NULL,
      report_id TEXT NOT NULL, object_json TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY (organization_id, workspace_id, assessment_id, report_id)
    )`);
  }
  async find(scope: TenantScope, assessmentId: string, reportId: string): Promise<StoredGeneratedReport | null> {
    const row = this.db.prepare(`SELECT object_json FROM generated_report_objects WHERE organization_id=? AND workspace_id=? AND assessment_id=? AND report_id=?`)
      .get(scope.organizationId, scope.workspaceId, assessmentId, reportId) as { object_json: string } | undefined;
    return row ? storedGeneratedReportSchema.parse(JSON.parse(row.object_json)) : null;
  }
  async save(scope: TenantScope, value: StoredGeneratedReport): Promise<StoredGeneratedReport> {
    const parsed = storedGeneratedReportSchema.parse(value);
    this.db.prepare(`INSERT INTO generated_report_objects (organization_id,workspace_id,assessment_id,report_id,object_json,created_at) VALUES (?,?,?,?,?,?)`)
      .run(scope.organizationId, scope.workspaceId, parsed.assessmentId, parsed.reportId, JSON.stringify(parsed), parsed.createdAt);
    return parsed;
  }
}
