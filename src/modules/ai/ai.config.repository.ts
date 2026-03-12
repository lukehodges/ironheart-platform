// src/modules/ai/ai.config.repository.ts

import { db } from "@/shared/db"
import { aiTenantConfig } from "@/shared/db/schema"
import { eq } from "drizzle-orm"
import { logger } from "@/shared/logger"
import type { TenantAIConfig, GuardrailTier } from "./ai.types"

const log = logger.child({ module: "ai.config.repository" })

function mapConfig(row: typeof aiTenantConfig.$inferSelect): TenantAIConfig {
  return {
    id: row.id,
    tenantId: row.tenantId,
    isEnabled: row.isEnabled === 1,
    maxTokenBudget: row.maxTokenBudget,
    maxMessagesPerMinute: row.maxMessagesPerMinute,
    defaultModel: row.defaultModel,
    guardrailOverrides: (row.guardrailOverrides as Record<string, GuardrailTier>) ?? {},
    trustMetrics: (row.trustMetrics as Record<string, { approved: number; rejected: number }>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const aiConfigRepository = {
  async getOrCreate(tenantId: string): Promise<TenantAIConfig> {
    const [existing] = await db
      .select()
      .from(aiTenantConfig)
      .where(eq(aiTenantConfig.tenantId, tenantId))
      .limit(1)

    if (existing) return mapConfig(existing)

    const [created] = await db
      .insert(aiTenantConfig)
      .values({ tenantId })
      .returning()
    log.info({ tenantId }, "Created default AI tenant config")
    return mapConfig(created!)
  },

  async update(tenantId: string, updates: {
    isEnabled?: number
    maxTokenBudget?: number
    maxMessagesPerMinute?: number
    defaultModel?: string
    guardrailOverrides?: Record<string, GuardrailTier>
    trustMetrics?: Record<string, { approved: number; rejected: number }>
    verticalProfile?: string
  }): Promise<void> {
    await db
      .update(aiTenantConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiTenantConfig.tenantId, tenantId))
  },

  async getGuardrailTier(tenantId: string, toolName: string, defaultTier: GuardrailTier): Promise<GuardrailTier> {
    const config = await this.getOrCreate(tenantId)
    return config.guardrailOverrides[toolName] ?? defaultTier
  },

  async recordApprovalDecision(tenantId: string, toolName: string, approved: boolean): Promise<void> {
    const config = await this.getOrCreate(tenantId)
    const metrics = { ...config.trustMetrics }
    if (!metrics[toolName]) metrics[toolName] = { approved: 0, rejected: 0 }
    if (approved) {
      metrics[toolName].approved += 1
    } else {
      metrics[toolName].rejected += 1
    }
    await this.update(tenantId, { trustMetrics: metrics })
  },
}
