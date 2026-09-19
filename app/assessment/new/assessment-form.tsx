"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FOCUS_AREAS, type AssessmentDraft } from "@/lib/assessment";

const labels: Record<(typeof FOCUS_AREAS)[number], string> = {
  "entity-identifier-fragmentation": "Entity & identifier fragmentation",
  "system-integration-complexity": "System & integration complexity",
  "duplicated-platform-capabilities": "Duplicated platform capabilities",
  "ownership-governance-gaps": "Ownership & governance gaps",
  "api-data-contract-inconsistency": "API & data-contract inconsistency",
  "general-platform-diagnostic": "General platform diagnostic"
};

export function AssessmentForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      companyName: form.get("companyName"),
      assessmentTitle: form.get("assessmentTitle"),
      industry: form.get("industry"),
      focusArea: form.get("focusArea"),
      primaryEntity: form.get("primaryEntity"),
      knownSystems: form.get("knownSystems"),
      businessConcern: form.get("businessConcern"),
      reportAudience: form.get("reportAudience"),
      limitsAcknowledged: form.get("limitsAcknowledged") === "on"
    };

    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not create assessment.");
      const assessment = body.assessment as AssessmentDraft;
      // Compatibility cache only; the server response is already durably persisted.
      localStorage.setItem(`sugar:assessment:${assessment.id}`, JSON.stringify(assessment));
      localStorage.setItem("sugar:active-assessment", assessment.id);
      router.push(`/assessment/${assessment.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create assessment.");
      setSubmitting(false);
    }
  }

  return (
    <form className="assessment-form" onSubmit={onSubmit}>
      <div className="form-grid">
        <label><span>Company / workspace</span><input name="companyName" required minLength={2} maxLength={120} placeholder="Acme HealthTech" /></label>
        <label><span>Assessment title</span><input name="assessmentTitle" required minLength={3} maxLength={160} placeholder="Customer identity platform diagnostic" /></label>
        <label><span>Industry</span><input name="industry" required minLength={2} maxLength={100} placeholder="Healthcare technology" /></label>
        <label><span>Report audience</span><input name="reportAudience" required minLength={2} maxLength={200} placeholder="CTO and platform leadership" /></label>
      </div>
      <fieldset>
        <legend>Diagnostic focus</legend>
        <p className="field-help">Choose one focus area for this limited assessment.</p>
        <div className="radio-grid">
          {FOCUS_AREAS.map((focus, index) => (
            <label className="choice-card" key={focus}>
              <input type="radio" name="focusArea" value={focus} defaultChecked={index === 0} />
              <span><strong>{labels[focus]}</strong>{focus === "entity-identifier-fragmentation" && <small>Recommended for the first release</small>}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label><span>Primary business entity</span><input name="primaryEntity" required minLength={2} maxLength={120} placeholder="Customer, Account, Merchant, Patient..." /><small>Only one primary entity is analyzed in the MVP.</small></label>
      <label><span>Known systems (optional)</span><textarea name="knownSystems" maxLength={2000} rows={3} placeholder="CRM, identity service, billing, data warehouse..." /></label>
      <label><span>Business concern / diagnostic question</span><textarea name="businessConcern" required minLength={10} maxLength={3000} rows={5} placeholder="Why do teams disagree on the canonical customer identifier, and which system should own identity?" /></label>
      <label className="acknowledgement"><input type="checkbox" name="limitsAcknowledged" required /><span>I will upload architecture metadata only: no customer or patient records, credentials, secrets, access tokens, payment data, or raw production datasets.</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button" type="submit" disabled={submitting}>{submitting ? "Creating assessment…" : "Create assessment"}</button></div>
    </form>
  );
}
