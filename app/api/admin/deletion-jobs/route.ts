import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";
import { getDeletionJobRepository } from "@/lib/server-deletion-jobs";
import { scopeFromTenant } from "@/lib/tenancy";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = requireServerPermission("audit:read");
    const jobs = getDeletionJobRepository().list(scopeFromTenant(auth.tenant)).map((job) => ({
      operationId: job.operationId,
      assessmentId: job.assessmentId,
      actorUserId: job.actorUserId,
      status: job.status,
      artifactObjectCount: job.storageKeys.length,
      deletedArtifactObjectCount: job.deletedStorageKeys.length,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      nextAttemptAt: job.nextAttemptAt,
      leaseExpiresAt: job.leaseExpiresAt,
      lastError: job.lastError,
      receipt: job.receipt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));
    return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
