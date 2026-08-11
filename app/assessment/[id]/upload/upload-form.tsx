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
type SourceSegment = { id: string; title?: string; locator: { type: string; value: string }; content: string };
type ParsedArtifact = { artifactId: string; artifactName: string; parser: string; sourceSegments: SourceSegment[]; warnings: string[]; stats: { segmentCount: number; characterCount: number } };
type ProcessingArtifact = { artifactName: string; status: "parsed" | "failed" | "withheld"; parser?: string; segmentCount?: number; warnings?: string[]; message?: string };
type Parsing = { status: "ready" | "partial" | "withheld"; parsedArtifacts: ParsedArtifact[]; processingArtifacts: ProcessingArtifact[]; errors: Array<{ artifactName: string; message: string }>; segmentCount: number };

export function UploadForm({ assessmentId }: { assessmentId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [artifacts, setArtifacts] = useState<ValidatedArtifact[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [parsing, setParsing] = useState<Parsing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const replacementIndex = useRef<number | null>(null);

  useEffect(() => {
    const storedArtifacts = localStorage.getItem(`sugar:artifacts:${assessmentId}`);
    const storedReadiness = localStorage.getItem(`sugar:readiness:${assessmentId}`);
    const storedParsing = localStorage.getItem(`sugar:parsing:${assessmentId}`);
    if (storedArtifacts) setArtifacts(JSON.parse(storedArtifacts));
    if (storedReadiness) setReadiness(JSON.parse(storedReadiness));
    if (storedParsing) setParsing(JSON.parse(storedParsing));
  }, [assessmentId]);

  const clientWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (files.length > MAX_FILES) warnings.push(`Select no more than ${MAX_FILES} files.`);
    files.forEach((file) => { if (file.size > MAX_FILE_BYTES) warnings.push(`${file.name} exceeds 25 MB.`); });
    return warnings;
  }, [files]);

  function resetValidatedState() {
    setArtifacts([]); setReadiness(null); setParsing(null); setError(null);
    localStorage.removeItem(`sugar:artifacts:${assessmentId}`);
    localStorage.removeItem(`sugar:readiness:${assessmentId}`);
    localStorage.removeItem(`sugar:parsing:${assessmentId}`);
  }
  function removeFile(index: number) { setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)); resetValidatedState(); }
  function replaceFile(index: number, replacement: File | null) {
    if (!replacement) return;
    setFiles((current) => current.map((file, itemIndex) => itemIndex === index ? replacement : file));
    resetValidatedState();
  }

  async function validateUploads() {
    setSubmitting(true); setError(null); setArtifacts([]); setReadiness(null); setParsing(null);
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
      setArtifacts(payload.artifacts); setReadiness(payload.readiness); setParsing(payload.parsing ?? null);
      localStorage.setItem(`sugar:artifacts:${assessmentId}`, JSON.stringify(payload.artifacts));
      localStorage.setItem(`sugar:readiness:${assessmentId}`, JSON.stringify(payload.readiness));
      if (payload.parsing) localStorage.setItem(`sugar:parsing:${assessmentId}`, JSON.stringify(payload.parsing));
    } catch { setError("Upload validation could not be completed. Try again."); }
    finally { setSubmitting(false); }
  }

  return <>
    <div className="eyebrow">Assessment · Upload artifacts</div><h1>Add architecture evidence</h1>
    <p className="lede">Files are inspected transiently for type, size, duplicate content, page limits, and probable sensitive content. Ready text, Markdown, JSON/YAML/OpenAPI, CSV, SQL DDL, and directly readable PDF artifacts are converted into source-addressable evidence segments. Uploaded bytes are not persisted in demo mode.</p>
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
      {parsing && <div className="inspection-results"><h3>Processing status</h3><div className="artifact-list">{parsing.processingArtifacts?.map((item) => <article className={`inspection-row status-${item.status === "failed" ? "blocked" : item.status === "withheld" ? "review_required" : "validated"}`} key={item.artifactName}><strong>{item.artifactName}</strong><span className="status-pill">{item.status}</span><small>{item.status === "parsed" ? `${item.parser} · ${item.segmentCount ?? 0} segments` : item.message}</small>{item.warnings?.map((warning) => <p key={warning}>{warning}</p>)}</article>)}</div>{parsing.status !== "withheld" && <><h3>Evidence inventory</h3><p>{parsing.segmentCount} source-addressable segment{parsing.segmentCount === 1 ? "" : "s"} created from {parsing.parsedArtifacts.length} parsed artifact{parsing.parsedArtifacts.length === 1 ? "" : "s"}.</p>{parsing.parsedArtifacts.map((artifact) => <details className="inspection-row" open key={artifact.artifactId}><summary><strong>{artifact.artifactName}</strong><span>{artifact.parser} · {artifact.stats.segmentCount} segments</span></summary><div className="artifact-list">{artifact.sourceSegments.map((segment) => <article className="artifact-row" key={segment.id}><div><strong>{segment.title ?? `Segment ${segment.id.split(":").at(-1)}`}</strong><code>{segment.locator.value}</code></div><p>{segment.content.slice(0, 320)}{segment.content.length > 320 ? "…" : ""}</p></article>)}</div></details>)}{parsing.errors.length > 0 && <div className="form-error">{parsing.errors.map((item) => `${item.artifactName}: ${item.message}`).join(" ")}</div>}</>}</div>}
      <div className="form-actions"><button className="button" type="button" disabled={files.length === 0 || clientWarnings.length > 0 || submitting} onClick={validateUploads}>{submitting ? "Inspecting…" : "Validate & parse"}</button>
        {artifacts.length > 0 && <button className="button button-secondary" type="button" onClick={() => { setFiles([]); resetValidatedState(); }}>Replace artifact set</button>}
        <a className="button button-secondary" href={`/assessment/${assessmentId}`}>Back to assessment</a></div>
    </div>
  </>;
}
