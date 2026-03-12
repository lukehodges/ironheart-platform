// src/modules/ai/ai.schemas.ts

import { z } from "zod"

export const sendMessageSchema = z.object({
  conversationId: z.string().optional(), // null = new conversation
  message: z.string().min(1).max(10000),
  pageContext: z.object({
    route: z.string(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    listFilters: z.record(z.string(), z.unknown()).optional(),
    selectedIds: z.array(z.string()).optional(),
  }).optional(),
})

export const listConversationsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

export const getConversationSchema = z.object({
  conversationId: z.string(),
})

export const archiveConversationSchema = z.object({
  conversationId: z.string(),
})

export const resolveApprovalSchema = z.object({
  actionId: z.string(),
  approved: z.boolean(),
})

export const explainActionSchema = z.object({
  actionId: z.string(),
})

export const undoActionSchema = z.object({
  actionId: z.string(),
})

export const listActionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  status: z.string().optional(),
})

export const getTrustSuggestionsSchema = z.object({})

export const getConfigSchema = z.object({})

export const updateConfigSchema = z.object({
  guardrailOverrides: z.record(z.string(), z.enum(["AUTO", "CONFIRM", "RESTRICT"])).optional(),
})

export const generateWorkflowSchema = z.object({
  description: z.string().min(10).max(5000),
})

export const listWorkflowSuggestionsSchema = z.object({
  status: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})

export const resolveSuggestionSchema = z.object({
  suggestionId: z.string(),
  action: z.enum(["accepted", "dismissed"]),
})

export const ingestDocumentSchema = z.object({
  sourceId: z.string().min(1),
  sourceName: z.string().min(1),
  content: z.string().min(1).max(500000),
})

export const deleteDocumentSchema = z.object({
  sourceId: z.string(),
})

export const listKnowledgeSourcesSchema = z.object({})

export const setVerticalProfileSchema = z.object({
  verticalSlug: z.string(),
})

export const listVerticalProfilesSchema = z.object({})

// ---------------------------------------------------------------------------
// Phase F — Killer Features
// ---------------------------------------------------------------------------

export const updateKillerFeaturesConfigSchema = z.object({
  morningBriefingEnabled: z.boolean().optional(),
  morningBriefingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  morningBriefingTimezone: z.string().optional(),
  morningBriefingDelivery: z.enum(["in_app", "email", "both"]).optional(),
  morningBriefingRecipientIds: z.array(z.string()).optional(),
  ghostOperatorEnabled: z.boolean().optional(),
  ghostOperatorStartHour: z.number().int().min(0).max(23).optional(),
  ghostOperatorEndHour: z.number().int().min(0).max(23).optional(),
  ghostOperatorTimezone: z.string().optional(),
  ghostOperatorRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    trigger: z.enum(["pending_booking", "overdue_invoice", "review_followup", "workflow_retry"]),
    conditions: z.record(z.string(), z.unknown()),
    action: z.object({
      toolName: z.string(),
      inputTemplate: z.record(z.string(), z.unknown()),
    }),
    requireAutoTier: z.boolean(),
  })).optional(),
  pasteToPipelineEnabled: z.boolean().optional(),
})

export const pasteToPipelineExtractSchema = z.object({
  rawInput: z.string().min(1).max(50000),
})

export const pasteToPipelineCommitSchema = z.object({
  entities: z.object({
    customer: z.object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      company: z.string().nullable(),
      notes: z.string().nullable(),
    }).nullable(),
    booking: z.object({
      service: z.string().nullable(),
      date: z.string().nullable(),
      time: z.string().nullable(),
      duration: z.string().nullable(),
      notes: z.string().nullable(),
    }).nullable(),
    tasks: z.array(z.object({
      title: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
      dueDate: z.string().nullable(),
      assignee: z.string().nullable(),
    })),
    notes: z.array(z.string()),
    confidence: z.number(),
    rawInput: z.string(),
  }),
  confirmed: z.object({
    createCustomer: z.boolean(),
    createBooking: z.boolean(),
    createTasks: z.boolean(),
  }),
})

export const generateBriefingSchema = z.object({})
