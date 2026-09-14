import { z } from "zod";

const tenantIdSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/i);

const envSchema = z.object({
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).default("true"),
  ASSESSMENT_DB_PATH: z.string().trim().min(1).default(".data/sugar-platform-diagnostic.sqlite"),
  ARTIFACT_STORAGE_PROVIDER: z.enum(["local", "supabase"]).default("local"),
  PRIVATE_ARTIFACT_ROOT: z.string().trim().min(1).default(".data/private-artifacts"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().trim().min(2).max(100).regex(/^[a-z0-9][a-z0-9._-]*$/i).default("sugar-platform-artifacts"),
  SUPABASE_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
  MALWARE_SCANNER_PROVIDER: z.enum(["local", "clamav"]).default("local"),
  CLAMAV_HOST: z.string().trim().min(1).optional(),
  CLAMAV_PORT: z.coerce.number().int().min(1).max(65535).default(3310),
  CLAMAV_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  LOCAL_ORGANIZATION_ID: tenantIdSchema.default("local-org"),
  LOCAL_ORGANIZATION_NAME: z.string().trim().min(2).max(120).default("Local Organization"),
  LOCAL_WORKSPACE_ID: tenantIdSchema.default("local-demo"),
  LOCAL_WORKSPACE_NAME: z.string().trim().min(2).max(120).default("Local Diagnostic Workspace"),
  LOCAL_AUTH_ENABLED: z.enum(["true", "false"]).default("true"),
  LOCAL_USER_ID: tenantIdSchema.default("local-user"),
  LOCAL_USER_EMAIL: z.string().email().default("local@sugarplatform.dev"),
  LOCAL_USER_NAME: z.string().trim().min(2).max(120).default("Local Sugar User"),
  LOCAL_USER_ROLE: z.enum(["viewer", "editor", "admin"]).default("admin"),
  MAX_ACTIVE_ASSESSMENTS_PER_WORKSPACE: z.coerce.number().int().positive().default(1),
  MAX_UPLOAD_FILES: z.coerce.number().int().positive().max(10).default(10),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(26_214_400),
  MAX_TOTAL_PAGES: z.coerce.number().int().positive().max(150).default(150),
  MAX_PRIMARY_ENTITIES: z.coerce.number().int().positive().max(1).default(1)
}).superRefine((value, ctx) => {
  if (value.ARTIFACT_STORAGE_PROVIDER === "supabase") {
    if (!value.SUPABASE_URL) ctx.addIssue({ code: "custom", path: ["SUPABASE_URL"], message: "SUPABASE_URL is required for Supabase artifact storage." });
    if (!value.SUPABASE_SECRET_KEY) ctx.addIssue({ code: "custom", path: ["SUPABASE_SECRET_KEY"], message: "SUPABASE_SECRET_KEY is required for Supabase artifact storage." });
  }
  if (value.MALWARE_SCANNER_PROVIDER === "clamav" && !value.CLAMAV_HOST) {
    ctx.addIssue({ code: "custom", path: ["CLAMAV_HOST"], message: "CLAMAV_HOST is required when the ClamAV malware scanner is selected." });
  }
});

export const env = envSchema.parse(process.env);

export const PERSISTENCE_CONFIG = { assessmentDatabasePath: env.ASSESSMENT_DB_PATH } as const;
export const STORAGE_CONFIG = {
  provider: env.ARTIFACT_STORAGE_PROVIDER,
  privateArtifactRoot: env.PRIVATE_ARTIFACT_ROOT,
  supabase: env.ARTIFACT_STORAGE_PROVIDER === "supabase" ? {
    projectUrl: env.SUPABASE_URL!,
    secretKey: env.SUPABASE_SECRET_KEY!,
    bucket: env.SUPABASE_STORAGE_BUCKET,
    signedUrlTtlSeconds: env.SUPABASE_SIGNED_URL_TTL_SECONDS
  } : null
} as const;

export const MALWARE_SCANNER_CONFIG = {
  provider: env.MALWARE_SCANNER_PROVIDER,
  clamav: env.MALWARE_SCANNER_PROVIDER === "clamav" ? { host: env.CLAMAV_HOST!, port: env.CLAMAV_PORT, timeoutMs: env.CLAMAV_TIMEOUT_MS } : null
} as const;

export const LOCAL_TENANT_CONFIG = {
  organizationId: env.LOCAL_ORGANIZATION_ID,
  organizationName: env.LOCAL_ORGANIZATION_NAME,
  workspaceId: env.LOCAL_WORKSPACE_ID,
  workspaceName: env.LOCAL_WORKSPACE_NAME
} as const;

export const LOCAL_AUTH_CONFIG = {
  enabled: env.LOCAL_AUTH_ENABLED === "true",
  userId: env.LOCAL_USER_ID,
  email: env.LOCAL_USER_EMAIL,
  displayName: env.LOCAL_USER_NAME,
  role: env.LOCAL_USER_ROLE
} as const;

export const PRODUCT_LIMITS = {
  maxActiveAssessments: env.MAX_ACTIVE_ASSESSMENTS_PER_WORKSPACE,
  maxFiles: env.MAX_UPLOAD_FILES,
  maxFileBytes: env.MAX_UPLOAD_BYTES,
  maxFileMegabytes: Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024),
  maxTotalPages: env.MAX_TOTAL_PAGES,
  maxPrimaryEntities: env.MAX_PRIMARY_ENTITIES
} as const;
