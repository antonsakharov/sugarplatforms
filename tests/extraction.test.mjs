import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicExtractionProvider, validateExtractionEnvelope } from "../lib/extraction.ts";

function artifact(content, kind = "markdown") {
  return {
    artifactId: "artifact_demo", artifactName: "architecture.md", parser: kind,
    warnings: [], stats: { segmentCount: 1, characterCount: content.length },
    sourceSegments: [{
      id: "artifact_demo:segment:0", artifactId: "artifact_demo", artifactName: "architecture.md", ordinal: 0, kind,
      locator: { type: "line-range", value: "lines 1-5", startLine: 1, endLine: 5 }, content, contentSha256: "abc"
    }]
  };
}

test("deterministic extractor emits evidence-linked architecture objects only", async () => {
  const provider = new DeterministicExtractionProvider();
  const output = await provider.extract({ assessmentId: "asm_demo", parsedArtifacts: [artifact("System: Customer API\nEntity: Customer\nIdentifier: customer_id\nOwner: Identity Platform\nCRM -> Customer API")] });
  const validated = validateExtractionEnvelope(output);
  assert.ok(validated.objects.some((item) => item.kind === "system" && item.name === "Customer API"));
  assert.ok(validated.objects.some((item) => item.kind === "entity" && item.name === "Customer"));
  assert.ok(validated.objects.some((item) => item.kind === "identifier" && item.name === "customer_id"));
  assert.ok(validated.objects.some((item) => item.kind === "owner" && item.name === "Identity Platform"));
  assert.ok(validated.objects.some((item) => item.kind === "integration" && item.attributes.target === "Customer API"));
  assert.ok(validated.objects.every((item) => item.evidence.length > 0 && item.evidence[0].segmentId === "artifact_demo:segment:0"));
});

test("explicit authority statements enrich system objects without inventing a new object kind", async () => {
  const provider = new DeterministicExtractionProvider();
  const output = validateExtractionEnvelope(await provider.extract({ assessmentId: "asm_demo", parsedArtifacts: [artifact("CRM is the system of record for Customer\nSource of truth for Customer: Billing Hub")] }));
  const crm = output.objects.find((item) => item.kind === "system" && item.name === "CRM");
  const billing = output.objects.find((item) => item.kind === "system" && item.name === "Billing Hub");
  assert.equal(crm?.attributes.authorityFor, "Customer");
  assert.equal(crm?.attributes.authorityClaim, "explicit");
  assert.equal(billing?.attributes.authorityFor, "Customer");
  assert.ok(crm?.evidence.length);
  assert.ok(billing?.evidence.length);
});

test("duplicate direct claims reconcile by normalized kind/name while retaining evidence", async () => {
  const provider = new DeterministicExtractionProvider();
  const first = artifact("System: Customer API");
  const second = artifact("System: customer api");
  second.artifactId = "artifact_two"; second.artifactName = "inventory.md";
  second.sourceSegments[0] = { ...second.sourceSegments[0], id: "artifact_two:segment:0", artifactId: "artifact_two", artifactName: "inventory.md" };
  const output = validateExtractionEnvelope(await provider.extract({ assessmentId: "asm_demo", parsedArtifacts: [first, second] }));
  const systems = output.objects.filter((item) => item.kind === "system");
  assert.equal(systems.length, 1);
  assert.equal(systems[0].evidence.length, 2);
});

test("SQL DDL yields a directly supported entity and empty evidence never validates", async () => {
  const provider = new DeterministicExtractionProvider();
  const sql = artifact("CREATE TABLE customer_profile (customer_id uuid primary key);", "sql-ddl");
  sql.sourceSegments[0].title = "customer_profile";
  const output = validateExtractionEnvelope(await provider.extract({ assessmentId: "asm_demo", parsedArtifacts: [sql] }));
  assert.ok(output.objects.some((item) => item.kind === "entity" && item.name === "customer_profile"));
  const invalid = structuredClone(output);
  invalid.objects[0].evidence = [];
  assert.throws(() => validateExtractionEnvelope(invalid), /has no evidence/);
});

test("object limit is bounded and surfaced as a warning", async () => {
  const provider = new DeterministicExtractionProvider();
  const output = validateExtractionEnvelope(await provider.extract({ assessmentId: "asm_demo", maxObjects: 1, parsedArtifacts: [artifact("System: Aaa\nSystem: Bbb\nEntity: Customer")] }));
  assert.equal(output.objects.length, 1);
  assert.match(output.warnings.join(" "), /object limit 1 reached/);
});
