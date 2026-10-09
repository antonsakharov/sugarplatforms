/** Catalog -> Pages -> Kids ordering is required before asserting a physical PDF page. */
const MAX_PDF_PAGES = 150;
function refAfter(body: string, key: string): string | null {
  const match = new RegExp("/" + key + "\\s+(\\d+)\\s+(\\d+)\\s+R\\b").exec(body);
  return match ? match[1] + " " + match[2] : null;
}
function kindOf(body: string): string | null {
  return /\/Type\s*\/([A-Za-z]+)\b/.exec(body)?.[1] ?? null;
}
export function orderedPdfPageRefs(objects: ReadonlyMap<string, string>): string[] | null {
  const catalogs = [...objects.entries()].filter(([, body]) => kindOf(body) === "Catalog");
  if (catalogs.length === 0) return null;
  if (catalogs.length !== 1) throw new Error("PDF page provenance is ambiguous: multiple catalogs.");
  const root = refAfter(catalogs[0][1], "Pages");
  if (!root) throw new Error("PDF page provenance is invalid: catalog has no Pages reference.");
  const seen = new Set<string>();
  const pages: string[] = [];
  function walk(ref: string, parent: string | null, depth: number): number {
    if (depth > MAX_PDF_PAGES || seen.has(ref)) throw new Error("PDF page provenance has a cycle or repeated reference.");
    seen.add(ref);
    const body = objects.get(ref);
    if (!body) throw new Error("PDF page provenance contains a missing object reference.");
    const kind = kindOf(body);
    if (parent && refAfter(body, "Parent") !== parent) throw new Error("PDF page provenance has an inconsistent Parent reference.");
    if (kind === "Page") {
      if (pages.length >= MAX_PDF_PAGES) throw new Error("PDF exceeds the 150-page MVP limit.");
      pages.push(ref);
      return 1;
    }
    if (kind !== "Pages") throw new Error("PDF page provenance references a non-page object.");
    const kids = /\/Kids\s*\[([^\]]*)\]/.exec(body)?.[1]?.trim();
    if (!kids || !/^(?:\d+\s+\d+\s+R\s*)+$/.test(kids)) throw new Error("PDF page provenance contains malformed Kids references.");
    const refs = [...kids.matchAll(/(\d+)\s+(\d+)\s+R\b/g)].map((m) => m[1] + " " + m[2]);
    if (refs.length > MAX_PDF_PAGES) throw new Error("PDF page provenance exceeds the MVP limit.");
    const count = /\/Count\s+(\d+)\b/.exec(body)?.[1];
    if (!count || Number(count) < 1 || Number(count) > MAX_PDF_PAGES) throw new Error("PDF page provenance Count is missing or invalid.");
    const actual = refs.reduce((sum, child) => sum + walk(child, ref, depth + 1), 0);
    if (actual !== Number(count)) throw new Error("PDF page provenance Count does not match the Kids tree.");
    return actual;
  }
  walk(root, null, 0);
  return pages;
}
