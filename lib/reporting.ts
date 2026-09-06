import type { AssessmentDraft } from "@/lib/assessment";
import type { DiagnosticEnvelope, DiagnosticFinding, DiagnosticSeverity } from "@/lib/diagnostics";
import type { EvidenceReference } from "@/lib/extraction";
import type { FindingReview } from "@/lib/finding-review";
import type { FocusedMaturitySummary, RecommendationSet } from "@/lib/maturity-recommendations";

export type ArtifactReportItem = {
  name: string;
  type: string;
  size: number;
  status: "validated" | "review_required" | "blocked";
};
export type ActionPlanHorizon = "days_0_30" | "days_31_60" | "days_61_90";
export type ActionPlanItem = {
  id: string;
  horizon: ActionPlanHorizon;
  priority: number;
  title: string;
  action: string;
  expectedOutcome: string;
  severity: DiagnosticSeverity;
  findingIds: string[];
  affectedObjectIds: string[];
  evidence: EvidenceReference[];
};
export type NinetyDayActionPlan = {
  schemaVersion: "1.0";
  assessmentId: string;
  generatedFromDiagnosticAt: string;
  phases: Array<{ horizon: ActionPlanHorizon; label: string; objective: string; items: ActionPlanItem[] }>;
  stats: { recommendationCount: number; plannedItemCount: number; evidenceReferenceCount: number };
  limitations: string[];
};
export type ReportFinding = Pick<DiagnosticFinding, "id" | "category" | "severity" | "confidence" | "title" | "description" | "businessImpact" | "technicalImpact" | "affectedObjectIds" | "evidence" | "recommendation">;
export type ExecutiveReport = {
  schemaVersion: "1.0";
  reportVersion: "preview-v1";
  assessmentId: string;
  generatedAt: string;
  generatedFromDiagnosticAt: string;
  title: string;
  audience: string;
  executiveSummary: string;
  scope: {
    companyName: string;
    industry: string;
    focusArea: string;
    primaryEntity: string;
    businessConcern: string;
    artifactCount: number;
    artifacts: ArtifactReportItem[];
  };
  maturity: FocusedMaturitySummary;
  topFindings: ReportFinding[];
  recommendations: RecommendationSet;
  actionPlan: NinetyDayActionPlan;
  evidenceAppendix: Array<{ findingId: string; findingTitle: string; evidence: EvidenceReference[] }>;
  limitations: string[];
};

const REPORT_SEVERITY_POINTS: Record<DiagnosticSeverity, number> = { low: 1, medium: 2, high: 3 };
const PHASES: Array<{ horizon: ActionPlanHorizon; label: string; objective: string }> = [
  { horizon: "days_0_30", label: "0–30 days", objective: "Confirm ownership, definitions, and the highest-risk remediation scope." },
  { horizon: "days_31_60", label: "31–60 days", objective: "Implement the highest-priority architecture changes and validate them against source evidence." },
  { horizon: "days_61_90", label: "61–90 days", objective: "Stabilize the target pattern, document controls, and measure whether the accepted risks are reducing." }
];

function uniqueEvidence(items: EvidenceReference[]) {
  const bySegment = new Map<string, EvidenceReference>();
  for (const item of items) if (!bySegment.has(item.segmentId)) bySegment.set(item.segmentId, item);
  return [...bySegment.values()];
}
function reviewedAcceptedFindings(diagnostics: DiagnosticEnvelope, review: FindingReview): DiagnosticFinding[] {
  if (!review.reviewedAt) throw new Error("Finding review must be completed before report generation.");
  if (review.diagnosticGeneratedAt !== diagnostics.generatedAt) throw new Error("Finding review is stale because diagnostics were re-run.");
  const byId = new Map(review.findings.map((item) => [item.findingId, item]));
  return diagnostics.findings.flatMap((finding) => {
    const item = byId.get(finding.id);
    if (!item || item.status !== "accepted") return [];
    return [{ ...finding, ...item.edits, reviewStatus: "accepted" as const }];
  });
}
function horizonForPriority(priority: number, count: number): ActionPlanHorizon {
  if (count <= 1 || priority <= Math.ceil(count / 3)) return "days_0_30";
  if (priority <= Math.ceil((count * 2) / 3)) return "days_31_60";
  return "days_61_90";
}

export function generateNinetyDayActionPlan(recommendations: RecommendationSet): NinetyDayActionPlan {
  const count = recommendations.recommendations.length;
  const items: ActionPlanItem[] = recommendations.recommendations.map((recommendation) => ({
    id: `plan_${recommendation.id}`,
    horizon: horizonForPriority(recommendation.priority, count),
    priority: recommendation.priority,
    title: recommendation.title,
    action: recommendation.action,
    expectedOutcome: `Reduce or validate the risk represented by ${recommendation.findingIds.length} accepted finding${recommendation.findingIds.length === 1 ? "" : "s"} while preserving evidence traceability.`,
    severity: recommendation.severity,
    findingIds: [...recommendation.findingIds],
    affectedObjectIds: [...recommendation.affectedObjectIds],
    evidence: uniqueEvidence(recommendation.evidence)
  }));
  return {
    schemaVersion: "1.0",
    assessmentId: recommendations.assessmentId,
    generatedFromDiagnosticAt: recommendations.generatedFromDiagnosticAt,
    phases: PHASES.map((phase) => ({ ...phase, items: items.filter((item) => item.horizon === phase.horizon) })),
    stats: {
      recommendationCount: count,
      plannedItemCount: items.length,
      evidenceReferenceCount: items.reduce((total, item) => total + item.evidence.length, 0)
    },
    limitations: [
      "The 90-day plan is a deterministic sequencing aid based on accepted recommendation priority; it does not estimate engineering effort, budget, staffing, or dependency duration.",
      "A human owner should validate sequencing and delivery feasibility before treating any phase as a committed implementation plan."
    ]
  };
}

export function generateExecutiveReport(input: {
  assessment: AssessmentDraft;
  artifacts: ArtifactReportItem[];
  diagnostics: DiagnosticEnvelope;
  review: FindingReview;
  maturity: FocusedMaturitySummary;
  recommendations: RecommendationSet;
  actionPlan: NinetyDayActionPlan;
  generatedAt?: string;
}): ExecutiveReport {
  const { assessment, artifacts, diagnostics, review, maturity, recommendations, actionPlan } = input;
  if (assessment.id !== diagnostics.assessmentId || maturity.assessmentId !== diagnostics.assessmentId || recommendations.assessmentId !== diagnostics.assessmentId || actionPlan.assessmentId !== diagnostics.assessmentId) {
    throw new Error("Report inputs must belong to the same assessment.");
  }
  if (maturity.generatedFromDiagnosticAt !== diagnostics.generatedAt || recommendations.generatedFromDiagnosticAt !== diagnostics.generatedAt || actionPlan.generatedFromDiagnosticAt !== diagnostics.generatedAt) {
    throw new Error("Report inputs are stale because diagnostics were re-run.");
  }
  const accepted = reviewedAcceptedFindings(diagnostics, review);
  const acceptedById = new Map(accepted.map((finding) => [finding.id, finding]));
  for (const recommendation of recommendations.recommendations) {
    if (!recommendation.findingIds.every((id) => acceptedById.has(id))) throw new Error("Report recommendation references a finding that is not accepted in the completed review.");
  }
  const topFindings = [...accepted]
    .sort((a, b) => REPORT_SEVERITY_POINTS[b.severity] - REPORT_SEVERITY_POINTS[a.severity] || b.confidence - a.confidence || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map((finding): ReportFinding => ({
      id: finding.id, category: finding.category, severity: finding.severity, confidence: finding.confidence, title: finding.title,
      description: finding.description, businessImpact: finding.businessImpact, technicalImpact: finding.technicalImpact,
      affectedObjectIds: [...finding.affectedObjectIds], evidence: uniqueEvidence(finding.evidence), recommendation: finding.recommendation
    }));
  const summary = accepted.length === 0
    ? `The reviewed evidence for ${assessment.primaryEntity} produced no accepted findings under the currently implemented diagnostic rules. This is an inconclusive result, not evidence of a risk-free architecture.`
    : `${accepted.length} reviewed finding${accepted.length === 1 ? " was" : "s were"} accepted for ${assessment.primaryEntity}. The current focused maturity signal is ${maturity.score === null ? "not scored" : `${maturity.score}/5 (${maturity.band})`}, with ${recommendations.recommendations.length} prioritized recommendation${recommendations.recommendations.length === 1 ? "" : "s"} sequenced into a 90-day action plan.`;

  return {
    schemaVersion: "1.0", reportVersion: "preview-v1", assessmentId: assessment.id,
    generatedAt: input.generatedAt ?? new Date().toISOString(), generatedFromDiagnosticAt: diagnostics.generatedAt,
    title: `${assessment.assessmentTitle} — Executive Diagnostic Preview`, audience: assessment.reportAudience,
    executiveSummary: summary,
    scope: {
      companyName: assessment.companyName, industry: assessment.industry, focusArea: assessment.focusArea,
      primaryEntity: assessment.primaryEntity, businessConcern: assessment.businessConcern,
      artifactCount: artifacts.length,
      artifacts: artifacts.map((artifact) => ({ name: artifact.name, type: artifact.type, size: artifact.size, status: artifact.status }))
    },
    maturity,
    topFindings,
    recommendations,
    actionPlan,
    evidenceAppendix: topFindings.map((finding) => ({ findingId: finding.id, findingTitle: finding.title, evidence: finding.evidence })),
    limitations: [
      "Preview only: this report is generated from browser-local demo state and is not a durable tenant-scoped report record.",
      "Only accepted findings are included. Rejected and pending findings are excluded from report conclusions and recommendations.",
      "Artifact inventory contains metadata only; raw uploaded content is not reproduced in the executive report preview.",
      "The current deterministic engine covers a limited rule set, so absence of a finding does not prove absence of architecture risk."
    ]
  };
}
