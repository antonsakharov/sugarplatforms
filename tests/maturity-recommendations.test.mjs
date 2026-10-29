import test from "node:test";
import assert from "node:assert/strict";
import { calculateFocusedMaturity, generatePrioritizedRecommendations } from "../lib/maturity-recommendations.ts";

function finding(id, severity, category = "entity_identity") {
  return { id, ruleId: `rule-${id}`, ruleVersion: "1.0.0", category, severity, confidence: 0.9, factStatus: "derived", title: `Finding ${id}`, description: "Evidence-backed finding", businessImpact: "Business impact.", technicalImpact: "Technical impact.", affectedObjectIds: [`obj_${id}`], evidence: [{ segmentId: `seg_${id}`, artifactId: "a1", artifactName: "architecture.md", locator: "lines 1-2", evidenceType: "direct" }], recommendation: `Fix ${id}`, validationQuestions: ["Validate?"], reviewStatus: "pending" };
}
function diagnostics(findings) { return { schemaVersion: "1.0", engineVersion: "deterministic-v1", assessmentId: "assessment-1", generatedAt: "2026-08-17T10:00:00.000Z", extractionApprovedAt: "2026-08-17T09:00:00.000Z", findings, stats: { activeObjectCount: 3, ruleCount: 2, findingCount: findings.length, evidenceReferenceCount: findings.length } }; }
function review(findings, decisions) { return { schemaVersion: "1.0", assessmentId: "assessment-1", diagnosticGeneratedAt: "2026-08-17T10:00:00.000Z", reviewedAt: "2026-08-17T10:30:00.000Z", findings: findings.map((item) => ({ findingId: item.id, status: decisions[item.id] ?? "rejected", edits: {} })) }; }

test("focused maturity is not scored when no findings are accepted", () => {
  const findings = [finding("one", "medium")];
  const result = calculateFocusedMaturity(diagnostics(findings), review(findings, { one: "rejected" }));
  assert.equal(result.status, "not_scored"); assert.equal(result.score, null); assert.equal(result.acceptedFindingCount, 0);
});

test("focused maturity uses accepted findings only and exposes rationale", () => {
  const findings = [finding("one", "high"), finding("two", "low", "ownership")];
  const result = calculateFocusedMaturity(diagnostics(findings), review(findings, { one: "accepted", two: "rejected" }));
  assert.equal(result.status, "scored"); assert.equal(result.acceptedFindingCount, 1); assert.equal(result.dimensions.length, 1); assert.equal(result.dimensions[0].category, "entity_identity"); assert.ok(result.score >= 1 && result.score <= 5); assert.ok(result.rationale.some((line) => line.includes("risk point")));
});

test("recommendations are deterministic and trace back to accepted findings and evidence", () => {
  const findings = [finding("low", "low"), finding("high", "high", "ownership"), finding("rejected", "high")];
  const result = generatePrioritizedRecommendations(diagnostics(findings), review(findings, { low: "accepted", high: "accepted", rejected: "rejected" }));
  assert.equal(result.recommendations.length, 2); assert.equal(result.recommendations[0].findingIds[0], "high"); assert.equal(result.recommendations[0].priority, 1); assert.equal(result.recommendations[0].evidence[0].segmentId, "seg_high"); assert.ok(!result.recommendations.some((item) => item.findingIds.includes("rejected")));
});

test("stale or incomplete finding review blocks downstream maturity", () => {
  const findings = [finding("one", "medium")]; const complete = review(findings, { one: "accepted" });
  assert.throws(() => calculateFocusedMaturity({ ...diagnostics(findings), generatedAt: "2026-08-17T11:00:00.000Z" }, complete), /stale/);
  assert.throws(() => generatePrioritizedRecommendations(diagnostics(findings), { ...complete, reviewedAt: undefined }), /completed/);
});
