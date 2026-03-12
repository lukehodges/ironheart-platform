// src/modules/ai/memory/hot.ts

import { redis } from "@/shared/redis"
import { logger } from "@/shared/logger"

const log = logger.child({ module: "ai.memory.hot" })

const HOT_MEMORY_TTL = 3600 // 1 hour

export const hotMemory = {
  async setSessionContext(conversationId: string, data: {
    recentToolCalls: Array<{ name: string; result: unknown }>
    currentIntent: string | null
    pageHistory: string[]
  }): Promise<void> {
    const key = `ai:session:${conversationId}`
    await redis.set(key, JSON.stringify(data), { ex: HOT_MEMORY_TTL })
  },

  async getSessionContext(conversationId: string): Promise<{
    recentToolCalls: Array<{ name: string; result: unknown }>
    currentIntent: string | null
    pageHistory: string[]
  } | null> {
    const key = `ai:session:${conversationId}`
    const raw = await redis.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw as string)
    } catch {
      return null
    }
  },

  async clearSession(conversationId: string): Promise<void> {
    const key = `ai:session:${conversationId}`
    await redis.del(key)
  },

  async trackPageVisit(conversationId: string, route: string): Promise<void> {
    const ctx = await this.getSessionContext(conversationId)
    if (ctx) {
      ctx.pageHistory = [...ctx.pageHistory.slice(-9), route]
      await this.setSessionContext(conversationId, ctx)
    }
  },
}
