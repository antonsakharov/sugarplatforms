"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadServerAcceptedFindingState } from "@/lib/client-reviewed-state";
import { calculateFocusedMaturity, generatePrioritizedRecommendations } from "@/lib/maturity-recommendations";
import { createReportExport, reportExportFilename, type ReportSnapshot } from "@/lib/report-versioning";
import { generateExecutiveReport, generateNinetyDayActionPlan, type ExecutiveReport } from "@/lib/reporting";

function filenameFromDisposition(value: string | null, fallback: string) {
  const match = value ? /filename="([^"]+)"/.exec(value) : null;
  return match?.[1] ?? fallback;
}

export default function ExecutiveReportPage() {
  const { id: assessmentId } = useParams<{ id: string }>();
  const [report, setReport] = useState<ExecutiveReport | null>(null);
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    const response = await fetch(`/api/assessments/${assessmentId}/reports`, { cache: "no-store" });
    const payload = await response.json() as { reports?: ReportSnapshot[]; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Report history could not be loaded.");
    setSnapshots(payload.reports ?? []);
  }

  useEffect(() => {
    let active = true;
    Promise.all([loadServerAcceptedFindingState(assessmentId), fetch(`/api/assessments/${assessmentId}/reports`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { reports?: ReportSnapshot[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Report history could not be loaded.");
      return payload.reports ?? [];
    })]).then(([state, history]) => {
      if (!active) return;
      const maturity = calculateFocusedMaturity(state.diagnostics, state.findingReview);
      const recommendations = generatePrioritizedRecommendations(state.diagnostics, state.findingReview);
      const actionPlan = generateNinetyDayActionPlan(recommendations);
      setReport(generateExecutiveReport({ assessment: state.assessment, artifacts: state.artifacts, diagnostics: state.diagnostics, review: state.findingReview, maturity, recommendations, actionPlan }));
      setSnapshots(history);
      setError(null);
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Executive report could not be generated."); });
    return () => { active = false; };
  }, [assessmentId]);

  async function saveSnapshot() {
    setBusy("save"); setError(null);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/reports`, { method: "POST" });
      const payload = await response.json() as ReportSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Report version could not be saved.");
      await loadHistory();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Report version could not be saved."); }
    finally { setBusy(null); }
  }

  function downloadJson(snapshot: ReportSnapshot) {
    const blob = new Blob([JSON.stringify(createReportExport(snapshot), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = reportExportFilename(snapshot); document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  async function downloadPdf(snapshot: ReportSnapshot) {
    setBusy(snapshot.id); setError(null);
    try {
      const response = await fetch("/api/reports/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId, reportId: snapshot.id }) });
      if (!response.ok) { const payload = await response.json().catch(() => null) as { error?: string } | null; throw new Error(payload?.error ?? "Formal PDF export failed."); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = filenameFromDisposition(response.headers.get("content-disposition"), `${snapshot.versionLabel}.pdf`); document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Formal PDF export failed."); }
    finally { setBusy(null); }
  }

  if (error && !report) return <><div className="eyebrow">Assessment · Executive report</div><h1>Report unavailable</h1><div className="panel"><p>{error}</p></div></>;
  if (!report) return <p className="lede">Loading authenticated reviewed state and durable report history…</p>;

  return <>
    <div className="eyebrow">Assessment · Executive report</div><h1>{report.title}</h1>
    <p className="lede">Audience: {report.audience} · source diagnostics {new Date(report.generatedFromDiagnosticAt).toLocaleString()}</p>
    <div className="readiness-ready"><strong>Server-reviewed and server-versioned</strong><span>Preview inputs come from the current completed review. Saved versions are generated by the server and persisted under the authenticated organization/workspace scope.</span></div>
    {error && <div className="form-error">{error}</div>}
    <div className="panel"><h2>Executive summary</h2><p>{report.executiveSummary}</p></div>
    <div className="panel"><h2>Scope</h2><p><strong>{report.scope.companyName}</strong> · {report.scope.industry}</p><p>Focus: {report.scope.focusArea.replaceAll("-", " ")} · Primary entity: <strong>{report.scope.primaryEntity}</strong></p><p>{report.scope.businessConcern}</p><h3>Artifact inventory</h3><ul>{report.scope.artifacts.map((artifact) => <li key={`${artifact.name}:${artifact.size}`}>{artifact.name} · {artifact.status} · {(artifact.size / 1024 / 1024).toFixed(2)} MB</li>)}</ul></div>
    <div className="metrics diagnostic-metrics"><article><strong>{report.maturity.score === null ? "—" : `${report.maturity.score}/5`}</strong><span>focused maturity</span></article><article><strong>{report.topFindings.length}</strong><span>accepted top findings</span></article><article><strong>{report.recommendations.stats.recommendationCount}</strong><span>recommendations</span></article><article><strong>{report.actionPlan.stats.plannedItemCount}</strong><span>90-day actions</span></article></div>
    <div className="panel"><h2>Top accepted findings</h2>{report.topFindings.length === 0 ? <p>No accepted findings are included.</p> : report.topFindings.map((finding) => <article className="inspection-row" key={finding.id}><span className="status-pill">{finding.severity} · {finding.category.replace("_", " ")}</span><h3>{finding.title}</h3><p>{finding.description}</p><p><strong>Recommendation:</strong> {finding.recommendation}</p></article>)}</div>
    <div className="panel"><h2>Prioritized recommendations</h2>{report.recommendations.recommendations.length === 0 ? <p>No accepted-finding recommendations.</p> : report.recommendations.recommendations.map((item) => <article className="inspection-row" key={item.id}><span className="status-pill">Priority {item.priority}</span><h3>{item.title}</h3><p>{item.action}</p></article>)}</div>
    <div className="panel"><h2>Durable report versions & export</h2><p>Saving creates a new immutable server snapshot from the current authenticated reviewed state. Client-supplied report bodies are not accepted. PDF export resolves the saved snapshot by assessment and report ID on the server.</p><div className="form-actions"><button className="button" disabled={busy !== null} type="button" onClick={saveSnapshot}>{busy === "save" ? "Saving…" : "Save report version"}</button></div>{snapshots.length === 0 ? <p>No saved report versions yet.</p> : <div className="artifact-list">{snapshots.map((snapshot) => <article className="inspection-row" key={snapshot.id}><span className="status-pill">{snapshot.versionLabel}</span><h3>{snapshot.report.title}</h3><p>Saved {new Date(snapshot.createdAt).toLocaleString()} · diagnostics {new Date(snapshot.generatedFromDiagnosticAt).toLocaleString()}</p><div className="form-actions"><button className="button button-secondary" type="button" onClick={() => downloadJson(snapshot)}>Download JSON</button><button className="button" type="button" disabled={busy !== null} onClick={() => downloadPdf(snapshot)}>{busy === snapshot.id ? "Generating PDF…" : "Download formal PDF"}</button></div></article>)}</div>}</div>
    <div className="panel"><h2>Report limitations</h2><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul><div className="form-actions"><button className="button" type="button" onClick={() => window.print()}>Print preview</button><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div></div>
  </>;
}
