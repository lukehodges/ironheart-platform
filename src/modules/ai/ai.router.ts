// src/modules/ai/ai.router.ts

import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc"
import { getUserPermissions } from "@/modules/auth/rbac"
import type { UserWithRoles } from "@/modules/auth/rbac"
import { aiService } from "./ai.service"
import { aiRepository } from "./ai.repository"
import { sendMessageSchema, listConversationsSchema, getConversationSchema, archiveConversationSchema } from "./ai.schemas"

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
})

export type AIRouter = typeof aiRouter
