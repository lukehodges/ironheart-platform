// src/modules/ai/ai.approval.ts

import { redis } from "@/shared/redis"
import { logger } from "@/shared/logger"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import { correctionsRepository } from "./memory/corrections"

const log = logger.child({ module: "ai.approval" })

const APPROVAL_TIMEOUT_MS = 300_000 // 5 minutes
const APPROVAL_POLL_INTERVAL_MS = 1000 // 1 second

/**
 * Resolve an approval from the chat UI (called by the router).
 */
export async function resolveApprovalFromUI(actionId: string, approved: boolean): Promise<void> {
  const redisKey = `ai:approval:${actionId}`
  await redis.set(redisKey, approved ? "approved" : "rejected", { ex: 60 })
  log.info({ actionId, approved }, "Approval resolved from UI")
}

/**
 * Wait for a user's approval decision via Redis polling.
 * Called by the service when an ApprovalRequiredError is caught.
 * Returns true if approved, false if rejected or timed out.
 */
export async function waitForApproval(
  actionId: string,
  tenantId: string,
  procedurePath: string,
  userId: string
): Promise<boolean> {
  const redisKey = `ai:approval:${actionId}`
  const startTime = Date.now()

  while (Date.now() - startTime < APPROVAL_TIMEOUT_MS) {
    const decision = await redis.get(redisKey)
    if (decision === "approved") {
      await agentActionsRepository.updateStatus(actionId, {
        status: "approved",
        approvedBy: userId,
      })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(tenantId, procedurePath, true)
      log.info({ actionId }, "Action approved")
      return true
    }
    if (decision === "rejected") {
      await agentActionsRepository.updateStatus(actionId, { status: "rejected" })
      await redis.del(redisKey)
      await aiConfigRepository.recordApprovalDecision(tenantId, procedurePath, false)

      // Record correction for learning from rejections
      const action = await agentActionsRepository.getById(actionId)
      if (action) {
        await correctionsRepository.recordRejection({
          tenantId,
          toolName: action.toolName,
          attemptedInput: action.toolInput,
          rejectionReason: "User rejected action",
        }).catch((err) => {
          log.warn({ actionId, err }, "Failed to record correction on rejection")
        })
      }

      log.info({ actionId }, "Action rejected")
      return false
    }
    await new Promise((resolve) => setTimeout(resolve, APPROVAL_POLL_INTERVAL_MS))
  }

  // Timeout
  await agentActionsRepository.updateStatus(actionId, { status: "rejected", error: "Approval timed out" })
  log.warn({ actionId }, "Approval timed out after 5 minutes")
  return false
}
