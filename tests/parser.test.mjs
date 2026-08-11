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

test("CSV parser handles quoted commas and preserves row ranges", () => {
  const result = parseArtifact("systems.csv", bytes('system,owner,notes\nCRM,Sales,"primary, customer system"\nBilling,Finance,ledger\n'));
  assert.equal(result.parser, "csv");
  assert.equal(result.sourceSegments.length, 1);
  assert.equal(result.sourceSegments[0].locator.value, "rows 2-3");
  assert.match(result.sourceSegments[0].content, /"primary, customer system"/);
});

test("SQL DDL parser segments CREATE statements with line provenance", () => {
  const result = parseArtifact("schema.sql", bytes("CREATE TABLE customer (\n id uuid primary key\n);\n\nCREATE VIEW active_customer AS\nSELECT * FROM customer;\n"));
  assert.equal(result.parser, "sql-ddl");
  assert.equal(result.sourceSegments.length, 2);
  assert.equal(result.sourceSegments[0].title, "customer");
  assert.equal(result.sourceSegments[1].locator.startLine, 5);
});

test("PDF direct-text adapter emits page-addressable evidence and warns about coverage", () => {
  const value = "%PDF-1.7\n1 0 obj << /Type /Page >> endobj\nstream\nBT (CRM owns customer ID) Tj ET\nendstream\n%%EOF";
  const result = parseArtifact("architecture.pdf", bytes(value));
  assert.equal(result.parser, "pdf-text");
  assert.equal(result.sourceSegments[0].locator.value, "page 1");
  assert.match(result.sourceSegments[0].content, /CRM owns customer ID/);
  assert.ok(result.warnings.some((warning) => /production PDF adapter/.test(warning)));
});

test("PDF parser fails closed for unsupported compressed/scanned content", () => {
  assert.throws(() => parseArtifact("architecture.pdf", bytes("%PDF-1.7\n1 0 obj << /Type /Page >> endobj\n%%EOF")), /production PDF adapter/);
});

test("unsupported formats fail closed instead of pretending to parse", () => {
  assert.throws(() => parseArtifact("architecture.docx", bytes("not supported")), /No deterministic parser/);
});
