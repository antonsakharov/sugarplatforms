import { z } from "zod";
import { assessmentDraftSchema, type AssessmentDraft } from "./assessment.ts";
import { authenticatedContextSchema, type AuthenticatedContext } from "./auth.ts";

export type PostgresQueryResult<Row = Record<string, unknown>> = { rows: Row[] };

export type PostgresSessionClient = {
  query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult<Row>>;
};

const assessmentRowSchema = z.object({ payload_json: z.unknown() });

export async function withRlsSession<T>(
  client: PostgresSessionClient,
  context: AuthenticatedContext,
  operation: () => Promise<T>
): Promise<T> {
  const validated = authenticatedContextSchema.parse(context);
  await client.query("BEGIN");
  try {
    await client.query(
      "SELECT set_config('app.user_id', $1, true), set_config('app.organization_id', $2, true), set_config('app.workspace_id', $3, true)",
      [validated.user.id, validated.tenant.organization.id, validated.tenant.workspace.id]
    );
    const result = await operation();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export class PostgresAssessmentStore {
  private readonly client: PostgresSessionClient;

  constructor(client: PostgresSessionClient) {
    this.client = client;
  }

  async create(context: AuthenticatedContext, assessment: AssessmentDraft): Promise<AssessmentDraft> {
    const validated = assessmentDraftSchema.parse(assessment);
    return withRlsSession(this.client, context, async () => {
      await this.client.query(
        `INSERT INTO assessments (organization_id, workspace_id, id, status, created_at, payload_json)
         VALUES (app_current_organization_id(), app_current_workspace_id(), $1, $2, $3, $4::jsonb)`,
        [validated.id, validated.status, validated.createdAt, JSON.stringify(validated)]
      );
      return validated;
    });
  }

  async findById(context: AuthenticatedContext, assessmentId: string): Promise<AssessmentDraft | null> {
    return withRlsSession(this.client, context, async () => {
      const result = await this.client.query("SELECT payload_json FROM assessments WHERE id = $1", [assessmentId]);
      if (result.rows.length === 0) return null;
      const row = assessmentRowSchema.parse(result.rows[0]);
      const payload = typeof row.payload_json === "string" ? JSON.parse(row.payload_json) : row.payload_json;
      return assessmentDraftSchema.parse(payload);
    });
  }

  async listActive(context: AuthenticatedContext): Promise<AssessmentDraft[]> {
    return withRlsSession(this.client, context, async () => {
      const result = await this.client.query("SELECT payload_json FROM assessments WHERE status = 'draft' ORDER BY created_at DESC");
      return result.rows.map((raw) => {
        const row = assessmentRowSchema.parse(raw);
        const payload = typeof row.payload_json === "string" ? JSON.parse(row.payload_json) : row.payload_json;
        return assessmentDraftSchema.parse(payload);
      });
    });
  }
}
