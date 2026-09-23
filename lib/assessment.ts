import { z } from "zod";

export const FOCUS_AREAS = [
  "entity-identifier-fragmentation",
  "system-integration-complexity",
  "duplicated-platform-capabilities",
  "ownership-governance-gaps",
  "api-data-contract-inconsistency",
  "general-platform-diagnostic"
] as const;

export const assessmentInputSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  assessmentTitle: z.string().trim().min(3).max(160),
  industry: z.string().trim().min(2).max(100),
  focusArea: z.enum(FOCUS_AREAS),
  primaryEntity: z.string().trim().min(2).max(120),
  knownSystems: z.string().trim().max(2000).optional().default(""),
  businessConcern: z.string().trim().min(10).max(3000),
  reportAudience: z.string().trim().min(2).max(200),
  limitsAcknowledged: z.literal(true)
});

export type AssessmentInput = z.infer<typeof assessmentInputSchema>;

export const assessmentDraftSchema = assessmentInputSchema.extend({
  id: z.string().uuid(),
  status: z.literal("draft"),
  createdAt: z.string().datetime()
});

export type AssessmentDraft = z.infer<typeof assessmentDraftSchema>;

export function createAssessmentDraft(input: AssessmentInput): AssessmentDraft {
  return {
    ...input,
    id: crypto.randomUUID(),
    status: "draft",
    createdAt: new Date().toISOString()
  };
}
