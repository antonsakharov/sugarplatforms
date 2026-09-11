import test from "node:test";
import assert from "node:assert/strict";
import { filterEntityIdGraph, renderEntityIdGraphSvg } from "../lib/entity-id-graph-view.ts";

const evidence = (segmentId) => ({ segmentId, artifactId: "art_1", artifactName: "architecture.md", locator: "lines 1-2", evidenceType: "direct" });

function graph() {
  return {
    schemaVersion: "1.0",
    assessmentId: "a1",
    primaryEntity: "Customer",
    generatedFromDiagnosticAt: "2026-08-28T14:00:00.000Z",
    nodes: [
      { id: "focus_primary_entity", kind: "primary_entity", label: "Customer", evidence: [], acceptedFindingIds: [] },
      { id: "sys_crm", kind: "system", label: "CRM", sourceObjectId: "sys_crm", evidence: [evidence("seg_1")], acceptedFindingIds: ["finding_1"] },
      { id: "sys_billing", kind: "system", label: "Billing", sourceObjectId: "sys_billing", evidence: [evidence("seg_2")], acceptedFindingIds: [] },
      { id: "id_customer", kind: "identifier", label: "customer_id", sourceObjectId: "id_customer", evidence: [evidence("seg_3")], acceptedFindingIds: [] }
    ],
    edges: [
      { id: "edge_focus_id", kind: "focused_identifier", source: "focus_primary_entity", target: "id_customer", label: "identifier observed in focused assessment", evidence: [evidence("seg_3")], factStatus: "derived" },
      { id: "edge_authority", kind: "authority_for", source: "sys_crm", target: "focus_primary_entity", label: "authoritative system for entity", evidence: [evidence("seg_1")], factStatus: "direct" },
      { id: "edge_finding", kind: "accepted_finding", source: "focus_primary_entity", target: "sys_crm", label: "Fragmented customer identifiers", evidence: [evidence("seg_3")], factStatus: "derived" }
    ],
    stats: { nodeCount: 4, edgeCount: 3, evidenceReferenceCount: 3, acceptedFindingCount: 1, directRelationshipCount: 1 },
    warnings: []
  };
}

test("filters graph by relationship fact status without creating relationships", () => {
  const result = filterEntityIdGraph(graph(), { factStatuses: ["direct"] });
  assert.equal(result.graph.edges.length, 1);
  assert.equal(result.graph.edges[0].id, "edge_authority");
  assert.equal(result.stats.hiddenEdgeCount, 2);
  assert.equal(result.graph.stats.directRelationshipCount, 1);
});

test("node kind filters remove relationships whose endpoints are not visible", () => {
  const result = filterEntityIdGraph(graph(), { nodeKinds: ["primary_entity", "identifier"] });
  assert.deepEqual(result.graph.nodes.map((node) => node.id), ["focus_primary_entity", "id_customer"]);
  assert.deepEqual(result.graph.edges.map((edge) => edge.id), ["edge_focus_id"]);
});

test("search keeps matching relationship endpoints and hide-isolated removes disconnected nodes", () => {
  const result = filterEntityIdGraph(graph(), { query: "authoritative", hideIsolated: true });
  assert.deepEqual(new Set(result.graph.nodes.map((node) => node.id)), new Set(["focus_primary_entity", "sys_crm"]));
  assert.deepEqual(result.graph.edges.map((edge) => edge.id), ["edge_authority", "edge_finding"]);
  assert.ok(!result.graph.nodes.some((node) => node.id === "sys_billing"));
});

test("static SVG export escapes labels and preserves direct versus derived edge styling", () => {
  const unsafe = graph();
  unsafe.nodes[1] = { ...unsafe.nodes[1], label: "CRM <Core> & Partners" };
  const svg = renderEntityIdGraphSvg(unsafe);
  assert.match(svg, /^<\?xml version="1.0"/);
  assert.ok(svg.includes("CRM &lt;Core&gt; &amp; Partners"));
  assert.ok(svg.includes('stroke-dasharray="6 5"'));
  assert.ok(svg.includes("Solid edges are direct evidence; dashed edges are derived projections."));
  assert.ok(!svg.includes("CRM <Core>"));
});

test("empty filters fail closed to an empty visible projection", () => {
  const result = filterEntityIdGraph(graph(), { nodeKinds: [], edgeKinds: [], factStatuses: [] });
  assert.equal(result.graph.nodes.length, 0);
  assert.equal(result.graph.edges.length, 0);
  assert.equal(result.stats.hiddenNodeCount, 4);
  assert.equal(result.stats.hiddenEdgeCount, 3);
});
