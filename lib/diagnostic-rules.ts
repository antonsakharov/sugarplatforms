import type { ExtractionEnvelope } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";

export function countReviewedIdentifiers(extraction: ExtractionEnvelope, review: ExtractionReview) {
  const accepted = new Set(review.objects.filter((item) => item.status === "confirmed").map((item) => item.id));
  return extraction.objects.filter((item) => item.kind === "identifier" && accepted.has(item.id));
}
