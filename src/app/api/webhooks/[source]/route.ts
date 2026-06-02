/**
 * Generic webhook ingest endpoint.
 *
 *   POST /api/webhooks/:source
 *
 * 1. Look up provider in the integrations registry. Unknown source → 404
 *    (404, not 200 — caller will fix the URL).
 * 2. If the provider exposes a webhook secret verifier, run it. Failure → 401.
 * 3. Land the raw payload in `raw_events` so processors pick it up async.
 * 4. Return 200 fast — never block on processing.
 *
 * Provider-specific routes (e.g. /api/webhooks/google-calendar, /stripe)
 * still exist for sources that need bespoke handling. This generic route is
 * the default landing pad for new pull/push integrations.
 */
import { NextResponse, type NextRequest } from "next/server"
import { ingestRawEvent } from "@/modules/jobs/ingest"
import { getProvider } from "@/modules/integrations"
import { logger } from "@/shared/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const log = logger.child({ module: "webhooks.generic" })

/**
 * Extract a stable event id from common webhook payload shapes. Falls back
 * to a content hash so we still get idempotency for sources that don't ship
 * an id.
 */
function extractEventId(
  source: string,
  body: unknown,
  headers: Headers,
): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>
    if (typeof obj.id === "string") return obj.id
    if (typeof obj.event_id === "string") return obj.event_id
    if (typeof obj.eventId === "string") return obj.eventId
  }
  // Hash fallback — webhook senders that need exactly-once must put an id in
  // the payload. This stops same-millisecond duplicates from blowing up.
  const fallback =
    headers.get("x-request-id") ??
    headers.get("x-event-id") ??
    `${source}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  return fallback
}

function extractKind(source: string, body: unknown): string {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>
    if (typeof obj.type === "string") return obj.type
    if (typeof obj.kind === "string") return obj.kind
    if (typeof obj.event === "string") return obj.event
  }
  return `${source}.unknown`
}

interface RouteContext {
  params: Promise<{ source: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { source } = await params

  const provider = getProvider(source)
  if (!provider) {
    log.warn({ source }, "Webhook for unknown source")
    return NextResponse.json(
      { error: `Unknown source: ${source}` },
      { status: 404 },
    )
  }

  // Read body (json best-effort; otherwise text).
  let body: unknown = null
  const rawText = await request.text()
  if (rawText.length > 0) {
    try {
      body = JSON.parse(rawText)
    } catch {
      body = { raw: rawText }
    }
  }

  // Provider-side verification hook — verifyWebhook is optional on the
  // interface, so we feature-detect.
  const maybeVerifier = (
    provider as unknown as {
      verifyWebhook?: (
        body: unknown,
        headers: Headers,
        rawText: string,
      ) => Promise<boolean> | boolean
    }
  ).verifyWebhook
  if (typeof maybeVerifier === "function") {
    try {
      const ok = await maybeVerifier(body, request.headers, rawText)
      if (!ok) {
        log.warn({ source }, "Webhook signature verification failed")
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        )
      }
    } catch (err) {
      log.warn({ source, err }, "Webhook verifier threw — rejecting")
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      )
    }
  }

  const sourceEventId = extractEventId(source, body, request.headers)
  const kind = extractKind(source, body)

  // tenantId resolution from the payload (best-effort). Cross-tenant senders
  // can include x-ironheart-tenant header.
  const tenantId =
    request.headers.get("x-ironheart-tenant") ??
    (body && typeof body === "object"
      ? ((body as Record<string, unknown>).tenantId as string | undefined) ??
        null
      : null)

  try {
    const { rawEventId, deduplicated } = await ingestRawEvent({
      source,
      sourceEventId,
      kind,
      payload: (body ?? {}) as Record<string, unknown>,
      tenantId: tenantId ?? null,
    })
    log.info(
      { source, kind, rawEventId, deduplicated },
      "Webhook ingested",
    )
    return NextResponse.json({ ok: true, rawEventId, deduplicated })
  } catch (err) {
    // Soft-fail with 200 only if we're sure no retry helps. Otherwise 500 so
    // sender retries.
    log.error({ source, err }, "Webhook ingest failed")
    return NextResponse.json(
      { error: "Ingest failed" },
      { status: 500 },
    )
  }
}
