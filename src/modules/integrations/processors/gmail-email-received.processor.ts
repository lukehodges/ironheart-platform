/**
 * Processor for raw_events of (source='gmail', kind='email.received').
 *
 *   1. Resolve sender → lead via identity resolver (email match)
 *   2. If matched, correlate to an outbound touch via In-Reply-To / References
 *   3. Apply a fast rule classifier → sentiment
 *   4. Call outreachService.recordReply
 *
 * Unmatched senders are silently dropped (idempotent {ok:true}).
 */
import { registerProcessor } from "@/modules/jobs/processors/processor.registry"
import type {
  ProcessorContext,
  ProcessorResult,
} from "@/modules/jobs/processors/processor.types"
import { outreachService } from "@/modules/outreach"
import { outreachRepository } from "@/modules/outreach/outreach.repository"
import type { Context } from "@/shared/trpc"
import { logger } from "@/shared/logger"
import type { GmailEmailPayload } from "../providers/gmail.provider"
import type { OutreachReplySentiment } from "@/modules/outreach/outreach.types"

const log = logger.child({ module: "gmail-email-received.processor" })

function ruleClassify(payload: GmailEmailPayload): OutreachReplySentiment | null {
  const subject = (payload.subject ?? "").toLowerCase()
  const body = (payload.body ?? "").toLowerCase()
  const from = (payload.from?.email ?? "").toLowerCase()

  // Unsubscribes are explicit negatives
  if (/\bunsubscribe\b|remove me|take me off/.test(body)) return "negative"
  // OOO + noreply senders are unclassified (caller decides if relevant)
  if (/out of office|automatic reply|auto-reply|autoreply|on leave/.test(subject)) return null
  if (/noreply|no-reply|mailer-daemon|postmaster|donotreply/.test(from)) return null
  return null
}

function buildContext(tenantId: string): Context {
  return {
    tenantId,
    tenantSlug: "system",
    user: null,
    session: null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: undefined as any,
    requestId: "gmail-processor",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: new Request("https://internal/gmail-processor") as any,
  } as unknown as Context
}

async function handle(
  ctx: ProcessorContext,
  payloadRaw: unknown,
): Promise<ProcessorResult> {
  const payload = payloadRaw as GmailEmailPayload

  if (!ctx.tenantId) {
    return { ok: false, error: "Missing tenantId", retryable: false }
  }

  const fromEmail = payload.from?.email
  if (!fromEmail) {
    log.debug({ rawEventId: ctx.rawEventId }, "Email missing from address — skipping")
    return { ok: true }
  }

  const resolved = await ctx.resolveLead({
    email: fromEmail,
    source: "gmail",
    externalId: payload.messageId || undefined,
    autoCreate: false,
  })
  if (!resolved) {
    log.debug(
      { rawEventId: ctx.rawEventId, from: fromEmail },
      "No matching lead — dropping",
    )
    return { ok: true }
  }

  const correlationIds = [
    payload.inReplyTo,
    ...(payload.references ?? []),
  ].filter((id): id is string => typeof id === "string" && id.length > 0)

  let touchId: string | null = null
  for (const id of correlationIds) {
    const touch = await outreachRepository.findTouchByExternalMessageId(
      ctx.tenantId,
      id,
    )
    if (touch) {
      touchId = touch.id
      break
    }
  }

  const sentiment = ruleClassify(payload)
  const receivedAt = payload.date ? new Date(payload.date) : ctx.receivedAt

  await outreachService.recordReply(buildContext(ctx.tenantId), {
    leadId: resolved.leadId,
    touchId: touchId ?? null,
    receivedAt,
    subject: payload.subject ?? null,
    body: payload.body ?? null,
    sentiment,
    classifiedBy: sentiment ? "rule" : null,
    rawEventId: ctx.rawEventId,
  })

  return { ok: true }
}

registerProcessor({
  source: "gmail",
  kind: "email.received",
  version: 1,
  handle,
})

export const gmailEmailReceivedProcessor = {
  source: "gmail" as const,
  kind: "email.received" as const,
  version: 1,
  handle,
}
