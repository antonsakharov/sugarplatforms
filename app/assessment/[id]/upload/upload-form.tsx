"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/lib/upload";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type RiskWarning = { category: string; code: string; message: string };
type ValidatedArtifact = {
  name: string; size: number; type: string; status: "validated" | "review_required" | "blocked"; errors: string[];
  checksumSha256: string; pageEstimate: { pages: number | null; method: string; confidence: string };
  riskWarnings: RiskWarning[]; scanCoverage: string;
};
type Readiness = { status: "ready" | "review_required"; readyForAnalysis: boolean; totalPages: number; unmeasurableFiles: number; warningCount: number; message: string };

export function UploadForm({ assessmentId }: { assessmentId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [artifacts, setArtifacts] = useState<ValidatedArtifact[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const replacementIndex = useRef<number | null>(null);

  useEffect(() => {
    const storedArtifacts = localStorage.getItem(`sugar:artifacts:${assessmentId}`);
    const storedReadiness = localStorage.getItem(`sugar:readiness:${assessmentId}`);
    if (storedArtifacts) setArtifacts(JSON.parse(storedArtifacts));
    if (storedReadiness) setReadiness(JSON.parse(storedReadiness));
  }, [assessmentId]);

  const clientWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (files.length > MAX_FILES) warnings.push(`Select no more than ${MAX_FILES} files.`);
    files.forEach((file) => { if (file.size > MAX_FILE_BYTES) warnings.push(`${file.name} exceeds 25 MB.`); });
    return warnings;
  }, [files]);

  function resetValidatedState() {
    setArtifacts([]); setReadiness(null); setError(null);
    localStorage.removeItem(`sugar:artifacts:${assessmentId}`);
    localStorage.removeItem(`sugar:readiness:${assessmentId}`);
  }
  function removeFile(index: number) { setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)); resetValidatedState(); }
  function replaceFile(index: number, replacement: File | null) {
    if (!replacement) return;
    setFiles((current) => current.map((file, itemIndex) => itemIndex === index ? replacement : file));
    resetValidatedState();
  }

  async function validateUploads() {
    setSubmitting(true); setError(null); setArtifacts([]); setReadiness(null);
    const body = new FormData(); files.forEach((file) => body.append("files", file));
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/artifacts`, { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) {
        setArtifacts(payload.artifacts ?? []);
        const messages = [payload.error, ...(payload.setErrors ?? []), ...(payload.artifacts ?? []).flatMap((item: { errors?: string[] }) => item.errors ?? [])].filter(Boolean);
        setError(messages.join(" ") || "Upload validation failed.");
        return;
      }
      setArtifacts(payload.artifacts); setReadiness(payload.readiness);
      localStorage.setItem(`sugar:artifacts:${assessmentId}`, JSON.stringify(payload.artifacts));
      localStorage.setItem(`sugar:readiness:${assessmentId}`, JSON.stringify(payload.readiness));
    } catch { setError("Upload validation could not be completed. Try again."); }
    finally { setSubmitting(false); }
  }

  return <>
    <div className="eyebrow">Assessment · Upload artifacts</div><h1>Add architecture evidence</h1>
    <p className="lede">Files are inspected transiently for type, size, duplicate content, page limits, and probable sensitive content. Uploaded bytes are not persisted in demo mode.</p>
    <div className="upload-warning"><strong>Architecture metadata only.</strong> Do not upload customer or patient records, production data, passwords, API keys, tokens, private keys, or other secrets. Automated scanning is best-effort and cannot guarantee detection.</div>
    <div className="panel upload-panel">
      <label className="drop-zone"><span><strong>Choose architecture artifacts</strong><small>PDF, Markdown/text, JSON/YAML, CSV, or SQL DDL · up to 10 files · 25 MB each · 150 pages total where measurable</small></span>
        <input type="file" multiple accept={ACCEPT_ATTRIBUTE} onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); resetValidatedState(); }} />
      </label>
      {files.length > 0 && <div className="artifact-list">{files.map((file, index) => <div className="artifact-row" key={`${file.name}-${file.lastModified}-${index}`}>
        <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "unknown type"}</small></div>
        <div className="artifact-actions"><label className="text-button">Replace<input className="visually-hidden" type="file" accept={ACCEPT_ATTRIBUTE} onClick={() => { replacementIndex.current = index; }} onChange={(event) => replaceFile(replacementIndex.current ?? index, event.target.files?.[0] ?? null)} /></label><button className="text-button" type="button" onClick={() => removeFile(index)}>Remove</button></div>
      </div>)}</div>}
      {clientWarnings.length > 0 && <div className="form-error">{clientWarnings.join(" ")}</div>}{error && <div className="form-error">{error}</div>}
      {artifacts.length > 0 && <div className="inspection-results"><h3>Readiness checks</h3>{artifacts.map((artifact) => <article className={`inspection-row status-${artifact.status}`} key={artifact.checksumSha256 || artifact.name}>
        <div><strong>{artifact.name}</strong><small>SHA-256 {artifact.checksumSha256 ? artifact.checksumSha256.slice(0, 12) + "…" : "not available"} · {artifact.pageEstimate?.pages ?? "?"} page{artifact.pageEstimate?.pages === 1 ? "" : "s"} · {artifact.pageEstimate?.confidence ?? "unknown"} confidence</small></div>
        <span className="status-pill">{artifact.status.replace("_", " ")}</span>
        {artifact.riskWarnings?.length > 0 && <ul>{artifact.riskWarnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}</ul>}
      </article>)}</div>}
      {readiness && <div className={readiness.readyForAnalysis ? "readiness-ready" : "readiness-review"}><strong>{readiness.readyForAnalysis ? "Ready for analysis" : "Review required"}</strong><span>{readiness.totalPages} measurable pages · {readiness.warningCount} content warning{readiness.warningCount === 1 ? "" : "s"} · {readiness.unmeasurableFiles} unmeasurable file{readiness.unmeasurableFiles === 1 ? "" : "s"}</span><p>{readiness.message}</p></div>}
      <div className="form-actions"><button className="button" type="button" disabled={files.length === 0 || clientWarnings.length > 0 || submitting} onClick={validateUploads}>{submitting ? "Inspecting…" : "Validate readiness"}</button>
        {artifacts.length > 0 && <button className="button button-secondary" type="button" onClick={() => { setFiles([]); resetValidatedState(); }}>Replace artifact set</button>}
        <a className="button button-secondary" href={`/assessment/${assessmentId}`}>Back to assessment</a></div>
    </div>
  </>;
}
