"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AssessmentDraft } from "@/lib/assessment";
import type { DiagnosticEnvelope } from "@/lib/diagnostics";
import type { FindingReview } from "@/lib/finding-review";
import type { FocusedMaturitySummary, RecommendationSet } from "@/lib/maturity-recommendations";
import { generateExecutiveReport, generateNinetyDayActionPlan, type ArtifactReportItem, type ExecutiveReport } from "@/lib/reporting";

export default function ExecutiveReportPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const assessmentRaw = localStorage.getItem(`sugar:assessment:${assessmentId}`);
      const artifactsRaw = localStorage.getItem(`sugar:artifacts:${assessmentId}`);
      const diagnosticsRaw = localStorage.getItem(`sugar:diagnostics:${assessmentId}`);
      const reviewRaw = localStorage.getItem(`sugar:finding-review:${assessmentId}`);
      const maturityRaw = localStorage.getItem(`sugar:maturity:${assessmentId}`);
      const recommendationsRaw = localStorage.getItem(`sugar:recommendations:${assessmentId}`);
      if (!assessmentRaw || !diagnosticsRaw || !reviewRaw || !maturityRaw || !recommendationsRaw) throw new Error("Complete finding review and maturity/recommendations before generating the executive report preview.");
      const assessment = JSON.parse(assessmentRaw) as AssessmentDraft;
      const artifacts = artifactsRaw ? JSON.parse(artifactsRaw) as ArtifactReportItem[] : [];
      const diagnostics = JSON.parse(diagnosticsRaw) as DiagnosticEnvelope;
      const review = JSON.parse(reviewRaw) as FindingReview;
      const maturity = JSON.parse(maturityRaw) as FocusedMaturitySummary;
      const recommendations = JSON.parse(recommendationsRaw) as RecommendationSet;
      const actionPlan = generateNinetyDayActionPlan(recommendations);
      const next = generateExecutiveReport({ assessment, artifacts, diagnostics, review, maturity, recommendations, actionPlan });
      setReport(next);
      localStorage.setItem(`sugar:action-plan:${assessmentId}`, JSON.stringify(actionPlan));
      localStorage.setItem(`sugar:report:${assessmentId}`, JSON.stringify(next));
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Executive report preview could not be generated."); }
  }, [assessmentId]);

  if (error) return <><div className="eyebrow">Assessment · Executive report</div><h1>Report unavailable</h1><div className="panel"><p>{error}</p><a className="button" href={`/assessment/${assessmentId}/maturity`}>Open maturity & recommendations</a></div></>;
  if (!report) return <p className="lede">Generating accepted-findings-only executive report preview…</p>;

  return <>
    <div className="eyebrow">Assessment · Executive report preview</div>
    <h1>{report.title}</h1>
    <p className="lede">Audience: {report.audience} · Report {report.reportVersion}</p>
    <div className="panel"><h2>Executive summary</h2><p>{report.executiveSummary}</p></div>
    <div className="panel"><h2>Scope</h2><p><strong>{report.scope.companyName}</strong> · {report.scope.industry}</p><p>Focus: {report.scope.focusArea.replaceAll("-", " ")} · Primary entity: <strong>{report.scope.primaryEntity}</strong></p><p>{report.scope.businessConcern}</p><h3>Artifact inventory</h3>{report.scope.artifacts.length === 0 ? <p>No artifact metadata is available.</p> : <ul>{report.scope.artifacts.map((artifact) => <li key={`${artifact.name}:${artifact.size}`}>{artifact.name} · {artifact.status} · {(artifact.size / 1024 / 1024).toFixed(2)} MB</li>)}</ul>}</div>
    <div className="metrics diagnostic-metrics"><article><strong>{report.maturity.score === null ? "—" : `${report.maturity.score}/5`}</strong><span>focused maturity</span></article><article><strong>{report.topFindings.length}</strong><span>accepted top findings</span></article><article><strong>{report.recommendations.stats.recommendationCount}</strong><span>recommendations</span></article><article><strong>{report.actionPlan.stats.plannedItemCount}</strong><span>90-day actions</span></article></div>
    <div className="panel"><h2>Focused maturity</h2><p><strong>{report.maturity.score === null ? "Not scored" : `${report.maturity.score}/5 · ${report.maturity.band}`}</strong></p><ul>{report.maturity.rationale.map((item) => <li key={item}>{item}</li>)}</ul></div>
    <div className="panel"><h2>Prioritized recommendations</h2>{report.recommendations.recommendations.length === 0 ? <p>No recommendations are included because no reviewed findings were accepted.</p> : <div className="artifact-list">{report.recommendations.recommendations.map((item) => <article className="inspection-row" key={item.id}><span className="status-pill">Priority {item.priority} · {item.severity}</span><h3>{item.title}</h3><p>{item.action}</p><p><strong>Why now:</strong> {item.whyNow}</p></article>)}</div>}</div>
    <div className="panel"><h2>Top accepted findings</h2>{report.topFindings.length === 0 ? <p>No accepted findings are included. This is inconclusive under the current limited rule coverage.</p> : <div className="artifact-list">{report.topFindings.map((finding) => <article className="inspection-row" key={finding.id}><span className="status-pill">{finding.severity} · {finding.category.replace("_", " ")}</span><h3>{finding.title}</h3><p>{finding.description}</p><p><strong>Business impact:</strong> {finding.businessImpact}</p><p><strong>Recommendation:</strong> {finding.recommendation}</p><details><summary>Evidence</summary>{finding.evidence.map((evidence) => <div className="artifact-row" key={`${finding.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>{evidence.segmentId}</small></div>)}</details></article>)}</div>}</div>
    <div className="panel"><h2>90-day action plan</h2>{report.actionPlan.phases.map((phase) => <section key={phase.horizon}><h3>{phase.label}</h3><p>{phase.objective}</p>{phase.items.length === 0 ? <p>No accepted recommendation is assigned to this phase.</p> : <div className="artifact-list">{phase.items.map((item) => <article className="inspection-row" key={item.id}><span className="status-pill">Priority {item.priority} · {item.severity}</span><h3>{item.title}</h3><p>{item.action}</p><p><strong>Expected outcome:</strong> {item.expectedOutcome}</p></article>)}</div>}</section>)}</div>
    <div className="panel"><h2>Evidence appendix</h2>{report.evidenceAppendix.length === 0 ? <p>No accepted finding evidence is included.</p> : <div className="artifact-list">{report.evidenceAppendix.map((entry) => <article className="inspection-row" key={entry.findingId}><h3>{entry.findingTitle}</h3>{entry.evidence.map((evidence) => <div className="artifact-row" key={`${entry.findingId}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>{evidence.segmentId}</small></div>)}</article>)}</div>}</div>
    <div className="panel"><h2>Report limitations</h2><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul><div className="form-actions"><button className="button" type="button" onClick={() => window.print()}>Print preview</button><a className="button button-secondary" href={`/assessment/${assessmentId}/maturity`}>Back to maturity</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div></div>
  </>;
}
