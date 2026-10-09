import type { ExecutiveReport } from "@/lib/reporting";

export type ReportSnapshot = {
  schemaVersion: "1.0";
  id: string;
  assessmentId: string;
  version: number;
  versionLabel: string;
  createdAt: string;
  generatedFromDiagnosticAt: string;
  report: ExecutiveReport;
};

export type ReportExportEnvelope = {
  schemaVersion: "1.0";
  exportFormat: "sugar-platform-diagnostic-report-json";
  exportedAt: string;
  snapshot: ReportSnapshot;
};

function assertIsoTimestamp(value: string, field: string) {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO timestamp.`);
}

function sanitizeFilenamePart(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 80) || "sugar-platform-diagnostic";
}

export function validateReportSnapshotHistory(history: ReportSnapshot[], assessmentId: string) {
  const versions = new Set<number>();
  const ids = new Set<string>();
  let previous = 0;
  for (const snapshot of [...history].sort((a, b) => a.version - b.version)) {
    if (snapshot.schemaVersion !== "1.0") throw new Error("Unsupported report snapshot schema version.");
    if (snapshot.assessmentId !== assessmentId || snapshot.report.assessmentId !== assessmentId) throw new Error("Report snapshot history contains another assessment.");
    if (!Number.isInteger(snapshot.version) || snapshot.version < 1) throw new Error("Report snapshot version must be a positive integer.");
    if (snapshot.versionLabel !== `v${snapshot.version}`) throw new Error("Report snapshot label does not match its version.");
    if (versions.has(snapshot.version) || ids.has(snapshot.id)) throw new Error("Report snapshot history contains a duplicate version or ID.");
    if (snapshot.version <= previous) throw new Error("Report snapshot versions must increase monotonically.");
    if (snapshot.generatedFromDiagnosticAt !== snapshot.report.generatedFromDiagnosticAt) throw new Error("Report snapshot diagnostic provenance does not match the report.");
    assertIsoTimestamp(snapshot.createdAt, "Report snapshot createdAt");
    versions.add(snapshot.version);
    ids.add(snapshot.id);
    previous = snapshot.version;
  }
  return history;
}

export function createReportSnapshot(report: ExecutiveReport, existing: ReportSnapshot[], createdAt = new Date().toISOString()): ReportSnapshot {
  validateReportSnapshotHistory(existing, report.assessmentId);
  assertIsoTimestamp(createdAt, "Report snapshot createdAt");
  const nextVersion = existing.reduce((max, item) => Math.max(max, item.version), 0) + 1;
  return {
    schemaVersion: "1.0",
    id: `report_${report.assessmentId}_v${nextVersion}`,
    assessmentId: report.assessmentId,
    version: nextVersion,
    versionLabel: `v${nextVersion}`,
    createdAt,
    generatedFromDiagnosticAt: report.generatedFromDiagnosticAt,
    report: structuredClone(report)
  };
}

export function createReportExport(snapshot: ReportSnapshot, exportedAt = new Date().toISOString()): ReportExportEnvelope {
  validateReportSnapshotHistory([snapshot], snapshot.assessmentId);
  assertIsoTimestamp(exportedAt, "Report export exportedAt");
  return {
    schemaVersion: "1.0",
    exportFormat: "sugar-platform-diagnostic-report-json",
    exportedAt,
    snapshot: structuredClone(snapshot)
  };
}

export function reportExportFilename(snapshot: ReportSnapshot) {
  return `${sanitizeFilenamePart(snapshot.report.title)}-${snapshot.versionLabel}.json`;
}
