import { z } from "zod";
import type { ExecutiveReport } from "./reporting.ts";
import { validateReportSnapshotHistory, type ReportSnapshot } from "./report-versioning.ts";
import type { TenantScope } from "./tenancy.ts";

export type SupabaseReportHistoryConfig = { projectUrl: string; publishableKey: string; timeoutMs: number };
type FetchLike = typeof fetch;
const rowSchema = z.object({ snapshot_json: z.unknown() });
export class SupabaseReportHistoryError extends Error { constructor(message = "Managed report history is unavailable.") { super(message); this.name = "SupabaseReportHistoryError"; } }
function restUrl(config: SupabaseReportHistoryConfig, path: string) { return `${config.projectUrl.replace(/\/$/, "")}/rest/v1/${path}`; }
async function request(fetchImpl: FetchLike, config: SupabaseReportHistoryConfig, accessToken: string, path: string, init: RequestInit = {}) {
  if (!accessToken.trim()) throw new SupabaseReportHistoryError("A verified Supabase access token is required for managed report history.");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(restUrl(config, path), { ...init, cache: "no-store", signal: controller.signal, headers: { apikey: config.publishableKey, Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) } });
    if (!response.ok) throw new SupabaseReportHistoryError(`Managed report-history request failed with status ${response.status}.`);
    return response;
  } catch (error) {
    if (error instanceof SupabaseReportHistoryError) throw error;
    throw new SupabaseReportHistoryError(error instanceof Error && error.name === "AbortError" ? "Managed report-history request timed out." : undefined);
  } finally { clearTimeout(timer); }
}
export class SupabaseReportHistoryStore {
  constructor(private readonly config: SupabaseReportHistoryConfig, private readonly fetchImpl: FetchLike = fetch) {}
  async list(accessToken: string, scope: TenantScope, assessmentId: string): Promise<ReportSnapshot[]> {
    const path = `report_snapshots?select=snapshot_json&organization_id=eq.${encodeURIComponent(scope.organizationId)}&workspace_id=eq.${encodeURIComponent(scope.workspaceId)}&assessment_id=eq.${encodeURIComponent(assessmentId)}&order=version.asc`;
    const response = await request(this.fetchImpl, this.config, accessToken, path); const rows = z.array(rowSchema).parse(await response.json());
    const history = rows.map((row) => row.snapshot_json as ReportSnapshot); validateReportSnapshotHistory(history, assessmentId); return history;
  }
  async findById(accessToken: string, scope: TenantScope, assessmentId: string, reportId: string): Promise<ReportSnapshot | null> {
    const path = `report_snapshots?select=snapshot_json&organization_id=eq.${encodeURIComponent(scope.organizationId)}&workspace_id=eq.${encodeURIComponent(scope.workspaceId)}&assessment_id=eq.${encodeURIComponent(assessmentId)}&report_id=eq.${encodeURIComponent(reportId)}&limit=1`;
    const response = await request(this.fetchImpl, this.config, accessToken, path); const rows = z.array(rowSchema).parse(await response.json()); if (!rows.length) return null;
    const snapshot = rows[0].snapshot_json as ReportSnapshot; validateReportSnapshotHistory([snapshot], assessmentId); return snapshot;
  }
  async save(accessToken: string, scope: TenantScope, report: ExecutiveReport, createdAt = new Date().toISOString()): Promise<ReportSnapshot> {
    const response = await request(this.fetchImpl, this.config, accessToken, "rpc/save_report_snapshot", { method: "POST", body: JSON.stringify({ p_organization_id: scope.organizationId, p_workspace_id: scope.workspaceId, p_assessment_id: report.assessmentId, p_report: report, p_created_at: createdAt }) });
    const row = rowSchema.parse(await response.json()); const snapshot = row.snapshot_json as ReportSnapshot; validateReportSnapshotHistory([snapshot], report.assessmentId); return snapshot;
  }
}
