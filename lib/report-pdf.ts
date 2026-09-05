import { createHash } from "node:crypto";
import { validateReportSnapshotHistory, type ReportSnapshot } from "./report-versioning.ts";

export type ReportPdfArtifact = {
  schemaVersion: "1.0";
  exportFormat: "sugar-platform-diagnostic-report-pdf";
  filename: string;
  mediaType: "application/pdf";
  pageCount: number;
  sha256: string;
  generatedFromDiagnosticAt: string;
  bytes: Uint8Array;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 48;
const TOP_Y = 792;
const BOTTOM_Y = 52;
const BODY_FONT_SIZE = 9;
const LINE_HEIGHT = 13;
const MAX_LINE_CHARS = 92;
const MAX_RENDERED_CHARS = 200_000;

function sanitizeFilenamePart(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 80) || "sugar-platform-diagnostic";
}

export function reportPdfFilename(snapshot: ReportSnapshot) {
  return `${sanitizeFilenamePart(snapshot.report.title)}-${snapshot.versionLabel}.pdf`;
}

function printable(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function wrap(value: string, width = MAX_LINE_CHARS) {
  const text = printable(value);
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > width) {
      if (current) { lines.push(current); current = ""; }
      for (let offset = 0; offset < word.length; offset += width) lines.push(word.slice(offset, offset + width));
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) { lines.push(current); current = word; }
    else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function pdfText(value: string) {
  return printable(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

type RenderLine = { text: string; bold?: boolean; gapBefore?: number };

function pushWrapped(lines: RenderLine[], text: string, options: { bold?: boolean; gapBefore?: number; prefix?: string } = {}) {
  const wrapped = wrap(`${options.prefix ?? ""}${text}`);
  wrapped.forEach((item, index) => lines.push({ text: item, bold: options.bold, gapBefore: index === 0 ? options.gapBefore : undefined }));
}

function reportLines(snapshot: ReportSnapshot) {
  const report = snapshot.report;
  const lines: RenderLine[] = [];
  pushWrapped(lines, report.title, { bold: true });
  pushWrapped(lines, `${snapshot.versionLabel} | Audience: ${report.audience} | Saved: ${snapshot.createdAt}`);
  pushWrapped(lines, `Diagnostic provenance: ${snapshot.generatedFromDiagnosticAt}`);

  pushWrapped(lines, "Executive summary", { bold: true, gapBefore: 10 });
  pushWrapped(lines, report.executiveSummary);

  pushWrapped(lines, "Scope", { bold: true, gapBefore: 10 });
  pushWrapped(lines, `${report.scope.companyName} | ${report.scope.industry}`);
  pushWrapped(lines, `Focus: ${report.scope.focusArea} | Primary entity: ${report.scope.primaryEntity}`);
  pushWrapped(lines, `Business concern: ${report.scope.businessConcern}`);
  pushWrapped(lines, `Artifacts: ${report.scope.artifactCount}`);
  for (const artifact of report.scope.artifacts) {
    pushWrapped(lines, `${artifact.name} | ${artifact.status} | ${artifact.type || "unknown"} | ${(artifact.size / 1024 / 1024).toFixed(2)} MB`, { prefix: "- " });
  }

  pushWrapped(lines, "Focused maturity", { bold: true, gapBefore: 10 });
  pushWrapped(lines, report.maturity.score === null ? "Not scored" : `${report.maturity.score}/5 | ${report.maturity.band}`);
  for (const rationale of report.maturity.rationale) pushWrapped(lines, rationale, { prefix: "- " });

  pushWrapped(lines, "Prioritized recommendations", { bold: true, gapBefore: 10 });
  if (report.recommendations.recommendations.length === 0) pushWrapped(lines, "No recommendations are included because no reviewed findings were accepted.");
  for (const recommendation of report.recommendations.recommendations) {
    pushWrapped(lines, `Priority ${recommendation.priority} | ${recommendation.severity} | ${recommendation.title}`, { bold: true, gapBefore: 5 });
    pushWrapped(lines, recommendation.action);
    pushWrapped(lines, `Why now: ${recommendation.whyNow}`);
  }

  pushWrapped(lines, "Top accepted findings", { bold: true, gapBefore: 10 });
  if (report.topFindings.length === 0) pushWrapped(lines, "No accepted findings are included. This is inconclusive under the current limited rule coverage.");
  for (const finding of report.topFindings) {
    pushWrapped(lines, `${finding.severity} | ${finding.category} | ${finding.title}`, { bold: true, gapBefore: 5 });
    pushWrapped(lines, finding.description);
    pushWrapped(lines, `Business impact: ${finding.businessImpact}`);
    pushWrapped(lines, `Technical impact: ${finding.technicalImpact}`);
    pushWrapped(lines, `Recommendation: ${finding.recommendation}`);
    for (const evidence of finding.evidence) pushWrapped(lines, `${evidence.artifactName} | ${evidence.locator} | ${evidence.segmentId}`, { prefix: "Evidence: " });
  }

  pushWrapped(lines, "90-day action plan", { bold: true, gapBefore: 10 });
  for (const phase of report.actionPlan.phases) {
    pushWrapped(lines, `${phase.label} - ${phase.objective}`, { bold: true, gapBefore: 5 });
    if (phase.items.length === 0) pushWrapped(lines, "No accepted recommendation is assigned to this phase.");
    for (const item of phase.items) {
      pushWrapped(lines, `Priority ${item.priority} | ${item.severity} | ${item.title}`, { prefix: "- " });
      pushWrapped(lines, item.action);
      pushWrapped(lines, `Expected outcome: ${item.expectedOutcome}`);
    }
  }

  pushWrapped(lines, "Evidence appendix", { bold: true, gapBefore: 10 });
  if (report.evidenceAppendix.length === 0) pushWrapped(lines, "No accepted finding evidence is included.");
  for (const entry of report.evidenceAppendix) {
    pushWrapped(lines, entry.findingTitle, { bold: true, gapBefore: 5 });
    for (const evidence of entry.evidence) pushWrapped(lines, `${evidence.artifactName} | ${evidence.locator} | ${evidence.segmentId}`, { prefix: "- " });
  }

  pushWrapped(lines, "Limitations", { bold: true, gapBefore: 10 });
  for (const limitation of report.limitations) pushWrapped(lines, limitation, { prefix: "- " });
  pushWrapped(lines, "Generated by Sugar Platform Diagnostic from an immutable reviewed report snapshot.", { gapBefore: 10 });

  const renderedCharacters = lines.reduce((total, line) => total + line.text.length, 0);
  if (renderedCharacters > MAX_RENDERED_CHARS) throw new Error("Report snapshot is too large for bounded PDF generation.");
  return lines;
}

function paginate(lines: RenderLine[]) {
  const pages: RenderLine[][] = [];
  let page: RenderLine[] = [];
  let y = TOP_Y;
  for (const line of lines) {
    const gap = line.gapBefore ?? 0;
    if (y - gap - LINE_HEIGHT < BOTTOM_Y && page.length > 0) {
      pages.push(page);
      page = [];
      y = TOP_Y;
    }
    if (gap) { page.push({ text: "", gapBefore: gap }); y -= gap; }
    page.push({ text: line.text, bold: line.bold });
    y -= LINE_HEIGHT;
  }
  if (page.length > 0 || pages.length === 0) pages.push(page);
  return pages;
}

function pageContent(lines: RenderLine[], pageNumber: number, pageCount: number) {
  const commands: string[] = ["BT", `/F1 ${BODY_FONT_SIZE} Tf`, `${LEFT_MARGIN} ${TOP_Y} Td`];
  let currentFont = "F1";
  for (const line of lines) {
    if (line.gapBefore) { commands.push(`0 -${line.gapBefore} Td`); continue; }
    const desiredFont = line.bold ? "F2" : "F1";
    if (desiredFont !== currentFont) { commands.push(`/${desiredFont} ${BODY_FONT_SIZE} Tf`); currentFont = desiredFont; }
    commands.push(`(${pdfText(line.text)}) Tj`, `0 -${LINE_HEIGHT} Td`);
  }
  commands.push("ET", "BT", "/F1 8 Tf", `${LEFT_MARGIN} 28 Td`, `(Sugar Platform Diagnostic | ${snapshotSafePage(pageNumber, pageCount)}) Tj`, "ET");
  return commands.join("\n");
}

function snapshotSafePage(pageNumber: number, pageCount: number) {
  return `Page ${pageNumber} of ${pageCount}`;
}

function pdfObject(id: number, body: string) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

function buildPdfBytes(snapshot: ReportSnapshot, pages: RenderLine[][]) {
  const objects = new Map<number, string>();
  const pageIds: number[] = [];
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  let nextId = 5;
  pages.forEach((pageLines, index) => {
    const pageId = nextId++;
    const contentId = nextId++;
    pageIds.push(pageId);
    const content = pageContent(pageLines, index + 1, pages.length);
    objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.set(contentId, `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
  });
  objects.set(2, `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);
  const infoId = nextId++;
  objects.set(infoId, `<< /Title (${pdfText(snapshot.report.title)}) /Author (Sugar Platform Diagnostic) /Subject (${pdfText(`Reviewed architecture diagnostic ${snapshot.versionLabel}`)}) /Creator (Sugar Platform Diagnostic) /Producer (Sugar Platform Diagnostic deterministic PDF adapter) >>`);

  let output = "%PDF-1.4\n%SugarPlatformDiagnostic\n";
  const offsets: number[] = [0];
  for (let id = 1; id < nextId; id += 1) {
    const body = objects.get(id);
    if (!body) throw new Error(`PDF object ${id} is missing.`);
    offsets[id] = Buffer.byteLength(output, "latin1");
    output += pdfObject(id, body);
  }
  const xrefOffset = Buffer.byteLength(output, "latin1");
  output += `xref\n0 ${nextId}\n0000000000 65535 f \n`;
  for (let id = 1; id < nextId; id += 1) output += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${nextId} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Uint8Array.from(Buffer.from(output, "latin1"));
}

export function generateReportPdf(snapshot: ReportSnapshot): ReportPdfArtifact {
  validateReportSnapshotHistory([snapshot], snapshot.assessmentId);
  const lines = reportLines(snapshot);
  const pages = paginate(lines);
  const bytes = buildPdfBytes(snapshot, pages);
  return {
    schemaVersion: "1.0",
    exportFormat: "sugar-platform-diagnostic-report-pdf",
    filename: reportPdfFilename(snapshot),
    mediaType: "application/pdf",
    pageCount: pages.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    generatedFromDiagnosticAt: snapshot.generatedFromDiagnosticAt,
    bytes
  };
}
