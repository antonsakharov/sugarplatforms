import test from "node:test";
import assert from "node:assert/strict";
import { augmentExtractionWithEntityRelationships } from "../lib/entity-relationship-claims.ts";
import { projectEntityIdGraph } from "../lib/entity-id-graph.ts";
import { approveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";
import { runDeterministicDiagnostics } from "../lib/diagnostics.ts";
import { completeFindingReview, createFindingReview, setFindingDecision } from "../lib/finding-review.ts";

function baseEnvelope(objects = []) {
  return { schemaVersion: "1.0", provider: "test", promptVersion: "test-v1", status: "ready", objects, warnings: [], stats: { objectCount: objects.length, evidenceReferenceCount: objects.reduce((total, item) => total + item.evidence.length, 0) } };
}
function parsed(content, segmentId = "seg_rel_1") {
  return [{ artifactId: "art_1", artifactName: "architecture.md", parser: "text", warnings: [], stats: { segmentCount: 1, characterCount: content.length }, sourceSegments: [{ id: segmentId, artifactId: "art_1", artifactName: "architecture.md", kind: "text", locator: { type: "line-range", value: "lines 1-1" }, content, hashSha256: "hash" }] }];
}
function approveAll(extraction) {
  let review = createExtractionReview(extraction.objects);
  for (const item of extraction.objects) review = setReviewStatus(review, item.id, "confirmed");
  return approveExtraction(review, "2026-08-27T14:00:00.000Z");
}
function completedFindingReview(extraction, extractionReview) {
  const diagnostics = runDeterministicDiagnostics({ assessmentId: "a1", extraction, review: extractionReview }, "2026-08-27T14:10:00.000Z");
  let review = createFindingReview(diagnostics);
  for (const finding of diagnostics.findings) review = setFindingDecision(review, finding.id, "rejected");
  review = completeFindingReview(review, "2026-08-27T14:20:00.000Z");
  return { diagnostics, review };
}

test("explicit creator consumer and authority statements become reviewable relationship claims", () => {
  const content = "CRM creates Customer records. Analytics consumes Customer records. CRM is the system of record for Customer.";
  const extraction = augmentExtractionWithEntityRelationships(baseEnvelope(), parsed(content));
  const crm = extraction.objects.find((item) => item.kind === "system" && item.name === "CRM");
  const analytics = extraction.objects.find((item) => item.kind === "system" && item.name === "Analytics");
  const customer = extraction.objects.find((item) => item.kind === "entity" && item.name === "Customer");
  assert.ok(crm);
  assert.ok(analytics);
  assert.ok(customer);
  assert.equal(crm.attributes["relationship:creates:customer"], "Customer");
  assert.equal(crm.attributes["relationship:authority:customer"], "Customer");
  assert.equal(analytics.attributes["relationship:consumes:customer"], "Customer");
  assert.equal(crm.attributes["relationshipEvidence:creates:customer"], "seg_rel_1");
});

test("ordinary topology does not fabricate creator consumer or authority semantics", () => {
  const extraction = augmentExtractionWithEntityRelationships(baseEnvelope(), parsed("CRM -> Analytics. Entity: Customer."));
  assert.ok(extraction.objects.every((item) => !Object.keys(item.attributes).some((key) => key.startsWith("relationship:"))));
});

test("entity map projects confirmed direct creator consumer and authority edges with exact evidence", () => {
  const content = "CRM creates Customer records. Analytics consumes Customer records. CRM is the system of record for Customer.";
  const extraction = augmentExtractionWithEntityRelationships(baseEnvelope(), parsed(content));
  const extractionReview = approveAll(extraction);
  const { diagnostics, review } = completedFindingReview(extraction, extractionReview);
  const graph = projectEntityIdGraph({ assessmentId: "a1", primaryEntity: "Customer", extraction, extractionReview, diagnostics, findingReview: review });
  assert.equal(graph.edges.filter((edge) => edge.kind === "creates_entity").length, 1);
  assert.equal(graph.edges.filter((edge) => edge.kind === "consumes_entity").length, 1);
  assert.equal(graph.edges.filter((edge) => edge.kind === "authority_for").length, 1);
  assert.equal(graph.stats.directRelationshipCount, 3);
  for (const edge of graph.edges.filter((item) => ["creates_entity", "consumes_entity", "authority_for"].includes(item.kind))) {
    assert.equal(edge.factStatus, "direct");
    assert.deepEqual(edge.evidence.map((item) => item.segmentId), ["seg_rel_1"]);
  }
});

test("unconfirmed relationship endpoints are not projected", () => {
  const extraction = augmentExtractionWithEntityRelationships(baseEnvelope(), parsed("CRM creates Customer records."));
  let extractionReview = createExtractionReview(extraction.objects);
  for (const item of extraction.objects) extractionReview = setReviewStatus(extractionReview, item.id, item.kind === "entity" ? "rejected" : "confirmed");
  extractionReview = approveExtraction(extractionReview, "2026-08-27T14:00:00.000Z");
  const { diagnostics, review } = completedFindingReview(extraction, extractionReview);
  const graph = projectEntityIdGraph({ assessmentId: "a1", primaryEntity: "Customer", extraction, extractionReview, diagnostics, findingReview: review });
  assert.equal(graph.edges.filter((edge) => edge.kind === "creates_entity").length, 0);
  assert.ok(graph.warnings.some((warning) => warning.includes("does not infer")));
});
