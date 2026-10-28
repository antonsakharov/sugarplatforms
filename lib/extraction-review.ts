import type { ExtractedObject } from "@/lib/extraction";

export type ReviewStatus = "pending" | "confirmed" | "rejected" | "merged";
export type ReviewedObject = { id: string; kind: ExtractedObject["kind"]; originalName: string; displayName: string; status: ReviewStatus; mergedInto?: string };
export type ExtractionReview = { schemaVersion: "1.0"; approved: boolean; approvedAt?: string; objects: ReviewedObject[] };

function resetApproval(review: ExtractionReview): ExtractionReview { return { ...review, approved: false, approvedAt: undefined }; }

export function createExtractionReview(objects: ExtractedObject[]): ExtractionReview {
  return { schemaVersion: "1.0", approved: false, objects: objects.map((item) => ({ id: item.id, kind: item.kind, originalName: item.name, displayName: item.name, status: "pending" })) };
}

export function renameReviewedObject(review: ExtractionReview, objectId: string, displayName: string): ExtractionReview {
  const name = displayName.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!name) throw new Error("Reviewed object name cannot be empty.");
  if (!review.objects.some((item) => item.id === objectId)) throw new Error("Reviewed object does not exist.");
  const next = resetApproval(review);
  return { ...next, objects: next.objects.map((item) => item.id === objectId ? { ...item, displayName: name } : item) };
}

export function setReviewStatus(review: ExtractionReview, objectId: string, status: Exclude<ReviewStatus, "merged">): ExtractionReview {
  if (!review.objects.some((item) => item.id === objectId)) throw new Error("Reviewed object does not exist.");
  const next = resetApproval(review);
  return { ...next, objects: next.objects.map((item) => item.id === objectId ? { ...item, status, mergedInto: undefined } : item) };
}

export function mergeReviewedObject(review: ExtractionReview, sourceId: string, targetId: string): ExtractionReview {
  if (sourceId === targetId) throw new Error("An object cannot be merged into itself.");
  const source = review.objects.find((item) => item.id === sourceId);
  const target = review.objects.find((item) => item.id === targetId);
  if (!source || !target) throw new Error("Merge source and target must exist.");
  if (source.kind !== target.kind) throw new Error("Only objects of the same kind can be merged.");
  if (target.status === "rejected" || target.status === "merged") throw new Error("Merge target must remain reviewable.");
  const next = resetApproval(review);
  return { ...next, objects: next.objects.map((item) => item.id === sourceId ? { ...item, status: "merged", mergedInto: targetId } : item) };
}

export function canApproveExtraction(review: ExtractionReview) {
  return review.objects.length > 0 && review.objects.every((item) => item.status !== "pending");
}

export function approveExtraction(review: ExtractionReview, approvedAt = new Date().toISOString()): ExtractionReview {
  if (!canApproveExtraction(review)) throw new Error("Every extracted object must be confirmed, rejected, or merged before approval.");
  return { ...review, approved: true, approvedAt };
}
