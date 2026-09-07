import test from "node:test";
import assert from "node:assert/strict";
import { createFindingReview, completeFindingReview, editFinding, setFindingDecision } from "../lib/finding-review.ts";
import { diagnosticFingerprint, SqliteFindingReviewRepository, StaleFindingReviewError } from "../lib/finding-review-persistence.ts";

const scope = { organizationId: "org_a", workspaceId: "ws_a" };
const otherScope = { organizationId: "org_b", workspaceId: "ws_b" };
const finding = {
  id: "finding_a", ruleId: "rule-a", ruleVersion: "1.0.0", category: "entity_identity", severity: "medium", confidence: 0.9,
  factStatus: "derived", title: "Fragmented identifier", description: "Two identifiers are documented.", businessImpact: "Reconciliation cost.",
  technicalImpact: "Mapping logic is duplicated.", affectedObjectIds: ["obj_a"], evidence: [{ segmentId: "seg_a", artifactId: "art_a", artifactName: "architecture.md", locator: "lines 1-2", evidenceType: "direct" }],
  recommendation: "Choose an authoritative identifier.", validationQuestions: ["Which ID is authoritative?"], reviewStatus: "pending"
};
const diagnostics = {
  schemaVersion: "1.0", engineVersion: "deterministic-v1", assessmentId: "assessment_a", generatedAt: "2026-09-07T15:00:00.000Z", extractionApprovedAt: "2026-09-07T14:00:00.000Z",
  findings: [finding], stats: { activeObjectCount: 1, ruleCount: 1, findingCount: 1, evidenceReferenceCount: 1 }
};

test("persists completed finding review and materialized accepted findings", () => {
  const repository = new SqliteFindingReviewRepository(":memory:");
  let review = createFindingReview(diagnostics);
  review = editFinding(review, "finding_a", { title: "Reviewed fragmented identifier" }, "Confirmed with architecture owner");
  review = setFindingDecision(review, "finding_a", "accepted");
  review = completeFindingReview(review, "2026-09-07T15:30:00.000Z");
  const saved = repository.save(scope, "assessment_a", diagnostics, review, diagnosticFingerprint(diagnostics));
  assert.equal(saved.acceptedFindings.length, 1);
  assert.equal(saved.acceptedFindings[0].title, "Reviewed fragmented identifier");
  assert.equal(saved.acceptedFindings[0].reviewStatus, "accepted");
});

test("tenant scope prevents cross-workspace finding review reads", () => {
  const repository = new SqliteFindingReviewRepository(":memory:");
  repository.save(scope, "assessment_a", diagnostics, createFindingReview(diagnostics), diagnosticFingerprint(diagnostics));
  assert.equal(repository.find(otherScope, "assessment_a"), null);
});

test("changed diagnostics mark persisted finding review stale", () => {
  const repository = new SqliteFindingReviewRepository(":memory:");
  repository.save(scope, "assessment_a", diagnostics, createFindingReview(diagnostics), diagnosticFingerprint(diagnostics));
  const changed = { ...diagnostics, generatedAt: "2026-09-07T16:00:00.000Z" };
  assert.equal(repository.find(scope, "assessment_a", changed)?.stale, true);
});

test("save fails closed for stale diagnostic fingerprint", () => {
  const repository = new SqliteFindingReviewRepository(":memory:");
  assert.throws(() => repository.save(scope, "assessment_a", diagnostics, createFindingReview(diagnostics), "0".repeat(64)), StaleFindingReviewError);
});

test("review cannot introduce or omit diagnostic findings", () => {
  const repository = new SqliteFindingReviewRepository(":memory:");
  const review = createFindingReview(diagnostics);
  review.findings.push({ findingId: "forged", status: "accepted", edits: {} });
  assert.throws(() => repository.save(scope, "assessment_a", diagnostics, review, diagnosticFingerprint(diagnostics)), /exactly one decision/);
});

test("completed review cannot contain pending decisions", () => {
  const repository = new SqliteFindingReviewRepository(":memory:");
  const review = { ...createFindingReview(diagnostics), reviewedAt: "2026-09-07T15:30:00.000Z" };
  assert.throws(() => repository.save(scope, "assessment_a", diagnostics, review, diagnosticFingerprint(diagnostics)), /pending decisions/);
});
