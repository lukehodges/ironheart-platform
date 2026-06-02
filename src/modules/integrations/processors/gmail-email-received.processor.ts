// src/modules/integrations/processors/gmail-email-received.processor.ts
/**
 * Processor for raw_events of (source='gmail', kind='email.received').
 *
 *   1. Resolve sender → contact via identities/email
 *   2. If matched, correlate to an outbound touch via In-Reply-To / References
 *   3. Apply a fast rule classifier (OOO / auto-reply / unsubscribe)
 *   4. Call outreachService.recordReply
 *
 * Unmatched senders are silently dropped (idempotent {ok:true}) so we don't
 * fill the dead-letter queue with random inbox noise.
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

const log = logger.child({ module: "gmail-email-received.processor" })

type RuleClass =
  | "ooo"
  | "auto_reply"
  | "negative"
  | null

function ruleClassify(payload: GmailEmailPayload): RuleClass {
  const subject = (payload.subject ?? "").toLowerCase()
  const body = (payload.body ?? "").toLowerCase()
  const from = (payload.from?.email ?? "").toLowerCase()

  if (/out of office|automatic reply|auto-reply|autoreply|on leave/.test(subject)) {
    return "ooo"
  }
  if (/noreply|no-reply|mailer-daemon|postmaster|donotreply/.test(from)) {
    return "auto_reply"
  }
  if (/\bunsubscribe\b|remove me|take me off/.test(body)) {
    return "negative"
  }
  return null
}

/**
 * Build a minimal tRPC-compatible Context so we can reuse outreachService.
 * The service only reads tenantId + user.id from ctx.
 */
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
    // Gmail events are always tenant-scoped — refuse without it.
    return { ok: false, error: "Missing tenantId", retryable: false }
  }

  const fromEmail = payload.from?.email
  if (!fromEmail) {
    log.debug({ rawEventId: ctx.rawEventId }, "Email missing from address — skipping")
    return { ok: true }
  }

  // 1. Resolve contact (no autoCreate — unknown senders are ignored).
  const resolved = await ctx.resolveContact({
    email: fromEmail,
    source: "gmail",
    externalId: payload.messageId || undefined,
    autoCreate: false,
  })
  if (!resolved) {
    log.debug(
      { rawEventId: ctx.rawEventId, from: fromEmail },
      "No matching contact — dropping",
    )
    return { ok: true }
  }

  // 2. Correlate to outbound touch via In-Reply-To / References headers.
  const correlationIds = [
    payload.inReplyTo,
    ...(payload.references ?? []),
  ].filter((id): id is string => typeof id === "string" && id.length > 0)

  let touchId: string | null = null
  for (const id of correlationIds) {
    const touch = await outreachRepository.findTouchByExternalMessageId(id)
    if (touch && touch.tenantId === ctx.tenantId) {
      touchId = touch.id
      break
    }
  }

  // 3. Rule classifier.
  const ruleClass = ruleClassify(payload)

  // 4. Record reply.
  const receivedAt = payload.date ? new Date(payload.date) : ctx.receivedAt

  await outreachService.recordReply(buildContext(ctx.tenantId), {
    contactId: resolved.contactId,
    touchId: touchId ?? null,
    receivedAt,
    subject: payload.subject ?? null,
    body: payload.body ?? null,
    classifiedAs: ruleClass,
    classifiedBy: ruleClass ? "rule" : null,
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

// Re-exported for unit tests so they can call handle() without driving the
// in-memory registry.
export const gmailEmailReceivedProcessor = {
  source: "gmail" as const,
  kind: "email.received" as const,
  version: 1,
  handle,
}
