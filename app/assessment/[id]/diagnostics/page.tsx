"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { runDeterministicDiagnostics, type DiagnosticEnvelope } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";

function diagnosticsKey(assessmentId: string) { return `sugar:diagnostics:${assessmentId}`; }

export default function DiagnosticsPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [extraction, setExtraction] = useState<ExtractionEnvelope | null | undefined>(undefined);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractionRaw = localStorage.getItem(`sugar:extraction:${assessmentId}`);
    const reviewRaw = localStorage.getItem(`sugar:extraction-review:${assessmentId}`);
    const diagnosticsRaw = localStorage.getItem(diagnosticsKey(assessmentId));
    setExtraction(extractionRaw ? JSON.parse(extractionRaw) : null);
    setReview(reviewRaw ? JSON.parse(reviewRaw) : null);
    setDiagnostics(diagnosticsRaw ? JSON.parse(diagnosticsRaw) : null);
  }, [assessmentId]);

  const evidenceBySegment = useMemo(() => {
    const map = new Map<string, { artifactName: string; locator: string }>();
    for (const object of extraction?.objects ?? []) for (const evidence of object.evidence) map.set(evidence.segmentId, evidence);
    return map;
  }, [extraction]);

  function run() {
    if (!extraction || !review) return;
    try {
      const result = runDeterministicDiagnostics({ assessmentId, extraction, review });
      setDiagnostics(result);
      localStorage.setItem(diagnosticsKey(assessmentId), JSON.stringify(result));
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Diagnostics could not be completed."); }
  }

  if (extraction === undefined) return <p className="lede">Loading approved architecture…</p>;
  if (!extraction || !review) return <div className="panel"><h1>Diagnostics</h1><p>Complete architecture extraction and review first.</p><a className="button" href={`/assessment/${assessmentId}/upload`}>Upload evidence</a></div>;
  if (!review.approved) return <><div className="eyebrow">Assessment · Diagnostics</div><h1>Approve extraction before diagnostics</h1><p className="lede">Deterministic rules only run against a fully reviewed extraction set.</p><div className="panel"><p>Resolve all architecture candidates and approve the extraction boundary first.</p><a className="button" href={`/assessment/${assessmentId}/review`}>Review extraction</a></div></>;

  return <>
    <div className="eyebrow">Assessment · Deterministic diagnostics</div>
    <h1>Inspect evidence-backed findings</h1>
    <p className="lede">Rules operate only on confirmed architecture objects. Every finding is derived, versioned, and linked back to direct source evidence. Findings remain candidates until the finding-review workflow is added.</p>
    <div className="panel diagnostic-panel">
      <div className="form-actions"><button className="button" type="button" onClick={run}>{diagnostics ? "Re-run diagnostics" : "Run diagnostics"}</button><a className="button button-secondary" href={`/assessment/${assessmentId}/review`}>Back to extraction review</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div>
      {error && <div className="form-error">{error}</div>}
      {diagnostics && <>
        <div className="metrics diagnostic-metrics"><article><strong>{diagnostics.stats.findingCount}</strong><span>findings</span></article><article><strong>{diagnostics.stats.ruleCount}</strong><span>rules run</span></article><article><strong>{diagnostics.stats.activeObjectCount}</strong><span>approved objects</span></article><article><strong>{diagnostics.stats.evidenceReferenceCount}</strong><span>evidence links</span></article></div>
        {diagnostics.findings.length === 0 ? <div className="readiness-ready"><strong>No deterministic signals found</strong><span>The currently implemented rules found no fragmented-identifier or ownership-gap signal in the approved extraction set.</span></div> : <div className="artifact-list">{diagnostics.findings.map((finding) => <article className="finding-card" key={finding.id}>
          <div className="finding-heading"><div><span className="status-pill">{finding.severity} severity</span><span className="status-pill">{finding.factStatus}</span><h3>{finding.title}</h3></div><small>{finding.ruleId} · v{finding.ruleVersion} · {Math.round(finding.confidence * 100)}% confidence</small></div>
          <p>{finding.description}</p>
          <div className="finding-impact"><div><strong>Business impact</strong><p>{finding.businessImpact}</p></div><div><strong>Technical impact</strong><p>{finding.technicalImpact}</p></div></div>
          <div><strong>Recommendation</strong><p>{finding.recommendation}</p></div>
          <details><summary>Evidence ({finding.evidence.length})</summary><div className="artifact-list">{finding.evidence.map((evidence) => { const source = evidenceBySegment.get(evidence.segmentId); return <div className="artifact-row" key={`${finding.id}:${evidence.segmentId}`}><div><strong>{source?.artifactName ?? evidence.artifactName}</strong><code>{source?.locator ?? evidence.locator}</code></div><small>Direct evidence · {evidence.segmentId}</small></div>; })}</div></details>
          <details><summary>Validation questions</summary><ul>{finding.validationQuestions.map((question) => <li key={question}>{question}</li>)}</ul></details>
          <p><strong>Review status:</strong> {finding.reviewStatus}. Accept/edit/reject actions are intentionally deferred to the finding-review slice.</p>
        </article>)}</div>}
      </>}
    </div>
  </>;
}
