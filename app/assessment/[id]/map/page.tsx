"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { AssessmentDraft } from "@/lib/assessment";
import type { DiagnosticEnvelope } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";
import type { FindingReview } from "@/lib/finding-review";
import { projectEntityIdGraph, type EntityIdGraph, type GraphEdgeKind, type GraphNodeKind } from "@/lib/entity-id-graph";
import { ALL_GRAPH_EDGE_KINDS, ALL_GRAPH_FACT_STATUSES, ALL_GRAPH_NODE_KINDS, createEntityIdGraphExport, DEFAULT_ENTITY_ID_GRAPH_FILTER, filterEntityIdGraph, renderEntityIdGraphSvg, type GraphFactStatus } from "@/lib/entity-id-graph-view";

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function EntityIdMapPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [graph, setGraph] = useState<EntityIdGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [nodeKinds, setNodeKinds] = useState<GraphNodeKind[]>([...DEFAULT_ENTITY_ID_GRAPH_FILTER.nodeKinds]);
  const [edgeKinds, setEdgeKinds] = useState<GraphEdgeKind[]>([...DEFAULT_ENTITY_ID_GRAPH_FILTER.edgeKinds]);
  const [factStatuses, setFactStatuses] = useState<GraphFactStatus[]>([...DEFAULT_ENTITY_ID_GRAPH_FILTER.factStatuses]);
  const [hideIsolated, setHideIsolated] = useState(false);

  useEffect(() => {
    try {
      const assessmentRaw = localStorage.getItem(`sugar:assessment:${assessmentId}`);
      const extractionRaw = localStorage.getItem(`sugar:extraction:${assessmentId}`);
      const extractionReviewRaw = localStorage.getItem(`sugar:extraction-review:${assessmentId}`);
      const diagnosticsRaw = localStorage.getItem(`sugar:diagnostics:${assessmentId}`);
      const findingReviewRaw = localStorage.getItem(`sugar:finding-review:${assessmentId}`);
      if (!assessmentRaw || !extractionRaw || !extractionReviewRaw || !diagnosticsRaw || !findingReviewRaw) throw new Error("Complete extraction, diagnostics, and finding review before opening the entity/ID map.");
      const assessment = JSON.parse(assessmentRaw) as AssessmentDraft;
      const next = projectEntityIdGraph({
        assessmentId,
        primaryEntity: assessment.primaryEntity,
        extraction: JSON.parse(extractionRaw) as ExtractionEnvelope,
        extractionReview: JSON.parse(extractionReviewRaw) as ExtractionReview,
        diagnostics: JSON.parse(diagnosticsRaw) as DiagnosticEnvelope,
        findingReview: JSON.parse(findingReviewRaw) as FindingReview
      });
      setGraph(next);
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Entity/ID map could not be generated."); }
  }, [assessmentId]);

  const filtered = useMemo(() => graph ? filterEntityIdGraph(graph, { query, nodeKinds, edgeKinds, factStatuses, hideIsolated }) : null, [graph, query, nodeKinds, edgeKinds, factStatuses, hideIsolated]);
  const visibleGraph = filtered?.graph ?? null;
  const nodeById = useMemo(() => new Map((visibleGraph?.nodes ?? []).map((node) => [node.id, node])), [visibleGraph]);

  function resetFilters() {
    setQuery("");
    setNodeKinds([...ALL_GRAPH_NODE_KINDS]);
    setEdgeKinds([...ALL_GRAPH_EDGE_KINDS]);
    setFactStatuses([...ALL_GRAPH_FACT_STATUSES]);
    setHideIsolated(false);
  }

  function downloadJson() {
    if (!visibleGraph || !filtered) return;
    const payload = createEntityIdGraphExport(visibleGraph, filtered.filter);
    downloadText(`sugar-entity-id-map-${assessmentId}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function downloadSvg() {
    if (!visibleGraph) return;
    downloadText(`sugar-entity-id-map-${assessmentId}.svg`, renderEntityIdGraphSvg(visibleGraph), "image/svg+xml");
  }

  if (error) return <><div className="eyebrow">Assessment · Entity/ID map</div><h1>Map unavailable</h1><div className="panel"><p>{error}</p><a className="button" href={`/assessment/${assessmentId}/diagnostics`}>Review findings</a></div></>;
  if (!graph || !visibleGraph || !filtered) return <p className="lede">Building reviewed entity/ID map…</p>;

  return <>
    <div className="eyebrow">Assessment · Entity/ID map</div>
    <h1>{graph.primaryEntity} identity map</h1>
    <p className="lede">This projection uses only confirmed extraction objects and accepted findings from a completed, non-stale review. Filters change only the visible projection. Static exports contain the currently visible graph and preserve direct-versus-derived relationship status.</p>
    <div className="metrics diagnostic-metrics"><article><strong>{filtered.stats.visibleNodeCount}</strong><span>visible nodes</span></article><article><strong>{filtered.stats.visibleEdgeCount}</strong><span>visible relationships</span></article><article><strong>{filtered.stats.hiddenNodeCount}</strong><span>hidden nodes</span></article><article><strong>{filtered.stats.hiddenEdgeCount}</strong><span>hidden relationships</span></article><article><strong>{visibleGraph.stats.evidenceReferenceCount}</strong><span>visible evidence links</span></article></div>
    {graph.warnings.map((warning) => <div className="upload-warning" key={warning}>{warning}</div>)}
    <div className="panel">
      <h2>Graph filters</h2>
      <div className="form-grid">
        <label><span>Search visible graph</span><input value={query} maxLength={120} placeholder="System, entity, identifier, relationship…" onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="checkbox-row"><input type="checkbox" checked={hideIsolated} onChange={(event) => setHideIsolated(event.target.checked)} /><span>Hide nodes with no visible relationships</span></label>
      </div>
      <div className="workspace-grid">
        <article className="card"><h3>Node types</h3>{ALL_GRAPH_NODE_KINDS.map((kind) => <label className="checkbox-row" key={kind}><input type="checkbox" checked={nodeKinds.includes(kind)} onChange={() => setNodeKinds((current) => toggleValue(current, kind))} /><span>{kind.replaceAll("_", " ")}</span></label>)}</article>
        <article className="card"><h3>Relationship types</h3>{ALL_GRAPH_EDGE_KINDS.map((kind) => <label className="checkbox-row" key={kind}><input type="checkbox" checked={edgeKinds.includes(kind)} onChange={() => setEdgeKinds((current) => toggleValue(current, kind))} /><span>{kind.replaceAll("_", " ")}</span></label>)}</article>
        <article className="card"><h3>Evidence status</h3>{ALL_GRAPH_FACT_STATUSES.map((status) => <label className="checkbox-row" key={status}><input type="checkbox" checked={factStatuses.includes(status)} onChange={() => setFactStatuses((current) => toggleValue(current, status))} /><span>{status}</span></label>)}</article>
      </div>
      <div className="form-actions"><button className="button button-secondary" type="button" onClick={resetFilters}>Reset filters</button><button className="button button-secondary" type="button" onClick={downloadSvg}>Download visible SVG</button><button className="button button-secondary" type="button" onClick={downloadJson}>Download visible JSON</button></div>
    </div>
    <div className="panel">
      <h2>Focused graph</h2>
      {visibleGraph.nodes.length === 0 ? <div className="upload-warning">No nodes match the current filters. Reset or broaden the filters to restore the projection.</div> : <div className="workspace-grid">{visibleGraph.nodes.map((node) => <article className={`card ${node.kind === "primary_entity" ? "current-step" : ""}`} key={node.id}><span className="status-pill">{node.kind.replaceAll("_", " ")}</span><h3>{node.label}</h3><p>{node.acceptedFindingIds.length} accepted finding{node.acceptedFindingIds.length === 1 ? "" : "s"} · {node.evidence.length} direct evidence reference{node.evidence.length === 1 ? "" : "s"}</p>{node.evidence.length > 0 && <details><summary>Evidence</summary>{node.evidence.map((evidence) => <div className="artifact-row" key={`${node.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>{evidence.segmentId}</small></div>)}</details>}</article>)}</div>}
      <h2>Relationships</h2>
      {visibleGraph.edges.length === 0 ? <p>No relationships match the current filters.</p> : <div className="artifact-list">{visibleGraph.edges.map((edge) => <article className="inspection-row" key={edge.id}><div><span className="status-pill">{edge.factStatus}</span><span className="status-pill">{edge.kind.replaceAll("_", " ")}</span><strong>{nodeById.get(edge.source)?.label ?? edge.source} → {nodeById.get(edge.target)?.label ?? edge.target}</strong><p>{edge.label}</p></div><details><summary>Evidence ({edge.evidence.length})</summary>{edge.evidence.map((evidence) => <div className="artifact-row" key={`${edge.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>{evidence.segmentId}</small></div>)}</details></article>)}</div>}
      <p><strong>Export boundary:</strong> SVG and JSON exports reflect only the filtered reviewed projection. They do not contain raw uploaded artifact content and do not create new facts or relationships.</p>
      <div className="form-actions"><a className="button" href={`/assessment/${assessmentId}/maturity`}>View maturity & recommendations</a><a className="button button-secondary" href={`/assessment/${assessmentId}/diagnostics`}>Back to findings</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div>
    </div>
  </>;
}
