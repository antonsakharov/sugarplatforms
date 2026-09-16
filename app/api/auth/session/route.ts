import { NextResponse } from "next/server";
import { AuthenticationRequiredError, AuthorizationDeniedError } from "@/lib/auth";
import { getServerAuthContext } from "@/lib/server-auth";
import { InvalidSessionError } from "@/lib/supabase-auth";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const auth = await getServerAuthContext(request);
    return NextResponse.json({ authenticated: true, user: auth.user, membership: auth.membership, tenant: auth.tenant, authMethod: auth.authMethod, productionReady: auth.productionReady }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError || error instanceof InvalidSessionError) return NextResponse.json({ authenticated: false, productionReady: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (error instanceof AuthorizationDeniedError) return NextResponse.json({ authenticated: true, authorized: false, productionReady: true }, { status: 403, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
