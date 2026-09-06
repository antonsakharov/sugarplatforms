import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ExtractionReview } from "./extraction-review.ts";
import { canApproveExtraction } from "./extraction-review.ts";
import type { ExtractionEnvelope } from "./extraction.ts";
import type { TenantScope } from "./tenancy.ts";

export type PersistedExtractionReview = {
  assessmentId: string;
  extractionFingerprint: string;
  review: ExtractionReview;
  updatedAt: string;
  stale: boolean;
};

export class ReviewScopeError extends Error {
  constructor() {
    super("Extraction review state is outside the active organization/workspace scope.");
    this.name = "ReviewScopeError";
  }
}

export class StaleExtractionReviewError extends Error {
  constructor() {
    super("The extraction changed after this review was created. Reload the current extraction before saving review decisions.");
    this.name = "StaleExtractionReviewError";
  }
}

function stableExtractionProjection(extraction: ExtractionEnvelope) {
  return {
    schemaVersion: extraction.schemaVersion,
    provider: extraction.provider,
    promptVersion: extraction.promptVersion,
    status: extraction.status,
    objects: [...extraction.objects]
      .map((object) => ({
        id: object.id,
        kind: object.kind,
        name: object.name,
        evidence: [...object.evidence]
          .map((evidence) => ({ segmentId: evidence.segmentId, artifactId: evidence.artifactId, locator: evidence.locator }))
          .sort((a, b) => a.segmentId.localeCompare(b.segmentId))
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
}

export function extractionFingerprint(extraction: ExtractionEnvelope) {
  return createHash("sha256").update(JSON.stringify(stableExtractionProjection(extraction))).digest("hex");
}

export function validateReviewAgainstExtraction(review: ExtractionReview, extraction: ExtractionEnvelope) {
  if (review.schemaVersion !== "1.0") throw new Error("Unsupported extraction review schema version.");
  if (review.objects.length !== extraction.objects.length) throw new Error("Review must contain exactly one decision record for every extracted object.");
  const extractedById = new Map(extraction.objects.map((object) => [object.id, object]));
  const seen = new Set<string>();
  for (const item of review.objects) {
    if (seen.has(item.id)) throw new Error("Review contains duplicate object decisions.");
    seen.add(item.id);
    const source = extractedById.get(item.id);
    if (!source) throw new Error("Review references an object outside the current extraction.");
    if (item.kind !== source.kind || item.originalName !== source.name) throw new Error("Review object identity does not match the current extraction.");
    const displayName = item.displayName.trim().replace(/\s+/g, " ");
    if (!displayName || displayName.length > 120 || displayName !== item.displayName) throw new Error("Reviewed names must be normalized and between 1 and 120 characters.");
    if (item.status === "merged") {
      if (!item.mergedInto || item.mergedInto === item.id) throw new Error("Merged objects require a distinct target.");
      const target = review.objects.find((candidate) => candidate.id === item.mergedInto);
      if (!target || target.kind !== item.kind || target.status === "rejected" || target.status === "merged") throw new Error("Merge target must exist, have the same kind, and remain reviewable.");
    } else if (item.mergedInto) {
      throw new Error("Only merged objects may define mergedInto.");
    }
  }
  if (review.approved) {
    if (!review.approvedAt) throw new Error("Approved extraction review requires approvedAt.");
    if (!canApproveExtraction(review)) throw new Error("Approved extraction review cannot contain pending objects.");
  } else if (review.approvedAt) {
    throw new Error("Unapproved extraction review cannot retain approvedAt.");
  }
  return review;
}

export class SqliteExtractionReviewRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS extraction_reviews (
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        extraction_fingerprint TEXT NOT NULL,
        review_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, workspace_id, assessment_id)
      );
      CREATE INDEX IF NOT EXISTS extraction_reviews_scope_idx
        ON extraction_reviews (organization_id, workspace_id, assessment_id, updated_at);
    `);
  }

  save(scope: TenantScope, assessmentId: string, extraction: ExtractionEnvelope, review: ExtractionReview, expectedFingerprint: string): PersistedExtractionReview {
    if (!scope.organizationId || !scope.workspaceId || !assessmentId) throw new ReviewScopeError();
    const currentFingerprint = extractionFingerprint(extraction);
    if (expectedFingerprint !== currentFingerprint) throw new StaleExtractionReviewError();
    validateReviewAgainstExtraction(review, extraction);
    const updatedAt = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO extraction_reviews (
        organization_id, workspace_id, assessment_id, extraction_fingerprint, review_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (organization_id, workspace_id, assessment_id) DO UPDATE SET
        extraction_fingerprint = excluded.extraction_fingerprint,
        review_json = excluded.review_json,
        updated_at = excluded.updated_at
    `).run(scope.organizationId, scope.workspaceId, assessmentId, currentFingerprint, JSON.stringify(review), updatedAt);
    return { assessmentId, extractionFingerprint: currentFingerprint, review, updatedAt, stale: false };
  }

  find(scope: TenantScope, assessmentId: string, extraction: ExtractionEnvelope): PersistedExtractionReview | null {
    const row = this.db.prepare(`
      SELECT extraction_fingerprint, review_json, updated_at
      FROM extraction_reviews
      WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ?
    `).get(scope.organizationId, scope.workspaceId, assessmentId) as { extraction_fingerprint: string; review_json: string; updated_at: string } | undefined;
    if (!row) return null;
    const currentFingerprint = extractionFingerprint(extraction);
    const review = JSON.parse(row.review_json) as ExtractionReview;
    return {
      assessmentId,
      extractionFingerprint: row.extraction_fingerprint,
      review,
      updatedAt: row.updated_at,
      stale: row.extraction_fingerprint !== currentFingerprint
    };
  }
}
