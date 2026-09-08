"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { generateAiFindingCandidates, LocalDemoAiFindingProvider, type AiFindingEnvelope } from "@/lib/ai-findings";
import type { AiCandidatePromotion } from "@/lib/ai-finding-promotion";
import { loadServerDiagnosticState } from "@/lib/client-reviewed-state";
import type { DiagnosticEnvelope } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";
import type { FindingReview } from "@/lib/finding-review";

function candidateKey(assessmentId: string) { return `sugar:ai-candidates:${assessmentId}`; }
function promotionKey(assessmentId: string) { return `sugar:ai-promotions:${assessmentId}`; }

export default function AiFindingsPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [extraction, setExtraction] = useState<ExtractionEnvelope | null | undefined>(undefined);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEnvelope | null>(null);
  const [candidates, setCandidates] = useState<AiFindingEnvelope | null>(null);
  const [promotions, setPromotions] = useState<AiCandidatePromotion[]>([]);
  const [running, setRunning] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadServerDiagnosticState(assessmentId).then((state) => {
      if (!active) return;
      setExtraction(state.extraction);
      setReview(state.extractionReview);
      setDiagnostics(state.diagnostics);
      const candidateRaw = localStorage.getItem(candidateKey(assessmentId));
      const cachedCandidates = candidateRaw ? JSON.parse(candidateRaw) as AiFindingEnvelope : null;
      if (cachedCandidates && cachedCandidates.diagnosticGeneratedAt === state.diagnostics.generatedAt) setCandidates(cachedCandidates);
      else {
        setCandidates(null);
        localStorage.removeItem(candidateKey(assessmentId));
      }
      const promotionRaw = localStorage.getItem(promotionKey(assessmentId));
      setPromotions(promotionRaw ? JSON.parse(promotionRaw) as AiCandidatePromotion[] : []);
      setError(null);
    }).catch((caught) => {
      if (!active) return;
      setExtraction(null);
      setReview(null);
      setDiagnostics(null);
      setError(caught instanceof Error ? caught.message : "Unable to load server diagnostic state.");
    });
    return () => { active = false; };
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
      const result = await generateAiFindingCandidates({ assessmentId, extraction, review }, diagnostics, new LocalDemoAiFindingProvider());
      setCandidates(result);
      localStorage.setItem(candidateKey(assessmentId), JSON.stringify(result));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI-assisted candidates could not be generated.");
    } finally {
      setRunning(false);
    }
  }

  async function promote(candidateId: string) {
    if (!candidates) return;
    setPromotingId(candidateId);
    setError(null);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/ai-promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates, candidateId })
      });
      const payload = await response.json() as { diagnostics?: DiagnosticEnvelope; review?: FindingReview; promotion?: AiCandidatePromotion; error?: string };
      if (!response.ok || !payload.diagnostics || !payload.review || !payload.promotion) throw new Error(payload.error || "AI candidate could not be promoted.");
      setDiagnostics(payload.diagnostics);
      localStorage.setItem(`sugar:diagnostics:${assessmentId}`, JSON.stringify(payload.diagnostics));
      localStorage.setItem(`sugar:finding-review:${assessmentId}`, JSON.stringify(payload.review));
      const nextPromotions = [...promotions.filter((item) => item.candidateId !== candidateId), payload.promotion];
      setPromotions(nextPromotions);
      localStorage.setItem(promotionKey(assessmentId), JSON.stringify(nextPromotions));
      setCandidates(null);
      localStorage.removeItem(candidateKey(assessmentId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI candidate could not be promoted.");
    } finally {
      setPromotingId(null);
    }
  }

  if (extraction === undefined) return <p className="lede">Loading approved architecture and current server diagnostics…</p>;
  if (!extraction || !review || !review.approved) return <div className="panel"><h1>AI-assisted candidate findings</h1><p>{error ?? "Approve the extraction boundary before generating candidates."}</p><a className="button" href={`/assessment/${assessmentId}/review`}>Review extraction</a></div>;
  if (!diagnostics) return <div className="panel"><h1>AI-assisted candidate findings</h1><p>{error ?? "Run deterministic diagnostics first. AI-assisted interpretation is intentionally second in the pipeline."}</p><a className="button" href={`/assessment/${assessmentId}/diagnostics`}>Run diagnostics</a></div>;

  return <>
    <div className="eyebrow">Assessment · AI-assisted candidate findings</div>
    <h1>Inspect model-style candidates without promoting them automatically</h1>
    <p className="lede">This surface hydrates the current authenticated server diagnostic envelope, then runs the credential-free local candidate adapter against that exact approved evidence boundary. Candidates remain separate from accepted findings until an explicit server-authorized promotion resets normal finding review.</p>
    <div className="upload-warning"><strong>Human-review boundary.</strong> Candidate findings are suggestions, not conclusions. They must cite approved object IDs and direct evidence references, remain derived, and use bounded confidence. Uploaded content is never allowed to issue instructions or trigger tools.</div>
    <div className="panel diagnostic-panel">
      <div className="form-actions">
        <button className="button" type="button" disabled={running || promotingId !== null} onClick={generate}>{running ? "Generating…" : candidates ? "Regenerate candidates" : "Generate candidate findings"}</button>
        <a className="button button-secondary" href={`/assessment/${assessmentId}/diagnostics`}>Back to finding review</a>
        <a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a>
      </div>
      {error && <div className="form-error">{error}</div>}
      {candidates && <>
        <div className="metrics diagnostic-metrics"><article><strong>{candidates.stats.candidateCount}</strong><span>candidate findings</span></article><article><strong>{candidates.stats.evidenceReferenceCount}</strong><span>evidence links</span></article><article><strong>{diagnostics.stats.findingCount}</strong><span>review-set findings</span></article><article><strong>{candidates.provider}</strong><span>provider</span></article></div>
        {candidates.warnings.map((warning) => <div className="upload-warning" key={warning}>{warning}</div>)}
        {candidates.candidates.length === 0 ? <div className="readiness-ready"><strong>No additional candidates</strong><span>The candidate provider found no supported cross-object signal beyond the current findings in this approved evidence set.</span></div> : <div className="artifact-list">{candidates.candidates.map((candidate) => <article className="finding-card" key={candidate.id}>
          <div className="finding-heading"><div><span className="status-pill">candidate</span><span className="status-pill">{candidate.severity} severity</span><span className="status-pill">{candidate.factStatus}</span><h3>{candidate.title}</h3></div><small>{candidate.provider} · {candidate.promptVersion} · {Math.round(candidate.confidence * 100)}% confidence</small></div>
          <p>{candidate.description}</p>
          <div className="finding-impact"><div><strong>Business impact</strong><p>{candidate.businessImpact}</p></div><div><strong>Technical impact</strong><p>{candidate.technicalImpact}</p></div></div>
          <div><strong>Recommendation candidate</strong><p>{candidate.recommendation}</p></div>
          <details><summary>Evidence ({candidate.evidence.length})</summary><div className="artifact-list">{candidate.evidence.map((evidence) => { const source = evidenceBySegment.get(evidence.segmentId); return <div className="artifact-row" key={`${candidate.id}:${evidence.segmentId}`}><div><strong>{source?.artifactName ?? evidence.artifactName}</strong><code>{source?.locator ?? evidence.locator}</code></div><small>Direct evidence · {evidence.segmentId}</small></div>; })}</div></details>
          <details><summary>Validation questions</summary><ul>{candidate.validationQuestions.map((question) => <li key={question}>{question}</li>)}</ul></details>
          <div className="form-actions"><button className="button" type="button" disabled={promotingId !== null || promotions.some((item) => item.candidateId === candidate.id)} onClick={() => void promote(candidate.id)}>{promotingId === candidate.id ? "Promoting…" : promotions.some((item) => item.candidateId === candidate.id) ? "Promoted to finding review" : "Promote to finding review"}</button></div>
        </article>)}</div>}
        <div className="readiness-review"><strong>Explicit server promotion only</strong><span>Promotion revalidates the candidate against the current approved extraction and exact server diagnostic version, persists the promoted finding as pending, and resets finding review. After promotion this candidate set is discarded as stale; review the promoted finding before any downstream output can use it.</span></div>
      </>}
    </div>
  </>;
}
