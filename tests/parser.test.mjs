import test from "node:test";
import assert from "node:assert/strict";
import { parseArtifact } from "../lib/artifact-parser.ts";

const bytes = (value) => new TextEncoder().encode(value);

test("Markdown parsing preserves heading-based line ranges", () => {
  const result = parseArtifact("architecture.md", bytes("# Context\nCRM owns customer IDs.\n\n## Integration\nCRM publishes customer.updated."));
  assert.equal(result.parser, "markdown");
  assert.equal(result.sourceSegments.length, 2);
  assert.deepEqual(result.sourceSegments.map((segment) => segment.locator.value), ["lines 1-3", "lines 4-5"]);
  assert.equal(result.sourceSegments[0].title, "Context");
});

test("JSON parsing emits stable JSON Pointer locators", () => {
  const result = parseArtifact("inventory.json", bytes(JSON.stringify({ systems: [{ name: "CRM" }], owner: "Platform" })));
  assert.equal(result.parser, "json");
  assert.deepEqual(result.sourceSegments.map((segment) => segment.locator.value), ["/systems", "/owner"]);
  assert.match(result.sourceSegments[0].contentSha256, /^[a-f0-9]{64}$/);
});

test("OpenAPI JSON and YAML are classified without model inference", () => {
  const json = parseArtifact("openapi.json", bytes('{"openapi":"3.1.0","paths":{"/customers":{}}}'));
  const yaml = parseArtifact("openapi.yaml", bytes("openapi: 3.1.0\ninfo:\n  title: Customer API\npaths:\n  /customers:\n    get: {}\n"));
  assert.equal(json.parser, "openapi-json");
  assert.equal(yaml.parser, "openapi-yaml");
  assert.ok(yaml.sourceSegments.some((segment) => segment.title === "paths"));
});

test("YAML top-level sections preserve line coordinates", () => {
  const result = parseArtifact("systems.yaml", bytes("systems:\n  - name: CRM\nowners:\n  CRM: platform\n"));
  assert.equal(result.parser, "yaml");
  assert.equal(result.sourceSegments[0].locator.startLine, 1);
  assert.equal(result.sourceSegments[1].locator.startLine, 3);
});

test("unsupported formats fail closed instead of pretending to parse", () => {
  assert.throws(() => parseArtifact("architecture.pdf", bytes("%PDF")), /No deterministic parser/);
});
