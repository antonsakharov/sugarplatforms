"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { AssessmentDraft } from "@/lib/assessment";
import type { DiagnosticEnvelope } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";
import type { FindingReview } from "@/lib/finding-review";
import { projectEntityIdGraph, type EntityIdGraph } from "@/lib/entity-id-graph";

export default function EntityIdMapPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [graph, setGraph] = useState<EntityIdGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const nodeById = useMemo(() => new Map((graph?.nodes ?? []).map((node) => [node.id, node])), [graph]);

  if (error) return <><div className="eyebrow">Assessment · Entity/ID map</div><h1>Map unavailable</h1><div className="panel"><p>{error}</p><a className="button" href={`/assessment/${assessmentId}/diagnostics`}>Review findings</a></div></>;
  if (!graph) return <p className="lede">Building reviewed entity/ID map…</p>;

  return <>
    <div className="eyebrow">Assessment · Entity/ID map</div>
    <h1>{graph.primaryEntity} identity map</h1>
    <p className="lede">This projection uses only confirmed extraction objects and accepted findings from a completed, non-stale review. Derived scope relationships are labeled separately from direct integration evidence.</p>
    <div className="metrics diagnostic-metrics"><article><strong>{graph.stats.nodeCount}</strong><span>nodes</span></article><article><strong>{graph.stats.edgeCount}</strong><span>relationships</span></article><article><strong>{graph.stats.acceptedFindingCount}</strong><span>accepted findings</span></article><article><strong>{graph.stats.evidenceReferenceCount}</strong><span>evidence links</span></article></div>
    {graph.warnings.map((warning) => <div className="upload-warning" key={warning}>{warning}</div>)}
    <div className="panel">
      <h2>Focused graph</h2>
      <div className="workspace-grid">{graph.nodes.map((node) => <article className={`card ${node.kind === "primary_entity" ? "current-step" : ""}`} key={node.id}><span className="status-pill">{node.kind.replace("_", " ")}</span><h3>{node.label}</h3><p>{node.acceptedFindingIds.length} accepted finding{node.acceptedFindingIds.length === 1 ? "" : "s"} · {node.evidence.length} direct evidence reference{node.evidence.length === 1 ? "" : "s"}</p>{node.evidence.length > 0 && <details><summary>Evidence</summary>{node.evidence.map((evidence) => <div className="artifact-row" key={`${node.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>{evidence.segmentId}</small></div>)}</details>}</article>)}</div>
      <h2>Relationships</h2>
      <div className="artifact-list">{graph.edges.map((edge) => <article className="inspection-row" key={edge.id}><div><span className="status-pill">{edge.factStatus}</span><strong>{nodeById.get(edge.source)?.label ?? edge.source} → {nodeById.get(edge.target)?.label ?? edge.target}</strong><p>{edge.label}</p></div><details><summary>Evidence ({edge.evidence.length})</summary>{edge.evidence.map((evidence) => <div className="artifact-row" key={`${edge.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>{evidence.segmentId}</small></div>)}</details></article>)}</div>
      <div className="form-actions"><a className="button" href={`/assessment/${assessmentId}/maturity`}>View maturity & recommendations</a><a className="button button-secondary" href={`/assessment/${assessmentId}/diagnostics`}>Back to findings</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div>
    </div>
  </>;
}
