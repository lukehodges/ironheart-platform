// src/modules/ai/ai.router.ts

import { router, tenantProcedure, createModuleMiddleware } from "@/shared/trpc"
import { aiService } from "./ai.service"
import { aiRepository } from "./ai.repository"
import { sendMessageSchema, listConversationsSchema, getConversationSchema, archiveConversationSchema } from "./ai.schemas"

const moduleGate = createModuleMiddleware("ai")
const moduleProcedure = tenantProcedure.use(moduleGate)

export const aiRouter = router({
  sendMessage: moduleProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      // Extract user permissions as "resource:action" strings from the UserWithRoles tree
      const userPermissions = ctx.user?.roles?.flatMap((r) =>
        r.role.permissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
      ) ?? []

      return aiService.sendMessage(ctx.tenantId, ctx.user!.id, userPermissions, {
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
