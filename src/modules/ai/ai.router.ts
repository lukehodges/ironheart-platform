// src/modules/ai/ai.router.ts

import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc"
import { getUserPermissions } from "@/modules/auth/rbac"
import type { UserWithRoles } from "@/modules/auth/rbac"
import { aiService } from "./ai.service"
import { aiRepository } from "./ai.repository"
import {
  sendMessageSchema, listConversationsSchema, getConversationSchema, archiveConversationSchema,
  resolveApprovalSchema, explainActionSchema, undoActionSchema, listActionsSchema,
  getTrustSuggestionsSchema, getConfigSchema, updateConfigSchema,
} from "./ai.schemas"
import { resolveApprovalFromUI } from "./ai.approval"
import { explainAction, undoAction } from "./ai.explainer"
import { analyzeTrustMetrics } from "./ai.trust"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"

const moduleGate = createModuleMiddleware("ai")
const moduleProcedure = tenantProcedure.use(moduleGate)

export const aiRouter = router({
  sendMessage: moduleProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      // Use getUserPermissions which handles OWNER/ADMIN wildcard ("*:*")
      const userPermissions = getUserPermissions(ctx.user as UserWithRoles)

      return aiService.sendMessage(ctx.tenantId, ctx.user!.id, ctx.session!.user.id, userPermissions, ctx.req, {
        conversationId: input.conversationId,
        message: input.message,
        pageContext: input.pageContext,
      })
    }),

  listConversations: moduleProcedure
    .input(listConversationsSchema)
    .query(({ ctx, input }) =>
      aiRepository.listConversations(ctx.tenantId, ctx.user!.id, input.limit, input.cursor)
    ),

  getConversation: moduleProcedure
    .input(getConversationSchema)
    .query(async ({ ctx, input }) => {
      const conversation = await aiRepository.getConversation(ctx.tenantId, input.conversationId)
      if (!conversation) return null

      const messages = await aiRepository.getMessages(input.conversationId)
      return { ...conversation, messages }
    }),

  archiveConversation: moduleProcedure
    .input(archiveConversationSchema)
    .mutation(async ({ ctx, input }) => {
      await aiRepository.updateConversation(input.conversationId, { status: "archived" })
      return { success: true }
    }),

  resolveApproval: moduleProcedure
    .input(resolveApprovalSchema)
    .mutation(async ({ input }) => {
      await resolveApprovalFromUI(input.actionId, input.approved)
      return { success: true }
    }),

  explainAction: moduleProcedure
    .input(explainActionSchema)
    .mutation(async ({ ctx, input }) => {
      const explanation = await explainAction(input.actionId, ctx.tenantId)
      return { explanation }
    }),

  undoAction: moduleProcedure
    .input(undoActionSchema)
    .mutation(async ({ ctx, input }) => {
      return undoAction(input.actionId, ctx.tenantId, ctx.user!.id)
    }),

  listActions: moduleProcedure
    .input(listActionsSchema)
    .query(({ ctx, input }) =>
      agentActionsRepository.listByTenant(ctx.tenantId, input.limit, input.status as any)
    ),

  getTrustSuggestions: moduleProcedure
    .input(getTrustSuggestionsSchema)
    .query(async ({ ctx }) => {
      const suggestions = await analyzeTrustMetrics(ctx.tenantId)
      return { suggestions }
    }),

  getConfig: moduleProcedure
    .input(getConfigSchema)
    .query(({ ctx }) => aiConfigRepository.getOrCreate(ctx.tenantId)),

  updateConfig: moduleProcedure
    .input(updateConfigSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.guardrailOverrides) {
        await aiConfigRepository.update(ctx.tenantId, { guardrailOverrides: input.guardrailOverrides })
      }
      return { success: true }
    }),
})

export type AIRouter = typeof aiRouter
