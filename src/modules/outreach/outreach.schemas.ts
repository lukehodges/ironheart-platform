/**
 * Outreach module — zod schemas for the tRPC router.
 *
 * Mirrors the input shapes in outreach.types.ts. Kept thin: only the inputs
 * the router exposes, no SaaS-style helpers.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Enums (mirror the pg enums)
// ---------------------------------------------------------------------------

export const outreachChannelEnum = z.enum(["email", "linkedin", "phone"])
export const outreachLeadStatusEnum = z.enum([
  "ready",
  "draft",
  "sent",
  "skipped",
  "dnc",
])
export const outreachLeadOwnerEnum = z.enum(["luke", "alex"])
export const outreachReplySentimentEnum = z.enum([
  "positive",
  "neutral",
  "negative",
])
export const outreachHypothesisVerdictEnum = z.enum([
  "pending",
  "testing",
  "keep",
  "mutate",
  "kill",
  "baseline",
])
export const outreachClassifierEnum = z.enum(["claude", "luke", "rule"])

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

const uuid = z.string().uuid()
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const listLeadsFilterSchema = z.object({
  status: outreachLeadStatusEnum.optional(),
  owner: outreachLeadOwnerEnum.optional(),
  category: z.string().optional(),
  researched: z.boolean().optional(),
  search: z.string().optional(),
  hypothesisWeekId: uuid.optional(),
  // Date-range filter on lastContactedAt (ISO date strings YYYY-MM-DD)
  contactedFrom: z.string().optional(),
  contactedTo: z.string().optional(),
  // When true: only leads WITH a lastContactedAt; when false: only leads without
  hasContactDate: z.boolean().optional(),
  // Tier filter: ilike on notes field (e.g. "gold", "silver")
  tier: z.string().optional(),
  // Server-side sort
  sortBy: z.enum(["number", "company", "status", "lastContactedAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
})

export const listLeadsSchema = listLeadsFilterSchema.extend({
  limit: z.number().int().min(1).max(500).default(50),
  offset: z.number().int().min(0).default(0),
})

// countLeads accepts all the same filters (no pagination needed)
export const countLeadsSchema = listLeadsFilterSchema

export const createLeadSchema = z.object({
  owner: outreachLeadOwnerEnum,
  name: z.string().min(1),
  company: z.string().min(1),
  category: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: outreachLeadStatusEnum.optional(),
  researched: z.boolean().optional(),
  followUpFlag: z.boolean().optional(),
  researchNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  hypothesisWeekId: uuid.optional().nullable(),
})

export const updateLeadSchema = z.object({
  id: uuid,
  owner: outreachLeadOwnerEnum.optional(),
  status: outreachLeadStatusEnum.optional(),
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  website: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  researched: z.boolean().optional(),
  followUpFlag: z.boolean().optional(),
  lastContactedAt: dateStr.optional().nullable(),
  nextFollowUpAt: dateStr.optional().nullable(),
  reply: z.boolean().optional(),
  replySentiment: outreachReplySentimentEnum.optional().nullable(),
  researchNotes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  hypothesisWeekId: uuid.optional().nullable(),
})

export const markLeadSentSchema = z.object({
  id: uuid,
  date: dateStr.optional(), // defaults to today
})

export const getLeadSchema = z.object({ id: uuid })

// ---------------------------------------------------------------------------
// Daily activity
// ---------------------------------------------------------------------------

export const listDailyActivitySchema = z.object({
  startDate: dateStr,
  endDate: dateStr,
  owner: outreachLeadOwnerEnum.optional(),
})

export const upsertDailyActivitySchema = z.object({
  date: dateStr,
  owner: outreachLeadOwnerEnum,
  channel: outreachChannelEnum.optional(),
  hypothesisWeekId: uuid.optional().nullable(),
  sent: z.number().int().min(0).optional(),
  replies: z.number().int().min(0).optional(),
  positive: z.number().int().min(0).optional(),
  meetingsBooked: z.number().int().min(0).optional(),
  meetingsTaken: z.number().int().min(0).optional(),
  interested: z.number().int().min(0).optional(),
  closed: z.number().int().min(0).optional(),
  newUpfront: z.number().min(0).optional(),
  newRetainer: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
})

// ---------------------------------------------------------------------------
// Weekly hypothesis
// ---------------------------------------------------------------------------

export const listHypothesesSchema = z.object({
  status: z.enum(["active", "complete"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
})

export const createHypothesisSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/, "Expected YYYY-Www"),
  startDate: dateStr,
  endDate: dateStr,
  title: z.string().min(1),
  body: z.string().min(1),
  targetSample: z.number().int().min(1),
  targetReplyPct: z.number().min(0).max(100),
  targetPositivePct: z.number().min(0).max(100),
  targetBooked: z.number().int().min(0).optional(),
  replaces: z.string().optional().nullable(),
  prevWeekId: uuid.optional().nullable(),
})

export const endWeekSchema = z.object({
  hypothesisId: uuid,
  resultSummary: z.string().min(1),
  verdict: outreachHypothesisVerdictEnum,
  nextHypothesis: createHypothesisSchema.omit({ prevWeekId: true }).optional(),
})

// ---------------------------------------------------------------------------
// Pull batch (Pull 25 → today's send list)
// ---------------------------------------------------------------------------

export const pullBatchSchema = z.object({
  owner: outreachLeadOwnerEnum,
  count: z.number().int().min(1).max(100).default(25),
  hypothesisId: uuid.optional(),
})

// ---------------------------------------------------------------------------
// DNC
// ---------------------------------------------------------------------------

export const addDncSchema = z
  .object({
    email: z.string().email().optional(),
    domain: z.string().optional(),
    reason: z.string().optional().nullable(),
  })
  .refine((v) => Boolean(v.email || v.domain), {
    message: "Either email or domain is required",
  })

export const listDncSchema = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
})

export const checkDncSchema = z.object({ email: z.string().email() })

// ---------------------------------------------------------------------------
// Gmail processor: recordReply
// ---------------------------------------------------------------------------

export const recordReplySchema = z.object({
  leadId: uuid,
  touchId: uuid.optional().nullable(),
  receivedAt: z.date().optional(),
  subject: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  sentiment: outreachReplySentimentEnum.optional().nullable(),
  classifiedBy: outreachClassifierEnum.optional().nullable(),
  rawEventId: uuid.optional().nullable(),
})

// ---------------------------------------------------------------------------
// Replies (inbox triage)
// ---------------------------------------------------------------------------

export const listRepliesSchema = z.object({
  needsReview: z.boolean().optional(),
  handled: z.boolean().optional(),
  leadId: uuid.optional(),
  sinceDays: z.number().int().min(1).max(365).optional(),
  limit: z.number().int().min(1).max(200).default(50),
})

export const classifyReplySchema = z.object({
  replyId: uuid,
  sentiment: outreachReplySentimentEnum,
  classifiedBy: outreachClassifierEnum,
})
