import { NextResponse } from "next/server";
import { PRODUCT_LIMITS } from "@/lib/config";
import { inspectArtifactBytes } from "@/lib/artifact-content-policy";
import { parseArtifact, type ParsedArtifact } from "@/lib/artifact-parser";
import { validateArtifactSet } from "@/lib/upload";
import { DeterministicExtractionProvider, validateExtractionEnvelope, type ExtractionEnvelope } from "@/lib/extraction";
import { augmentExtractionWithEntityRelationships } from "@/lib/entity-relationship-claims";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";
import { getAssessmentRepository } from "@/lib/server-assessment-store";
import { getArtifactStorage } from "@/lib/server-artifact-storage";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

type InspectedArtifact = {
  name: string; size: number; type: string; status: "validated" | "review_required" | "blocked"; errors: string[];
  checksumSha256: string; pageEstimate: { pages: number | null; method: string; confidence: string };
  riskWarnings: Array<{ category: string; code: string; message: string }>; scanCoverage: string;
};
type ProcessingArtifact = { artifactName: string; status: "parsed" | "failed" | "withheld"; parser?: string; segmentCount?: number; warnings?: string[]; message?: string };
type ParsingResult = { status: "ready" | "partial" | "withheld"; parsedArtifacts: ParsedArtifact[]; processingArtifacts: ProcessingArtifact[]; errors: Array<{ artifactName: string; message: string }>; segmentCount: number };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = requireServerPermission("artifact:create");
    const scope = scopeFromTenant(auth.tenant);
    if (!getAssessmentRepository().findById(scope, id)) return NextResponse.json({ error: "Assessment not found." }, { status: 404 });

    const formData = await request.formData();
    const entries = formData.getAll("files");
    const files = entries.filter((entry): entry is File => entry instanceof File);
    if (entries.length !== files.length) return NextResponse.json({ error: "Only file uploads are accepted." }, { status: 400 });

    const metadataValidation = validateArtifactSet(files);
    if (!metadataValidation.accepted) return NextResponse.json({ assessmentId: id, ...metadataValidation }, { status: 400 });

    const artifacts: InspectedArtifact[] = [];
    const fileBytes = new Map<string, Uint8Array>();
    const checksums = new Map<string, string>();
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      fileBytes.set(file.name, bytes);
      const inspection = inspectArtifactBytes(file.name, bytes);
      const errors: string[] = [];
      const firstName = checksums.get(inspection.checksumSha256);
      if (firstName) errors.push(`Duplicate content: ${file.name} matches ${firstName}.`); else checksums.set(inspection.checksumSha256, file.name);
      artifacts.push({ name: file.name, size: file.size, type: file.type || "application/octet-stream", status: errors.length > 0 ? "blocked" : inspection.riskWarnings.length > 0 || inspection.pageEstimate.pages === null ? "review_required" : "validated", errors, ...inspection });
    }

    const measurablePages = artifacts.reduce((total, artifact) => total + (artifact.pageEstimate.pages ?? 0), 0);
    const unmeasurableFiles = artifacts.filter((artifact) => artifact.pageEstimate.pages === null).length;
    const setErrors: string[] = [];
    if (measurablePages > PRODUCT_LIMITS.maxTotalPages) setErrors.push(`Estimated total page count ${measurablePages} exceeds the ${PRODUCT_LIMITS.maxTotalPages}-page limit.`);
    if (artifacts.some((artifact) => artifact.errors.length > 0)) setErrors.push("Duplicate artifact content must be removed or replaced.");
    if (setErrors.length > 0) return NextResponse.json({ assessmentId: id, accepted: false, setErrors, artifacts, limits: { maxFiles: PRODUCT_LIMITS.maxFiles, maxFileBytes: PRODUCT_LIMITS.maxFileBytes, maxTotalPages: PRODUCT_LIMITS.maxTotalPages } }, { status: 400 });

    const warningCount = artifacts.reduce((total, artifact) => total + artifact.riskWarnings.length, 0);
    const readyForAnalysis = warningCount === 0 && unmeasurableFiles === 0;
    const readiness = { status: readyForAnalysis ? "ready" : "review_required", readyForAnalysis, totalPages: measurablePages, unmeasurableFiles, warningCount,
      message: readyForAnalysis ? "Artifact set passed upload readiness checks and is ready for parsing." : "Replace or remove flagged artifacts before analysis. Page counts and content-risk scanning are best-effort and do not guarantee sensitive-data detection." } as const;

    const persistedArtifacts: Array<{ id: string; name: string; size: number; checksumSha256: string; persistedAt: string }> = [];
    if (readyForAnalysis) {
      for (const artifact of artifacts) {
        const stored = await getArtifactStorage().put(scope, id, { originalName: artifact.name, mediaType: artifact.type, bytes: fileBytes.get(artifact.name) ?? new Uint8Array(), checksumSha256: artifact.checksumSha256 });
        persistedArtifacts.push({ id: stored.id, name: stored.originalName, size: stored.size, checksumSha256: stored.checksumSha256, persistedAt: stored.createdAt });
      }
    }

    const parsing: ParsingResult = { status: readyForAnalysis ? "ready" : "withheld", parsedArtifacts: [], processingArtifacts: [], errors: [], segmentCount: 0 };
    if (!readyForAnalysis) parsing.processingArtifacts = files.map((file) => ({ artifactName: file.name, status: "withheld", message: "Parsing withheld until upload readiness issues are resolved." }));
    else {
      for (const file of files) {
        try {
          const parsed = parseArtifact(file.name, fileBytes.get(file.name) ?? new Uint8Array());
          parsing.parsedArtifacts.push(parsed); parsing.segmentCount += parsed.sourceSegments.length;
          parsing.processingArtifacts.push({ artifactName: file.name, status: "parsed", parser: parsed.parser, segmentCount: parsed.sourceSegments.length, warnings: parsed.warnings });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Artifact parsing failed.";
          parsing.errors.push({ artifactName: file.name, message }); parsing.processingArtifacts.push({ artifactName: file.name, status: "failed", message });
        }
      }
      if (parsing.errors.length > 0) parsing.status = "partial";
    }

    let extraction: ExtractionEnvelope = { schemaVersion: "1.0", provider: "local-deterministic-v1", promptVersion: "platform-extraction-v1", status: "withheld", objects: [], warnings: ["Extraction withheld until parsing produces reviewable evidence."], stats: { objectCount: 0, evidenceReferenceCount: 0 } };
    if (parsing.parsedArtifacts.length > 0) {
      try {
        const provider = new DeterministicExtractionProvider();
        const baseExtraction = validateExtractionEnvelope(await provider.extract({ assessmentId: id, parsedArtifacts: parsing.parsedArtifacts }));
        extraction = validateExtractionEnvelope(augmentExtractionWithEntityRelationships(baseExtraction, parsing.parsedArtifacts));
        if (parsing.status === "partial") extraction = { ...extraction, status: "partial", warnings: [...extraction.warnings, "Extraction is partial because one or more artifacts failed parsing."] };
      } catch (error) { extraction = { ...extraction, status: "partial", warnings: [error instanceof Error ? error.message : "Architecture extraction failed."] }; }
    }

    return NextResponse.json({ assessmentId: id, accepted: true, storageMode: readyForAnalysis ? "private-tenant-scoped-local-adapter" : "not-persisted-until-ready", persistedArtifacts, limits: { maxFiles: PRODUCT_LIMITS.maxFiles, maxFileBytes: PRODUCT_LIMITS.maxFileBytes, maxTotalPages: PRODUCT_LIMITS.maxTotalPages }, artifacts, readiness, parsing, extraction }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401 });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }
}
