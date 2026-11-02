import type { DiagnosticEnvelope, DiagnosticFinding, DiagnosticSeverity } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";

export type FindingDecision = "pending" | "accepted" | "rejected";
export type FindingEdits = Partial<Pick<DiagnosticFinding, "title" | "description" | "businessImpact" | "technicalImpact" | "recommendation" | "severity">>;
export type ReviewedFinding = {
  findingId: string;
  status: FindingDecision;
  edits: FindingEdits;
  reviewerNote?: string;
};
export type FindingReview = {
  schemaVersion: "1.0";
  assessmentId: string;
  diagnosticGeneratedAt: string;
  reviewedAt?: string;
  findings: ReviewedFinding[];
};

const TEXT_LIMITS = {
  title: 180,
  description: 1600,
  businessImpact: 1200,
  technicalImpact: 1200,
  recommendation: 1200,
  reviewerNote: 1000
} as const;

function clean(value: string, max: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Edited finding text cannot be empty.");
  return normalized.slice(0, max);
}

export function validateDiagnosticEvidence(diagnostics: DiagnosticEnvelope, extraction: ExtractionEnvelope, extractionReview: ExtractionReview) {
  if (!extractionReview.approved || !extractionReview.approvedAt) throw new Error("Finding review requires an approved extraction boundary.");
  if (diagnostics.extractionApprovedAt !== extractionReview.approvedAt) throw new Error("Diagnostics were generated from a different extraction approval version. Re-run diagnostics before review.");

  const extractedById = new Map(extraction.objects.map((item) => [item.id, item]));
  const reviewedById = new Map(extractionReview.objects.map((item) => [item.id, item]));
  const evidenceSegments = new Set(extraction.objects.flatMap((item) => item.evidence.map((evidence) => evidence.segmentId)));

  for (const finding of diagnostics.findings) {
    if (finding.evidence.length === 0) throw new Error(`Finding ${finding.id} has no evidence.`);
    for (const evidence of finding.evidence) {
      if (evidence.evidenceType !== "direct" || !evidenceSegments.has(evidence.segmentId)) throw new Error(`Finding ${finding.id} contains evidence outside the approved extraction boundary.`);
    }
    for (const objectId of finding.affectedObjectIds) {
      const extracted = extractedById.get(objectId);
      const reviewed = reviewedById.get(objectId);
      if (!extracted || !reviewed || reviewed.status !== "confirmed") throw new Error(`Finding ${finding.id} references an object outside the confirmed extraction set.`);
    }
  }
  return true;
}

export function createFindingReview(diagnostics: DiagnosticEnvelope): FindingReview {
  return {
    schemaVersion: "1.0",
    assessmentId: diagnostics.assessmentId,
    diagnosticGeneratedAt: diagnostics.generatedAt,
    findings: diagnostics.findings.map((finding) => ({ findingId: finding.id, status: "pending", edits: {} }))
  };
}

function updateFinding(review: FindingReview, findingId: string, updater: (item: ReviewedFinding) => ReviewedFinding): FindingReview {
  if (!review.findings.some((item) => item.findingId === findingId)) throw new Error("Finding does not exist in this review.");
  return { ...review, reviewedAt: undefined, findings: review.findings.map((item) => item.findingId === findingId ? updater(item) : item) };
}

export function setFindingDecision(review: FindingReview, findingId: string, status: FindingDecision): FindingReview {
  return updateFinding(review, findingId, (item) => ({ ...item, status }));
}

export function editFinding(review: FindingReview, findingId: string, edits: FindingEdits, reviewerNote?: string): FindingReview {
  const next: FindingEdits = {};
  if (edits.title !== undefined) next.title = clean(edits.title, TEXT_LIMITS.title);
  if (edits.description !== undefined) next.description = clean(edits.description, TEXT_LIMITS.description);
  if (edits.businessImpact !== undefined) next.businessImpact = clean(edits.businessImpact, TEXT_LIMITS.businessImpact);
  if (edits.technicalImpact !== undefined) next.technicalImpact = clean(edits.technicalImpact, TEXT_LIMITS.technicalImpact);
  if (edits.recommendation !== undefined) next.recommendation = clean(edits.recommendation, TEXT_LIMITS.recommendation);
  if (edits.severity !== undefined) {
    if (!(["low", "medium", "high"] as DiagnosticSeverity[]).includes(edits.severity)) throw new Error("Unsupported finding severity.");
    next.severity = edits.severity;
  }
  return updateFinding(review, findingId, (item) => ({
    ...item,
    status: "pending",
    edits: { ...item.edits, ...next },
    reviewerNote: reviewerNote === undefined ? item.reviewerNote : reviewerNote.trim() ? clean(reviewerNote, TEXT_LIMITS.reviewerNote) : undefined
  }));
}

export function canCompleteFindingReview(review: FindingReview) {
  return review.findings.every((item) => item.status !== "pending");
}

export function completeFindingReview(review: FindingReview, reviewedAt = new Date().toISOString()): FindingReview {
  if (!canCompleteFindingReview(review)) throw new Error("Accept or reject every finding before completing review.");
  return { ...review, reviewedAt };
}

export function materializeReviewedFinding(finding: DiagnosticFinding, reviewItem: ReviewedFinding): DiagnosticFinding {
  if (finding.id !== reviewItem.findingId) throw new Error("Finding review item does not match the finding.");
  return { ...finding, ...reviewItem.edits, reviewStatus: reviewItem.status === "accepted" ? "accepted" : reviewItem.status === "rejected" ? "rejected" : "pending" };
}

export function acceptedFindings(diagnostics: DiagnosticEnvelope, review: FindingReview): DiagnosticFinding[] {
  if (!review.reviewedAt) throw new Error("Finding review must be completed before downstream outputs are generated.");
  if (review.diagnosticGeneratedAt !== diagnostics.generatedAt) throw new Error("Finding review is stale because diagnostics were re-run.");
  const byId = new Map(review.findings.map((item) => [item.findingId, item]));
  return diagnostics.findings.flatMap((finding) => {
    const item = byId.get(finding.id);
    if (!item || item.status !== "accepted") return [];
    return [materializeReviewedFinding(finding, item)];
  });
}
