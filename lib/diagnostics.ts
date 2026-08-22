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
  category: "entity_identity" | "ownership" | "platform_capability";
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
      id: stableFindingId(this.id, candidates.map((item) => item.id)),
      ruleId: this.id,
      ruleVersion: this.version,
      category: "entity_identity",
      severity: candidates.length >= 3 ? "high" : "medium",
      confidence: 0.86,
      factStatus: "derived",
      title: "Multiple identifiers are in use for the focused entity scope",
      description: `The approved architecture evidence contains ${candidates.length} distinct identifier definitions: ${candidates.map((item) => item.reviewedName).join(", ")}. In a one-primary-entity assessment, this is a fragmentation signal that should be validated before integration or consolidation decisions.`,
      businessImpact: "Multiple identifiers can increase reconciliation cost, slow cross-system reporting, and make ownership of customer or business-entity identity harder to govern.",
      technicalImpact: "Integrations may require translation or matching logic between identifiers, increasing coupling and the risk of inconsistent entity resolution.",
      affectedObjectIds: candidates.map((item) => item.id),
      evidence,
      recommendation: "Document the authoritative identifier, allowed alternate identifiers, and explicit mappings between them before expanding integrations around the primary entity.",
      validationQuestions: ["Which identifier is authoritative for the primary entity?", "Where are alternate identifiers created and translated?", "Are identifier mappings deterministic and governed?"],
      reviewStatus: "pending"
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
      const evidence = uniqueEvidence(candidates);
      return [{
        id: stableFindingId(this.id, candidates.map((item) => item.id)),
        ruleId: this.id,
        ruleVersion: this.version,
        category: "entity_identity" as const,
        severity: "high" as const,
        confidence: 0.94,
        factStatus: "derived" as const,
        title: `Multiple systems claim authority for ${group.entity}`,
        description: `The approved architecture evidence explicitly identifies ${candidates.map((item) => item.reviewedName).join(", ")} as authoritative systems for ${group.entity}. These directly supported claims conflict and should be reconciled before downstream systems treat either source as canonical.`,
        businessImpact: "Competing authority claims can create inconsistent reporting, duplicate reconciliation work, disputed ownership, and conflicting customer or business-entity outcomes.",
        technicalImpact: "Downstream integrations may consume different canonical values or implement source-specific conflict resolution, increasing coupling and data inconsistency risk.",
        affectedObjectIds: candidates.map((item) => item.id),
        evidence,
        recommendation: `Choose and document one authoritative source for ${group.entity}, define transition or exception rules for other systems, and make consumers reference that governance decision explicitly.`,
        validationQuestions: [`Which system is formally authoritative for ${group.entity}?`, "Are the competing claims scoped to different lifecycle stages or regions?", "Which consumers currently rely on each claimed authority?"],
        reviewStatus: "pending" as const
      }];
    });
  }
}

export class DuplicateMatchingLogicRule implements DiagnosticRule {
  readonly id = "duplicate-matching-logic";
  readonly version = "1.0.0";

  evaluate(objects: DiagnosticObject[]): DiagnosticFinding[] {
    const claimsByEntity = new Map<string, { entity: string; systems: Map<string, DiagnosticObject> }>();
    for (const system of objects.filter((item) => item.kind === "system" && item.attributes.matchingFor && item.attributes.matchingClaim === "explicit")) {
      const entity = system.attributes.matchingFor.trim();
      if (!entity) continue;
      const key = normalized(entity);
      const group = claimsByEntity.get(key) ?? { entity, systems: new Map<string, DiagnosticObject>() };
      group.systems.set(normalized(system.reviewedName), system);
      claimsByEntity.set(key, group);
    }

    return [...claimsByEntity.values()].flatMap((group) => {
      const candidates = [...group.systems.values()];
      if (candidates.length < 2) return [];
      const methods = candidates.map((item) => item.attributes.matchingMethod).filter(Boolean);
      const methodSummary = methods.length > 0 ? ` Documented methods include ${methods.join("; ")}.` : "";
      return [{
        id: stableFindingId(this.id, candidates.map((item) => item.id)),
        ruleId: this.id,
        ruleVersion: this.version,
        category: "entity_identity" as const,
        severity: "high" as const,
        confidence: 0.92,
        factStatus: "derived" as const,
        title: `Matching logic for ${group.entity} is implemented in multiple systems`,
        description: `The approved architecture evidence explicitly states that ${candidates.map((item) => item.reviewedName).join(", ")} perform matching or entity-resolution logic for ${group.entity}.${methodSummary} This indicates duplicated decision logic that should be compared before changing identifiers or integration behavior.`,
        businessImpact: "Independent matching logic can produce inconsistent entity decisions, duplicate reconciliation work, and different customer or business outcomes across channels.",
        technicalImpact: "Multiple implementations of entity resolution increase rule drift, testing surface area, integration coupling, and migration risk when matching criteria change.",
        affectedObjectIds: candidates.map((item) => item.id),
        evidence: uniqueEvidence(candidates),
        recommendation: `Inventory and compare the matching rules for ${group.entity}, designate a governed matching capability or contract, and define how exceptions are handled before consolidating implementations.`,
        validationQuestions: [`Do the ${group.entity} matching implementations use the same fields, precedence, and thresholds?`, "Which implementation is authoritative when results disagree?", "Can matching decisions be centralized or governed through one shared contract?"],
        reviewStatus: "pending" as const
      }];
    });
  }
}

export class DuplicatePlatformCapabilityRule implements DiagnosticRule {
  readonly id = "duplicate-platform-capability";
  readonly version = "1.0.0";

  evaluate(objects: DiagnosticObject[]): DiagnosticFinding[] {
    const claimsByCapability = new Map<string, { capability: string; systems: Map<string, DiagnosticObject> }>();
    for (const system of objects.filter((item) => item.kind === "system" && item.attributes.capabilityClaim === "explicit")) {
      for (const [attributeKey, capability] of Object.entries(system.attributes)) {
        if (!attributeKey.startsWith("capability:") || !capability.trim()) continue;
        const key = normalized(capability);
        const group = claimsByCapability.get(key) ?? { capability: capability.trim(), systems: new Map<string, DiagnosticObject>() };
        group.systems.set(normalized(system.reviewedName), system);
        claimsByCapability.set(key, group);
      }
    }

    return [...claimsByCapability.values()].flatMap((group) => {
      const candidates = [...group.systems.values()];
      if (candidates.length < 2) return [];
      return [{
        id: stableFindingId(this.id, candidates.map((item) => item.id)),
        ruleId: this.id,
        ruleVersion: this.version,
        category: "platform_capability" as const,
        severity: "medium" as const,
        confidence: 0.9,
        factStatus: "derived" as const,
        title: `${group.capability} capability is implemented in multiple systems`,
        description: `The approved architecture evidence explicitly states that ${candidates.map((item) => item.reviewedName).join(", ")} provide or implement the ${group.capability} capability. This is a directly supported duplication signal, not a similarity inference, and should be reviewed for intentional specialization versus redundant platform logic.`,
        businessImpact: "Duplicated platform capabilities can split investment, create inconsistent user outcomes, and increase the cost of policy or process changes across products.",
        technicalImpact: "Parallel implementations increase maintenance, testing, integration, and migration surface area and can drift in behavior or contracts over time.",
        affectedObjectIds: candidates.map((item) => item.id),
        evidence: uniqueEvidence(candidates),
        recommendation: `Compare the ${group.capability} implementations, document intentional differences, and consolidate or establish one governed shared capability where duplication is not required.`,
        validationQuestions: [`Are the ${group.capability} implementations intentionally scoped to different use cases?`, "Do they expose compatible contracts and policies?", "Could one governed platform capability serve both systems without creating unacceptable coupling?"],
        reviewStatus: "pending" as const
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
    const evidence = uniqueEvidence(governable);
    return [{
      id: stableFindingId(this.id, governable.map((item) => item.id)),
      ruleId: this.id,
      ruleVersion: this.version,
      category: "ownership",
      severity: "medium",
      confidence: 0.8,
      factStatus: "derived",
      title: "No ownership evidence was found for reviewed architecture objects",
      description: `The approved extraction contains ${governable.length} system, entity, or capability object${governable.length === 1 ? "" : "s"}, but no confirmed owner object. This does not prove ownership is absent; it identifies a documentation and governance gap in the supplied assessment evidence.`,
      businessImpact: "Unclear ownership can slow prioritization, incident escalation, funding decisions, and cross-team accountability.",
      technicalImpact: "Architecture changes and dependency decisions may lack a clear accountable team, increasing handoff friction and operational ambiguity.",
      affectedObjectIds: governable.map((item) => item.id),
      evidence,
      recommendation: "Add explicit accountable owners for the primary systems, entities, and platform capabilities, then re-run the assessment with that evidence included.",
      validationQuestions: ["Who is accountable for each reviewed system and entity?", "Is ownership documented in an authoritative source?", "Who approves changes to shared platform capabilities?"],
      reviewStatus: "pending"
    }];
  }
}

export const DETERMINISTIC_RULES: readonly DiagnosticRule[] = [new FragmentedIdentifierRule(), new CompetingAuthorityRule(), new DuplicateMatchingLogicRule(), new DuplicatePlatformCapabilityRule(), new OwnershipGapRule()];

export function runDeterministicDiagnostics(context: DiagnosticContext, generatedAt = new Date().toISOString()): DiagnosticEnvelope {
  const objects = approvedDiagnosticObjects(context.extraction, context.review);
  const findings = DETERMINISTIC_RULES.flatMap((rule) => rule.evaluate(objects));
  for (const finding of findings) {
    if (finding.evidence.length === 0) throw new Error(`Diagnostic finding ${finding.id} has no evidence.`);
    if (!finding.ruleId || !finding.ruleVersion) throw new Error(`Diagnostic finding ${finding.id} is missing rule provenance.`);
  }
  return {
    schemaVersion: "1.0",
    engineVersion: "deterministic-v1",
    assessmentId: context.assessmentId,
    generatedAt,
    extractionApprovedAt: context.review.approvedAt!,
    findings,
    stats: {
      activeObjectCount: objects.length,
      ruleCount: DETERMINISTIC_RULES.length,
      findingCount: findings.length,
      evidenceReferenceCount: findings.reduce((total, item) => total + item.evidence.length, 0)
    }
  };
}
