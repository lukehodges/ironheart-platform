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
  generateWorkflowSchema, listWorkflowSuggestionsSchema, resolveSuggestionSchema,
  ingestDocumentSchema, deleteDocumentSchema, listKnowledgeSourcesSchema,
  setVerticalProfileSchema, listVerticalProfilesSchema,
  updateKillerFeaturesConfigSchema, pasteToPipelineExtractSchema, pasteToPipelineCommitSchema,
  generateBriefingSchema,
} from "./ai.schemas"
import { extractEntities } from "./features/paste-to-pipeline"
import { commitEntities } from "./features/paste-to-pipeline.commit"
import { gatherBriefingData } from "./features/morning-briefing.data"
import { generateBriefing } from "./features/morning-briefing.generator"
import type { AgentContext, GhostOperatorRule } from "./ai.types"
import { resolveApprovalFromUI } from "./ai.approval"
import { explainAction, undoAction } from "./ai.explainer"
import { analyzeTrustMetrics } from "./ai.trust"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import { generateWorkflowFromDescription } from "./ai.workflow-generator"
import { suggestionsRepository } from "./ai.suggestions.repository"
import { knowledgeRepository } from "./knowledge/repository"
import { listVerticalProfiles } from "./verticals"

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
  // Phase F — Killer Features
  // ---------------------------------------------------------------------------

  updateKillerFeaturesConfig: moduleProcedure
    .input(updateKillerFeaturesConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.morningBriefingEnabled !== undefined) updates.morningBriefingEnabled = input.morningBriefingEnabled ? 1 : 0
      if (input.morningBriefingTime) updates.morningBriefingTime = input.morningBriefingTime
      if (input.morningBriefingTimezone) updates.morningBriefingTimezone = input.morningBriefingTimezone
      if (input.morningBriefingDelivery) updates.morningBriefingDelivery = input.morningBriefingDelivery
      if (input.morningBriefingRecipientIds) updates.morningBriefingRecipientIds = input.morningBriefingRecipientIds
      if (input.ghostOperatorEnabled !== undefined) updates.ghostOperatorEnabled = input.ghostOperatorEnabled ? 1 : 0
      if (input.ghostOperatorStartHour !== undefined) updates.ghostOperatorStartHour = input.ghostOperatorStartHour
      if (input.ghostOperatorEndHour !== undefined) updates.ghostOperatorEndHour = input.ghostOperatorEndHour
      if (input.ghostOperatorTimezone) updates.ghostOperatorTimezone = input.ghostOperatorTimezone
      if (input.ghostOperatorRules) updates.ghostOperatorRules = input.ghostOperatorRules
      if (input.pasteToPipelineEnabled !== undefined) updates.pasteToPipelineEnabled = input.pasteToPipelineEnabled ? 1 : 0
      await aiConfigRepository.update(ctx.tenantId, updates as Parameters<typeof aiConfigRepository.update>[1])
      return { success: true }
    }),

  pasteToPipelineExtract: moduleProcedure
    .input(pasteToPipelineExtractSchema)
    .mutation(async ({ ctx, input }) => {
      return extractEntities(ctx.tenantId, input.rawInput)
    }),

  pasteToPipelineCommit: moduleProcedure
    .input(pasteToPipelineCommitSchema)
    .mutation(async ({ ctx, input }) => {
      const agentCtx: AgentContext = {
        tenantId: ctx.tenantId,
        userId: ctx.user!.id,
        workosUserId: ctx.session!.user.id,
        userPermissions: getUserPermissions(ctx.user as UserWithRoles),
      }
      return commitEntities(agentCtx, input.entities, input.confirmed)
    }),

  generateBriefingNow: moduleProcedure
    .input(generateBriefingSchema)
    .mutation(async ({ ctx }) => {
      const data = await gatherBriefingData(ctx.tenantId)
      return generateBriefing(ctx.tenantId, data)
    }),
})

export type AIRouter = typeof aiRouter
