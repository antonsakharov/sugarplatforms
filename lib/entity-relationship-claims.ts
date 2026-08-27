import { createHash } from "node:crypto";
import type { ParsedArtifact, SourceSegment } from "@/lib/artifact-parser";
import type { ExtractedObject, ExtractionEnvelope, EvidenceReference, ExtractionObjectKind } from "@/lib/extraction";

type RelationshipKind = "creates" | "consumes" | "authority";
type RelationshipClaim = {
  kind: RelationshipKind;
  system: string;
  entity: string;
  evidence: EvidenceReference;
};

const SYSTEM_ENTITY_PATTERNS: Array<{ kind: RelationshipKind; expression: RegExp; systemIndex: number; entityIndex: number }> = [
  { kind: "creates", expression: /\b([A-Za-z][A-Za-z0-9 _./-]{1,80})\s+(?:creates|originates|produces)\s+([A-Za-z][A-Za-z0-9 _./-]{1,80}?)\s+(?:records?|entities?)(?=[.;\n]|$)/gi, systemIndex: 1, entityIndex: 2 },
  { kind: "creates", expression: /\b([A-Za-z][A-Za-z0-9 _./-]{1,80}?)\s+(?:records?|entities?)\s+(?:are\s+)?(?:created|originated|produced)\s+by\s+([A-Za-z][A-Za-z0-9 _./-]{1,80})(?=[.;\n]|$)/gi, systemIndex: 2, entityIndex: 1 },
  { kind: "consumes", expression: /\b([A-Za-z][A-Za-z0-9 _./-]{1,80})\s+(?:consumes|reads|uses)\s+([A-Za-z][A-Za-z0-9 _./-]{1,80}?)\s+(?:records?|entities?)(?=[.;\n]|$)/gi, systemIndex: 1, entityIndex: 2 },
  { kind: "consumes", expression: /\b([A-Za-z][A-Za-z0-9 _./-]{1,80}?)\s+(?:records?|entities?)\s+(?:are\s+)?(?:consumed|read|used)\s+by\s+([A-Za-z][A-Za-z0-9 _./-]{1,80})(?=[.;\n]|$)/gi, systemIndex: 2, entityIndex: 1 },
  { kind: "authority", expression: /\b([A-Za-z][A-Za-z0-9 _./-]{1,80})\s+(?:is|acts as)\s+(?:the\s+)?(?:authoritative system|system of record|source of truth)\s+for\s+([A-Za-z][A-Za-z0-9 _./-]{1,80})(?=[.;\n]|$)/gi, systemIndex: 1, entityIndex: 2 },
  { kind: "authority", expression: /\b(?:authoritative system|system of record|source of truth)\s+for\s+([A-Za-z][A-Za-z0-9 _./-]{1,80})\s*[:=-]\s*([A-Za-z][A-Za-z0-9 _./-]{1,80})(?=[.;\n]|$)/gi, systemIndex: 2, entityIndex: 1 }
];

function normalize(value: string) { return value.trim().replace(/\s+/g, " ").toLowerCase(); }
function bounded(value: string) { return value.trim().replace(/[\s,;:.]+$/g, "").slice(0, 120); }
function objectId(kind: ExtractionObjectKind, normalizedName: string) {
  return `ext_${kind}_${createHash("sha256").update(`${kind}:${normalizedName}`).digest("hex").slice(0, 14)}`;
}
function evidenceFor(segment: SourceSegment): EvidenceReference {
  return { segmentId: segment.id, artifactId: segment.artifactId, artifactName: segment.artifactName, locator: segment.locator.value, evidenceType: "direct" };
}
function relationshipKey(kind: RelationshipKind, entity: string) { return `relationship:${kind}:${normalize(entity)}`; }
function relationshipEvidenceKey(kind: RelationshipKind, entity: string) { return `relationshipEvidence:${kind}:${normalize(entity)}`; }

function claimsFromSegment(segment: SourceSegment): RelationshipClaim[] {
  const claims: RelationshipClaim[] = [];
  for (const pattern of SYSTEM_ENTITY_PATTERNS) {
    pattern.expression.lastIndex = 0;
    for (const match of segment.content.matchAll(pattern.expression)) {
      const system = bounded(match[pattern.systemIndex]);
      const entity = bounded(match[pattern.entityIndex]);
      if (system.length < 2 || entity.length < 2) continue;
      claims.push({ kind: pattern.kind, system, entity, evidence: evidenceFor(segment) });
    }
  }
  return claims;
}

function mergeEvidence(target: EvidenceReference[], evidence: EvidenceReference) {
  if (!target.some((item) => item.segmentId === evidence.segmentId)) target.push(evidence);
}

function ensureObject(byKey: Map<string, ExtractedObject>, kind: "system" | "entity", name: string, evidence: EvidenceReference) {
  const normalizedName = normalize(name);
  const key = `${kind}:${normalizedName}`;
  let object = byKey.get(key);
  if (!object) {
    object = {
      id: objectId(kind, normalizedName),
      kind,
      name,
      normalizedName,
      confidence: 0.9,
      extractionMethod: "local-explicit-relationship-v1",
      evidence: [evidence],
      attributes: {}
    };
    byKey.set(key, object);
  } else mergeEvidence(object.evidence, evidence);
  return object;
}

export function augmentExtractionWithEntityRelationships(extraction: ExtractionEnvelope, parsedArtifacts: ParsedArtifact[]): ExtractionEnvelope {
  const byKey = new Map(extraction.objects.map((object) => [`${object.kind}:${object.normalizedName}`, { ...object, attributes: { ...object.attributes }, evidence: [...object.evidence] }]));
  let claimCount = 0;

  for (const artifact of parsedArtifacts) {
    for (const segment of artifact.sourceSegments) {
      for (const claim of claimsFromSegment(segment)) {
        const system = ensureObject(byKey, "system", claim.system, claim.evidence);
        ensureObject(byKey, "entity", claim.entity, claim.evidence);
        system.attributes[relationshipKey(claim.kind, claim.entity)] = claim.entity;
        system.attributes[relationshipEvidenceKey(claim.kind, claim.entity)] = claim.evidence.segmentId;
        if (claim.kind === "authority") {
          system.attributes.authorityFor ??= claim.entity;
          system.attributes.authorityClaim = "explicit";
        }
        claimCount += 1;
      }
    }
  }

  const objects = [...byKey.values()];
  const warnings = [...extraction.warnings];
  if (claimCount > 0) warnings.push(`${claimCount} explicit creator/consumer/authority relationship claim${claimCount === 1 ? "" : "s"} preserved for review and map projection.`);
  return {
    ...extraction,
    objects,
    warnings,
    stats: {
      objectCount: objects.length,
      evidenceReferenceCount: objects.reduce((total, object) => total + object.evidence.length, 0)
    }
  };
}
