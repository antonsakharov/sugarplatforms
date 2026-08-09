"use client";

import { useEffect, useState } from "react";
import type { AssessmentDraft } from "@/lib/assessment";

type ArtifactSummary = { name: string; size: number; type: string; status: "validated" | "review_required" | "blocked" };
type Readiness = { readyForAnalysis: boolean; totalPages: number; warningCount: number; unmeasurableFiles: number };

export function AssessmentWorkspace({ id }: { id: string }) {
  const [assessment, setAssessment] = useState<AssessmentDraft | null | undefined>(undefined);
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`sugar:assessment:${id}`);
    const artifactRaw = localStorage.getItem(`sugar:artifacts:${id}`);
    const readinessRaw = localStorage.getItem(`sugar:readiness:${id}`);
    setAssessment(raw ? JSON.parse(raw) : null);
    setArtifacts(artifactRaw ? JSON.parse(artifactRaw) : []);
    setReadiness(readinessRaw ? JSON.parse(readinessRaw) : null);
  }, [id]);

  if (assessment === undefined) return <p className="lede">Loading assessment…</p>;
  if (!assessment) return <div className="panel"><h2>Assessment not found</h2><p>This local demo draft is not available in this browser.</p><a className="button" href="/assessment/new">Create assessment</a></div>;

  return <>
    <div className="eyebrow">Draft assessment</div>
    <h1>{assessment.assessmentTitle}</h1>
    <p className="lede">{assessment.companyName} · Primary entity: <strong>{assessment.primaryEntity}</strong></p>
    <div className="workspace-grid">
      <article className="card"><span className="card-number">01</span><h3>Scope confirmed</h3><p>{assessment.businessConcern}</p></article>
      <article className="card current-step"><span className="card-number">02</span><h3>Upload readiness</h3><p>{readiness?.readyForAnalysis ? `${artifacts.length} artifacts ready · ${readiness.totalPages} pages.` : artifacts.length > 0 ? "Artifact set requires review." : "Add and validate a focused architecture artifact set."}</p></article>
      <article className="card"><span className="card-number">03</span><h3>Extract & review</h3><p>Systems, entities, identifiers, integrations, capabilities, and owners.</p></article>
      <article className="card"><span className="card-number">04</span><h3>Diagnose & report</h3><p>Evidence-backed findings, entity/ID map, recommendations, and executive report.</p></article>
    </div>
    <div className="panel"><h2>{readiness?.readyForAnalysis ? "Artifact set ready for parsing" : artifacts.length > 0 ? "Artifact review required" : "Ready for artifacts"}</h2><p>{readiness?.readyForAnalysis ? "Upload policy checks passed. The next product slice will parse these artifacts into source-addressable evidence." : artifacts.length > 0 ? "Return to the upload step to remove or replace flagged artifacts." : "Upload architecture metadata for server-side count, size, type, duplicate, page, and content-risk validation."}</p><a className="button" href={`/assessment/${id}/upload`}>{artifacts.length > 0 ? "Review artifacts" : "Upload artifacts"}</a></div>
  </>;
}
