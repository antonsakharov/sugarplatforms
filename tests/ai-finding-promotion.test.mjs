import test from "node:test";
import assert from "node:assert/strict";
import { promoteAiCandidate } from "../lib/ai-finding-promotion.ts";
import { generateAiFindingCandidates, LocalDemoAiFindingProvider } from "../lib/ai-findings.ts";
import { approveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";
import { createFindingReview, setFindingDecision, completeFindingReview, acceptedFindings } from "../lib/finding-review.ts";

function object(id, source, target, segmentId) {
  return { id, kind: "integration", name: `${source} -> ${target}`, normalizedName: `${source} -> ${target}`.toLowerCase(), confidence: 0.95, extractionMethod: "test", evidence: [{ segmentId, artifactId: "art_1", artifactName: "architecture.md", locator: `lines ${segmentId.slice(-1)}-${segmentId.slice(-1)}`, evidenceType: "direct" }], attributes: { source, target } };
}
function extraction(objects) { return { schemaVersion: "1.0", provider: "test", promptVersion: "test-v1", status: "ready", objects, warnings: [], stats: { objectCount: objects.length, evidenceReferenceCount: objects.length } }; }
function approvedReview(objects, approvedAt = "2026-08-26T15:00:00.000Z") {
  let review = createExtractionReview(objects);
  for (const item of objects) review = setReviewStatus(review, item.id, "confirmed");
  return approveExtraction(review, approvedAt);
}
function diagnostics(approvedAt = "2026-08-26T15:00:00.000Z", generatedAt = "2026-08-26T15:05:00.000Z") {
  return { schemaVersion: "1.0", engineVersion: "deterministic-v1", assessmentId: "a1", generatedAt, extractionApprovedAt: approvedAt, findings: [], stats: { activeObjectCount: 3, ruleCount: 7, findingCount: 0, evidenceReferenceCount: 0 } };
}
async function fixture() {
  const objects = [object("int_a", "Gateway", "CRM", "seg_1"), object("int_b", "Gateway", "Billing", "seg_2"), object("int_c", "Gateway", "Identity", "seg_3")];
  const ext = extraction(objects); const review = approvedReview(objects); const diag = diagnostics();
  const candidates = await generateAiFindingCandidates({ assessmentId: "a1", extraction: ext, review }, diag, new LocalDemoAiFindingProvider(), "2026-08-26T15:06:00.000Z");
  return { objects, ext, review, diag, candidates };
}

test("promotion creates a pending normal finding while preserving evidence and AI provenance", async () => {
  const { ext, review, diag, candidates } = await fixture();
  const result = promoteAiCandidate("a1", diag, candidates, ext, review, candidates.candidates[0].id, "2026-08-26T15:10:00.000Z");
  assert.equal(result.diagnostics.findings.length, 1);
  assert.equal(result.diagnostics.findings[0].reviewStatus, "pending");
  assert.match(result.diagnostics.findings[0].ruleId, /^ai-promoted:/);
  assert.deepEqual(result.diagnostics.findings[0].evidence, candidates.candidates[0].evidence);
  assert.equal(result.promotion.sourceDiagnosticGeneratedAt, diag.generatedAt);
  assert.equal(result.promotion.promotedFindingId, result.diagnostics.findings[0].id);
});

test("promotion is blocked after deterministic diagnostics are re-run", async () => {
  const { ext, review, diag, candidates } = await fixture();
  const rerun = { ...diag, generatedAt: "2026-08-26T15:07:00.000Z" };
  assert.throws(() => promoteAiCandidate("a1", rerun, candidates, ext, review, candidates.candidates[0].id), /stale because deterministic diagnostics were re-run/);
});

test("promotion is blocked after the extraction approval changes", async () => {
  const { ext, diag, candidates, objects } = await fixture();
  const changedReview = approvedReview(objects, "2026-08-26T16:00:00.000Z");
  assert.throws(() => promoteAiCandidate("a1", diag, candidates, ext, changedReview, candidates.candidates[0].id), /extraction approval changed/);
});

test("promoted candidate cannot affect downstream output until normal review accepts it", async () => {
  const { ext, review, diag, candidates } = await fixture();
  const promoted = promoteAiCandidate("a1", diag, candidates, ext, review, candidates.candidates[0].id, "2026-08-26T15:10:00.000Z").diagnostics;
  let findingReview = createFindingReview(promoted);
  assert.throws(() => acceptedFindings(promoted, findingReview), /must be completed/);
  findingReview = setFindingDecision(findingReview, promoted.findings[0].id, "accepted");
  findingReview = completeFindingReview(findingReview, "2026-08-26T15:12:00.000Z");
  const accepted = acceptedFindings(promoted, findingReview);
  assert.equal(accepted.length, 1);
  assert.match(accepted[0].ruleId, /^ai-promoted:/);
});
