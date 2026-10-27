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
  if ((header.match(/\/Type\b/g) ?? []).length !== 1 ||
      (header.match(/\/Filter\b/g) ?? []).length !== 1 ||
      !/\/Filter\s*\/FlateDecode(?=\s|>>)/.test(header) ||
      /\/(?:DecodeParms|DP|Encrypt|Extends)\b/.test(header)) invalid("unsupported xref stream dictionary");
  const size = integer(header, "Size");
  const length = integer(header, "Length");
  if (size === null || size < 2 || size > MAX_XREF_OBJECTS || length === null || length < 1 || length > MAX_XREF_BYTES) invalid("invalid Size or Length");
  const widths = [...header.matchAll(/\/W\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s*\]/g)];
  if (widths.length !== 1 || (header.match(/\/W\b/g) ?? []).length !== 1) invalid("missing or ambiguous W widths");
  const w = widths[0].slice(1).map(Number);
  if (w.some((value) => !Number.isInteger(value) || value < 0 || value > 4) || w[0] < 1 || w[1] < 1 || w[2] < 1) invalid("unsupported W widths");
  const indexes = [...header.matchAll(/\/Index\s*\[([^\]]*)\]/g)];
  if (indexes.length > 1 || (indexes.length === 1 && indexes[0][1].trim() !== `0 ${size}`)) invalid("only complete Index [0 Size] is supported");
  if (/\/Index\b/.test(header) && indexes.length !== 1) invalid("malformed Index");
  const roots = [...header.matchAll(/\/Root\s+(\d+)\s+(\d+)\s+R\b/g)];
  if (roots.length !== 1 || roots[0][2] !== "0" || !/\/Type\s*\/Catalog\b/.test(expandedObjects.get(`${roots[0][1]} 0`) ?? "")) invalid("unproven Root catalog");
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
}
