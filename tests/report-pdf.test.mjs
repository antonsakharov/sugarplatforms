import test from "node:test";
import assert from "node:assert/strict";
import { createReportSnapshot } from "../lib/report-versioning.ts";
import { generateReportPdf, reportPdfFilename } from "../lib/report-pdf.ts";

const report = {
  schemaVersion: "1.0",
  reportVersion: "preview-v1",
  assessmentId: "assessment-pdf",
  generatedAt: "2026-08-30T14:00:00.000Z",
  generatedFromDiagnosticAt: "2026-08-30T13:00:00.000Z",
  title: "Customer Identity — Executive Diagnostic Preview",
  audience: "CTO",
  executiveSummary: "Two reviewed risks require prioritized remediation.",
  scope: {
    companyName: "Acme",
    industry: "HealthTech",
    focusArea: "entity-identifier-fragmentation",
    primaryEntity: "Customer",
    businessConcern: "Reduce fragmentation.",
    artifactCount: 1,
    artifacts: [{ name: "architecture.md", type: "text/markdown", size: 100, status: "validated" }]
  },
  maturity: {
    schemaVersion: "1.0", assessmentId: "assessment-pdf", generatedFromDiagnosticAt: "2026-08-30T13:00:00.000Z",
    status: "scored", score: 3, band: "managed_risk", acceptedFindingCount: 1, totalFindingCount: 1,
    dimensions: [], rationale: ["Accepted high-severity evidence reduces the focused score."], limitations: []
  },
  topFindings: [{
    id: "finding-1", category: "identifier_fragmentation", severity: "high", confidence: 0.9,
    title: "Fragmented customer identifiers", description: "Two confirmed customer identifiers are documented.",
    businessImpact: "Cross-system reconciliation can be unreliable.", technicalImpact: "Integration logic may depend on mappings.",
    affectedObjectIds: ["entity-customer"],
    evidence: [{ segmentId: "segment-1", artifactId: "artifact-1", artifactName: "architecture.md", locator: "line:12", evidenceType: "direct" }],
    recommendation: "Define an authoritative identifier strategy."
  }],
  recommendations: {
    schemaVersion: "1.0", assessmentId: "assessment-pdf", generatedFromDiagnosticAt: "2026-08-30T13:00:00.000Z",
    recommendations: [{
      id: "rec-1", priority: 1, severity: "high", confidence: 0.9, title: "Define identifier authority",
      action: "Select and document the authoritative customer identifier.", whyNow: "The accepted finding is high severity.",
      findingIds: ["finding-1"], affectedObjectIds: ["entity-customer"],
      evidence: [{ segmentId: "segment-1", artifactId: "artifact-1", artifactName: "architecture.md", locator: "line:12", evidenceType: "direct" }]
    }],
    stats: { acceptedFindingCount: 1, recommendationCount: 1, evidenceReferenceCount: 1 }, limitations: []
  },
  actionPlan: {
    schemaVersion: "1.0", assessmentId: "assessment-pdf", generatedFromDiagnosticAt: "2026-08-30T13:00:00.000Z",
    phases: [{ horizon: "days_0_30", label: "0–30 days", objective: "Confirm authority.", items: [{
      id: "plan-rec-1", horizon: "days_0_30", priority: 1, title: "Define identifier authority",
      action: "Select and document the authoritative customer identifier.", expectedOutcome: "Reduce reconciliation ambiguity.",
      severity: "high", findingIds: ["finding-1"], affectedObjectIds: ["entity-customer"],
      evidence: [{ segmentId: "segment-1", artifactId: "artifact-1", artifactName: "architecture.md", locator: "line:12", evidenceType: "direct" }]
    }]}],
    stats: { recommendationCount: 1, plannedItemCount: 1, evidenceReferenceCount: 1 }, limitations: []
  },
  evidenceAppendix: [{ findingId: "finding-1", findingTitle: "Fragmented customer identifiers", evidence: [{ segmentId: "segment-1", artifactId: "artifact-1", artifactName: "architecture.md", locator: "line:12", evidenceType: "direct" }] }],
  limitations: ["Architecture metadata only."]
};

function snapshot() {
  return createReportSnapshot(report, [], "2026-08-30T15:00:00.000Z");
}

test("formal PDF export emits a deterministic valid PDF artifact with provenance", () => {
  const first = generateReportPdf(snapshot());
  const second = generateReportPdf(snapshot());
  const text = Buffer.from(first.bytes).toString("latin1");
  assert.equal(first.mediaType, "application/pdf");
  assert.equal(first.exportFormat, "sugar-platform-diagnostic-report-pdf");
  assert.match(text, /^%PDF-1\.4/);
  assert.match(text, /%%EOF\n$/);
  assert.ok(first.pageCount >= 1);
  assert.equal(first.generatedFromDiagnosticAt, report.generatedFromDiagnosticAt);
  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(first.bytes, second.bytes);
});

test("formal PDF filename is safe and retains the immutable snapshot version", () => {
  assert.equal(reportPdfFilename(snapshot()), "customer-identity-executive-diagnostic-preview-v1.pdf");
});

test("formal PDF contains reviewed report facts and evidence coordinates but no invented raw-content field", () => {
  const artifact = generateReportPdf(snapshot());
  const text = Buffer.from(artifact.bytes).toString("latin1");
  assert.match(text, /Fragmented customer identifiers/);
  assert.match(text, /architecture\.md/);
  assert.match(text, /line:12/);
  assert.ok(!text.includes("rawContent"));
});

test("formal PDF generation fails closed when snapshot provenance is inconsistent", () => {
  const invalid = snapshot();
  invalid.generatedFromDiagnosticAt = "2026-08-30T12:00:00.000Z";
  assert.throws(() => generateReportPdf(invalid), /provenance/);
});
