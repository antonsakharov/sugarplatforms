"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadServerAcceptedFindingState } from "@/lib/client-reviewed-state";
import { calculateFocusedMaturity, generatePrioritizedRecommendations, type FocusedMaturitySummary, type RecommendationSet } from "@/lib/maturity-recommendations";

export default function MaturityRecommendationsPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [maturity, setMaturity] = useState<FocusedMaturitySummary | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadServerAcceptedFindingState(assessmentId).then((state) => {
      if (!active) return;
      const nextMaturity = calculateFocusedMaturity(state.diagnostics, state.findingReview);
      const nextRecommendations = generatePrioritizedRecommendations(state.diagnostics, state.findingReview);
      setMaturity(nextMaturity);
      setRecommendations(nextRecommendations);
      localStorage.setItem(`sugar:maturity:${assessmentId}`, JSON.stringify(nextMaturity));
      localStorage.setItem(`sugar:recommendations:${assessmentId}`, JSON.stringify(nextRecommendations));
      setError(null);
    }).catch((caught) => {
      if (!active) return;
      setMaturity(null);
      setRecommendations(null);
      setError(caught instanceof Error ? caught.message : "Maturity and recommendations could not be generated.");
    });
    return () => { active = false; };
  }, [assessmentId]);

  if (error) return <><div className="eyebrow">Assessment · Maturity & recommendations</div><h1>Summary unavailable</h1><div className="panel"><p>{error}</p><a className="button" href={`/assessment/${assessmentId}/diagnostics`}>Review findings</a></div></>;
  if (!maturity || !recommendations) return <p className="lede">Loading server-reviewed findings and generating maturity recommendations…</p>;

  return <>
    <div className="eyebrow">Assessment · Maturity & recommendations</div>
    <h1>Focused maturity summary</h1>
    <p className="lede">This output is generated only from accepted findings in the current authenticated, completed server review. Browser state is a compatibility cache, not an authority for the result.</p>
    <div className="metrics diagnostic-metrics">
      <article><strong>{maturity.score === null ? "—" : `${maturity.score}/5`}</strong><span>{maturity.band ? `${maturity.band} signal` : "not scored"}</span></article>
      <article><strong>{maturity.acceptedFindingCount}</strong><span>accepted findings</span></article>
      <article><strong>{maturity.dimensions.length}</strong><span>scored dimensions</span></article>
      <article><strong>{recommendations.stats.recommendationCount}</strong><span>recommendations</span></article>
    </div>
    <div className="panel">
      <h2>Scoring rationale</h2>
      <ul>{maturity.rationale.map((item) => <li key={item}>{item}</li>)}</ul>
      {maturity.dimensions.length > 0 && <div className="workspace-grid">{maturity.dimensions.map((dimension) => <article className="card" key={dimension.category}><span className="status-pill">{dimension.category.replace("_", " ")}</span><h3>{dimension.score}/5</h3><p>{dimension.acceptedFindingCount} accepted finding{dimension.acceptedFindingCount === 1 ? "" : "s"} · {dimension.riskPoints} risk point{dimension.riskPoints === 1 ? "" : "s"}</p></article>)}</div>}
      <h3>Limits</h3><ul>{maturity.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
    <div className="panel">
      <h2>Prioritized recommendations</h2>
      {recommendations.recommendations.length === 0 ? <p>No recommendations are emitted because no reviewed findings were accepted. This is not evidence of a risk-free architecture.</p> : <div className="artifact-list">{recommendations.recommendations.map((item) => <article className="inspection-row" key={item.id}><div><span className="status-pill">Priority {item.priority} · {item.severity}</span><h3>{item.title}</h3><p><strong>Action:</strong> {item.action}</p><p><strong>Why now:</strong> {item.whyNow}</p><small>{Math.round(item.confidence * 100)}% finding confidence · {item.findingIds.length} source finding · {item.evidence.length} evidence reference{item.evidence.length === 1 ? "" : "s"}</small></div><details><summary>Traceability</summary><p>Finding: <code>{item.findingIds.join(", ")}</code></p>{item.evidence.map((evidence) => <div className="artifact-row" key={`${item.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>{evidence.segmentId}</small></div>)}</details></article>)}</div>}
      <h3>Recommendation limits</h3><ul>{recommendations.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="form-actions"><a className="button" href={`/assessment/${assessmentId}/report`}>Generate executive report</a><a className="button button-secondary" href={`/assessment/${assessmentId}/map`}>Back to Entity/ID map</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div>
    </div>
  </>;
}
