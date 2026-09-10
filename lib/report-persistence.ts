import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { TenantScope } from "./tenancy.ts";
import { createReportSnapshot, validateReportSnapshotHistory, type ReportSnapshot } from "./report-versioning.ts";
import type { ExecutiveReport } from "./reporting.ts";

export class ReportScopeError extends Error {
  constructor() { super("Report history is outside the active organization/workspace scope."); this.name = "ReportScopeError"; }
}

export class SqliteReportRepository {
  private readonly db: DatabaseSync;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS report_snapshots (
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        report_id TEXT NOT NULL,
        version INTEGER NOT NULL CHECK (version > 0),
        diagnostic_generated_at TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, workspace_id, assessment_id, report_id),
        UNIQUE (organization_id, workspace_id, assessment_id, version)
      );
      CREATE INDEX IF NOT EXISTS report_snapshots_scope_idx
        ON report_snapshots (organization_id, workspace_id, assessment_id, version);
    `);
  }

  list(scope: TenantScope, assessmentId: string): ReportSnapshot[] {
    if (!scope.organizationId || !scope.workspaceId || !assessmentId) throw new ReportScopeError();
    const rows = this.db.prepare(`SELECT snapshot_json FROM report_snapshots WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ? ORDER BY version ASC`)
      .all(scope.organizationId, scope.workspaceId, assessmentId) as Array<{ snapshot_json: string }>;
    const history = rows.map((row) => JSON.parse(row.snapshot_json) as ReportSnapshot);
    validateReportSnapshotHistory(history, assessmentId);
    return history;
  }

  save(scope: TenantScope, report: ExecutiveReport, createdAt = new Date().toISOString()): ReportSnapshot {
    if (!scope.organizationId || !scope.workspaceId || !report.assessmentId) throw new ReportScopeError();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.list(scope, report.assessmentId);
      const snapshot = createReportSnapshot(report, existing, createdAt);
      this.db.prepare(`INSERT INTO report_snapshots (organization_id, workspace_id, assessment_id, report_id, version, diagnostic_generated_at, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(scope.organizationId, scope.workspaceId, report.assessmentId, snapshot.id, snapshot.version, snapshot.generatedFromDiagnosticAt, JSON.stringify(snapshot), snapshot.createdAt);
      this.db.exec("COMMIT");
      return snapshot;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  findById(scope: TenantScope, assessmentId: string, reportId: string): ReportSnapshot | null {
    if (!scope.organizationId || !scope.workspaceId || !assessmentId || !reportId) throw new ReportScopeError();
    const row = this.db.prepare(`SELECT snapshot_json FROM report_snapshots WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ? AND report_id = ?`)
      .get(scope.organizationId, scope.workspaceId, assessmentId, reportId) as { snapshot_json: string } | undefined;
    if (!row) return null;
    const snapshot = JSON.parse(row.snapshot_json) as ReportSnapshot;
    validateReportSnapshotHistory([snapshot], assessmentId);
    return snapshot;
  }
}
