"use client";

import { useState } from "react";

export function SampleLauncher() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function launch() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sample/acme-healthtech", { method: "POST", cache: "no-store" });
      const body = await response.json() as { assessment?: { id: string }; error?: string };
      if (!response.ok || !body.assessment) throw new Error(body.error ?? "Sample initialization failed.");
      window.location.assign(`/assessment/${body.assessment.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sample initialization failed.");
      setLoading(false);
    }
  }

  return (
    <div className="form-actions">
      <button className="button" type="button" onClick={launch} disabled={loading}>{loading ? "Preparing sample…" : "Launch guided sample"}</button>
      <a className="button button-secondary" href="/assessment/new">Create my own assessment</a>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
