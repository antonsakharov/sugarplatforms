import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "sugar-platform-diagnostic",
    timestamp: new Date().toISOString()
  });
}
