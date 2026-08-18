import type { DiagnosticEnvelope, DiagnosticFinding } from "@/lib/diagnostics";
import type { ExtractionEnvelope, EvidenceReference } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";
import type { FindingReview } from "@/lib/finding-review";

export type GraphNodeKind = "primary_entity" | "entity" | "identifier" | "system";
export type GraphEdgeKind = "focused_identifier" | "integration" | "accepted_finding";
export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sourceObjectId?: string;
  evidence: EvidenceReference[];
  acceptedFindingIds: string[];
};
export type GraphEdge = {
  id: string;
  kind: GraphEdgeKind;
  source: string;
  target: string;
  label: string;
  evidence: EvidenceReference[];
  factStatus: "direct" | "derived";
};
export type EntityIdGraph = {
  schemaVersion: "1.0";
  assessmentId: string;
  primaryEntity: string;
  generatedFromDiagnosticAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { nodeCount: number; edgeCount: number; evidenceReferenceCount: number; acceptedFindingCount: number };
  warnings: string[];
};

function normalized(value: string) { return value.trim().replace(/\s+/g, " ").toLowerCase(); }
function uniqueEvidence(items: EvidenceReference[]) {
  const bySegment = new Map<string, EvidenceReference>();
  for (const item of items) if (!bySegment.has(item.segmentId)) bySegment.set(item.segmentId, item);
  return [...bySegment.values()];
}
function acceptedReviewedFindings(diagnostics: DiagnosticEnvelope, review: FindingReview): DiagnosticFinding[] {
  if (!review.reviewedAt) throw new Error("Finding review must be completed before downstream outputs are generated.");
  if (review.diagnosticGeneratedAt !== diagnostics.generatedAt) throw new Error("Finding review is stale because diagnostics were re-run.");
  const byId = new Map(review.findings.map((item) => [item.findingId, item]));
  return diagnostics.findings.flatMap((finding) => {
    const item = byId.get(finding.id);
    if (!item || item.status !== "accepted") return [];
    return [{ ...finding, ...item.edits, reviewStatus: "accepted" as const }];
  });
}

export function projectEntityIdGraph(input: {
  assessmentId: string;
  primaryEntity: string;
  extraction: ExtractionEnvelope;
  extractionReview: ExtractionReview;
  diagnostics: DiagnosticEnvelope;
  findingReview: FindingReview;
}): EntityIdGraph {
  const primaryEntity = input.primaryEntity.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!primaryEntity) throw new Error("Entity/ID map requires the assessment primary entity.");
  if (!input.extractionReview.approved || !input.extractionReview.approvedAt) throw new Error("Entity/ID map requires an approved extraction review.");
  const accepted = acceptedReviewedFindings(input.diagnostics, input.findingReview);
  const reviewById = new Map(input.extractionReview.objects.map((item) => [item.id, item]));
  const confirmed = input.extraction.objects.filter((item) => reviewById.get(item.id)?.status === "confirmed");
  const findingIdsByObject = new Map<string, string[]>();
  for (const finding of accepted) for (const objectId of finding.affectedObjectIds) findingIdsByObject.set(objectId, [...(findingIdsByObject.get(objectId) ?? []), finding.id]);

  const primaryNodeId = "focus_primary_entity";
  const nodes: GraphNode[] = [{ id: primaryNodeId, kind: "primary_entity", label: primaryEntity, evidence: [], acceptedFindingIds: [] }];
  for (const object of confirmed) {
    if (!(object.kind === "entity" || object.kind === "identifier" || object.kind === "system")) continue;
    const reviewed = reviewById.get(object.id)!;
    nodes.push({ id: object.id, kind: object.kind, label: reviewed.displayName, sourceObjectId: object.id, evidence: uniqueEvidence(object.evidence), acceptedFindingIds: findingIdsByObject.get(object.id) ?? [] });
  }

  const nodeIds = new Set(nodes.map((item) => item.id));
  const edges: GraphEdge[] = [];
  for (const identifier of confirmed.filter((item) => item.kind === "identifier" && nodeIds.has(item.id))) {
    edges.push({ id: `edge_focus_${identifier.id}`, kind: "focused_identifier", source: primaryNodeId, target: identifier.id, label: "identifier observed in focused assessment", evidence: uniqueEvidence(identifier.evidence), factStatus: "derived" });
  }

  const systemByName = new Map(confirmed.filter((item) => item.kind === "system").map((item) => [normalized(reviewById.get(item.id)!.displayName), item]));
  for (const integration of confirmed.filter((item) => item.kind === "integration")) {
    const source = integration.attributes.source ? systemByName.get(normalized(integration.attributes.source)) : undefined;
    const target = integration.attributes.target ? systemByName.get(normalized(integration.attributes.target)) : undefined;
    if (!source || !target || !nodeIds.has(source.id) || !nodeIds.has(target.id)) continue;
    edges.push({ id: `edge_integration_${integration.id}`, kind: "integration", source: source.id, target: target.id, label: reviewById.get(integration.id)?.displayName ?? integration.name, evidence: uniqueEvidence(integration.evidence), factStatus: "direct" });
  }

  for (const finding of accepted) {
    const affected = finding.affectedObjectIds.filter((id) => nodeIds.has(id));
    for (const objectId of affected) edges.push({ id: `edge_finding_${finding.id}_${objectId}`, kind: "accepted_finding", source: primaryNodeId, target: objectId, label: finding.title, evidence: uniqueEvidence(finding.evidence), factStatus: "derived" });
  }

  const warnings: string[] = [];
  if (!nodes.some((item) => item.kind === "identifier")) warnings.push("No confirmed identifier objects are available for the focused entity.");
  if (!edges.some((item) => item.kind === "integration")) warnings.push("No direct system-to-system integration edges could be projected from confirmed extraction evidence.");
  warnings.push("Creator/consumer and authority relationships are shown only when directly represented by future extraction fields; this projection does not infer them from missing evidence.");
  return {
    schemaVersion: "1.0", assessmentId: input.assessmentId, primaryEntity, generatedFromDiagnosticAt: input.diagnostics.generatedAt,
    nodes, edges, warnings,
    stats: { nodeCount: nodes.length, edgeCount: edges.length, evidenceReferenceCount: edges.reduce((total, edge) => total + edge.evidence.length, 0), acceptedFindingCount: accepted.length }
  };
}
