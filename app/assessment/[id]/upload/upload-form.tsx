"use client";

import { useMemo, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/lib/upload";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type ValidatedArtifact = { name: string; size: number; type: string; status: "validated" };

export function UploadForm({ assessmentId }: { assessmentId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [artifacts, setArtifacts] = useState<ValidatedArtifact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clientWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (files.length > MAX_FILES) warnings.push(`Select no more than ${MAX_FILES} files.`);
    files.forEach((file) => {
      if (file.size > MAX_FILE_BYTES) warnings.push(`${file.name} exceeds 25 MB.`);
    });
    return warnings;
  }, [files]);

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setArtifacts([]);
    setError(null);
  }

  async function validateUploads() {
    setSubmitting(true);
    setError(null);
    setArtifacts([]);
    const body = new FormData();
    files.forEach((file) => body.append("files", file));

    try {
      const response = await fetch(`/api/assessments/${assessmentId}/artifacts`, { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) {
        const messages = [payload.error, ...(payload.setErrors ?? []), ...(payload.artifacts ?? []).flatMap((item: { errors?: string[] }) => item.errors ?? [])].filter(Boolean);
        setError(messages.join(" ") || "Upload validation failed.");
        return;
      }
      setArtifacts(payload.artifacts);
      localStorage.setItem(`sugar:artifacts:${assessmentId}`, JSON.stringify(payload.artifacts));
    } catch {
      setError("Upload validation could not be completed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="eyebrow">Assessment · Upload artifacts</div>
      <h1>Add architecture evidence</h1>
      <p className="lede">Upload a focused set of architecture metadata. Files are validated by the server and are not persisted in the demo adapter.</p>

      <div className="upload-warning"><strong>Architecture metadata only.</strong> Do not upload customer or patient records, production data, passwords, API keys, tokens, private keys, or other secrets.</div>

      <div className="panel upload-panel">
        <label className="drop-zone">
          <span><strong>Choose architecture artifacts</strong><small>PDF, Markdown/text, JSON/YAML, CSV, or SQL DDL · up to 10 files · 25 MB each</small></span>
          <input
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            onChange={(event) => {
              setFiles(Array.from(event.target.files ?? []));
              setArtifacts([]);
              setError(null);
            }}
          />
        </label>

        {files.length > 0 && <div className="artifact-list">{files.map((file, index) => (
          <div className="artifact-row" key={`${file.name}-${file.lastModified}`}>
            <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "unknown type"}</small></div>
            <button className="text-button" type="button" onClick={() => removeFile(index)}>Remove</button>
          </div>
        ))}</div>}

        {clientWarnings.length > 0 && <div className="form-error">{clientWarnings.join(" ")}</div>}
        {error && <div className="form-error">{error}</div>}
        {artifacts.length > 0 && <div className="validation-success"><strong>{artifacts.length} artifact{artifacts.length === 1 ? "" : "s"} validated.</strong><span>Content is not stored in demo mode. The next slice adds duplicate, page-count, and probable-secret checks.</span></div>}

        <div className="form-actions">
          <button className="button" type="button" disabled={files.length === 0 || clientWarnings.length > 0 || submitting} onClick={validateUploads}>{submitting ? "Validating…" : "Validate artifacts"}</button>
          <a className="button button-secondary" href={`/assessment/${assessmentId}`}>Back to assessment</a>
        </div>
      </div>
    </>
  );
}
