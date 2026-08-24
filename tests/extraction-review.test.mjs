import test from "node:test";
import assert from "node:assert/strict";
import { approveExtraction, canApproveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";

const candidate = { id: "obj_a", kind: "system", name: "Service A", normalizedName: "service a", confidence: 1, extractionMethod: "demo", evidence: [{ segmentId: "seg_a", artifactId: "art_a", artifactName: "architecture.md", locator: "lines 1-2", evidenceType: "direct" }], attributes: {} };

test("approval is blocked until candidate is resolved", () => {
  let review = createExtractionReview([candidate]);
  assert.equal(canApproveExtraction(review), false);
  review = setReviewStatus(review, "obj_a", "confirmed");
  assert.equal(canApproveExtraction(review), true);
  assert.equal(approveExtraction(review, "2026-08-13T12:00:00.000Z").approved, true);
});
