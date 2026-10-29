/**
 * Bounded classic PDF cross-reference table verification for the local/demo
 * architecture parser. Only one complete, non-incremental generation-zero
 * table is accepted; this is not a general-purpose PDF revision resolver.
 */
const MAX_XREF_ENTRIES = 4096;
const MAX_XREF_SECTION_BYTES = 96 * 1024;

function invalid(reason: string): never {
  throw new Error(`PDF cross-reference table is invalid or unsupported: ${reason}; use the production PDF adapter.`);
}

type ClassicTrailer = { size: number; root: string; info: string | null };

/** Parse only a small, explicit trailer grammar; never extract or log metadata. */
function parseClassicTrailer(body: string): ClassicTrailer {
  const patterns: Record<string, RegExp> = {
    Size: /^\/Size\s+(\d+)(?=\s|\/|$)/,
    Root: /^\/Root\s+(\d+)\s+(\d+)\s+R(?=\s|\/|$)/,
    Info: /^\/Info\s+(\d+)\s+(\d+)\s+R(?=\s|\/|$)/,
    // Strict bounded hexadecimal byte strings (16–64 bytes each). Never
    // interpret these identifiers as authentication or evidence material.
    ID: /^\/ID\s*\[\s*<([0-9A-Fa-f]{32,128})>\s*<([0-9A-Fa-f]{32,128})>\s*\](?=\s|\/|$)/,
  };
  const fields = new Map<string, RegExpExecArray>();
  let rest = body.trim();
  while (rest.length > 0) {
    const key = /^\/([A-Za-z]+)(?=\s|\/|\[|$)/.exec(rest)?.[1];
    if (!key || !Object.hasOwn(patterns, key)) invalid("unsupported trailer dictionary fields");
    if (fields.has(key)) invalid("duplicate trailer dictionary fields");
    const match = patterns[key].exec(rest);
    if (!match) invalid("malformed " + key + " trailer field");
    fields.set(key, match);
    rest = rest.slice(match[0].length).trimStart();
  }
  const sizeRaw = fields.get("Size")?.[1];
  const rootMatch = fields.get("Root");
  const size = sizeRaw === undefined ? NaN : Number(sizeRaw);
  if (!Number.isSafeInteger(size) || size < 2 || size > MAX_XREF_ENTRIES ||
      !rootMatch || rootMatch[2] !== "0" || !Number.isSafeInteger(Number(rootMatch[1])) || Number(rootMatch[1]) < 1) {
    invalid("invalid Size or Root reference");
  }
  const infoMatch = fields.get("Info");
  if (infoMatch && (infoMatch[2] !== "0" || !Number.isSafeInteger(Number(infoMatch[1])) || Number(infoMatch[1]) < 1)) {
    invalid("invalid Info trailer reference");
  }
  return {
    size,
    root: rootMatch[1] + " 0",
    info: infoMatch ? infoMatch[1] + " 0" : null,
  };
}

function directOffsets(raw: string): Map<string, number> {
  const offsets = new Map<string, number>();
  for (const match of raw.matchAll(/(?:^|[\r\n])\s*(\d+)\s+(\d+)\s+obj\b/g)) {
    const ref = `${match[1]} ${match[2]}`;
    if (offsets.has(ref)) invalid("duplicate direct object declaration");
    const declaration = /\d+\s+\d+\s+obj\b/.exec(match[0]);
    if (!declaration) invalid("malformed direct object declaration");
    offsets.set(ref, match.index! + declaration.index);
  }
  return offsets;
}

/**
 * Returns true when a classic xref table was validated, false when the PDF
 * does not declare one. Call the xref-stream validator on the false path.
 */
export function validatePdfXrefTable(
  raw: string,
  directObjects: ReadonlyMap<string, string>,
  expandedObjects: ReadonlyMap<string, string>,
): boolean {
  const tableMarkers = [...raw.matchAll(/(?:^|[\r\n])xref(?=\r?\n)/g)];
  if (tableMarkers.length === 0) return false;
  if (tableMarkers.length !== 1 ||
      (raw.match(/\bstartxref\b/g) ?? []).length !== 1 ||
      (raw.match(/%%EOF/g) ?? []).length !== 1 ||
      /\/(?:Prev|XRefStm|Encrypt)\b/.test(raw) ||
      [...directObjects.values()].some((body) => /\/Type\s*\/(?:XRef|ObjStm)\b/.test(body.split(/\bstream\r?\n/, 1)[0])) ||
      expandedObjects.size !== directObjects.size) {
    invalid("hybrid, incremental, encrypted, or object-stream revisions are unsupported");
  }

  const final = /(?:^|[\r\n])startxref\s+(\d+)\s+%%EOF\s*$/.exec(raw);
  if (!final) invalid("missing or malformed final startxref/EOF");
  const start = Number(final[1]);
  if (!Number.isSafeInteger(start) || start < 0 || start >= final.index!) invalid("invalid startxref offset");
  const marker = tableMarkers[0];
  const markerOffset = marker.index! + (marker[0].startsWith("xref") ? 0 : marker[0].length - 4);
  if (start !== markerOffset) invalid("startxref does not point to the physical xref table");
  const section = raw.slice(start, final.index);
  if (section.length > MAX_XREF_SECTION_BYTES) invalid("xref table exceeds byte budget");
  const trailerMatch = /(?:^|\r?\n)trailer\r?\n/.exec(section);
  if (!trailerMatch) invalid("missing trailer dictionary");
  const table = section.slice(0, trailerMatch.index);
  const trailer = section.slice(trailerMatch.index).replace(/^\r?\n/, "");
  const trailerBody = /^trailer\r?\n\s*<<([\s\S]*?)>>\s*$/.exec(trailer)?.[1];
  if (trailerBody === undefined) invalid("malformed or repeated trailer dictionary");
  const { size, root, info } = parseClassicTrailer(trailerBody);
  if (!/\/Type\s*\/Catalog\b/.test(directObjects.get(root)?.split(/\bstream\r?\n/, 1)[0] ?? "")) {
    invalid("unproven Root catalog");
  }

  const lines = table.split(/\r?\n/);
  if (lines.shift() !== "xref") invalid("malformed xref header");
  const offsets = directOffsets(raw);
  if (offsets.size !== directObjects.size || [...offsets.keys()].some((ref) => !ref.endsWith(" 0"))) {
    invalid("unsupported object generations or duplicate declarations");
  }
  const live = new Set<string>();
  let nextId = 0;
  let cursor = 0;
  while (cursor < lines.length) {
    const subsection = /^(\d+)\s+(\d+)$/.exec(lines[cursor++]);
    if (!subsection) invalid("malformed or repeated xref subsection");
    const first = Number(subsection[1]);
    const count = Number(subsection[2]);
    if (!Number.isSafeInteger(first) || first !== nextId || !Number.isSafeInteger(count) || count < 1 ||
        first + count > size || cursor + count > lines.length) invalid("missing, overlapping, or out-of-range xref entries");
    for (let id = first; id < first + count; id += 1) {
      const entry = /^(\d{10}) (\d{5}) ([nf]) ?$/.exec(lines[cursor++]);
      if (!entry) invalid("malformed fixed-width xref entry");
      const offset = Number(entry[1]);
      const generation = Number(entry[2]);
      const ref = `${id} 0`;
      if (id === 0) {
        if (entry[3] !== "f" || offset !== 0 || generation !== 65535) invalid("invalid free object zero");
      } else if (entry[3] === "n") {
        if (generation !== 0 || offsets.get(ref) !== offset || !directObjects.has(ref)) {
          invalid("direct object offset or generation mismatch");
        }
        live.add(ref);
      } else if (offset !== 0 || generation !== 0 || directObjects.has(ref)) {
        invalid("free entry conflicts with a live object");
      }
    }
    nextId += count;
  }
  if (nextId !== size || live.size !== directObjects.size || !live.has(root)) {
    invalid("unindexed, missing, or orphaned objects");
  }
  if (info) {
    const metadata = directObjects.get(info);
    if (info === root || !live.has(info) || !metadata ||
        !/^\s*<<[\s\S]*>>\s*$/.test(metadata) ||
        /\bstream\b|\/Type\s*\/(?:Catalog|Pages|Page|XRef|ObjStm)\b/.test(metadata)) {
      invalid("Info trailer must reference a live direct metadata dictionary");
    }
  }
  return true;
}
