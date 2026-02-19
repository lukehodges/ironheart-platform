import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { redis } from "@/shared/redis";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ready
 * Readiness probe — checks DB and Redis connectivity.
 * Returns 200 when the process is ready to serve traffic, 503 otherwise.
 * Reports per-service status so partial failures are visible.
 */
export async function GET() {
  let dbStatus: "ok" | "error" = "ok";
  let redisStatus: "ok" | "error" = "ok";
  const errors: string[] = [];

  try {
    await db.execute(sql`SELECT 1`);
  } catch (err) {
    dbStatus = "error";
    errors.push(`db: ${err instanceof Error ? err.message : "unknown"}`);
  }

  try {
    await redis.ping();
  } catch (err) {
    redisStatus = "error";
    errors.push(`redis: ${err instanceof Error ? err.message : "unknown"}`);
  }

  const ready = dbStatus === "ok" && redisStatus === "ok";
  const timestamp = new Date().toISOString();

  if (ready) {
    return NextResponse.json(
      { status: "ready", db: dbStatus, redis: redisStatus, timestamp },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      status: "degraded",
      db: dbStatus,
      redis: redisStatus,
      error: errors.join("; "),
      timestamp,
    },
    { status: 503 },
  );
}
