import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { assessmentDraftSchema, type AssessmentDraft } from "./assessment.ts";
import { membershipSchema, userIdentitySchema, type Membership, type UserIdentity } from "./auth.ts";
import { tenantContextSchema, type TenantContext, type TenantScope } from "./tenancy.ts";

export type AssessmentRepository = {
  ensureTenant(tenant: TenantContext): TenantContext;
  getTenant(scope: TenantScope): TenantContext | null;
  ensureMembership(scope: TenantScope, user: UserIdentity, membership: Membership): Membership;
  getMembership(scope: TenantScope, userId: string): Membership | null;
  create(scope: TenantScope, assessment: AssessmentDraft): AssessmentDraft;
  findById(scope: TenantScope, assessmentId: string): AssessmentDraft | null;
  listActive(scope: TenantScope): AssessmentDraft[];
};

export class ActiveAssessmentLimitError extends Error {
  constructor() {
    super("This workspace already has an active focused assessment.");
    this.name = "ActiveAssessmentLimitError";
  }
}

export class TenantScopeError extends Error {
  constructor() {
    super("Organization/workspace scope is invalid or unavailable.");
    this.name = "TenantScopeError";
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
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS workspaces_organization_idx ON workspaces (organization_id, created_at);
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memberships (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, workspace_id)
      );
      CREATE INDEX IF NOT EXISTS memberships_scope_idx ON memberships (organization_id, workspace_id, user_id);
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

  ensureTenant(tenant: TenantContext): TenantContext {
    const validated = tenantContextSchema.parse(tenant);
    this.db.prepare("INSERT OR IGNORE INTO organizations (id, name, created_at) VALUES (?, ?, ?)")
      .run(validated.organization.id, validated.organization.name, validated.organization.createdAt);
    const existingWorkspace = this.db.prepare("SELECT organization_id FROM workspaces WHERE id = ?")
      .get(validated.workspace.id) as { organization_id: string } | undefined;
    if (existingWorkspace && existingWorkspace.organization_id !== validated.organization.id) throw new TenantScopeError();
    this.db.prepare("INSERT OR IGNORE INTO workspaces (id, organization_id, name, created_at) VALUES (?, ?, ?, ?)")
      .run(validated.workspace.id, validated.organization.id, validated.workspace.name, validated.workspace.createdAt);
    return this.getTenant({ organizationId: validated.organization.id, workspaceId: validated.workspace.id }) ?? validated;
  }

  getTenant(scope: TenantScope): TenantContext | null {
    const row = this.db.prepare(`
      SELECT o.id AS organization_id, o.name AS organization_name, o.created_at AS organization_created_at,
             w.id AS workspace_id, w.name AS workspace_name, w.created_at AS workspace_created_at
      FROM workspaces w JOIN organizations o ON o.id = w.organization_id
      WHERE o.id = ? AND w.id = ?
    `).get(scope.organizationId, scope.workspaceId) as Record<string, string> | undefined;
    if (!row) return null;
    return tenantContextSchema.parse({
      organization: { id: row.organization_id, name: row.organization_name, createdAt: row.organization_created_at },
      workspace: { id: row.workspace_id, organizationId: row.organization_id, name: row.workspace_name, createdAt: row.workspace_created_at }
    });
  }

  ensureMembership(scope: TenantScope, user: UserIdentity, membership: Membership): Membership {
    this.assertTenant(scope);
    const validatedUser = userIdentitySchema.parse(user);
    const validatedMembership = membershipSchema.parse(membership);
    if (validatedMembership.userId !== validatedUser.id || validatedMembership.organizationId !== scope.organizationId || validatedMembership.workspaceId !== scope.workspaceId) {
      throw new TenantScopeError();
    }
    this.db.prepare("INSERT OR IGNORE INTO users (id, email, display_name, created_at) VALUES (?, ?, ?, ?)")
      .run(validatedUser.id, validatedUser.email, validatedUser.displayName, validatedUser.createdAt);
    const existing = this.db.prepare("SELECT email FROM users WHERE id = ?").get(validatedUser.id) as { email: string } | undefined;
    if (!existing || existing.email !== validatedUser.email) throw new TenantScopeError();
    this.db.prepare("INSERT OR IGNORE INTO memberships (user_id, organization_id, workspace_id, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(validatedMembership.userId, validatedMembership.organizationId, validatedMembership.workspaceId, validatedMembership.role, validatedMembership.createdAt);
    const stored = this.getMembership(scope, validatedUser.id);
    if (!stored || stored.role !== validatedMembership.role) throw new TenantScopeError();
    return stored;
  }

  getMembership(scope: TenantScope, userId: string): Membership | null {
    this.assertTenant(scope);
    const row = this.db.prepare(`
      SELECT user_id, organization_id, workspace_id, role, created_at
      FROM memberships
      WHERE user_id = ? AND organization_id = ? AND workspace_id = ?
    `).get(userId, scope.organizationId, scope.workspaceId) as Record<string, string> | undefined;
    if (!row) return null;
    return membershipSchema.parse({
      userId: row.user_id, organizationId: row.organization_id, workspaceId: row.workspace_id,
      role: row.role, createdAt: row.created_at
    });
  }

  private assertTenant(scope: TenantScope) {
    if (!this.getTenant(scope)) throw new TenantScopeError();
  }

  create(scope: TenantScope, assessment: AssessmentDraft): AssessmentDraft {
    this.assertTenant(scope);
    const validated = assessmentDraftSchema.parse(assessment);
    const transaction = this.db.prepare("BEGIN IMMEDIATE");
    const commit = this.db.prepare("COMMIT");
    const rollback = this.db.prepare("ROLLBACK");
    transaction.run();
    try {
      const active = this.db.prepare(
        "SELECT COUNT(*) AS count FROM assessments WHERE workspace_id = ? AND status = 'draft'"
      ).get(scope.workspaceId) as { count: number };
      if (Number(active.count) >= 1) throw new ActiveAssessmentLimitError();
      this.db.prepare(
        "INSERT INTO assessments (workspace_id, id, status, created_at, payload_json) VALUES (?, ?, ?, ?, ?)"
      ).run(scope.workspaceId, validated.id, validated.status, validated.createdAt, JSON.stringify(validated));
      commit.run();
      return validated;
    } catch (error) {
      rollback.run();
      throw error;
    }
  }

  findById(scope: TenantScope, assessmentId: string): AssessmentDraft | null {
    this.assertTenant(scope);
    const row = this.db.prepare(
      "SELECT payload_json FROM assessments WHERE workspace_id = ? AND id = ?"
    ).get(scope.workspaceId, assessmentId) as { payload_json: string } | undefined;
    return row ? assessmentDraftSchema.parse(JSON.parse(row.payload_json)) : null;
  }

  listActive(scope: TenantScope): AssessmentDraft[] {
    this.assertTenant(scope);
    const rows = this.db.prepare(
      "SELECT payload_json FROM assessments WHERE workspace_id = ? AND status = 'draft' ORDER BY created_at DESC"
    ).all(scope.workspaceId) as Array<{ payload_json: string }>;
    return rows.map((row) => assessmentDraftSchema.parse(JSON.parse(row.payload_json)));
  }
}
