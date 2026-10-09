import { createHash } from "node:crypto";
import type { AssessmentDraft } from "./assessment.ts";
import { parseArtifact, type ParsedArtifact } from "./artifact-parser.ts";
import { DeterministicExtractionProvider, type ExtractionEnvelope } from "./extraction.ts";
import { approveExtraction, createExtractionReview, type ExtractionReview } from "./extraction-review.ts";
import { runDeterministicDiagnostics, type DiagnosticEnvelope } from "./diagnostics.ts";
import { completeFindingReview, createFindingReview, type FindingReview } from "./finding-review.ts";
import type { PersistedArtifactMetadata, ProcessingSnapshot } from "./processing-repository.ts";

export const ACME_HEALTHTECH_SAMPLE_ID = "00000000-0000-4000-8000-000000000001";
export const ACME_HEALTHTECH_CREATED_AT = "2026-09-12T15:00:00.000Z";

export const ACME_HEALTHTECH_ARTIFACTS = [
  {
    name: "01-patient-identity.md",
    mediaType: "text/markdown",
    content: `# Patient identity landscape

Entity: Patient
Identifier: patient_id
Identifier: crmPatientId
Identifier: enterprisePatientId

System: Patient Portal
System: CRM
System: Enterprise Identity Hub

Patient Portal is the system of record for Patient.
CRM is the system of record for Patient.

Patient Portal matches Patient using email and date of birth.
CRM matches Patient using phone and legal name.

Patient Portal provides capability: Identity Matching.
CRM provides capability: Identity Matching.

Owner: Digital Experience
Owner: Customer Data Platform
`
  },
  {
    name: "02-integration-landscape.md",
    mediaType: "text/markdown",
    content: `# Integration landscape

System: API Gateway
System: Profile Service
System: Eligibility Service
System: Benefits Service
System: Eligibility DB

Patient Portal synchronously calls API Gateway.
API Gateway synchronously calls Profile Service.
Profile Service synchronously calls Eligibility Service.
Eligibility Service -> Eligibility DB

Profile Service consumes Patient records.
Patient Portal creates Patient records.
`
  },
  {
    name: "03-platform-capabilities.md",
    mediaType: "text/markdown",
    content: `# Platform capability ownership

System: CRM
System: Patient Portal
System: Profile Service

CRM provides capability: Contact Preference Management.
Patient Portal provides capability: Contact Preference Management.
Profile Service provides capability: Profile Aggregation.

Owner: CRM Platform Team
Owner: Profile Platform Team
`
  },
  {
    name: "04-executive-context.md",
    mediaType: "text/markdown",
    content: `# Executive context

Business entity: Patient
Primary concern: Patient identity is resolved independently across digital, CRM, and eligibility workflows.

The modernization objective is to reduce conflicting authority, duplicated matching logic, and brittle synchronous dependencies without introducing live production access into the assessment.
`
  }
] as const;

export type AcmeHealthTechSampleState = {
  assessment: AssessmentDraft;
  processing: ProcessingSnapshot;
  extractionReview: ExtractionReview;
  diagnostics: DiagnosticEnvelope;
  findingReview: FindingReview;
};

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function sha256(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

export async function buildAcmeHealthTechSampleState(): Promise<AcmeHealthTechSampleState> {
  const assessment: AssessmentDraft = {
    id: ACME_HEALTHTECH_SAMPLE_ID,
    status: "draft",
    createdAt: ACME_HEALTHTECH_CREATED_AT,
    companyName: "Acme HealthTech",
    assessmentTitle: "Patient Identity & Platform Diagnostic",
    industry: "Healthcare technology",
    focusArea: "entity-identifier-fragmentation",
    primaryEntity: "Patient",
    knownSystems: "Patient Portal, CRM, Enterprise Identity Hub, API Gateway, Profile Service, Eligibility Service, Benefits Service",
    businessConcern: "Patient identity is fragmented across digital, CRM, profile, and eligibility workflows, creating conflicting authority, duplicated matching logic, and brittle integration dependencies.",
    reportAudience: "CTO, Chief Architect, VP Platform Engineering",
    limitsAcknowledged: true
  };

  const parsedArtifacts: ParsedArtifact[] = ACME_HEALTHTECH_ARTIFACTS.map((artifact) => parseArtifact(artifact.name, bytes(artifact.content)));
  const provider = new DeterministicExtractionProvider();
  const extraction = await provider.extract({ assessmentId: assessment.id, parsedArtifacts });
  const initialReview = createExtractionReview(extraction.objects);
  const extractionReview = approveExtraction({
    ...initialReview,
    objects: initialReview.objects.map((object) => ({ ...object, status: "confirmed" as const }))
  }, "2026-09-12T15:05:00.000Z");
  const diagnostics = runDeterministicDiagnostics({ assessmentId: assessment.id, extraction, review: extractionReview }, "2026-09-12T15:06:00.000Z");
  const initialFindingReview = createFindingReview(diagnostics);
  const findingReview = completeFindingReview({
    ...initialFindingReview,
    findings: initialFindingReview.findings.map((finding) => ({ ...finding, status: "accepted" as const }))
  }, "2026-09-12T15:07:00.000Z");

  const artifacts: PersistedArtifactMetadata[] = ACME_HEALTHTECH_ARTIFACTS.map((artifact, index) => {
    const contentBytes = bytes(artifact.content);
    const parsed = parsedArtifacts[index];
    return {
      storageArtifactId: `sample-artifact-${index + 1}`,
      parserArtifactId: parsed.artifactId,
      originalName: artifact.name,
      mediaType: artifact.mediaType,
      size: contentBytes.byteLength,
      checksumSha256: sha256(contentBytes),
      parser: parsed.parser,
      warnings: parsed.warnings,
      createdAt: new Date(Date.parse(ACME_HEALTHTECH_CREATED_AT) + index * 1000).toISOString()
    };
  });

  return {
    assessment,
    processing: {
      assessmentId: assessment.id,
      artifacts,
      parsedArtifacts,
      extraction: extraction as ExtractionEnvelope,
      persistedAt: "2026-09-12T15:04:00.000Z"
    },
    extractionReview,
    diagnostics,
    findingReview
  };
}
