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
