import { db } from "@/shared/db"
import { logger } from "@/shared/logger"
import { NotFoundError, ForbiddenError, BadRequestError } from "@/shared/errors"
import { events } from "@/shared/db/schemas/event-framework.schema"
import type { Context } from "@/shared/trpc"
import { outreachRepository } from "./outreach.repository"
import type {
  CompanyRecord,
  ContactRecord,
  CampaignRecord,
  TemplateRecord,
  TouchRecord,
  ReplyRecord,
  DncListRecord,
  CreateCompanyInput,
  UpdateCompanyInput,
  CreateContactInput,
  UpdateContactInput,
  CreateCampaignInput,
  CreateTemplateInput,
  SendTouchInput,
  RecordReplyInput,
  AddDncInput,
  BulkImportLeadRow,
  BulkImportResult,
  OutreachClassifier,
} from "./outreach.types"
import type { OutreachEventKind } from "./outreach.events"

const log = logger.child({ module: "outreach.service" })

// ---------------------------------------------------------------------------
// Event emission helper — insert into the `events` outbox table.
// ---------------------------------------------------------------------------

async function emitEvent(params: {
  tenantId: string
  kind: OutreachEventKind
  entityType: string
  entityId: string
  payload: Record<string, unknown>
  actor?: string | null
}): Promise<void> {
  await db.insert(events).values({
    tenantId: params.tenantId,
    kind: params.kind,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
    actor: params.actor ?? null,
  })
}

function actorFromCtx(ctx: Context): string | null {
  return ctx.user?.id ?? null
}

function ensureTenant(ctx: Context): string {
  if (!ctx.tenantId) throw new ForbiddenError("Tenant scope required")
  return ctx.tenantId
}

// ===============================================================
// OUTREACH SERVICE
// ===============================================================

export const outreachService = {
  // -------------------------------------------------------------------
  // COMPANIES
  // -------------------------------------------------------------------

  async listCompanies(
    ctx: Context,
    opts: {
      search?: string
      city?: string
      doNotContact?: boolean
      limit: number
      cursor?: string
    },
  ) {
    return outreachRepository.listCompanies(ensureTenant(ctx), opts)
  },

  async getCompany(ctx: Context, companyId: string): Promise<CompanyRecord> {
    const c = await outreachRepository.findCompanyById(ensureTenant(ctx), companyId)
    if (!c) throw new NotFoundError("Company", companyId)
    return c
  },

  async createCompany(
    ctx: Context,
    input: CreateCompanyInput,
  ): Promise<CompanyRecord> {
    const tenantId = ensureTenant(ctx)
    const c = await outreachRepository.createCompany(tenantId, input)
    await emitEvent({
      tenantId,
      kind: "company.created",
      entityType: "company",
      entityId: c.id,
      payload: { name: c.name, domain: c.domain },
      actor: actorFromCtx(ctx),
    })
    return c
  },

  async updateCompany(
    ctx: Context,
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyRecord> {
    return outreachRepository.updateCompany(ensureTenant(ctx), companyId, input)
  },

  // -------------------------------------------------------------------
  // CONTACTS
  // -------------------------------------------------------------------

  async listContacts(
    ctx: Context,
    opts: {
      companyId?: string
      search?: string
      doNotContact?: boolean
      bounced?: boolean
      limit: number
      cursor?: string
    },
  ) {
    return outreachRepository.listContacts(ensureTenant(ctx), opts)
  },

  async createContact(
    ctx: Context,
    input: CreateContactInput,
  ): Promise<ContactRecord> {
    const tenantId = ensureTenant(ctx)
    const c = await outreachRepository.createContact(tenantId, input)
    await emitEvent({
      tenantId,
      kind: "contact.created",
      entityType: "contact",
      entityId: c.id,
      payload: { companyId: c.companyId, email: c.email },
      actor: actorFromCtx(ctx),
    })
    return c
  },

  async updateContact(
    ctx: Context,
    contactId: string,
    input: UpdateContactInput,
  ): Promise<ContactRecord> {
    return outreachRepository.updateContact(ensureTenant(ctx), contactId, input)
  },

  async markContactBounced(
    ctx: Context,
    contactId: string,
  ): Promise<ContactRecord> {
    return outreachRepository.markContactBounced(ensureTenant(ctx), contactId)
  },

  // -------------------------------------------------------------------
  // CAMPAIGNS
  // -------------------------------------------------------------------

  async listCampaigns(
    ctx: Context,
    opts: {
      status?: CampaignRecord["status"]
      channel?: CampaignRecord["channel"]
      limit: number
      cursor?: string
    },
  ) {
    return outreachRepository.listCampaigns(ensureTenant(ctx), opts)
  },

  async createCampaign(
    ctx: Context,
    input: CreateCampaignInput,
  ): Promise<CampaignRecord> {
    return outreachRepository.createCampaign(ensureTenant(ctx), input)
  },

  // -------------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------------

  async listTemplates(
    ctx: Context,
    opts: {
      channel?: TemplateRecord["channel"]
      active?: boolean
      limit: number
      cursor?: string
    },
  ) {
    return outreachRepository.listTemplates(ensureTenant(ctx), opts)
  },

  async createTemplate(
    ctx: Context,
    input: CreateTemplateInput,
  ): Promise<TemplateRecord> {
    return outreachRepository.createTemplate(ensureTenant(ctx), input)
  },

  // -------------------------------------------------------------------
  // TOUCHES
  // -------------------------------------------------------------------

  async listTouches(
    ctx: Context,
    opts: {
      contactId?: string
      campaignId?: string
      deliveryStatus?: TouchRecord["deliveryStatus"]
      awaitingReplyOnly?: boolean
      limit: number
      cursor?: string
    },
  ) {
    return outreachRepository.listTouches(ensureTenant(ctx), opts)
  },

  /**
   * Insert a touch into the outbox. Checks DNC first; throws BadRequestError
   * if the contact is on the DNC list. Emits `touch.queued`.
   */
  async sendTouch(ctx: Context, input: SendTouchInput): Promise<TouchRecord> {
    const tenantId = ensureTenant(ctx)

    // Load contact for DNC + tenant verification
    const contact = await outreachRepository.findContactById(
      tenantId,
      input.contactId,
    )
    if (!contact) throw new NotFoundError("Contact", input.contactId)

    if (contact.email) {
      const dnc = await outreachRepository.isDoNotContact(tenantId, contact.email)
      if (dnc) {
        throw new BadRequestError(
          `Contact ${input.contactId} is on the do-not-contact list`,
        )
      }
    }
    if (contact.doNotContact) {
      throw new BadRequestError(
        `Contact ${input.contactId} has do_not_contact flag set`,
      )
    }

    const touch = await outreachRepository.insertTouch(tenantId, {
      contactId: input.contactId,
      campaignId: input.campaignId ?? null,
      templateId: input.templateId ?? null,
      channel: input.channel,
      subjectRendered: input.renderedSubject ?? null,
      bodyRendered: input.renderedBody ?? null,
      externalMessageId: input.externalMessageId ?? null,
      deliveryStatus: "queued",
    })

    await emitEvent({
      tenantId,
      kind: "touch.queued",
      entityType: "touch",
      entityId: touch.id,
      payload: {
        contactId: touch.contactId,
        campaignId: touch.campaignId,
        templateId: touch.templateId,
        channel: touch.channel,
      },
      actor: actorFromCtx(ctx),
    })

    log.info({ tenantId, touchId: touch.id }, "Touch queued")
    return touch
  },

  async markTouchSent(
    ctx: Context,
    touchId: string,
    sentAt: Date,
    externalMessageId?: string | null,
  ): Promise<TouchRecord> {
    const tenantId = ensureTenant(ctx)
    const patch: Partial<typeof import("@/shared/db/schemas/outreach.schema").touches.$inferInsert> =
      {
        deliveryStatus: "sent",
        sentAt,
      }
    if (externalMessageId !== undefined) patch.externalMessageId = externalMessageId
    const touch = await outreachRepository.updateTouch(tenantId, touchId, patch)
    await emitEvent({
      tenantId,
      kind: "touch.sent",
      entityType: "touch",
      entityId: touch.id,
      payload: { sentAt: sentAt.toISOString(), externalMessageId: touch.externalMessageId },
      actor: actorFromCtx(ctx),
    })
    return touch
  },

  async markTouchDelivered(
    ctx: Context,
    touchId: string,
  ): Promise<TouchRecord> {
    const tenantId = ensureTenant(ctx)
    const touch = await outreachRepository.updateTouch(tenantId, touchId, {
      deliveryStatus: "delivered",
    })
    await emitEvent({
      tenantId,
      kind: "touch.delivered",
      entityType: "touch",
      entityId: touch.id,
      payload: {},
      actor: actorFromCtx(ctx),
    })
    return touch
  },

  async markTouchBounced(
    ctx: Context,
    touchId: string,
  ): Promise<TouchRecord> {
    const tenantId = ensureTenant(ctx)
    const touch = await outreachRepository.updateTouch(tenantId, touchId, {
      deliveryStatus: "bounced",
    })
    // Also flip the parent contact's bounced flag
    if (touch.contactId) {
      await outreachRepository.markContactBounced(tenantId, touch.contactId)
    }
    await emitEvent({
      tenantId,
      kind: "touch.bounced",
      entityType: "touch",
      entityId: touch.id,
      payload: { contactId: touch.contactId },
      actor: actorFromCtx(ctx),
    })
    return touch
  },

  // -------------------------------------------------------------------
  // REPLIES
  // -------------------------------------------------------------------

  async listReplies(
    ctx: Context,
    opts: {
      needsReview?: boolean
      handled?: boolean
      contactId?: string
      limit: number
      cursor?: string
    },
  ) {
    return outreachRepository.listReplies(ensureTenant(ctx), opts)
  },

  async listRepliesEnriched(
    ctx: Context,
    opts: {
      needsReview?: boolean
      handled?: boolean
      contactId?: string
      sinceDays?: number
      limit: number
      cursor?: string
    },
  ) {
    return outreachRepository.listRepliesEnriched(ensureTenant(ctx), opts)
  },

  /**
   * Record an inbound reply. If touchId provided, updates the parent touch's
   * replyStatus + replyAt. Emits `reply.received`.
   */
  async recordReply(
    ctx: Context,
    input: RecordReplyInput,
  ): Promise<ReplyRecord> {
    const tenantId = ensureTenant(ctx)

    const reply = await outreachRepository.insertReply(tenantId, {
      contactId: input.contactId,
      touchId: input.touchId ?? null,
      receivedAt: input.receivedAt,
      subject: input.subject ?? null,
      body: input.body ?? null,
      classifiedAs: input.classifiedAs ?? null,
      classifiedBy: input.classifiedBy ?? null,
      classificationConfidence: input.classificationConfidence ?? null,
      rawEventId: input.rawEventId ?? null,
    })

    if (input.touchId) {
      const replyStatus = mapClassifiedToReplyStatus(input.classifiedAs)
      await outreachRepository.updateTouch(tenantId, input.touchId, {
        replyStatus,
        replyAt: reply.receivedAt,
        replySummary: input.subject ?? null,
      })
    }

    await emitEvent({
      tenantId,
      kind: "reply.received",
      entityType: "reply",
      entityId: reply.id,
      payload: {
        contactId: reply.contactId,
        touchId: reply.touchId,
        classifiedAs: reply.classifiedAs,
      },
      actor: actorFromCtx(ctx),
    })

    log.info({ tenantId, replyId: reply.id }, "Reply recorded")
    return reply
  },

  /**
   * Re-classify an existing reply (manual or AI). If confidence > 0.8 marks
   * needsReview=false. Emits `reply.classified`.
   */
  async classifyReply(
    ctx: Context,
    replyId: string,
    classifiedAs: string,
    classifiedBy: OutreachClassifier,
    confidence?: number,
  ): Promise<ReplyRecord> {
    const tenantId = ensureTenant(ctx)

    const needsReview = (confidence ?? 0) <= 0.8
    const patch: Partial<typeof import("@/shared/db/schemas/outreach.schema").replies.$inferInsert> =
      {
        classifiedAs,
        classifiedBy,
        classificationConfidence: confidence != null ? String(confidence) : null,
        needsReview,
      }
    const reply = await outreachRepository.updateReply(tenantId, replyId, patch)

    // Also propagate the new replyStatus to the parent touch (if any).
    if (reply.touchId) {
      await outreachRepository.updateTouch(tenantId, reply.touchId, {
        replyStatus: mapClassifiedToReplyStatus(classifiedAs),
      })
    }

    await emitEvent({
      tenantId,
      kind: "reply.classified",
      entityType: "reply",
      entityId: reply.id,
      payload: { classifiedAs, classifiedBy, confidence: confidence ?? null },
      actor: actorFromCtx(ctx),
    })
    return reply
  },

  // -------------------------------------------------------------------
  // DNC
  // -------------------------------------------------------------------

  async listDnc(
    ctx: Context,
    opts: { search?: string; limit: number; cursor?: string },
  ) {
    return outreachRepository.listDnc(ensureTenant(ctx), opts)
  },

  async checkDnc(ctx: Context, email: string): Promise<{ doNotContact: boolean }> {
    const dnc = await outreachRepository.isDoNotContact(
      ensureTenant(ctx),
      email,
    )
    return { doNotContact: dnc }
  },

  /**
   * Add to DNC list AND flip any matching contacts.do_not_contact / companies.do_not_contact.
   * Emits `dnc.added`.
   */
  async addToDnc(
    ctx: Context,
    input: AddDncInput & { addedBy?: string | null },
  ): Promise<DncListRecord> {
    const tenantId = ensureTenant(ctx)
    if (!input.email && !input.domain) {
      throw new BadRequestError("Either email or domain is required")
    }

    const email = input.email?.toLowerCase() ?? null
    const domain = input.domain?.toLowerCase() ?? null

    const row = await outreachRepository.insertDnc(tenantId, {
      email,
      domain,
      reason: input.reason ?? null,
      addedBy: input.addedBy ?? actorFromCtx(ctx),
    })

    // Flip contacts (by email if provided, otherwise by domain)
    await outreachRepository.flipMatchingContactsDnc(tenantId, {
      email,
      domain,
    })

    if (domain) {
      await outreachRepository.flipMatchingCompaniesDnc(
        tenantId,
        domain,
        input.reason ?? null,
      )
    }

    await emitEvent({
      tenantId,
      kind: "dnc.added",
      entityType: "dnc",
      entityId: row.id,
      payload: { email, domain, reason: input.reason ?? null },
      actor: actorFromCtx(ctx),
    })

    log.info({ tenantId, dncId: row.id, email, domain }, "DNC entry added")
    return row
  },

  // -------------------------------------------------------------------
  // BULK IMPORT
  // -------------------------------------------------------------------

  /**
   * Bulk import leads: dedup by company.domain + contact.email. Returns counts.
   * Emits `leads.imported` once at the end.
   */
  async bulkImportLeads(
    ctx: Context,
    rows: BulkImportLeadRow[],
  ): Promise<BulkImportResult> {
    const tenantId = ensureTenant(ctx)

    let companiesCreated = 0
    let contactsCreated = 0
    let skipped = 0

    // Build unique-domain → CompanyRecord cache (existing + new)
    const domainCache = new Map<string, CompanyRecord>()
    // Companies without a domain are always inserted (no dedup possible).

    // ----- 1. Dedup + create companies -----
    const seenDomains = new Set<string>()
    const companiesToInsert: CreateCompanyInput[] = []
    const noDomainRowIndices: number[] = [] // indices in `rows` needing a fresh company

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!
      const domain = r.domain?.toLowerCase() ?? null
      if (!domain) {
        noDomainRowIndices.push(i)
        continue
      }
      if (seenDomains.has(domain)) continue
      seenDomains.add(domain)

      const existing = await outreachRepository.findCompanyByDomain(
        tenantId,
        domain,
      )
      if (existing) {
        domainCache.set(domain, existing)
      } else {
        companiesToInsert.push({
          name: r.companyName,
          domain,
          industry: r.industry ?? null,
          city: r.city ?? null,
          country: r.country ?? null,
          employeeBand: r.employeeBand ?? null,
          ownerLed: r.ownerLed ?? false,
          source: "cold",
        })
      }
    }

    if (companiesToInsert.length > 0) {
      const inserted = await outreachRepository.bulkInsertCompanies(
        tenantId,
        companiesToInsert,
      )
      companiesCreated = inserted.length
      for (const c of inserted) {
        if (c.domain) domainCache.set(c.domain.toLowerCase(), c)
      }
    }

    // ----- 2. Per-row: ensure company exists (handles no-domain case), then dedup contacts by email -----
    const contactsToInsert: CreateContactInput[] = []

    // Pre-fetch existing contacts for all candidate emails in one query
    const candidateEmails = Array.from(
      new Set(
        rows
          .map((r) => r.email?.toLowerCase())
          .filter((e): e is string => Boolean(e)),
      ),
    )
    const existingContacts = await outreachRepository.findContactsByEmails(
      tenantId,
      candidateEmails,
    )
    const existingEmailSet = new Set(
      existingContacts.map((c) => c.email!.toLowerCase()),
    )
    const seenEmails = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!
      const domain = r.domain?.toLowerCase() ?? null

      // Resolve companyId
      let companyId: string | undefined
      if (domain) {
        companyId = domainCache.get(domain)?.id
      } else {
        // No-domain row → create a fresh standalone company
        const c = await outreachRepository.createCompany(tenantId, {
          name: r.companyName,
          city: r.city ?? null,
          country: r.country ?? null,
          industry: r.industry ?? null,
          employeeBand: r.employeeBand ?? null,
          ownerLed: r.ownerLed ?? false,
          source: "cold",
        })
        companiesCreated++
        companyId = c.id
      }
      if (!companyId) {
        skipped++
        continue
      }

      const email = r.email?.toLowerCase() ?? null
      if (email) {
        if (existingEmailSet.has(email) || seenEmails.has(email)) {
          skipped++
          continue
        }
        seenEmails.add(email)
      }

      contactsToInsert.push({
        companyId,
        fullName: r.contactName,
        role: r.role ?? null,
        email,
        phone: r.phone ?? null,
        linkedinUrl: r.linkedinUrl ?? null,
        isOwner: r.isOwner ?? false,
        isDecisionMaker: r.isDecisionMaker ?? false,
      })
    }

    if (contactsToInsert.length > 0) {
      const inserted = await outreachRepository.bulkInsertContacts(
        tenantId,
        contactsToInsert,
      )
      contactsCreated = inserted.length
    }

    const result: BulkImportResult = {
      companiesCreated,
      contactsCreated,
      skipped,
    }

    await emitEvent({
      tenantId,
      kind: "leads.imported",
      entityType: "import",
      // We use the tenantId as a placeholder entityId for the batch.
      entityId: tenantId,
      payload: { ...result, totalRows: rows.length },
      actor: actorFromCtx(ctx),
    })

    log.info({ tenantId, ...result }, "Bulk lead import complete")
    return result
  },
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function mapClassifiedToReplyStatus(
  classifiedAs?: string | null,
): TouchRecord["replyStatus"] {
  if (!classifiedAs) return "none"
  const c = classifiedAs.toLowerCase()
  if (c === "positive" || c.includes("interested") || c.includes("yes"))
    return "positive"
  if (c === "negative" || c.includes("not_interested") || c === "no")
    return "negative"
  if (c === "ooo" || c.includes("out_of_office")) return "ooo"
  if (c === "converter" || c.includes("convert")) return "converter"
  if (c === "wrong_person") return "wrong_person"
  if (c === "auto_reply" || c.includes("auto")) return "auto_reply"
  return "none"
}
