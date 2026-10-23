import { createHash } from "node:crypto";

export type PageEstimate = {
  pages: number | null;
  method: "pdf-page-objects" | "text-page-equivalent" | "unmeasurable";
  confidence: "high" | "medium" | "low";
};

export type RiskWarning = {
  category: "probable-secret" | "prohibited-data";
  code: string;
  message: string;
};

export type ContentInspection = {
  checksumSha256: string;
  pageEstimate: PageEstimate;
  riskWarnings: RiskWarning[];
  scanCoverage: "full-text" | "pdf-best-effort";
};

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".sql"]);
const SECRET_PATTERNS: Array<{ code: string; pattern: RegExp; message: string }> = [
  { code: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, message: "Possible private key detected." },
  { code: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/, message: "Possible AWS access key detected." },
  { code: "bearer-token", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i, message: "Possible bearer token detected." },
  { code: "credential-assignment", pattern: /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|passwd)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}/i, message: "Possible credential or secret assignment detected." }
];
const PROHIBITED_PATTERNS: Array<{ code: string; pattern: RegExp; message: string }> = [
  { code: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/, message: "Possible Social Security number detected." },
  { code: "regulated-record-fields", pattern: /\b(?:patient|customer|cardholder)[ _-]?(?:name|email|phone|address|date[_ -]?of[_ -]?birth|dob|record)\b/i, message: "Possible customer or regulated-record fields detected." },
  { code: "medical-record", pattern: /\b(?:medical[_ -]?record[_ -]?(?:number|id)|mrn)\b/i, message: "Possible medical-record identifier detected." }
];

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function estimatePageCount(name: string, bytes: Uint8Array): PageEstimate {
  const extension = extensionOf(name);
  if (extension === ".pdf") {
    const raw = Buffer.from(bytes).toString("latin1");
    const count = raw.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
    return count > 0
      ? { pages: count, method: "pdf-page-objects", confidence: "high" }
      : { pages: null, method: "unmeasurable", confidence: "low" };
  }
  if (TEXT_EXTENSIONS.has(extension)) {
    const text = Buffer.from(bytes).toString("utf8");
    const lines = text.length === 0 ? 0 : text.split(/\r?\n/).length;
    const pageEquivalent = Math.max(1, Math.ceil(Math.max(text.length / 3000, lines / 55)));
    return { pages: pageEquivalent, method: "text-page-equivalent", confidence: "medium" };
  }
  return { pages: null, method: "unmeasurable", confidence: "low" };
}

export function scanContentRisks(name: string, bytes: Uint8Array): Pick<ContentInspection, "riskWarnings" | "scanCoverage"> {
  const extension = extensionOf(name);
  const text = Buffer.from(bytes).toString(extension === ".pdf" ? "latin1" : "utf8");
  const riskWarnings: RiskWarning[] = [];
  for (const signal of SECRET_PATTERNS) {
    if (signal.pattern.test(text)) riskWarnings.push({ category: "probable-secret", code: signal.code, message: signal.message });
  }
  for (const signal of PROHIBITED_PATTERNS) {
    if (signal.pattern.test(text)) riskWarnings.push({ category: "prohibited-data", code: signal.code, message: signal.message });
  }
  return { riskWarnings, scanCoverage: extension === ".pdf" ? "pdf-best-effort" : "full-text" };
}

export function inspectArtifactBytes(name: string, bytes: Uint8Array): ContentInspection {
  return { checksumSha256: sha256Hex(bytes), pageEstimate: estimatePageCount(name, bytes), ...scanContentRisks(name, bytes) };
}
