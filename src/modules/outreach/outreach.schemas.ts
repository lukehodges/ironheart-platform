import { z } from "zod"

// ---------------------------------------------------------------------------
// Enums (mirror outreach.schema.ts pg enums)
// ---------------------------------------------------------------------------

export const outreachChannelEnum = z.enum(["email", "linkedin", "phone"])
export const outreachEmployeeBandEnum = z.enum(["1-2", "3-15", "15-50", "50+"])
export const outreachCompanySourceEnum = z.enum([
  "cold",
  "referral",
  "inbound",
  "manual",
])
export const outreachCampaignStatusEnum = z.enum([
  "draft",
  "active",
  "paused",
  "complete",
])
export const outreachDeliveryStatusEnum = z.enum([
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
])
export const outreachReplyStatusEnum = z.enum([
  "none",
  "positive",
  "negative",
  "ooo",
  "converter",
  "wrong_person",
  "auto_reply",
])
export const outreachClassifierEnum = z.enum(["claude", "luke", "rule"])

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

const uuid = z.string().uuid()
const emailOptional = z.string().email().optional().nullable()

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export const listCompaniesSchema = paginationSchema.extend({
  search: z.string().optional(),
  city: z.string().optional(),
  doNotContact: z.boolean().optional(),
})

export const createCompanySchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  employeeBand: outreachEmployeeBandEnum.optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  ownerLed: z.boolean().optional(),
  source: outreachCompanySourceEnum.optional(),
  notes: z.string().optional().nullable(),
  enrichment: z.record(z.string(), z.unknown()).optional(),
})

export const updateCompanySchema = createCompanySchema.partial().extend({
  id: uuid,
  doNotContact: z.boolean().optional(),
  dncReason: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export const listContactsSchema = paginationSchema.extend({
  companyId: uuid.optional(),
  search: z.string().optional(),
  doNotContact: z.boolean().optional(),
  bounced: z.boolean().optional(),
})

export const createContactSchema = z.object({
  companyId: uuid,
  fullName: z.string().min(1),
  role: z.string().optional().nullable(),
  email: emailOptional,
  phone: z.string().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  isOwner: z.boolean().optional(),
  isDecisionMaker: z.boolean().optional(),
})

export const updateContactSchema = z.object({
  id: uuid,
  fullName: z.string().min(1).optional(),
  role: z.string().optional().nullable(),
  email: emailOptional,
  phone: z.string().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  isOwner: z.boolean().optional(),
  isDecisionMaker: z.boolean().optional(),
  bounced: z.boolean().optional(),
  doNotContact: z.boolean().optional(),
})

export const markContactBouncedSchema = z.object({ id: uuid })

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export const listCampaignsSchema = paginationSchema.extend({
  status: outreachCampaignStatusEnum.optional(),
  channel: outreachChannelEnum.optional(),
})

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  channel: outreachChannelEnum,
  city: z.string().optional().nullable(),
  industryFocus: z.string().optional().nullable(),
  status: outreachCampaignStatusEnum.optional(),
  startedAt: z.date().optional().nullable(),
  endedAt: z.date().optional().nullable(),
})

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export const listTemplatesSchema = paginationSchema.extend({
  channel: outreachChannelEnum.optional(),
  active: z.boolean().optional(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1),
  channel: outreachChannelEnum,
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
  variables: z.record(z.string(), z.unknown()).optional(),
  parentId: uuid.optional().nullable(),
  active: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Touches
// ---------------------------------------------------------------------------

export const listTouchesSchema = paginationSchema.extend({
  contactId: uuid.optional(),
  campaignId: uuid.optional(),
  deliveryStatus: outreachDeliveryStatusEnum.optional(),
  awaitingReplyOnly: z.boolean().optional(),
})

export const sendTouchSchema = z.object({
  contactId: uuid,
  templateId: uuid.optional().nullable(),
  campaignId: uuid.optional().nullable(),
  channel: outreachChannelEnum,
  renderedSubject: z.string().optional().nullable(),
  renderedBody: z.string().optional().nullable(),
  externalMessageId: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export const listRepliesSchema = paginationSchema.extend({
  needsReview: z.boolean().optional(),
  handled: z.boolean().optional(),
  contactId: uuid.optional(),
})

export const listRepliesEnrichedSchema = paginationSchema.extend({
  needsReview: z.boolean().optional(),
  handled: z.boolean().optional(),
  contactId: uuid.optional(),
  /** Filter to replies received within the last N days. */
  sinceDays: z.number().int().min(1).max(365).optional(),
})

export const classifyReplySchema = z.object({
  replyId: uuid,
  classifiedAs: z.string().min(1),
  classifiedBy: outreachClassifierEnum,
  confidence: z.number().min(0).max(1).optional(),
})

// ---------------------------------------------------------------------------
// DNC
// ---------------------------------------------------------------------------

export const addToDncSchema = z
  .object({
    email: z.string().email().optional(),
    domain: z.string().optional(),
    reason: z.string().optional().nullable(),
  })
  .refine((v) => Boolean(v.email || v.domain), {
    message: "Either email or domain is required",
  })

export const listDncSchema = paginationSchema.extend({
  search: z.string().optional(),
})

export const checkDncSchema = z.object({
  email: z.string().email(),
})

// ---------------------------------------------------------------------------
// Bulk import
// ---------------------------------------------------------------------------

const bulkImportRowSchema = z.object({
  companyName: z.string().min(1),
  domain: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  employeeBand: outreachEmployeeBandEnum.optional().nullable(),
  ownerLed: z.boolean().optional(),
  contactName: z.string().min(1),
  email: emailOptional,
  phone: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  isOwner: z.boolean().optional(),
  isDecisionMaker: z.boolean().optional(),
})

export const bulkImportLeadsSchema = z.object({
  rows: z.array(bulkImportRowSchema).min(1).max(5000),
})
