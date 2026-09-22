import type { AssessmentDraft } from "./assessment";
import type { DiagnosticEnvelope, DiagnosticFinding } from "./diagnostics";
import type { ExtractionEnvelope } from "./extraction";
import type { ExtractionReview } from "./extraction-review";
import type { FindingReview } from "./finding-review";
import type { ProcessingSnapshot } from "./processing-repository";
import type { ArtifactReportItem } from "./reporting";

type AssessmentPayload = { assessment: AssessmentDraft };
type ExtractionReviewPayload = {
  assessmentId: string;
  extraction: ExtractionEnvelope;
  review: ExtractionReview;
  stalePersistedReview: boolean;
};
type FindingReviewPayload = {
  assessmentId: string;
  persisted: null | {
    diagnostics: DiagnosticEnvelope;
    review: FindingReview;
    acceptedFindings: DiagnosticFinding[];
    stale: boolean;
    updatedAt: string;
  };
};

type StorageLike = Pick<Storage, "setItem" | "removeItem">;
type FetchLike = typeof fetch;

export type ServerDiagnosticState = {
  assessment: AssessmentDraft;
  processing: ProcessingSnapshot;
  artifacts: ArtifactReportItem[];
  extraction: ExtractionEnvelope;
  extractionReview: ExtractionReview;
  diagnostics: DiagnosticEnvelope;
  findingReview: FindingReview;
  acceptedFindings: DiagnosticFinding[];
  findingReviewUpdatedAt: string;
};

async function requestJson<T>(fetcher: FetchLike, url: string): Promise<T> {
  const response = await fetcher(url, { cache: "no-store" });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed with status ${response.status}.`);
  return payload;
}

function assertAssessmentId(expected: string, actual: string, label: string) {
  if (actual !== expected) throw new Error(`${label} is outside the active assessment boundary.`);
}

function compatibilityCache(storage: StorageLike | null, state: ServerDiagnosticState) {
  if (!storage) return;
  storage.setItem(`sugar:assessment:${state.assessment.id}`, JSON.stringify(state.assessment));
  storage.setItem(`sugar:artifacts:${state.assessment.id}`, JSON.stringify(state.artifacts));
  storage.setItem(`sugar:extraction:${state.assessment.id}`, JSON.stringify(state.extraction));
  storage.setItem(`sugar:extraction-review:${state.assessment.id}`, JSON.stringify(state.extractionReview));
  storage.setItem(`sugar:diagnostics:${state.assessment.id}`, JSON.stringify(state.diagnostics));
  storage.setItem(`sugar:finding-review:${state.assessment.id}`, JSON.stringify(state.findingReview));
}

export function validateCompletedFindingState(state: ServerDiagnosticState) {
  if (!state.extractionReview.approved || !state.extractionReview.approvedAt) throw new Error("Approve the current extraction before using downstream reviewed outputs.");
  if (!state.findingReview.reviewedAt) throw new Error("Complete finding review before using downstream reviewed outputs.");
  if (state.findingReview.findings.some((item) => item.status === "pending")) throw new Error("Completed finding review cannot contain pending decisions.");
  if (state.findingReview.diagnosticGeneratedAt !== state.diagnostics.generatedAt) throw new Error("Finding review is stale because diagnostics changed.");
  const acceptedIds = new Set(state.findingReview.findings.filter((item) => item.status === "accepted").map((item) => item.findingId));
  if (state.acceptedFindings.length !== acceptedIds.size || state.acceptedFindings.some((finding) => !acceptedIds.has(finding.id))) {
    throw new Error("Server accepted-findings materialization does not match the completed review.");
  }
  return state;
}

export async function loadServerDiagnosticState(
  assessmentId: string,
  options: { fetcher?: FetchLike; storage?: StorageLike | null } = {}
): Promise<ServerDiagnosticState> {
  const fetcher = options.fetcher ?? fetch;
  const storage = options.storage === undefined ? (typeof localStorage === "undefined" ? null : localStorage) : options.storage;
  const [assessmentPayload, processing, extractionPayload, findingPayload] = await Promise.all([
    requestJson<AssessmentPayload>(fetcher, `/api/assessments/${assessmentId}`),
    requestJson<ProcessingSnapshot>(fetcher, `/api/assessments/${assessmentId}/processing`),
    requestJson<ExtractionReviewPayload>(fetcher, `/api/assessments/${assessmentId}/extraction-review`),
    requestJson<FindingReviewPayload>(fetcher, `/api/assessments/${assessmentId}/finding-review`)
  ]);

  assertAssessmentId(assessmentId, assessmentPayload.assessment.id, "Assessment state");
  assertAssessmentId(assessmentId, processing.assessmentId, "Processing state");
  assertAssessmentId(assessmentId, extractionPayload.assessmentId, "Extraction review state");
  assertAssessmentId(assessmentId, findingPayload.assessmentId, "Finding review state");
  if (extractionPayload.stalePersistedReview || !extractionPayload.review.approved || !extractionPayload.review.approvedAt) {
    throw new Error("Approve the current extraction before loading diagnostics.");
  }
  const persisted = findingPayload.persisted;
  if (!persisted) throw new Error("Run deterministic diagnostics before loading reviewed outputs.");
  if (persisted.stale) throw new Error("Persisted finding review is stale because the approved extraction changed.");
  assertAssessmentId(assessmentId, persisted.diagnostics.assessmentId, "Diagnostics");
  assertAssessmentId(assessmentId, persisted.review.assessmentId, "Finding review");

  const state: ServerDiagnosticState = {
    assessment: assessmentPayload.assessment,
    processing,
    artifacts: processing.artifacts.map((artifact) => ({
      name: artifact.originalName,
      type: artifact.mediaType,
      size: artifact.size,
      status: "validated"
    })),
    extraction: extractionPayload.extraction,
    extractionReview: extractionPayload.review,
    diagnostics: persisted.diagnostics,
    findingReview: persisted.review,
    acceptedFindings: persisted.acceptedFindings,
    findingReviewUpdatedAt: persisted.updatedAt
  };
  compatibilityCache(storage, state);
  return state;
}

export async function loadServerAcceptedFindingState(
  assessmentId: string,
  options: { fetcher?: FetchLike; storage?: StorageLike | null } = {}
) {
  return validateCompletedFindingState(await loadServerDiagnosticState(assessmentId, options));
}
