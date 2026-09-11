import { NextResponse } from "next/server";
import { AuthenticationRequiredError } from "@/lib/auth";
import { getServerAuthContext } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = getServerAuthContext();
    return NextResponse.json({
      authenticated: true,
      user: auth.user,
      membership: auth.membership,
      tenant: auth.tenant,
      authMethod: auth.authMethod,
      productionReady: auth.productionReady
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ authenticated: false, productionReady: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}
