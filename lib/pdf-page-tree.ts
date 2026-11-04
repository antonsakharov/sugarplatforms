/**
 * Resolve physical page numbers only from a provable Catalog -> Pages -> Kids tree.
 * The bounded PDF adapter does not interpret xref streams or incremental revisions;
 * ambiguous page graphs must fail closed rather than fabricate page coordinates.
 */
const MAX_PDF_PAGES = 150;

function referenceAfter(body: string, key: string): string | null {
  const match = new RegExp(`/${key}\\s+(\\d+)\\s+(\\d+)\\s+R\\b`).exec(body);
  return match ? `${match[1]} ${match[2]}` : null;
}

function typeOf(body: string): string | null {
  return /\/Type\s*\/([A-Za-z]+)\b/.exec(body)?.[1] ?? null;
}

/** null means no Catalog exists, so only honest fragment locators may be used. */
export function orderedPdfPageRefs(objects: ReadonlyMap<string, string>): string[] | null {
  const catalogs = [...objects.entries()].filter(([, body]) => typeOf(body) === "Catalog");
  if (catalogs.length === 0) return null;
  if (catalogs.length !== 1) throw new Error("PDF page provenance is ambiguous: multiple catalogs.");
  const root = referenceAfter(catalogs[0][1], "Pages");
  if (!root) throw new Error("PDF page provenance is invalid: catalog has no Pages reference.");

  const visited = new Set<string>();
  const pages: string[] = [];
  function walk(ref: string, parent: string | null, depth: number): number {
    if (depth > MAX_PDF_PAGES || visited.has(ref)) throw new Error("PDF page provenance has a cycle or repeated reference.");
    visited.add(ref);
    const body = objects.get(ref);
    if (!body) throw new Error("PDF page provenance contains a missing object reference.");
    const kind = typeOf(body);
    if (parent && referenceAfter(body, "Parent") !== parent) throw new Error("PDF page provenance has an inconsistent Parent reference.");
    if (kind === "Page") {
      if (pages.length >= MAX_PDF_PAGES) throw new Error("PDF exceeds the 150-page MVP limit.");
      pages.push(ref);
      return 1;
    }
    if (kind !== "Pages") throw new Error("PDF page provenance references a non-page object.");
    const kidsMatch = /\/Kids\s*\[([^\]]*)\]/.exec(body);
    if (!kidsMatch) throw new Error("PDF page provenance has no valid Kids array.");
    const rawKids = kidsMatch[1].trim();
    const childRefs = [...rawKids.matchAll(/(\d+)\s+(\d+)\s+R\b/g)].map((match) => `${match[1]} ${match[2]}`);
    if (childRefs.length === 0 || childRefs.length > MAX_PDF_PAGES ||
        !/^(?:\d+\s+\d+\s+R\s*)+$/.test(rawKids)) {
      throw new Error("PDF page provenance contains malformed Kids references.");
    }
    const countMatch = /\/Count\s+(\d+)\b/.exec(body);
    if (!countMatch) throw new Error("PDF page provenance is missing the Pages Count.");
    const declared = Number(countMatch[1]);
    if (!Number.isSafeInteger(declared) || declared < 1 || declared > MAX_PDF_PAGES) {
      throw new Error("PDF page count is invalid or exceeds the 150-page MVP limit.");
    }
    const actual = childRefs.reduce((sum, child) => sum + walk(child, ref, depth + 1), 0);
    if (actual !== declared) throw new Error("PDF page provenance Count does not match the Kids tree.");
    return actual;
  }
  walk(root, null, 0);
  return pages;
}
