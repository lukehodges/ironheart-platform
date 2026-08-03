import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError } from "@/shared/errors"
import {
  leads,
  dailyActivity,
  weeklyHypothesis,
  touches,
  replies,
  dncList,
} from "@/shared/db/schemas/outreach.schema"
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm"
import type {
  LeadRecord,
  DailyActivityRecord,
  WeeklyHypothesisRecord,
  TouchRecord,
  ReplyRecord,
  DncRecord,
  EnrichedReplyRecord,
  CreateLeadInput,
  UpdateLeadInput,
  ListLeadsInput,
  ListDailyActivityInput,
  UpsertDailyActivityInput,
  CreateHypothesisInput,
  AddDncInput,
  OutreachLeadOwner,
  OutreachReplySentiment,
  OutreachHypothesisStatus,
  OutreachChannel,
  OutreachClassifier,
} from "./outreach.types"

const log = logger.child({ module: "outreach.repository" })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function domainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@")
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase()
}

function leadFilterConditions(
  tenantId: string,
  input: Omit<ListLeadsInput, "limit" | "offset" | "sortBy" | "sortDir">,
) {
  const conditions = [eq(leads.tenantId, tenantId)]
  if (input.status) conditions.push(eq(leads.status, input.status))
  if (input.owner) conditions.push(eq(leads.owner, input.owner))
  if (input.category) conditions.push(eq(leads.category, input.category))
  if (input.researched !== undefined)
    conditions.push(eq(leads.researched, input.researched))
  if (input.hypothesisWeekId)
    conditions.push(eq(leads.hypothesisWeekId, input.hypothesisWeekId))
  if (input.search) {
    const pat = `%${input.search}%`
    conditions.push(
      or(
        ilike(leads.name, pat),
        ilike(leads.company, pat),
        ilike(leads.email, pat),
      )!,
    )
  }
  // Date-range filters on lastContactedAt
  if (input.contactedFrom)
    conditions.push(gte(leads.lastContactedAt, input.contactedFrom))
  if (input.contactedTo)
    conditions.push(lte(leads.lastContactedAt, input.contactedTo))
  // NULL / NOT NULL gate on lastContactedAt
  if (input.hasContactDate === true)
    conditions.push(isNotNull(leads.lastContactedAt))
  else if (input.hasContactDate === false)
    conditions.push(isNull(leads.lastContactedAt))
  // Tier ilike on notes field (e.g. "gold" matches "tier: gold" anywhere in notes)
  if (input.tier)
    conditions.push(ilike(leads.notes, `%${input.tier}%`))
  if (input.excludeDnc) {
    // Hard suppression gate: drop any lead whose email or email-domain is on
    // the DNC list. Correlated NOT EXISTS so it holds regardless of the lead's
    // own status field. DNC emails/domains are stored lowercased (see addDnc).
    conditions.push(
      sql`NOT EXISTS (
        SELECT 1 FROM ${dncList}
        WHERE ${dncList.tenantId} = ${tenantId}
          AND ${leads.email} IS NOT NULL
          AND (
            ${dncList.email} = lower(${leads.email})
            OR (
              ${dncList.domain} IS NOT NULL
              AND ${dncList.domain} = split_part(lower(${leads.email}), '@', 2)
            )
          )
      )`,
    )
  }
  return conditions
}

// ===========================================================================
// OUTREACH REPOSITORY
// ===========================================================================

export const outreachRepository = {
  // -------------------------------------------------------------------------
  // LEADS
  // -------------------------------------------------------------------------

  async listLeads(
    tenantId: string,
    input: ListLeadsInput,
  ): Promise<LeadRecord[]> {
    const conditions = leadFilterConditions(tenantId, input)
    const limit = input.limit ?? 50
    const offset = input.offset ?? 0

    // Build order-by from sortBy/sortDir; default to number asc
    const dir = input.sortDir === "desc" ? desc : asc
    let orderCol
    switch (input.sortBy) {
      case "company":
        orderCol = dir(leads.company)
        break
      case "status":
        orderCol = dir(leads.status)
        break
      case "lastContactedAt":
        orderCol = dir(leads.lastContactedAt)
        break
      default:
        orderCol = dir(leads.number)
    }

    return db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(orderCol)
      .limit(limit)
      .offset(offset)
  },

  async countLeads(
    tenantId: string,
    input: Omit<ListLeadsInput, "limit" | "offset">,
  ): Promise<number> {
    const conditions = leadFilterConditions(tenantId, input)
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leads)
      .where(and(...conditions))
    return row?.count ?? 0
  },

  async getLead(tenantId: string, id: string): Promise<LeadRecord | null> {
    const [row] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.id, id)))
      .limit(1)
    return row ?? null
  },

  async createLead(
    tenantId: string,
    input: CreateLeadInput,
  ): Promise<LeadRecord> {
    return db.transaction(async (tx) => {
      const [{ next }] = await tx
        .select({
          next: sql<number>`COALESCE(MAX(${leads.number}), 0) + 1`,
        })
        .from(leads)
        .where(eq(leads.tenantId, tenantId))
      const [row] = await tx
        .insert(leads)
        .values({
          tenantId,
          number: next,
          owner: input.owner,
          status: input.status ?? "ready",
          name: input.name,
          company: input.company,
          category: input.category ?? null,
          email: input.email ?? null,
          website: input.website ?? null,
          source: input.source ?? null,
          researched: input.researched ?? false,
          followUpFlag: input.followUpFlag ?? false,
          researchNotes: input.researchNotes ?? null,
          notes: input.notes ?? null,
          hypothesisWeekId: input.hypothesisWeekId ?? null,
        })
        .returning()
      return row
    })
  },

  async updateLead(
    tenantId: string,
    input: UpdateLeadInput,
  ): Promise<LeadRecord> {
    const { id, ...rest } = input
    const [row] = await db
      .update(leads)
      .set({ ...rest, updatedAt: new Date() })
      .where(and(eq(leads.tenantId, tenantId), eq(leads.id, id)))
      .returning()
    if (!row) throw new NotFoundError("Lead", id)
    return row
  },

  async findLeadByEmail(
    tenantId: string,
    email: string,
  ): Promise<LeadRecord | null> {
    const [row] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.email, email)))
      .limit(1)
    return row ?? null
  },

  async tabCounts(tenantId: string): Promise<{
    ready: number
    sent: number
    draft: number
    skipped: number
    dnc: number
    total: number
    alex: number
    luke: number
  }> {
    const rows = await db
      .select({
        status: leads.status,
        owner: leads.owner,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(eq(leads.tenantId, tenantId))
      .groupBy(leads.status, leads.owner)

    const out = {
      ready: 0,
      sent: 0,
      draft: 0,
      skipped: 0,
      dnc: 0,
      total: 0,
      alex: 0,
      luke: 0,
    }
    for (const r of rows) {
      out[r.status] += r.count
      out[r.owner] += r.count
      out.total += r.count
    }
    return out
  },

  // -------------------------------------------------------------------------
  // DAILY ACTIVITY
  // -------------------------------------------------------------------------

  async listDailyActivity(
    tenantId: string,
    input: ListDailyActivityInput,
  ): Promise<DailyActivityRecord[]> {
    const conditions = [
      eq(dailyActivity.tenantId, tenantId),
      gte(dailyActivity.date, input.startDate),
      lte(dailyActivity.date, input.endDate),
    ]
    if (input.owner) conditions.push(eq(dailyActivity.owner, input.owner))
    return db
      .select()
      .from(dailyActivity)
      .where(and(...conditions))
      .orderBy(desc(dailyActivity.date))
  },

  async upsertDailyActivity(
    tenantId: string,
    input: UpsertDailyActivityInput,
  ): Promise<DailyActivityRecord> {
    const [row] = await db
      .insert(dailyActivity)
      .values({
        tenantId,
        date: input.date,
        owner: input.owner,
        channel: input.channel ?? "email",
        hypothesisWeekId: input.hypothesisWeekId ?? null,
        sent: input.sent ?? 0,
        replies: input.replies ?? 0,
        positive: input.positive ?? 0,
        meetingsBooked: input.meetingsBooked ?? 0,
        meetingsTaken: input.meetingsTaken ?? 0,
        interested: input.interested ?? 0,
        closed: input.closed ?? 0,
        newUpfront: input.newUpfront != null ? String(input.newUpfront) : "0",
        newRetainer:
          input.newRetainer != null ? String(input.newRetainer) : "0",
        notes: input.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [dailyActivity.tenantId, dailyActivity.date, dailyActivity.owner],
        set: {
          channel: input.channel ?? sql`${dailyActivity.channel}`,
          hypothesisWeekId:
            input.hypothesisWeekId !== undefined
              ? input.hypothesisWeekId
              : sql`${dailyActivity.hypothesisWeekId}`,
          sent: input.sent ?? sql`${dailyActivity.sent}`,
          replies: input.replies ?? sql`${dailyActivity.replies}`,
          positive: input.positive ?? sql`${dailyActivity.positive}`,
          meetingsBooked:
            input.meetingsBooked ?? sql`${dailyActivity.meetingsBooked}`,
          meetingsTaken:
            input.meetingsTaken ?? sql`${dailyActivity.meetingsTaken}`,
          interested: input.interested ?? sql`${dailyActivity.interested}`,
          closed: input.closed ?? sql`${dailyActivity.closed}`,
          newUpfront:
            input.newUpfront != null
              ? String(input.newUpfront)
              : sql`${dailyActivity.newUpfront}`,
          newRetainer:
            input.newRetainer != null
              ? String(input.newRetainer)
              : sql`${dailyActivity.newRetainer}`,
          notes: input.notes !== undefined ? input.notes : sql`${dailyActivity.notes}`,
          updatedAt: new Date(),
        },
      })
      .returning()
    return row
  },

  async incrementDailyActivity(
    tenantId: string,
    date: string,
    owner: OutreachLeadOwner,
    field: "sent" | "replies" | "positive",
    delta: number = 1,
  ): Promise<void> {
    // Atomic upsert: creates the row at zero with the delta applied, or adds delta to the existing row.
    await db.execute(sql`
      INSERT INTO outreach_daily_activity ("tenantId", date, owner, ${sql.raw(field)})
      VALUES (${tenantId}, ${date}, ${owner}, ${delta})
      ON CONFLICT ("tenantId", date, owner) DO UPDATE
        SET ${sql.raw(field)} = outreach_daily_activity.${sql.raw(field)} + ${delta},
            "updatedAt" = NOW()
    `)
  },

  // -------------------------------------------------------------------------
  // WEEKLY HYPOTHESIS
  // -------------------------------------------------------------------------

  async listHypotheses(
    tenantId: string,
    opts: { status?: OutreachHypothesisStatus; limit?: number } = {},
  ): Promise<WeeklyHypothesisRecord[]> {
    const conditions = [eq(weeklyHypothesis.tenantId, tenantId)]
    if (opts.status) conditions.push(eq(weeklyHypothesis.status, opts.status))
    return db
      .select()
      .from(weeklyHypothesis)
      .where(and(...conditions))
      .orderBy(desc(weeklyHypothesis.startDate))
      .limit(opts.limit ?? 20)
  },

  async getActiveHypothesis(
    tenantId: string,
  ): Promise<WeeklyHypothesisRecord | null> {
    const [row] = await db
      .select()
      .from(weeklyHypothesis)
      .where(
        and(
          eq(weeklyHypothesis.tenantId, tenantId),
          eq(weeklyHypothesis.status, "active"),
        ),
      )
      .orderBy(desc(weeklyHypothesis.startDate))
      .limit(1)
    return row ?? null
  },

  async getHypothesis(
    tenantId: string,
    id: string,
  ): Promise<WeeklyHypothesisRecord | null> {
    const [row] = await db
      .select()
      .from(weeklyHypothesis)
      .where(
        and(
          eq(weeklyHypothesis.tenantId, tenantId),
          eq(weeklyHypothesis.id, id),
        ),
      )
      .limit(1)
    return row ?? null
  },

  async createHypothesis(
    tenantId: string,
    input: CreateHypothesisInput,
  ): Promise<WeeklyHypothesisRecord> {
    const [row] = await db
      .insert(weeklyHypothesis)
      .values({
        tenantId,
        week: input.week,
        startDate: input.startDate,
        endDate: input.endDate,
        title: input.title,
        body: input.body,
        targetSample: input.targetSample,
        targetReplyPct: String(input.targetReplyPct),
        targetPositivePct: String(input.targetPositivePct),
        targetBooked: input.targetBooked ?? 0,
        replaces: input.replaces ?? null,
        prevWeekId: input.prevWeekId ?? null,
      })
      .returning()
    return row
  },

  async updateHypothesisStatus(
    tenantId: string,
    id: string,
    status: OutreachHypothesisStatus,
    verdict?: string,
    resultSummary?: string,
  ): Promise<WeeklyHypothesisRecord> {
    const set: Partial<typeof weeklyHypothesis.$inferInsert> = {
      status,
      updatedAt: new Date(),
    }
    if (verdict !== undefined) {
      // Verdict enum is validated at the zod boundary; cast here.
      set.verdict = verdict as typeof weeklyHypothesis.$inferInsert.verdict
    }
    if (resultSummary !== undefined) set.resultSummary = resultSummary
    const [row] = await db
      .update(weeklyHypothesis)
      .set(set)
      .where(
        and(
          eq(weeklyHypothesis.tenantId, tenantId),
          eq(weeklyHypothesis.id, id),
        ),
      )
      .returning()
    if (!row) throw new NotFoundError("WeeklyHypothesis", id)
    return row
  },

  // -------------------------------------------------------------------------
  // TOUCHES
  // -------------------------------------------------------------------------

  async findTouchByExternalMessageId(
    tenantId: string,
    externalMessageId: string,
  ): Promise<TouchRecord | null> {
    const [row] = await db
      .select()
      .from(touches)
      .where(
        and(
          eq(touches.tenantId, tenantId),
          eq(touches.externalMessageId, externalMessageId),
        ),
      )
      .limit(1)
    return row ?? null
  },

  async createTouch(
    tenantId: string,
    input: {
      leadId: string
      channel: OutreachChannel
      sentAt?: Date
      subjectRendered?: string
      bodyRendered?: string
      externalMessageId?: string
    },
  ): Promise<TouchRecord> {
    const [row] = await db
      .insert(touches)
      .values({
        tenantId,
        leadId: input.leadId,
        channel: input.channel,
        sentAt: input.sentAt ?? null,
        subjectRendered: input.subjectRendered ?? null,
        bodyRendered: input.bodyRendered ?? null,
        externalMessageId: input.externalMessageId ?? null,
        deliveryStatus: input.sentAt ? "sent" : "queued",
      })
      .returning()
    return row
  },

  // -------------------------------------------------------------------------
  // REPLIES
  // -------------------------------------------------------------------------

  async createReply(
    tenantId: string,
    input: {
      leadId: string
      touchId?: string | null
      receivedAt?: Date
      subject?: string | null
      body?: string | null
      sentiment?: OutreachReplySentiment | null
      classifiedBy?: OutreachClassifier | null
      needsReview?: boolean
      handled?: boolean
      rawEventId?: string | null
    },
  ): Promise<ReplyRecord> {
    const [row] = await db
      .insert(replies)
      .values({
        tenantId,
        leadId: input.leadId,
        touchId: input.touchId ?? null,
        receivedAt: input.receivedAt ?? new Date(),
        subject: input.subject ?? null,
        body: input.body ?? null,
        sentiment: input.sentiment ?? null,
        classifiedBy: input.classifiedBy ?? null,
        rawEventId: input.rawEventId ?? null,
        // Only set when provided so the column defaults still apply otherwise.
        ...(input.needsReview !== undefined ? { needsReview: input.needsReview } : {}),
        ...(input.handled !== undefined ? { handled: input.handled } : {}),
      })
      .returning()
    return row
  },

  async listReplies(
    tenantId: string,
    opts: {
      needsReview?: boolean
      handled?: boolean
      leadId?: string
      sinceDays?: number
      limit?: number
    },
  ): Promise<ReplyRecord[]> {
    const conditions = [eq(replies.tenantId, tenantId)]
    if (opts.needsReview !== undefined)
      conditions.push(eq(replies.needsReview, opts.needsReview))
    if (opts.handled !== undefined)
      conditions.push(eq(replies.handled, opts.handled))
    if (opts.leadId) conditions.push(eq(replies.leadId, opts.leadId))
    if (opts.sinceDays) {
      const since = new Date(Date.now() - opts.sinceDays * 86_400_000)
      conditions.push(gte(replies.receivedAt, since))
    }
    return db
      .select()
      .from(replies)
      .where(and(...conditions))
      .orderBy(desc(replies.receivedAt))
      .limit(opts.limit ?? 50)
  },

  async listRepliesEnriched(
    tenantId: string,
    opts: { needsReview?: boolean; sinceDays?: number; limit?: number },
  ): Promise<EnrichedReplyRecord[]> {
    const conditions = [eq(replies.tenantId, tenantId)]
    if (opts.needsReview !== undefined)
      conditions.push(eq(replies.needsReview, opts.needsReview))
    if (opts.sinceDays) {
      const since = new Date(Date.now() - opts.sinceDays * 86_400_000)
      conditions.push(gte(replies.receivedAt, since))
    }
    const rows = await db
      .select({
        reply: replies,
        leadId: leads.id,
        leadName: leads.name,
        leadCompany: leads.company,
        leadEmail: leads.email,
        leadOwner: leads.owner,
        touchId: touches.id,
        touchSentAt: touches.sentAt,
        touchSubject: touches.subjectRendered,
        touchChannel: touches.channel,
      })
      .from(replies)
      .innerJoin(leads, eq(replies.leadId, leads.id))
      .leftJoin(touches, eq(replies.touchId, touches.id))
      .where(and(...conditions))
      .orderBy(desc(replies.receivedAt))
      .limit(opts.limit ?? 50)

    return rows.map((r) => ({
      ...r.reply,
      lead: {
        id: r.leadId,
        name: r.leadName,
        company: r.leadCompany,
        email: r.leadEmail,
        owner: r.leadOwner,
      },
      touch: r.touchId
        ? {
            id: r.touchId,
            sentAt: r.touchSentAt,
            subjectRendered: r.touchSubject,
            channel: r.touchChannel!,
          }
        : null,
    }))
  },

  async markReplyHandled(
    tenantId: string,
    id: string,
    sentiment?: OutreachReplySentiment,
  ): Promise<void> {
    const set: Partial<typeof replies.$inferInsert> = {
      handled: true,
      handledAt: new Date(),
      needsReview: false,
    }
    if (sentiment) set.sentiment = sentiment
    const res = await db
      .update(replies)
      .set(set)
      .where(and(eq(replies.tenantId, tenantId), eq(replies.id, id)))
      .returning({ id: replies.id })
    if (res.length === 0) throw new NotFoundError("Reply", id)
  },

  // -------------------------------------------------------------------------
  // DNC
  // -------------------------------------------------------------------------

  async addDnc(
    tenantId: string,
    input: AddDncInput,
    addedBy?: string,
  ): Promise<DncRecord> {
    const [row] = await db
      .insert(dncList)
      .values({
        // Store canonical (lowercased) so matching in isOnDnc / the excludeDnc
        // gate is reliable regardless of how the address was typed.
        tenantId,
        email: input.email?.toLowerCase() ?? null,
        domain: input.domain?.toLowerCase() ?? null,
        reason: input.reason ?? null,
        addedBy: addedBy ?? null,
      })
      .returning()
    return row
  },

  /**
   * Flip any lead rows matching an email or email-domain to status "dnc", so
   * the roster and counts reflect suppression. The send path is already
   * protected by the excludeDnc query gate; this just keeps stored state
   * coherent with the DNC list.
   */
  async suppressMatchingLeads(
    tenantId: string,
    email?: string | null,
    domain?: string | null,
  ): Promise<void> {
    const matchers = []
    if (email) matchers.push(sql`lower(${leads.email}) = ${email.toLowerCase()}`)
    const dmn = domain ?? (email ? domainFromEmail(email) : null)
    if (dmn)
      matchers.push(
        sql`split_part(lower(${leads.email}), '@', 2) = ${dmn.toLowerCase()}`,
      )
    if (matchers.length === 0) return
    await db
      .update(leads)
      .set({ status: "dnc", updatedAt: new Date() })
      .where(and(eq(leads.tenantId, tenantId), or(...matchers)!))
  },

  async isOnDnc(tenantId: string, email: string): Promise<boolean> {
    const domain = domainFromEmail(email)
    const conditions = [eq(dncList.tenantId, tenantId)]
    const matchers = [eq(dncList.email, email.toLowerCase())]
    if (domain) matchers.push(eq(dncList.domain, domain))
    conditions.push(or(...matchers)!)
    const [row] = await db
      .select({ id: dncList.id })
      .from(dncList)
      .where(and(...conditions))
      .limit(1)
    return Boolean(row)
  },

  async listDnc(
    tenantId: string,
    opts: { search?: string; limit?: number },
  ): Promise<DncRecord[]> {
    const conditions = [eq(dncList.tenantId, tenantId)]
    if (opts.search) {
      const pat = `%${opts.search}%`
      conditions.push(or(ilike(dncList.email, pat), ilike(dncList.domain, pat))!)
    }
    return db
      .select()
      .from(dncList)
      .where(and(...conditions))
      .orderBy(desc(dncList.addedAt))
      .limit(opts.limit ?? 50)
  },
}

export type OutreachRepository = typeof outreachRepository

// Suppress unused logger import warning — kept for parity with other repos
void log
