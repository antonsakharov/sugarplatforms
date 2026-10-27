import test from "node:test";
import assert from "node:assert/strict";
import { createExtractionReview, setReviewStatus, approveExtraction } from "../lib/extraction-review.ts";
import { extractionFingerprint, SqliteExtractionReviewRepository, StaleExtractionReviewError } from "../lib/review-persistence.ts";

const scope = { organizationId: "org_a", workspaceId: "ws_a" };
const otherScope = { organizationId: "org_b", workspaceId: "ws_b" };
const candidate = { id: "obj_a", kind: "system", name: "Service A", normalizedName: "service a", confidence: 1, extractionMethod: "demo", evidence: [{ segmentId: "seg_a", artifactId: "art_a", artifactName: "architecture.md", locator: "lines 1-2", evidenceType: "direct" }], attributes: {} };
const extraction = { schemaVersion: "1.0", provider: "local-deterministic", promptVersion: "local-extraction-v1", status: "ready", objects: [candidate], warnings: [], stats: { objectCount: 1, evidenceReferenceCount: 1 } };

test("persists approved extraction review under tenant scope", () => {
  const repository = new SqliteExtractionReviewRepository(":memory:");
  let review = createExtractionReview(extraction.objects);
  review = setReviewStatus(review, "obj_a", "confirmed");
  review = approveExtraction(review, "2026-09-06T12:00:00.000Z");
  const fingerprint = extractionFingerprint(extraction);
  const saved = repository.save(scope, "assessment_a", extraction, review, fingerprint);
  assert.equal(saved.review.approved, true);
  assert.equal(saved.stale, false);
  assert.equal(repository.find(scope, "assessment_a", extraction)?.review.approved, true);
});

test("tenant scope prevents cross-workspace review reads", () => {
  const repository = new SqliteExtractionReviewRepository(":memory:");
  const review = createExtractionReview(extraction.objects);
  repository.save(scope, "assessment_a", extraction, review, extractionFingerprint(extraction));
  assert.equal(repository.find(otherScope, "assessment_a", extraction), null);
});

test("changed extraction marks persisted review stale", () => {
  const repository = new SqliteExtractionReviewRepository(":memory:");
  const review = createExtractionReview(extraction.objects);
  repository.save(scope, "assessment_a", extraction, review, extractionFingerprint(extraction));
  const changed = { ...extraction, objects: [{ ...candidate, name: "Service B", normalizedName: "service b" }] };
  assert.equal(repository.find(scope, "assessment_a", changed)?.stale, true);
});

test("save fails closed when client extraction fingerprint is stale", () => {
  const repository = new SqliteExtractionReviewRepository(":memory:");
  const review = createExtractionReview(extraction.objects);
  assert.throws(() => repository.save(scope, "assessment_a", extraction, review, "0".repeat(64)), StaleExtractionReviewError);
});

test("review cannot introduce objects outside the current extraction", () => {
  const repository = new SqliteExtractionReviewRepository(":memory:");
  const review = createExtractionReview(extraction.objects);
  review.objects.push({ id: "forged", kind: "system", originalName: "Forged", displayName: "Forged", status: "confirmed" });
  assert.throws(() => repository.save(scope, "assessment_a", extraction, review, extractionFingerprint(extraction)), /exactly one decision record/);
});
