import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";

export function runDeterministicDiagnostics(extraction: ExtractionEnvelope, review: ExtractionReview) {
  if (!review.approved) throw new Error("Extraction must be approved before diagnostics can run.");
  return { schemaVersion: "1.0" as const, engineVersion: "deterministic-v1" as const, status: "complete" as const, findings: [], stats: { ruleCount: 0, findingCount: 0, evidenceReferenceCount: 0 } };
}
