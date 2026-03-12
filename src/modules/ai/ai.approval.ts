// src/modules/ai/ai.approval.ts

import { redis } from "@/shared/redis"
import { logger } from "@/shared/logger"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import type { AgentContext, GuardrailTier, MutatingAgentTool, AgentActionRecord } from "./ai.types"

const log = logger.child({ module: "ai.approval" })

const APPROVAL_TIMEOUT_MS = 300_000 // 5 minutes
const APPROVAL_POLL_INTERVAL_MS = 1000 // 1 second

/**
 * Resolve the effective guardrail tier for a tool in a tenant context.
 * Checks tenant overrides first, then falls back to tool default.
 */
export async function resolveGuardrailTier(
  tenantId: string,
  tool: MutatingAgentTool
): Promise<GuardrailTier> {
  return aiConfigRepository.getGuardrailTier(tenantId, tool.name, tool.guardrailTier)
}

/**
 * Create a pending action and wait for user approval via Redis.
 * Returns the action record after approval/rejection/timeout.
 */
export async function requestApproval(
  conversationId: string,
  tool: MutatingAgentTool,
  toolInput: unknown,
  ctx: AgentContext
): Promise<{ approved: boolean; action: AgentActionRecord }> {
  // 1. Create pending action record
  const action = await agentActionsRepository.create({
    conversationId,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    toolName: tool.name,
    toolInput,
    guardrailTier: "CONFIRM",
    isReversible: tool.isReversible,
  })

  log.info({ actionId: action.id, toolName: tool.name }, "Approval requested")

  // 2. Set Redis key for approval channel
  const redisKey = `ai:approval:${action.id}`
  // Don't set a value yet — just create the key space. The UI will SET this.

  // 3. Poll Redis for decision (timeout after 5 minutes)
  const startTime = Date.now()
  while (Date.now() - startTime < APPROVAL_TIMEOUT_MS) {
    const decision = await redis.get(redisKey)
    if (decision === "approved") {
      await agentActionsRepository.updateStatus(action.id, {
        status: "approved",
        approvedBy: ctx.userId,
      })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(ctx.tenantId, tool.name, true)
      log.info({ actionId: action.id }, "Action approved")
      const updated = await agentActionsRepository.getById(action.id)
      return { approved: true, action: updated! }
    }
    if (decision === "rejected") {
      await agentActionsRepository.updateStatus(action.id, { status: "rejected" })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(ctx.tenantId, tool.name, false)
      log.info({ actionId: action.id }, "Action rejected")
      const updated = await agentActionsRepository.getById(action.id)
      return { approved: false, action: updated! }
    }
    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, APPROVAL_POLL_INTERVAL_MS))
  }

  // 4. Timeout — reject automatically
  await agentActionsRepository.updateStatus(action.id, { status: "rejected", error: "Approval timed out" })
  log.warn({ actionId: action.id }, "Approval timed out after 5 minutes")
  const updated = await agentActionsRepository.getById(action.id)
  return { approved: false, action: updated! }
}

/**
 * Execute a mutation tool with AUTO guardrail (no approval needed).
 */
export async function executeAutoAction(
  conversationId: string,
  tool: MutatingAgentTool,
  toolInput: unknown,
  ctx: AgentContext
): Promise<{ action: AgentActionRecord; result: unknown }> {
  const action = await agentActionsRepository.create({
    conversationId,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    toolName: tool.name,
    toolInput,
    guardrailTier: "AUTO",
    isReversible: tool.isReversible,
  })

  try {
    const result = await tool.execute(toolInput, ctx)
    // Extract compensation data if tool returns it
    const compensationData = (result as Record<string, unknown>)?._compensationData
    await agentActionsRepository.updateStatus(action.id, {
      status: "auto_executed",
      toolOutput: result,
      compensationData,
    })
    const updated = await agentActionsRepository.getById(action.id)
    return { action: updated!, result }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Execution failed"
    await agentActionsRepository.updateStatus(action.id, {
      status: "failed",
      error: errorMsg,
    })
    throw err
  }
}

/**
 * Resolve an approval from the chat UI (called by the router).
 */
export async function resolveApprovalFromUI(actionId: string, approved: boolean): Promise<void> {
  const redisKey = `ai:approval:${actionId}`
  await redis.set(redisKey, approved ? "approved" : "rejected", { ex: 60 })
  log.info({ actionId, approved }, "Approval resolved from UI")
}
