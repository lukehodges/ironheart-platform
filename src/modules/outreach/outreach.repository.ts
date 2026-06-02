import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError } from "@/shared/errors"
import {
  companies,
  contacts,
  campaigns,
  templates,
  touches,
  replies,
  dncList,
} from "@/shared/db/schemas/outreach.schema"
import {
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  sql,
  inArray,
} from "drizzle-orm"
import type {
  CompanyRecord,
  ContactRecord,
  CampaignRecord,
  TemplateRecord,
  TouchRecord,
  ReplyRecord,
  EnrichedReplyRecord,
  DncListRecord,
  CreateCompanyInput,
  UpdateCompanyInput,
  CreateContactInput,
  UpdateContactInput,
  CreateCampaignInput,
  CreateTemplateInput,
  OutreachDeliveryStatus,
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

// ===============================================================
// OUTREACH REPOSITORY
// ===============================================================

export const outreachRepository = {
  // -------------------------------------------------------------------
  // COMPANIES
  // -------------------------------------------------------------------

  async listCompanies(
    tenantId: string,
    opts: {
      search?: string
      city?: string
      doNotContact?: boolean
      limit: number
      cursor?: string
    },
  ): Promise<{ rows: CompanyRecord[]; hasMore: boolean }> {
    const conditions = [eq(companies.tenantId, tenantId)]

    if (opts.search) {
      const pat = `%${opts.search}%`
      conditions.push(
        or(ilike(companies.name, pat), ilike(companies.domain, pat))!,
      )
    }
    if (opts.city) conditions.push(eq(companies.city, opts.city))
    if (opts.doNotContact !== undefined)
      conditions.push(eq(companies.doNotContact, opts.doNotContact))
    if (opts.cursor)
      conditions.push(sql`${companies.createdAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select()
      .from(companies)
      .where(and(...conditions))
      .orderBy(desc(companies.createdAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    return {
      rows: hasMore ? rows.slice(0, opts.limit) : rows,
      hasMore,
    }
  },

  async findCompanyById(
    tenantId: string,
    companyId: string,
  ): Promise<CompanyRecord | null> {
    const [row] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)))
      .limit(1)
    return row ?? null
  },

  async findCompanyByDomain(
    tenantId: string,
    domain: string,
  ): Promise<CompanyRecord | null> {
    const [row] = await db
      .select()
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.domain, domain)))
      .limit(1)
    return row ?? null
  },

  async createCompany(
    tenantId: string,
    input: CreateCompanyInput,
  ): Promise<CompanyRecord> {
    const [row] = await db
      .insert(companies)
      .values({
        tenantId,
        name: input.name,
        domain: input.domain ?? null,
        industry: input.industry ?? null,
        employeeBand: input.employeeBand ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        ownerLed: input.ownerLed ?? false,
        source: input.source ?? "cold",
        notes: input.notes ?? null,
        enrichment: input.enrichment ?? {},
      })
      .returning()
    log.info({ tenantId, companyId: row!.id }, "Company created")
    return row!
  },

  async updateCompany(
    tenantId: string,
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) updateData[k] = v
    }

    const [updated] = await db
      .update(companies)
      .set(updateData as Partial<typeof companies.$inferInsert>)
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)))
      .returning()

    if (!updated) throw new NotFoundError("Company", companyId)
    return updated
  },

  async bulkInsertCompanies(
    tenantId: string,
    rows: CreateCompanyInput[],
  ): Promise<CompanyRecord[]> {
    if (rows.length === 0) return []
    const inserted = await db
      .insert(companies)
      .values(
        rows.map((r) => ({
          tenantId,
          name: r.name,
          domain: r.domain ?? null,
          industry: r.industry ?? null,
          employeeBand: r.employeeBand ?? null,
          city: r.city ?? null,
          country: r.country ?? null,
          ownerLed: r.ownerLed ?? false,
          source: r.source ?? "cold",
          notes: r.notes ?? null,
          enrichment: r.enrichment ?? {},
        })),
      )
      .returning()
    log.info({ tenantId, count: inserted.length }, "Companies bulk-inserted")
    return inserted
  },

  // -------------------------------------------------------------------
  // CONTACTS
  // -------------------------------------------------------------------

  async listContacts(
    tenantId: string,
    opts: {
      companyId?: string
      search?: string
      doNotContact?: boolean
      bounced?: boolean
      limit: number
      cursor?: string
    },
  ): Promise<{ rows: ContactRecord[]; hasMore: boolean }> {
    const conditions = [eq(contacts.tenantId, tenantId)]
    if (opts.companyId) conditions.push(eq(contacts.companyId, opts.companyId))
    if (opts.doNotContact !== undefined)
      conditions.push(eq(contacts.doNotContact, opts.doNotContact))
    if (opts.bounced !== undefined)
      conditions.push(eq(contacts.bounced, opts.bounced))
    if (opts.search) {
      const pat = `%${opts.search}%`
      conditions.push(
        or(ilike(contacts.fullName, pat), ilike(contacts.email, pat))!,
      )
    }
    if (opts.cursor)
      conditions.push(sql`${contacts.createdAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.createdAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    return { rows: hasMore ? rows.slice(0, opts.limit) : rows, hasMore }
  },

  async findContactById(
    tenantId: string,
    contactId: string,
  ): Promise<ContactRecord | null> {
    const [row] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .limit(1)
    return row ?? null
  },

  async findContactByEmail(
    tenantId: string,
    email: string,
  ): Promise<ContactRecord | null> {
    const [row] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, email)))
      .limit(1)
    return row ?? null
  },

  async createContact(
    tenantId: string,
    input: CreateContactInput,
  ): Promise<ContactRecord> {
    const [row] = await db
      .insert(contacts)
      .values({
        tenantId,
        companyId: input.companyId,
        fullName: input.fullName,
        role: input.role ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        isOwner: input.isOwner ?? false,
        isDecisionMaker: input.isDecisionMaker ?? false,
      })
      .returning()
    log.info({ tenantId, contactId: row!.id }, "Contact created")
    return row!
  },

  async updateContact(
    tenantId: string,
    contactId: string,
    input: UpdateContactInput,
  ): Promise<ContactRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) updateData[k] = v
    }
    const [updated] = await db
      .update(contacts)
      .set(updateData as Partial<typeof contacts.$inferInsert>)
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .returning()
    if (!updated) throw new NotFoundError("Contact", contactId)
    return updated
  },

  async markContactBounced(
    tenantId: string,
    contactId: string,
  ): Promise<ContactRecord> {
    const [updated] = await db
      .update(contacts)
      .set({ bounced: true, updatedAt: new Date() })
      .where(and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)))
      .returning()
    if (!updated) throw new NotFoundError("Contact", contactId)
    return updated
  },

  async bulkInsertContacts(
    tenantId: string,
    rows: CreateContactInput[],
  ): Promise<ContactRecord[]> {
    if (rows.length === 0) return []
    const inserted = await db
      .insert(contacts)
      .values(
        rows.map((r) => ({
          tenantId,
          companyId: r.companyId,
          fullName: r.fullName,
          role: r.role ?? null,
          email: r.email ?? null,
          phone: r.phone ?? null,
          linkedinUrl: r.linkedinUrl ?? null,
          isOwner: r.isOwner ?? false,
          isDecisionMaker: r.isDecisionMaker ?? false,
        })),
      )
      .returning()
    log.info({ tenantId, count: inserted.length }, "Contacts bulk-inserted")
    return inserted
  },

  async findContactsByEmails(
    tenantId: string,
    emails: string[],
  ): Promise<ContactRecord[]> {
    if (emails.length === 0) return []
    return db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.tenantId, tenantId),
          inArray(contacts.email, emails),
        ),
      )
  },

  // -------------------------------------------------------------------
  // CAMPAIGNS
  // -------------------------------------------------------------------

  async listCampaigns(
    tenantId: string,
    opts: {
      status?: CampaignRecord["status"]
      channel?: CampaignRecord["channel"]
      limit: number
      cursor?: string
    },
  ): Promise<{ rows: CampaignRecord[]; hasMore: boolean }> {
    const conditions = [eq(campaigns.tenantId, tenantId)]
    if (opts.status) conditions.push(eq(campaigns.status, opts.status))
    if (opts.channel) conditions.push(eq(campaigns.channel, opts.channel))
    if (opts.cursor)
      conditions.push(sql`${campaigns.createdAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select()
      .from(campaigns)
      .where(and(...conditions))
      .orderBy(desc(campaigns.createdAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    return { rows: hasMore ? rows.slice(0, opts.limit) : rows, hasMore }
  },

  async findCampaignById(
    tenantId: string,
    campaignId: string,
  ): Promise<CampaignRecord | null> {
    const [row] = await db
      .select()
      .from(campaigns)
      .where(
        and(eq(campaigns.id, campaignId), eq(campaigns.tenantId, tenantId)),
      )
      .limit(1)
    return row ?? null
  },

  async createCampaign(
    tenantId: string,
    input: CreateCampaignInput,
  ): Promise<CampaignRecord> {
    const [row] = await db
      .insert(campaigns)
      .values({
        tenantId,
        name: input.name,
        channel: input.channel,
        city: input.city ?? null,
        industryFocus: input.industryFocus ?? null,
        status: input.status ?? "draft",
        startedAt: input.startedAt ?? null,
        endedAt: input.endedAt ?? null,
      })
      .returning()
    log.info({ tenantId, campaignId: row!.id }, "Campaign created")
    return row!
  },

  // -------------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------------

  async listTemplates(
    tenantId: string,
    opts: {
      channel?: TemplateRecord["channel"]
      active?: boolean
      limit: number
      cursor?: string
    },
  ): Promise<{ rows: TemplateRecord[]; hasMore: boolean }> {
    const conditions = [eq(templates.tenantId, tenantId)]
    if (opts.channel) conditions.push(eq(templates.channel, opts.channel))
    if (opts.active !== undefined)
      conditions.push(eq(templates.active, opts.active))
    if (opts.cursor)
      conditions.push(sql`${templates.createdAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select()
      .from(templates)
      .where(and(...conditions))
      .orderBy(desc(templates.createdAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    return { rows: hasMore ? rows.slice(0, opts.limit) : rows, hasMore }
  },

  async findTemplateById(
    tenantId: string,
    templateId: string,
  ): Promise<TemplateRecord | null> {
    const [row] = await db
      .select()
      .from(templates)
      .where(
        and(eq(templates.id, templateId), eq(templates.tenantId, tenantId)),
      )
      .limit(1)
    return row ?? null
  },

  async createTemplate(
    tenantId: string,
    input: CreateTemplateInput,
  ): Promise<TemplateRecord> {
    const [row] = await db
      .insert(templates)
      .values({
        tenantId,
        name: input.name,
        channel: input.channel,
        subject: input.subject ?? null,
        body: input.body,
        variables: input.variables ?? {},
        parentId: input.parentId ?? null,
        active: input.active ?? true,
      })
      .returning()
    log.info({ tenantId, templateId: row!.id }, "Template created")
    return row!
  },

  // -------------------------------------------------------------------
  // TOUCHES
  // -------------------------------------------------------------------

  async listTouches(
    tenantId: string,
    opts: {
      contactId?: string
      campaignId?: string
      deliveryStatus?: OutreachDeliveryStatus
      awaitingReplyOnly?: boolean
      limit: number
      cursor?: string
    },
  ): Promise<{ rows: TouchRecord[]; hasMore: boolean }> {
    const conditions = [eq(touches.tenantId, tenantId)]
    if (opts.contactId) conditions.push(eq(touches.contactId, opts.contactId))
    if (opts.campaignId)
      conditions.push(eq(touches.campaignId, opts.campaignId))
    if (opts.deliveryStatus)
      conditions.push(eq(touches.deliveryStatus, opts.deliveryStatus))
    if (opts.awaitingReplyOnly)
      conditions.push(eq(touches.replyStatus, "none"))
    if (opts.cursor)
      conditions.push(sql`${touches.createdAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select()
      .from(touches)
      .where(and(...conditions))
      .orderBy(desc(touches.createdAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    return { rows: hasMore ? rows.slice(0, opts.limit) : rows, hasMore }
  },

  async findTouchById(
    tenantId: string,
    touchId: string,
  ): Promise<TouchRecord | null> {
    const [row] = await db
      .select()
      .from(touches)
      .where(and(eq(touches.id, touchId), eq(touches.tenantId, tenantId)))
      .limit(1)
    return row ?? null
  },

  async listOpenTouches(
    tenantId: string,
    contactId: string,
  ): Promise<TouchRecord[]> {
    return db
      .select()
      .from(touches)
      .where(
        and(
          eq(touches.tenantId, tenantId),
          eq(touches.contactId, contactId),
          eq(touches.replyStatus, "none"),
        ),
      )
      .orderBy(desc(touches.sentAt))
  },

  async findTouchByExternalMessageId(
    externalMessageId: string,
  ): Promise<TouchRecord | null> {
    const [row] = await db
      .select()
      .from(touches)
      .where(eq(touches.externalMessageId, externalMessageId))
      .limit(1)
    return row ?? null
  },

  async insertTouch(
    tenantId: string,
    input: {
      contactId: string
      campaignId?: string | null
      templateId?: string | null
      channel: TouchRecord["channel"]
      subjectRendered?: string | null
      bodyRendered?: string | null
      externalMessageId?: string | null
      deliveryStatus?: OutreachDeliveryStatus
    },
  ): Promise<TouchRecord> {
    const [row] = await db
      .insert(touches)
      .values({
        tenantId,
        contactId: input.contactId,
        campaignId: input.campaignId ?? null,
        templateId: input.templateId ?? null,
        channel: input.channel,
        subjectRendered: input.subjectRendered ?? null,
        bodyRendered: input.bodyRendered ?? null,
        externalMessageId: input.externalMessageId ?? null,
        deliveryStatus: input.deliveryStatus ?? "queued",
      })
      .returning()
    return row!
  },

  async updateTouch(
    tenantId: string,
    touchId: string,
    patch: Partial<typeof touches.$inferInsert>,
  ): Promise<TouchRecord> {
    const [updated] = await db
      .update(touches)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(touches.id, touchId), eq(touches.tenantId, tenantId)))
      .returning()
    if (!updated) throw new NotFoundError("Touch", touchId)
    return updated
  },

  // -------------------------------------------------------------------
  // REPLIES
  // -------------------------------------------------------------------

  async listReplies(
    tenantId: string,
    opts: {
      needsReview?: boolean
      handled?: boolean
      contactId?: string
      limit: number
      cursor?: string
    },
  ): Promise<{ rows: ReplyRecord[]; hasMore: boolean }> {
    const conditions = [eq(replies.tenantId, tenantId)]
    if (opts.needsReview !== undefined)
      conditions.push(eq(replies.needsReview, opts.needsReview))
    if (opts.handled !== undefined)
      conditions.push(eq(replies.handled, opts.handled))
    if (opts.contactId) conditions.push(eq(replies.contactId, opts.contactId))
    if (opts.cursor)
      conditions.push(sql`${replies.createdAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select()
      .from(replies)
      .where(and(...conditions))
      .orderBy(desc(replies.receivedAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    return { rows: hasMore ? rows.slice(0, opts.limit) : rows, hasMore }
  },

  /**
   * Enriched listing of replies with embedded contact, company, and originating
   * touch context — for the triage inbox UI.
   */
  async listRepliesEnriched(
    tenantId: string,
    opts: {
      needsReview?: boolean
      handled?: boolean
      contactId?: string
      sinceDays?: number
      limit: number
      cursor?: string
    },
  ): Promise<{ rows: EnrichedReplyRecord[]; hasMore: boolean }> {
    const conditions = [eq(replies.tenantId, tenantId)]
    if (opts.needsReview !== undefined)
      conditions.push(eq(replies.needsReview, opts.needsReview))
    if (opts.handled !== undefined)
      conditions.push(eq(replies.handled, opts.handled))
    if (opts.contactId) conditions.push(eq(replies.contactId, opts.contactId))
    if (opts.sinceDays && opts.sinceDays > 0) {
      const cutoff = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000)
      conditions.push(sql`${replies.receivedAt} >= ${cutoff}`)
    }
    if (opts.cursor)
      conditions.push(sql`${replies.receivedAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select({
        reply: replies,
        contact: contacts,
        company: companies,
        touch: touches,
      })
      .from(replies)
      .innerJoin(contacts, eq(contacts.id, replies.contactId))
      .innerJoin(companies, eq(companies.id, contacts.companyId))
      .leftJoin(touches, eq(touches.id, replies.touchId))
      .where(and(...conditions))
      .orderBy(desc(replies.receivedAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    const sliced = hasMore ? rows.slice(0, opts.limit) : rows

    const enriched: EnrichedReplyRecord[] = sliced.map((r) => ({
      ...r.reply,
      contact: {
        id: r.contact.id,
        fullName: r.contact.fullName,
        role: r.contact.role,
        email: r.contact.email,
      },
      company: {
        id: r.company.id,
        name: r.company.name,
        domain: r.company.domain,
      },
      touch: r.touch
        ? {
            id: r.touch.id,
            sentAt: r.touch.sentAt,
            subjectRendered: r.touch.subjectRendered,
            channel: r.touch.channel,
          }
        : null,
    }))

    return { rows: enriched, hasMore }
  },

  async findReplyById(
    tenantId: string,
    replyId: string,
  ): Promise<ReplyRecord | null> {
    const [row] = await db
      .select()
      .from(replies)
      .where(and(eq(replies.id, replyId), eq(replies.tenantId, tenantId)))
      .limit(1)
    return row ?? null
  },

  async listRepliesNeedingReview(
    tenantId: string,
    limit = 50,
  ): Promise<ReplyRecord[]> {
    return db
      .select()
      .from(replies)
      .where(
        and(eq(replies.tenantId, tenantId), eq(replies.needsReview, true)),
      )
      .orderBy(asc(replies.receivedAt))
      .limit(limit)
  },

  async insertReply(
    tenantId: string,
    input: {
      contactId: string
      touchId?: string | null
      receivedAt?: Date
      subject?: string | null
      body?: string | null
      classifiedAs?: string | null
      classifiedBy?: ReplyRecord["classifiedBy"]
      classificationConfidence?: number | null
      rawEventId?: string | null
      needsReview?: boolean
    },
  ): Promise<ReplyRecord> {
    const [row] = await db
      .insert(replies)
      .values({
        tenantId,
        contactId: input.contactId,
        touchId: input.touchId ?? null,
        receivedAt: input.receivedAt ?? new Date(),
        subject: input.subject ?? null,
        body: input.body ?? null,
        classifiedAs: input.classifiedAs ?? null,
        classifiedBy: input.classifiedBy ?? null,
        classificationConfidence:
          input.classificationConfidence != null
            ? String(input.classificationConfidence)
            : null,
        rawEventId: input.rawEventId ?? null,
        needsReview: input.needsReview ?? true,
      })
      .returning()
    return row!
  },

  async updateReply(
    tenantId: string,
    replyId: string,
    patch: Partial<typeof replies.$inferInsert>,
  ): Promise<ReplyRecord> {
    const [updated] = await db
      .update(replies)
      .set(patch)
      .where(and(eq(replies.id, replyId), eq(replies.tenantId, tenantId)))
      .returning()
    if (!updated) throw new NotFoundError("Reply", replyId)
    return updated
  },

  async markReplyHandled(
    tenantId: string,
    replyId: string,
  ): Promise<ReplyRecord> {
    const [updated] = await db
      .update(replies)
      .set({ handled: true, handledAt: new Date(), needsReview: false })
      .where(and(eq(replies.id, replyId), eq(replies.tenantId, tenantId)))
      .returning()
    if (!updated) throw new NotFoundError("Reply", replyId)
    return updated
  },

  // -------------------------------------------------------------------
  // DNC
  // -------------------------------------------------------------------

  async listDnc(
    tenantId: string,
    opts: { search?: string; limit: number; cursor?: string },
  ): Promise<{ rows: DncListRecord[]; hasMore: boolean }> {
    const conditions = [eq(dncList.tenantId, tenantId)]
    if (opts.search) {
      const pat = `%${opts.search}%`
      conditions.push(or(ilike(dncList.email, pat), ilike(dncList.domain, pat))!)
    }
    if (opts.cursor)
      conditions.push(sql`${dncList.addedAt} <= ${new Date(opts.cursor)}`)

    const rows = await db
      .select()
      .from(dncList)
      .where(and(...conditions))
      .orderBy(desc(dncList.addedAt))
      .limit(opts.limit + 1)

    const hasMore = rows.length > opts.limit
    return { rows: hasMore ? rows.slice(0, opts.limit) : rows, hasMore }
  },

  async insertDnc(
    tenantId: string,
    input: {
      email?: string | null
      domain?: string | null
      reason?: string | null
      addedBy?: string | null
    },
  ): Promise<DncListRecord> {
    const [row] = await db
      .insert(dncList)
      .values({
        tenantId,
        email: input.email ?? null,
        domain: input.domain ?? null,
        reason: input.reason ?? null,
        addedBy: input.addedBy ?? null,
      })
      .returning()
    return row!
  },

  async flipMatchingContactsDnc(
    tenantId: string,
    opts: { email?: string | null; domain?: string | null },
  ): Promise<number> {
    if (!opts.email && !opts.domain) return 0

    if (opts.email) {
      const r = await db
        .update(contacts)
        .set({ doNotContact: true, updatedAt: new Date() })
        .where(
          and(
            eq(contacts.tenantId, tenantId),
            eq(contacts.email, opts.email),
          ),
        )
        .returning({ id: contacts.id })
      return r.length
    }

    // Domain: match contacts whose email ends with @domain
    const pat = `%@${opts.domain}`
    const r = await db
      .update(contacts)
      .set({ doNotContact: true, updatedAt: new Date() })
      .where(
        and(eq(contacts.tenantId, tenantId), ilike(contacts.email, pat)),
      )
      .returning({ id: contacts.id })
    return r.length
  },

  async flipMatchingCompaniesDnc(
    tenantId: string,
    domain: string,
    reason?: string | null,
  ): Promise<number> {
    const r = await db
      .update(companies)
      .set({
        doNotContact: true,
        dncReason: reason ?? null,
        dncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(companies.tenantId, tenantId), eq(companies.domain, domain)),
      )
      .returning({ id: companies.id })
    return r.length
  },

  /**
   * True if the email is on the DNC list (by email or domain), OR if the
   * matching contact is do_not_contact, OR if the contact's company is
   * do_not_contact.
   */
  async isDoNotContact(tenantId: string, email: string): Promise<boolean> {
    const lower = email.toLowerCase()
    const domain = domainFromEmail(lower)

    // 1. dnc_list by email or domain
    const dncConds = [eq(dncList.tenantId, tenantId)]
    const dncMatch = domain
      ? or(eq(dncList.email, lower), eq(dncList.domain, domain))!
      : eq(dncList.email, lower)
    const [dnc] = await db
      .select({ id: dncList.id })
      .from(dncList)
      .where(and(...dncConds, dncMatch))
      .limit(1)
    if (dnc) return true

    // 2. contact flag
    const [c] = await db
      .select({ doNotContact: contacts.doNotContact, companyId: contacts.companyId })
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, lower)))
      .limit(1)
    if (c?.doNotContact) return true

    // 3. company flag (either via the contact's company OR by matching domain)
    if (c?.companyId) {
      const [co] = await db
        .select({ doNotContact: companies.doNotContact })
        .from(companies)
        .where(
          and(eq(companies.tenantId, tenantId), eq(companies.id, c.companyId)),
        )
        .limit(1)
      if (co?.doNotContact) return true
    } else if (domain) {
      const [co] = await db
        .select({ doNotContact: companies.doNotContact })
        .from(companies)
        .where(
          and(eq(companies.tenantId, tenantId), eq(companies.domain, domain)),
        )
        .limit(1)
      if (co?.doNotContact) return true
    }

    return false
  },
}
