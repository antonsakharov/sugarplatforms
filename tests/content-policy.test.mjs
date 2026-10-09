import test from "node:test";
import assert from "node:assert/strict";
import { estimatePageCount, inspectArtifactBytes, scanContentRisks, sha256Hex } from "../lib/artifact-content-policy.ts";

const bytes = (value) => new TextEncoder().encode(value);

test("SHA-256 is deterministic for duplicate detection", () => {
  assert.equal(sha256Hex(bytes("same artifact")), sha256Hex(bytes("same artifact")));
  assert.notEqual(sha256Hex(bytes("same artifact")), sha256Hex(bytes("different artifact")));
});

test("text and PDF page estimates are bounded and measurable when possible", () => {
  assert.equal(estimatePageCount("inventory.csv", bytes("system,owner\ncrm,platform\n")).pages, 1);
  const pdf = bytes("%PDF-1.7 /Type /Page /Parent 1 0 R /Type /Page /Parent 1 0 R");
  assert.equal(estimatePageCount("architecture.pdf", pdf).pages, 2);
});

test("probable secrets and prohibited record signals generate warnings without echoing values", () => {
  const result = scanContentRisks("architecture.txt", bytes("api_key=supersecretvalue123 patient_email"));
  assert.ok(result.riskWarnings.some((warning) => warning.category === "probable-secret"));
  assert.ok(result.riskWarnings.some((warning) => warning.category === "prohibited-data"));
  assert.ok(result.riskWarnings.every((warning) => !warning.message.includes("supersecretvalue123")));
});

test("combined inspection returns checksum, page estimate, and scan coverage", () => {
  const result = inspectArtifactBytes("system.md", bytes("# Architecture\nNo secrets here."));
  assert.match(result.checksumSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.pageEstimate.pages, 1);
  assert.equal(result.scanCoverage, "full-text");
});
