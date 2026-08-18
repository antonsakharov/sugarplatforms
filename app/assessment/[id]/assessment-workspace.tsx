"use client";

import { useEffect, useState } from "react";
import type { AssessmentDraft } from "@/lib/assessment";

type ArtifactSummary = { name: string; size: number; type: string; status: "validated" | "review_required" | "blocked" };
type Readiness = { readyForAnalysis: boolean; totalPages: number; warningCount: number; unmeasurableFiles: number };
type Extraction = { stats: { objectCount: number } };
type Review = { approved: boolean; objects: Array<{ status: "pending" | "confirmed" | "rejected" | "merged" }> };
type Diagnostics = { stats: { findingCount: number; ruleCount: number } };
type FindingReview = { reviewedAt?: string; findings: Array<{ status: "pending" | "accepted" | "rejected" }> };

export function AssessmentWorkspace({ id }: { id: string }) {
  const [assessment, setAssessment] = useState<AssessmentDraft | null | undefined>(undefined);
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [findingReview, setFindingReview] = useState<FindingReview | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`sugar:assessment:${id}`);
    setAssessment(raw ? JSON.parse(raw) : null);
    const artifactRaw = localStorage.getItem(`sugar:artifacts:${id}`);
    const readinessRaw = localStorage.getItem(`sugar:readiness:${id}`);
    const extractionRaw = localStorage.getItem(`sugar:extraction:${id}`);
    const reviewRaw = localStorage.getItem(`sugar:extraction-review:${id}`);
    const diagnosticsRaw = localStorage.getItem(`sugar:diagnostics:${id}`);
    const findingReviewRaw = localStorage.getItem(`sugar:finding-review:${id}`);
    setArtifacts(artifactRaw ? JSON.parse(artifactRaw) : []);
    setReadiness(readinessRaw ? JSON.parse(readinessRaw) : null);
    setExtraction(extractionRaw ? JSON.parse(extractionRaw) : null);
    setReview(reviewRaw ? JSON.parse(reviewRaw) : null);
    setDiagnostics(diagnosticsRaw ? JSON.parse(diagnosticsRaw) : null);
    setFindingReview(findingReviewRaw ? JSON.parse(findingReviewRaw) : null);
  }, [id]);

  if (assessment === undefined) return <p className="lede">Loading assessment…</p>;
  if (!assessment) return <div className="panel"><h2>Assessment not found</h2><p>This local demo draft is not available in this browser.</p><a className="button" href="/assessment/new">Create assessment</a></div>;

  const resolved = review?.objects.filter((item) => item.status !== "pending").length ?? 0;
  const extractedCount = extraction?.stats.objectCount ?? 0;
  const findingsComplete = Boolean(findingReview?.reviewedAt);
  const acceptedCount = findingReview?.findings.filter((item) => item.status === "accepted").length ?? 0;

  return <>
    <div className="eyebrow">Draft assessment</div>
    <h1>{assessment.assessmentTitle}</h1>
    <p className="lede">{assessment.companyName} · Primary entity: <strong>{assessment.primaryEntity}</strong></p>
    <div className="workspace-grid">
      <article className="card"><span className="card-number">01</span><h3>Scope confirmed</h3><p>{assessment.businessConcern}</p></article>
      <article className="card"><span className="card-number">02</span><h3>Upload & parse</h3><p>{readiness?.readyForAnalysis ? `${artifacts.length} artifacts processed · ${readiness.totalPages} pages.` : artifacts.length > 0 ? "Artifact set requires review." : "Add and validate a focused architecture artifact set."}</p></article>
      <article className={`card ${extraction && !review?.approved ? "current-step" : ""}`}><span className="card-number">03</span><h3>Extract & review</h3><p>{review?.approved ? `${extractedCount} candidates reviewed and approved.` : extraction ? `${resolved} of ${extractedCount} candidates resolved.` : "Systems, entities, identifiers, integrations, capabilities, and owners."}</p></article>
      <article className={`card ${review?.approved && !findingsComplete ? "current-step" : ""}`}><span className="card-number">04</span><h3>Diagnose & review</h3><p>{findingsComplete ? `${acceptedCount} accepted finding${acceptedCount === 1 ? "" : "s"} ready for downstream outputs.` : diagnostics ? `${diagnostics.stats.findingCount} evidence-backed finding${diagnostics.stats.findingCount === 1 ? "" : "s"} from ${diagnostics.stats.ruleCount} deterministic rules.` : review?.approved ? "Extraction approved; deterministic diagnostics are ready." : "Evidence-backed findings and human decisions."}</p></article>
      <article className={`card ${findingsComplete ? "current-step" : ""}`}><span className="card-number">05</span><h3>Entity/ID map</h3><p>{findingsComplete ? "Reviewed identity, identifier, system, integration, and accepted-finding relationships are ready to inspect." : "Complete finding review to unlock the evidence-backed map."}</p></article>
      <article className={`card ${findingsComplete ? "current-step" : ""}`}><span className="card-number">06</span><h3>Report</h3><p>{findingsComplete ? "Generate focused maturity, prioritized recommendations, a 90-day plan, and an accepted-findings-only executive preview." : "Complete finding review before downstream reporting."}</p></article>
    </div>
    <div className="panel"><h2>{findingsComplete ? "Entity/ID map ready" : diagnostics ? "Deterministic findings available" : review?.approved ? "Extraction approved" : extraction ? "Architecture candidates ready for review" : readiness?.readyForAnalysis ? "Evidence ready for extraction" : artifacts.length > 0 ? "Artifact review required" : "Ready for artifacts"}</h2><p>{findingsComplete ? "The map consumes only confirmed extraction objects and accepted findings from the completed review." : diagnostics ? "Inspect evidence, edit presentation language if needed, and accept or reject every finding before downstream outputs." : review?.approved ? "The reviewed extraction set can now run evidence-backed deterministic diagnostics." : extraction ? "Review every extracted object and explicitly confirm, reject, merge, or rename it before analysis." : "Upload architecture metadata for validation, parsing, and evidence-linked extraction."}</p><a className="button" href={findingsComplete ? `/assessment/${id}/map` : diagnostics || review?.approved ? `/assessment/${id}/diagnostics` : extraction ? `/assessment/${id}/review` : `/assessment/${id}/upload`}>{findingsComplete ? "Open entity/ID map" : diagnostics ? "Review findings" : review?.approved ? "Run diagnostics" : extraction ? "Review extraction" : artifacts.length > 0 ? "Review artifacts" : "Upload artifacts"}</a></div>
  </>;
}
