import type { AiFindingCandidate, AiFindingEnvelope } from "@/lib/ai-findings";
import { validateAiFindingEnvelope } from "./ai-findings.ts";
import { approvedDiagnosticObjects, type DiagnosticEnvelope, type DiagnosticFinding } from "./diagnostics.ts";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";

export type AiCandidatePromotion = {
  schemaVersion: "1.0";
  assessmentId: string;
  candidateId: string;
  promotedFindingId: string;
  sourceCandidateGeneratedAt: string;
  sourceDiagnosticGeneratedAt: string;
  extractionApprovedAt: string;
  provider: string;
  promptVersion: string;
  promotedAt: string;
};

export type PromotionResult = {
  diagnostics: DiagnosticEnvelope;
  promotion: AiCandidatePromotion;
};

function promotedFindingId(candidateId: string) {
  return `finding_promoted_${candidateId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 100)}`;
}

function toPromotedFinding(candidate: AiFindingCandidate): DiagnosticFinding {
  return {
    id: promotedFindingId(candidate.id),
    ruleId: `ai-promoted:${candidate.provider}`,
    ruleVersion: candidate.ruleVersion,
    category: candidate.category,
    severity: candidate.severity,
    confidence: candidate.confidence,
    factStatus: "derived",
    title: candidate.title,
    description: candidate.description,
    businessImpact: candidate.businessImpact,
    technicalImpact: candidate.technicalImpact,
    affectedObjectIds: [...candidate.affectedObjectIds],
    evidence: candidate.evidence.map((item) => ({ ...item })),
    recommendation: candidate.recommendation,
    validationQuestions: [...candidate.validationQuestions],
    reviewStatus: "pending"
  };
}

export function promoteAiCandidate(assessmentId: string, diagnostics: DiagnosticEnvelope, candidates: AiFindingEnvelope, extraction: ExtractionEnvelope, extractionReview: ExtractionReview, candidateId: string, promotedAt = new Date().toISOString()): PromotionResult {
  if (!extractionReview.approved || !extractionReview.approvedAt) throw new Error("AI candidate promotion requires an approved extraction boundary.");
  if (diagnostics.assessmentId !== assessmentId || candidates.assessmentId !== assessmentId) throw new Error("AI candidate promotion cannot cross assessment boundaries.");
  if (diagnostics.extractionApprovedAt !== extractionReview.approvedAt || candidates.extractionApprovedAt !== extractionReview.approvedAt) throw new Error("AI candidate promotion is stale because the extraction approval changed.");
  if (candidates.diagnosticGeneratedAt !== diagnostics.generatedAt) throw new Error("AI candidate promotion is stale because deterministic diagnostics were re-run.");
  const objects = approvedDiagnosticObjects(extraction, extractionReview);
  validateAiFindingEnvelope(candidates, { assessmentId, objects, deterministicFindings: diagnostics.findings });
  const candidate = candidates.candidates.find((item) => item.id === candidateId);
  if (!candidate) throw new Error("AI candidate does not exist in this candidate set.");
  const finding = toPromotedFinding(candidate);
  if (diagnostics.findings.some((item) => item.id === finding.id || item.ruleId === finding.ruleId && item.affectedObjectIds.join("|") === finding.affectedObjectIds.join("|"))) throw new Error("This AI candidate has already been promoted into the finding set.");
  const findings = [...diagnostics.findings, finding];
  const nextDiagnostics: DiagnosticEnvelope = { ...diagnostics, generatedAt: promotedAt, findings, stats: { ...diagnostics.stats, findingCount: findings.length, evidenceReferenceCount: findings.reduce((total, item) => total + item.evidence.length, 0) } };
  return { diagnostics: nextDiagnostics, promotion: { schemaVersion: "1.0", assessmentId, candidateId: candidate.id, promotedFindingId: finding.id, sourceCandidateGeneratedAt: candidates.generatedAt, sourceDiagnosticGeneratedAt: candidates.diagnosticGeneratedAt, extractionApprovedAt: extractionReview.approvedAt, provider: candidate.provider, promptVersion: candidate.promptVersion, promotedAt } };
}
