"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { runDeterministicDiagnostics, type DiagnosticEnvelope, type DiagnosticFinding } from "@/lib/diagnostics";
import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";
import { canCompleteFindingReview, completeFindingReview, createFindingReview, editFinding, materializeReviewedFinding, setFindingDecision, validateDiagnosticEvidence, type FindingReview } from "@/lib/finding-review";

function diagnosticsKey(assessmentId: string) { return `sugar:diagnostics:${assessmentId}`; }
function findingReviewKey(assessmentId: string) { return `sugar:finding-review:${assessmentId}`; }

type PersistedReviewPayload = { extraction: ExtractionEnvelope; review: ExtractionReview; stalePersistedReview: boolean };
type PersistedFindingPayload = { persisted: null | { diagnostics: DiagnosticEnvelope; review: FindingReview; stale: boolean; acceptedFindings: DiagnosticFinding[]; updatedAt: string } };

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/assessments/${assessmentId}/extraction-review`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json() as PersistedReviewPayload | { error?: string };
        if (!response.ok || !("review" in payload)) throw new Error(("error" in payload && payload.error) || "Unable to load approved extraction.");
        return payload;
      }),
      fetch(`/api/assessments/${assessmentId}/finding-review`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json() as PersistedFindingPayload | { error?: string };
        if (!response.ok || !("persisted" in payload)) throw new Error(("error" in payload && payload.error) || "Unable to load finding review.");
        return payload;
      })
    ]).then(([extractionPayload, findingPayload]) => {
      if (!active) return;
      setExtraction(extractionPayload.extraction);
      setReview(extractionPayload.stalePersistedReview ? null : extractionPayload.review);
      localStorage.setItem(`sugar:extraction:${assessmentId}`, JSON.stringify(extractionPayload.extraction));
      localStorage.setItem(`sugar:extraction-review:${assessmentId}`, JSON.stringify(extractionPayload.review));
      if (findingPayload.persisted && !findingPayload.persisted.stale) {
        setDiagnostics(findingPayload.persisted.diagnostics);
        setFindingReview(findingPayload.persisted.review);
        localStorage.setItem(diagnosticsKey(assessmentId), JSON.stringify(findingPayload.persisted.diagnostics));
        localStorage.setItem(findingReviewKey(assessmentId), JSON.stringify(findingPayload.persisted.review));
      } else {
        setDiagnostics(null);
        setFindingReview(null);
        localStorage.removeItem(diagnosticsKey(assessmentId));
        localStorage.removeItem(findingReviewKey(assessmentId));
        if (findingPayload.persisted?.stale) setError("Persisted finding review is stale because the approved extraction changed. Re-run diagnostics.");
      }
    }).catch((caught) => {
      if (!active) return;
      setExtraction(null); setReview(null); setDiagnostics(null); setFindingReview(null);
      setError(caught instanceof Error ? caught.message : "Unable to load persisted review state.");
    });
    return () => { active = false; };
  }, [assessmentId]);

  const evidenceBySegment = useMemo(() => {
    const map = new Map<string, { artifactName: string; locator: string }>();
    for (const object of extraction?.objects ?? []) for (const evidence of object.evidence) map.set(evidence.segmentId, evidence);
    return map;
  }, [extraction]);
  const reviewByFinding = useMemo(() => new Map((findingReview?.findings ?? []).map((item) => [item.findingId, item])), [findingReview]);

  async function persist(nextDiagnostics: DiagnosticEnvelope, nextReview: FindingReview) {
    setSaving(true);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/finding-review`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ diagnostics: nextDiagnostics, review: nextReview }) });
      const payload = await response.json() as { diagnostics?: DiagnosticEnvelope; review?: FindingReview; error?: string };
      if (!response.ok || !payload.diagnostics || !payload.review) throw new Error(payload.error || "Unable to persist finding review.");
      setDiagnostics(payload.diagnostics); setFindingReview(payload.review);
      localStorage.setItem(diagnosticsKey(assessmentId), JSON.stringify(payload.diagnostics));
      localStorage.setItem(findingReviewKey(assessmentId), JSON.stringify(payload.review));
      setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Finding review could not be persisted."); }
    finally { setSaving(false); }
  }

  function run() {
    if (!extraction || !review) return;
    try {
      const result = runDeterministicDiagnostics({ assessmentId, extraction, review });
      validateDiagnosticEvidence(result, extraction, review);
      void persist(result, createFindingReview(result));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Diagnostics could not be completed."); }
  }
  function ensureReview() {
    if (!diagnostics || !extraction || !review) return;
    try { validateDiagnosticEvidence(diagnostics, extraction, review); void persist(diagnostics, createFindingReview(diagnostics)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Finding review could not be initialized."); }
  }
  function decide(findingId: string, status: "accepted" | "rejected") {
    if (findingReview && diagnostics) void persist(diagnostics, setFindingDecision(findingReview, findingId, status));
  }
  function saveEdits(source: DiagnosticFinding, edited: DiagnosticFinding, note: string) {
    if (!findingReview || !diagnostics) return;
    try {
      const next = editFinding(findingReview, source.id, { title: edited.title, description: edited.description, businessImpact: edited.businessImpact, technicalImpact: edited.technicalImpact, recommendation: edited.recommendation, severity: edited.severity }, note);
      void persist(diagnostics, next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Finding edits could not be saved."); }
  }
  function completeReview() {
    if (!findingReview || !diagnostics) return;
    try { void persist(diagnostics, completeFindingReview(findingReview)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Finding review could not be completed."); }
  }

  if (extraction === undefined) return <p className="lede">Loading approved architecture…</p>;
  if (!extraction || !review) return <div className="panel"><h1>Diagnostics</h1><p>{error ?? "Complete architecture extraction and review first."}</p><a className="button" href={`/assessment/${assessmentId}/review`}>Review extraction</a></div>;
  if (!review.approved) return <><div className="eyebrow">Assessment · Diagnostics</div><h1>Approve extraction before diagnostics</h1><p className="lede">Deterministic rules only run against a fully reviewed, current persisted extraction set.</p></>;

  return <>
    <div className="eyebrow">Assessment · Diagnostics and finding review</div>
    <h1>Inspect and decide evidence-backed findings</h1>
    <p className="lede">Finding decisions are persisted under the authenticated tenant and bound to the exact current diagnostic output. Completed accepted findings are the only findings eligible for downstream maturity, maps, recommendations, and reports.</p>
    <div className="panel diagnostic-panel">
      <div className="form-actions"><button className="button" type="button" disabled={saving} onClick={run}>{diagnostics ? "Re-run diagnostics" : "Run diagnostics"}</button><a className="button button-secondary" href={`/assessment/${assessmentId}/review`}>Back to extraction review</a></div>
      {saving && <div className="readiness-review"><strong>Saving review…</strong><span>Server validation is checking tenant scope, diagnostic provenance, and accepted-finding materialization.</span></div>}
      {error && <div className="form-error">{error}</div>}
      {diagnostics && <>
        <div className="metrics diagnostic-metrics"><article><strong>{diagnostics.stats.findingCount}</strong><span>findings</span></article><article><strong>{diagnostics.stats.ruleCount}</strong><span>rules run</span></article><article><strong>{diagnostics.stats.activeObjectCount}</strong><span>approved objects</span></article><article><strong>{diagnostics.stats.evidenceReferenceCount}</strong><span>evidence links</span></article></div>
        {!findingReview && diagnostics.findings.length > 0 && <div className="readiness-review"><strong>Review not initialized</strong><button className="button button-secondary" type="button" onClick={ensureReview}>Validate evidence & start review</button></div>}
        {diagnostics.findings.length === 0 ? <div className="readiness-ready"><strong>No deterministic signals found</strong></div> : <div className="artifact-list">{diagnostics.findings.map((sourceFinding) => {
          const reviewItem = reviewByFinding.get(sourceFinding.id);
          const finding = reviewItem ? materializeReviewedFinding(sourceFinding, reviewItem) : sourceFinding;
          return <article className="finding-card" key={finding.id}>
            <div className="finding-heading"><div><span className="status-pill">{finding.severity} severity</span><span className="status-pill">{finding.factStatus}</span><span className="status-pill">{reviewItem?.status ?? "pending"}</span><h3>{finding.title}</h3></div><small>{finding.ruleId} · v{finding.ruleVersion} · {Math.round(finding.confidence * 100)}% confidence</small></div>
            <p>{finding.description}</p><div className="finding-impact"><div><strong>Business impact</strong><p>{finding.businessImpact}</p></div><div><strong>Technical impact</strong><p>{finding.technicalImpact}</p></div></div><div><strong>Recommendation</strong><p>{finding.recommendation}</p></div>
            <details><summary>Evidence ({finding.evidence.length})</summary><div className="artifact-list">{finding.evidence.map((evidence) => { const source = evidenceBySegment.get(evidence.segmentId); return <div className="artifact-row" key={`${finding.id}:${evidence.segmentId}`}><div><strong>{source?.artifactName ?? evidence.artifactName}</strong><code>{source?.locator ?? evidence.locator}</code></div><small>Direct evidence · {evidence.segmentId}</small></div>; })}</div></details>
            {findingReview && <><FindingEditor finding={finding} onSave={(edited, note) => saveEdits(sourceFinding, edited, note)} /><div className="form-actions"><button className="button" disabled={saving} type="button" onClick={() => decide(finding.id, "accepted")}>Accept finding</button><button className="button button-secondary" disabled={saving} type="button" onClick={() => decide(finding.id, "rejected")}>Reject finding</button></div>{reviewItem?.reviewerNote && <p><strong>Reviewer note:</strong> {reviewItem.reviewerNote}</p>}</>}
          </article>;
        })}</div>}
        {findingReview && diagnostics.findings.length > 0 && <div className={canCompleteFindingReview(findingReview) ? "readiness-ready" : "readiness-review"}><strong>{findingReview.reviewedAt ? "Finding review complete and persisted" : canCompleteFindingReview(findingReview) ? "Ready to complete review" : "Finding decisions required"}</strong><span>{findingReview.findings.filter((item) => item.status === "accepted").length} accepted · {findingReview.findings.filter((item) => item.status === "rejected").length} rejected · {findingReview.findings.filter((item) => item.status === "pending").length} pending</span>{!findingReview.reviewedAt && <button className="button" disabled={saving || !canCompleteFindingReview(findingReview)} type="button" onClick={completeReview}>Complete finding review</button>}</div>}
      </>}
    </div>
  </>;
}
