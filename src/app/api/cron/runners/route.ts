/**
 * Cron entry point for the jobs subsystem.
 *
 * POST /api/cron/runners
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Runs one pass of:
 *   1. runRawEventBatch       — drain raw_events through processors
 *   2. runOutboxDispatchBatch — fan events out to subscriptions
 *
 * Designed to be hit by Vercel Cron (or external scheduler) every minute
 * or so. The runners are idempotent and concurrent-safe (FOR UPDATE SKIP
 * LOCKED on the raw_events claim), so a missed tick is fine.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  runRawEventBatch,
  runOutboxDispatchBatch,
} from "@/modules/jobs";
import { logger } from "@/shared/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger.child({ module: "api.cron.runners" });

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    log.error("CRON_SECRET not set — refusing to run");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const raw = await runRawEventBatch();
  const outbox = await runOutboxDispatchBatch();
  const durationMs = Date.now() - start;

  log.info(
    { raw, outbox, durationMs },
    "Cron runners tick complete",
  );

  return NextResponse.json({
    ok: true,
    durationMs,
    raw,
    outbox,
  });
}
