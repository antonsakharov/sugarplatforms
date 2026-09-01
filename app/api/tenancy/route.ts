import { NextResponse } from "next/server";
import { getServerTenantContext } from "@/lib/server-assessment-store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { tenant: getServerTenantContext(), mode: "local-single-instance", authenticated: false },
    { headers: { "Cache-Control": "no-store" } }
  );
}
