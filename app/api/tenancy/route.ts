import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { requireServerPermission } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = requireServerPermission("tenant:read");
    return NextResponse.json({
      tenant: auth.tenant,
      actor: { id: auth.user.id, email: auth.user.email, displayName: auth.user.displayName, role: auth.membership.role },
      mode: auth.authMethod, authenticated: true, productionReady: auth.productionReady
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: error.message }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ error: error.message }, { status: 403, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
