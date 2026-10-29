import test from "node:test";
import assert from "node:assert/strict";
import { projectEntityIdGraph } from "../lib/entity-id-graph.ts";
import { approveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";
import { runDeterministicDiagnostics } from "../lib/diagnostics.ts";
import { completeFindingReview, createFindingReview, setFindingDecision } from "../lib/finding-review.ts";

function object(id, kind, name, segmentId, attributes = {}) {
  return { id, kind, name, normalizedName: name.toLowerCase(), confidence: 0.95, extractionMethod: "test", evidence: [{ segmentId, artifactId: "art_1", artifactName: "architecture.md", locator: `lines ${segmentId.slice(-1)}-${segmentId.slice(-1)}`, evidenceType: "direct" }], attributes };
}
function envelope(objects) { return { schemaVersion: "1.0", provider: "test", promptVersion: "test-v1", status: "ready", objects, warnings: [], stats: { objectCount: objects.length, evidenceReferenceCount: objects.length } }; }
function approvedReview(objects) {
  let review = createExtractionReview(objects);
  for (const item of objects) review = setReviewStatus(review, item.id, "confirmed");
  return approveExtraction(review, "2026-08-16T14:00:00.000Z");
}
function fixture() {
  const objects = [
    object("sys_orders", "system", "Orders", "seg_1"),
    object("sys_crm", "system", "CRM", "seg_2"),
    object("id_customer", "identifier", "customer_id", "seg_3"),
    object("id_crm", "identifier", "crmCustomerId", "seg_4"),
    object("int_orders_crm", "integration", "Orders → CRM", "seg_5", { source: "Orders", target: "CRM" })
  ];
  const extraction = envelope(objects);
  const extractionReview = approvedReview(objects);
  const diagnostics = runDeterministicDiagnostics({ assessmentId: "a1", extraction, review: extractionReview }, "2026-08-16T14:10:00.000Z");
  let findingReview = createFindingReview(diagnostics);
  for (const finding of diagnostics.findings) findingReview = setFindingDecision(findingReview, finding.id, "accepted");
  findingReview = completeFindingReview(findingReview, "2026-08-16T14:20:00.000Z");
  return { extraction, extractionReview, diagnostics, findingReview };
}

test("entity/ID projection requires completed finding review", () => {
  const { extraction, extractionReview, diagnostics } = fixture();
  const pending = createFindingReview(diagnostics);
  assert.throws(() => projectEntityIdGraph({ assessmentId: "a1", primaryEntity: "Customer", extraction, extractionReview, diagnostics, findingReview: pending }), /completed before downstream outputs/);
});

test("entity/ID projection includes focused identifiers and direct system integration evidence", () => {
  const { extraction, extractionReview, diagnostics, findingReview } = fixture();
  const graph = projectEntityIdGraph({ assessmentId: "a1", primaryEntity: "Customer", extraction, extractionReview, diagnostics, findingReview });
  assert.equal(graph.primaryEntity, "Customer");
  assert.equal(graph.nodes.filter((node) => node.kind === "identifier").length, 2);
  assert.equal(graph.edges.filter((edge) => edge.kind === "focused_identifier").length, 2);
  const integration = graph.edges.find((edge) => edge.kind === "integration");
  assert.ok(integration);
  assert.equal(integration.factStatus, "direct");
  assert.equal(integration.evidence[0].segmentId, "seg_5");
});

test("rejected findings do not decorate downstream graph", () => {
  const { extraction, extractionReview, diagnostics } = fixture();
  let findingReview = createFindingReview(diagnostics);
  for (const finding of diagnostics.findings) findingReview = setFindingDecision(findingReview, finding.id, "rejected");
  findingReview = completeFindingReview(findingReview, "2026-08-16T14:25:00.000Z");
  const graph = projectEntityIdGraph({ assessmentId: "a1", primaryEntity: "Customer", extraction, extractionReview, diagnostics, findingReview });
  assert.equal(graph.stats.acceptedFindingCount, 0);
  assert.equal(graph.edges.filter((edge) => edge.kind === "accepted_finding").length, 0);
  assert.ok(graph.nodes.every((node) => node.acceptedFindingIds.length === 0));
});

test("stale finding review blocks entity/ID projection", () => {
  const { extraction, extractionReview, diagnostics, findingReview } = fixture();
  const rerun = { ...diagnostics, generatedAt: "2026-08-16T14:30:00.000Z" };
  assert.throws(() => projectEntityIdGraph({ assessmentId: "a1", primaryEntity: "Customer", extraction, extractionReview, diagnostics: rerun, findingReview }), /stale/);
});
