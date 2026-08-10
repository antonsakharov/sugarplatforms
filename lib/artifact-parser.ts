import { createHash } from "node:crypto";

export type ParserKind = "text" | "markdown" | "json" | "yaml" | "openapi-json" | "openapi-yaml";
export type Locator = {
  type: "line-range" | "json-pointer";
  value: string;
  startLine?: number;
  endLine?: number;
  fragment?: number;
};
export type SourceSegment = {
  id: string;
  artifactId: string;
  artifactName: string;
  ordinal: number;
  kind: ParserKind;
  locator: Locator;
  content: string;
  contentSha256: string;
  title?: string;
};
export type ParsedArtifact = {
  artifactId: string;
  artifactName: string;
  parser: ParserKind;
  sourceSegments: SourceSegment[];
  warnings: string[];
  stats: { segmentCount: number; characterCount: number };
};

const MAX_SEGMENT_CHARS = 6000;
const MAX_SEGMENT_LINES = 80;
const TEXT_EXTENSIONS = new Set([".txt"]);

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}
function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function escapePointerToken(value: string) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
}
function artifactIdFor(name: string, bytes: Uint8Array) {
  return `artifact_${createHash("sha256").update(name).update(bytes).digest("hex").slice(0, 16)}`;
}
function makeSegment(
  artifactId: string,
  artifactName: string,
  ordinal: number,
  kind: ParserKind,
  locator: Locator,
  content: string,
  title?: string
): SourceSegment {
  return {
    id: `${artifactId}:segment:${ordinal}`,
    artifactId,
    artifactName,
    ordinal,
    kind,
    locator,
    content,
    contentSha256: digest(content),
    ...(title ? { title } : {})
  };
}

function lineChunks(
  artifactId: string,
  artifactName: string,
  kind: ParserKind,
  text: string,
  boundaries: Array<{ start: number; title?: string }>
) {
  const lines = text.split(/\r?\n/);
  const normalized = boundaries.length > 0 ? boundaries : [{ start: 0 }];
  const sections = normalized.map((boundary, index) => ({
    start: boundary.start,
    end: (normalized[index + 1]?.start ?? lines.length) - 1,
    title: boundary.title
  }));
  const segments: SourceSegment[] = [];
  for (const section of sections) {
    let cursor = section.start;
    while (cursor <= section.end) {
      let end = Math.min(section.end, cursor + MAX_SEGMENT_LINES - 1);
      let content = lines.slice(cursor, end + 1).join("\n");
      while (content.length > MAX_SEGMENT_CHARS && end > cursor) {
        end -= 1;
        content = lines.slice(cursor, end + 1).join("\n");
      }
      if (content.length > MAX_SEGMENT_CHARS) {
        let offset = 0;
        let fragment = 0;
        while (offset < content.length) {
          const part = content.slice(offset, offset + MAX_SEGMENT_CHARS);
          segments.push(makeSegment(artifactId, artifactName, segments.length, kind, {
            type: "line-range",
            value: `lines ${cursor + 1}-${end + 1}`,
            startLine: cursor + 1,
            endLine: end + 1,
            fragment
          }, part, section.title));
          offset += MAX_SEGMENT_CHARS;
          fragment += 1;
        }
      } else if (content.trim().length > 0) {
        segments.push(makeSegment(artifactId, artifactName, segments.length, kind, {
          type: "line-range",
          value: `lines ${cursor + 1}-${end + 1}`,
          startLine: cursor + 1,
          endLine: end + 1
        }, content, section.title));
      }
      cursor = end + 1;
    }
  }
  return segments;
}

function parseTextLike(name: string, text: string, artifactId: string, kind: "text" | "markdown") {
  const lines = text.split(/\r?\n/);
  const boundaries = kind === "markdown"
    ? lines.flatMap((line, index) => {
        const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
        return match ? [{ start: index, title: match[2] }] : [];
      })
    : [];
  return lineChunks(artifactId, name, kind, text, boundaries);
}

function parseYaml(name: string, text: string, artifactId: string) {
  const lines = text.split(/\r?\n/);
  const firstMeaningful = lines.find((line) => line.trim() && !line.trim().startsWith("#"))?.trim() ?? "";
  const kind: ParserKind = /^(?:openapi|swagger)\s*:/i.test(firstMeaningful) ? "openapi-yaml" : "yaml";
  const boundaries = lines.flatMap((line, index) => {
    const match = /^([A-Za-z0-9_.-]+):(?:\s|$)/.exec(line);
    return match ? [{ start: index, title: match[1] }] : [];
  });
  return { kind, segments: lineChunks(artifactId, name, kind, text, boundaries) };
}

function splitJsonContent(content: string) {
  if (content.length <= MAX_SEGMENT_CHARS) return [content];
  const parts: string[] = [];
  for (let offset = 0; offset < content.length; offset += MAX_SEGMENT_CHARS) {
    parts.push(content.slice(offset, offset + MAX_SEGMENT_CHARS));
  }
  return parts;
}

function parseJson(name: string, text: string, artifactId: string) {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Unable to parse ${name} as JSON: ${detail}`);
  }
  const isOpenApi = typeof root === "object" && root !== null && ("openapi" in root || "swagger" in root);
  const kind: ParserKind = isOpenApi ? "openapi-json" : "json";
  const entries: Array<{ pointer: string; title?: string; value: unknown }> = [];
  if (Array.isArray(root)) {
    root.forEach((value, index) => entries.push({ pointer: `/${index}`, title: `[${index}]`, value }));
  } else if (typeof root === "object" && root !== null) {
    for (const [key, value] of Object.entries(root)) {
      entries.push({ pointer: `/${escapePointerToken(key)}`, title: key, value });
    }
  } else {
    entries.push({ pointer: "/", value: root });
  }
  const segments: SourceSegment[] = [];
  for (const entry of entries) {
    const serialized = JSON.stringify(entry.value, null, 2) ?? "null";
    splitJsonContent(serialized).forEach((content, fragment) => {
      segments.push(makeSegment(artifactId, name, segments.length, kind, {
        type: "json-pointer",
        value: entry.pointer,
        ...(fragment > 0 ? { fragment } : {})
      }, content, entry.title));
    });
  }
  return { kind, segments };
}

export function parseArtifact(name: string, bytes: Uint8Array): ParsedArtifact {
  const extension = extensionOf(name);
  const artifactId = artifactIdFor(name, bytes);
  const text = decodeUtf8(bytes);
  const warnings: string[] = [];
  if (text.includes("\uFFFD")) warnings.push("Input contained undecodable UTF-8 bytes; replacement characters were preserved.");

  let parser: ParserKind;
  let sourceSegments: SourceSegment[];
  if (TEXT_EXTENSIONS.has(extension)) {
    parser = "text";
    sourceSegments = parseTextLike(name, text, artifactId, parser);
  } else if (extension === ".md") {
    parser = "markdown";
    sourceSegments = parseTextLike(name, text, artifactId, parser);
  } else if (extension === ".json") {
    const parsed = parseJson(name, text, artifactId);
    parser = parsed.kind;
    sourceSegments = parsed.segments;
  } else if (extension === ".yaml" || extension === ".yml") {
    const parsed = parseYaml(name, text, artifactId);
    parser = parsed.kind;
    sourceSegments = parsed.segments;
  } else {
    throw new Error(`No deterministic parser is available yet for ${extension || "files without an extension"}.`);
  }

  if (sourceSegments.length === 0) warnings.push("Artifact produced no non-empty source segments.");
  return {
    artifactId,
    artifactName: name,
    parser,
    sourceSegments,
    warnings,
    stats: { segmentCount: sourceSegments.length, characterCount: text.length }
  };
}
