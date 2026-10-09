import type { DiagnosticEnvelope, DiagnosticFinding, DiagnosticSeverity } from "@/lib/diagnostics";
import type { EvidenceReference } from "@/lib/extraction";
import type { FindingReview } from "@/lib/finding-review";

export type MaturityBand = "initial" | "developing" | "managed" | "strong";
export type MaturityDimension = {
  category: DiagnosticFinding["category"];
  acceptedFindingCount: number;
  riskPoints: number;
  score: number;
};
export type FocusedMaturitySummary = {
  schemaVersion: "1.0";
  assessmentId: string;
  generatedFromDiagnosticAt: string;
  status: "scored" | "not_scored";
  score: number | null;
  band: MaturityBand | null;
  acceptedFindingCount: number;
  totalFindingCount: number;
  dimensions: MaturityDimension[];
  rationale: string[];
  limitations: string[];
};
export type PrioritizedRecommendation = {
  id: string;
  priority: number;
  severity: DiagnosticSeverity;
  confidence: number;
  title: string;
  action: string;
  whyNow: string;
  findingIds: string[];
  affectedObjectIds: string[];
  evidence: EvidenceReference[];
};
export type RecommendationSet = {
  schemaVersion: "1.0";
  assessmentId: string;
  generatedFromDiagnosticAt: string;
  recommendations: PrioritizedRecommendation[];
  stats: { acceptedFindingCount: number; recommendationCount: number; evidenceReferenceCount: number };
  limitations: string[];
};

const SEVERITY_POINTS: Record<DiagnosticSeverity, number> = { low: 1, medium: 2, high: 3 };
const CATEGORY_LABELS: Record<DiagnosticFinding["category"], string> = {
  entity_identity: "Entity and identifier governance",
  ownership: "Ownership and governance",
  platform_capability: "Platform capability duplication",
  integration_risk: "Integration and coupling risk"
};

function round1(value: number) { return Math.round(value * 10) / 10; }
function scoreBand(score: number): MaturityBand {
  if (score < 2) return "initial";
  if (score < 3) return "developing";
  if (score < 4) return "managed";
  return "strong";
}
function uniqueEvidence(items: EvidenceReference[]) {
  const bySegment = new Map<string, EvidenceReference>();
  for (const item of items) if (!bySegment.has(item.segmentId)) bySegment.set(item.segmentId, item);
  return [...bySegment.values()];
}
function reviewedAcceptedFindings(diagnostics: DiagnosticEnvelope, review: FindingReview): DiagnosticFinding[] {
  if (!review.reviewedAt) throw new Error("Finding review must be completed before maturity or recommendations are generated.");
  if (review.diagnosticGeneratedAt !== diagnostics.generatedAt) throw new Error("Finding review is stale because diagnostics were re-run.");
  const byId = new Map(review.findings.map((item) => [item.findingId, item]));
  return diagnostics.findings.flatMap((finding) => {
    const item = byId.get(finding.id);
    if (!item || item.status !== "accepted") return [];
    return [{ ...finding, ...item.edits, reviewStatus: "accepted" as const }];
  });
}

export function calculateFocusedMaturity(diagnostics: DiagnosticEnvelope, review: FindingReview): FocusedMaturitySummary {
  const accepted = reviewedAcceptedFindings(diagnostics, review);
  const limitations = [
    "This is a focused risk-adjusted signal from the supplied architecture evidence and current diagnostic rules, not an enterprise maturity certification.",
    `The current deterministic engine evaluated ${diagnostics.stats.ruleCount} rule${diagnostics.stats.ruleCount === 1 ? "" : "s"}; unimplemented rule areas are not scored.`,
    "Rejected findings do not contribute to the score, and missing documentation is not treated as proof of mature practice."
  ];
  if (accepted.length === 0) {
    return {
      schemaVersion: "1.0", assessmentId: diagnostics.assessmentId, generatedFromDiagnosticAt: diagnostics.generatedAt,
      status: "not_scored", score: null, band: null, acceptedFindingCount: 0, totalFindingCount: diagnostics.findings.length,
      dimensions: [],
      rationale: ["No findings were accepted in the completed review, so the current evidence does not support a maturity score. Add evidence or broaden implemented diagnostics before interpreting absence of accepted findings as strength."],
      limitations
    };
  }

  const riskPoints = accepted.reduce((total, finding) => total + SEVERITY_POINTS[finding.severity], 0);
  const averageRisk = riskPoints / accepted.length;
  const concentrationPenalty = Math.min(1, Math.max(0, accepted.length - 1) * 0.2);
  const score = round1(Math.max(1, Math.min(5, 5 - averageRisk * 0.8 - concentrationPenalty)));
  const categoryGroups = new Map<DiagnosticFinding["category"], DiagnosticFinding[]>();
  for (const finding of accepted) categoryGroups.set(finding.category, [...(categoryGroups.get(finding.category) ?? []), finding]);
  const dimensions = [...categoryGroups.entries()].map(([category, findings]) => {
    const points = findings.reduce((total, finding) => total + SEVERITY_POINTS[finding.severity], 0);
    const dimensionScore = round1(Math.max(1, Math.min(5, 5 - (points / findings.length) * 0.8 - Math.min(0.6, Math.max(0, findings.length - 1) * 0.2))));
    return { category, acceptedFindingCount: findings.length, riskPoints: points, score: dimensionScore };
  }).sort((a, b) => a.score - b.score || a.category.localeCompare(b.category));

  return {
    schemaVersion: "1.0", assessmentId: diagnostics.assessmentId, generatedFromDiagnosticAt: diagnostics.generatedAt,
    status: "scored", score, band: scoreBand(score), acceptedFindingCount: accepted.length, totalFindingCount: diagnostics.findings.length,
    dimensions,
    rationale: [
      `Score starts at 5.0 and is reduced by accepted finding severity: low=${SEVERITY_POINTS.low}, medium=${SEVERITY_POINTS.medium}, high=${SEVERITY_POINTS.high} risk points.`,
      `${accepted.length} accepted finding${accepted.length === 1 ? "" : "s"} contributed ${riskPoints} total risk point${riskPoints === 1 ? "" : "s"}; average severity risk was ${round1(averageRisk)}.`,
      `A concentration penalty of ${round1(concentrationPenalty)} reflects multiple accepted risks without treating rejected findings as evidence.`,
      ...dimensions.map((dimension) => `${CATEGORY_LABELS[dimension.category]}: ${dimension.score}/5 from ${dimension.acceptedFindingCount} accepted finding${dimension.acceptedFindingCount === 1 ? "" : "s"}.`)
    ],
    limitations
  };
}

export function generatePrioritizedRecommendations(diagnostics: DiagnosticEnvelope, review: FindingReview): RecommendationSet {
  const accepted = reviewedAcceptedFindings(diagnostics, review);
  const ranked = [...accepted].sort((a, b) => SEVERITY_POINTS[b.severity] - SEVERITY_POINTS[a.severity] || b.confidence - a.confidence || a.title.localeCompare(b.title));
  const recommendations = ranked.map((finding, index): PrioritizedRecommendation => ({
    id: `recommendation_${finding.id}`,
    priority: index + 1,
    severity: finding.severity,
    confidence: finding.confidence,
    title: `Address: ${finding.title}`,
    action: finding.recommendation,
    whyNow: `${finding.businessImpact} ${finding.technicalImpact}`.trim(),
    findingIds: [finding.id],
    affectedObjectIds: [...finding.affectedObjectIds],
    evidence: uniqueEvidence(finding.evidence)
  }));
  return {
    schemaVersion: "1.0", assessmentId: diagnostics.assessmentId, generatedFromDiagnosticAt: diagnostics.generatedAt,
    recommendations,
    stats: {
      acceptedFindingCount: accepted.length,
      recommendationCount: recommendations.length,
      evidenceReferenceCount: recommendations.reduce((total, item) => total + item.evidence.length, 0)
    },
    limitations: [
      "Recommendations are generated only from accepted reviewed findings; rejected and pending findings are excluded.",
      "Priority is deterministic: severity first, then confidence, then title. Human sequencing, cost, dependencies, and organizational constraints still require review."
    ]
  };
}
