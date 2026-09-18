"use client";

import { useEffect, useMemo, useState } from "react";
import {
  approveExtraction,
  canApproveExtraction,
  mergeReviewedObject,
  renameReviewedObject,
  setReviewStatus,
  type ExtractionReview
} from "@/lib/extraction-review";
import type { ExtractionEnvelope, ExtractedObject } from "@/lib/extraction";

type ReviewPayload = {
  assessmentId: string;
  extraction: ExtractionEnvelope;
  extractionFingerprint: string;
  review: ExtractionReview;
  stalePersistedReview: boolean;
  updatedAt: string | null;
};

function storageKey(assessmentId: string) { return `sugar:extraction-review:${assessmentId}`; }

export function ExtractionReviewClient({ assessmentId }: { assessmentId: string }) {
  const [extraction, setExtraction] = useState<ExtractionEnvelope | null | undefined>(undefined);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    const response = await fetch(`/api/assessments/${assessmentId}/extraction-review`, { cache: "no-store" });
    const payload = await response.json() as ReviewPayload | { error?: string };
    if (!response.ok || !("review" in payload)) throw new Error(("error" in payload && payload.error) || "Unable to load extraction review.");
    setExtraction(payload.extraction);
    setFingerprint(payload.extractionFingerprint);
    setReview(payload.review);
    localStorage.setItem(storageKey(assessmentId), JSON.stringify(payload.review));
    setNotice(payload.stalePersistedReview ? "The persisted extraction changed, so the prior review was invalidated. Review the current candidates again." : null);
  }

  useEffect(() => {
    let active = true;
    void load().catch((caught) => {
      if (!active) return;
      setExtraction(null);
      setReview(null);
      setError(caught instanceof Error ? caught.message : "Unable to load extraction review.");
    });
    return () => { active = false; };
  }, [assessmentId]);

  async function save(next: ExtractionReview) {
    if (!fingerprint) throw new Error("Current extraction version is unavailable. Reload the review.");
    setSaving(true);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/extraction-review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractionFingerprint: fingerprint, review: next })
      });
      const payload = await response.json() as { review?: ExtractionReview; extractionFingerprint?: string; error?: string };
      if (!response.ok || !payload.review) {
        if (response.status === 409) await load();
        throw new Error(payload.error || "Review save failed.");
      }
      setReview(payload.review);
      if (payload.extractionFingerprint) setFingerprint(payload.extractionFingerprint);
      localStorage.setItem(storageKey(assessmentId), JSON.stringify(payload.review));
      setError(null);
      setNotice(null);
    } finally {
      setSaving(false);
    }
  }

  function mutate(operation: () => ExtractionReview) {
    try {
      const next = operation();
      void save(next).catch((caught) => setError(caught instanceof Error ? caught.message : "Review action failed."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Review action failed.");
    }
  }

  const extractionById = useMemo(() => new Map((extraction?.objects ?? []).map((item) => [item.id, item])), [extraction]);
  const progress = review ? review.objects.filter((item) => item.status !== "pending").length : 0;

  if (extraction === undefined) return <p className="lede">Loading persisted extraction review…</p>;
  if (!extraction || !review) return <div className="panel"><h1>Extraction review</h1><p>{error ?? "No persisted extraction is available. Upload and process artifacts first."}</p><a className="button" href={`/assessment/${assessmentId}/upload`}>Upload artifacts</a></div>;

  return <>
    <div className="eyebrow">Assessment · Extraction review</div>
    <h1>Review architecture objects</h1>
    <p className="lede">Resolve every candidate before approving the extraction set for diagnostics. Decisions are persisted server-side and bound to the exact extraction version; source evidence remains attached to the original extraction object.</p>
    <div className="panel">
      <div className={review.approved ? "readiness-ready" : "readiness-review"}><strong>{review.approved ? "Extraction approved" : `${progress} of ${review.objects.length} objects resolved`}</strong><span>{review.approved && review.approvedAt ? `Approved ${new Date(review.approvedAt).toLocaleString()}` : saving ? "Saving review decisions…" : "Confirm, reject, or merge every candidate."}</span></div>
      {notice && <div className="form-warning">{notice}</div>}
      {error && <div className="form-error">{error}</div>}
      <div className="artifact-list">{review.objects.map((item) => {
        const source = extractionById.get(item.id) as ExtractedObject | undefined;
        const mergeTargets = review.objects.filter((candidate) => candidate.id !== item.id && candidate.kind === item.kind && candidate.status !== "rejected" && candidate.status !== "merged");
        return <article className={`inspection-row status-${item.status === "rejected" ? "blocked" : item.status === "pending" ? "review_required" : "validated"}`} key={item.id}>
          <div><strong>{item.displayName}</strong><small>{item.kind} · {source ? Math.round(source.confidence * 100) : "?"}% confidence</small><span className="status-pill">{item.status}</span></div>
          <label><span>Reviewed name</span><input key={`${item.id}:${item.displayName}`} defaultValue={item.displayName} disabled={saving || review.approved || item.status === "merged"} onBlur={(event) => { if (event.currentTarget.value !== item.displayName) mutate(() => renameReviewedObject(review, item.id, event.currentTarget.value)); }} /></label>
          {item.status === "merged" && <p>Merged into <strong>{review.objects.find((candidate) => candidate.id === item.mergedInto)?.displayName ?? item.mergedInto}</strong>.</p>}
          <div className="artifact-actions"><button className="text-button" disabled={saving || review.approved} type="button" onClick={() => mutate(() => setReviewStatus(review, item.id, "confirmed"))}>Confirm</button><button className="text-button" disabled={saving || review.approved} type="button" onClick={() => mutate(() => setReviewStatus(review, item.id, "rejected"))}>Reject</button><button className="text-button" disabled={saving || review.approved} type="button" onClick={() => mutate(() => setReviewStatus(review, item.id, "pending"))}>Reset</button></div>
          {mergeTargets.length > 0 && item.status !== "merged" && <label><span>Merge duplicate into</span><select disabled={saving || review.approved} defaultValue="" onChange={(event) => { if (event.target.value) mutate(() => mergeReviewedObject(review, item.id, event.target.value)); event.currentTarget.value = ""; }}><option value="">Choose same-kind object…</option>{mergeTargets.map((target) => <option key={target.id} value={target.id}>{target.displayName}</option>)}</select></label>}
          {source && <details><summary>Evidence ({source.evidence.length})</summary><div className="artifact-list">{source.evidence.map((evidence) => <div className="artifact-row" key={`${item.id}:${evidence.segmentId}`}><div><strong>{evidence.artifactName}</strong><code>{evidence.locator}</code></div><small>Direct evidence · {evidence.segmentId}</small></div>)}</div></details>}
        </article>;
      })}</div>
      <div className="form-actions"><button className="button" disabled={saving || review.approved || !canApproveExtraction(review)} type="button" onClick={() => mutate(() => approveExtraction(review))}>Approve extraction for diagnostics</button><a className="button button-secondary" href={`/assessment/${assessmentId}/upload`}>Back to evidence</a><a className="button button-secondary" href={`/assessment/${assessmentId}`}>Assessment workspace</a></div>
      {!review.approved && !canApproveExtraction(review) && <p><strong>Approval blocked:</strong> every candidate must be confirmed, rejected, or merged. Diagnostics must not run from unresolved extraction.</p>}
      {review.approved && <p><strong>Approved boundary:</strong> the persisted approval is valid only for this exact extraction fingerprint. Diagnostics may consume confirmed objects plus merge targets; rejected and merged-away candidates remain auditable review history.</p>}
    </div>
  </>;
}
