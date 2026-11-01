/**
 * Resolve page font resources with PDF /Pages inheritance, without guessing.
 * This deliberately bounded adapter supports direct/indirect resource and font
 * dictionaries and directly referenced, bounded filtered fixed-width ToUnicode CMaps.
 * Malformed or unsupported resource declarations reject the entire page stream.
 */
import { parseToUnicodeCMap, MAX_PDF_CMAP_BYTES, type PdfUnicodeCMap } from "./pdf-to-unicode.ts";
import { decodePdfStream } from "./pdf-stream-filters.ts";

const MAX_RESOURCE_DEPTH = 150;
type PdfValue = { kind: "ref"; ref: string } | { kind: "dict"; body: string };
export type PdfFontMaps = ReadonlyMap<string, PdfUnicodeCMap | null>;

function balancedDict(source: string, start: number): string | null {
  if (source.slice(start, start + 2) !== "<<") return null;
  let depth = 0;
  for (let i = start; i < source.length - 1; i += 1) {
    if (source.slice(i, i + 2) === "<<") { depth += 1; i += 1; }
    else if (source.slice(i, i + 2) === ">>") {
      depth -= 1; i += 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

/** Return undefined for absence, null for an unsupported/ambiguous value. */
function namedValue(body: string, name: string): PdfValue | null | undefined {
  const matches = [...body.matchAll(new RegExp(`/${name}\\b`, "g"))];
  if (matches.length === 0) return undefined;
  if (matches.length !== 1) return null;
  const rest = body.slice(matches[0].index! + matches[0][0].length);
  const space = /^\s*/.exec(rest)![0].length;
  const value = rest.slice(space);
  if (value.startsWith("<<")) {
    const dict = balancedDict(value, 0);
    return dict ? { kind: "dict", body: dict } : null;
  }
  const ref = /^(\d+)\s+(\d+)\s+R\b/.exec(value);
  return ref ? { kind: "ref", ref: `${ref[1]} ${ref[2]}` } : null;
}

function resolveDictionary(value: PdfValue, objects: ReadonlyMap<string, string>): string | null {
  const body = value.kind === "dict" ? value.body : objects.get(value.ref);
  if (!body) return null;
  const first = body.indexOf("<<");
  if (first < 0) return null;
  const dictionary = balancedDict(body, first);
  // Indirect dictionaries may have no stream; do not mistake a partial object
  // or unrelated bytes for an authoritative resource dictionary.
  return dictionary;
}

function inheritedResources(pageRef: string, objects: ReadonlyMap<string, string>): PdfValue | null | undefined {
  const visited = new Set<string>();
  let ref: string | null = pageRef;
  for (let depth = 0; ref !== null && depth < MAX_RESOURCE_DEPTH; depth += 1) {
    if (visited.has(ref)) return null;
    visited.add(ref);
    const body: string | undefined = objects.get(ref);
    if (!body) return null;
    const resources = namedValue(body, "Resources");
    if (resources !== undefined) return resources; // Nearest declaration wins; invalid overrides fail closed.
    const parent: RegExpExecArray | null = /\/Parent\s+(\d+)\s+(\d+)\s+R\b/.exec(body);
    ref = parent ? `${parent[1]} ${parent[2]}` : null;
  }
  return ref === null ? undefined : null;
}

export function pdfPageFontMaps(pageRef: string, objects: ReadonlyMap<string, string>): PdfFontMaps | null {
  const resourceValue = inheritedResources(pageRef, objects);
  if (resourceValue === null) return null;
  if (resourceValue === undefined) return new Map();
  const resources = resolveDictionary(resourceValue, objects);
  if (!resources) return null;
  const fontValue = namedValue(resources, "Font");
  if (fontValue === null) return null;
  if (fontValue === undefined) return new Map();
  const fontDict = resolveDictionary(fontValue, objects);
  if (!fontDict) return null;
  const entries = fontDict.slice(2, -2).trim();
  const fontPattern = /\/([A-Za-z0-9_.-]+)\s+(\d+)\s+(\d+)\s+R\b/g;
  const maps = new Map<string, PdfUnicodeCMap | null>();
  let end = 0;
  for (const match of entries.matchAll(fontPattern)) {
    if (entries.slice(end, match.index).trim() !== "" || maps.has(match[1])) return null;
    end = match.index! + match[0].length;
    const fontObject = objects.get(`${match[2]} ${match[3]}`);
    if (!fontObject) return null;
    const cmapValue = namedValue(fontObject, "ToUnicode");
    if (cmapValue === null || cmapValue?.kind === "dict") return null;
    if (cmapValue === undefined) { maps.set(match[1], null); continue; }
    const cmapObject = objects.get(cmapValue.ref);
    if (!cmapObject) return null;
    const cmapStream = decodePdfStream(cmapObject, MAX_PDF_CMAP_BYTES);
    if (cmapStream === null) return null;
    const cmap = parseToUnicodeCMap(cmapStream);
    if (!cmap) return null;
    maps.set(match[1], cmap);
  }
  if (entries.slice(end).trim() !== "") return null;
  return maps;
}
