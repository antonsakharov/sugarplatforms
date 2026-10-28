/**
 * Bounded PDF 1.5 object-stream expansion for the local architecture parser.
 * Only Flate-compressed, direct-length /ObjStm dictionaries containing
 * generation-zero dictionary objects are accepted. Embedded streams, duplicate
 * IDs, malformed index tables and unbounded decompression fail closed.
 */
import { decodePdfStream } from "./pdf-stream-filters.ts";

const MAX_OBJECT_STREAM_BYTES = 1024 * 1024;
const MAX_OBJECT_STREAMS = 16;
const MAX_OBJECTS_PER_STREAM = 128;
const MAX_EXPANDED_OBJECTS = 1024;

function directInteger(header: string, key: string): number | null {
  const matches = [...header.matchAll(new RegExp(`/${key}\\b\\s+(\\d+)(?=\\s|/|>>|$)`, "g"))];
  if (matches.length !== 1) return null;
  const value = Number(matches[0][1]);
  return Number.isSafeInteger(value) ? value : null;
}

function fail(message: string): never {
  throw new Error(`PDF object stream is invalid or unsupported: ${message}; use the production PDF adapter.`);
}

/** Return the original map when no object streams exist. */
export function expandPdfObjectStreams(directObjects: ReadonlyMap<string, string>): ReadonlyMap<string, string> {
  const streams = [...directObjects.values()].filter((body) => {
    const before = body.split(/\bstream\r?\n/, 1)[0];
    return /\/Type\s*\/ObjStm\b/.test(before);
  });
  if (streams.length === 0) return directObjects;
  if (streams.length > MAX_OBJECT_STREAMS) fail("too many object streams");
  const expanded = new Map(directObjects);
  let count = 0;
  for (const body of streams) {
    const stream = /\bstream\r?\n([\s\S]*?)\r?\nendstream\b/.exec(body);
    if (!stream) fail("missing or ambiguous stream body");
    const header = body.slice(0, stream.index);
    if ([...header.matchAll(/\/Type\b/g)].length !== 1 ||
        !/\/Type\s*\/ObjStm\b/.test(header) ||
        /\/(?:Extends|DecodeParms|DP)\b/.test(header) ||
        !/\/Filter\s*\/FlateDecode(?=\s|>>)/.test(header) ||
        [...header.matchAll(/\/Filter\b/g)].length !== 1) fail("unsupported object stream dictionary");
    const n = directInteger(header, "N");
    const first = directInteger(header, "First");
    const length = directInteger(header, "Length");
    if (n === null || n < 1 || n > MAX_OBJECTS_PER_STREAM ||
        first === null || first < 1 || first > MAX_OBJECT_STREAM_BYTES ||
        length === null || length < 1 || length > MAX_OBJECT_STREAM_BYTES ||
        Buffer.byteLength(stream[1], "latin1") !== length) fail("invalid N, First or Length");
    const decoded = decodePdfStream(body, MAX_OBJECT_STREAM_BYTES);
    if (decoded === null || first >= decoded.length) fail("undecodable or truncated Flate object stream");
    const index = decoded.slice(0, first);
    const tokens = index.trim().split(/\s+/);
    if (tokens.length !== n * 2 || tokens.some((token) => !/^\d+$/.test(token))) fail("malformed object index");
    let previous = -1;
    for (let i = 0; i < n; i += 1) {
      const id = Number(tokens[i * 2]);
      const offset = Number(tokens[i * 2 + 1]);
      const next = i + 1 < n ? Number(tokens[(i + 1) * 2 + 1]) : decoded.length - first;
      if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647 ||
          !Number.isSafeInteger(offset) || offset <= previous || offset < 0 ||
          (i === 0 && offset !== 0) ||
          !Number.isSafeInteger(next) || next <= offset || first + next > decoded.length) {
        fail("invalid object number or offset");
      }
      const ref = `${id} 0`;
      if (expanded.has(ref) || ++count > MAX_EXPANDED_OBJECTS) fail("duplicate or excessive embedded object IDs");
      const value = decoded.slice(first + offset, first + next).trim();
      if (!value.startsWith("<<") || !value.endsWith(">>") ||
          /\b(?:stream|endstream|obj|endobj)\b/.test(value) ||
          /\/(?:Encrypt|ObjStm)\b/.test(value)) fail("unsupported embedded object");
      expanded.set(ref, value);
      previous = offset;
    }
  }
  return expanded;
}
