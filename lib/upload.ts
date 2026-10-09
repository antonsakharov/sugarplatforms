import { PRODUCT_LIMITS } from "@/lib/config";

export const SUPPORTED_ARTIFACT_TYPES = [
  { extensions: [".pdf"], mimeTypes: ["application/pdf"], label: "PDF architecture document" },
  { extensions: [".md", ".txt"], mimeTypes: ["text/markdown", "text/plain", "application/octet-stream"], label: "Markdown or text" },
  { extensions: [".json"], mimeTypes: ["application/json", "text/json", "application/octet-stream"], label: "JSON / JSON Schema / OpenAPI" },
  { extensions: [".yaml", ".yml"], mimeTypes: ["application/yaml", "text/yaml", "text/x-yaml", "application/x-yaml", "application/octet-stream"], label: "YAML / OpenAPI" },
  { extensions: [".csv"], mimeTypes: ["text/csv", "application/csv", "application/vnd.ms-excel", "application/octet-stream"], label: "CSV inventory or dictionary" },
  { extensions: [".sql"], mimeTypes: ["application/sql", "text/sql", "text/plain", "application/octet-stream"], label: "SQL DDL" }
] as const;

export type ArtifactValidation = {
  name: string;
  size: number;
  type: string;
  accepted: boolean;
  errors: string[];
};

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function isSupportedArtifact(name: string, mimeType: string) {
  const extension = extensionOf(name);
  return SUPPORTED_ARTIFACT_TYPES.some(
    (type) => type.extensions.includes(extension as never) && type.mimeTypes.includes((mimeType || "application/octet-stream") as never)
  );
}

export function validateArtifactMetadata(file: Pick<File, "name" | "size" | "type">): ArtifactValidation {
  const errors: string[] = [];
  if (file.size <= 0) errors.push("File is empty.");
  if (file.size > PRODUCT_LIMITS.maxFileBytes) errors.push(`File exceeds ${PRODUCT_LIMITS.maxFileMegabytes} MB.`);
  if (!isSupportedArtifact(file.name, file.type)) errors.push("Unsupported file type or extension.");
  return { name: file.name, size: file.size, type: file.type || "application/octet-stream", accepted: errors.length === 0, errors };
}

export function validateArtifactSet(files: Array<Pick<File, "name" | "size" | "type">>) {
  const setErrors: string[] = [];
  if (files.length === 0) setErrors.push("Choose at least one architecture artifact.");
  if (files.length > PRODUCT_LIMITS.maxFiles) setErrors.push(`Choose no more than ${PRODUCT_LIMITS.maxFiles} files.`);
  const artifacts = files.map(validateArtifactMetadata);
  return { accepted: setErrors.length === 0 && artifacts.every((artifact) => artifact.accepted), setErrors, artifacts };
}

export const ACCEPT_ATTRIBUTE = SUPPORTED_ARTIFACT_TYPES.flatMap((type) => [...type.extensions]).join(",");
