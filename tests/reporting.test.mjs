import test from "node:test";
import assert from "node:assert/strict";
import { generateExecutiveReport, generateNinetyDayActionPlan } from "../lib/reporting.ts";

const evidence = (id) => ({ segmentId: `seg_${id}`, artifactId: "a1", artifactName: "architecture.md", locator: `lines ${id}`, evidenceType: "direct" });
const recommendation = (priority, id) => ({ id: `recommendation_${id}`, priority, severity: priority === 1 ? "high" : "medium", confidence: 0.9, title: `Address ${id}`, action: `Fix ${id}`, whyNow: "Material risk.", findingIds: [id], affectedObjectIds: [`obj_${id}`], evidence: [evidence(id)] });
const recommendations = { schemaVersion: "1.0", assessmentId: "assessment-1", generatedFromDiagnosticAt: "2026-08-18T10:00:00.000Z", recommendations: [recommendation(1, "one"), recommendation(2, "two"), recommendation(3, "three")], stats: { acceptedFindingCount: 3, recommendationCount: 3, evidenceReferenceCount: 3 }, limitations: [] };
const finding = (id, severity = "medium") => ({ id, ruleId: `rule-${id}`, ruleVersion: "1.0.0", category: "entity_identity", severity, confidence: 0.9, factStatus: "derived", title: `Finding ${id}`, description: "Evidence-backed finding", businessImpact: "Business impact.", technicalImpact: "Technical impact.", affectedObjectIds: [`obj_${id}`], evidence: [evidence(id)], recommendation: `Fix ${id}`, validationQuestions: ["Validate?"], reviewStatus: "pending" });
const diagnostics = { schemaVersion: "1.0", engineVersion: "deterministic-v1", assessmentId: "assessment-1", generatedAt: "2026-08-18T10:00:00.000Z", extractionApprovedAt: "2026-08-18T09:00:00.000Z", findings: [finding("one", "high"), finding("two"), finding("three")], stats: { activeObjectCount: 3, ruleCount: 2, findingCount: 3, evidenceReferenceCount: 3 } };
const review = { schemaVersion: "1.0", assessmentId: "assessment-1", diagnosticGeneratedAt: diagnostics.generatedAt, reviewedAt: "2026-08-18T10:30:00.000Z", findings: diagnostics.findings.map((item) => ({ findingId: item.id, status: "accepted", edits: {} })) };
const maturity = { schemaVersion: "1.0", assessmentId: "assessment-1", generatedFromDiagnosticAt: diagnostics.generatedAt, status: "scored", score: 2.8, band: "developing", acceptedFindingCount: 3, totalFindingCount: 3, dimensions: [], rationale: [], limitations: [] };
const assessment = { id: "assessment-1", status: "draft", createdAt: "2026-08-18T08:00:00.000Z", companyName: "Acme", assessmentTitle: "Identity diagnostic", industry: "HealthTech", focusArea: "entity-identifier-fragmentation", primaryEntity: "Customer", knownSystems: "", businessConcern: "Reduce fragmented customer identifiers across systems.", reportAudience: "CTO", limitsAcknowledged: true };

test("90-day plan deterministically distributes recommendations across three phases", () => {
  const plan = generateNinetyDayActionPlan(recommendations);
  assert.equal(plan.phases.length, 3);
  assert.deepEqual(plan.phases.map((phase) => phase.items.length), [1, 1, 1]);
  assert.equal(plan.phases[0].items[0].findingIds[0], "one");
  assert.equal(plan.stats.evidenceReferenceCount, 3);
});

test("executive report includes only accepted reviewed findings and metadata-only artifacts", () => {
  const localReview = { ...review, findings: review.findings.map((item) => item.findingId === "three" ? { ...item, status: "rejected" } : item) };
  const localRecommendations = { ...recommendations, recommendations: recommendations.recommendations.slice(0, 2), stats: { acceptedFindingCount: 2, recommendationCount: 2, evidenceReferenceCount: 2 } };
  const report = generateExecutiveReport({ assessment, artifacts: [{ name: "architecture.md", type: "text/markdown", size: 100, status: "validated" }], diagnostics, review: localReview, maturity: { ...maturity, acceptedFindingCount: 2 }, recommendations: localRecommendations, actionPlan: generateNinetyDayActionPlan(localRecommendations), generatedAt: "2026-08-18T11:00:00.000Z" });
  assert.equal(report.topFindings.length, 2);
  assert.ok(!report.topFindings.some((item) => item.id === "three"));
  assert.deepEqual(Object.keys(report.scope.artifacts[0]).sort(), ["name", "size", "status", "type"]);
  assert.equal(report.reportVersion, "preview-v1");
});

test("report rejects stale downstream projections", () => {
  const plan = generateNinetyDayActionPlan(recommendations);
  assert.throws(() => generateExecutiveReport({ assessment, artifacts: [], diagnostics, review, maturity: { ...maturity, generatedFromDiagnosticAt: "old" }, recommendations, actionPlan: plan }), /stale/);
});

test("report rejects recommendations that reference non-accepted findings", () => {
  const plan = generateNinetyDayActionPlan(recommendations);
  const localReview = { ...review, findings: review.findings.map((item) => item.findingId === "one" ? { ...item, status: "rejected" } : item) };
  assert.throws(() => generateExecutiveReport({ assessment, artifacts: [], diagnostics, review: localReview, maturity, recommendations, actionPlan: plan }), /not accepted/);
});
