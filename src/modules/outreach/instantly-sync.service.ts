/**
 * Instantly sync — makes Instantly's email log the writer for the Instantly
 * send stream, instead of trusting manual markLeadSent/markBatchSent calls.
 *
 * Why: "marked sent" is an honour-system record. On 2026-08-03 a mark-batch
 * included 12 leads Instantly never dispatched (skipped/suppressed), so the
 * dashboard read 63 sends when 52 were real. Deriving sent-state from
 * Instantly's own log makes that drift structurally impossible.
 *
 * Each run (hourly cron):
 *   - GET /api/v2/emails (paginated). ue_type 1 = sent, 2 = reply.
 *   - SENDS: upsert a touch keyed on Instantly's message_id
 *     (touches.externalMessageId) and flip the lead to sent with Instantly's
 *     REAL send date. Manual touches (externalMessageId NULL) are untouched —
 *     the hand-sent personal/Bath stream never goes through Instantly and
 *     keeps using markLeadSent.
 *   - REPLIES: feed reply-ingest (sentiment rules + OOO-noise filter), deduped
 *     on (lead, receivedAt) so re-polling never duplicates.
 *
 * Gotcha: api.instantly.ai's WAF 403s default fetch UAs — send a browser UA.
 */

import { db } from "@/shared/db"
import { sql } from "drizzle-orm"
import { logger } from "@/shared/logger"
import {
  ingestInstantlyReply,
  type InstantlyReplyPayload,
} from "./reply-ingest.service"

const log = logger.child({ module: "outreach.instantly-sync" })

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

interface InstantlyEmail {
  id?: string
  message_id?: string
  ue_type?: number
  timestamp_email?: string
  lead?: string
  eaccount?: string
  from_address_email?: string
  campaign_id?: string
  subject?: string
  body?: { text?: string; html?: string }
}

export interface InstantlySyncResult {
  fetched: number
  sendsSeen: number
  touchesCreated: number
  leadsFlipped: number
  repliesSeen: number
  repliesIngested: number
}

async function fetchInstantlyEmails(sinceDays: number): Promise<InstantlyEmail[]> {
  const key = process.env.INSTANTLY_API_KEY
  if (!key) {
    log.warn("INSTANTLY_API_KEY not set — skipping Instantly sync")
    return []
  }
  const cutoff = new Date(Date.now() - sinceDays * 86_400_000)
  const items: InstantlyEmail[] = []
  let cursor: string | null = null
  for (let page = 0; page < 40; page++) {
    const url = new URL("https://api.instantly.ai/api/v2/emails")
    url.searchParams.set("limit", "100")
    if (cursor) url.searchParams.set("starting_after", cursor)
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      log.warn({ status: res.status, page }, "Instantly /emails non-OK — stopping pagination")
      break
    }
    const body = (await res.json()) as {
      items?: InstantlyEmail[]
      next_starting_after?: string
    }
    const batch = body.items ?? []
    items.push(...batch)
    // Results come newest-first; stop paging once a page is entirely older
    // than the cutoff so a growing history doesn't grow the poll.
    const allOld = batch.length > 0 && batch.every(
      (m) => m.timestamp_email && new Date(m.timestamp_email) < cutoff,
    )
    cursor = body.next_starting_after ?? null
    if (!cursor || batch.length === 0 || allOld) break
  }
  return items.filter(
    (m) => m.timestamp_email && new Date(m.timestamp_email) >= cutoff,
  )
}

/** Sync one tenant's leads/touches/replies from the Instantly log. */
export async function syncFromInstantly(
  tenantId: string,
  opts: { sinceDays?: number } = {},
): Promise<InstantlySyncResult> {
  const emails = await fetchInstantlyEmails(opts.sinceDays ?? 14)
  const result: InstantlySyncResult = {
    fetched: emails.length,
    sendsSeen: 0,
    touchesCreated: 0,
    leadsFlipped: 0,
    repliesSeen: 0,
    repliesIngested: 0,
  }

  for (const m of emails) {
    if (m.ue_type === 1) {
      // ── SEND ─────────────────────────────────────────────────────────────
      const recipient = (m.lead ?? "").trim().toLowerCase()
      const messageId = m.message_id ?? m.id
      const ts = m.timestamp_email
      if (!recipient || !messageId || !ts) continue
      result.sendsSeen++

      // One touch per Instantly message — dedupe on externalMessageId.
      const inserted = await db.execute(sql`
        INSERT INTO outreach_touches
          (id,"tenantId","leadId",channel,"sentAt","deliveryStatus","externalMessageId","createdAt","updatedAt")
        SELECT gen_random_uuid(), ${tenantId}, l.id, 'email', ${ts}::timestamp,
               'sent', ${messageId}, now(), now()
        FROM outreach_leads l
        WHERE l."tenantId" = ${tenantId} AND lower(l.email) = ${recipient}
          AND NOT EXISTS (
            SELECT 1 FROM outreach_touches t
            WHERE t."tenantId" = ${tenantId} AND t."externalMessageId" = ${messageId}
          )
        RETURNING id
      `)
      if (inserted.length > 0) result.touchesCreated += inserted.length

      // Reality wins: the lead is sent, dated by Instantly's clock. Never
      // downgrade skipped/dnc — suppression decisions outrank a send record.
      const flipped = await db.execute(sql`
        UPDATE outreach_leads SET
          status = CASE WHEN status IN ('ready','draft') THEN 'sent'::outreach_lead_status ELSE status END,
          "lastContactedAt" = GREATEST(COALESCE("lastContactedAt", ${ts}::date), ${ts}::date),
          "updatedAt" = now()
        WHERE "tenantId" = ${tenantId} AND lower(email) = ${recipient}
          AND (status IN ('ready','draft') OR "lastContactedAt" IS NULL OR "lastContactedAt" < ${ts}::date)
        RETURNING id
      `)
      if (flipped.length > 0) result.leadsFlipped += flipped.length
    } else if (m.ue_type === 2) {
      // ── REPLY ────────────────────────────────────────────────────────────
      const sender = (m.from_address_email ?? m.lead ?? "").trim().toLowerCase()
      const ts = m.timestamp_email
      if (!sender || !ts) continue
      result.repliesSeen++

      // Idempotence: reply-ingest stores receivedAt = the timestamp we pass,
      // so an existing (lead, receivedAt) row means this reply is already in.
      const dupe = await db.execute(sql`
        SELECT 1 FROM outreach_replies r
        JOIN outreach_leads l ON r."leadId" = l.id
        WHERE l."tenantId" = ${tenantId} AND lower(l.email) = ${sender}
          AND r."receivedAt" = ${ts}::timestamp
        LIMIT 1
      `)
      if (dupe.length > 0) continue

      const payload: InstantlyReplyPayload = {
        event_type: "reply_received",
        timestamp: ts,
        lead: { email: sender },
        reply: {
          subject: m.subject ?? "",
          body: m.body?.text ?? m.body?.html ?? "",
          timestamp: ts,
        },
      }
      try {
        const r = await ingestInstantlyReply(tenantId, payload)
        if (r.matched) result.repliesIngested++
      } catch (err) {
        log.warn({ err, sender }, "Reply ingest failed — continuing")
      }
    }
  }

  log.info(result, "Instantly sync complete")
  return result
}
