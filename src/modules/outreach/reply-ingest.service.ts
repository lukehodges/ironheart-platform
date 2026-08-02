/**
 * reply-ingest.service.ts
 *
 * Handles inbound reply webhooks from Instantly and classifies them before
 * writing to outreach_replies.
 *
 * ---------------------------------------------------------------------------
 * ASSUMED INSTANTLY V2 REPLY WEBHOOK PAYLOAD SHAPE
 * ---------------------------------------------------------------------------
 *
 * Instantly fires a POST to your webhook URL when a reply arrives in a
 * monitored inbox. The documented v2 reply event looks like:
 *
 * {
 *   "event_type":   "reply_received",          // string — always "reply_received"
 *   "id":           "evt_01hx...",             // string — stable event id for idempotency
 *   "timestamp":    "2026-08-02T09:31:00Z",    // ISO-8601 — when Instantly observed the reply
 *   "campaign": {
 *     "id":   "camp_...",
 *     "name": "August Bath SMEs"
 *   },
 *   "lead": {
 *     "email":        "owner@example.com",     // sender email — the key lookup field
 *     "first_name":   "Jane",
 *     "last_name":    "Smith",
 *     "company_name": "Example Ltd"
 *   },
 *   "reply": {
 *     "subject":     "Re: Quick question",
 *     "body":        "Hi Luke, thanks for reaching out...",
 *     "timestamp":   "2026-08-02T09:30:45Z",   // actual email timestamp (prefer over root)
 *     "message_id":  "<abc123@mail.gmail.com>"  // RFC822 Message-ID of the reply
 *   }
 * }
 *
 * All fields are treated as optional/nullable below — Instantly has been known
 * to omit campaign or use flat structures in older accounts.
 * ---------------------------------------------------------------------------
 */

import { logger } from "@/shared/logger"
import { outreachRepository } from "./outreach.repository"
import type { OutreachReplySentiment } from "./outreach.types"

const log = logger.child({ module: "reply-ingest.service" })

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

interface InstantlyCampaign {
  id?: string
  name?: string
}

interface InstantlyLead {
  email?: string
  first_name?: string
  last_name?: string
  company_name?: string
}

interface InstantlyReplyBody {
  subject?: string
  body?: string
  timestamp?: string
  message_id?: string
}

export interface InstantlyReplyPayload {
  event_type?: string
  id?: string
  timestamp?: string
  campaign?: InstantlyCampaign
  lead?: InstantlyLead
  reply?: InstantlyReplyBody
  // Flat alternative shape (older Instantly accounts)
  email?: string
  subject?: string
  body?: string
  reply_timestamp?: string
  event_id?: string
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface IngestReplyResult {
  /** True if the sender email matched a known lead. */
  matched: boolean
  /** UUID of the matched lead, or null if unknown. */
  leadId: string | null
  /** The sentiment assigned (or null if the record was not written). */
  sentiment: OutreachReplySentiment | null
  /**
   * True when the reply was detected as noise (OOO / auto-reply / bounce /
   * unsubscribe attempt via mechanical pattern). These are recorded with
   * sentiment='neutral' and needsReview=false.
   */
  filtered: boolean
  /** Human-readable reason the reply was skipped entirely (e.g. unknown lead). */
  skippedReason?: string
}

// ---------------------------------------------------------------------------
// Noise filter — detect non-human auto-replies / bounces
// ---------------------------------------------------------------------------

/**
 * Patterns that identify mechanical, non-human messages we do NOT want
 * counted as real replies. Matched case-insensitively against subject+body.
 *
 * Deliberately broad — false-positives (filtering a real reply that happens
 * to say "automatic") are cheaper than false-negatives (counting OOOs as
 * interest). The needsReview=false flag means they won't surface to the inbox
 * but they ARE stored in the DB for audit.
 */
const NOISE_SUBJECT_PATTERNS = [
  /out of office/i,
  /automatic(ally)? reply/i,
  /auto-?reply/i,
  /autoreply/i,
  /on (annual |parental |maternity |sick |extended )?leave/i,
  /away from (the )?office/i,
  /i('m| am) currently (out|away|unavailable|on leave)/i,
  /holiday notification/i,
  /vacation (reply|response|notice)/i,
  /\[?unsubscribed?\]?/i,
  /delivery (status notification|failure|failed)/i,
  /undeliverable/i,
  /mail delivery (failed|failure|subsystem)/i,
  /returned mail/i,
  /failure notice/i,
  /bounce/i,
  /no longer with/i,
]

const NOISE_BODY_PATTERNS = [
  /out of office/i,
  /automatic reply/i,
  /auto-?reply/i,
  /i am (currently )?out of (the )?office/i,
  /i will (be )?return/i,
  /mailer-?daemon/i,
  /delivery failed/i,
  /undeliverable/i,
  /no longer (works|employed|with|at) (here|this company|us)/i,
  /has left the company/i,
  /email address (is )?no longer (valid|active|in use)/i,
]

const NOISE_FROM_PATTERNS = [
  /noreply/i,
  /no-reply/i,
  /donotreply/i,
  /do-not-reply/i,
  /mailer-?daemon/i,
  /postmaster/i,
  /bounce/i,
  /notifications?@/i,
]

function isNoise(params: {
  senderEmail: string
  subject: string
  body: string
}): boolean {
  const { senderEmail, subject, body } = params
  if (NOISE_FROM_PATTERNS.some((re) => re.test(senderEmail))) return true
  if (NOISE_SUBJECT_PATTERNS.some((re) => re.test(subject))) return true
  if (NOISE_BODY_PATTERNS.some((re) => re.test(body))) return true
  return false
}

// ---------------------------------------------------------------------------
// Rule-based sentiment classifier
// ---------------------------------------------------------------------------

const POSITIVE_PATTERNS = [
  /\binterested\b/i,
  /sounds? good/i,
  /let'?s (chat|talk|connect|hop on|jump on|speak)/i,
  /happy to (chat|talk|connect|jump on|discuss|explore)/i,
  /\byes\b/i,
  /\bsure\b/i,
  /\bbook (a |me )?(call|meeting|time|slot)/i,
  /\bschedule (a ?)?(call|meeting|time)\b/i,
  /\bkeen\b/i,
  /\bwould love\b/i,
  /\bsend (me |over )?(more (info|details|information))?\b/i,
  /\bsounds interesting\b/i,
  /\btell me more\b/i,
  /\bopen to (a |this |that )?chat\b/i,
  /\bcan we (chat|talk|connect)\b/i,
  /what does this (look like|involve|cost)/i,
  /\bhow much\b/i,
  /\bprice\b/i,
  /\bquote\b/i,
  /availability/i,
  /\bthis (sounds|looks|seems) (like )?a? ?good/i,
]

const NEGATIVE_PATTERNS = [
  /not interested/i,
  /no thank(s| you)/i,
  /\bremove (me|my email|our (company|email))\b/i,
  /\bstop (emailing|contacting|reaching out)\b/i,
  /\bunsubscribe\b/i,
  /\bdo not (contact|email|reach out)\b/i,
  /don'?t (contact|email|reach out)\b/i,
  /please (remove|unsubscribe|stop)/i,
  /not (the right|a good) (fit|time|match)/i,
  /already (have|using|working with) (a |someone|a provider|an agency)/i,
  /not looking/i,
  /happy with (what we have|our current)/i,
  /not relevant/i,
  /wrong person/i,
  /wrong (email|address|contact)/i,
]

function ruleClassifySentiment(params: {
  subject: string
  body: string
}): OutreachReplySentiment {
  const text = `${params.subject} ${params.body}`

  // Negative check first — an explicit opt-out always wins
  if (NEGATIVE_PATTERNS.some((re) => re.test(text))) return "negative"
  if (POSITIVE_PATTERNS.some((re) => re.test(text))) return "positive"
  return "neutral"
}

// ---------------------------------------------------------------------------
// Payload extraction helpers
// ---------------------------------------------------------------------------

function extractSenderEmail(payload: InstantlyReplyPayload): string | null {
  // Nested shape (v2 standard)
  const nested = payload.lead?.email
  if (typeof nested === "string" && nested.includes("@")) return nested.toLowerCase()
  // Flat shape (legacy / account-level variation)
  const flat = payload.email
  if (typeof flat === "string" && flat.includes("@")) return flat.toLowerCase()
  return null
}

function extractSubject(payload: InstantlyReplyPayload): string {
  return (
    payload.reply?.subject ??
    payload.subject ??
    ""
  )
}

function extractBody(payload: InstantlyReplyPayload): string {
  return (
    payload.reply?.body ??
    payload.body ??
    ""
  )
}

function extractReceivedAt(payload: InstantlyReplyPayload): Date {
  const candidates = [
    payload.reply?.timestamp,
    payload.timestamp,
    payload.reply_timestamp,
  ]
  for (const ts of candidates) {
    if (typeof ts === "string" && ts.length > 0) {
      const d = new Date(ts)
      if (!isNaN(d.getTime())) return d
    }
  }
  return new Date()
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function extractRawEventId(payload: InstantlyReplyPayload): string | null {
  // rawEventId is a uuid FK to the internal events table — Instantly's own event
  // ids (e.g. "evt_01hx…") are NOT uuids, so only accept a genuine uuid here;
  // otherwise leave it null (Instantly-side dedup is a future enhancement).
  const id = payload.id ?? payload.event_id
  if (typeof id === "string" && UUID_RE.test(id)) return id
  return null
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Ingest a reply webhook from Instantly.
 *
 * @param tenantId  - The platform tenant to scope the lookup + insert under.
 * @param payload   - The raw (parsed) JSON body from Instantly's webhook POST.
 *
 * Design decisions:
 * - leadId is NOT NULL in the schema → unknown-email replies are dropped (logged).
 * - Noise (OOO / bounce / auto-reply) → stored with sentiment=neutral,
 *   needsReview=false so they don't pollute the triage inbox but are auditable.
 * - Real replies → rule-classified (positive/neutral/negative), needsReview=true.
 *
 * TODO: escalate to Claude classification (outreach.classifyReply) for
 * replies that land as sentiment='neutral' and needsReview=true — Claude can
 * disambiguate genuine neutral replies from vague interest signals.
 */
export async function ingestInstantlyReply(
  tenantId: string,
  payload: InstantlyReplyPayload,
): Promise<IngestReplyResult> {
  const senderEmail = extractSenderEmail(payload)

  if (!senderEmail) {
    log.warn({ tenantId }, "Instantly reply webhook missing sender email — skipping")
    return { matched: false, leadId: null, sentiment: null, filtered: false, skippedReason: "no_sender_email" }
  }

  const subject = extractSubject(payload)
  const body = extractBody(payload)
  const receivedAt = extractReceivedAt(payload)
  const rawEventId = extractRawEventId(payload)

  // ── 1. Lead lookup ──────────────────────────────────────────────────────
  // findLeadByEmail already lower-cases the email on the DB side via unique index
  // on lower(email), but we also normalise here to be safe.
  const lead = await outreachRepository.findLeadByEmail(tenantId, senderEmail)

  if (!lead) {
    log.info(
      { tenantId, senderEmail },
      "Instantly reply from unknown email — skipping (leadId is NOT NULL)",
    )
    return {
      matched: false,
      leadId: null,
      sentiment: null,
      filtered: false,
      skippedReason: "unknown_lead",
    }
  }

  // ── 2. Noise filter ─────────────────────────────────────────────────────
  const noise = isNoise({ senderEmail, subject, body })

  if (noise) {
    log.debug(
      { tenantId, leadId: lead.id, senderEmail },
      "Instantly reply classified as noise — recording with needsReview=false",
    )
    await outreachRepository.createReply(tenantId, {
      leadId: lead.id,
      touchId: null,
      receivedAt,
      subject: subject || null,
      body: body || null,
      sentiment: "neutral",
      classifiedBy: "rule",
      needsReview: false, // noise stays out of the triage inbox
      handled: true,
      rawEventId,
    })
    return { matched: true, leadId: lead.id, sentiment: "neutral", filtered: true }
  }

  // ── 3. Rule-based sentiment ──────────────────────────────────────────────
  const sentiment = ruleClassifySentiment({ subject, body })

  log.info(
    { tenantId, leadId: lead.id, senderEmail, sentiment },
    "Instantly reply ingested",
  )

  // needsReview defaults to true in the schema for all non-noise replies.
  // The repository's createReply does not accept needsReview directly — the
  // schema default (true) covers it.
  await outreachRepository.createReply(tenantId, {
    leadId: lead.id,
    touchId: null,    // Instantly does not give us the original message-id to correlate
    receivedAt,
    subject: subject || null,
    body: body || null,
    sentiment,
    classifiedBy: "rule",
    rawEventId,
  })

  // TODO: escalate to Claude classification (outreach.classifyReply) for
  // sentiment='neutral' && needsReview=true replies. Wire in after the
  // Claude classifier is implemented in outreach.service.

  return { matched: true, leadId: lead.id, sentiment, filtered: false }
}
