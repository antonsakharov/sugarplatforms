import { z } from "zod";
import type { DiagnosticEnvelope } from "./diagnostics.ts";
import type { ExtractionReview } from "./extraction-review.ts";
import type { FindingReview } from "./finding-review.ts";
import { acceptedFindings } from "./finding-review.ts";
import { diagnosticFingerprint, StaleFindingReviewError, validateFindingReviewAgainstDiagnostics, type PersistedFindingReview } from "./finding-review-persistence.ts";
import type { TenantScope } from "./tenancy.ts";

export type SupabaseFindingReviewConfig = { projectUrl: string; publishableKey: string; timeoutMs: number };
type FetchLike = typeof fetch;
const rowSchema = z.object({ diagnostic_fingerprint: z.string(), diagnostics_json: z.unknown(), review_json: z.unknown(), accepted_findings_json: z.unknown(), updated_at: z.string() });
export class SupabaseFindingReviewError extends Error { constructor(message = "Managed finding-review persistence is unavailable.") { super(message); this.name = "SupabaseFindingReviewError"; } }
function restUrl(config: SupabaseFindingReviewConfig, path: string) { return `${config.projectUrl.replace(/\/$/, "")}/rest/v1/${path}`; }
async function request(fetchImpl: FetchLike, config: SupabaseFindingReviewConfig, accessToken: string, path: string, init: RequestInit = {}) {
  if (!accessToken.trim()) throw new SupabaseFindingReviewError("A verified Supabase access token is required for managed finding review.");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(restUrl(config, path), { ...init, cache: "no-store", signal: controller.signal, headers: { apikey: config.publishableKey, Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) } });
    if (!response.ok) { const detail = await response.text().catch(() => ""); if (response.status === 409 || detail.includes("stale finding review") || detail.includes("stale extraction review")) throw new StaleFindingReviewError(); throw new SupabaseFindingReviewError(`Managed finding-review request failed with status ${response.status}.`); }
    return response;
  } catch (error) {
    if (error instanceof SupabaseFindingReviewError || error instanceof StaleFindingReviewError) throw error;
    throw new SupabaseFindingReviewError(error instanceof Error && error.name === "AbortError" ? "Managed finding-review request timed out." : undefined);
  } finally { clearTimeout(timer); }
}
export class SupabaseFindingReviewStore {
  private readonly config: SupabaseFindingReviewConfig; private readonly fetchImpl: FetchLike;
  constructor(config: SupabaseFindingReviewConfig, fetchImpl: FetchLike = fetch) { this.config = config; this.fetchImpl = fetchImpl; }
  async find(accessToken: string, scope: TenantScope, assessmentId: string, currentDiagnostics?: DiagnosticEnvelope): Promise<PersistedFindingReview | null> {
    const path = `finding_reviews?select=diagnostic_fingerprint,diagnostics_json,review_json,accepted_findings_json,updated_at&organization_id=eq.${encodeURIComponent(scope.organizationId)}&workspace_id=eq.${encodeURIComponent(scope.workspaceId)}&assessment_id=eq.${encodeURIComponent(assessmentId)}&limit=1`;
    const response = await request(this.fetchImpl, this.config, accessToken, path); const rows = z.array(rowSchema).parse(await response.json()); if (!rows.length) return null;
    const row = rows[0]; const diagnostics = row.diagnostics_json as DiagnosticEnvelope; const review = row.review_json as FindingReview; validateFindingReviewAgainstDiagnostics(review, diagnostics);
    return { assessmentId, diagnosticFingerprint: row.diagnostic_fingerprint, diagnostics, review, acceptedFindings: row.accepted_findings_json as PersistedFindingReview["acceptedFindings"], updatedAt: row.updated_at, stale: currentDiagnostics ? row.diagnostic_fingerprint !== diagnosticFingerprint(currentDiagnostics) : false };
  }
  async save(accessToken: string, scope: TenantScope, assessmentId: string, diagnostics: DiagnosticEnvelope, review: FindingReview, expectedFingerprint: string, expectedExtractionReview: ExtractionReview): Promise<PersistedFindingReview> {
    const currentFingerprint = diagnosticFingerprint(diagnostics); if (expectedFingerprint !== currentFingerprint) throw new StaleFindingReviewError(); validateFindingReviewAgainstDiagnostics(review, diagnostics);
    const accepted = review.reviewedAt ? acceptedFindings(diagnostics, review) : []; const updatedAt = new Date().toISOString();
    await request(this.fetchImpl, this.config, accessToken, "rpc/save_finding_review", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ p_organization_id: scope.organizationId, p_workspace_id: scope.workspaceId, p_assessment_id: assessmentId, p_expected_extraction_review: expectedExtractionReview, p_diagnostic_fingerprint: currentFingerprint, p_diagnostics: diagnostics, p_review: review, p_accepted_findings: accepted, p_updated_at: updatedAt }) });
    return { assessmentId, diagnosticFingerprint: currentFingerprint, diagnostics, review, acceptedFindings: accepted, updatedAt, stale: false };
  }
}
