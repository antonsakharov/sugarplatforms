import test from "node:test";
import assert from "node:assert/strict";
import { createReportExport, createReportSnapshot, reportExportFilename, validateReportSnapshotHistory } from "../lib/report-versioning.ts";

const report = {
  schemaVersion: "1.0",
  reportVersion: "preview-v1",
  assessmentId: "assessment-1",
  generatedAt: "2026-08-19T14:00:00.000Z",
  generatedFromDiagnosticAt: "2026-08-19T13:00:00.000Z",
  title: "Customer Identity — Executive Diagnostic Preview",
  audience: "CTO",
  executiveSummary: "Reviewed summary.",
  scope: { companyName: "Acme", industry: "HealthTech", focusArea: "entity-identifier-fragmentation", primaryEntity: "Customer", businessConcern: "Reduce fragmentation.", artifactCount: 1, artifacts: [{ name: "architecture.md", type: "text/markdown", size: 100, status: "validated" }] },
  maturity: { schemaVersion: "1.0", assessmentId: "assessment-1", generatedFromDiagnosticAt: "2026-08-19T13:00:00.000Z", status: "not_scored", score: null, band: "not_scored", acceptedFindingCount: 0, totalFindingCount: 0, dimensions: [], rationale: [], limitations: [] },
  topFindings: [],
  recommendations: { schemaVersion: "1.0", assessmentId: "assessment-1", generatedFromDiagnosticAt: "2026-08-19T13:00:00.000Z", recommendations: [], stats: { acceptedFindingCount: 0, recommendationCount: 0, evidenceReferenceCount: 0 }, limitations: [] },
  actionPlan: { schemaVersion: "1.0", assessmentId: "assessment-1", generatedFromDiagnosticAt: "2026-08-19T13:00:00.000Z", phases: [], stats: { recommendationCount: 0, plannedItemCount: 0, evidenceReferenceCount: 0 }, limitations: [] },
  evidenceAppendix: [],
  limitations: []
};

test("report snapshots receive monotonic immutable local versions", () => {
  const first = createReportSnapshot(report, [], "2026-08-19T15:00:00.000Z");
  const second = createReportSnapshot({ ...report, generatedAt: "2026-08-19T15:30:00.000Z" }, [first], "2026-08-19T15:31:00.000Z");
  assert.equal(first.version, 1);
  assert.equal(first.versionLabel, "v1");
  assert.equal(second.version, 2);
  assert.equal(second.id, "report_assessment-1_v2");
  assert.equal(first.report.generatedAt, "2026-08-19T14:00:00.000Z");
});

test("snapshot history rejects duplicate versions and cross-assessment records", () => {
  const first = createReportSnapshot(report, [], "2026-08-19T15:00:00.000Z");
  assert.throws(() => validateReportSnapshotHistory([first, { ...first, id: "another" }], "assessment-1"), /duplicate/);
  assert.throws(() => validateReportSnapshotHistory([{ ...first, assessmentId: "assessment-2" }], "assessment-1"), /another assessment/);
});

test("JSON export preserves snapshot provenance and remains structured report data", () => {
  const snapshot = createReportSnapshot(report, [], "2026-08-19T15:00:00.000Z");
  const exported = createReportExport(snapshot, "2026-08-19T15:05:00.000Z");
  assert.equal(exported.exportFormat, "sugar-platform-diagnostic-report-json");
  assert.equal(exported.snapshot.generatedFromDiagnosticAt, report.generatedFromDiagnosticAt);
  assert.deepEqual(Object.keys(exported.snapshot.report.scope.artifacts[0]).sort(), ["name", "size", "status", "type"]);
  assert.ok(!JSON.stringify(exported).includes("rawContent"));
});

test("export filename is safe and carries the saved version", () => {
  const snapshot = createReportSnapshot(report, [], "2026-08-19T15:00:00.000Z");
  assert.equal(reportExportFilename(snapshot), "customer-identity-executive-diagnostic-preview-v1.json");
});
