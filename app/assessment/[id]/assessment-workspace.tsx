"use client";

import { useEffect, useState } from "react";
import type { AssessmentDraft } from "@/lib/assessment";

export function AssessmentWorkspace({ id }: { id: string }) {
  const [assessment, setAssessment] = useState<AssessmentDraft | null | undefined>(undefined);

  useEffect(() => {
    const raw = localStorage.getItem(`sugar:assessment:${id}`);
    setAssessment(raw ? JSON.parse(raw) : null);
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
        <article className="card current-step"><span className="card-number">02</span><h3>Upload artifacts</h3><p>The guided upload and validation workflow is the next build slice.</p></article>
        <article className="card"><span className="card-number">03</span><h3>Extract & review</h3><p>Systems, entities, identifiers, integrations, capabilities, and owners.</p></article>
        <article className="card"><span className="card-number">04</span><h3>Diagnose & report</h3><p>Evidence-backed findings, entity/ID map, recommendations, and executive report.</p></article>
      </div>
      <div className="panel"><h2>Ready for artifacts</h2><p>Assessment scope is saved in the local demo adapter. The next feature will accept and validate a limited architecture artifact set.</p><button className="button" disabled>Upload artifacts — next</button></div>
    </>
  );
}
