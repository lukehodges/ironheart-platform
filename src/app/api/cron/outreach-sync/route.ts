/**
 * Cron entry point for the outreach activity rollup.
 *
 * POST /api/cron/outreach-sync
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Rebuilds `outreach_daily_activity` (the Observatory funnel's data source) from
 * the systems of record: cold metrics from the platform DB, warm funnel
 * (booked/interested/closed) from Twenty CRM. Idempotent — safe to run hourly.
 *
 * Tenant: OUTREACH_SYNC_TENANT_ID, falling back to INSTANTLY_DEFAULT_TENANT_ID
 * (both resolve to the Ironheart platform tenant in production).
 */

import { type NextRequest, NextResponse } from "next/server"
import { syncOutreachActivity } from "@/modules/outreach/activity-sync.service"
import { syncFromInstantly } from "@/modules/outreach/instantly-sync.service"
import { logger } from "@/shared/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const log = logger.child({ module: "api.cron.outreach-sync" })

async function handle(req: NextRequest): Promise<Response> {
  const secret = process.env["CRON_SECRET"]
  if (!secret) {
    log.error("CRON_SECRET not set — refusing to run")
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    )
  }

  const auth = req.headers.get("authorization") ?? ""
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const tenantId =
    process.env["OUTREACH_SYNC_TENANT_ID"] ??
    process.env["INSTANTLY_DEFAULT_TENANT_ID"] ??
    null
  if (!tenantId) {
    log.error("No tenant configured (OUTREACH_SYNC_TENANT_ID / INSTANTLY_DEFAULT_TENANT_ID)")
    return NextResponse.json({ error: "no tenant configured" }, { status: 500 })
  }

  try {
    // 1. Instantly log → touches + lead sent-state + replies (the send truth).
    // 2. Rebuild the daily rollup from the now-fresh lead/reply state.
    const instantly = await syncFromInstantly(tenantId)
    const rollup = await syncOutreachActivity(tenantId)
    return NextResponse.json({ ok: true, instantly, rollup })
  } catch (err) {
    log.error({ err }, "Outreach activity sync failed")
    return NextResponse.json({ error: "sync failed" }, { status: 500 })
  }
}

// Vercel Cron invokes with GET (auto-injecting the CRON_SECRET bearer); POST is
// kept for manual triggering.
export const GET = handle
export const POST = handle
