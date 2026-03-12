// src/modules/ai/ai.router.ts

import { router, tenantProcedure, permissionProcedure, createModuleMiddleware } from "@/shared/trpc"
import { getUserPermissions } from "@/modules/auth/rbac"
import type { UserWithRoles } from "@/modules/auth/rbac"
import { aiService } from "./ai.service"
import { aiRepository } from "./ai.repository"
import {
  sendMessageSchema, listConversationsSchema, getConversationSchema, archiveConversationSchema,
  resolveApprovalSchema, explainActionSchema, undoActionSchema, listActionsSchema,
  getTrustSuggestionsSchema, getConfigSchema, updateConfigSchema,
  generateWorkflowSchema, listWorkflowSuggestionsSchema, resolveSuggestionSchema,
  ingestDocumentSchema, deleteDocumentSchema, listKnowledgeSourcesSchema,
  setVerticalProfileSchema, listVerticalProfilesSchema,
  createMcpConnectionSchema, updateMcpConnectionSchema, deleteMcpConnectionSchema,
  refreshMcpToolsSchema, listMcpConnectionsSchema,
} from "./ai.schemas"
import { resolveApprovalFromUI } from "./ai.approval"
import { explainAction, undoAction } from "./ai.explainer"
import { analyzeTrustMetrics } from "./ai.trust"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import { generateWorkflowFromDescription } from "./ai.workflow-generator"
import { suggestionsRepository } from "./ai.suggestions.repository"
import { knowledgeRepository } from "./knowledge/repository"
import { listVerticalProfiles } from "./verticals"
import { mcpConnectionRepository } from "./mcp/repository"
import { discoverTools } from "./mcp/client"

const moduleGate = createModuleMiddleware("ai")
const moduleProcedure = tenantProcedure.use(moduleGate)
const modulePermission = (perm: string) => permissionProcedure(perm).use(moduleGate)

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

  generateWorkflow: moduleProcedure
    .input(generateWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      return generateWorkflowFromDescription(input.description, {
        availableEvents: [
          "booking/created", "booking/confirmed", "booking/cancelled", "booking/completed",
          "forms/submitted", "review/submitted", "team/created",
        ],
      })
    }),

  listWorkflowSuggestions: moduleProcedure
    .input(listWorkflowSuggestionsSchema)
    .query(({ ctx, input }) =>
      suggestionsRepository.listByTenant(ctx.tenantId, input.status, input.limit)
    ),

  resolveSuggestion: moduleProcedure
    .input(resolveSuggestionSchema)
    .mutation(async ({ input }) => {
      await suggestionsRepository.updateStatus(input.suggestionId, input.action)
      return { success: true }
    }),

  ingestDocument: moduleProcedure
    .input(ingestDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const chunks = await knowledgeRepository.ingestDocument(
        ctx.tenantId, input.sourceId, input.sourceName, input.content
      )
      return { chunksCreated: chunks }
    }),

  deleteDocument: moduleProcedure
    .input(deleteDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      await knowledgeRepository.deleteSource(ctx.tenantId, input.sourceId)
      return { success: true }
    }),

  listKnowledgeSources: moduleProcedure
    .input(listKnowledgeSourcesSchema)
    .query(({ ctx }) => knowledgeRepository.listSources(ctx.tenantId)),

  setVerticalProfile: moduleProcedure
    .input(setVerticalProfileSchema)
    .mutation(async ({ ctx, input }) => {
      await aiConfigRepository.update(ctx.tenantId, { verticalProfile: input.verticalSlug })
      return { success: true }
    }),

  listVerticalProfiles: moduleProcedure
    .input(listVerticalProfilesSchema)
    .query(() => ({ profiles: listVerticalProfiles() })),

  // ---------------------------------------------------------------------------
  // MCP Connections
  // ---------------------------------------------------------------------------

  createMcpConnection: modulePermission("ai:write")
    .input(createMcpConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const connection = await mcpConnectionRepository.create({ tenantId: ctx.tenantId, ...input })
      // Auto-discover tools on creation
      await discoverTools(connection)
      return connection
    }),

  updateMcpConnection: modulePermission("ai:write")
    .input(updateMcpConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, isEnabled, ...data } = input
      await mcpConnectionRepository.update(id, ctx.tenantId, {
        ...data,
        isEnabled: isEnabled !== undefined ? (isEnabled ? 1 : 0) : undefined,
      })
      return { success: true }
    }),

  deleteMcpConnection: modulePermission("ai:write")
    .input(deleteMcpConnectionSchema)
    .mutation(async ({ ctx, input }) => {
      await mcpConnectionRepository.delete(input.id, ctx.tenantId)
      return { success: true }
    }),

  listMcpConnections: moduleProcedure
    .input(listMcpConnectionsSchema)
    .query(({ ctx }) => mcpConnectionRepository.listByTenant(ctx.tenantId)),

  refreshMcpTools: modulePermission("ai:write")
    .input(refreshMcpToolsSchema)
    .mutation(async ({ ctx, input }) => {
      const connection = await mcpConnectionRepository.getById(ctx.tenantId, input.id)
      if (!connection) return { tools: [] }
      const tools = await discoverTools(connection)
      return { tools }
    }),
})

export type AIRouter = typeof aiRouter
