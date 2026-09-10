import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadServerAcceptedFindingState, loadServerDiagnosticState, validateCompletedFindingState } from "../lib/client-reviewed-state.ts";

const assessmentId = "assessment-reviewed";
const approvedAt = "2026-09-08T10:00:00.000Z";
const generatedAt = "2026-09-08T10:05:00.000Z";
const evidence = [{ segmentId: "segment-1", artifactId: "artifact-1", artifactName: "architecture.md", locator: "line 1", evidenceType: "direct", confidence: 1 }];
const finding = {
  id: "finding-1", ruleId: "rule", ruleVersion: "1", category: "ownership_gap", severity: "medium", confidence: 0.9,
  factStatus: "derived", title: "Finding", description: "Description", businessImpact: "Business", technicalImpact: "Technical",
  affectedObjectIds: ["system-1"], evidence, recommendation: "Recommendation", validationQuestions: ["Validate"], reviewStatus: "pending"
};
const diagnostics = {
  schemaVersion: "1.0", assessmentId, generatedAt, extractionApprovedAt: approvedAt, findings: [finding],
  stats: { findingCount: 1, ruleCount: 1, activeObjectCount: 1, evidenceReferenceCount: 1 }, warnings: []
};
const review = {
  schemaVersion: "1.0", assessmentId, diagnosticGeneratedAt: generatedAt,
  findings: [{ findingId: "finding-1", status: "accepted" }], reviewedAt: "2026-09-08T10:06:00.000Z"
};
const assessment = {
  id: assessmentId, companyName: "Example", assessmentTitle: "Platform diagnostic", industry: "Technology",
  focusArea: "entity-identifier-fragmentation", primaryEntity: "Customer", knownSystems: [], businessConcern: "Fragmentation",
  reportAudience: "CTO", acknowledgedLimits: true, createdAt: "2026-09-08T09:00:00.000Z"
};
const extractionReview = { schemaVersion: "1.0", assessmentId, findings: [], objects: [], approved: true, approvedAt };
const extraction = { schemaVersion: "1.0", assessmentId, provider: "local", promptVersion: "1", status: "complete", objects: [], warnings: [], stats: { objectCount: 0, evidenceReferenceCount: 0 }, generatedAt: "2026-09-08T09:30:00.000Z" };
const processing = {
  assessmentId,
  artifacts: [{ storageArtifactId: "stored-1", parserArtifactId: "artifact-1", originalName: "architecture.md", mediaType: "text/markdown", size: 1024, checksumSha256: "a".repeat(64), parser: "text", warnings: [], createdAt: "2026-09-08T09:10:00.000Z" }],
  parsedArtifacts: [], extraction, persistedAt: "2026-09-08T09:31:00.000Z"
};

function state(overrides = {}) {
  return {
    assessment, processing, artifacts: [{ name: "architecture.md", type: "text/markdown", size: 1024, status: "validated" }],
    extraction, extractionReview, diagnostics, findingReview: review, acceptedFindings: [{ ...finding, reviewStatus: "accepted" }],
    findingReviewUpdatedAt: "2026-09-08T10:06:00.000Z", ...overrides
  };
}

function response(payload, ok = true, status = 200) {
  return { ok, status, async json() { return payload; } };
}

test("completed reviewed state accepts only matching materialized accepted findings", () => {
  assert.equal(validateCompletedFindingState(state()).acceptedFindings.length, 1);
  assert.throws(() => validateCompletedFindingState(state({ acceptedFindings: [] })), /materialization does not match/);
  assert.throws(() => validateCompletedFindingState(state({ findingReview: { ...review, reviewedAt: undefined } })), /Complete finding review/);
});

test("server loader hydrates all authoritative boundaries before writing compatibility cache", async () => {
  const payloads = new Map([
    [`/api/assessments/${assessmentId}`, response({ assessment })],
    [`/api/assessments/${assessmentId}/processing`, response(processing)],
    [`/api/assessments/${assessmentId}/extraction-review`, response({ assessmentId, extraction, review: extractionReview, stalePersistedReview: false })],
    [`/api/assessments/${assessmentId}/finding-review`, response({ assessmentId, persisted: { diagnostics, review, acceptedFindings: [{ ...finding, reviewStatus: "accepted" }], stale: false, updatedAt: "2026-09-08T10:06:00.000Z" } })]
  ]);
  const writes = new Map();
  const fetcher = async (url) => payloads.get(url);
  const storage = { setItem(key, value) { writes.set(key, value); }, removeItem(key) { writes.delete(key); } };
  const loaded = await loadServerAcceptedFindingState(assessmentId, { fetcher, storage });
  assert.equal(loaded.assessment.id, assessmentId);
  assert.equal(loaded.artifacts[0].status, "validated");
  assert.equal(loaded.acceptedFindings.length, 1);
  assert.ok(writes.has(`sugar:finding-review:${assessmentId}`));
});

test("server loader fails closed on stale finding state and does not populate browser cache", async () => {
  const writes = new Map();
  const fetcher = async (url) => {
    if (url.endsWith("/finding-review")) return response({ assessmentId, persisted: { diagnostics, review, acceptedFindings: [], stale: true, updatedAt: generatedAt } });
    if (url.endsWith("/extraction-review")) return response({ assessmentId, extraction, review: extractionReview, stalePersistedReview: false });
    if (url.endsWith("/processing")) return response(processing);
    return response({ assessment });
  };
  const storage = { setItem(key, value) { writes.set(key, value); }, removeItem(key) { writes.delete(key); } };
  await assert.rejects(() => loadServerDiagnosticState(assessmentId, { fetcher, storage }), /stale/);
  assert.equal(writes.size, 0);
});

test("downstream pages no longer read reviewed diagnostics or finding review from localStorage", async () => {
  for (const path of [
    "app/assessment/[id]/maturity/page.tsx",
    "app/assessment/[id]/map/page.tsx",
    "app/assessment/[id]/report/page.tsx",
    "app/assessment/[id]/ai-findings/page.tsx"
  ]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /localStorage\.getItem\(`sugar:diagnostics:/, path);
    assert.doesNotMatch(source, /localStorage\.getItem\(`sugar:finding-review:/, path);
    assert.match(source, /loadServer(?:AcceptedFinding|Diagnostic)State/, path);
  }
});
