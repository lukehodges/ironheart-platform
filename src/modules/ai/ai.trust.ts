// src/modules/ai/ai.trust.ts

import { aiConfigRepository } from "./ai.config.repository"
import { logger } from "@/shared/logger"
import type { GuardrailTier } from "./ai.types"

const log = logger.child({ module: "ai.trust" })

const PROMOTION_THRESHOLD = 0.95 // 95% approval rate
const PROMOTION_MIN_DECISIONS = 50
const DEMOTION_REJECTION_SPIKE = 0.20 // 20% rejection in recent window
const DEMOTION_WINDOW = 20 // last 20 decisions

/**
 * Analyze trust metrics and suggest guardrail promotions/demotions.
 * Returns suggestions — does NOT auto-apply in Phase B.
 */
export async function analyzeTrustMetrics(tenantId: string): Promise<TrustSuggestion[]> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  const suggestions: TrustSuggestion[] = []

  for (const [toolName, metrics] of Object.entries(config.trustMetrics)) {
    const total = metrics.approved + metrics.rejected
    if (total === 0) continue

    const approvalRate = metrics.approved / total

    // Suggest promotion: CONFIRM → AUTO
    if (
      approvalRate >= PROMOTION_THRESHOLD &&
      total >= PROMOTION_MIN_DECISIONS &&
      (config.guardrailOverrides[toolName] ?? "CONFIRM") === "CONFIRM"
    ) {
      suggestions.push({
        toolName,
        currentTier: "CONFIRM",
        suggestedTier: "AUTO",
        reason: `${(approvalRate * 100).toFixed(1)}% approval rate over ${total} decisions`,
        approvalRate,
        totalDecisions: total,
      })
    }

    // Suggest demotion: AUTO → CONFIRM (if recently getting rejections)
    if (
      metrics.rejected > 0 &&
      total >= DEMOTION_WINDOW &&
      (config.guardrailOverrides[toolName] ?? "CONFIRM") === "AUTO"
    ) {
      // Check recent rejection spike (simplified — uses overall rate)
      const rejectionRate = metrics.rejected / total
      if (rejectionRate >= DEMOTION_REJECTION_SPIKE) {
        suggestions.push({
          toolName,
          currentTier: "AUTO",
          suggestedTier: "CONFIRM",
          reason: `${(rejectionRate * 100).toFixed(1)}% rejection rate — consider reverting to CONFIRM`,
          approvalRate,
          totalDecisions: total,
        })
      }
    }
  }

  log.info({ tenantId, suggestions: suggestions.length }, "Trust analysis complete")
  return suggestions
}

export interface TrustSuggestion {
  toolName: string
  currentTier: GuardrailTier
  suggestedTier: GuardrailTier
  reason: string
  approvalRate: number
  totalDecisions: number
}
