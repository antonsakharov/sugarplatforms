"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { generateAiFindingCandidates, LocalDemoAiFindingProvider, type AiFindingEnvelope } from "@/lib/ai-findings";
import type { DiagnosticEnvelope } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";

function candidateKey(assessmentId: string) { return `sugar:ai-candidates:${assessmentId}`; }

export default function AiFindingsPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [extraction, setExtraction] = useState<ExtractionEnvelope | null | undefined>(undefined);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEnvelope | null>(null);
  const [candidates, setCandidates] = useState<AiFindingEnvelope | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractionRaw = localStorage.getItem(`sugar:extraction:${assessmentId}`);
    const reviewRaw = localStorage.getItem(`sugar:extraction-review:${assessmentId}`);
    const diagnosticsRaw = localStorage.getItem(`sugar:diagnostics:${assessmentId}`);
    const candidateRaw = localStorage.getItem(candidateKey(assessmentId));
    setExtraction(extractionRaw ? JSON.parse(extractionRaw) : null);
    setReview(reviewRaw ? JSON.parse(reviewRaw) : null);
    setDiagnostics(diagnosticsRaw ? JSON.parse(diagnosticsRaw) : null);
    setCandidates(candidateRaw ? JSON.parse(candidateRaw) : null);
  }, [assessmentId]);

  const evidenceBySegment = useMemo(() => {
    const map = new Map<string, { artifactName: string; locator: string }>();
    for (const object of extraction?.objects ?? []) for (const evidence of object.evidence) map.set(evidence.segmentId, evidence);
    return map;
  }, [extraction]);

  async function generate() {
    if (!extraction || !review || !diagnostics) return;
    setRunning(true);
    setError(null);
    try {
      const result = await generateAiFindingCandidates({ assessmentId, extraction, review }, diagnostics.findings, new LocalDemoAiFindingProvider());
      setCandidates(result);
      localStorage.setItem(candidateKey(assessmentId), JSON.stringify(result));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI-assisted candidates could not be generated.");
    } finally {
      setRunning(false);
    }
  }

  if (extraction === undefined) return <p className="lede">Loading approved architecture…</p>;
  if (!extraction || !review || !review.approved) return <div className="panel"><h1>AI-assisted candidate findings</h1><p>Approve the extraction boundary before generating candidates.</p><a className="button" href={`/assessment/${assessmentId}/review`}>Review extraction</a></div>;
  if (!diagnostics) return <div className="panel"><h1>AI-assisted candidate findings</h1><p>Run deterministic diagnostics first. AI-assisted interpretation is intentionally second in the pipeline.</p><a className="button" href={`/assessment/${assessmentId}/diagnostics`}>Run diagnostics</a></div>;

  return <>
    <div className="eyebrow">Assessment · AI-assisted candidate findings</div>
    <h1>Inspect model-style candidates without promoting them automatically</h1>
    <p className="lede">This surface runs after deterministic rules and only against confirmed architecture objects. The current demo uses a deterministic local adapter to exercise the same evidence and review contract without external credentials. Candidates remain separate from accepted findings and cannot affect maturity, recommendations, maps, or reports automatically.</p>
    <div className="upload-warning"><strong>Human-review boundary.</strong> Candidate findings are suggestions, not conclusions. They must cite approved object IDs and direct evidence references, remain derived, and use bounded confidence. Uploaded content is never allowed to issue instructions or trigger tools.</div>
    <div className="panel diagnostic-panel">
      <div className="form-actions">
        <button className="button" type="button" disabled={running} onClick={generate}>{running ? "Generating…" : candidates ? "Regenerate candidates" : "Generate candidate findings"}</button>
        <a className="button button-secondary" href={`/assessment/${assessmentId}/diagnostics`}>Back to finding review</a>
        <a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a>
      </div>
      {error && <div className="form-error">{error}</div>}
      {candidates && <>
        <div className="metrics diagnostic-metrics"><article><strong>{candidates.stats.candidateCount}</strong><span>candidate findings</span></article><article><strong>{candidates.stats.evidenceReferenceCount}</strong><span>evidence links</span></article><article><strong>{diagnostics.stats.findingCount}</strong><span>deterministic findings</span></article><article><strong>{candidates.provider}</strong><span>provider</span></article></div>
        {candidates.warnings.map((warning) => <div className="upload-warning" key={warning}>{warning}</div>)}
        {candidates.candidates.length === 0 ? <div className="readiness-ready"><strong>No additional candidates</strong><span>The candidate provider found no supported cross-object signal beyond the deterministic findings in this approved evidence set.</span></div> : <div className="artifact-list">{candidates.candidates.map((candidate) => <article className="finding-card" key={candidate.id}>
          <div className="finding-heading"><div><span className="status-pill">candidate</span><span className="status-pill">{candidate.severity} severity</span><span className="status-pill">{candidate.factStatus}</span><h3>{candidate.title}</h3></div><small>{candidate.provider} · {candidate.promptVersion} · {Math.round(candidate.confidence * 100)}% confidence</small></div>
          <p>{candidate.description}</p>
          <div className="finding-impact"><div><strong>Business impact</strong><p>{candidate.businessImpact}</p></div><div><strong>Technical impact</strong><p>{candidate.technicalImpact}</p></div></div>
          <div><strong>Recommendation candidate</strong><p>{candidate.recommendation}</p></div>
          <details><summary>Evidence ({candidate.evidence.length})</summary><div className="artifact-list">{candidate.evidence.map((evidence) => { const source = evidenceBySegment.get(evidence.segmentId); return <div className="artifact-row" key={`${candidate.id}:${evidence.segmentId}`}><div><strong>{source?.artifactName ?? evidence.artifactName}</strong><code>{source?.locator ?? evidence.locator}</code></div><small>Direct evidence · {evidence.segmentId}</small></div>; })}</div></details>
          <details><summary>Validation questions</summary><ul>{candidate.validationQuestions.map((question) => <li key={question}>{question}</li>)}</ul></details>
        </article>)}</div>}
        <div className="readiness-review"><strong>Candidate-only output</strong><span>These suggestions are intentionally isolated from the accepted-finding set. No candidate can enter a report until a future explicit promotion step validates it and routes it through normal accept/reject finding review.</span></div>
      </>}
    </div>
  </>;
}
