"use client";

import { useEffect, useState } from "react";
import type { AssessmentDraft } from "@/lib/assessment";

type ArtifactSummary = { name: string; size: number; type: string; status: "validated" };

export function AssessmentWorkspace({ id }: { id: string }) {
  const [assessment, setAssessment] = useState<AssessmentDraft | null | undefined>(undefined);
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(`sugar:assessment:${id}`);
    const artifactRaw = localStorage.getItem(`sugar:artifacts:${id}`);
    setAssessment(raw ? JSON.parse(raw) : null);
    setArtifacts(artifactRaw ? JSON.parse(artifactRaw) : []);
  }, [id]);

  if (assessment === undefined) return <p className="lede">Loading assessment…</p>;
  if (!assessment) {
    return <div className="panel"><h2>Assessment not found</h2><p>This local demo draft is not available in this browser.</p><a className="button" href="/assessment/new">Create assessment</a></div>;
  }

  return (
    <>
      <div className="eyebrow">Draft assessment</div>
      <h1>{assessment.assessmentTitle}</h1>
      <p className="lede">{assessment.companyName} · Primary entity: <strong>{assessment.primaryEntity}</strong></p>
      <div className="workspace-grid">
        <article className="card"><span className="card-number">01</span><h3>Scope confirmed</h3><p>{assessment.businessConcern}</p></article>
        <article className="card current-step"><span className="card-number">02</span><h3>Upload artifacts</h3><p>{artifacts.length > 0 ? `${artifacts.length} artifact${artifacts.length === 1 ? "" : "s"} validated.` : "Add and validate a focused architecture artifact set."}</p></article>
        <article className="card"><span className="card-number">03</span><h3>Extract & review</h3><p>Systems, entities, identifiers, integrations, capabilities, and owners.</p></article>
        <article className="card"><span className="card-number">04</span><h3>Diagnose & report</h3><p>Evidence-backed findings, entity/ID map, recommendations, and executive report.</p></article>
      </div>
      <div className="panel"><h2>{artifacts.length > 0 ? "Artifact validation started" : "Ready for artifacts"}</h2><p>{artifacts.length > 0 ? "Validated metadata is saved in the local demo adapter. Uploaded content itself is not persisted yet." : "Upload architecture metadata for server-side file count, size, and type validation."}</p><a className="button" href={`/assessment/${id}/upload`}>{artifacts.length > 0 ? "Review artifacts" : "Upload artifacts"}</a></div>
    </>
  );
}
