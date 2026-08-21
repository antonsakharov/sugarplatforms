import test from "node:test";
import assert from "node:assert/strict";
import { runDeterministicDiagnostics } from "../lib/diagnostics.ts";
import { approveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";

function object(id, kind, name, segmentId = `seg_${id}`, attributes = {}) {
  return { id, kind, name, normalizedName: name.toLowerCase(), confidence: 0.95, extractionMethod: "test", evidence: [{ segmentId, artifactId: "art_1", artifactName: "architecture.md", locator: `lines ${segmentId.slice(-1)}-${segmentId.slice(-1)}`, evidenceType: "direct" }], attributes };
}
function envelope(objects) { return { schemaVersion: "1.0", provider: "test", promptVersion: "test-v1", status: "ready", objects, warnings: [], stats: { objectCount: objects.length, evidenceReferenceCount: objects.length } }; }
function approvedReview(objects, rejectedIds = []) {
  let review = createExtractionReview(objects);
  for (const item of objects) review = setReviewStatus(review, item.id, rejectedIds.includes(item.id) ? "rejected" : "confirmed");
  return approveExtraction(review, "2026-08-14T15:00:00.000Z");
}

test("diagnostics are blocked before extraction approval", () => {
  const objects = [object("sys_a", "system", "Orders")];
  assert.throws(() => runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: createExtractionReview(objects) }), /approved extraction review/);
});

test("fragmented identifier rule emits one evidence-backed derived finding", () => {
  const objects = [object("id_a", "identifier", "customer_id", "seg_1"), object("id_b", "identifier", "crmCustomerId", "seg_2"), object("owner_a", "owner", "Data Platform", "seg_3")];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) }, "2026-08-14T15:10:00.000Z");
  const finding = result.findings.find((item) => item.ruleId === "fragmented-identifiers");
  assert.ok(finding);
  assert.equal(finding.factStatus, "derived");
  assert.equal(finding.evidence.length, 2);
  assert.equal(finding.ruleVersion, "1.0.0");
});

test("competing authority rule emits only for explicit conflicting claims on the same entity", () => {
  const objects = [
    object("sys_crm", "system", "CRM", "seg_1", { authorityFor: "Customer", authorityClaim: "explicit" }),
    object("sys_bill", "system", "Billing Hub", "seg_2", { authorityFor: "Customer", authorityClaim: "explicit" }),
    object("sys_order", "system", "Order Platform", "seg_3", { authorityFor: "Order", authorityClaim: "explicit" }),
    object("owner_a", "owner", "Data Platform", "seg_4")
  ];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  const finding = result.findings.find((item) => item.ruleId === "competing-authority");
  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.equal(finding.evidence.length, 2);
  assert.deepEqual(new Set(finding.affectedObjectIds), new Set(["sys_crm", "sys_bill"]));
  assert.match(finding.title, /Customer/);
});

test("a single explicit authority claim does not produce a competing-authority finding", () => {
  const objects = [object("sys_crm", "system", "CRM", "seg_1", { authorityFor: "Customer", authorityClaim: "explicit" }), object("owner_a", "owner", "Data Platform", "seg_2")];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  assert.equal(result.findings.some((item) => item.ruleId === "competing-authority"), false);
});

test("duplicate matching logic rule emits only for explicit matching responsibilities on the same entity", () => {
  const objects = [
    object("sys_crm", "system", "CRM", "seg_1", { matchingFor: "Customer", matchingClaim: "explicit", matchingMethod: "email and phone" }),
    object("sys_bill", "system", "Billing Hub", "seg_2", { matchingFor: "Customer", matchingClaim: "explicit", matchingMethod: "email plus postal code" }),
    object("sys_order", "system", "Order Platform", "seg_3", { matchingFor: "Order", matchingClaim: "explicit" }),
    object("owner_a", "owner", "Data Platform", "seg_4")
  ];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  const finding = result.findings.find((item) => item.ruleId === "duplicate-matching-logic");
  assert.ok(finding);
  assert.equal(finding.severity, "high");
  assert.equal(finding.confidence, 0.92);
  assert.deepEqual(new Set(finding.affectedObjectIds), new Set(["sys_crm", "sys_bill"]));
  assert.equal(finding.evidence.length, 2);
  assert.match(finding.description, /email and phone/);
});

test("matching hints without an explicit matching claim do not produce a duplicate-matching finding", () => {
  const objects = [
    object("sys_crm", "system", "Customer Matcher", "seg_1", { matchingFor: "Customer" }),
    object("sys_bill", "system", "Billing Matcher", "seg_2", { matchingFor: "Customer" }),
    object("owner_a", "owner", "Data Platform", "seg_3")
  ];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  assert.equal(result.findings.some((item) => item.ruleId === "duplicate-matching-logic"), false);
});

test("ownership gap rule is cautious and evidence backed when no owner is confirmed", () => {
  const objects = [object("sys_a", "system", "Orders", "seg_1"), object("entity_a", "entity", "Customer", "seg_2")];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  const finding = result.findings.find((item) => item.ruleId === "ownership-gap");
  assert.ok(finding);
  assert.match(finding.description, /does not prove ownership is absent/i);
  assert.equal(finding.evidence.length, 2);
});

test("rejected objects do not participate in diagnostics", () => {
  const objects = [object("id_a", "identifier", "customer_id"), object("id_b", "identifier", "crmCustomerId"), object("owner_a", "owner", "Platform")];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects, ["id_b"]) });
  assert.equal(result.findings.some((item) => item.ruleId === "fragmented-identifiers"), false);
});

test("every emitted deterministic finding has evidence and rule provenance", () => {
  const objects = [object("sys_a", "system", "Orders"), object("id_a", "identifier", "customer_id"), object("id_b", "identifier", "crmCustomerId")];
  const result = runDeterministicDiagnostics({ assessmentId: "a1", extraction: envelope(objects), review: approvedReview(objects) });
  assert.ok(result.findings.length >= 2);
  for (const finding of result.findings) {
    assert.ok(finding.evidence.length > 0);
    assert.ok(finding.ruleId);
    assert.ok(finding.ruleVersion);
  }
});
