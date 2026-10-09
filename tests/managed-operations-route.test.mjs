import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("operational routes use request-aware provider access", () => {
  const audit = fs.readFileSync(new URL("../app/api/assessments/[id]/audit/route.ts", import.meta.url), "utf8");
  const jobs = fs.readFileSync(new URL("../app/api/admin/deletion-jobs/route.ts", import.meta.url), "utf8");
  assert.match(audit, /listAuditForRequest\(request/);
  assert.match(jobs, /listDeletionJobsForRequest\(request/);
  assert.doesNotMatch(audit, /getAssessmentLifecycleRepository/);
  assert.doesNotMatch(jobs, /getDeletionJobRepository/);
});
test("provider access forwards request identity only for managed persistence", () => {
  const source = fs.readFileSync(new URL("../lib/server-deletion-ops-access.ts", import.meta.url), "utf8");
  assert.match(source, /PERSISTENCE_CONFIG\.provider !== "supabase-postgres"/);
  assert.match(source, /extractAccessToken\(request\)/);
  assert.match(source, /managed\.listAudit/);
  assert.match(source, /managed\.listJobs/);
});
