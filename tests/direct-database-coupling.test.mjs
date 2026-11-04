import test from "node:test";
import assert from "node:assert/strict";
import { runDeterministicDiagnostics } from "../lib/diagnostics.ts";
import { approveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";

function object(id, kind, name, attributes = {}, segmentId = `seg_${id}`) {
  return {
    id, kind, name, normalizedName: name.toLowerCase(), confidence: 0.95, extractionMethod: "test",
    evidence: [{ segmentId, artifactId: "art_1", artifactName: "architecture.md", locator: "lines 1-2", evidenceType: "direct" }],
    attributes
  };
}
function envelope(objects) {
  return { schemaVersion: "1.0", provider: "test", promptVersion: "test-v1", status: "ready", objects, warnings: [], stats: { objectCount: objects.length, evidenceReferenceCount: objects.length } };
}
function approvedReview(objects) {
  let review = createExtractionReview(objects);
  for (const item of objects) review = setReviewStatus(review, item.id, "confirmed");
  return approveExtraction(review, "2026-08-23T15:00:00.000Z");
}

test("direct database coupling emits an evidence-backed integration-risk finding", () => {
  const objects = [
    object("int_orders_db", "integration", "Order Service → Customer DB", { source: "Order Service", target: "Customer DB" }),
    object("owner_a", "owner", "Platform")
  ];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  const finding = result.findings.find((item) => item.ruleId === "direct-database-coupling");
  assert.ok(finding);
  assert.equal(finding.category, "integration_risk");
  assert.equal(finding.severity, "high");
  assert.equal(finding.evidence.length, 1);
  assert.deepEqual(finding.affectedObjectIds, ["int_orders_db"]);
  assert.match(finding.title, /Customer DB/);
});

test("ordinary service-to-service integration does not produce a database-coupling finding", () => {
  const objects = [
    object("int_orders_api", "integration", "Order Service → Customer API", { source: "Order Service", target: "Customer API" }),
    object("owner_a", "owner", "Platform")
  ];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  assert.equal(result.findings.some((item) => item.ruleId === "direct-database-coupling"), false);
});

test("SQL-derived entities alone do not imply direct database coupling", () => {
  const objects = [
    object("entity_customer", "entity", "customer_profile", { sourceType: "sql-ddl" }),
    object("owner_a", "owner", "Platform")
  ];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  assert.equal(result.findings.some((item) => item.ruleId === "direct-database-coupling"), false);
});
