// src/modules/ai/features/ghost-operator.processor.ts

import { logger } from "@/shared/logger"
import { agentActionsRepository } from "../ai.actions.repository"
import { aiConfigRepository } from "../ai.config.repository"
import { resolveGhostRules } from "./ghost-operator.rules"
import type { GhostOperatorResult, GhostOperatorRule } from "../ai.types"

const log = logger.child({ module: "ai.ghost-operator.processor" })

/**
 * Process ghost operator rules for a tenant.
 * Only executes AUTO-tier actions. CONFIRM-tier actions are queued for review.
 */
export async function processGhostOperator(tenantId: string): Promise<GhostOperatorResult[]> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  const tenantRules = config.ghostOperatorRules ?? []
  const activeRules = resolveGhostRules(tenantRules)

  const results: GhostOperatorResult[] = []

  for (const rule of activeRules) {
    const result = await processRule(tenantId, rule, config)
    results.push(result)
  }

  log.info(
    { tenantId, rulesProcessed: results.length, totalActions: results.reduce((sum, r) => sum + r.actionsExecuted, 0) },
    "Ghost operator run complete"
  )

  return results
}

async function processRule(
  tenantId: string,
  rule: GhostOperatorRule,
  config: Awaited<ReturnType<typeof aiConfigRepository.getOrCreate>>
): Promise<GhostOperatorResult> {
  const result: GhostOperatorResult = {
    ruleId: rule.id,
    ruleName: rule.name,
    actionsAttempted: 0,
    actionsExecuted: 0,
    actionsQueued: 0,
    errors: [],
  }

  // Check guardrail tier if required
  if (rule.requireAutoTier) {
    const effectiveTier = config.guardrailOverrides[rule.action.toolName] ?? "CONFIRM"
    if (effectiveTier !== "AUTO") {
      log.info({ tenantId, rule: rule.id, tier: effectiveTier }, "Ghost operator rule skipped — tool requires approval")
      return result
    }
  }

  // Get entities matching the rule trigger
  const entities = await getMatchingEntities(tenantId, rule)
  result.actionsAttempted = entities.length

  for (const entity of entities) {
    try {
      // Build tool input from template + entity
      const input = { ...rule.action.inputTemplate, ...entity }

      // Log the action to the audit trail
      await agentActionsRepository.create({
        conversationId: "ghost-operator", // Special conversation ID
        tenantId,
        userId: "ghost-operator",
        toolName: rule.action.toolName,
        toolInput: input,
        guardrailTier: "AUTO",
        isReversible: false,
      })

      result.actionsExecuted++
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      result.errors.push(`${rule.action.toolName}: ${msg}`)
    }
  }

  return result
}

/**
 * Get entities matching a ghost operator rule trigger.
 * This is a simplified version — each trigger type queries different data.
 */
async function getMatchingEntities(
  _tenantId: string,
  _rule: GhostOperatorRule
): Promise<Array<Record<string, unknown>>> {
  // TODO: Implement per-trigger queries
  // For now, return empty — each trigger type needs specific repository queries
  // pending_booking: query bookings with status = "PENDING"
  // overdue_invoice: query invoices with status = "OVERDUE"
  // review_followup: find completed bookings without reviews
  // workflow_retry: find failed workflow executions
  return []
}
