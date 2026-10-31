/**
 * Strict PDF 1.5 cross-reference stream verification for the bounded local/demo
 * parser. This is an integrity gate, not a general PDF revision resolver.
 * All referenced direct and compressed objects must agree with the xref index.
 */
import { decodePdfStream } from "./pdf-stream-filters.ts";

const MAX_XREF_OBJECTS = 4096;
const MAX_XREF_BYTES = 64 * 1024;
const MAX_OBJSTM_INDEX_BYTES = 1024 * 1024;

function invalid(reason: string): never {
  throw new Error(`PDF cross-reference stream is invalid or unsupported: ${reason}; use the production PDF adapter.`);
}

function integer(dictionary: string, key: string): number | null {
  const matches = [...dictionary.matchAll(new RegExp(`/${key}\\b\\s+(\\d+)(?=\\s|/|>>|$)`, "g"))];
  if (matches.length !== 1) return null;
  const number = Number(matches[0][1]);
  return Number.isSafeInteger(number) ? number : null;
}

type XrefDictionary = {
  size: number;
  length: number;
  root: string;
  widths: [number, number, number];
  info: string | null;
};

/**
 * An xref stream's dictionary is deliberately a flat, bounded grammar. In
 * particular, optional document metadata is never parsed as architecture
 * evidence and cannot introduce a nested or duplicate dictionary field.
 */
function parseXrefDictionary(header: string): XrefDictionary {
  if (header.length > 4096 || !/^<<[\s\S]*>>$/.test(header.trim())) invalid("malformed xref stream dictionary");
  const patterns: Record<string, RegExp> = {
    Type: /^\/Type\s+\/XRef(?=\s|\/|$)/,
    Size: /^\/Size\s+(\d+)(?=\s|\/|$)/,
    Root: /^\/Root\s+(\d+)\s+(\d+)\s+R(?=\s|\/|$)/,
    W: /^\/W\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s*\](?=\s|\/|$)/,
    Index: /^\/Index\s*\[\s*(\d+)\s+(\d+)\s*\](?=\s|\/|$)/,
    Length: /^\/Length\s+(\d+)(?=\s|\/|$)/,
    Filter: /^\/Filter\s+\/FlateDecode(?=\s|\/|$)/,
    Info: /^\/Info\s+(\d+)\s+(\d+)\s+R(?=\s|\/|$)/,
    // 16–64 bytes per ID; no literal strings, odd hex lengths, or nesting.
    ID: /^\/ID\s*\[\s*<([0-9a-fA-F]{32,128})>\s*<([0-9a-fA-F]{32,128})>\s*\](?=\s|\/|$)/,
  };
  const fields = new Map<string, RegExpExecArray>();
  let rest = header.trim().slice(2, -2).trim();
  while (rest) {
    const key = /^\/([A-Za-z]+)(?=\s|\/|\[|$)/.exec(rest)?.[1];
    if (key === "Prev" || key === "XRefStm" || key === "Encrypt") invalid("incremental, hybrid, or encrypted revisions are unsupported");
    if (!key || !Object.hasOwn(patterns, key)) invalid("unsupported xref stream dictionary field");
    if (fields.has(key)) invalid("duplicate " + key + " dictionary field");
    const match = patterns[key].exec(rest);
    if (!match) invalid("malformed " + key + " dictionary field");
    fields.set(key, match);
    rest = rest.slice(match[0].length).trimStart();
  }
  if (!fields.has("Type") || !fields.has("Filter")) invalid("unsupported xref stream dictionary");
  const size = Number(fields.get("Size")?.[1]);
  const length = Number(fields.get("Length")?.[1]);
  if (!Number.isSafeInteger(size) || size < 2 || size > MAX_XREF_OBJECTS ||
      !Number.isSafeInteger(length) || length < 1 || length > MAX_XREF_BYTES) invalid("invalid Size or Length");
  const widths = fields.get("W")?.slice(1).map(Number);
  if (!widths || widths.length !== 3 || widths.some((value) => !Number.isInteger(value) || value < 1 || value > 4)) invalid("unsupported W widths");
  const root = fields.get("Root");
  if (!root || root[2] !== "0" || !Number.isSafeInteger(Number(root[1])) || Number(root[1]) < 1 || Number(root[1]) >= size) invalid("invalid Root reference");
  const info = fields.get("Info");
  if (info && (info[2] !== "0" || !Number.isSafeInteger(Number(info[1])) || Number(info[1]) < 1 || Number(info[1]) >= size)) invalid("invalid Info reference");
  const index = fields.get("Index");
  if (index && (Number(index[1]) !== 0 || Number(index[2]) !== size)) invalid("only complete Index [0 Size] is supported");
  return {
    size,
    length,
    root: root[1] + " 0",
    widths: widths as [number, number, number],
    info: info ? info[1] + " 0" : null,
  };
}

function exactObjectOffsets(raw: string): Map<string, number> {
  const offsets = new Map<string, number>();
  for (const match of raw.matchAll(/(?:^|[\r\n])\s*(\d+)\s+(\d+)\s+obj\b/g)) {
    const ref = `${match[1]} ${match[2]}`;
    if (offsets.has(ref)) invalid("repeated direct object declaration");
    const declaration = /\d+\s+\d+\s+obj\b/.exec(match[0]);
    if (!declaration) invalid("malformed object declaration");
    offsets.set(ref, match.index! + declaration.index);
  }
  return offsets;
}

function readField(data: Buffer, start: number, width: number): number {
  let value = 0;
  for (let i = 0; i < width; i += 1) value = value * 256 + data[start + i];
  return value;
}

function compressedObjectIds(body: string): number[] {
  const header = body.split(/\bstream\r?\n/, 1)[0];
  if (!/\/Type\s*\/ObjStm\b/.test(header)) invalid("type 2 entry points to a non-object-stream");
  const n = integer(header, "N");
  const first = integer(header, "First");
  if (n === null || n < 1 || n > 128 || first === null || first < 1 || first > MAX_OBJSTM_INDEX_BYTES) invalid("invalid compressed object index");
  const decoded = decodePdfStream(body, MAX_OBJSTM_INDEX_BYTES);
  if (decoded === null || first >= decoded.length) invalid("unreadable compressed object index");
  const tokens = decoded.slice(0, first).trim().split(/\s+/);
  if (tokens.length !== n * 2 || tokens.some((value) => !/^\d+$/.test(value))) invalid("malformed compressed object index");
  const ids = Array.from({ length: n }, (_, i) => Number(tokens[i * 2]));
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) invalid("invalid compressed object ID");
  return ids;
}

/**
 * Verify a single, complete, non-revisioned Flate xref stream when present.
 * Minimal demo PDFs without an xref remain supported, but PDFs that claim an
 * xref must prove it; no fallback to guessed object/page provenance.
 */
export function validatePdfXrefStream(
  raw: string,
  directObjects: ReadonlyMap<string, string>,
  expandedObjects: ReadonlyMap<string, string>,
): void {
  const xrefs = [...directObjects.entries()].filter(([, body]) => /\/Type\s*\/XRef\b/.test(body.split(/\bstream\r?\n/, 1)[0]));
  const hasTrailer = /\bstartxref\b/.test(raw);
  if (xrefs.length === 0 && !hasTrailer) {
    if ((raw.match(/%%EOF/g) ?? []).length > 1 || /\/(?:Prev|XRefStm)\b/.test(raw) ||
        /(?:^|[\r\n])\s*xref\s*(?:[\r\n]|$)/.test(raw)) invalid("unverified incremental or table-based revisions");
    return;
  }
  if (xrefs.length !== 1) invalid("exactly one xref stream is required");
  if ((raw.match(/\bstartxref\b/g) ?? []).length !== 1 || (raw.match(/%%EOF/g) ?? []).length !== 1 ||
      /(?:^|[\r\n])\s*xref\s*(?:[\r\n]|$)/.test(raw) || /\/(?:Prev|XRefStm)\b/.test(raw)) {
    invalid("incremental, hybrid, or table-based revisions are unsupported");
  }
  const trailer = /\bstartxref\s+(\d+)\s+%%EOF\s*$/.exec(raw);
  if (!trailer) invalid("missing or malformed final startxref/EOF");
  const [xrefRef, xrefBody] = xrefs[0];
  const offsets = exactObjectOffsets(raw);
  if (offsets.size !== directObjects.size || offsets.get(xrefRef) !== Number(trailer[1])) invalid("startxref does not point to the xref object");
  const header = xrefBody.split(/\bstream\r?\n/, 1)[0];
  const { size, length, root, widths: w, info } = parseXrefDictionary(header);
  if (!/\/Type\s*\/Catalog\b/.test(expandedObjects.get(root) ?? "")) invalid("unproven Root catalog");
  const stream = /\bstream\r?\n([\s\S]*?)\r?\nendstream\b/.exec(xrefBody);
  if (!stream || Buffer.byteLength(stream[1], "latin1") !== length) invalid("encoded xref Length mismatch");
  const decoded = decodePdfStream(xrefBody, MAX_XREF_BYTES);
  const stride = w[0] + w[1] + w[2];
  if (decoded === null || decoded.length !== size * stride) invalid("xref entry count or decoded length mismatch");
  const bytes = Buffer.from(decoded, "latin1");
  const referencedDirect = new Set<string>();
  const referencedCompressed = new Set<string>();
  const claimedIndexes = new Set<string>();
  const compressedIndexCache = new Map<string, number[]>();
  for (let id = 0; id < size; id += 1) {
    const base = id * stride;
    const kind = readField(bytes, base, w[0]);
    const value = readField(bytes, base + w[0], w[1]);
    const generationOrIndex = readField(bytes, base + w[0] + w[1], w[2]);
    const ref = `${id} 0`;
    if (kind === 0) {
      if (directObjects.has(ref) || expandedObjects.has(ref) || (id === 0 && generationOrIndex !== 65535)) invalid("free entry conflicts with a live object");
    } else if (kind === 1) {
      if (generationOrIndex !== 0 || offsets.get(ref) !== value || !directObjects.has(ref)) invalid("direct object offset or generation mismatch");
      referencedDirect.add(ref);
    } else if (kind === 2) {
      if (id === 0 || directObjects.has(ref) || !expandedObjects.has(ref)) invalid("invalid compressed object reference");
      const objectStreamRef = `${value} 0`;
      const body = directObjects.get(objectStreamRef);
      if (!body) invalid("compressed object stream/index mismatch");
      let ids = compressedIndexCache.get(objectStreamRef);
      if (!ids) { ids = compressedObjectIds(body); compressedIndexCache.set(objectStreamRef, ids); }
      if (ids[generationOrIndex] !== id) invalid("compressed object stream/index mismatch");
      const indexKey = `${value}:${generationOrIndex}`;
      if (claimedIndexes.has(indexKey)) invalid("duplicate compressed index");
      claimedIndexes.add(indexKey);
      referencedCompressed.add(ref);
    } else invalid("unsupported xref entry type");
  }
  if (referencedDirect.size !== directObjects.size ||
      referencedCompressed.size + referencedDirect.size !== expandedObjects.size) invalid("unindexed or missing objects");
  if (info) {
    const metadata = directObjects.get(info);
    // /Info cannot be compressed, free, an xref, a page-tree object or a
    // stream. Its contents are never returned as source evidence.
    if (info === root || !referencedDirect.has(info) || !metadata ||
        !/^\s*<<[\s\S]*>>\s*$/.test(metadata) ||
        /\bstream\b|\/Type\s*\/(?:Catalog|Pages|Page|XRef|ObjStm)\b/.test(metadata)) {
      invalid("Info must reference a live direct metadata dictionary");
    }
  }
}
