import { z } from 'zod'

// Pipeline CRUD
export const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  stages: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        slug: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z0-9-]+$/),
        position: z.number().int().min(0),
        color: z.string().max(50).optional(),
        type: z.enum(['OPEN', 'WON', 'LOST']).default('OPEN'),
      }),
    )
    .min(1),
})

export const updatePipelineSchema = z.object({
  pipelineId: z.uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
})

export const archivePipelineSchema = z.object({ pipelineId: z.uuid() })
export const getPipelineByIdSchema = z.object({ pipelineId: z.uuid() })

// Stage Configuration
export const addStageSchema = z.object({
  pipelineId: z.uuid(),
  name: z.string().min(1).max(50),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  position: z.number().int().min(0),
  color: z.string().max(50).optional(),
  type: z.enum(['OPEN', 'WON', 'LOST']).default('OPEN'),
  allowedTransitions: z.array(z.uuid()).default([]),
})

export const updateStageSchema = z.object({
  stageId: z.uuid(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(50).nullable().optional(),
  type: z.enum(['OPEN', 'WON', 'LOST']).optional(),
  allowedTransitions: z.array(z.uuid()).optional(),
})

export const removeStageSchema = z.object({
  stageId: z.uuid(),
  reassignToStageId: z.uuid(),
})

export const reorderStagesSchema = z.object({
  pipelineId: z.uuid(),
  stageIds: z.array(z.uuid()).min(1),
})

// Member Operations
export const addMemberSchema = z.object({
  pipelineId: z.uuid(),
  customerId: z.uuid(),
  stageId: z.uuid().optional(),
  dealValue: z.number().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const moveMemberSchema = z.object({
  memberId: z.uuid(),
  toStageId: z.uuid(),
  dealValue: z.number().min(0).optional(),
  lostReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export const removeMemberSchema = z.object({ memberId: z.uuid() })

export const updateMemberSchema = z.object({
  memberId: z.uuid(),
  dealValue: z.number().min(0).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const listMembersSchema = z.object({ pipelineId: z.uuid() })
export const getSummarySchema = z.object({ pipelineId: z.uuid() })
export const getMemberHistorySchema = z.object({ memberId: z.uuid() })
