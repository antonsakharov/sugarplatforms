import type { TenantScope } from "./tenancy";
import { calculateFocusedMaturity, generatePrioritizedRecommendations } from "./maturity-recommendations";
import { generateExecutiveReport, generateNinetyDayActionPlan } from "./reporting";
import { validateDiagnosticEvidence } from "./finding-review";
import { getAssessmentRepository } from "./server-assessment-store";
import { getProcessingRepository } from "./server-processing-store";
import { getExtractionReviewRepository } from "./server-review-store";
import { getFindingReviewRepository } from "./server-finding-review-store";

export class ReportStateUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = "ReportStateUnavailableError"; }
}

export function generateCurrentExecutiveReport(scope: TenantScope, assessmentId: string) {
  const assessment = getAssessmentRepository().findById(scope, assessmentId);
  if (!assessment) throw new ReportStateUnavailableError("Assessment not found.");
  const processing = getProcessingRepository().find(scope, assessmentId);
  if (!processing) throw new ReportStateUnavailableError("Process artifacts before generating a report.");
  const extractionReview = getExtractionReviewRepository().find(scope, assessmentId, processing.extraction);
  if (!extractionReview || extractionReview.stale || !extractionReview.review.approved || !extractionReview.review.approvedAt) {
    throw new ReportStateUnavailableError("Approve the current extraction before generating a report.");
  }
  const findingState = getFindingReviewRepository().find(scope, assessmentId);
  if (!findingState) throw new ReportStateUnavailableError("Complete finding review before generating a report.");
  const stale = findingState.diagnostics.extractionApprovedAt !== extractionReview.review.approvedAt;
  if (stale || !findingState.review.reviewedAt || findingState.review.findings.some((item) => item.status === "pending")) {
    throw new ReportStateUnavailableError("Complete the current finding review before generating a report.");
  }
  validateDiagnosticEvidence(findingState.diagnostics, processing.extraction, extractionReview.review);
  if (findingState.review.diagnosticGeneratedAt !== findingState.diagnostics.generatedAt) {
    throw new ReportStateUnavailableError("Finding review is stale because diagnostics changed.");
  }
  const acceptedIds = new Set(findingState.review.findings.filter((item) => item.status === "accepted").map((item) => item.findingId));
  if (findingState.acceptedFindings.length !== acceptedIds.size || findingState.acceptedFindings.some((finding) => !acceptedIds.has(finding.id))) {
    throw new ReportStateUnavailableError("Accepted findings do not match the completed finding review.");
  }
  const maturity = calculateFocusedMaturity(findingState.diagnostics, findingState.review);
  const recommendations = generatePrioritizedRecommendations(findingState.diagnostics, findingState.review);
  const actionPlan = generateNinetyDayActionPlan(recommendations);
  return generateExecutiveReport({
    assessment,
    artifacts: processing.artifacts.map((artifact) => ({ name: artifact.originalName, type: artifact.mediaType, size: artifact.size, status: "validated" as const })),
    diagnostics: findingState.diagnostics,
    review: findingState.review,
    maturity,
    recommendations,
    actionPlan
  });
}
