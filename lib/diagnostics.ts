import type { EvidenceReference, ExtractionEnvelope, ExtractedObject } from "@/lib/extraction";
import type { ExtractionReview } from "@/lib/extraction-review";

export type DiagnosticSeverity = "low" | "medium" | "high";
export type DiagnosticFactStatus = "derived";
export type FindingReviewStatus = "pending" | "accepted" | "rejected";

export type DiagnosticObject = ExtractedObject & { reviewedName: string };
export type DiagnosticFinding = {
  id: string;
  ruleId: string;
  ruleVersion: string;
  category: "entity_identity" | "ownership";
  severity: DiagnosticSeverity;
  confidence: number;
  factStatus: DiagnosticFactStatus;
  title: string;
  description: string;
  businessImpact: string;
  technicalImpact: string;
  affectedObjectIds: string[];
  evidence: EvidenceReference[];
  recommendation: string;
  validationQuestions: string[];
  reviewStatus: FindingReviewStatus;
};

export type DiagnosticEnvelope = {
  schemaVersion: "1.0";
  engineVersion: "deterministic-v1";
  assessmentId: string;
  generatedAt: string;
  extractionApprovedAt: string;
  findings: DiagnosticFinding[];
  stats: {
    activeObjectCount: number;
    ruleCount: number;
    findingCount: number;
    evidenceReferenceCount: number;
  };
};

export type DiagnosticContext = {
  assessmentId: string;
  extraction: ExtractionEnvelope;
  review: ExtractionReview;
};

export interface DiagnosticRule {
  readonly id: string;
  readonly version: string;
  evaluate(objects: DiagnosticObject[]): DiagnosticFinding[];
}

function normalized(value: string) { return value.trim().replace(/\s+/g, " ").toLowerCase(); }
function stableFindingId(ruleId: string, objectIds: string[]) {
  const fingerprint = `${ruleId}:${[...objectIds].sort().join(":")}`;
  let hash = 2166136261;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `finding_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function uniqueEvidence(objects: DiagnosticObject[]) {
  const bySegment = new Map<string, EvidenceReference>();
  for (const object of objects) for (const evidence of object.evidence) if (!bySegment.has(evidence.segmentId)) bySegment.set(evidence.segmentId, evidence);
  return [...bySegment.values()];
}

export function approvedDiagnosticObjects(extraction: ExtractionEnvelope, review: ExtractionReview): DiagnosticObject[] {
  if (!review.approved || !review.approvedAt) throw new Error("Diagnostics require an approved extraction review.");
  const reviewedById = new Map(review.objects.map((item) => [item.id, item]));
  const extractedIds = new Set(extraction.objects.map((item) => item.id));
  if (review.objects.some((item) => !extractedIds.has(item.id))) throw new Error("Extraction review contains an object that is not present in the extraction envelope.");
  if (extraction.objects.some((item) => !reviewedById.has(item.id))) throw new Error("Extraction review does not cover every extracted object.");

  return extraction.objects.flatMap((item) => {
    const reviewed = reviewedById.get(item.id);
    if (!reviewed || reviewed.status !== "confirmed") return [];
    return [{ ...item, reviewedName: reviewed.displayName }];
  });
}

export class FragmentedIdentifierRule implements DiagnosticRule {
  readonly id = "fragmented-identifiers";
  readonly version = "1.0.0";

  evaluate(objects: DiagnosticObject[]): DiagnosticFinding[] {
    const identifiers = objects.filter((item) => item.kind === "identifier");
    const distinct = new Map<string, DiagnosticObject>();
    for (const identifier of identifiers) distinct.set(normalized(identifier.reviewedName), identifier);
    const candidates = [...distinct.values()];
    if (candidates.length < 2) return [];
    const evidence = uniqueEvidence(candidates);
    return [{
      id: stableFindingId(this.id, candidates.map((item) => item.id)), ruleId: this.id, ruleVersion: this.version,
      category: "entity_identity", severity: candidates.length >= 3 ? "high" : "medium", confidence: 0.86, factStatus: "derived",
      title: "Multiple identifiers are in use for the focused entity scope",
      description: `The approved architecture evidence contains ${candidates.length} distinct identifier definitions: ${candidates.map((item) => item.reviewedName).join(", ")}. In a one-primary-entity assessment, this is a fragmentation signal that should be validated before integration or consolidation decisions.`,
      businessImpact: "Multiple identifiers can increase reconciliation cost, slow cross-system reporting, and make ownership of customer or business-entity identity harder to govern.",
      technicalImpact: "Integrations may require translation or matching logic between identifiers, increasing coupling and the risk of inconsistent entity resolution.",
      affectedObjectIds: candidates.map((item) => item.id), evidence,
      recommendation: "Document the authoritative identifier, allowed alternate identifiers, and explicit mappings between them before expanding integrations around the primary entity.",
      validationQuestions: ["Which identifier is authoritative for the primary entity?", "Where are alternate identifiers created and translated?", "Are identifier mappings deterministic and governed?"], reviewStatus: "pending"
    }];
  }
}

export class CompetingAuthorityRule implements DiagnosticRule {
  readonly id = "competing-authority";
  readonly version = "1.0.0";

  evaluate(objects: DiagnosticObject[]): DiagnosticFinding[] {
    const claimsByEntity = new Map<string, { entity: string; systems: Map<string, DiagnosticObject> }>();
    for (const system of objects.filter((item) => item.kind === "system" && item.attributes.authorityFor)) {
      const entity = system.attributes.authorityFor.trim();
      if (!entity) continue;
      const key = normalized(entity);
      const group = claimsByEntity.get(key) ?? { entity, systems: new Map<string, DiagnosticObject>() };
      group.systems.set(normalized(system.reviewedName), system);
      claimsByEntity.set(key, group);
    }
    return [...claimsByEntity.values()].flatMap((group) => {
      const candidates = [...group.systems.values()];
      if (candidates.length < 2) return [];
      return [{
        id: stableFindingId(this.id, candidates.map((item) => item.id)), ruleId: this.id, ruleVersion: this.version,
        category: "entity_identity" as const, severity: "high" as const, confidence: 0.94, factStatus: "derived" as const,
        title: `Multiple systems claim authority for ${group.entity}`,
        description: `The approved architecture evidence explicitly identifies ${candidates.map((item) => item.reviewedName).join(", ")} as authoritative systems for ${group.entity}. These directly supported claims conflict and should be reconciled before downstream systems treat either source as canonical.`,
        businessImpact: "Competing authority claims can create inconsistent reporting, duplicate reconciliation work, disputed ownership, and conflicting customer or business-entity outcomes.",
        technicalImpact: "Downstream integrations may consume different canonical values or implement source-specific conflict resolution, increasing coupling and data inconsistency risk.",
        affectedObjectIds: candidates.map((item) => item.id), evidence: uniqueEvidence(candidates),
        recommendation: `Choose and document one authoritative source for ${group.entity}, define transition or exception rules for other systems, and make consumers reference that governance decision explicitly.`,
        validationQuestions: [`Which system is formally authoritative for ${group.entity}?`, "Are the competing claims scoped to different lifecycle stages or regions?", "Which consumers currently rely on each claimed authority?"], reviewStatus: "pending" as const
      }];
    });
  }
}

const MATCHING_TERMS = /\b(?:matching|match|deduplication|dedupe|entity resolution|record linkage)\b/i;
const MATCHING_SUBJECT = /^(.{2,80}?)\s+(?:matching|match|deduplication|dedupe|entity resolution|record linkage)\b/i;
function matchingSubject(name: string) {
  const match = MATCHING_SUBJECT.exec(name.trim());
  return match ? normalized(match[1]) : "focused entity";
}

export class DuplicateMatchingLogicRule implements DiagnosticRule {
  readonly id = "duplicate-matching-logic";
  readonly version = "1.0.0";

  evaluate(objects: DiagnosticObject[]): DiagnosticFinding[] {
    const matchingCapabilities = objects.filter((item) => item.kind === "capability" && MATCHING_TERMS.test(item.reviewedName));
    const groups = new Map<string, Map<string, DiagnosticObject>>();
    for (const capability of matchingCapabilities) {
      const subject = matchingSubject(capability.reviewedName);
      const group = groups.get(subject) ?? new Map<string, DiagnosticObject>();
      group.set(normalized(capability.reviewedName), capability);
      groups.set(subject, group);
    }
    return [...groups.entries()].flatMap(([subject, byName]) => {
      const candidates = [...byName.values()];
      if (candidates.length < 2) return [];
      const label = subject === "focused entity" ? "the focused entity" : subject;
      return [{
        id: stableFindingId(this.id, candidates.map((item) => item.id)), ruleId: this.id, ruleVersion: this.version,
        category: "entity_identity" as const, severity: "medium" as const, confidence: 0.82, factStatus: "derived" as const,
        title: `Multiple matching capabilities are documented for ${label}`,
        description: `The approved architecture evidence contains ${candidates.length} distinct explicitly named matching or entity-resolution capabilities for ${label}: ${candidates.map((item) => item.reviewedName).join(", ")}. This is a duplicate-matching signal, not proof that the implementations are functionally identical; their rules and operating scope require human validation.`,
        businessImpact: "Parallel matching approaches can produce inconsistent entity counts and customer or business-entity outcomes, while increasing reconciliation and governance cost.",
        technicalImpact: "Different matching implementations may apply conflicting normalization, thresholds, survivorship, or merge rules and can create hard-to-debug identity divergence across systems.",
        affectedObjectIds: candidates.map((item) => item.id), evidence: uniqueEvidence(candidates),
        recommendation: "Inventory the matching rules, inputs, thresholds, survivorship behavior, and consumers for each capability; consolidate or explicitly govern intentional differences before expanding entity integrations.",
        validationQuestions: ["Do these capabilities resolve the same business entity and lifecycle stage?", "Which matching rules and thresholds differ?", "Which implementation is authoritative when results disagree?"], reviewStatus: "pending" as const
      }];
    });
  }
}

export class OwnershipGapRule implements DiagnosticRule {
  readonly id = "ownership-gap";
  readonly version = "1.0.0";

  evaluate(objects: DiagnosticObject[]): DiagnosticFinding[] {
    const owners = objects.filter((item) => item.kind === "owner");
    const governable = objects.filter((item) => item.kind === "system" || item.kind === "capability" || item.kind === "entity");
    if (owners.length > 0 || governable.length === 0) return [];
    return [{
      id: stableFindingId(this.id, governable.map((item) => item.id)), ruleId: this.id, ruleVersion: this.version,
      category: "ownership", severity: "medium", confidence: 0.8, factStatus: "derived",
      title: "No ownership evidence was found for reviewed architecture objects",
      description: `The approved extraction contains ${governable.length} system, entity, or capability object${governable.length === 1 ? "" : "s"}, but no confirmed owner object. This does not prove ownership is absent; it identifies a documentation and governance gap in the supplied assessment evidence.`,
      businessImpact: "Unclear ownership can slow prioritization, incident escalation, funding decisions, and cross-team accountability.",
      technicalImpact: "Architecture changes and dependency decisions may lack a clear accountable team, increasing handoff friction and operational ambiguity.",
      affectedObjectIds: governable.map((item) => item.id), evidence: uniqueEvidence(governable),
      recommendation: "Add explicit accountable owners for the primary systems, entities, and platform capabilities, then re-run the assessment with that evidence included.",
      validationQuestions: ["Who is accountable for each reviewed system and entity?", "Is ownership documented in an authoritative source?", "Who approves changes to shared platform capabilities?"], reviewStatus: "pending"
    }];
  }
}

export const DETERMINISTIC_RULES: readonly DiagnosticRule[] = [new FragmentedIdentifierRule(), new CompetingAuthorityRule(), new DuplicateMatchingLogicRule(), new OwnershipGapRule()];

export function runDeterministicDiagnostics(context: DiagnosticContext, generatedAt = new Date().toISOString()): DiagnosticEnvelope {
  const objects = approvedDiagnosticObjects(context.extraction, context.review);
  const findings = DETERMINISTIC_RULES.flatMap((rule) => rule.evaluate(objects));
  for (const finding of findings) {
    if (finding.evidence.length === 0) throw new Error(`Diagnostic finding ${finding.id} has no evidence.`);
    if (!finding.ruleId || !finding.ruleVersion) throw new Error(`Diagnostic finding ${finding.id} is missing rule provenance.`);
  }
  return {
    schemaVersion: "1.0", engineVersion: "deterministic-v1", assessmentId: context.assessmentId,
    generatedAt, extractionApprovedAt: context.review.approvedAt!, findings,
    stats: { activeObjectCount: objects.length, ruleCount: DETERMINISTIC_RULES.length, findingCount: findings.length, evidenceReferenceCount: findings.reduce((total, item) => total + item.evidence.length, 0) }
  };
}
