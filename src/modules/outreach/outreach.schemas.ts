import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------

const outreachStepSchema = z.object({
  position: z.number().int().min(1),
  channel: z.enum(['EMAIL', 'LINKEDIN_REQUEST', 'LINKEDIN_MESSAGE', 'CALL']),
  delayDays: z.number().int().min(0),
  subject: z.string().max(200).optional(),
  bodyMarkdown: z.string().min(1).max(5000),
  notes: z.string().max(500).optional(),
})

// ---------------------------------------------------------------------------
// Sequence schemas
// ---------------------------------------------------------------------------

export const createSequenceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sector: z.string().min(1).max(100),
  targetIcp: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  abVariant: z.string().max(50).optional(),
  pairedSequenceId: z.uuid().optional(),
  steps: z.array(outreachStepSchema).min(1),
})

export const updateSequenceSchema = z.object({
  sequenceId: z.uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  sector: z.string().min(1).max(100).optional(),
  targetIcp: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  steps: z.array(outreachStepSchema).min(1).optional(),
})

export const getSequenceByIdSchema = z.object({ sequenceId: z.uuid() })
export const archiveSequenceSchema = z.object({ sequenceId: z.uuid() })

// ---------------------------------------------------------------------------
// Contact schemas
// ---------------------------------------------------------------------------

export const enrollContactSchema = z.object({
  customerId: z.uuid(),
  sequenceId: z.uuid(),
  assignedUserId: z.uuid().optional(),
  notes: z.string().max(1000).optional(),
})

export const listContactsSchema = z.object({
  sequenceId: z.uuid().optional(),
  status: z.enum([
    'ACTIVE',
    'REPLIED',
    'BOUNCED',
    'OPTED_OUT',
    'CONVERTED',
    'PAUSED',
    'COMPLETED',
  ]).optional(),
  assignedUserId: z.uuid().optional(),
  search: z.string().max(200).optional(),
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

export const getContactByIdSchema = z.object({ contactId: z.uuid() })

export const getBodySchema = z.object({
  contactId: z.uuid(),
  stepPosition: z.number().int().min(1).optional(),
})

export const logActivitySchema = z.object({
  contactId: z.uuid(),
  activityType: z.enum([
    'SENT',
    'REPLIED',
    'BOUNCED',
    'OPTED_OUT',
    'SKIPPED',
    'CALL_COMPLETED',
    'MEETING_BOOKED',
    'CONVERTED',
  ]),
  notes: z.string().max(1000).optional(),
  deliveredTo: z.string().max(200).optional(),
})

export const convertContactSchema = z.object({
  contactId: z.uuid(),
  pipelineId: z.uuid(),
  stageId: z.uuid(),
  dealValue: z.number().min(0).optional(),
})

export const pauseContactSchema = z.object({ contactId: z.uuid() })
export const resumeContactSchema = z.object({ contactId: z.uuid() })

// IMPORTANT: Do NOT add "UNDONE" to logActivitySchema above — UNDONE is only created
// internally by the undoActivity service method, never by user input.

export const categorizeContactSchema = z.object({
  contactId: z.uuid(),
  replyCategory: z.enum([
    'INTERESTED',
    'NOT_NOW',
    'NOT_INTERESTED',
    'WRONG_PERSON',
    'AUTO_REPLY',
  ]),
})

export const snoozeContactSchema = z.object({
  contactId: z.uuid(),
  snoozedUntil: z.coerce.date(),
})

export const batchLogActivitySchema = z.object({
  contactIds: z.array(z.uuid()).min(1).max(50),
  activityType: z.enum(['SENT', 'SKIPPED']),
  notes: z.string().max(1000).optional(),
})

export const undoActivitySchema = z.object({
  contactId: z.uuid(),
  activityId: z.uuid(),
})

// NOTE: importContactsSchema and bulkEnrollSchema are schema stubs for Plan 2 (Dashboard + Contacts).
// Service/repository/router implementation deferred to that plan.
export const importContactsSchema = z.object({
  contacts: z.array(z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email().max(200),
    company: z.string().max(200).optional(),
    sector: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
  })).min(1).max(500),
  sequenceId: z.uuid().optional(),
})

export const bulkEnrollSchema = z.object({
  customerIds: z.array(z.uuid()).min(1).max(100),
  sequenceId: z.uuid(),
  assignedUserId: z.uuid().optional(),
})

export const getContactDetailSchema = z.object({
  contactId: z.uuid(),
})

export const getContactActivitiesSchema = z.object({
  contactId: z.uuid(),
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

// ---------------------------------------------------------------------------
// Analytics schemas
// ---------------------------------------------------------------------------

export const sequenceAnalyticsSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sector: z.string().max(100).optional(),
})

export const sectorAnalyticsSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})
