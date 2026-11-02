import test from "node:test";
import assert from "node:assert/strict";
import { runDeterministicDiagnostics } from "../lib/diagnostics.ts";
import { approveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";
import { acceptedFindings, completeFindingReview, createFindingReview, editFinding, setFindingDecision, validateDiagnosticEvidence } from "../lib/finding-review.ts";

function object(id, kind, name, segmentId = `seg_${id}`) {
  return { id, kind, name, normalizedName: name.toLowerCase(), confidence: 0.95, extractionMethod: "test", evidence: [{ segmentId, artifactId: "art_1", artifactName: "architecture.md", locator: "lines 1-2", evidenceType: "direct" }], attributes: {} };
}
function envelope(objects) { return { schemaVersion: "1.0", provider: "test", promptVersion: "test-v1", status: "ready", objects, warnings: [], stats: { objectCount: objects.length, evidenceReferenceCount: objects.length } }; }
function approvedReview(objects) {
  let review = createExtractionReview(objects);
  for (const item of objects) review = setReviewStatus(review, item.id, "confirmed");
  return approveExtraction(review, "2026-08-15T15:00:00.000Z");
}
function fixture() {
  const objects = [object("sys_a", "system", "Orders", "seg_1"), object("id_a", "identifier", "customer_id", "seg_2"), object("id_b", "identifier", "crmCustomerId", "seg_3")];
  const extraction = envelope(objects);
  const extractionReview = approvedReview(objects);
  const diagnostics = runDeterministicDiagnostics({ assessmentId: "a1", extraction, review: extractionReview }, "2026-08-15T15:10:00.000Z");
  return { extraction, extractionReview, diagnostics };
}

test("evidence coverage validates against the approved extraction boundary", () => {
  const { extraction, extractionReview, diagnostics } = fixture();
  assert.equal(validateDiagnosticEvidence(diagnostics, extraction, extractionReview), true);
});

test("orphaned finding evidence is rejected before review", () => {
  const { extraction, extractionReview, diagnostics } = fixture();
  const broken = structuredClone(diagnostics);
  broken.findings[0].evidence[0].segmentId = "seg_outside_boundary";
  assert.throws(() => validateDiagnosticEvidence(broken, extraction, extractionReview), /outside the approved extraction boundary/);
});

test("finding review requires an explicit decision for every finding", () => {
  const { diagnostics } = fixture();
  const review = createFindingReview(diagnostics);
  assert.throws(() => completeFindingReview(review), /Accept or reject every finding/);
});

test("editing a finding preserves source evidence and returns it to pending review", () => {
  const { diagnostics } = fixture();
  const source = diagnostics.findings[0];
  let review = createFindingReview(diagnostics);
  review = setFindingDecision(review, source.id, "accepted");
  review = editFinding(review, source.id, { title: "Reviewed identifier fragmentation", severity: "high" }, "Validated with architecture team");
  const item = review.findings.find((candidate) => candidate.findingId === source.id);
  assert.equal(item.status, "pending");
  assert.equal(item.edits.title, "Reviewed identifier fragmentation");
  assert.deepEqual(source.evidence, diagnostics.findings[0].evidence);
});

test("only accepted findings flow downstream after completed review", () => {
  const { diagnostics } = fixture();
  let review = createFindingReview(diagnostics);
  diagnostics.findings.forEach((finding, index) => { review = setFindingDecision(review, finding.id, index === 0 ? "accepted" : "rejected"); });
  review = completeFindingReview(review, "2026-08-15T15:20:00.000Z");
  const accepted = acceptedFindings(diagnostics, review);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].id, diagnostics.findings[0].id);
  assert.equal(accepted[0].reviewStatus, "accepted");
});

test("re-running diagnostics makes a completed finding review stale", () => {
  const { diagnostics } = fixture();
  let review = createFindingReview(diagnostics);
  diagnostics.findings.forEach((finding) => { review = setFindingDecision(review, finding.id, "accepted"); });
  review = completeFindingReview(review);
  const rerun = { ...diagnostics, generatedAt: "2026-08-15T15:30:00.000Z" };
  assert.throws(() => acceptedFindings(rerun, review), /stale/);
});
