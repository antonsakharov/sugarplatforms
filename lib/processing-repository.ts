import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ParsedArtifact, SourceSegment } from "./artifact-parser.ts";
import type { ExtractionEnvelope } from "./extraction.ts";
import type { TenantScope } from "./tenancy.ts";

export type PersistedArtifactMetadata = {
  storageArtifactId: string;
  parserArtifactId: string;
  originalName: string;
  mediaType: string;
  size: number;
  checksumSha256: string;
  parser: ParsedArtifact["parser"];
  warnings: string[];
  createdAt: string;
};

export type ProcessingSnapshot = {
  assessmentId: string;
  artifacts: PersistedArtifactMetadata[];
  parsedArtifacts: ParsedArtifact[];
  extraction: ExtractionEnvelope;
  persistedAt: string;
};

export class ProcessingScopeError extends Error {
  constructor() {
    super("Assessment processing state is outside the active organization/workspace scope.");
    this.name = "ProcessingScopeError";
  }
}

export class SqliteProcessingRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS artifact_metadata (
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        storage_artifact_id TEXT NOT NULL,
        parser_artifact_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        media_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
        checksum_sha256 TEXT NOT NULL,
        parser TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, workspace_id, assessment_id, storage_artifact_id)
      );
      CREATE INDEX IF NOT EXISTS artifact_metadata_scope_idx
        ON artifact_metadata (organization_id, workspace_id, assessment_id, created_at);
      CREATE TABLE IF NOT EXISTS source_segments (
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        parser_artifact_id TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        kind TEXT NOT NULL,
        locator_json TEXT NOT NULL,
        content TEXT NOT NULL,
        content_sha256 TEXT NOT NULL,
        title TEXT,
        PRIMARY KEY (organization_id, workspace_id, assessment_id, segment_id)
      );
      CREATE INDEX IF NOT EXISTS source_segments_scope_idx
        ON source_segments (organization_id, workspace_id, assessment_id, parser_artifact_id, ordinal);
      CREATE TABLE IF NOT EXISTS extraction_snapshots (
        organization_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        provider TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        persisted_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, workspace_id, assessment_id)
      );
    `);
  }

  replace(scope: TenantScope, snapshot: ProcessingSnapshot): ProcessingSnapshot {
    if (!scope.organizationId || !scope.workspaceId || !snapshot.assessmentId) throw new ProcessingScopeError();
    const persistedAt = snapshot.persistedAt || new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const deleteScoped = (table: string) => this.db.prepare(
        `DELETE FROM ${table} WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ?`
      ).run(scope.organizationId, scope.workspaceId, snapshot.assessmentId);
      deleteScoped("source_segments");
      deleteScoped("artifact_metadata");
      deleteScoped("extraction_snapshots");

      const insertArtifact = this.db.prepare(`
        INSERT INTO artifact_metadata (
          organization_id, workspace_id, assessment_id, storage_artifact_id, parser_artifact_id,
          original_name, media_type, size_bytes, checksum_sha256, parser, warnings_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const artifact of snapshot.artifacts) {
        insertArtifact.run(
          scope.organizationId, scope.workspaceId, snapshot.assessmentId, artifact.storageArtifactId,
          artifact.parserArtifactId, artifact.originalName, artifact.mediaType, artifact.size,
          artifact.checksumSha256, artifact.parser, JSON.stringify(artifact.warnings), artifact.createdAt
        );
      }

      const insertSegment = this.db.prepare(`
        INSERT INTO source_segments (
          organization_id, workspace_id, assessment_id, parser_artifact_id, segment_id,
          ordinal, kind, locator_json, content, content_sha256, title
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const parsed of snapshot.parsedArtifacts) {
        for (const segment of parsed.sourceSegments) {
          insertSegment.run(
            scope.organizationId, scope.workspaceId, snapshot.assessmentId, parsed.artifactId, segment.id,
            segment.ordinal, segment.kind, JSON.stringify(segment.locator), segment.content,
            segment.contentSha256, segment.title ?? null
          );
        }
      }

      this.db.prepare(`
        INSERT INTO extraction_snapshots (
          organization_id, workspace_id, assessment_id, schema_version, provider,
          prompt_version, status, payload_json, persisted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        scope.organizationId, scope.workspaceId, snapshot.assessmentId, snapshot.extraction.schemaVersion,
        snapshot.extraction.provider, snapshot.extraction.promptVersion, snapshot.extraction.status,
        JSON.stringify(snapshot.extraction), persistedAt
      );
      this.db.exec("COMMIT");
      return { ...snapshot, persistedAt };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  find(scope: TenantScope, assessmentId: string): ProcessingSnapshot | null {
    const extractionRow = this.db.prepare(`
      SELECT payload_json, persisted_at FROM extraction_snapshots
      WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ?
    `).get(scope.organizationId, scope.workspaceId, assessmentId) as { payload_json: string; persisted_at: string } | undefined;
    if (!extractionRow) return null;

    const artifactRows = this.db.prepare(`
      SELECT * FROM artifact_metadata
      WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ?
      ORDER BY created_at, storage_artifact_id
    `).all(scope.organizationId, scope.workspaceId, assessmentId) as Array<Record<string, string | number>>;
    const segmentRows = this.db.prepare(`
      SELECT * FROM source_segments
      WHERE organization_id = ? AND workspace_id = ? AND assessment_id = ?
      ORDER BY parser_artifact_id, ordinal
    `).all(scope.organizationId, scope.workspaceId, assessmentId) as Array<Record<string, string | number | null>>;

    const artifacts: PersistedArtifactMetadata[] = artifactRows.map((row) => ({
      storageArtifactId: String(row.storage_artifact_id),
      parserArtifactId: String(row.parser_artifact_id),
      originalName: String(row.original_name),
      mediaType: String(row.media_type),
      size: Number(row.size_bytes),
      checksumSha256: String(row.checksum_sha256),
      parser: String(row.parser) as ParsedArtifact["parser"],
      warnings: JSON.parse(String(row.warnings_json)) as string[],
      createdAt: String(row.created_at)
    }));

    const grouped = new Map<string, SourceSegment[]>();
    for (const row of segmentRows) {
      const artifactId = String(row.parser_artifact_id);
      const segment: SourceSegment = {
        id: String(row.segment_id), artifactId, artifactName: artifacts.find((item) => item.parserArtifactId === artifactId)?.originalName ?? "artifact",
        ordinal: Number(row.ordinal), kind: String(row.kind) as SourceSegment["kind"],
        locator: JSON.parse(String(row.locator_json)) as SourceSegment["locator"], content: String(row.content),
        contentSha256: String(row.content_sha256), ...(row.title ? { title: String(row.title) } : {})
      };
      grouped.set(artifactId, [...(grouped.get(artifactId) ?? []), segment]);
    }
    const parsedArtifacts: ParsedArtifact[] = artifacts.map((artifact) => {
      const sourceSegments = grouped.get(artifact.parserArtifactId) ?? [];
      return {
        artifactId: artifact.parserArtifactId, artifactName: artifact.originalName, parser: artifact.parser,
        sourceSegments, warnings: artifact.warnings,
        stats: { segmentCount: sourceSegments.length, characterCount: sourceSegments.reduce((sum, segment) => sum + segment.content.length, 0) }
      };
    });

    return {
      assessmentId, artifacts, parsedArtifacts,
      extraction: JSON.parse(extractionRow.payload_json) as ExtractionEnvelope,
      persistedAt: extractionRow.persisted_at
    };
  }
}
