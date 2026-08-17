"use client";

import { useEffect, useMemo, useState } from "react";
import {
  approveExtraction,
  canApproveExtraction,
  createExtractionReview,
  mergeReviewedObject,
  renameReviewedObject,
  setReviewStatus,
  type ExtractionReview
} from "@/lib/extraction-review";
import type { ExtractionEnvelope, ExtractedObject } from "@/lib/extraction";

function storageKey(assessmentId: string) { return `sugar:extraction-review:${assessmentId}`; }

export function ExtractionReviewClient({ assessmentId }: { assessmentId: string }) {
  const [extraction, setExtraction] = useState<ExtractionEnvelope | null | undefined>(undefined);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractionRaw = localStorage.getItem(`sugar:extraction:${assessmentId}`);
    if (!extractionRaw) { setExtraction(null); return; }
    const parsedExtraction = JSON.parse(extractionRaw) as ExtractionEnvelope;
    setExtraction(parsedExtraction);
    const reviewRaw = localStorage.getItem(storageKey(assessmentId));
    const nextReview = reviewRaw ? JSON.parse(reviewRaw) as ExtractionReview : createExtractionReview(parsedExtraction.objects);
    setReview(nextReview);
    if (!reviewRaw) localStorage.setItem(storageKey(assessmentId), JSON.stringify(nextReview));
  }, [assessmentId]);

  function save(next: ExtractionReview) {
    setReview(next); localStorage.setItem(storageKey(assessmentId), JSON.stringify(next)); setError(null);
  }
  function mutate(operation: () => ExtractionReview) {
    try { save(operation()); } catch (caught) { setError(caught instanceof Error ? caught.message : "Review action failed."); }
  }

  const extractionById = useMemo(() => new Map((extraction?.objects ?? []).map((item) => [item.id, item])), [extraction]);
  const progress = review ? review.objects.filter((item) => item.status !== "pending").length : 0;

  if (extraction === undefined) return <p className="lede">Loading extracted architecture…</p>;
  if (!extraction || !review) return <div className="panel"><h1>Extraction review</h1><p>No extracted architecture is available in this browser. Upload and process artifacts first.</p><a className="button" href={`/assessment/${assessmentId}/upload`}>Upload artifacts</a></div>;

  return <>
    <div className="eyebrow">Assessment · Extraction review</div>
    <h1>Review architecture objects</h1>
    <p className="lede">Resolve every candidate before approving the extraction set for diagnostics. Renames and merges change the reviewed representation only; source evidence remains attached to the original extraction object.</p>
    <div className="panel">
      <div className={review.approved ? "readiness-ready" : "readiness-review"}><strong>{review.approved ? "Extraction approved" : `${progress} of ${review.objects.length} objects resolved`}</strong><span>{review.approved && review.approvedAt ? `Approved ${new Date(review.approvedAt).toLocaleString()}` : "Confirm, reject, or merge every candidate."}</span></div>
      {error && <div className="form-error">{error}</div>}
      <div className="artifact-list">{review.objects.map((item) => {
        const source = extractionById.get(item.id) as ExtractedObject | undefined;
        const mergeTargets = review.objects.filter((candidate) => candidate.id !== item.id && candidate.kind === item.kind && candidate.status !== "rejected" && candidate.status !== "merged");
        return <article className={`inspection-row status-${item.status === "rejected" ? "blocked" : item.status === "pending" ? "review_required" : "validated"}`} key={item.id}>
          <div><strong>{item.displayName}</strong><small>{item.kind} · {source ? Math.round(source.confidence * 100) : "?"}% confidence</small><span className="status-pill">{item.status}</span></div>
          <label><span>Reviewed name</span><input value={item.displayName} disabled={review.approved || item.status === "merged"} onChange={(event) => mutate(() => renameReviewedObject(review, item.id, event.target.value))} /></label>
          {item.status === "merged" && <p>Merged into <strong>{review.objects.find((candidate) => candidate.id === item.mergedInto)?.displayName ?? item.mergedInto}</strong>.</p>}
          <div className="artifact-actions"><button className="text-button" disabled={review.approved} type="button" onClick={() => mutate(() => setReviewStatus(review, item.id, "confirmed"))}>Confirm</button><button className="text-button" disabled={review.approved} type="button" onClick={() => mutate(() => setReviewStatus(review, item.id, "rejected"))}>Reject</button><button className="text-button" disabled={review.approved} type="button" onClick={() => mutate(() => setReviewStatus(review, item.id, "pending"))}>Reset</button></div>
          {mergeTargets.length > 0 && item.status !== "merged" && <label><span>Merge duplicate into</span><select disabled={review.approved} defaultValue="" onChange={(event) => { if (event.target.value) mutate(() => mergeReviewedObject(review, item.id, event.target.value)); event.currentTarget.value = ""; }}><option value="">Choose same-kind object…</option>{mergeTargets.map((target) => <option key={target.id} value={target.id}>{target.displayName}</option>)}</select></label>}
          {source && <details><summary>Evidence ({source.evidence.length})</summary><div className="artifact-list">{source.evidence.map((evidence) => <div className="artifact-row" key={`${item.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>Direct evidence · {evidence.segmentId}</small></div>)}</div></details>}
        </article>;
      })}</div>
      <div className="form-actions"><button className="button" disabled={review.approved || !canApproveExtraction(review)} type="button" onClick={() => mutate(() => approveExtraction(review))}>Approve extraction for diagnostics</button><a className="button button-secondary" href={`/assessment/${assessmentId}/upload`}>Back to evidence</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div>
      {!review.approved && !canApproveExtraction(review) && <p><strong>Approval blocked:</strong> every candidate must be confirmed, rejected, or merged. Diagnostics must not run from unresolved extraction.</p>}
      {review.approved && <p><strong>Approved boundary:</strong> diagnostics may consume confirmed objects plus merge targets; rejected and merged-away candidates remain auditable review history.</p>}
    </div>
  </>;
}
