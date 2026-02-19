import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Liveness probe — returns 200 if the process is alive.
 * No DB or external checks; used by load balancers to route traffic.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
