import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DiagnosticEnvelope, DiagnosticFinding, DiagnosticSeverity } from "./diagnostics.ts";
import { acceptedFindings, type FindingReview } from "./finding-review.ts";
import type { TenantScope } from "./tenancy.ts";

export type PersistedFindingReview = {
  assessmentId: string;
  diagnosticFingerprint: string;
  diagnostics: DiagnosticEnvelope;
  review: FindingReview;
  acceptedFindings: DiagnosticFinding[];
  updatedAt: string;
  stale: boolean;
};

export class FindingReviewScopeError extends Error {
  constructor() { super("Finding review state is outside the active organization/workspace scope."); this.name = "FindingReviewScopeError"; }
}
export class StaleFindingReviewError extends Error {
  constructor() { super("Diagnostics changed after this finding review was created. Reload current diagnostics before saving decisions."); this.name = "StaleFindingReviewError"; }
}

export function diagnosticFingerprint(diagnostics: DiagnosticEnvelope) {
  return createHash("sha256").update(JSON.stringify(diagnostics)).digest("hex");
}

function normalizedText(value: unknown, max: number) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().replace(/\s+/g, " ");
  return Boolean(normalized) && normalized === value && value.length <= max;
}

export function validateFindingReviewAgainstDiagnostics(review: FindingReview, diagnostics: DiagnosticEnvelope) {
  if (review.schemaVersion !== "1.0") throw new Error("Unsupported finding review schema version.");
  if (review.assessmentId !== diagnostics.assessmentId || review.diagnosticGeneratedAt !== diagnostics.generatedAt) throw new StaleFindingReviewError();
  if (review.findings.length !== diagnostics.findings.length) throw new Error("Finding review must contain exactly one decision for every diagnostic finding.");
  const diagnosticIds = new Set(diagnostics.findings.map((finding) => finding.id));
  const seen = new Set<string>();
  for (const item of review.findings) {
    if (seen.has(item.findingId)) throw new Error("Finding review contains duplicate decisions.");
    seen.add(item.findingId);
    if (!diagnosticIds.has(item.findingId)) throw new Error("Finding review references a finding outside current diagnostics.");
    if (!["pending", "accepted", "rejected"].includes(item.status)) throw new Error("Unsupported finding review decision.");
    if (item.reviewerNote !== undefined && !normalizedText(item.reviewerNote, 1000)) throw new Error("Reviewer note must be normalized and at most 1000 characters.");
    const limits: Record<string, number> = { title: 180, description: 1600, businessImpact: 1200, technicalImpact: 1200, recommendation: 1200 };
    for (const [key, value] of Object.entries(item.edits ?? {})) {
      if (key === "severity") {
        if (!(new Set<DiagnosticSeverity>(["low", "medium", "high"])).has(value as DiagnosticSeverity)) throw new Error("Unsupported edited severity.");
      } else if (!(key in limits) || !normalizedText(value, limits[key])) throw new Error(`Invalid finding edit: ${key}.`);
    }
  }
  const pending = review.findings.some((item) => item.status === "pending");
  if (review.reviewedAt && pending) throw new Error("Completed finding review cannot contain pending decisions.");
  if (!review.reviewedAt && !pending && review.findings.length > 0) throw new Error("Resolved finding decisions must be explicitly completed before downstream use.");
  return review;
}

export class SqliteFindingReviewRepository {
  private readonly db: DatabaseSync;
  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS finding_reviews (
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        diagnostic_fingerprint TEXT NOT NULL,
        diagnostics_json TEXT NOT NULL,
        review_json TEXT NOT NULL,
        accepted_findings_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, workspace_id, assessment_id)
      );
      CREATE INDEX IF NOT EXISTS finding_reviews_scope_idx
        ON finding_reviews (organization_id, workspace_id, assessment_id, updated_at);
    `);
  }

  save(scope: TenantScope, assessmentId: string, diagnostics: DiagnosticEnvelope, review: FindingReview, expectedFingerprint: string): PersistedFindingReview {
    if (!scope.organizationId || !scope.workspaceId || !assessmentId) throw new FindingReviewScopeError();
    if (diagnostics.assessmentId !== assessmentId) throw new FindingReviewScopeError();
    const currentFingerprint = diagnosticFingerprint(diagnostics);
    if (expectedFingerprint !== currentFingerprint) throw new StaleFindingReviewError();
    validateFindingReviewAgainstDiagnostics(review, diagnostics);
    const accepted = review.reviewedAt ? acceptedFindings(diagnostics, review) : [];
    const updatedAt = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO finding_reviews (organization_id, workspace_id, assessment_id, diagnostic_fingerprint, diagnostics_json, review_json, accepted_findings_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (organization_id, workspace_id, assessment_id) DO UPDATE SET
        diagnostic_fingerprint = excluded.diagnostic_fingerprint,
        diagnostics_json = excluded.diagnostics_json,
        review_json = excluded.review_json,
        accepted_findings_json = excluded.accepted_findings_json,
        updated_at = excluded.updated_at
    `).run(scope.organizationId, scope.workspaceId, assessmentId, currentFingerprint, JSON.stringify(diagnostics), JSON.stringify(review), JSON.stringify(accepted), updatedAt);
    return { assessmentId, diagnosticFingerprint: currentFingerprint, diagnostics, review, acceptedFindings: accepted, updatedAt, stale: false };
  }

  find(scope: TenantScope, assessmentId: string, currentDiagnostics?: DiagnosticEnvelope): PersistedFindingReview | null {
    const row = this.db.prepare(`SELECT diagnostic_fingerprint, diagnostics_json, review_json, accepted_findings_json, updated_at FROM finding_reviews WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ?`).get(scope.organizationId, scope.workspaceId, assessmentId) as { diagnostic_fingerprint: string; diagnostics_json: string; review_json: string; accepted_findings_json: string; updated_at: string } | undefined;
    if (!row) return null;
    const diagnostics = JSON.parse(row.diagnostics_json) as DiagnosticEnvelope;
    return {
      assessmentId,
      diagnosticFingerprint: row.diagnostic_fingerprint,
      diagnostics,
      review: JSON.parse(row.review_json) as FindingReview,
      acceptedFindings: JSON.parse(row.accepted_findings_json) as DiagnosticFinding[],
      updatedAt: row.updated_at,
      stale: currentDiagnostics ? row.diagnostic_fingerprint !== diagnosticFingerprint(currentDiagnostics) : false
    };
  }
}
