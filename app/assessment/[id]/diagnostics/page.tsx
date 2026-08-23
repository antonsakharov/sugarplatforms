"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { runDeterministicDiagnostics, type DiagnosticEnvelope, type DiagnosticFinding } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";
import { canCompleteFindingReview, completeFindingReview, createFindingReview, editFinding, materializeReviewedFinding, setFindingDecision, validateDiagnosticEvidence, type FindingReview } from "@/lib/finding-review";

function diagnosticsKey(assessmentId: string) { return `sugar:diagnostics:${assessmentId}`; }
function findingReviewKey(assessmentId: string) { return `sugar:finding-review:${assessmentId}`; }

function FindingEditor({ finding, onSave }: { finding: DiagnosticFinding; onSave: (finding: DiagnosticFinding, note: string) => void }) {
  const [draft, setDraft] = useState(finding);
  const [note, setNote] = useState("");
  useEffect(() => setDraft(finding), [finding]);
  return <details><summary>Edit finding</summary><div className="form-grid">
    <label><span>Title</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
    <label><span>Severity</span><select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value as DiagnosticFinding["severity"] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
    <label className="full-width"><span>Description</span><textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
    <label className="full-width"><span>Business impact</span><textarea rows={3} value={draft.businessImpact} onChange={(event) => setDraft({ ...draft, businessImpact: event.target.value })} /></label>
    <label className="full-width"><span>Technical impact</span><textarea rows={3} value={draft.technicalImpact} onChange={(event) => setDraft({ ...draft, technicalImpact: event.target.value })} /></label>
    <label className="full-width"><span>Recommendation</span><textarea rows={3} value={draft.recommendation} onChange={(event) => setDraft({ ...draft, recommendation: event.target.value })} /></label>
    <label className="full-width"><span>Reviewer note (optional)</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
  </div><button className="button button-secondary" type="button" onClick={() => onSave(draft, note)}>Save edits</button></details>;
}

export default function DiagnosticsPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const [extraction, setExtraction] = useState<ExtractionEnvelope | null | undefined>(undefined);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEnvelope | null>(null);
  const [findingReview, setFindingReview] = useState<FindingReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractionRaw = localStorage.getItem(`sugar:extraction:${assessmentId}`);
    const reviewRaw = localStorage.getItem(`sugar:extraction-review:${assessmentId}`);
    const diagnosticsRaw = localStorage.getItem(diagnosticsKey(assessmentId));
    const findingReviewRaw = localStorage.getItem(findingReviewKey(assessmentId));
    setExtraction(extractionRaw ? JSON.parse(extractionRaw) : null);
    setReview(reviewRaw ? JSON.parse(reviewRaw) : null);
    setDiagnostics(diagnosticsRaw ? JSON.parse(diagnosticsRaw) : null);
    setFindingReview(findingReviewRaw ? JSON.parse(findingReviewRaw) : null);
  }, [assessmentId]);

  const evidenceBySegment = useMemo(() => {
    const map = new Map<string, { artifactName: string; locator: string }>();
    for (const object of extraction?.objects ?? []) for (const evidence of object.evidence) map.set(evidence.segmentId, evidence);
    return map;
  }, [extraction]);

  const reviewByFinding = useMemo(() => new Map((findingReview?.findings ?? []).map((item) => [item.findingId, item])), [findingReview]);

  function persistFindingReview(next: FindingReview) {
    setFindingReview(next);
    localStorage.setItem(findingReviewKey(assessmentId), JSON.stringify(next));
  }

  function run() {
    if (!extraction || !review) return;
    try {
      const result = runDeterministicDiagnostics({ assessmentId, extraction, review });
      validateDiagnosticEvidence(result, extraction, review);
      setDiagnostics(result);
      localStorage.setItem(diagnosticsKey(assessmentId), JSON.stringify(result));
      const nextReview = createFindingReview(result);
      persistFindingReview(nextReview);
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Diagnostics could not be completed."); }
  }

  function ensureReview() {
    if (!diagnostics || !extraction || !review) return;
    try {
      validateDiagnosticEvidence(diagnostics, extraction, review);
      persistFindingReview(createFindingReview(diagnostics));
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Finding review could not be initialized."); }
  }

  function decide(findingId: string, status: "accepted" | "rejected") {
    if (!findingReview) return;
    persistFindingReview(setFindingDecision(findingReview, findingId, status));
  }

  function saveEdits(source: DiagnosticFinding, edited: DiagnosticFinding, note: string) {
    if (!findingReview) return;
    try {
      persistFindingReview(editFinding(findingReview, source.id, {
        title: edited.title,
        description: edited.description,
        businessImpact: edited.businessImpact,
        technicalImpact: edited.technicalImpact,
        recommendation: edited.recommendation,
        severity: edited.severity
      }, note));
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Finding edits could not be saved."); }
  }

  function completeReview() {
    if (!findingReview) return;
    try { persistFindingReview(completeFindingReview(findingReview)); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Finding review could not be completed."); }
  }

  if (extraction === undefined) return <p className="lede">Loading approved architecture…</p>;
  if (!extraction || !review) return <div className="panel"><h1>Diagnostics</h1><p>Complete architecture extraction and review first.</p><a className="button" href={`/assessment/${assessmentId}/upload`}>Upload evidence</a></div>;
  if (!review.approved) return <><div className="eyebrow">Assessment · Diagnostics</div><h1>Approve extraction before diagnostics</h1><p className="lede">Deterministic rules only run against a fully reviewed extraction set.</p><div className="panel"><p>Resolve all architecture candidates and approve the extraction boundary first.</p><a className="button" href={`/assessment/${assessmentId}/review`}>Review extraction</a></div></>;

  return <>
    <div className="eyebrow">Assessment · Diagnostics and finding review</div>
    <h1>Inspect and decide evidence-backed findings</h1>
    <p className="lede">Rules operate only on confirmed architecture objects. Before review starts, every finding is checked against the approved extraction evidence boundary. You can edit presentation and impact language, but evidence and rule provenance remain immutable.</p>
    <div className="panel diagnostic-panel">
      <div className="form-actions"><button className="button" type="button" onClick={run}>{diagnostics ? "Re-run diagnostics" : "Run diagnostics"}</button><a className="button button-secondary" href={`/assessment/${assessmentId}/review`}>Back to extraction review</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div>
      {error && <div className="form-error">{error}</div>}
      {diagnostics && <>
        <div className="metrics diagnostic-metrics"><article><strong>{diagnostics.stats.findingCount}</strong><span>findings</span></article><article><strong>{diagnostics.stats.ruleCount}</strong><span>rules run</span></article><article><strong>{diagnostics.stats.activeObjectCount}</strong><span>approved objects</span></article><article><strong>{diagnostics.stats.evidenceReferenceCount}</strong><span>evidence links</span></article></div>
        {!findingReview && diagnostics.findings.length > 0 && <div className="readiness-review"><strong>Review not initialized</strong><span>Validate evidence coverage and create an explicit review set before decisions.</span><button className="button button-secondary" type="button" onClick={ensureReview}>Validate evidence & start review</button></div>}
        {diagnostics.findings.length === 0 ? <div className="readiness-ready"><strong>No deterministic signals found</strong><span>The currently implemented rules found no fragmented-identifier or ownership-gap signal in the approved extraction set.</span></div> : <div className="artifact-list">{diagnostics.findings.map((sourceFinding) => {
          const reviewItem = reviewByFinding.get(sourceFinding.id);
          const finding = reviewItem ? materializeReviewedFinding(sourceFinding, reviewItem) : sourceFinding;
          return <article className="finding-card" key={finding.id}>
            <div className="finding-heading"><div><span className="status-pill">{finding.severity} severity</span><span className="status-pill">{finding.factStatus}</span><span className="status-pill">{reviewItem?.status ?? "pending"}</span><h3>{finding.title}</h3></div><small>{finding.ruleId} · v{finding.ruleVersion} · {Math.round(finding.confidence * 100)}% confidence</small></div>
            <p>{finding.description}</p>
            <div className="finding-impact"><div><strong>Business impact</strong><p>{finding.businessImpact}</p></div><div><strong>Technical impact</strong><p>{finding.technicalImpact}</p></div></div>
            <div><strong>Recommendation</strong><p>{finding.recommendation}</p></div>
            <details><summary>Evidence ({finding.evidence.length})</summary><div className="artifact-list">{finding.evidence.map((evidence) => { const source = evidenceBySegment.get(evidence.segmentId); return <div className="artifact-row" key={`${finding.id}:${evidence.segmentId}`}><div><strong>{source?.artifactName ?? evidence.artifactName}</strong><code>{source?.locator ?? evidence.locator}</code></div><small>Direct evidence · {evidence.segmentId}</small></div>; })}</div></details>
            <details><summary>Validation questions</summary><ul>{finding.validationQuestions.map((question) => <li key={question}>{question}</li>)}</ul></details>
            {findingReview && <><FindingEditor finding={finding} onSave={(edited, note) => saveEdits(sourceFinding, edited, note)} /><div className="form-actions"><button className="button" type="button" onClick={() => decide(finding.id, "accepted")}>Accept finding</button><button className="button button-secondary" type="button" onClick={() => decide(finding.id, "rejected")}>Reject finding</button></div>{reviewItem?.reviewerNote && <p><strong>Reviewer note:</strong> {reviewItem.reviewerNote}</p>}</>}
          </article>;
        })}</div>}
        {findingReview && diagnostics.findings.length > 0 && <div className={canCompleteFindingReview(findingReview) ? "readiness-ready" : "readiness-review"}><strong>{findingReview.reviewedAt ? "Finding review complete" : canCompleteFindingReview(findingReview) ? "Ready to complete review" : "Finding decisions required"}</strong><span>{findingReview.findings.filter((item) => item.status === "accepted").length} accepted · {findingReview.findings.filter((item) => item.status === "rejected").length} rejected · {findingReview.findings.filter((item) => item.status === "pending").length} pending</span>{!findingReview.reviewedAt && <button className="button" type="button" disabled={!canCompleteFindingReview(findingReview)} onClick={completeReview}>Complete finding review</button>} {findingReview.reviewedAt && <p>Only accepted findings are now eligible for maturity, recommendations, maps, and reports.</p>}</div>}
      </>}
    </div>
  </>;
}
