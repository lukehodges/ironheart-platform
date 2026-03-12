// src/modules/ai/features/ghost-operator.rules.ts

import { logger } from "@/shared/logger"
import type { GhostOperatorRule } from "../ai.types"

const _log = logger.child({ module: "ai.ghost-operator.rules" })

/**
 * Default ghost operator rules. Tenants can customize via ai_tenant_config.
 */
export const DEFAULT_GHOST_RULES: GhostOperatorRule[] = [
  {
    id: "auto-confirm-bookings",
    name: "Auto-confirm pending bookings",
    enabled: true,
    trigger: "pending_booking",
    conditions: {
      minHoursOld: 2, // Only confirm bookings pending for 2+ hours
      hasPayment: true, // Only if payment is received
    },
    action: {
      toolName: "booking.updateStatus",
      inputTemplate: { status: "CONFIRMED" },
    },
    requireAutoTier: true,
  },
  {
    id: "review-followup",
    name: "Send review request followup",
    enabled: true,
    trigger: "review_followup",
    conditions: {
      daysSinceCompletion: 1, // 1 day after booking completion
      noReviewYet: true,
    },
    action: {
      toolName: "notification.sendEmail",
      inputTemplate: {
        subject: "How was your experience?",
        body: "We'd love to hear about your recent visit. Please take a moment to leave a review.",
      },
    },
    requireAutoTier: true,
  },
  {
    id: "retry-failed-workflows",
    name: "Retry failed workflows",
    enabled: false, // Disabled by default — opt-in
    trigger: "workflow_retry",
    conditions: {
      maxRetries: 2,
      failedWithinHours: 12,
    },
    action: {
      toolName: "workflow.retry",
      inputTemplate: {},
    },
    requireAutoTier: true,
  },
]

/**
 * Merge tenant custom rules with defaults.
 * Tenant rules with same ID override defaults.
 */
export function resolveGhostRules(tenantRules: GhostOperatorRule[]): GhostOperatorRule[] {
  const ruleMap = new Map<string, GhostOperatorRule>()

  // Start with defaults
  for (const rule of DEFAULT_GHOST_RULES) {
    ruleMap.set(rule.id, rule)
  }

  // Override with tenant rules
  for (const rule of tenantRules) {
    ruleMap.set(rule.id, rule)
  }

  return Array.from(ruleMap.values()).filter((r) => r.enabled)
}
