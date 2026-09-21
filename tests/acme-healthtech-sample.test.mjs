import test from "node:test";
import assert from "node:assert/strict";
import { ACME_HEALTHTECH_ARTIFACTS, ACME_HEALTHTECH_SAMPLE_ID, buildAcmeHealthTechSampleState } from "../lib/acme-healthtech-sample.ts";

test("Acme HealthTech sample stays inside MVP limits and completes the reviewed journey", async () => {
  const state = await buildAcmeHealthTechSampleState();
  assert.equal(state.assessment.id, ACME_HEALTHTECH_SAMPLE_ID);
  assert.equal(state.assessment.primaryEntity, "Patient");
  assert.ok(ACME_HEALTHTECH_ARTIFACTS.length <= 10);
  assert.ok(ACME_HEALTHTECH_ARTIFACTS.every((artifact) => Buffer.byteLength(artifact.content) <= 25 * 1024 * 1024));
  assert.equal(state.extractionReview.approved, true);
  assert.ok(state.extractionReview.objects.every((item) => item.status === "confirmed"));
  assert.ok(state.diagnostics.findings.length >= 5);
  assert.ok(state.diagnostics.findings.every((finding) => finding.evidence.length > 0 && finding.evidence.every((evidence) => evidence.evidenceType === "direct")));
  assert.ok(state.diagnostics.findings.some((finding) => finding.ruleId === "fragmented-identifiers"));
  assert.ok(state.diagnostics.findings.some((finding) => finding.ruleId === "competing-authority"));
  assert.ok(state.diagnostics.findings.some((finding) => finding.ruleId === "duplicate-matching-logic"));
  assert.ok(state.diagnostics.findings.some((finding) => finding.ruleId === "duplicate-platform-capability"));
  assert.ok(state.diagnostics.findings.some((finding) => finding.ruleId === "direct-database-coupling"));
  assert.ok(state.diagnostics.findings.some((finding) => finding.ruleId === "long-synchronous-chain"));
  assert.ok(state.findingReview.reviewedAt);
  assert.ok(state.findingReview.findings.every((finding) => finding.status === "accepted"));
});
