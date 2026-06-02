import { z } from "zod"

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const dealStageSchema = z.enum([
  "qualified",
  "demo",
  "proposal",
  "won",
  "lost",
  "dormant",
])

export const dealProductSchema = z.enum([
  "audit",
  "build_sprint",
  "retainer",
  "other",
])

// ---------------------------------------------------------------------------
// Common helpers
// ---------------------------------------------------------------------------

const uuid = z.string().uuid()
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .nullable()
  .optional()

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export const listDealsSchema = z.object({
  stage: dealStageSchema.optional(),
  ownerId: uuid.optional(),
  productLine: dealProductSchema.optional(),
  search: z.string().min(1).max(200).optional(),
})

export const getDealSchema = z.object({
  dealId: uuid,
})

export const createDealSchema = z.object({
  companyId: uuid,
  primaryContactId: uuid.nullish(),
  originTouchId: uuid.nullish(),
  name: z.string().min(1).max(200),
  stage: dealStageSchema.optional(),
  product: dealProductSchema.optional(),
  valueEstimate: z.number().nonnegative().nullish(),
  probability: z.number().int().min(0).max(100).nullish(),
  expectedClose: isoDate,
  ownerUserId: uuid.nullish(),
  notes: z.string().max(5000).nullish(),
})

export const updateDealSchema = z.object({
  dealId: uuid,
  name: z.string().min(1).max(200).optional(),
  product: dealProductSchema.optional(),
  valueEstimate: z.number().nonnegative().nullish(),
  probability: z.number().int().min(0).max(100).nullish(),
  expectedClose: isoDate,
  ownerUserId: uuid.nullish(),
  notes: z.string().max(5000).nullish(),
  closeReason: z.string().max(500).nullish(),
})

export const moveStageSchema = z.object({
  dealId: uuid,
  newStage: dealStageSchema,
  reason: z.string().max(500).optional(),
})

export const addNoteSchema = z.object({
  dealId: uuid,
  body: z.string().min(1).max(5000),
})

export const recordMeetingSchema = z.object({
  dealId: uuid,
  meetingPayload: z
    .object({
      scheduledAt: z.string().datetime().optional(),
      attendees: z.array(z.string()).optional(),
      notes: z.string().max(2000).optional(),
      externalEventId: z.string().optional(),
    })
    .passthrough(),
})

export const recordProposalSchema = z.object({
  dealId: uuid,
  proposalRef: z.object({
    proposalId: z.string().optional(),
    url: z.string().url().optional(),
    sentAt: z.string().datetime().optional(),
    amount: z.number().optional(),
  }).passthrough(),
})

export const recordContractSchema = z.object({
  dealId: uuid,
  contractRef: z.object({
    contractId: z.string().optional(),
    url: z.string().url().optional(),
    signedAt: z.string().datetime().optional(),
    amount: z.number().optional(),
  }).passthrough(),
})

export const convertFromReplySchema = z.object({
  replyId: uuid,
  dealInput: z.object({
    companyId: uuid,
    primaryContactId: uuid.nullish(),
    name: z.string().min(1).max(200),
    stage: dealStageSchema.optional(),
    product: dealProductSchema.optional(),
    valueEstimate: z.number().nonnegative().nullish(),
    probability: z.number().int().min(0).max(100).nullish(),
    expectedClose: isoDate,
    ownerUserId: uuid.nullish(),
    notes: z.string().max(5000).nullish(),
  }),
})

export const listDealEventsSchema = z.object({
  dealId: uuid,
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type ListDealsInput = z.infer<typeof listDealsSchema>
export type CreateDealZodInput = z.infer<typeof createDealSchema>
export type UpdateDealZodInput = z.infer<typeof updateDealSchema>
export type MoveStageInput = z.infer<typeof moveStageSchema>
export type AddNoteInput = z.infer<typeof addNoteSchema>
export type RecordMeetingInput = z.infer<typeof recordMeetingSchema>
export type RecordProposalInput = z.infer<typeof recordProposalSchema>
export type RecordContractInput = z.infer<typeof recordContractSchema>
export type ConvertFromReplyInput = z.infer<typeof convertFromReplySchema>
