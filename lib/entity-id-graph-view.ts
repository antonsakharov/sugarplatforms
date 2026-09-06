import type { EntityIdGraph, GraphEdge, GraphEdgeKind, GraphNode, GraphNodeKind } from "@/lib/entity-id-graph";

export type GraphFactStatus = "direct" | "derived";
export type EntityIdGraphFilter = {
  query: string;
  nodeKinds: GraphNodeKind[];
  edgeKinds: GraphEdgeKind[];
  factStatuses: GraphFactStatus[];
  hideIsolated: boolean;
};

export type FilteredEntityIdGraph = {
  graph: EntityIdGraph;
  filter: EntityIdGraphFilter;
  stats: {
    visibleNodeCount: number;
    visibleEdgeCount: number;
    hiddenNodeCount: number;
    hiddenEdgeCount: number;
  };
};

export const ALL_GRAPH_NODE_KINDS: GraphNodeKind[] = ["primary_entity", "entity", "identifier", "system"];
export const ALL_GRAPH_EDGE_KINDS: GraphEdgeKind[] = ["focused_identifier", "integration", "creates_entity", "consumes_entity", "authority_for", "accepted_finding"];
export const ALL_GRAPH_FACT_STATUSES: GraphFactStatus[] = ["direct", "derived"];

export const DEFAULT_ENTITY_ID_GRAPH_FILTER: EntityIdGraphFilter = {
  query: "",
  nodeKinds: [...ALL_GRAPH_NODE_KINDS],
  edgeKinds: [...ALL_GRAPH_EDGE_KINDS],
  factStatuses: [...ALL_GRAPH_FACT_STATUSES],
  hideIsolated: false
};

function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function filterSet<T extends string>(values: T[], allowed: readonly T[]) {
  const permitted = new Set(allowed);
  return new Set(values.filter((value) => permitted.has(value)));
}

function graphWithSubset(graph: EntityIdGraph, nodes: GraphNode[], edges: GraphEdge[]): EntityIdGraph {
  const acceptedFindingIds = new Set(nodes.flatMap((node) => node.acceptedFindingIds));
  return {
    ...graph,
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      evidenceReferenceCount: edges.reduce((total, edge) => total + edge.evidence.length, 0),
      acceptedFindingCount: acceptedFindingIds.size,
      directRelationshipCount: edges.filter((edge) => edge.kind === "creates_entity" || edge.kind === "consumes_entity" || edge.kind === "authority_for").length
    }
  };
}

export function filterEntityIdGraph(graph: EntityIdGraph, requested: Partial<EntityIdGraphFilter> = {}): FilteredEntityIdGraph {
  const filter: EntityIdGraphFilter = {
    query: typeof requested.query === "string" ? requested.query.slice(0, 120) : "",
    nodeKinds: requested.nodeKinds ?? [...ALL_GRAPH_NODE_KINDS],
    edgeKinds: requested.edgeKinds ?? [...ALL_GRAPH_EDGE_KINDS],
    factStatuses: requested.factStatuses ?? [...ALL_GRAPH_FACT_STATUSES],
    hideIsolated: requested.hideIsolated ?? false
  };
  const nodeKinds = filterSet(filter.nodeKinds, ALL_GRAPH_NODE_KINDS);
  const edgeKinds = filterSet(filter.edgeKinds, ALL_GRAPH_EDGE_KINDS);
  const factStatuses = filterSet(filter.factStatuses, ALL_GRAPH_FACT_STATUSES);
  const query = normalized(filter.query);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const kindEligibleNodes = graph.nodes.filter((node) => nodeKinds.has(node.kind));
  const kindEligibleNodeIds = new Set(kindEligibleNodes.map((node) => node.id));
  const eligibleEdges = graph.edges.filter((edge) => edgeKinds.has(edge.kind) && factStatuses.has(edge.factStatus) && kindEligibleNodeIds.has(edge.source) && kindEligibleNodeIds.has(edge.target));

  let visibleNodeIds = new Set(kindEligibleNodeIds);
  let visibleEdges = eligibleEdges;
  if (query) {
    const matchingNodeIds = new Set(kindEligibleNodes.filter((node) => normalized(node.label).includes(query) || node.acceptedFindingIds.some((id) => normalized(id).includes(query))).map((node) => node.id));
    const matchingEdges = eligibleEdges.filter((edge) => {
      const sourceLabel = nodesById.get(edge.source)?.label ?? "";
      const targetLabel = nodesById.get(edge.target)?.label ?? "";
      return normalized(edge.label).includes(query) || normalized(sourceLabel).includes(query) || normalized(targetLabel).includes(query) || normalized(edge.kind).includes(query);
    });
    for (const edge of matchingEdges) {
      matchingNodeIds.add(edge.source);
      matchingNodeIds.add(edge.target);
    }
    visibleNodeIds = matchingNodeIds;
    visibleEdges = eligibleEdges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target) && (matchingEdges.includes(edge) || matchingNodeIds.has(edge.source) || matchingNodeIds.has(edge.target)));
  }

  if (filter.hideIsolated) {
    const connected = new Set(visibleEdges.flatMap((edge) => [edge.source, edge.target]));
    visibleNodeIds = new Set([...visibleNodeIds].filter((id) => connected.has(id)));
    visibleEdges = visibleEdges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  }

  const visibleNodes = graph.nodes.filter((node) => visibleNodeIds.has(node.id));
  const subset = graphWithSubset(graph, visibleNodes, visibleEdges);
  return {
    graph: subset,
    filter: { ...filter, nodeKinds: [...nodeKinds], edgeKinds: [...edgeKinds], factStatuses: [...factStatuses] },
    stats: {
      visibleNodeCount: visibleNodes.length,
      visibleEdgeCount: visibleEdges.length,
      hiddenNodeCount: Math.max(0, graph.nodes.length - visibleNodes.length),
      hiddenEdgeCount: Math.max(0, graph.edges.length - visibleEdges.length)
    }
  };
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[character] ?? character));
}

function nodePosition(node: GraphNode, indexWithinKind: number) {
  const xByKind: Record<GraphNodeKind, number> = { primary_entity: 70, entity: 330, identifier: 600, system: 870 };
  return { x: xByKind[node.kind], y: 150 + indexWithinKind * 100 };
}

export function renderEntityIdGraphSvg(graph: EntityIdGraph): string {
  const indices = new Map<GraphNodeKind, number>();
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of graph.nodes) {
    const index = indices.get(node.kind) ?? 0;
    positions.set(node.id, nodePosition(node, index));
    indices.set(node.kind, index + 1);
  }
  const tallestColumn = Math.max(1, ...indices.values());
  const width = 1200;
  const height = Math.max(420, 250 + tallestColumn * 100);
  const edgeLines = graph.edges.flatMap((edge) => {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (!source || !target) return [];
    return [`<line x1="${source.x + 190}" y1="${source.y + 27}" x2="${target.x}" y2="${target.y + 27}" stroke="${edge.factStatus === "direct" ? "#334155" : "#94a3b8"}" stroke-width="2" ${edge.factStatus === "derived" ? 'stroke-dasharray="6 5"' : ""} marker-end="url(#arrow)"/>`];
  }).join("");
  const nodeBlocks = graph.nodes.map((node) => {
    const position = positions.get(node.id)!;
    const label = escapeXml(node.label.length > 28 ? `${node.label.slice(0, 27)}…` : node.label);
    const kind = escapeXml(node.kind.replaceAll("_", " "));
    return `<g><rect x="${position.x}" y="${position.y}" width="190" height="54" rx="9" fill="#ffffff" stroke="#64748b"/><text x="${position.x + 12}" y="${position.y + 21}" font-family="Arial,sans-serif" font-size="11" fill="#64748b">${kind}</text><text x="${position.x + 12}" y="${position.y + 40}" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#0f172a">${label}</text></g>`;
  }).join("");
  const title = escapeXml(`${graph.primaryEntity} entity / ID map`);
  const meta = escapeXml(`${graph.nodes.length} nodes · ${graph.edges.length} relationships · generated from diagnostics ${graph.generatedFromDiagnosticAt}`);
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#64748b"/></marker></defs><rect width="100%" height="100%" fill="#f8fafc"/><text x="70" y="55" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#0f172a">${title}</text><text x="70" y="82" font-family="Arial,sans-serif" font-size="12" fill="#475569">${meta}</text><text x="70" y="110" font-family="Arial,sans-serif" font-size="11" fill="#64748b">Solid edges are direct evidence; dashed edges are derived projections.</text>${edgeLines}${nodeBlocks}</svg>`;
}

export function createEntityIdGraphExport(graph: EntityIdGraph, filter: EntityIdGraphFilter) {
  return {
    schemaVersion: "1.0" as const,
    exportedAt: new Date().toISOString(),
    filter,
    graph
  };
}
