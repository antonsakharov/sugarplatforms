import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicExtractionProvider, validateExtractionEnvelope } from "../lib/extraction.ts";
import { runDeterministicDiagnostics } from "../lib/diagnostics.ts";
import { approveExtraction, createExtractionReview, setReviewStatus } from "../lib/extraction-review.ts";

function artifact(content) {
  return {
    artifactId: "artifact_sync", artifactName: "integration-flow.md", parser: "markdown",
    warnings: [], stats: { segmentCount: 1, characterCount: content.length },
    sourceSegments: [{
      id: "artifact_sync:segment:0", artifactId: "artifact_sync", artifactName: "integration-flow.md", ordinal: 0, kind: "markdown",
      locator: { type: "line-range", value: "lines 1-8", startLine: 1, endLine: 8 }, content, contentSha256: "sync-test"
    }]
  };
}

function approvedReview(objects, rejectedIds = []) {
  let review = createExtractionReview(objects);
  for (const item of objects) review = setReviewStatus(review, item.id, rejectedIds.includes(item.id) ? "rejected" : "confirmed");
  return approveExtraction(review, "2026-08-24T15:00:00.000Z");
}

async function extract(content) {
  const provider = new DeterministicExtractionProvider();
  return validateExtractionEnvelope(await provider.extract({ assessmentId: "asm_sync", parsedArtifacts: [artifact(content)] }));
}

test("explicit synchronous call language is retained on integration objects", async () => {
  const output = await extract([
    "Gateway synchronously calls Profile API.",
    "Profile API calls Identity Service synchronously.",
    "Identity Service makes a synchronous call to Consent Service.",
    "Consent Service -> Audit Service [sync]"
  ].join("\n"));
  const integrations = output.objects.filter((item) => item.kind === "integration" && item.attributes.syncClaim === "explicit");
  assert.equal(integrations.length, 4);
  assert.ok(integrations.every((item) => item.attributes.interactionMode === "synchronous"));
  assert.ok(integrations.every((item) => item.evidence.length > 0));
});

test("ordinary topology and asynchronous wording are not labeled synchronous", async () => {
  const output = await extract("Gateway -> Profile API\nProfile API calls Event Bus asynchronously.");
  const integrations = output.objects.filter((item) => item.kind === "integration");
  assert.ok(integrations.some((item) => item.attributes.source === "Gateway" && item.attributes.target === "Profile API"));
  assert.equal(integrations.some((item) => item.attributes.syncClaim === "explicit"), false);
});

test("three consecutive explicit synchronous hops produce one evidence-backed finding", async () => {
  const extraction = await extract([
    "Gateway synchronously calls Profile API.",
    "Profile API calls Identity Service synchronously.",
    "Identity Service makes a synchronous call to Consent Service."
  ].join("\n"));
  const review = approvedReview(extraction.objects);
  const result = runDeterministicDiagnostics({ assessmentId: "asm_sync", extraction, review }, "2026-08-24T15:10:00.000Z");
  const finding = result.findings.find((item) => item.ruleId === "long-synchronous-chain");
  assert.ok(finding);
  assert.equal(finding.category, "integration_risk");
  assert.equal(finding.severity, "high");
  assert.equal(finding.affectedObjectIds.length, 3);
  assert.ok(finding.evidence.length > 0);
  assert.match(finding.description, /Gateway.*Profile API.*Identity Service.*Consent Service/);
});

test("two synchronous hops are below the long-chain threshold", async () => {
  const extraction = await extract("Gateway synchronously calls Profile API.\nProfile API calls Identity Service synchronously.");
  const result = runDeterministicDiagnostics({ assessmentId: "asm_sync", extraction, review: approvedReview(extraction.objects) });
  assert.equal(result.findings.some((item) => item.ruleId === "long-synchronous-chain"), false);
});

test("a non-synchronous middle edge breaks the chain", async () => {
  const extraction = await extract([
    "Gateway synchronously calls Profile API.",
    "Profile API -> Identity Service",
    "Identity Service calls Consent Service synchronously.",
    "Consent Service calls Preferences Service synchronously."
  ].join("\n"));
  const result = runDeterministicDiagnostics({ assessmentId: "asm_sync", extraction, review: approvedReview(extraction.objects) });
  assert.equal(result.findings.some((item) => item.ruleId === "long-synchronous-chain"), false);
});

test("a rejected synchronous edge cannot participate in a diagnostic chain", async () => {
  const extraction = await extract([
    "Gateway synchronously calls Profile API.",
    "Profile API calls Identity Service synchronously.",
    "Identity Service calls Consent Service synchronously."
  ].join("\n"));
  const middle = extraction.objects.find((item) => item.kind === "integration" && item.attributes.source === "Profile API");
  assert.ok(middle);
  const result = runDeterministicDiagnostics({ assessmentId: "asm_sync", extraction, review: approvedReview(extraction.objects, [middle.id]) });
  assert.equal(result.findings.some((item) => item.ruleId === "long-synchronous-chain"), false);
});
