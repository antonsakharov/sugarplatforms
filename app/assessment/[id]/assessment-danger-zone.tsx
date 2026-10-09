"use client";

import { useState } from "react";

export function AssessmentDangerZone({ id, title }: { id: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "deleting" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function deleteAssessment() {
    const confirmed = window.confirm(`Permanently delete “${title}”? Private artifacts, processing state, reviews, findings, and saved reports will be removed. Audit receipts are retained.`);
    if (!confirmed) return;
    setStatus("deleting");
    setMessage("");
    try {
      const response = await fetch(`/api/assessments/${id}`, { method: "DELETE", cache: "no-store" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Deletion failed.");
      for (const key of Object.keys(localStorage)) if (key.endsWith(`:${id}`)) localStorage.removeItem(key);
      window.location.assign("/");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Deletion failed.");
    }
  }

  return <div className="panel">
    <h2>Danger zone</h2>
    <p>Administrators can permanently delete this assessment and its private persisted artifacts. Audit receipts remain tenant-scoped for accountability.</p>
    <div className="form-actions">
      <button className="button button-secondary" type="button" disabled={status === "deleting"} onClick={() => void deleteAssessment()}>
        {status === "deleting" ? "Deleting assessment…" : "Delete assessment"}
      </button>
    </div>
    {status === "failed" && <p role="alert">{message}</p>}
  </div>;
}
