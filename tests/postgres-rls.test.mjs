import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createAssessmentDraft } from "../lib/assessment.ts";
import { PostgresAssessmentStore, withRlsSession } from "../lib/postgres-rls.ts";

const migration = fs.readFileSync(new URL("../db/migrations/001_postgres_rls.sql", import.meta.url), "utf8");

function auth(role = "editor", workspaceId = "workspace-a") {
  const createdAt = new Date().toISOString();
  return {
    user: { id: "user-a", email: "user-a@example.com", displayName: "User A", createdAt },
    membership: { userId: "user-a", organizationId: "org-a", workspaceId, role, createdAt },
    tenant: {
      organization: { id: "org-a", name: "Org A", createdAt },
      workspace: { id: workspaceId, organizationId: "org-a", name: "Workspace A", createdAt }
    },
    authMethod: "local-dev",
    productionReady: false
  };
}

class FakeClient {
  constructor(rows = []) { this.rows = rows; this.calls = []; }
  async query(text, values = []) {
    this.calls.push({ text, values });
    if (text.startsWith("SELECT payload_json")) return { rows: this.rows };
    return { rows: [] };
  }
}

test("PostgreSQL migration force-enables RLS on every tenant-bearing table", () => {
  for (const table of ["organizations", "workspaces", "app_users", "memberships", "assessments"]) {
    assert.match(migration, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`));
    assert.match(migration, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`));
  }
  assert.match(migration, /assessments_member_read/);
  assert.match(migration, /app_has_workspace_membership\(NULL\)/);
});

test("assessment insert policy requires editor or admin membership", () => {
  assert.match(migration, /assessments_editor_insert/);
  assert.match(migration, /app_has_workspace_membership\(ARRAY\['editor','admin'\]\)/);
  assert.match(migration, /assessments_one_active_per_workspace_idx/);
});

test("RLS session binds user, organization, and workspace as transaction-local settings", async () => {
  const client = new FakeClient();
  const result = await withRlsSession(client, auth(), async () => "ok");
  assert.equal(result, "ok");
  assert.deepEqual(client.calls.map((call) => call.text), [
    "BEGIN",
    "SELECT set_config('app.user_id', $1, true), set_config('app.organization_id', $2, true), set_config('app.workspace_id', $3, true)",
    "COMMIT"
  ]);
  assert.deepEqual(client.calls[1].values, ["user-a", "org-a", "workspace-a"]);
});

test("RLS session rolls back when the operation fails", async () => {
  const client = new FakeClient();
  await assert.rejects(() => withRlsSession(client, auth(), async () => { throw new Error("boom"); }), /boom/);
  assert.equal(client.calls.at(-1).text, "ROLLBACK");
});

test("Postgres store takes tenant identity from RLS context instead of caller query parameters", async () => {
  const client = new FakeClient();
  const store = new PostgresAssessmentStore(client);
  const assessment = createAssessmentDraft({
    companyName: "Acme HealthTech",
    assessmentTitle: "Customer identity diagnostic",
    industry: "Healthcare technology",
    focusArea: "entity-identifier-fragmentation",
    primaryEntity: "Customer",
    knownSystems: "CRM, Billing",
    businessConcern: "Teams disagree on the canonical customer identifier.",
    reportAudience: "CTO",
    limitsAcknowledged: true
  });
  await store.create(auth(), assessment);
  const insert = client.calls.find((call) => call.text.includes("INSERT INTO assessments"));
  assert.ok(insert);
  assert.match(insert.text, /app_current_organization_id\(\)/);
  assert.match(insert.text, /app_current_workspace_id\(\)/);
  assert.deepEqual(insert.values.slice(0, 3), [assessment.id, "draft", assessment.createdAt]);
});
