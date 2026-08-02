/**
 * POST /api/webhooks/instantly
 *
 * Entry point for Instantly reply webhooks. Instantly POSTs a JSON payload
 * to this URL whenever a reply lands in a monitored campaign inbox.
 *
 * Security:
 *   - HMAC-SHA256 signature verification against INSTANTLY_WEBHOOK_SECRET env var.
 *   - Instantly sends the signature in the `X-Instantly-Signature` header as a
 *     hex digest of `HMAC-SHA256(secret, rawBody)`.
 *   - If the env var is not set (e.g. local dev with no secret configured) the
 *     signature step is skipped with a warning — set it for any environment
 *     that receives real traffic.
 *
 * Tenant resolution:
 *   - Instantly does not know about platform tenants. We accept an optional
 *     `X-Ironheart-Tenant` header so a per-campaign webhook URL can be scoped
 *     to a specific tenant, OR we fall back to INSTANTLY_DEFAULT_TENANT_ID env
 *     var for single-tenant deployments.
 *
 * Processing:
 *   - Synchronous: ingestInstantlyReply runs inline and we return 200 when done.
 *   - This keeps things simple — Instantly expects a fast 2xx and will retry on
 *     5xx. If processing becomes slow, move to an async queue (Inngest etc).
 */

import { type NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { logger } from "@/shared/logger"
import {
  ingestInstantlyReply,
  type InstantlyReplyPayload,
} from "@/modules/outreach/reply-ingest.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "webhooks.instantly" })

// ---------------------------------------------------------------------------
// HMAC signature verification
// ---------------------------------------------------------------------------

/**
 * Verify the `X-Instantly-Signature` header.
 *
 * Returns true if:
 *   - INSTANTLY_WEBHOOK_SECRET is not set (dev/test bypass, logged as warning)
 *   - The computed HMAC matches the header value (constant-time comparison)
 *
 * Returns false if the header is missing or the signature does not match.
 */
function verifySignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env["INSTANTLY_WEBHOOK_SECRET"]

  if (!secret) {
    log.warn(
      "INSTANTLY_WEBHOOK_SECRET not set — skipping signature verification (set it for production)",
    )
    return true
  }

  const signature = headers.get("x-instantly-signature")
  if (!signature) {
    log.warn("Instantly webhook missing X-Instantly-Signature header")
    return false
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")

  // timingSafeEqual requires equal-length buffers
  try {
    const expectedBuf = Buffer.from(expected, "hex")
    // Strip any "sha256=" prefix Instantly might prepend
    const incomingHex = signature.replace(/^sha256=/, "")
    const incomingBuf = Buffer.from(incomingHex, "hex")
    if (expectedBuf.length !== incomingBuf.length) return false
    return timingSafeEqual(expectedBuf, incomingBuf)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()

  // ── 1. Signature check ──────────────────────────────────────────────────
  if (!verifySignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────
  let payload: InstantlyReplyPayload
  try {
    payload = JSON.parse(rawBody) as InstantlyReplyPayload
  } catch {
    log.warn("Instantly webhook: body is not valid JSON")
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // ── 3. Tenant resolution ────────────────────────────────────────────────
  const tenantId =
    request.headers.get("x-ironheart-tenant") ??
    process.env["INSTANTLY_DEFAULT_TENANT_ID"] ??
    null

  if (!tenantId) {
    log.warn(
      { eventType: payload.event_type },
      "Instantly webhook: no tenantId — set X-Ironheart-Tenant header or INSTANTLY_DEFAULT_TENANT_ID env",
    )
    return NextResponse.json(
      { error: "Tenant not resolvable" },
      { status: 400 },
    )
  }

  // ── 4. Only process reply events ────────────────────────────────────────
  // Instantly may send other event types (e.g. "email_sent", "unsubscribed").
  // Silently ack anything that isn't a reply so Instantly stops retrying.
  const eventType = payload.event_type ?? "reply_received"
  if (eventType !== "reply_received") {
    log.debug({ eventType }, "Instantly webhook: non-reply event — acking silently")
    return NextResponse.json({ ok: true, skipped: true })
  }

  // ── 5. Ingest ────────────────────────────────────────────────────────────
  try {
    const result = await ingestInstantlyReply(tenantId, payload)

    log.info(
      { tenantId, ...result },
      "Instantly reply processed",
    )

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    log.error({ tenantId, err }, "Instantly reply ingest failed")
    // Return 500 so Instantly retries (its retry policy backs off over ~24h)
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 })
  }
}
