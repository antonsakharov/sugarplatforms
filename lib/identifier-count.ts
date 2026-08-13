import type { ExtractedObject } from "@/lib/extraction";

export function identifierConventionCount(items: ExtractedObject[]) {
  return new Set(items.map((item) => item.name.trim().toLowerCase())).size;
}
