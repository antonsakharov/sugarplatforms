import test from "node:test";
import assert from "node:assert/strict";
import { SqliteReportRepository } from "../lib/report-persistence.ts";

const scope = { organizationId: "org_a", workspaceId: "ws_a" };
const otherScope = { organizationId: "org_b", workspaceId: "ws_b" };
const baseReport = {
  schemaVersion: "1.0", reportVersion: "preview-v1", assessmentId: "assessment_a",
  generatedAt: "2026-09-09T15:00:00.000Z", generatedFromDiagnosticAt: "2026-09-09T14:30:00.000Z",
  title: "Platform Diagnostic — Executive Diagnostic Preview", audience: "CTO", executiveSummary: "Reviewed summary.",
  scope: { companyName: "Example", industry: "Technology", focusArea: "entity-and-identifier-fragmentation", primaryEntity: "Customer", businessConcern: "Fragmentation", artifactCount: 0, artifacts: [] },
  maturity: { schemaVersion: "1.0", assessmentId: "assessment_a", generatedFromDiagnosticAt: "2026-09-09T14:30:00.000Z", score: null, band: "not_scored", rationale: [], stats: { acceptedFindingCount: 0, weightedRiskPoints: 0, maximumRiskPoints: 0 } },
  topFindings: [],
  recommendations: { schemaVersion: "1.0", assessmentId: "assessment_a", generatedFromDiagnosticAt: "2026-09-09T14:30:00.000Z", recommendations: [], stats: { acceptedFindingCount: 0, recommendationCount: 0, evidenceReferenceCount: 0 }, limitations: [] },
  actionPlan: { schemaVersion: "1.0", assessmentId: "assessment_a", generatedFromDiagnosticAt: "2026-09-09T14:30:00.000Z", phases: [], stats: { recommendationCount: 0, plannedItemCount: 0, evidenceReferenceCount: 0 }, limitations: [] },
  evidenceAppendix: [], limitations: []
};

test("server report history assigns monotonic immutable versions", () => {
  const repository = new SqliteReportRepository(":memory:");
  const v1 = repository.save(scope, baseReport, "2026-09-09T15:01:00.000Z");
  const v2 = repository.save(scope, { ...baseReport, generatedAt: "2026-09-09T15:02:00.000Z" }, "2026-09-09T15:03:00.000Z");
  assert.equal(v1.versionLabel, "v1");
  assert.equal(v2.versionLabel, "v2");
  assert.deepEqual(repository.list(scope, "assessment_a").map((item) => item.version), [1, 2]);
});

test("tenant scope prevents cross-workspace report history reads", () => {
  const repository = new SqliteReportRepository(":memory:");
  const saved = repository.save(scope, baseReport);
  assert.equal(repository.findById(otherScope, "assessment_a", saved.id), null);
  assert.deepEqual(repository.list(otherScope, "assessment_a"), []);
});

test("saved snapshots are independent of later report mutation", () => {
  const repository = new SqliteReportRepository(":memory:");
  const report = structuredClone(baseReport);
  const saved = repository.save(scope, report);
  report.title = "Mutated client copy";
  assert.notEqual(repository.findById(scope, "assessment_a", saved.id)?.report.title, report.title);
});
