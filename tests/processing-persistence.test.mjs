import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SqliteProcessingRepository } from "../lib/processing-repository.ts";

const scopeA = { organizationId: "org-a", workspaceId: "ws-a" };
const scopeB = { organizationId: "org-b", workspaceId: "ws-b" };

async function withRepository(run) {
  const root = await mkdtemp(join(tmpdir(), "sugar-processing-"));
  try { await run(new SqliteProcessingRepository(join(root, "state.sqlite"))); }
  finally { await rm(root, { recursive: true, force: true }); }
}

function snapshot(content = "CRM is the system of record for Customer") {
  return {
    assessmentId: "assessment-1",
    artifacts: [{
      storageArtifactId: "stored-1", parserArtifactId: "artifact-1", originalName: "architecture.md",
      mediaType: "text/markdown", size: content.length, checksumSha256: "a".repeat(64), parser: "markdown",
      warnings: [], createdAt: "2026-09-05T15:00:00.000Z"
    }],
    parsedArtifacts: [{
      artifactId: "artifact-1", artifactName: "architecture.md", parser: "markdown", warnings: [],
      stats: { segmentCount: 1, characterCount: content.length },
      sourceSegments: [{
        id: "artifact-1:segment:0", artifactId: "artifact-1", artifactName: "architecture.md", ordinal: 0,
        kind: "markdown", locator: { type: "line-range", value: "lines 1-1", startLine: 1, endLine: 1 },
        content, contentSha256: "b".repeat(64), title: "Architecture"
      }]
    }],
    extraction: {
      schemaVersion: "1.0", provider: "local-deterministic-v1", promptVersion: "platform-extraction-v1",
      status: "complete", objects: [], warnings: [], stats: { objectCount: 0, evidenceReferenceCount: 0 }
    },
    persistedAt: "2026-09-05T15:01:00.000Z"
  };
}

test("processing snapshot round-trips artifact metadata source evidence and extraction", async () => {
  await withRepository(async (repository) => {
    repository.replace(scopeA, snapshot());
    const restored = repository.find(scopeA, "assessment-1");
    assert.ok(restored);
    assert.equal(restored.artifacts[0].originalName, "architecture.md");
    assert.equal(restored.parsedArtifacts[0].sourceSegments[0].content, "CRM is the system of record for Customer");
    assert.equal(restored.extraction.provider, "local-deterministic-v1");
  });
});

test("processing snapshots are isolated by organization and workspace scope", async () => {
  await withRepository(async (repository) => {
    repository.replace(scopeA, snapshot());
    assert.equal(repository.find(scopeB, "assessment-1"), null);
    assert.equal(repository.find({ organizationId: "org-a", workspaceId: "ws-b" }, "assessment-1"), null);
  });
});

test("replace is idempotent and replaces source segments transactionally", async () => {
  await withRepository(async (repository) => {
    repository.replace(scopeA, snapshot("first architecture claim"));
    repository.replace(scopeA, snapshot("replacement architecture claim"));
    const restored = repository.find(scopeA, "assessment-1");
    assert.equal(restored.parsedArtifacts[0].sourceSegments.length, 1);
    assert.equal(restored.parsedArtifacts[0].sourceSegments[0].content, "replacement architecture claim");
  });
});
